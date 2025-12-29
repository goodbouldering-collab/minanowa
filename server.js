// ============================================
// みんなのWA - バックエンドサーバー（拡張版）
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

// ファイルアップロード設定
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads/events');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('画像ファイルのみアップロード可能です（JPEG, PNG, GIF, WebP）'));
        }
    }
});

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// データファイルのパス
const DATA_FILE = path.join(__dirname, 'data.json');

// ============================================
// データベース操作（JSONファイル）
// ============================================

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('データ読み込みエラー:', error);
    }
    return { members: [], sessions: {}, blogs: [], events: [], messages: [] };
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('データ保存エラー:', error);
        return false;
    }
}

// データ初期化
function initializeData() {
    let data = loadData();
    
    // events配列がなければ追加
    if (!data.events || data.events.length === 0) {
        data.events = [
            {
                id: uuidv4(),
                title: '第22回 みんなのWA 彦根交流会',
                date: '2024-12-03',
                time: '12:00〜15:00',
                location: '彦根市高宮町1410 ハウスセレクション内 デスミさん展示場',
                description: '年内最後の交流会です！\n\nフリートーク式での人脈作り、参加者同士の名刺・連絡先交換、それぞれの事業の説明や体験会を行います。\n\n12:30〜（希望者のみ、当日参加OK）\n1分自己紹介（2回目の方は30秒）で、名前、やってること、どんな人と出会いたいか、想いなどを紹介する場を設けます。\n\n体験ブース・出店も可能です！（出店費用：交流会代金＋1,000円）\n\n【目指せ1000人！🤍🤝】みんなで成し遂げましょう！',
                capacity: 50,
                attendees: [],
                fee: '3,000円＋持ち寄り一品 または 4,000円',
                feeDetails: '持ち寄り一品例：お菓子、マクドのポテトやナゲット、手作り料理、からあげ、アイス、自社商品など（人数分でなくてもOK👌）',
                cashback: '🌟本交流会のご新規お連れ様1人につき、500円キャッシュバック！（上限人数なし）',
                freeEntry: '体験会のみ参加の方は、参加費不要',
                status: 'upcoming',
                image: 'https://www.genspark.ai/api/files/s/kdMdJUbA',
                formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSd9surQUgkx4hEh-TFfrdgLPd2WhVQgd0QfFGt4kUdMlZRjNw/viewform',
                notes: '⚠️12:00〜搬入可能、16:00完全撤収\n\n体験ブース・出店希望の方は、名前・店舗名・内容・店舗ロゴか商品などの写真を大倉までご連絡ください💡',
                createdAt: new Date().toISOString()
            }
        ];
        saveData(data);
    }
    
    // messages配列がなければ追加
    if (!data.messages) {
        data.messages = [];
        saveData(data);
    }
    
    return data;
}

let appData = initializeData();

// ============================================
// 認証ミドルウェア
// ============================================

function checkAuth(req, res, next) {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    appData = loadData();
    
    const session = appData.sessions[sessionId];
    if (!session) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
    }
    
    const member = appData.members.find(m => m.id === session.memberId);
    if (!member) {
        return res.status(401).json({ success: false, message: 'ユーザーが見つかりません' });
    }
    
    req.user = member;
    req.sessionId = sessionId;
    next();
}

function checkAdmin(req, res, next) {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;
    appData = loadData();
    
    const session = appData.sessions[sessionId];
    if (!session) {
        return res.status(401).json({ success: false, message: '認証が必要です' });
    }
    
    const member = appData.members.find(m => m.id === session.memberId);
    if (!member || !member.isAdmin) {
        return res.status(403).json({ success: false, message: '管理者権限が必要です' });
    }
    
    req.adminUser = member;
    next();
}

// ============================================
// 基本API
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', memberCount: appData.members.length });
});

// ============================================
// 認証API
// ============================================

