require('dotenv').config();
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const Stripe = require('stripe');
const { OAuth2Client } = require('google-auth-library');
const supaStore = require('./lib/supabase-store');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 🔒 永続ディスク設定 (Render)
// コード更新(デプロイ)してもデータ・画像・バックアップは維持される
// ⚠️ 運用ルール: data.jsonはAIデベロッパーで編集しないこと！
//    データ変更は必ず本番の管理画面から行うこと
// ============================================================
const PERSISTENT_DIR = process.env.PERSISTENT_DIR || (process.env.RENDER ? '/data' : __dirname);
const DATA_FILE = path.join(PERSISTENT_DIR, 'data.json');
const SEED_DATA_FILE = path.join(__dirname, 'data.json'); // 初期データ(GitHub由来)

// Stripe config (set via env vars or admin settings)
let stripe = null;
function getStripe(data) {
    const sk = (data.siteSettings || {}).stripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
    if (sk && (!stripe || stripe._lastKey !== sk)) {
        stripe = new Stripe(sk, { apiVersion: '2024-12-18.acacia' });
        stripe._lastKey = sk;
    }
    return stripe;
}

// Middleware
app.use(compression());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname, {
    etag: true,
    maxAge: '1h',
    setHeaders(res, filePath) {
        // index.html は常に最新を取りに行く
        if (filePath.endsWith('index.html') || filePath.endsWith('admin.html')) {
            res.setHeader('Cache-Control', 'no-cache');
            return;
        }
        // sw.js は更新を確実に取りに行きたいので no-cache + Service-Worker-Allowed
        if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Service-Worker-Allowed', '/');
            return;
        }
        // 画像/フォント/PWA アイコンはハッシュなしでも安全な長期キャッシュ
        if (/\.(png|jpg|jpeg|gif|webp|avif|ico|svg|woff2?|ttf|otf)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
        }
    }
}));

// Upload directory (永続ディスク)
const uploadDir = path.join(PERSISTENT_DIR, 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `img-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/jpeg|jpg|png|gif|webp/.test(file.mimetype)) cb(null, true);
        else cb(new Error('画像ファイルのみ'));
    }
});
app.use('/uploads', express.static(uploadDir));

// Data helpers
// Supabase が設定されていれば Supabase を single source of truth として扱い、
// メモリにキャッシュしてリクエスト毎の読み書きを最小化する。
// data.json は初回シード用 + フォールバックのみ。
const USE_SUPABASE = supaStore.isEnabled();
let _cache = null;
let _cachePromise = null;

async function _loadFromSupabase() {
    const data = await supaStore.readAll();
    data.members = data.members || [];
    data.events = data.events || [];
    data.blogs = data.blogs || [];
    data.boards = data.boards || [];
    data.messages = data.messages || [];
    data.operatingMembers = data.operatingMembers || [];
    data.siteSettings = data.siteSettings || {};
    data.interviews = data.interviews || [];
    data.groupChats = data.groupChats || [];
    return data;
}

async function readData() {
    if (USE_SUPABASE) {
        if (_cache) return _cache;
        if (_cachePromise) return _cachePromise;
        _cachePromise = _loadFromSupabase().then((d) => { _cache = d; _cachePromise = null; return d; })
            .catch((e) => { _cachePromise = null; throw e; });
        return _cachePromise;
    }
    try {
        return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    } catch {
        return { members: [], events: [], blogs: [], messages: [], groupChats: [], boards: [], siteSettings: {}, interviews: [], operatingMembers: [] };
    }
}
async function writeData(data) {
    if (USE_SUPABASE) {
        await supaStore.writeAll(data);
        _cache = data;   // write-through cache
        fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2)).catch((e) => console.warn('[backup data.json]', e.message));
        return;
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}
function genId(p) { return `${p}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }
// Common error handler for async routes
function handleErr(res, e, msg = 'エラー') { console.error(msg, e); res.status(500).json({ error: msg }); }

// YouTube ID extractor
function extractYoutubeId(url) {
    if (!url) return '';
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
    return m ? m[1] : '';
}

// Auto-migrate interviews into blogs on startup
async function migrateInterviewsToBlogs() {
    try {
        const data = await readData();
        if (!data.interviews || !data.interviews.length) return;
        let migrated = 0;
        for (const iv of data.interviews) {
            const exists = (data.blogs || []).some(b => b.id === iv.id);
            if (!exists) {
                data.blogs.push({
                    id: iv.id,
                    title: iv.title || '',
                    date: iv.date || new Date().toISOString().split('T')[0],
                    category: '活動ムービー',
                    excerpt: iv.description || '',
                    content: iv.description || '',
                    author: iv.speaker || '運営事務局',
                    imageUrl: iv.youtubeId ? `https://img.youtube.com/vi/${iv.youtubeId}/hqdefault.jpg` : '',
                    youtubeUrl: iv.youtubeUrl || '',
                    youtubeId: iv.youtubeId || extractYoutubeId(iv.youtubeUrl),
                    order: iv.order || 0
                });
                migrated++;
            }
        }
        if (migrated > 0) {
            // Remove interviews array after migration
            data.interviews = [];
            await writeData(data);
            console.log(`✅ Migrated ${migrated} interviews into blogs`);
        }
    } catch (e) {
        console.error('Migration error:', e);
    }
}

// ==================== AUTH ====================
/* === 名前×お店 重複チェック共通ヘルパ === */
function _normForDup(s) { return String(s || '').trim().replace(/\s+/g, '').toLowerCase(); }
function findNameShopDuplicate(members, { name, business, profession }) {
    const nName = _normForDup(name);
    const nBiz = _normForDup(business);
    const nProf = _normForDup(profession);
    if (!nName || (!nBiz && !nProf)) return null;
    return members.find(m => {
        if (_normForDup(m.name) !== nName) return false;
        const sameBiz = nBiz && _normForDup(m.business) === nBiz;
        const sameProf = nProf && _normForDup(m.profession) === nProf;
        return sameBiz || sameProf;
    }) || null;
}
const NAME_SHOP_DUP_MSG = '同じお名前と店舗・事業内容で既に登録されています。お心当たりがある場合はログインまたはパスワード再設定をお試しください。';

app.post('/api/register', async (req, res) => {
    try {
        const data = await readData();
        const { email, password, name, furigana, phone, business, businessCategory, location, website, instagram, profession, homepage } = req.body;
        if (!name || !furigana) return res.status(400).json({ error: 'お名前とふりがなは必須です' });
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (normalizedEmail) {
            if (data.members.find(m => (m.email || '').toLowerCase() === normalizedEmail))
                return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
        }
        // 名前×お店の重複チェック（空文字同士は重複扱いしない）
        if (findNameShopDuplicate(data.members, { name, business, profession })) {
            return res.status(409).json({ error: NAME_SHOP_DUP_MSG });
        }
        const newMember = {
            id: genId('member'),
            email: normalizedEmail,
            // password は提供されたときだけハッシュ化。なければ空文字（後でマイページで設定可能）。
            password: password ? await bcrypt.hash(password, 10) : '',
            name, furigana,
            phone: phone || '',
            business: business || '',
            businessCategory: businessCategory || '',
            introduction: '', avatar: '',
            location: location || '', website: website || '', instagram: instagram || '',
            googleMapUrl: req.body.googleMapUrl || '',
            profession: profession || '', homepage: homepage || '',
            sns: {}, skills: [],
            joinDate: new Date().toISOString().split('T')[0],
            isPublic: true, isAdmin: false
        };
        data.members.push(newMember);
        await writeData(data);
        const { password: _, ...safe } = newMember;
        res.json({ success: true, member: safe });
    } catch (e) { handleErr(res, e, '登録に失敗しました'); }
});

app.post('/api/login', async (req, res) => {
    try {
        const data = await readData();
        const { email, password } = req.body;
        const member = data.members.find(m => m.email === email);
        if (!member || !(await bcrypt.compare(password, member.password)))
            return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
        const { password: _, ...safe } = member;
        res.json({ success: true, member: safe });
    } catch (e) { handleErr(res, e, 'ログインに失敗しました'); }
});

// ==================== PASSWORD RESET ====================
// In-memory store for reset tokens (cleared on restart — fine for small-scale use)
const resetTokens = new Map(); // token -> { email, expiresAt }

// Step 1: Request password reset — generate token
app.post('/api/password-reset/request', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'メールアドレスを入力してください' });

        const data = await readData();
        const member = data.members.find(m => m.email === email);
        if (!member) {
            // Don't reveal whether account exists — always return success
            return res.json({ success: true, message: 'リセットリンクを生成しました' });
        }

        // Generate a secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
        resetTokens.set(token, { email, expiresAt });

        // Clean up expired tokens
        for (const [t, v] of resetTokens) {
            if (v.expiresAt < Date.now()) resetTokens.delete(t);
        }

        console.log(`Password reset token generated for ${email}: ${token}`);
        res.json({ success: true, token, message: 'リセットリンクを生成しました' });
    } catch (e) {
        console.error('Password reset request error:', e);
        res.status(500).json({ error: 'エラーが発生しました' });
    }
});

// Step 2: Verify token is valid
app.get('/api/password-reset/verify/:token', (req, res) => {
    const entry = resetTokens.get(req.params.token);
    if (!entry || entry.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'リセットリンクが無効または期限切れです' });
    }
    res.json({ success: true, email: entry.email.replace(/(.{2}).*(@.*)/, '$1***$2') });
});

