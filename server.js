const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const Stripe = require('stripe');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

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
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Upload directory
const uploadDir = path.join(__dirname, 'uploads');
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
async function readData() {
    try {
        return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    } catch {
        return { members: [], events: [], blogs: [], messages: [], groupChats: [], boards: [], siteSettings: {}, interviews: [], operatingMembers: [] };
    }
}
async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}
function genId(p) { return `${p}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }

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
app.post('/api/register', async (req, res) => {
    try {
        const data = await readData();
        const { email, password, name, furigana, phone, business, businessCategory, location, website, instagram, profession, homepage, photos } = req.body;
        if (data.members.find(m => m.email === email))
            return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
        const newMember = {
            id: genId('member'), email,
            password: await bcrypt.hash(password, 10),
            name, furigana, phone, business, businessCategory,
            introduction: '', avatar: '',
            location, website: website || '', instagram: instagram || '', googleMapUrl: req.body.googleMapUrl || '',
            profession: profession || '', homepage: homepage || '', photos: photos || [],
            sns: {}, skills: [],
            joinDate: new Date().toISOString().split('T')[0],
            isPublic: true, isAdmin: false
        };
        data.members.push(newMember);
        await writeData(data);
        const { password: _, ...safe } = newMember;
        res.json({ success: true, member: safe });
    } catch (e) { res.status(500).json({ error: '登録に失敗しました' }); }
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
    } catch (e) { res.status(500).json({ error: 'ログインに失敗しました' }); }
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
        const { googleId, email, name, furigana, phone, business, businessCategory, location, website, instagram, profession, homepage, photos, avatar, googleMapUrl } = req.body;
        if (!googleId || !email) return res.status(400).json({ error: '必須情報が不足しています' });
        if (data.members.find(m => m.email === email))
            return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });

        const newMember = {
            id: genId('member'), email, googleId,
            password: await bcrypt.hash(googleId + Date.now(), 10), // random password (Google users don't use it)
            name, furigana: furigana || '', phone: phone || '', business: business || '', businessCategory: businessCategory || '',
            introduction: '', avatar: avatar || '',
            location: location || '', website: website || '', instagram: instagram || '', googleMapUrl: googleMapUrl || '',
            profession: profession || '', homepage: homepage || '', photos: photos || [],
            sns: {}, skills: [],
            joinDate: new Date().toISOString().split('T')[0],
            isPublic: true, isAdmin: false
        };
        data.members.push(newMember);
        await writeData(data);
        const { password: _, ...safe } = newMember;
        res.json({ success: true, member: safe });
    } catch (e) { res.status(500).json({ error: '登録に失敗しました' }); }
});
app.get('/api/members', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.members.map(({ password, ...m }) => m));
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

app.get('/api/members/:id', async (req, res) => {
    try {
        const data = await readData();
        const m = data.members.find(m => m.id === req.params.id);
        if (!m) return res.status(404).json({ error: 'not found' });
        const { password, ...safe } = m;
        res.json(safe);
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

app.put('/api/members/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = data.members.findIndex(m => m.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        const updates = { ...req.body };
        if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
        data.members[idx] = { ...data.members[idx], ...updates, id: data.members[idx].id };
        await writeData(data);
        const { password, ...safe } = data.members[idx];
        res.json({ success: true, member: safe });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
            mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
                if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                    resolve({ resolvedUrl: resp.headers.location });
                } else {
                    let body = '';
                    resp.on('data', c => body += c);
                    resp.on('end', () => resolve({ resolvedUrl: resp.headers.location || url, body }));
                }
            }).on('error', reject);
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
                    .replace(/〒?\d{3}-?\d{4}\s*/g, '')  // Remove postal code
                    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // Full-width → half-width numbers
                    .replace(/−/g, '-')  // Full-width minus → half-width
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
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ファイルなし' });
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// ==================== EVENTS ====================
app.get('/api/events', async (req, res) => {
    try { res.json((await readData()).events); } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.post('/api/events/:id/register', async (req, res) => {
    try {
        const data = await readData();
        const { memberId, paymentMethod } = req.body;
        if (!memberId) return res.status(400).json({ error: 'memberId is required' });
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        if (!ev.registrations) ev.registrations = [];
        if (!ev.regDetails) ev.regDetails = {};
        if (ev.registrations.includes(memberId)) return res.status(400).json({ error: '既に登録済み' });
        // Check capacity
        const cap = parseInt(ev.participants) || 0;
        if (cap > 0 && ev.registrations.length >= cap) return res.status(400).json({ error: '定員に達しました' });
        ev.registrations.push(memberId);
        ev.regDetails[memberId] = { paymentMethod: paymentMethod || 'onsite', paymentStatus: paymentMethod === 'stripe' ? 'pending' : 'onsite', registeredAt: new Date().toISOString() };
        await writeData(data);
        res.json({ success: true, registrations: ev.registrations, regDetails: ev.regDetails });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.get('/api/events/:id/registrations', async (req, res) => {
    try {
        const data = await readData();
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        const regs = ev.registrations || [];
        const members = regs.map(mid => {
            const m = data.members.find(x => x.id === mid);
            if (!m) return { id: mid, name: '(退会済み)', avatar: '', payment: (ev.regDetails||{})[mid] || {} };
            return { id: m.id, name: m.name, avatar: m.avatar, profession: m.profession, business: m.business, location: m.location, payment: (ev.regDetails||{})[mid] || {} };
        });
        res.json({ registrations: members, count: regs.length });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

// ==================== BLOGS ====================
app.get('/api/blogs', async (req, res) => {
    try { res.json((await readData()).blogs); } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

// ==================== BOARDS (掲示板) ====================
app.get('/api/boards', async (req, res) => {
    try { res.json((await readData()).boards || []); } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.post('/api/boards', async (req, res) => {
    try {
        const data = await readData();
        if (!data.boards) data.boards = [];
        const post = { id: genId('board'), ...req.body, replies: [], createdAt: new Date().toISOString() };
        data.boards.unshift(post);
        await writeData(data);
        res.json({ success: true, post });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.post('/api/boards/:id/reply', async (req, res) => {
    try {
        const data = await readData();
        const post = (data.boards || []).find(b => b.id === req.params.id);
        if (!post) return res.status(404).json({ error: 'not found' });
        const reply = { id: genId('reply'), ...req.body, createdAt: new Date().toISOString() };
        post.replies.push(reply);
        await writeData(data);
        res.json({ success: true, reply });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

// ==================== SITE SETTINGS ====================
app.get('/api/site-settings', async (req, res) => {
    try { res.json((await readData()).siteSettings || {}); } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.put('/api/site-settings', async (req, res) => {
    try {
        const data = await readData();
        data.siteSettings = { ...(data.siteSettings || {}), ...req.body };
        await writeData(data);
        res.json({ success: true, settings: data.siteSettings });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

// ==================== MESSAGES ====================
app.get('/api/messages', async (req, res) => {
    try {
        const data = await readData();
        const { userId } = req.query;
        res.json((data.messages || []).filter(m => m.from === userId || m.to === userId));
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.post('/api/messages', async (req, res) => {
    try {
        const data = await readData();
        const msg = { id: genId('msg'), ...req.body, timestamp: new Date().toISOString(), read: false };
        data.messages.push(msg);
        await writeData(data);
        res.json({ success: true, message: msg });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.put('/api/admin/events/:id', async (req, res) => {
    try {
        const data = await readData();
        const idx = data.events.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        data.events[idx] = { ...data.events[idx], ...req.body, id: data.events[idx].id };
        await writeData(data);
        res.json({ success: true, event: data.events[idx] });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.delete('/api/admin/events/:id', async (req, res) => {
    try {
        const data = await readData();
        data.events = data.events.filter(e => e.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.delete('/api/admin/blogs/:id', async (req, res) => {
    try {
        const data = await readData();
        data.blogs = data.blogs.filter(b => b.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.delete('/api/admin/members/:id', async (req, res) => {
    try {
        const data = await readData();
        data.members = data.members.filter(m => m.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

// Boards admin delete
app.delete('/api/admin/boards/:id', async (req, res) => {
    try {
        const data = await readData();
        data.boards = (data.boards || []).filter(b => b.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.delete('/api/admin/interviews/:id', async (req, res) => {
    try {
        const data = await readData();
        data.blogs = (data.blogs || []).filter(b => b.id !== req.params.id);
        // Also clean legacy interviews
        data.interviews = (data.interviews || []).filter(i => i.id !== req.params.id);
        await writeData(data);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

// ==================== OPERATING MEMBERS ====================
app.get('/api/operating-members', async (req, res) => {
    try {
        const data = await readData();
        const opIds = data.operatingMembers || [];
        const opMembers = data.members
            .filter(m => opIds.includes(m.id))
            .map(({ password, ...m }) => m);
        res.json(opMembers);
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.get('/api/admin/operating-members', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.operatingMembers || []);
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.put('/api/admin/operating-members', async (req, res) => {
    try {
        const data = await readData();
        data.operatingMembers = req.body.memberIds || [];
        await writeData(data);
        res.json({ success: true, operatingMembers: data.operatingMembers });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
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
app.get('/api/admin/backup', async (req, res) => {
    try {
        const data = await readData();
        const dir = path.join(__dirname, 'backups');
        await fs.mkdir(dir, { recursive: true });
        const fn = `data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        await fs.writeFile(path.join(dir, fn), JSON.stringify(data, null, 2));
        res.json({ success: true, filename: fn });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});