app.post('/api/register', async (req, res) => {
    try {
        const {
            email, password, name, furigana, phone,
            business, businessCategory, introduction,
            location, website, sns, skills
        } = req.body;

        if (!email || !password || !name || !business) {
            return res.status(400).json({
                success: false,
                message: '必須項目を入力してください'
            });
        }

        appData = loadData();
        const existingMember = appData.members.find(m => m.email === email);
        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'このメールアドレスは既に登録されています'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newMember = {
            id: uuidv4(),
            email,
            password: hashedPassword,
            name,
            furigana: furigana || '',
            phone: phone || '',
            business,
            businessCategory: businessCategory || 'その他',
            introduction: introduction || '',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2d5a27&color=fff&size=200`,
            location: location || '',
            website: website || '',
            sns: sns || {},
            skills: skills || [],
            joinDate: new Date().toISOString().split('T')[0],
            isPublic: true,
            isAdmin: false,
            lastLogin: new Date().toISOString()
        };

        appData.members.push(newMember);
        
        const sessionId = uuidv4();
        appData.sessions[sessionId] = {
            memberId: newMember.id,
            createdAt: new Date().toISOString()
        };
        saveData(appData);

        const { password: _, ...memberWithoutPassword } = newMember;

        res.json({
            success: true,
            message: '会員登録が完了しました',
            member: memberWithoutPassword,
            sessionId
        });

    } catch (error) {
        console.error('登録エラー:', error);
        res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'メールアドレスとパスワードを入力してください'
            });
        }

        appData = loadData();
        const member = appData.members.find(m => m.email === email);

        if (!member) {
            return res.status(401).json({
                success: false,
                message: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        // パスワード検証（bcryptハッシュまたは平文に対応）
        let isValidPassword = false;
        
        if (member.password.startsWith('$2')) {
            // bcryptハッシュの場合
            isValidPassword = await bcrypt.compare(password, member.password);
        } else {
            // 平文の場合（開発環境のみ）
            isValidPassword = (password === member.password);
        }
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'メールアドレスまたはパスワードが正しくありません'
            });
        }

        // ログイン日時を更新
        const memberIndex = appData.members.findIndex(m => m.id === member.id);
        appData.members[memberIndex].lastLogin = new Date().toISOString();

        const sessionId = uuidv4();
        appData.sessions[sessionId] = {
            memberId: member.id,
            createdAt: new Date().toISOString()
        };
        saveData(appData);

        const { password: _, ...memberWithoutPassword } = appData.members[memberIndex];

        res.json({
            success: true,
            message: 'ログインしました',
            member: memberWithoutPassword,
            sessionId
        });

    } catch (error) {
        console.error('ログインエラー:', error);
        res.status(500).json({ success: false, message: 'サーバーエラーが発生しました' });
    }
});

app.post('/api/logout', (req, res) => {
    const { sessionId } = req.body;
    if (sessionId && appData.sessions[sessionId]) {
        delete appData.sessions[sessionId];
        saveData(appData);
    }
    res.json({ success: true, message: 'ログアウトしました' });
});

app.get('/api/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    appData = loadData();

    const session = appData.sessions[sessionId];
    if (!session) {
        return res.status(401).json({ success: false, message: 'セッションが無効です' });
    }

    const member = appData.members.find(m => m.id === session.memberId);
    if (!member) {
        return res.status(401).json({ success: false, message: 'メンバーが見つかりません' });
    }

    const { password: _, ...memberWithoutPassword } = member;
    res.json({ success: true, member: memberWithoutPassword });
});

// ============================================
// メンバーAPI
// ============================================

app.get('/api/members', (req, res) => {
    appData = loadData();
    const publicMembers = appData.members
        .filter(m => m.isPublic)
        .map(({ password, ...member }) => member);

    res.json({ success: true, members: publicMembers, total: publicMembers.length });
});

app.get('/api/members/search', (req, res) => {
    const { q, category, location, skill } = req.query;
    appData = loadData();

    let filteredMembers = appData.members.filter(m => m.isPublic);

    if (q) {
        const query = q.toLowerCase();
        filteredMembers = filteredMembers.filter(m => 
            m.name.toLowerCase().includes(query) ||
            (m.furigana && m.furigana.toLowerCase().includes(query)) ||
            m.business.toLowerCase().includes(query) ||
            (m.introduction && m.introduction.toLowerCase().includes(query)) ||
            (m.skills && m.skills.some(s => s.toLowerCase().includes(query)))
        );
    }

    if (category && category !== 'all') {
        filteredMembers = filteredMembers.filter(m => m.businessCategory === category);
    }

    if (location && location !== 'all') {
        filteredMembers = filteredMembers.filter(m => m.location === location);
    }

    if (skill) {
        filteredMembers = filteredMembers.filter(m => 
            m.skills && m.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );
    }

    const result = filteredMembers.map(({ password, ...member }) => member);

    res.json({ success: true, members: result, total: result.length, query: { q, category, location, skill } });
});

app.get('/api/members/:id', (req, res) => {
    const { id } = req.params;
    appData = loadData();

    const member = appData.members.find(m => m.id === id && m.isPublic);
    if (!member) {
        return res.status(404).json({ success: false, message: 'メンバーが見つかりません' });
    }

    const { password, ...memberWithoutPassword } = member;
    res.json({ success: true, member: memberWithoutPassword });
});

// プロフィール更新
app.put('/api/members/:id', checkAuth, (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (req.user.id !== id && !req.user.isAdmin) {
        return res.status(403).json({ success: false, message: '権限がありません' });
    }

    appData = loadData();
    const memberIndex = appData.members.findIndex(m => m.id === id);
    if (memberIndex === -1) {
        return res.status(404).json({ success: false, message: 'メンバーが見つかりません' });
    }

    // 変更不可フィールドを除外
    delete updateData.password;
    delete updateData.id;
    delete updateData.email;
    delete updateData.isAdmin;
    delete updateData.sessionId;

    appData.members[memberIndex] = { ...appData.members[memberIndex], ...updateData };
    saveData(appData);

    const { password, ...memberWithoutPassword } = appData.members[memberIndex];
    res.json({ success: true, message: 'プロフィールを更新しました', member: memberWithoutPassword });
});

// ============================================
// イベントAPI
// ============================================

// ヒーロー画像取得API
app.get('/api/hero-images', (req, res) => {
    appData = loadData();
    const images = appData.heroImages || [];
    
    // order順にソート
    const sortedImages = images.sort((a, b) => a.order - b.order);
    
    res.json({ success: true, images: sortedImages, total: sortedImages.length });
});

// About画像取得API
app.get('/api/about-image', (req, res) => {
    appData = loadData();
    const image = appData.aboutImage || {
        url: 'https://www.genspark.ai/api/files/s/ERlCiKcs',
        alt: 'みんなのWA交流会の様子'
    };
    
    res.json({ success: true, image });
});

app.get('/api/events', (req, res) => {
    appData = loadData();
    const { status, limit = 10 } = req.query;
    
    let events = appData.events || [];
    
    if (status) {
        events = events.filter(e => e.status === status);
    }
    
    // 日付順にソート
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    events = events.slice(0, Number(limit));
    
    res.json({ success: true, events, total: events.length });
});

app.get('/api/events/:id', (req, res) => {
    const { id } = req.params;
    appData = loadData();
    
    const event = (appData.events || []).find(e => e.id === id);
    if (!event) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    res.json({ success: true, event });
});

// イベント詳細ページ（SEO対応URLルート）
app.get('/events/:id', (req, res) => {
    const { id } = req.params;
    appData = loadData();
    
    const event = (appData.events || []).find(e => e.id === id);
    if (!event) {
        return res.status(404).send('<h1>イベントが見つかりません</h1><p><a href="/">トップページへ戻る</a></p>');
    }
    
    // イベント情報を含むHTMLページを返す（OGタグ対応）
    const eventDate = new Date(event.date);
    const dateStr = `${eventDate.getFullYear()}年${eventDate.getMonth() + 1}月${eventDate.getDate()}日`;
    
    res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${event.title} - みんなのWA 彦根異業種交流会</title>
    <meta name="description" content="${event.description || event.title}">
    
    <!-- OGP Tags -->
    <meta property="og:title" content="${event.title} - みんなのWA">
    <meta property="og:description" content="${event.description || event.title}">
    <meta property="og:type" content="event">
    <meta property="og:url" content="${req.protocol}://${req.get('host')}/events/${event.id}">
    ${event.image ? `<meta property="og:image" content="${event.image}">` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${event.title}">
    <meta name="twitter:description" content="${event.description || event.title}">
    ${event.image ? `<meta name="twitter:image" content="${event.image}">` : ''}
    
    <!-- Redirect to main page with event focus -->
    <script>
        // メインページにリダイレクトし、該当イベントへスクロール
        window.location.href = '/?event=${event.id}';
    </script>
</head>
<body>
    <h1>${event.title}</h1>
    <p>イベントページへ移動しています...</p>
    <p><a href="/?event=${event.id}">こちらをクリック</a></p>
</body>
</html>
    `);
});

// イベント参加申し込み
app.post('/api/events/:id/join', checkAuth, (req, res) => {
    const { id } = req.params;
    appData = loadData();
    
    const eventIndex = (appData.events || []).findIndex(e => e.id === id);
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    const event = appData.events[eventIndex];
    
    if (event.attendees.includes(req.user.id)) {
        return res.status(400).json({ success: false, message: '既に参加申し込み済みです' });
    }
    
    if (event.attendees.length >= event.capacity) {
        return res.status(400).json({ success: false, message: '定員に達しています' });
    }
    
    appData.events[eventIndex].attendees.push(req.user.id);
    saveData(appData);
    
    res.json({ 
        success: true, 
        message: '参加申し込みを受け付けました',
        attendeeCount: appData.events[eventIndex].attendees.length
    });
});

// イベント参加キャンセル
app.delete('/api/events/:id/join', checkAuth, (req, res) => {
    const { id } = req.params;
    appData = loadData();
    
    const eventIndex = (appData.events || []).findIndex(e => e.id === id);
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    const attendeeIndex = appData.events[eventIndex].attendees.indexOf(req.user.id);
    if (attendeeIndex === -1) {
        return res.status(400).json({ success: false, message: '参加申し込みしていません' });
    }
    
    appData.events[eventIndex].attendees.splice(attendeeIndex, 1);
    saveData(appData);
    
    res.json({ 
        success: true, 
        message: '参加をキャンセルしました',
        attendeeCount: appData.events[eventIndex].attendees.length
    });
});

// ============================================
// メッセージAPI
// ============================================

app.get('/api/messages', checkAuth, (req, res) => {
    appData = loadData();
    
    const messages = (appData.messages || []).filter(m => 
        m.toId === req.user.id || m.fromId === req.user.id
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 相手の情報を付加
    const enrichedMessages = messages.map(msg => {
        const otherUserId = msg.fromId === req.user.id ? msg.toId : msg.fromId;
        const otherUser = appData.members.find(m => m.id === otherUserId);
        return {
            ...msg,
            otherUser: otherUser ? {
                id: otherUser.id,
                name: otherUser.name,
                avatar: otherUser.avatar,
                business: otherUser.business
            } : null
        };
    });
    
    res.json({ success: true, messages: enrichedMessages });
});

app.post('/api/messages', checkAuth, (req, res) => {
    const { toId, content } = req.body;
    
    if (!toId || !content) {
        return res.status(400).json({ success: false, message: '宛先とメッセージを入力してください' });
    }
    
    appData = loadData();
    
    const toUser = appData.members.find(m => m.id === toId);
    if (!toUser) {
        return res.status(404).json({ success: false, message: '送信先のユーザーが見つかりません' });
    }
    
    const newMessage = {
        id: uuidv4(),
        fromId: req.user.id,
        toId,
        content,
        read: false,
        createdAt: new Date().toISOString()
    };
    
    if (!appData.messages) appData.messages = [];
    appData.messages.push(newMessage);
    saveData(appData);
    
    res.json({ success: true, message: 'メッセージを送信しました', data: newMessage });
});

app.put('/api/messages/:id/read', checkAuth, (req, res) => {
    const { id } = req.params;
    appData = loadData();
    
    const msgIndex = (appData.messages || []).findIndex(m => m.id === id && m.toId === req.user.id);
    if (msgIndex === -1) {
        return res.status(404).json({ success: false, message: 'メッセージが見つかりません' });
    }
    
    appData.messages[msgIndex].read = true;
    saveData(appData);
    
    res.json({ success: true });
});

// ============================================
// イベント管理API（管理者専用）
// ============================================

// 過去イベント一覧取得
app.get('/api/past-events', (req, res) => {
    appData = loadData();
    const pastEvents = appData.pastEvents || [];
    res.json({ success: true, events: pastEvents });
});

// イベント作成（管理者のみ）
app.post('/api/admin/events', checkAuth, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: '管理者権限が必要です' });
    }
    
    const { title, date, time, location, description, capacity, fee, feeDetails, cashback, freeEntry, image, formUrl, notes } = req.body;
    
    if (!title || !date) {
        return res.status(400).json({ success: false, message: 'タイトルと日付は必須です' });
    }
    
    appData = loadData();
    
    const newEvent = {
        id: `event-${Date.now()}`,
        title,
        date,
        time: time || '',
        location: location || '',
        description: description || '',
        capacity: capacity || 50,
        attendees: [],
        fee: fee || '',
        feeDetails: feeDetails || '',
        cashback: cashback || '',
        freeEntry: freeEntry || '',
        status: 'upcoming',
        image: image || '',
        formUrl: formUrl || '',
        notes: notes || '',
        createdAt: new Date().toISOString()
    };
    
    if (!appData.events) appData.events = [];
    appData.events.push(newEvent);
    saveData(appData);
    
    res.json({ success: true, message: 'イベントを作成しました', event: newEvent });
});