// Step 3: Set new password with valid token
app.post('/api/password-reset/confirm', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'トークンとパスワードが必要です' });
        if (password.length < 6) return res.status(400).json({ error: 'パスワードは6文字以上にしてください' });

        const entry = resetTokens.get(token);
        if (!entry || entry.expiresAt < Date.now()) {
            return res.status(400).json({ error: 'リセットリンクが無効または期限切れです' });
        }

        const data = await readData();
        const member = data.members.find(m => m.email === entry.email);
        if (!member) return res.status(404).json({ error: 'ユーザーが見つかりません' });

        member.password = await bcrypt.hash(password, 10);
        await writeData(data);

        // Invalidate the token
        resetTokens.delete(token);

        res.json({ success: true, message: 'パスワードを更新しました' });
    } catch (e) {
        console.error('Password reset confirm error:', e);
        res.status(500).json({ error: 'パスワードの更新に失敗しました' });
    }
});

// ==================== GOOGLE AUTH ====================
app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'トークンが必要です' });

        const data = await readData();
        const clientId = (data.siteSettings || {}).googleClientId || process.env.GOOGLE_CLIENT_ID || '';
        if (!clientId) return res.status(500).json({ error: 'Google Client IDが設定されていません' });

        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // 1) Find by googleId
        let member = data.members.find(m => m.googleId === googleId);
        // 2) Find by email
        if (!member) member = data.members.find(m => m.email === email);

        if (member) {
            // Link googleId if not yet linked
            if (!member.googleId) {
                member.googleId = googleId;
                if (!member.avatar && picture) member.avatar = picture;
                await writeData(data);
            }
            const { password: _, ...safe } = member;
            return res.json({ success: true, member: safe, isNew: false });
        }

        // 3) New user - return Google profile for registration form prefill
        return res.json({
            success: true, isNew: true,
            googleProfile: { googleId, email, name, avatar: picture }
        });
    } catch (e) {
        console.error('Google auth error:', e.message, e.stack);
        const msg = e.message?.includes('Token used too late') ? 'トークンの有効期限が切れました。もう一度お試しください' :
                    e.message?.includes('Wrong recipient') ? 'Google Client IDの設定が正しくありません' :
                    e.message?.includes('Invalid token') ? 'トークンが無効です' :
                    'Google認証に失敗しました: ' + (e.message || '');
        res.status(401).json({ error: msg });
    }
});

app.post('/api/register/google', async (req, res) => {
    try {
        const data = await readData();
        const { googleId, email, name, furigana, phone, business, businessCategory, location, website, instagram, profession, homepage, avatar, googleMapUrl } = req.body;
        if (!googleId || !email) return res.status(400).json({ error: '必須情報が不足しています' });
        if (data.members.find(m => m.email === email))
            return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
        // 名前×お店の重複チェック
        if (findNameShopDuplicate(data.members, { name, business, profession })) {
            return res.status(409).json({ error: NAME_SHOP_DUP_MSG });
        }

        const newMember = {
            id: genId('member'), email, googleId,
            password: await bcrypt.hash(googleId + Date.now(), 10), // random password (Google users don't use it)
            name, furigana: furigana || '', phone: phone || '', business: business || '', businessCategory: businessCategory || '',
            introduction: '', avatar: avatar || '',
            location: location || '', website: website || '', instagram: instagram || '', googleMapUrl: googleMapUrl || '',
            profession: profession || '', homepage: homepage || '',
            sns: {}, skills: [],
            joinDate: new Date().toISOString().split('T')[0],
            isPublic: true, isAdmin: false
        };
        data.members.push(newMember);
        await writeData(data);
        const { password: _, ...safe } = newMember;
        res.json({ success: true, member: safe });
    } catch (e) { handleErr(res, e, '登録に失敗しました'); }
});
app.get('/api/members', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.members.map(({ password, ...m }) => m));
    } catch (e) { handleErr(res, e); }
});

app.get('/api/members/:id', async (req, res) => {
    try {
        const data = await readData();
        const m = data.members.find(m => m.id === req.params.id);
        if (!m) return res.status(404).json({ error: 'not found' });
        const { password, ...safe } = m;
        res.json(safe);
    } catch (e) { handleErr(res, e); }
});

app.put('/api/members/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = data.members.findIndex(m => m.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        const updates = { ...req.body };
        if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
        // 名前×お店の重複チェック（自分自身は除外）
        const merged = { ...data.members[idx], ...updates };
        const others = data.members.filter(m => m.id !== data.members[idx].id);
        if (findNameShopDuplicate(others, { name: merged.name, business: merged.business, profession: merged.profession })) {
            return res.status(409).json({ error: NAME_SHOP_DUP_MSG });
        }
        // Auto-cache map coordinates when googleMapUrl changes
        if (updates.googleMapUrl && updates.googleMapUrl !== data.members[idx].googleMapUrl) {
            try {
                const https = require('https'); const http = require('http');
                const mod = updates.googleMapUrl.startsWith('https') ? https : http;
                const r = await new Promise((resolve) => {
                    mod.get(updates.googleMapUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
                        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) resolve({ resolvedUrl: resp.headers.location });
                        else { let b=''; resp.on('data',c=>b+=c); resp.on('end',()=>resolve({ resolvedUrl: resp.headers.location || updates.googleMapUrl, body: b })); }
                    }).on('error', () => resolve({}));
                });
                const cm = (r.resolvedUrl||'').match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                if (cm) { updates.mapLat = parseFloat(cm[1]); updates.mapLng = parseFloat(cm[2]); }
                else if (r.body) { const cm2 = r.body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/); if (cm2) { updates.mapLat = parseFloat(cm2[1]); updates.mapLng = parseFloat(cm2[2]); } }
            } catch(e) { /* keep without coords */ }
        }
        data.members[idx] = { ...data.members[idx], ...updates, id: data.members[idx].id };
        await writeData(data);
        const { password, ...safe } = data.members[idx];
        res.json({ success: true, member: safe });
    } catch (e) { handleErr(res, e); }
});

// ==================== RESOLVE MAP URL ====================
app.post('/api/resolve-map-url', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.json({});
        const https = require('https');
        const http = require('http');
        const mod = url.startsWith('https') ? https : http;

        // Helper: geocode an address using Nominatim (OpenStreetMap)
        const geocodeAddress = (address) => new Promise((resolve) => {
            const encoded = encodeURIComponent(address);
            const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;
            https.get(geoUrl, { headers: { 'User-Agent': 'MinnanoWA/1.0' } }, (resp) => {
                let body = '';
                resp.on('data', c => body += c);
                resp.on('end', () => {
                    try {
                        const results = JSON.parse(body);
                        if (results.length > 0) {
                            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
                        } else { resolve(null); }
                    } catch (e) { resolve(null); }
                });
            }).on('error', () => resolve(null));
        });

        const r = await new Promise((resolve, reject) => {
            // Follow up to 8 redirects to find final URL
            const follow = (url, depth) => {
                if (depth > 8) return resolve({ resolvedUrl: url });
                const m2 = url.startsWith('https') ? https : http;
                const rq = m2.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinnanoWA/1.0)' } }, (resp) => {
                    if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                        follow(resp.headers.location, depth + 1);
                    } else {
                        let body = '';
                        resp.on('data', c => body += c);
                        resp.on('end', () => resolve({ resolvedUrl: resp.headers.location || url, body }));
                    }
                });
                rq.on('error', () => resolve({ resolvedUrl: url }));
                rq.setTimeout(10000, () => { rq.destroy(); resolve({ resolvedUrl: url }); });
            };
            follow(url, 0);
        });
        // Try to extract coords from resolved URL
        const m = (r.resolvedUrl || '').match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (m) return res.json({ lat: parseFloat(m[1]), lng: parseFloat(m[2]), resolvedUrl: r.resolvedUrl });
        // Try from body
        if (r.body) {
            const m2 = r.body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
            if (m2) return res.json({ lat: parseFloat(m2[1]), lng: parseFloat(m2[2]) });
        }
        // Try to extract address from ?q= parameter and geocode it
        const resolvedUrl = r.resolvedUrl || url;
        try {
            const urlObj = new URL(resolvedUrl);
            const qParam = urlObj.searchParams.get('q');
            if (qParam) {
                // Clean address: remove postal code (〒xxx-xxxx), business names, normalize
                let address = qParam
                    .replace(/\+/g, ' ')  // URL-encoded spaces
                    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // Full-width → half-width numbers
                    .replace(/[−－]/g, '-')  // Full-width minus → half-width
                    .replace(/〒?\d{3}-?\d{4}\s*/g, '')  // Remove postal code (after number normalization)
                    .trim();
                // Try progressive geocoding: most specific to least specific
                let coords = await geocodeAddress(address);
                if (!coords) {
                    // Try prefecture+city+town with number
                    const fullMatch = address.match(/(.*?[都道府県].*?[市区町村郡].*?[町村][\d-]*)/);
                    if (fullMatch) coords = await geocodeAddress(fullMatch[1].trim());
                }
                if (!coords) {
                    // Try prefecture+city+town (without number)
                    const townMatch = address.match(/(.*?[都道府県].*?[市区町村郡].*?[町村])/);
                    if (townMatch) coords = await geocodeAddress(townMatch[1].trim());
                }
                if (!coords) {
                    // Fallback: just city name for geocoding
                    const prefCity = address.match(/(.*?[市区町村郡])/);
                    if (prefCity) coords = await geocodeAddress(prefCity[1].trim());
                }
                if (coords) return res.json({ ...coords, resolvedUrl });
            }
        } catch (e) { /* URL parsing failed, continue */ }
        res.json({ resolvedUrl });
    } catch (e) { res.json({}); }
});

