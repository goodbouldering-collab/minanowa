const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

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
        return { members: [], events: [], blogs: [], messages: [], groupChats: [], boards: [], siteSettings: {} };
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
        const { email, password, name, furigana, phone, business, businessCategory, location, website, instagram } = req.body;
        if (data.members.find(m => m.email === email))
            return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
        const newMember = {
            id: genId('member'), email,
            password: await bcrypt.hash(password, 10),
            name, furigana, phone, business, businessCategory,
            introduction: '', avatar: '',
            location, website: website || '', instagram: instagram || '',
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
        const { memberId } = req.body;
        const ev = data.events.find(e => e.id === req.params.id);
        if (!ev) return res.status(404).json({ error: 'not found' });
        if (!ev.registrations) ev.registrations = [];
        if (ev.registrations.includes(memberId)) return res.status(400).json({ error: '既に登録済み' });
        ev.registrations.push(memberId);
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

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'サーバーエラー' });
});

app.listen(PORT, () => {
    console.log(`🎉 みんなのWA Server running on port ${PORT}`);
    console.log(`🔐 Admin: admin@minanowa.com / password123`);
});