// イベント更新（管理者のみ）
app.put('/api/admin/events/:id', checkAuth, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: '管理者権限が必要です' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    appData = loadData();
    
    const eventIndex = (appData.events || []).findIndex(e => e.id === id);
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    // 更新可能なフィールドのみ更新
    const allowedFields = ['title', 'date', 'time', 'location', 'description', 'capacity', 'fee', 'feeDetails', 'cashback', 'freeEntry', 'image', 'formUrl', 'notes', 'status'];
    allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
            appData.events[eventIndex][field] = updates[field];
        }
    });
    
    saveData(appData);
    
    res.json({ success: true, message: 'イベントを更新しました', event: appData.events[eventIndex] });
});

// イベントを過去イベントに移動（管理者のみ）
app.post('/api/admin/events/:id/archive', checkAuth, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: '管理者権限が必要です' });
    }
    
    const { id } = req.params;
    const { participantCount, feedback } = req.body;
    
    appData = loadData();
    
    const eventIndex = (appData.events || []).findIndex(e => e.id === id);
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    const event = appData.events[eventIndex];
    event.status = 'completed';
    event.completedAt = new Date().toISOString();
    event.participantCount = participantCount || event.attendees.length;
    event.feedback = feedback || '';
    
    // 過去イベントに移動
    if (!appData.pastEvents) appData.pastEvents = [];
    appData.pastEvents.unshift(event);
    
    // 現在のイベントから削除
    appData.events.splice(eventIndex, 1);
    
    saveData(appData);
    
    res.json({ success: true, message: 'イベントをアーカイブしました', event });
});