// ==================== IMAGE UPLOAD ====================
// Vercel/Supabase Storage モードでは memoryStorage を使い Storage に直接アップロード
const memUploadSingle = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.post('/api/upload', memUploadSingle.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ファイルなし' });
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Supabase Storage が使える場合は Storage に直送
    if (SUPABASE_URL && SERVICE_KEY) {
        try {
            const { createClient } = require('@supabase/supabase-js');
            const sbStorage = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } }).storage;
            const ext = require('path').extname(req.file.originalname) || '.jpeg';
            const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            const key = `legacy_minanowa/${filename}`;
            const { error } = await sbStorage.from('media').upload(key, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false,
            });
            if (error) throw error;
            const url = `${SUPABASE_URL}/storage/v1/object/public/media/${key}`;
            return res.json({ success: true, url });
        } catch (e) {
            console.error('Storage upload error:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }
    // フォールバック: ローカルディスク（Render 等）
    const tmpDir = require('os').tmpdir();
    const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e9)}${require('path').extname(req.file.originalname) || '.jpeg'}`;
    const filepath = require('path').join(uploadDir, filename);
    await require('fs').promises.writeFile(filepath, req.file.buffer);
    res.json({ success: true, url: `/uploads/${filename}` });
});

// ==================== EVENTS ====================
app.get('/api/events', async (req, res) => {
    try { res.json((await readData()).events); } catch (e) { handleErr(res, e); }
});
app.post('/api/events/:id/register', async (req, res) => {
    try {
        const data = await readData();
        const { memberId, paymentMethod, referrerId } = req.body;
        if (!memberId) return res.status(400).json({ error: 'memberId is required' });
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        if (!ev.registrations) ev.registrations = [];
        if (!ev.regDetails) ev.regDetails = {};
        if (!ev.referrals) ev.referrals = {};
        if (ev.registrations.includes(memberId)) return res.status(400).json({ error: '既に登録済み' });
        // Check capacity
        const cap = parseInt(ev.participants) || 0;
        if (cap > 0 && ev.registrations.length >= cap) return res.status(400).json({ error: '定員に達しました' });
        ev.registrations.push(memberId);
        ev.regDetails[memberId] = { paymentMethod: paymentMethod || 'onsite', paymentStatus: paymentMethod === 'stripe' ? 'pending' : 'onsite', registeredAt: new Date().toISOString() };
        // Handle referral: first-timer nominates a referrer who gets 500 yen discount
        if (referrerId && referrerId !== memberId) {
            ev.referrals[memberId] = { referrerId, discount: 500, createdAt: new Date().toISOString() };
            // Apply discount to referrer's regDetails
            if (ev.regDetails[referrerId]) {
                ev.regDetails[referrerId].referralDiscount = (ev.regDetails[referrerId].referralDiscount || 0) + 500;
                ev.regDetails[referrerId].referredBy = ev.regDetails[referrerId].referredBy || [];
                ev.regDetails[referrerId].referredBy.push(memberId);
            }
        }
        await writeData(data);
        res.json({ success: true, registrations: ev.registrations, regDetails: ev.regDetails });
    } catch (e) { handleErr(res, e); }
});
app.delete('/api/events/:id/register', async (req, res) => {
    try {
        const data = await readData();
        const { memberId } = req.body;
        if (!memberId) return res.status(400).json({ error: 'memberId is required' });
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        if (!ev.registrations) ev.registrations = [];
        ev.registrations = ev.registrations.filter(id => id !== memberId);
        await writeData(data);
        res.json({ success: true, registrations: ev.registrations });
    } catch (e) { handleErr(res, e); }
});
app.get('/api/events/:id/registrations', async (req, res) => {
    try {
        const data = await readData();
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        const regs = ev.registrations || [];
        const members = regs.map(mid => {
            const m = data.members.find(x => x.id === mid);
            const payment = (ev.regDetails||{})[mid] || {};
            const referral = (ev.referrals||{})[mid] || null;
            if (!m) return { id: mid, name: '(退会済み)', avatar: '', payment, referral };
            return { id: m.id, name: m.name, avatar: m.avatar, profession: m.profession, business: m.business, location: m.location, payment, referral };
        });
        res.json({ registrations: members, count: regs.length, referrals: ev.referrals || {} });
    } catch (e) { handleErr(res, e); }
});

// ==================== MEMBER PARTICIPATION COUNT ====================
app.get('/api/members/:id/participation', async (req, res) => {
    try {
        const data = await readData();
        const memberId = req.params.id;
        const now = new Date();
        // Count past events where this member was registered
        const count = data.events.filter(ev => {
            const isPast = new Date(ev.date) < now;
            return isPast && (ev.registrations || []).includes(memberId);
        }).length;
        // Determine rank
        let rank = 'none';
        if (count >= 12) rank = 'gold';
        else if (count >= 6) rank = 'silver';
        else if (count >= 3) rank = 'bronze';
        res.json({ memberId, count, rank });
    } catch (e) { handleErr(res, e); }
});

// Bulk participation counts for all members
app.get('/api/members/participation/all', async (req, res) => {
    try {
        const data = await readData();
        const now = new Date();
        const pastEvents = data.events.filter(ev => new Date(ev.date) < now);
        const counts = {};
        pastEvents.forEach(ev => {
            (ev.registrations || []).forEach(mid => {
                counts[mid] = (counts[mid] || 0) + 1;
            });
        });
        const result = {};
        Object.entries(counts).forEach(([mid, count]) => {
            let rank = 'none';
            if (count >= 12) rank = 'gold';
            else if (count >= 6) rank = 'silver';
            else if (count >= 3) rank = 'bronze';
            result[mid] = { count, rank };
        });
        res.json(result);
    } catch (e) { handleErr(res, e); }
});

// ==================== STRIPE PAYMENT ====================
app.post('/api/events/:id/create-checkout', async (req, res) => {
    try {
        const data = await readData();
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'イベントが見つかりません' });
        const s = getStripe(data);
        if (!s) return res.status(400).json({ error: 'Stripe未設定です。管理画面でAPIキーを設定してください。' });
        const { memberId } = req.body;
        if (!memberId) return res.status(400).json({ error: 'memberId is required' });
        // Parse fee (e.g. "3,000円" => 3000)
        const feeNum = parseInt(String(ev.fee || '0').replace(/[^0-9]/g, '')) || 0;
        if (feeNum <= 0) return res.status(400).json({ error: '参加費が設定されていません' });
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const baseUrl = `${proto}://${host}`;
        const session = await s.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'jpy',
                    product_data: { name: ev.title, description: `${ev.date} ${ev.time || ''} @ ${ev.location}` },
                    unit_amount: feeNum,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/?stripe_success=1&event=${ev.id}&member=${memberId}`,
            cancel_url: `${baseUrl}/?stripe_cancel=1&event=${ev.id}`,
            metadata: { eventId: ev.id, memberId },
        });
        res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (e) {
        console.error('Stripe error:', e.message);
        res.status(500).json({ error: 'Stripe決済エラー: ' + e.message });
    }
});

// Stripe success callback - mark payment as paid
app.post('/api/events/:id/confirm-payment', async (req, res) => {
    try {
        const data = await readData();
        const { memberId } = req.body;
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        if (!ev.regDetails) ev.regDetails = {};
        if (ev.regDetails[memberId]) {
            ev.regDetails[memberId].paymentStatus = 'paid';
            ev.regDetails[memberId].paidAt = new Date().toISOString();
        }
        await writeData(data);
        res.json({ success: true });
    } catch (e) { handleErr(res, e); }
});

// Toggle payment status (admin use)
app.post('/api/events/:id/toggle-payment', async (req, res) => {
    try {
        const data = await readData();
        const { memberId, newStatus } = req.body;
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        if (!ev.regDetails || !ev.regDetails[memberId]) return res.status(404).json({ error: 'registration not found' });
        ev.regDetails[memberId].paymentStatus = newStatus; // 'paid' or 'pending' or 'onsite'
        if (newStatus === 'paid') {
            ev.regDetails[memberId].paidAt = new Date().toISOString();
        } else {
            delete ev.regDetails[memberId].paidAt;
        }
        await writeData(data);
        res.json({ success: true, paymentStatus: newStatus });
    } catch (e) { handleErr(res, e); }
});

// ==================== BLOGS ====================
app.get('/api/blogs', async (req, res) => {
    try { res.json((await readData()).blogs); } catch (e) { handleErr(res, e); }
});

// ==================== BOARDS (掲示板) ====================
app.get('/api/boards', async (req, res) => {
    try {
        const data = await readData();
        let boards = data.boards || [];
        // Auto-remove consecutive duplicates (same author + same content)
        let cleaned = false;
        const seen = new Set();
        const filtered = [];
        for (const b of boards) {
            const key = (b.authorId||'') + '::' + (b.content||'').trim();
            if (seen.has(key)) { cleaned = true; continue; }
            seen.add(key);
            filtered.push(b);
        }
        if (cleaned) { data.boards = filtered; await writeData(data); }
        res.json(filtered);
    } catch (e) { handleErr(res, e); }
});
app.post('/api/boards', async (req, res) => {
    try {
        const data = await readData();
        if (!data.boards) data.boards = [];
        // Reject if same author posted same content recently
        const dup = data.boards.find(b => b.authorId === req.body.authorId && (b.content||'').trim() === (req.body.content||'').trim());
        if (dup) return res.json({ success: true, post: dup, duplicate: true });
        const post = { id: genId('board'), ...req.body, replies: [], createdAt: new Date().toISOString() };
        data.boards.unshift(post);
        await writeData(data);
        res.json({ success: true, post });
    } catch (e) { handleErr(res, e); }
});
app.post('/api/boards/:id/reply', async (req, res) => {
    try {
        const data = await readData();
        const post = (data.boards || []).find(b => b.id === req.params.id);
        if (!post) return res.status(404).json({ error: 'not found' });
        // Reject duplicate reply (same author + same content)
        const dup = (post.replies||[]).find(r => r.authorId === req.body.authorId && (r.content||'').trim() === (req.body.content||'').trim());
        if (dup) return res.json({ success: true, reply: dup, duplicate: true });
        const reply = { id: genId('reply'), ...req.body, createdAt: new Date().toISOString() };
        post.replies.push(reply);
        await writeData(data);
        res.json({ success: true, reply });
    } catch (e) { handleErr(res, e); }
});
// Edit own board post
app.put('/api/boards/:id', async (req, res) => {
    try {
        const data = await readData();
        const post = (data.boards || []).find(b => b.id === req.params.id);
        if (!post) return res.status(404).json({ error: 'not found' });
        if (post.authorId !== req.body.authorId) return res.status(403).json({ error: '自分の投稿のみ編集できます' });
        post.title = req.body.title || post.title;
        post.content = req.body.content || post.content;
        post.category = req.body.category || post.category;
        post.updatedAt = new Date().toISOString();
        await writeData(data);
        res.json({ success: true, post });
    } catch (e) { handleErr(res, e); }
});
// Delete own board post
app.delete('/api/boards/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = (data.boards || []).findIndex(b => b.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        if (data.boards[idx].authorId !== req.body.authorId) return res.status(403).json({ error: '自分の投稿のみ削除できます' });
        data.boards.splice(idx, 1);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { handleErr(res, e); }
});

// ==================== SITE SETTINGS ====================
app.get('/api/site-settings', async (req, res) => {
    try { res.json((await readData()).siteSettings || {}); } catch (e) { handleErr(res, e); }
});
app.put('/api/site-settings', async (req, res) => {
    try {
        const data = await readData();
        data.siteSettings = { ...(data.siteSettings || {}), ...req.body };
        await writeData(data);
        res.json({ success: true, settings: data.siteSettings });
    } catch (e) { handleErr(res, e); }
});

// ==================== MESSAGES ====================
app.get('/api/messages', async (req, res) => {
    try {
        const data = await readData();
        const { userId } = req.query;
        res.json((data.messages || []).filter(m => m.from === userId || m.to === userId));
    } catch (e) { handleErr(res, e); }
});
app.post('/api/messages', async (req, res) => {
    try {
        const data = await readData();
        const msg = { id: genId('msg'), ...req.body, timestamp: new Date().toISOString(), read: false };
        data.messages.push(msg);
        await writeData(data);
        res.json({ success: true, message: msg });
    } catch (e) { handleErr(res, e); }
});

// ==================== ADMIN ====================
// Events CRUD
app.post('/api/admin/events', async (req, res) => {
    try {
        const data = await readData();
        const ev = { id: genId('event'), ...req.body, registrations: [] };
        data.events.push(ev);
        await writeData(data);
        res.json({ success: true, event: ev });
    } catch (e) { handleErr(res, e); }
});
app.put('/api/admin/events/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = data.events.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        data.events[idx] = { ...data.events[idx], ...req.body, id: data.events[idx].id };
        await writeData(data);
        res.json({ success: true, event: data.events[idx] });
    } catch (e) { handleErr(res, e); }
});
app.delete('/api/admin/events/:id', async (req, res) => {
    try {
        const data = await readData();
        data.events = data.events.filter(e => e.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { handleErr(res, e); }
});

// Blogs CRUD (unified: お知らせ, 活動レポート, 活動ムービー)
app.post('/api/admin/blogs', async (req, res) => {
    try {
        const data = await readData();
        const body = { ...req.body };
        // Auto-extract YouTube ID if youtubeUrl provided
        if (body.youtubeUrl && !body.youtubeId) {
            body.youtubeId = extractYoutubeId(body.youtubeUrl);
        }
        // Auto-set thumbnail for video posts
        if (body.youtubeId && !body.imageUrl) {
            body.imageUrl = `https://img.youtube.com/vi/${body.youtubeId}/hqdefault.jpg`;
        }
        const blog = { id: genId('blog'), ...body, date: body.date || new Date().toISOString().split('T')[0] };
        data.blogs.push(blog);
        await writeData(data);
        res.json({ success: true, blog });
    } catch (e) { handleErr(res, e); }
});
app.put('/api/admin/blogs/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = data.blogs.findIndex(b => b.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        const body = { ...req.body };
        if (body.youtubeUrl && !body.youtubeId) {
            body.youtubeId = extractYoutubeId(body.youtubeUrl);
        }
        if (body.youtubeId && !body.imageUrl) {
            body.imageUrl = `https://img.youtube.com/vi/${body.youtubeId}/hqdefault.jpg`;
        }
        data.blogs[idx] = { ...data.blogs[idx], ...body, id: data.blogs[idx].id };
        await writeData(data);
        res.json({ success: true, blog: data.blogs[idx] });
    } catch (e) { handleErr(res, e); }
});
app.delete('/api/admin/blogs/:id', async (req, res) => {
    try {
        const data = await readData();
        data.blogs = data.blogs.filter(b => b.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { handleErr(res, e); }
});

// Members admin
app.put('/api/admin/members/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = data.members.findIndex(m => m.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        data.members[idx] = { ...data.members[idx], ...req.body, id: data.members[idx].id };
        await writeData(data);
        const { password, ...safe } = data.members[idx];
        res.json({ success: true, member: safe });
    } catch (e) { handleErr(res, e); }
});
app.delete('/api/admin/members/:id', async (req, res) => {
    try {
        const data = await readData();
        data.members = data.members.filter(m => m.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { handleErr(res, e); }
});

// Boards admin edit
app.put('/api/admin/boards/:id', async (req, res) => {
    try {
        const data = await readData();
        const post = (data.boards || []).find(b => b.id === req.params.id);
        if (!post) return res.status(404).json({ error: 'not found' });
        post.title = req.body.title || post.title;
        post.content = req.body.content || post.content;
        post.category = req.body.category || post.category;
        post.updatedAt = new Date().toISOString();
        await writeData(data);
        res.json({ success: true, post });
    } catch (e) { handleErr(res, e); }
});

// Boards admin delete
app.delete('/api/admin/boards/:id', async (req, res) => {
    try {
        const data = await readData();
        data.boards = (data.boards || []).filter(b => b.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { handleErr(res, e); }
});

// ==================== INTERVIEWS (backward compat - reads from blogs) ====================
app.get('/api/interviews', async (req, res) => {
    try {
        const data = await readData();
        // Return blogs with category 活動ムービー in interview format (for hero video digest etc.)
        const videoBlogs = (data.blogs || []).filter(b => b.category === '活動ムービー' && b.youtubeId);
        const asInterviews = videoBlogs.map(b => ({
            id: b.id, title: b.title, description: b.excerpt || b.content || '',
            youtubeUrl: b.youtubeUrl || '', youtubeId: b.youtubeId || '',
            speaker: b.author || '運営事務局', date: b.date || '', order: b.order || 0
        }));
        // Also include any remaining legacy interviews
        const legacy = (data.interviews || []);
        const allIds = new Set(asInterviews.map(i => i.id));
        legacy.forEach(iv => { if (!allIds.has(iv.id)) asInterviews.push(iv); });
        res.json(asInterviews);
    } catch (e) { handleErr(res, e); }
});
// Legacy interview CRUD - redirect to blogs
app.post('/api/admin/interviews', async (req, res) => {
    try {
        const data = await readData();
        const { youtubeUrl, title, speaker, description, date } = req.body;
        const youtubeId = extractYoutubeId(youtubeUrl);
        const blog = {
            id: genId('blog'), title: title || '', date: date || new Date().toISOString().split('T')[0],
            category: '活動ムービー', excerpt: description || '', content: description || '',
            author: speaker || '運営事務局',
            imageUrl: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '',
            youtubeUrl: youtubeUrl || '', youtubeId
        };
        data.blogs.push(blog);
        await writeData(data);
        res.json({ success: true, interview: blog });
    } catch (e) { handleErr(res, e); }
});
app.put('/api/admin/interviews/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = data.blogs.findIndex(b => b.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        const { youtubeUrl, title, speaker, description, date } = req.body;
        const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : data.blogs[idx].youtubeId;
        Object.assign(data.blogs[idx], {
            title: title || data.blogs[idx].title,
            excerpt: description || data.blogs[idx].excerpt,
            content: description || data.blogs[idx].content,
            author: speaker || data.blogs[idx].author,
            date: date || data.blogs[idx].date,
            youtubeUrl: youtubeUrl || data.blogs[idx].youtubeUrl,
            youtubeId: youtubeId || data.blogs[idx].youtubeId,
            imageUrl: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : data.blogs[idx].imageUrl
        });
        await writeData(data);
        res.json({ success: true, interview: data.blogs[idx] });
    } catch (e) { handleErr(res, e); }
});
app.delete('/api/admin/interviews/:id', async (req, res) => {
    try {
        const data = await readData();
        data.blogs = (data.blogs || []).filter(b => b.id !== req.params.id);
        // Also clean legacy interviews
        data.interviews = (data.interviews || []).filter(i => i.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { handleErr(res, e); }
});

// ==================== OPERATING MEMBERS ====================
app.get('/api/operating-members', async (req, res) => {
    try {
        const data = await readData();
        const opIds = data.operatingMembers || [];
        const explicit = data.members
            .filter(m => opIds.includes(m.id))
            .map(({ password, ...m }) => m);
        // フォールバック: operatingMembers が未設定なら isAdmin:true の公開メンバーを運営扱いで返す
        // （admin 画面で明示設定するまでの初期表示用）
        if (explicit.length === 0) {
            const fallback = data.members
                .filter(m => m.isAdmin && m.isPublic !== false)
                .map(({ password, ...m }) => m);
            return res.json(fallback);
        }
        res.json(explicit);
    } catch (e) { handleErr(res, e); }
});
app.get('/api/admin/operating-members', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.operatingMembers || []);
    } catch (e) { handleErr(res, e); }
});
app.put('/api/admin/operating-members', async (req, res) => {
    try {
        const data = await readData();
        data.operatingMembers = req.body.memberIds || [];
        await writeData(data);
        res.json({ success: true, operatingMembers: data.operatingMembers });
    } catch (e) { handleErr(res, e); }
});

// OG Image proxy
app.get('/api/og-image', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) return res.json({ image: '' });
        const https = require('https');
        const http = require('http');
        const proto = url.startsWith('https') ? https : http;
        proto.get(url, { timeout: 5000 }, (resp) => {
            let html = '';
            resp.on('data', c => html += c);
            resp.on('end', () => {
                const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
                    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
                res.json({ image: ogMatch ? ogMatch[1] : '' });
            });
        }).on('error', () => res.json({ image: '' }));
    } catch { res.json({ image: '' }); }
});

