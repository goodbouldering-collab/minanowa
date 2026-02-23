const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const Stripe = require('stripe');

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

// ==================== MEMBERS ====================
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

// Blogs CRUD
app.post('/api/admin/blogs', async (req, res) => {
    try {
        const data = await readData();
        const blog = { id: genId('blog'), ...req.body, date: req.body.date || new Date().toISOString().split('T')[0] };
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
        data.blogs[idx] = { ...data.blogs[idx], ...req.body, id: data.blogs[idx].id };
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

// ==================== INTERVIEWS ====================
app.get('/api/interviews', async (req, res) => {
    try { res.json((await readData()).interviews || []); } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.post('/api/admin/interviews', async (req, res) => {
    try {
        const data = await readData();
        if (!data.interviews) data.interviews = [];
        const { youtubeUrl } = req.body;
        let youtubeId = '';
        if (youtubeUrl) {
            const m = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
            if (m) youtubeId = m[1];
        }
        const interview = { id: genId('interview'), ...req.body, youtubeId, order: data.interviews.length + 1 };
        data.interviews.push(interview);
        await writeData(data);
        res.json({ success: true, interview });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.put('/api/admin/interviews/:id', async (req, res) => {
    try {
        const data = await readData();
        if (!data.interviews) data.interviews = [];
        const idx = data.interviews.findIndex(i => i.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'not found' });
        const updates = { ...req.body };
        if (updates.youtubeUrl) {
            const m = updates.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
            if (m) updates.youtubeId = m[1];
        }
        data.interviews[idx] = { ...data.interviews[idx], ...updates, id: data.interviews[idx].id };
        await writeData(data);
        res.json({ success: true, interview: data.interviews[idx] });
    } catch (e) { res.status(500).json({ error: 'エラー' }); }
});
app.delete('/api/admin/interviews/:id', async (req, res) => {
    try {
        const data = await readData();
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

app.listen(PORT, () => {
    console.log(`🎉 みんなのWA Server running on port ${PORT}`);
    console.log(`🔐 Admin: admin@minanowa.com / password123`);
});