// イベント削除（管理者のみ）
app.delete('/api/admin/events/:id', checkAuth, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: '管理者権限が必要です' });
    }
    
    const { id } = req.params;
    appData = loadData();
    
    const eventIndex = (appData.events || []).findIndex(e => e.id === id);
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    appData.events.splice(eventIndex, 1);
    saveData(appData);
    
    res.json({ success: true, message: 'イベントを削除しました' });
});

// ============================================
// ブログAPI
// ============================================

app.get('/api/blogs', (req, res) => {
    appData = loadData();
    const { category, limit = 10, offset = 0 } = req.query;
    
    let blogs = appData.blogs.filter(b => b.status === 'published');
    
    if (category && category !== 'all') {
        blogs = blogs.filter(b => b.category === category);
    }
    
    blogs.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    const total = blogs.length;
    blogs = blogs.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({ success: true, blogs, total });
});

app.get('/api/blogs/:slug', (req, res) => {
    const { slug } = req.params;
    appData = loadData();
    
    const blog = appData.blogs.find(b => b.slug === slug && b.status === 'published');
    if (!blog) {
        return res.status(404).json({ success: false, message: '記事が見つかりません' });
    }
    
    blog.views = (blog.views || 0) + 1;
    saveData(appData);
    
    res.json({ success: true, blog });
});