// Contact
app.post('/api/contact', async (req, res) => {
    res.json({ success: true, message: 'お問い合わせを受け付けました' });
});

// Backup
/* 共通: snapshot を作成。prefix は 'data-' (手動) / 'auto-' (自動) などに切替可能 */
async function makeBackupSnapshot(prefix = 'data-') {
    const data = await readData();
    const dir = path.join(PERSISTENT_DIR, 'backups');
    await fs.mkdir(dir, { recursive: true });
    const fn = `${prefix}${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(path.join(dir, fn), JSON.stringify(data, null, 2));
    return fn;
}

/* 24時間ごとの自動バックアップ：直近30日ぶんのみ保持 */
async function autoBackupAndRotate() {
    try {
        const fn = await makeBackupSnapshot('auto-');
        // ローテート：auto- 30 ファイル超は古い順に削除
        const dir = path.join(PERSISTENT_DIR, 'backups');
        const files = (await fs.readdir(dir)).filter(f => f.startsWith('auto-') && f.endsWith('.json')).sort();
        const overflow = files.length - 30;
        if (overflow > 0) {
            for (const f of files.slice(0, overflow)) {
                try { await fs.unlink(path.join(dir, f)); } catch {}
            }
        }
        console.log(`[backup] auto snapshot: ${fn} (rotate=${Math.max(0,overflow)})`);
    } catch (e) {
        console.warn('[backup] auto snapshot failed:', e.message);
    }
}
// 起動の少し後に1回 + 24時間毎
setTimeout(autoBackupAndRotate, 60 * 1000);
setInterval(autoBackupAndRotate, 24 * 60 * 60 * 1000);

app.get('/api/admin/backup', async (req, res) => {
    try {
        const fn = await makeBackupSnapshot('data-');
        res.json({ success: true, filename: fn });
    } catch (e) { handleErr(res, e); }
});

// Backup list
app.get('/api/admin/backups', async (req, res) => {
    try {
        const dir = path.join(PERSISTENT_DIR, 'backups');
        try { await fs.access(dir); } catch { return res.json({ backups: [] }); }
        const files = await fs.readdir(dir);
        const jsonFiles = files.filter(f => (f.startsWith('data-') || f.startsWith('auto-')) && f.endsWith('.json'));
        const backups = [];
        for (const f of jsonFiles) {
            const stat = await fs.stat(path.join(dir, f));
            let preview = {};
            try {
                const raw = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
                preview = {
                    members: (raw.members || []).length,
                    events: (raw.events || []).length,
                    boards: (raw.boards || []).length,
                    blogs: (raw.blogs || []).length,
                    interviews: (raw.interviews || []).length
                };
            } catch {}
            backups.push({ filename: f, size: stat.size, date: stat.mtime, preview });
        }
        backups.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ backups });
    } catch (e) { res.status(500).json({ error: 'バックアップ一覧取得エラー' }); }
});

// Backup download
app.get('/api/admin/backups/:filename', async (req, res) => {
    try {
        const fn = req.params.filename;
        if (!/^data-.*\.json$/.test(fn)) return res.status(400).json({ error: '不正なファイル名' });
        const fp = path.join(__dirname, 'backups', fn);
        try { await fs.access(fp); } catch { return res.status(404).json({ error: 'ファイルが見つかりません' }); }
        res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
        res.setHeader('Content-Type', 'application/json');
        const content = await fs.readFile(fp, 'utf8');
        res.send(content);
    } catch (e) { res.status(500).json({ error: 'ダウンロードエラー' }); }
});

// Backup restore — creates a safety backup first, then overwrites data.json
app.post('/api/admin/backups/:filename/restore', async (req, res) => {
    try {
        const fn = req.params.filename;
        if (!/^data-.*\.json$/.test(fn)) return res.status(400).json({ error: '不正なファイル名' });
        const fp = path.join(__dirname, 'backups', fn);
        try { await fs.access(fp); } catch { return res.status(404).json({ error: 'ファイルが見つかりません' }); }
        const backupData = JSON.parse(await fs.readFile(fp, 'utf8'));
        // Validate structure
        if (!backupData || typeof backupData !== 'object') {
            return res.status(400).json({ error: 'バックアップデータの形式が不正です' });
        }
        // Create safety backup of current data before restore
        const dir = path.join(PERSISTENT_DIR, 'backups');
        await fs.mkdir(dir, { recursive: true });
        const currentData = await readData();
        const safetyFn = `data-pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(path.join(dir, safetyFn), JSON.stringify(currentData, null, 2));
        // Restore
        await writeData(backupData);
        const preview = {
            members: (backupData.members || []).length,
            events: (backupData.events || []).length,
            boards: (backupData.boards || []).length,
            blogs: (backupData.blogs || []).length,
            interviews: (backupData.interviews || []).length
        };
        res.json({ success: true, safetyBackup: safetyFn, restored: fn, preview });
    } catch (e) {
        console.error('Restore error:', e);
        res.status(500).json({ error: 'リストアに失敗しました: ' + e.message });
    }
});