// Backup list
app.get('/api/admin/backups', async (req, res) => {
    try {
        const dir = path.join(__dirname, 'backups');
        try { await fs.access(dir); } catch { return res.json({ backups: [] }); }
        const files = await fs.readdir(dir);
        const jsonFiles = files.filter(f => f.startsWith('data-') && f.endsWith('.json'));
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
        const dir = path.join(__dirname, 'backups');
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
        const dir = path.join(__dirname, 'backups');
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
        const image = blog.imageUrl ? (blog.imageUrl.startsWith('http') ? blog.imageUrl : `${baseUrl}${blog.imageUrl}`) : `${baseUrl}/favicon.svg`;
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
                "logo": { "@type": "ImageObject", "url": `${baseUrl}/favicon.svg` }
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

// Event share page with OG meta injection
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
        const image = ev.imageUrl ? (ev.imageUrl.startsWith('http') ? ev.imageUrl : `${baseUrl}${ev.imageUrl}`) : `${baseUrl}/favicon.svg`;
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
    <meta name="twitter:image" content="${image}">`;
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

app.listen(PORT, async () => {
    console.log(`🎉 みんなのWA Server running on port ${PORT}`);
    console.log(`🔐 Admin: admin@minanowa.com / password123`);
    // Auto-migrate interviews into blogs on startup
    await migrateInterviewsToBlogs();
});