app.post('/api/blogs/:id/like', (req, res) => {
    const { id } = req.params;
    appData = loadData();
    
    const blogIndex = appData.blogs.findIndex(b => b.id === id);
    if (blogIndex === -1) {
        return res.status(404).json({ success: false, message: '記事が見つかりません' });
    }
    
    appData.blogs[blogIndex].likes = (appData.blogs[blogIndex].likes || 0) + 1;
    saveData(appData);
    
    res.json({ success: true, likes: appData.blogs[blogIndex].likes });
});

// ============================================
// 統計API
// ============================================

app.get('/api/stats', (req, res) => {
    appData = loadData();

    const totalMembers = appData.members.filter(m => m.isPublic).length;
    
    const categories = {};
    appData.members.filter(m => m.isPublic).forEach(m => {
        const cat = m.businessCategory || 'その他';
        categories[cat] = (categories[cat] || 0) + 1;
    });

    const locations = {};
    appData.members.filter(m => m.isPublic).forEach(m => {
        const loc = m.location || '未設定';
        locations[loc] = (locations[loc] || 0) + 1;
    });

    res.json({
        success: true,
        stats: {
            totalMembers,
            targetMembers: 300,
            finalTarget: 1000,
            progress: Math.round((totalMembers / 300) * 100),
            categories,
            locations,
            blogCount: appData.blogs.filter(b => b.status === 'published').length,
            eventCount: (appData.events || []).filter(e => e.status === 'upcoming').length
        }
    });
});

// ============================================
// 管理者API
// ============================================