// Backup delete
app.delete('/api/admin/backups/:filename', async (req, res) => {
    try {
        const fn = req.params.filename;
        if (!/^data-.*\.json$/.test(fn)) return res.status(400).json({ error: '不正なファイル名' });
        const fp = path.join(__dirname, 'backups', fn);
        try { await fs.access(fp); } catch { return res.status(404).json({ error: 'ファイルが見つかりません' }); }
        await fs.unlink(fp);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: '削除エラー' }); }
});

// Backup upload (restore from uploaded JSON file)
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
app.post('/api/admin/backups/upload', memUpload.single('backup'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'ファイルが選択されていません' });
        const raw = req.file.buffer.toString('utf8');
        const backupData = JSON.parse(raw);
        if (!backupData || typeof backupData !== 'object') {
            return res.status(400).json({ error: 'JSONの形式が不正です' });
        }
        // Create safety backup
        const dir = path.join(PERSISTENT_DIR, 'backups');
        await fs.mkdir(dir, { recursive: true });
        const currentData = await readData();
        const safetyFn = `data-pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(path.join(dir, safetyFn), JSON.stringify(currentData, null, 2));
        // Restore
        await writeData(backupData);
        const preview = {
            members: (backupData.members || []).length,
            events: (backupData.events || []).length,
            boards: (backupData.boards || []).length,
            blogs: (backupData.blogs || []).length,
            interviews: (backupData.interviews || []).length
        };
        res.json({ success: true, safetyBackup: safetyFn, preview });
    } catch (e) {
        console.error('Upload restore error:', e);
        res.status(500).json({ error: 'アップロードリストアに失敗しました: ' + e.message });
    }
});

// ==================== RSS FEED ====================
function escXml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }

// ==================== SEO: robots.txt & sitemap.xml ====================
// proxy 越しでも https を正しく検出するヘルパ
function pickBaseUrl(req) {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`.replace(/\/$/, '');
}

app.get('/robots.txt', (req, res) => {
    const baseUrl = pickBaseUrl(req);
    res.type('text/plain').send([
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /admin.html',
        'Disallow: /api/',
        'Disallow: /uploads/_private/',
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        ''
    ].join('\n'));
});

app.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = pickBaseUrl(req);
        const data = await readData();
        const now = new Date().toISOString();
        const urls = [];
        // top page + main anchors (single-page site)
        urls.push({ loc: `${baseUrl}/`, lastmod: now, changefreq: 'weekly', priority: '1.0' });
        ['#about','#events','#blogs','#members','#board','#faq','#contact'].forEach(h => {
            urls.push({ loc: `${baseUrl}/${h}`, lastmod: now, changefreq: 'weekly', priority: '0.8' });
        });
        // individual blog/interview pages
        (data.blogs || []).forEach(b => {
            if (b && b.id) urls.push({
                loc: `${baseUrl}/blog/${encodeURIComponent(b.id)}`,
                lastmod: b.date || now,
                changefreq: 'monthly',
                priority: '0.7'
            });
        });
        (data.interviews || []).forEach(iv => {
            if (iv && iv.id) urls.push({
                loc: `${baseUrl}/blog/${encodeURIComponent(iv.id)}`,
                lastmod: iv.date || now,
                changefreq: 'monthly',
                priority: '0.7'
            });
        });
        // upcoming/past events
        (data.events || []).forEach(ev => {
            if (ev && ev.id) urls.push({
                loc: `${baseUrl}/event/${encodeURIComponent(ev.id)}`,
                lastmod: ev.updatedAt || ev.date || now,
                changefreq: 'weekly',
                priority: '0.7'
            });
        });
        const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + urls.map(u =>
                `  <url><loc>${escXml(u.loc)}</loc><lastmod>${escXml(u.lastmod)}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
            ).join('\n')
            + '\n</urlset>\n';
        res.type('application/xml').send(xml);
    } catch (e) {
        console.error('sitemap error', e);
        res.status(500).type('text/plain').send('sitemap error');
    }
});

app.get('/rss', async (req, res) => { res.redirect(301, '/feed'); });
app.get('/feed', async (req, res) => {
    try {
        const data = await readData();
        // Merge blogs and interviews
        const allPosts = (data.blogs || []).slice();
        (data.interviews || []).forEach(iv => {
            if (!allPosts.some(b => b.id === iv.id)) {
                allPosts.push({
                    id: iv.id, title: iv.title || '', date: iv.date || '',
                    category: '活動ムービー', excerpt: iv.description || '', content: iv.description || '',
                    author: iv.speaker || '運営事務局',
                    imageUrl: iv.youtubeId ? `https://img.youtube.com/vi/${iv.youtubeId}/hqdefault.jpg` : '',
                    youtubeId: iv.youtubeId || '', youtubeUrl: iv.youtubeUrl || ''
                });
            }
        });
        const blogs = allPosts.sort((a,b) => (b.date||'').localeCompare(a.date||''));
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const baseUrl = `${proto}://${host}`;
        const lastBuild = blogs.length ? new Date(blogs[0].date + 'T00:00:00+09:00').toUTCString() : new Date().toUTCString();

        let items = '';
        for (const b of blogs) {
            const link = `${baseUrl}/blog/${b.id}`;
            const pubDate = new Date(b.date + 'T00:00:00+09:00').toUTCString();
            const img = b.imageUrl ? (b.imageUrl.startsWith('http') ? b.imageUrl : `${baseUrl}${b.imageUrl}`) : '';
            const desc = b.excerpt || b.content || '';
            items += `
    <item>
      <title>${escXml(b.title)}</title>
      <link>${escXml(link)}</link>
      <guid isPermaLink="true">${escXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escXml(desc)}</description>
      <category>${escXml(b.category || 'お知らせ')}</category>
      <dc:creator>${escXml(b.author || '運営事務局')}</dc:creator>${img ? `
      <enclosure url="${escXml(img)}" type="image/jpeg" length="0"/>
      <media:content url="${escXml(img)}" medium="image"/>` : ''}
    </item>`;
        }

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>みんなのWA - お知らせ・活動レポート</title>
    <link>${baseUrl}</link>
    <description>彦根発 異業種交流コミュニティ「みんなのWA」のお知らせ・活動レポート</description>
    <language>ja</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/favicon.svg</url>
      <title>みんなのWA</title>
      <link>${baseUrl}</link>
    </image>${items}
  </channel>
</rss>`;
        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.set('Cache-Control', 'public, max-age=3600');
        res.send(rss);
    } catch (e) {
        console.error('RSS feed error:', e);
        res.status(500).send('RSS generation error');
    }
});

// ==================== BLOG PAGE with OG + JSON-LD ====================
app.get('/blog/:id', async (req, res) => {
    try {
        const data = await readData();
        // Search in blogs first, then interviews
        let blog = (data.blogs || []).find(b => b.id === req.params.id);
        if (!blog) {
            // Try interviews - convert to blog format
            const iv = (data.interviews || []).find(i => i.id === req.params.id);
            if (iv) {
                blog = {
                    id: iv.id, title: iv.title || '', date: iv.date || '',
                    category: '活動ムービー', excerpt: iv.description || '', content: iv.description || '',
                    author: iv.speaker || '運営事務局',
                    imageUrl: iv.youtubeId ? `https://img.youtube.com/vi/${iv.youtubeId}/hqdefault.jpg` : '',
                    youtubeId: iv.youtubeId || '', youtubeUrl: iv.youtubeUrl || ''
                };
            }
        }
        if (!blog) return res.redirect('/?blog_not_found=1');

        const htmlPath = path.join(__dirname, 'index.html');
        let html = await fs.readFile(htmlPath, 'utf8');
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const baseUrl = `${proto}://${host}`;
        const blogUrl = `${baseUrl}/blog/${blog.id}`;
        const title = `${blog.title} - みんなのWA`;
        const desc = (blog.excerpt || blog.content || 'みんなのWA お知らせ・活動レポート').substring(0, 200);
        const image = blog.imageUrl ? (blog.imageUrl.startsWith('http') ? blog.imageUrl : `${baseUrl}${blog.imageUrl}`) : `${baseUrl}/icon-512.png`;
        const dateISO = blog.date ? `${blog.date}T00:00:00+09:00` : new Date().toISOString();

        // OG + Twitter meta tags
        const ogTags = `
    <meta property="og:type" content="article">
    <meta property="og:url" content="${blogUrl}">
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="みんなのWA">
    <meta property="article:published_time" content="${dateISO}">
    <meta property="article:author" content="${(blog.author || '運営事務局').replace(/"/g, '&quot;')}">
    <meta property="article:section" content="${(blog.category || 'お知らせ').replace(/"/g, '&quot;')}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
    <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta name="twitter:image" content="${image}">`;

        // JSON-LD BlogPosting
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "mainEntityOfPage": { "@type": "WebPage", "@id": blogUrl },
            "headline": blog.title,
            "description": desc,
            "image": image,
            "datePublished": dateISO,
            "dateModified": dateISO,
            "author": {
                "@type": "Person",
                "name": blog.author || "運営事務局"
            },
            "publisher": {
                "@type": "Organization",
                "name": "みんなのWA",
                "logo": { "@type": "ImageObject", "url": `${baseUrl}/icon-512.png`, "width": 512, "height": 512 }
            },
            "articleSection": blog.category || "お知らせ",
            "url": blogUrl,
            "inLanguage": "ja"
        };

        const jsonLdScript = `\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

        html = html.replace('</head>', `${ogTags}${jsonLdScript}\n</head>`);
        // Inject auto-open blog script
        html = html.replace('</body>', `<script>window._autoOpenBlogId="${blog.id}";</script>\n</body>`);
        res.send(html);
    } catch (e) {
        console.error('Blog page error:', e);
        res.redirect('/');
    }
});

// Event ICS export — open in Apple/Google/Outlook Calendar
app.get('/event/:id/ics', async (req, res) => {
    try {
        const data = await readData();
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).type('text/plain').send('event not found');
        // Helper: ISO local → UTC stamp YYYYMMDDTHHMMSSZ
        const pad = n => String(n).padStart(2, '0');
        const toUtc = (iso) => {
            const d = new Date(iso);
            return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate())
                + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
        };
        // 開始時刻を組み立て：date + time(HH:MM) → JST
        const timeRaw = (ev.time || '19:00').replace(/[^0-9:]/g, '').slice(0, 5) || '19:00';
        const startJst = `${ev.date}T${timeRaw}:00+09:00`;
        const startDt = new Date(startJst);
        const endDt = new Date(startDt.getTime() + 2 * 60 * 60 * 1000); // default 2h
        const dtstart = toUtc(startDt);
        const dtend = toUtc(endDt);
        const dtstamp = toUtc(new Date());
        const esc = (s) => String(s || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
        const baseUrl = pickBaseUrl(req);
        const url = `${baseUrl}/event/${ev.id}`;
        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//minanowa//event//JP',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `UID:${ev.id}@minanowa`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `SUMMARY:${esc(ev.title || 'みんなのWA イベント')}`,
            `DESCRIPTION:${esc((ev.description || '') + '\n参加申込: ' + url)}`,
            `LOCATION:${esc(ev.location || '彦根市内')}`,
            `URL:${url}`,
            'END:VEVENT',
            'END:VCALENDAR',
            ''
        ].join('\r\n');
        res.set('Content-Type', 'text/calendar; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="event-${encodeURIComponent(ev.id)}.ics"`);
        res.send(ics);
    } catch (e) {
        console.error('ics error', e);
        res.status(500).type('text/plain').send('ics generation error');
    }
});