// ダッシュボード統計
app.get('/api/admin/dashboard', checkAdmin, (req, res) => {
    appData = loadData();
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    // 月別新規メンバー数
    const membersByMonth = {};
    appData.members.forEach(m => {
        if (m.joinDate) {
            const date = new Date(m.joinDate);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            membersByMonth[key] = (membersByMonth[key] || 0) + 1;
        }
    });
    
    // 今月の新規メンバー
    const thisMonthKey = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}`;
    const newMembersThisMonth = membersByMonth[thisMonthKey] || 0;
    
    // ブログ統計
    const totalViews = appData.blogs.reduce((sum, b) => sum + (b.views || 0), 0);
    const totalLikes = appData.blogs.reduce((sum, b) => sum + (b.likes || 0), 0);
    
    // カテゴリー別メンバー
    const categoryStats = {};
    appData.members.filter(m => m.isPublic).forEach(m => {
        const cat = m.businessCategory || 'その他';
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });
    
    // 地域別メンバー
    const locationStats = {};
    appData.members.filter(m => m.isPublic).forEach(m => {
        const loc = m.location || '未設定';
        locationStats[loc] = (locationStats[loc] || 0) + 1;
    });
    
    // 最近のアクティビティ
    const recentMembers = appData.members
        .sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate))
        .slice(0, 5)
        .map(({ password, ...m }) => m);
    
    const recentBlogs = appData.blogs
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5);
    
    // イベント参加率
    const upcomingEvents = (appData.events || []).filter(e => e.status === 'upcoming');
    const avgAttendance = upcomingEvents.length > 0 
        ? Math.round(upcomingEvents.reduce((sum, e) => sum + e.attendees.length, 0) / upcomingEvents.length)
        : 0;
    
    res.json({
        success: true,
        dashboard: {
            overview: {
                totalMembers: appData.members.length,
                publicMembers: appData.members.filter(m => m.isPublic).length,
                newMembersThisMonth,
                totalBlogs: appData.blogs.length,
                publishedBlogs: appData.blogs.filter(b => b.status === 'published').length,
                totalViews,
                totalLikes,
                upcomingEvents: upcomingEvents.length,
                avgEventAttendance: avgAttendance
            },
            membersByMonth,
            categoryStats,
            locationStats,
            recentMembers,
            recentBlogs
        }
    });
});

// 管理者: メンバー一覧
app.get('/api/admin/members', checkAdmin, (req, res) => {
    appData = loadData();
    const members = appData.members.map(({ password, ...member }) => member);
    res.json({ success: true, members, total: members.length });
});

// 管理者: メンバー更新
app.put('/api/admin/members/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    appData = loadData();
    const memberIndex = appData.members.findIndex(m => m.id === id);
    
    if (memberIndex === -1) {
        return res.status(404).json({ success: false, message: 'メンバーが見つかりません' });
    }
    
    delete updateData.password;
    delete updateData.id;
    delete updateData.sessionId;
    
    appData.members[memberIndex] = { ...appData.members[memberIndex], ...updateData };
    saveData(appData);
    
    const { password, ...memberWithoutPassword } = appData.members[memberIndex];
    res.json({ success: true, message: 'メンバー情報を更新しました', member: memberWithoutPassword });
});

// 管理者: メンバー削除
app.delete('/api/admin/members/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    
    appData = loadData();
    const memberIndex = appData.members.findIndex(m => m.id === id);
    
    if (memberIndex === -1) {
        return res.status(404).json({ success: false, message: 'メンバーが見つかりません' });
    }
    
    // 管理者は自分を削除できない
    if (appData.members[memberIndex].id === req.adminUser.id) {
        return res.status(400).json({ success: false, message: '自分自身は削除できません' });
    }
    
    appData.members.splice(memberIndex, 1);
    saveData(appData);
    
    res.json({ success: true, message: 'メンバーを削除しました' });
});

// 管理者: 管理者権限更新
app.put('/api/admin/members/:id/admin', checkAdmin, (req, res) => {
    const { id } = req.params;
    const { isAdmin } = req.body;
    
    appData = loadData();
    const memberIndex = appData.members.findIndex(m => m.id === id);
    
    if (memberIndex === -1) {
        return res.status(404).json({ success: false, message: 'メンバーが見つかりません' });
    }
    
    appData.members[memberIndex].isAdmin = isAdmin;
    saveData(appData);
    
    const { password, ...memberWithoutPassword } = appData.members[memberIndex];
    res.json({ success: true, message: '管理者権限を更新しました', member: memberWithoutPassword });
});

// 管理者: ブログ一覧
app.get('/api/admin/blogs', checkAdmin, (req, res) => {
    appData = loadData();
    const blogs = appData.blogs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json({ success: true, blogs, total: blogs.length });
});

// 管理者: ブログ作成
app.post('/api/admin/blogs', checkAdmin, (req, res) => {
    const { title, slug, content, excerpt, category, tags, featuredImage, status } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ success: false, message: 'タイトルと本文は必須です' });
    }
    
    appData = loadData();
    
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingSlug = appData.blogs.find(b => b.slug === finalSlug);
    if (existingSlug) {
        return res.status(400).json({ success: false, message: 'このスラッグは既に使用されています' });
    }
    
    const newBlog = {
        id: uuidv4(),
        title,
        slug: finalSlug,
        content,
        excerpt: excerpt || content.substring(0, 150) + '...',
        authorId: req.adminUser.id,
        authorName: req.adminUser.name,
        authorAvatar: req.adminUser.avatar,
        category: category || '一般',
        tags: tags || [],
        featuredImage: featuredImage || '',
        publishedAt: status === 'published' ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
        status: status || 'draft',
        views: 0,
        likes: 0
    };
    
    appData.blogs.push(newBlog);
    saveData(appData);
    
    res.json({ success: true, message: '記事を作成しました', blog: newBlog });
});

// 管理者: ブログ更新
app.put('/api/admin/blogs/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    const { title, slug, content, excerpt, category, tags, featuredImage, status } = req.body;
    
    appData = loadData();
    const blogIndex = appData.blogs.findIndex(b => b.id === id);
    
    if (blogIndex === -1) {
        return res.status(404).json({ success: false, message: '記事が見つかりません' });
    }
    
    const blog = appData.blogs[blogIndex];
    
    if (slug && slug !== blog.slug) {
        const existingSlug = appData.blogs.find(b => b.slug === slug && b.id !== id);
        if (existingSlug) {
            return res.status(400).json({ success: false, message: 'このスラッグは既に使用されています' });
        }
    }
    
    appData.blogs[blogIndex] = {
        ...blog,
        title: title || blog.title,
        slug: slug || blog.slug,
        content: content || blog.content,
        excerpt: excerpt || blog.excerpt,
        category: category || blog.category,
        tags: tags || blog.tags,
        featuredImage: featuredImage !== undefined ? featuredImage : blog.featuredImage,
        status: status || blog.status,
        publishedAt: status === 'published' && !blog.publishedAt ? new Date().toISOString() : blog.publishedAt,
        updatedAt: new Date().toISOString()
    };
    
    saveData(appData);
    
    res.json({ success: true, message: '記事を更新しました', blog: appData.blogs[blogIndex] });
});

// 管理者: ブログ削除
app.delete('/api/admin/blogs/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    
    appData = loadData();
    const blogIndex = appData.blogs.findIndex(b => b.id === id);
    
    if (blogIndex === -1) {
        return res.status(404).json({ success: false, message: '記事が見つかりません' });
    }
    
    appData.blogs.splice(blogIndex, 1);
    saveData(appData);
    
    res.json({ success: true, message: '記事を削除しました' });
});

// 管理者: イベント一覧
app.get('/api/admin/events', checkAdmin, (req, res) => {
    appData = loadData();
    const events = (appData.events || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, events, total: events.length });
});

// 管理者: イベント作成
app.post('/api/admin/events', checkAdmin, (req, res) => {
    const { title, date, time, location, description, capacity, fee, feeDetails, cashback, freeEntry, formUrl, notes, timetable, image, status } = req.body;
    
    if (!title || !date) {
        return res.status(400).json({ success: false, message: 'タイトルと日付は必須です' });
    }
    
    appData = loadData();
    if (!appData.events) appData.events = [];
    
    const newEvent = {
        id: `event-${Date.now()}`,
        title,
        date,
        time: time || '',
        location: location || '',
        description: description || '',
        capacity: capacity || 30,
        attendees: [],
        fee: fee || '',
        feeDetails: feeDetails || '',
        cashback: cashback || '',
        freeEntry: freeEntry || '',
        formUrl: formUrl || '',
        notes: notes || '',
        timetable: timetable || [],
        status: status || 'upcoming',
        image: image || '',
        createdAt: new Date().toISOString()
    };
    
    appData.events.push(newEvent);
    saveData(appData);
    
    res.json({ success: true, message: 'イベントを作成しました', event: newEvent });
});

// 管理者: イベント更新
app.put('/api/admin/events/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    appData = loadData();
    const eventIndex = (appData.events || []).findIndex(e => e.id === id);
    
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    delete updateData.id;
    delete updateData.attendees;
    delete updateData.sessionId;
    
    appData.events[eventIndex] = { ...appData.events[eventIndex], ...updateData };
    saveData(appData);
    
    res.json({ success: true, message: 'イベントを更新しました', event: appData.events[eventIndex] });
});

// 管理者: イベント削除
app.delete('/api/admin/events/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    
    appData = loadData();
    const eventIndex = (appData.events || []).findIndex(e => e.id === id);
    
    if (eventIndex === -1) {
        return res.status(404).json({ success: false, message: 'イベントが見つかりません' });
    }
    
    appData.events.splice(eventIndex, 1);
    saveData(appData);
    
    res.json({ success: true, message: 'イベントを削除しました' });
});

// ============================================
// 静的ファイルとフォールバック
// ============================================

app.use(express.static(__dirname));

// プレビュー専用ルート
app.get('/preview', (req, res) => {
    res.sendFile(path.join(__dirname, 'preview.html'));
});

app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ success: false, message: 'APIが見つかりません' });
    }
});

// ============================================
// 画像アップロードAPI
// ============================================

// イベント画像アップロード
app.post('/api/admin/upload-event-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '画像ファイルが選択されていません' });
        }
        
        const imageUrl = `/uploads/events/${req.file.filename}`;
        res.json({ 
            success: true, 
            imageUrl: imageUrl,
            message: '画像がアップロードされました'
        });
    } catch (error) {
        console.error('画像アップロードエラー:', error);
        res.status(500).json({ success: false, message: '画像のアップロードに失敗しました' });
    }
});

// 画像削除API
app.delete('/api/admin/delete-event-image', (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
            return res.status(400).json({ success: false, message: '無効な画像URLです' });
        }
        
        const filePath = path.join(__dirname, imageUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: '画像が削除されました' });
        } else {
            res.status(404).json({ success: false, message: '画像ファイルが見つかりません' });
        }
    } catch (error) {
        console.error('画像削除エラー:', error);
        res.status(500).json({ success: false, message: '画像の削除に失敗しました' });
    }
});

// ============================================
// 会員の声 API
// ============================================

// 会員の声一覧取得
app.get('/api/testimonials', (req, res) => {
    const testimonials = appData.testimonials || [];
    res.json(testimonials.filter(t => t.isPublic));
});

// 会員の声作成
app.post('/api/admin/testimonials', (req, res) => {
    try {
        const newTestimonial = {
            id: `testimonial-${Date.now()}`,
            ...req.body,
            createdAt: new Date().toISOString()
        };
        
        if (!appData.testimonials) {
            appData.testimonials = [];
        }
        
        appData.testimonials.push(newTestimonial);
        saveData();
        res.json({ success: true, testimonial: newTestimonial });
    } catch (error) {
        console.error('会員の声作成エラー:', error);
        res.status(500).json({ success: false, message: '会員の声の作成に失敗しました' });
    }
});

// 会員の声更新
app.put('/api/admin/testimonials/:id', (req, res) => {
    try {
        const testimonialIndex = appData.testimonials?.findIndex(t => t.id === req.params.id);
        if (testimonialIndex === -1) {
            return res.status(404).json({ success: false, message: '会員の声が見つかりません' });
        }
        
        appData.testimonials[testimonialIndex] = {
            ...appData.testimonials[testimonialIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        saveData();
        res.json({ success: true, testimonial: appData.testimonials[testimonialIndex] });
    } catch (error) {
        console.error('会員の声更新エラー:', error);
        res.status(500).json({ success: false, message: '会員の声の更新に失敗しました' });
    }
});

// 会員の声削除
app.delete('/api/admin/testimonials/:id', (req, res) => {
    try {
        const testimonialIndex = appData.testimonials?.findIndex(t => t.id === req.params.id);
        if (testimonialIndex === -1) {
            return res.status(404).json({ success: false, message: '会員の声が見つかりません' });
        }
        
        appData.testimonials.splice(testimonialIndex, 1);
        saveData();
        res.json({ success: true, message: '会員の声を削除しました' });
    } catch (error) {
        console.error('会員の声削除エラー:', error);
        res.status(500).json({ success: false, message: '会員の声の削除に失敗しました' });
    }
});

// ============================================
// コラボ事例 API
// ============================================

// コラボ事例一覧取得
app.get('/api/collaborations', (req, res) => {
    const collaborations = appData.collaborations || [];
    res.json(collaborations.filter(c => c.isPublic));
});

// コラボ事例作成
app.post('/api/admin/collaborations', (req, res) => {
    try {
        const newCollaboration = {
            id: `collab-${Date.now()}`,
            ...req.body,
            createdAt: new Date().toISOString()
        };
        
        if (!appData.collaborations) {
            appData.collaborations = [];
        }
        
        appData.collaborations.push(newCollaboration);
        saveData();
        res.json({ success: true, collaboration: newCollaboration });
    } catch (error) {
        console.error('コラボ事例作成エラー:', error);
        res.status(500).json({ success: false, message: 'コラボ事例の作成に失敗しました' });
    }
});

// コラボ事例更新
app.put('/api/admin/collaborations/:id', (req, res) => {
    try {
        const collabIndex = appData.collaborations?.findIndex(c => c.id === req.params.id);
        if (collabIndex === -1) {
            return res.status(404).json({ success: false, message: 'コラボ事例が見つかりません' });
        }
        
        appData.collaborations[collabIndex] = {
            ...appData.collaborations[collabIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        saveData();
        res.json({ success: true, collaboration: appData.collaborations[collabIndex] });
    } catch (error) {
        console.error('コラボ事例更新エラー:', error);
        res.status(500).json({ success: false, message: 'コラボ事例の更新に失敗しました' });
    }
});

// コラボ事例削除
app.delete('/api/admin/collaborations/:id', (req, res) => {
    try {
        const collabIndex = appData.collaborations?.findIndex(c => c.id === req.params.id);
        if (collabIndex === -1) {
            return res.status(404).json({ success: false, message: 'コラボ事例が見つかりません' });
        }
        
        appData.collaborations.splice(collabIndex, 1);
        saveData();
        res.json({ success: true, message: 'コラボ事例を削除しました' });
    } catch (error) {
        console.error('コラボ事例削除エラー:', error);
        res.status(500).json({ success: false, message: 'コラボ事例の削除に失敗しました' });
    }
});

// ============================================
// 画像管理 API
// ============================================

// ヒーロー画像取得
app.get('/api/hero-images', (req, res) => {
    res.json(appData.heroImages || []);
});

// ヒーロー画像更新
app.put('/api/admin/hero-images', (req, res) => {
    try {
        appData.heroImages = req.body.images;
        saveData();
        res.json({ success: true, images: appData.heroImages });
    } catch (error) {
        console.error('ヒーロー画像更新エラー:', error);
        res.status(500).json({ success: false, message: 'ヒーロー画像の更新に失敗しました' });
    }
});

// About画像更新
app.put('/api/admin/about-image', (req, res) => {
    try {
        appData.aboutImage = req.body;
        saveData();
        res.json({ success: true, image: appData.aboutImage });
    } catch (error) {
        console.error('About画像更新エラー:', error);
        res.status(500).json({ success: false, message: 'About画像の更新に失敗しました' });
    }
});

// ============================================
// サーバー起動
// ============================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 みんなのWA サーバー起動`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`👥 登録メンバー数: ${appData.members.length}`);
    console.log(`📝 ブログ記事数: ${appData.blogs?.length || 0}`);
    console.log(`🎉 イベント数: ${appData.events?.length || 0}`);
    console.log(`💬 会員の声: ${appData.testimonials?.length || 0}`);
    console.log(`🤝 コラボ事例: ${appData.collaborations?.length || 0}`);
});