// Event share page with OG meta + Event JSON-LD injection
app.get('/event/:id', async (req, res) => {
    try {
        const data = await readData();
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.redirect('/?event_not_found=1');
        const htmlPath = path.join(__dirname, 'index.html');
        let html = await fs.readFile(htmlPath, 'utf8');
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const baseUrl = `${proto}://${host}`;
        const shareUrl = `${baseUrl}/event/${ev.id}`;
        const title = `${ev.title} - みんなのWA`;
        const desc = `📅 ${ev.date} ${ev.time || ''} 📍 ${ev.location} | 💰 ${ev.fee || '未設定'} | ${ev.description || 'みんなのWA イベント'}`;
        const image = ev.imageUrl ? (ev.imageUrl.startsWith('http') ? ev.imageUrl : `${baseUrl}${ev.imageUrl}`) : `${baseUrl}/icon-512.png`;
        const isoStart = ev.date ? `${ev.date}T${(ev.time || '19:00').replace(/[^0-9:]/g,'').slice(0,5) || '19:00'}:00+09:00` : new Date().toISOString();
        const evJsonLd = {
            "@context": "https://schema.org",
            "@type": "Event",
            "name": ev.title,
            "startDate": isoStart,
            "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
            "eventStatus": "https://schema.org/EventScheduled",
            "location": { "@type": "Place", "name": ev.location || "彦根市内", "address": { "@type": "PostalAddress", "addressLocality": "彦根市", "addressRegion": "滋賀県", "addressCountry": "JP" } },
            "image": [image],
            "description": ev.description || "みんなのWA 異業種交流会",
            "organizer": { "@type": "Organization", "name": "みんなのWA", "url": baseUrl },
            "url": shareUrl,
            "inLanguage": "ja-JP",
            "isAccessibleForFree": !ev.fee || /無料|free/i.test(ev.fee || ''),
            "offers": ev.fee ? { "@type": "Offer", "price": String(ev.fee).replace(/[^0-9]/g,'') || "0", "priceCurrency": "JPY", "availability": "https://schema.org/InStock", "url": shareUrl } : undefined
        };
        const ogTags = `
    <meta property="og:type" content="website">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="みんなのWA">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
    <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta name="twitter:image" content="${image}">
    <script type="application/ld+json">${JSON.stringify(evJsonLd)}</script>`;
        html = html.replace('</head>', `${ogTags}\n</head>`);
        // Inject auto-open script
        html = html.replace('</body>', `<script>window._autoOpenEventId="${ev.id}";</script>\n</body>`);
        res.send(html);
    } catch (e) {
        console.error('Event share page error:', e);
        res.redirect('/');
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
});

// ========== AI: Generate shop info from Google Maps URL ==========
app.post('/api/ai/generate-shop-info', async (req, res) => {
    try {
        const { googleMapUrl } = req.body;
        if (!googleMapUrl) return res.status(400).json({ error: 'Google Maps URLが必要です' });

        // 1. Resolve short URL to get place info from the final URL
        let finalUrl = googleMapUrl;
        try {
            const https = require('https');
            const http = require('http');
            const resolveRedirect = (url) => new Promise((resolve) => {
                const mod = url.startsWith('https') ? https : http;
                const rq = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
                    if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                        resolve(resp.headers.location);
                    } else { resolve(url); }
                });
                rq.on('error', () => resolve(url));
                rq.setTimeout(8000, () => { rq.destroy(); resolve(url); });
            });
            for (let i = 0; i < 5; i++) {
                const next = await resolveRedirect(finalUrl);
                if (next === finalUrl) break;
                finalUrl = next;
            }
        } catch (e) { /* keep original */ }

        // 2. Extract place name/address from URL
        const decoded = decodeURIComponent(finalUrl);
        let placeName = '';
        // /place/NAME/ pattern (most reliable - actual place name)
        const placeMatch = decoded.match(/\/place\/([^/@]+)/);
        if (placeMatch) placeName = placeMatch[1].replace(/\+/g, ' ');
        // /maps?q= pattern
        if (!placeName) {
            const qMatch = decoded.match(/[?&]q=([^&]+)/);
            if (qMatch) placeName = qMatch[1].replace(/\+/g, ' ');
        }

        // Clean placeName: remove address-like content, keep only store name
        // Example: "〒522-0043 滋賀県彦根市小泉町３４−８ Notエステ彦根 美肌脱毛ホワイトニング"
        //   → "Notエステ彦根 美肌脱毛ホワイトニング"
        let rawPlaceName = placeName; // keep raw for AI prompt
        if (placeName) {
            placeName = placeName
                .replace(/^〒[\d-]+\s*/, '')          // remove postal code 〒xxx-xxxx
                .replace(/^\d{3}-?\d{4}\s*/, '')      // remove zip without 〒
                .replace(/^日本[、,\s]+/, '')           // remove 日本 prefix
                .trim();
            // Try to extract store name after address pattern:
            // address pattern: prefecture + city + town + number
            const addrStoreMatch = placeName.match(/[都道府県].+?[市区町村郡].+?[町村丁目条].{0,10}?[\d０-９]+[^\s]*\s+(.+)/);
            if (addrStoreMatch && addrStoreMatch[1]) {
                placeName = addrStoreMatch[1].trim();
            } else if (/^[^\s]{1,4}[都道府県]/.test(placeName)) {
                // Still starts with prefecture - try splitting on last number sequence
                const numSplit = placeName.match(/[\d０-９]+[−\-号]*\s+(.+)/);
                if (numSplit && numSplit[1]) {
                    placeName = numSplit[1].trim();
                } else {
                    // Pure address, no store name found
                    placeName = '';
                }
            }
        }

        // 3. Try AI generation
        let aiResult = null;
        try {
            const OpenAI = require('openai');
            const yaml = require('js-yaml');
            const os = require('os');
            const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
            let aiConfig = {};
            try { aiConfig = yaml.load(require('fs').readFileSync(configPath, 'utf8')); } catch (e) {}
            const apiKey = process.env.OPENAI_API_KEY || aiConfig?.openai?.api_key;
            const baseURL = process.env.OPENAI_BASE_URL || aiConfig?.openai?.base_url;
            if (apiKey && baseURL) {
                const client = new OpenAI({ apiKey, baseURL });
                const prompt = `Google Maps情報(生データ): ${rawPlaceName || '不明'}\n抽出した店名: ${placeName || '不明'}\nGoogle Maps URL: ${googleMapUrl}\n解決URL: ${decoded.substring(0,300)}\n\n上記のGoogle Maps情報から店舗を特定し、以下のJSON形式で返してください。\n\n【重要ルール】\n- "profession" には店名のみを入れてください。住所・郵便番号・地域名は絶対に含めないでください。例: "○○カフェ" "△△サロン"\n- "business" にはその店が提供する主なサービスや業種を短くまとめてください（例: "カフェ・焙煎豆販売", "美容脱毛・ホワイトニング", "整骨・鍼灸"）\n- "introduction" は店の特徴・魅力・人気メニューやサービスを含めて120文字程度で書いてください\n- 実在する店舗の情報をできる限りリサーチし、正確な内容にしてください\n\n{"profession":"店名のみ","introduction":"120文字程度の紹介文","business":"主なサービス・業種"}`;
                const completion = await client.chat.completions.create({
                    model: 'gpt-5-mini',
                    messages: [
                        { role: 'system', content: 'あなたはGoogleマップの店舗情報を正確にリサーチし、店名・サービス内容・紹介文を生成するプロのアシスタントです。店名には住所や地域名を絶対に含めないでください。提供サービスをできるだけ具体的に調べてください。JSONのみ返してください。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7, max_tokens: 500
                });
                const text = completion.choices[0]?.message?.content || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
            }
        } catch (e) { console.log('AI fallback:', e.message, e.status || ''); }

        // 4. Fallback: use URL-extracted info
        if (aiResult && aiResult.profession) {
            // Post-process AI result: strip any address from profession
            aiResult.profession = (aiResult.profession || '')
                .replace(/^〒[\d-]+\s*/, '')
                .replace(/^[\d-]+\s*/, '')
                .replace(/^日本[、,\s]+/, '')
                .replace(/^[^\s]{1,4}[都道府県][^\s]*[市区町村郡][^\s]*\s*/, '')
                .trim();
            return res.json({ success: true, ...aiResult, placeName });
        }
        // Fallback result from URL parsing (placeName already cleaned above)
        if (placeName) {
            return res.json({
                success: true,
                profession: placeName,
                business: '',
                introduction: '',
                placeName,
                note: 'マップURLから店名を取得しました。紹介文は手動で入力してください。'
            });
        }
        res.status(400).json({ error: 'URLから店舗情報を取得できませんでした。正しいGoogle Maps URLを入力してください。' });
    } catch (err) {
        console.error('AI generate error:', err);
        res.status(500).json({ error: '情報取得に失敗しました: ' + (err.message || '') });
    }
});

// Admin: Sync map coordinates from seed data (GitHub) to persistent data
app.post('/api/admin/sync-map-coords', async (req, res) => {
    try {
        const data = await readData();
        let seedData;
        try { seedData = JSON.parse(await fs.readFile(SEED_DATA_FILE, 'utf8')); } catch { return res.json({ success: false, error: 'シードデータなし' }); }
        let count = 0;
        for (const m of data.members) {
            if (m.mapLat && m.mapLng) continue;
            const seed = (seedData.members || []).find(s => s.id === m.id || s.email === m.email);
            if (seed && seed.mapLat && seed.mapLng) {
                m.mapLat = seed.mapLat;
                m.mapLng = seed.mapLng;
                count++;
            }
        }
        if (count > 0) await writeData(data);
        res.json({ success: true, synced: count });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, async () => {
    console.log(`🎉 みんなのWA Server running on port ${PORT}`);
    console.log(`📁 Data file: ${DATA_FILE}`);
    console.log(`💾 Persistent dir: ${PERSISTENT_DIR}`);
    console.log(`🔒 運用ルール: data.jsonはAIデベロッパーで編集禁止！管理画面から操作すること`);
    // 永続ディスクのディレクトリを確保
    await fs.mkdir(PERSISTENT_DIR, { recursive: true }).catch(() => {});
    await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

    // ========== FORCE RESEED (環境変数 FORCE_RESEED=true で1回だけ実行) ==========
    if (process.env.FORCE_RESEED === 'true') {
        console.log('🔄 FORCE_RESEED: データベースと画像をGitHubのコードから上書きします...');
        try {
            // 1) data.json をコピー
            await fs.copyFile(SEED_DATA_FILE, DATA_FILE);
            console.log('  ✅ data.json を上書きしました');
            // 2) uploads をコピー (GitHub側 → 永続ディスク側)
            const seedUploadsDir = path.join(__dirname, 'uploads');
            const files = await fs.readdir(seedUploadsDir).catch(() => []);
            let copied = 0;
            for (const f of files) {
                const src = path.join(seedUploadsDir, f);
                const dst = path.join(uploadDir, f);
                await fs.copyFile(src, dst);
                copied++;
            }
            console.log(`  ✅ uploads ${copied}枚をコピーしました`);
            // 3) 永続ディスクの不要画像を削除 (GitHub側に無いファイル)
            const seedFiles = new Set(files);
            const persistFiles = await fs.readdir(uploadDir).catch(() => []);
            let removed = 0;
            for (const f of persistFiles) {
                if (!seedFiles.has(f)) {
                    await fs.unlink(path.join(uploadDir, f)).catch(() => {});
                    removed++;
                }
            }
            if (removed > 0) console.log(`  🗑️ 不要画像 ${removed}枚を削除しました`);
            console.log('🎉 FORCE_RESEED 完了！環境変数 FORCE_RESEED を削除してください');
        } catch (e) {
            console.error('❌ FORCE_RESEED 失敗:', e.message);
        }
    }
    // ========== END FORCE RESEED ==========

    // 初回のみ: data.jsonが永続ディスクに無ければシードデータをコピー
    try {
        await fs.access(DATA_FILE);
        console.log('✅ 既存データを使用します（永続ディスク）');
        // Merge mapLat/mapLng from seed if missing in persistent data
        try {
            const seedRaw = await fs.readFile(SEED_DATA_FILE, 'utf8');
            const seedData = JSON.parse(seedRaw);
            const liveData = await readData();
            let merged = 0;
            for (const m of liveData.members) {
                if (m.mapLat && m.mapLng) continue;
                const seed = (seedData.members || []).find(s => s.id === m.id || s.email === m.email);
                if (seed && seed.mapLat && seed.mapLng) {
                    m.mapLat = seed.mapLat;
                    m.mapLng = seed.mapLng;
                    merged++;
                }
            }
            if (merged > 0) {
                await writeData(liveData);
                console.log(`📍 シードから${merged}人のマップ座標をマージしました`);
            }
        } catch (e) { /* seed file may not differ from DATA_FILE */ }
    } catch {
        try {
            await fs.access(SEED_DATA_FILE);
            await fs.copyFile(SEED_DATA_FILE, DATA_FILE);
            console.log('📦 初期データをセットアップしました（GitHub → 永続ディスク）');
        } catch {
            await fs.writeFile(DATA_FILE, JSON.stringify({ members: [], events: [], blogs: [], boards: [], siteSettings: {} }, null, 2));
            console.log('📦 空のデータベースを作成しました');
        }
    }
    // Auto-fill missing introductions from Google Maps URLs
    try {
        const data = await readData();
        const members = data.members || [];
        const toFill = members.filter(m => !m.introduction && m.googleMapUrl);
        if (toFill.length > 0) {
            console.log(`🤖 Auto-generating introductions for ${toFill.length} member(s)...`);
            const OpenAI = require('openai');
            const yaml = require('js-yaml');
            const os = require('os');
            const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
            let aiConfig = {};
            try { aiConfig = yaml.load(require('fs').readFileSync(configPath, 'utf8')); } catch (e) {}
            const apiKey = process.env.OPENAI_API_KEY || aiConfig?.openai?.api_key;
            const baseURL = process.env.OPENAI_BASE_URL || aiConfig?.openai?.base_url;
            if (apiKey) {
                const client = new OpenAI({ apiKey, baseURL });
                for (const m of toFill) {
                    try {
                        const name = m.profession || m.name || '';
                        const biz = m.business || '';
                        const completion = await client.chat.completions.create({
                            model: 'gpt-5-mini',
                            messages: [
                                { role: 'system', content: 'あなたはGoogleマップの店舗情報を正確にリサーチし、紹介文を生成するプロのアシスタントです。提供サービスや人気メニューをできるだけ具体的に調べてください。JSONのみ返してください。' },
                                { role: 'user', content: `店名: ${name}\n事業: ${biz}\nGoogle Maps URL: ${m.googleMapUrl}\n\n上記の店舗をリサーチし、提供サービス・人気メニュー・特徴を含めた紹介文を120文字程度で生成してください。JSONで{"introduction":"紹介文"}のみ返してください。` }
                            ],
                            temperature: 0.7, max_tokens: 300
                        });
                        const text = completion.choices[0]?.message?.content || '';
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const result = JSON.parse(jsonMatch[0]);
                            if (result.introduction) {
                                m.introduction = result.introduction;
                                console.log(`  ✅ ${name}: ${result.introduction.substring(0, 50)}...`);
                            }
                        }
                    } catch (e) { console.error(`  ❌ ${m.name}: ${e.message}`); }
                }
                await writeData(data);
                console.log('🤖 Auto-generation complete.');
            }
        }
    } catch (e) { console.error('Auto-fill error:', e.message); }
    // Ensure uploads directory exists
    await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});
    // Auto-cache map coordinates for members missing mapLat/mapLng
    try {
        const data = await readData();
        const needCoords = (data.members || []).filter(m => m.googleMapUrl && (!m.mapLat || !m.mapLng));
        if (needCoords.length > 0) {
            console.log(`📍 ${needCoords.length}人のマップ座標をキャッシュ中...`);
            const https = require('https');
            const http = require('http');
            const resolveMapCoords = (mapUrl) => new Promise((resolve) => {
                const followRedirects = (url, depth) => {
                    if (depth > 8) return resolve(null);
                    const mod = url.startsWith('https') ? https : http;
                    const rq = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinnanoWA/1.0)' } }, (resp) => {
                        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                            const loc = resp.headers.location;
                            const cm = loc.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                            if (cm) return resolve({ lat: parseFloat(cm[1]), lng: parseFloat(cm[2]) });
                            followRedirects(loc, depth + 1);
                        } else {
                            let body = '';
                            resp.on('data', c => body += c);
                            resp.on('end', () => {
                                const cm = body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                                if (cm) return resolve({ lat: parseFloat(cm[1]), lng: parseFloat(cm[2]) });
                                // Try geocode from ?q= param
                                try {
                                    const finalUrl = resp.headers.location || url;
                                    const urlObj = new URL(finalUrl);
                                    const q = urlObj.searchParams.get('q');
                                    if (q) {
                                        const addr = decodeURIComponent(q).replace(/\+/g,' ')
                                            .replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0))
                                            .replace(/[−－]/g,'-').replace(/〒?\d{3}-?\d{4}\s*/g,'').trim();
                                        const city = addr.match(/(.*?[市区町村郡])/);
                                        const geoQ = city ? city[1] : addr.substring(0, 20);
                                        const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geoQ)}&limit=1`;
                                        https.get(geoUrl, { headers: { 'User-Agent': 'MinnanoWA/1.0' } }, (gr) => {
                                            let gb = '';
                                            gr.on('data', c => gb += c);
                                            gr.on('end', () => {
                                                try {
                                                    const results = JSON.parse(gb);
                                                    if (results.length > 0) resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
                                                    else resolve(null);
                                                } catch { resolve(null); }
                                            });
                                        }).on('error', () => resolve(null));
                                        return;
                                    }
                                } catch {}
                                resolve(null);
                            });
                        }
                    });
                    rq.on('error', () => resolve(null));
                    rq.setTimeout(10000, () => { rq.destroy(); resolve(null); });
                };
                followRedirects(mapUrl, 0);
            });
            let updated = false;
            for (const m of needCoords) {
                try {
                    const coords = await resolveMapCoords(m.googleMapUrl);
                    if (coords) {
                        m.mapLat = coords.lat;
                        m.mapLng = coords.lng;
                        updated = true;
                        console.log(`  ✅ ${m.name}: ${coords.lat}, ${coords.lng}`);
                    } else {
                        console.log(`  ⚠️ ${m.name}: 座標取得失敗（後でリトライ）`);
                    }
                    // Nominatim rate limit: 1 req/sec
                    await new Promise(r => setTimeout(r, 1200));
                } catch (e) { console.log(`  ❌ ${m.name}: ${e.message}`); }
            }
            if (updated) { await writeData(data); console.log('📍 マップ座標キャッシュ完了'); }
        }
    } catch (e) { console.error('Map cache error:', e.message); }
    // Auto-migrate interviews into blogs on startup
    await migrateInterviewsToBlogs();
});

module.exports = app;
