// ============================================
// みんなのWA - 彦根コミュニティ JavaScript
// Interactive Glassmorphism Edition v2.0
// ============================================

// API ベースURL
const API_BASE = '';

// グローバル状態
let currentUser = null;
let sessionId = null;
let allMembers = [];
let allBlogs = [];
let allEvents = [];
let allMessages = [];
let currentAdminTab = 'dashboard';
let editingBlogId = null;
let editingEventId = null;
let activeConversation = null;
let heroSliderInterval = null;
let testimonialInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// ページ離脱時の警告（未保存の変更がある場合用 - 将来拡張用）
// window.addEventListener('beforeunload', (e) => { ... });

// ============================================
// アプリ初期化
// ============================================
async function initApp() {
    const startTime = performance.now();
    
    // セッション復元
    await restoreSession();
    
    // データ読み込み（並列）
    await Promise.all([
        loadStats(),
        loadMembers(),
        loadBlogs(),
        loadNextEvent()
    ]);
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // インタラクティブ要素の初期化
    initHeroSlider();
    initParticles();
    initTestimonialSlider();
    initScrollAnimations();
    
    // 未読メッセージチェック（ログイン時）
    if (currentUser) {
        checkUnreadMessages();
    }
    
    const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`🌸 みんなのWA - 初期化完了 (${loadTime}s)`);
}

// 次回イベント情報を取得・表示
async function loadNextEvent() {
    try {
        const response = await fetch(`${API_BASE}/api/events?status=upcoming&limit=1`);
        const data = await response.json();
        
        if (data.success && data.events.length > 0) {
            const event = data.events[0];
            updateEventDisplay(event);
        }
    } catch (error) {
        console.error('イベント情報取得エラー:', error);
    }
}

function updateEventDisplay(event) {
    const eventDate = new Date(event.date);
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    
    // ヒーローバッジを更新
    const heroBadge = document.querySelector('.hero-badge span');
    if (heroBadge) {
        heroBadge.textContent = `次回交流会: ${eventDate.getMonth() + 1}月${eventDate.getDate()}日（${weekdays[eventDate.getDay()]}）${event.time ? event.time.split('〜')[0] : ''}〜`;
    }
    
    // イベントカードの日付を更新
    const monthEl = document.querySelector('.event-date-badge .month');
    const dayEl = document.querySelector('.event-date-badge .day');
    const weekdayEl = document.querySelector('.event-date-badge .weekday');
    
    if (monthEl) monthEl.textContent = monthNames[eventDate.getMonth()];
    if (dayEl) dayEl.textContent = eventDate.getDate();
    if (weekdayEl) weekdayEl.textContent = weekdays[eventDate.getDay()];
    
    // イベント詳細を更新
    const eventTitle = document.querySelector('.event-title');
    if (eventTitle) eventTitle.textContent = event.title;
    
    // 定員情報を更新
    const eventCapacity = document.getElementById('eventCapacity');
    if (eventCapacity) {
        const remaining = event.capacity - (event.attendees?.length || 0);
        eventCapacity.textContent = `定員 ${event.capacity}名（残り${remaining}席）`;
    }
    
    // 参加費情報を更新
    const eventFee = document.getElementById('eventFee');
    if (eventFee && event.fee) {
        eventFee.textContent = `参加費 ${event.fee}`;
    }
}

// 未読メッセージチェック
async function checkUnreadMessages() {
    try {
        const response = await fetch(`${API_BASE}/api/messages`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            const unreadCount = data.messages.filter(m => 
                m.toId === currentUser.id && !m.read
            ).length;
            
            const badge = document.getElementById('unreadBadge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.style.display = 'inline-flex';
                    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('未読チェックエラー:', error);
    }
}

// セッション復元
async function restoreSession() {
    const savedSessionId = localStorage.getItem('sessionId');
    if (savedSessionId) {
        sessionId = savedSessionId;
        await validateSession();
    }
}

// セッション検証
async function validateSession() {
    try {
        const response = await fetch(`${API_BASE}/api/session/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.member;
            updateUIForLoggedInUser();
        } else {
            clearSession();
        }
    } catch (error) {
        console.error('セッション検証エラー:', error);
        clearSession();
    }
}

// セッションクリア
function clearSession() {
    currentUser = null;
    sessionId = null;
    localStorage.removeItem('sessionId');
    updateUIForLoggedOutUser();
}

// ============================================
// 統計情報
// ============================================
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/stats`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            animateCounter('memberCount', stats.totalMembers);
            animateCounter('categoryCount', Object.keys(stats.categories || {}).length);
        }
    } catch (error) {
        console.error('統計情報取得エラー:', error);
    }
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 2000;
    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// ヒーロースライダー
// ============================================
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slider .slide');
    const dots = document.querySelectorAll('.slider-dots .dot');
    let currentSlide = 0;
    
    if (slides.length === 0) return;
    
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentSlide = index;
    }
    
    function nextSlide() {
        const next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }
    
    // ドットクリック
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            // 自動スライドをリセット
            clearInterval(heroSliderInterval);
            heroSliderInterval = setInterval(nextSlide, 5000);
        });
    });
    
    // 自動スライド
    heroSliderInterval = setInterval(nextSlide, 5000);
}

// ============================================
// パーティクル
// ============================================
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 8 + 4) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 4) + 's';
        container.appendChild(particle);
    }
}

// ============================================
// テスティモニアル スライダー
// ============================================
function initTestimonialSlider() {
    const cards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.testimonial-dots .dot');
    let currentIndex = 0;
    
    if (cards.length === 0) return;
    
    function showTestimonial(index) {
        cards.forEach((card, i) => {
            card.classList.toggle('active', i === index);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentIndex = index;
    }
    
    function nextTestimonial() {
        const next = (currentIndex + 1) % cards.length;
        showTestimonial(next);
    }
    
    // ドットクリック
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showTestimonial(index);
            clearInterval(testimonialInterval);
            testimonialInterval = setInterval(nextTestimonial, 6000);
        });
    });
    
    // 自動切り替え
    testimonialInterval = setInterval(nextTestimonial, 6000);
}

// ============================================
// スクロールアニメーション
// ============================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // アニメーション対象を監視
    document.querySelectorAll('.feature-card, .collab-card, .connect-step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // visible クラスのスタイル
    const style = document.createElement('style');
    style.textContent = `
        .feature-card.visible, .collab-card.visible, .connect-step.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// ヒーロー検索機能
// ============================================
function handleHeroSearch(event) {
    if (event.key === 'Enter') {
        executeHeroSearch();
    }
}

function executeHeroSearch() {
    const query = document.getElementById('heroSearchInput')?.value || '';
    const category = document.getElementById('heroCategoryFilter')?.value || 'all';
    const location = document.getElementById('heroLocationFilter')?.value || 'all';
    
    // メンバーセクションのフィルターも同期
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const locationFilter = document.getElementById('locationFilter');
    
    if (searchInput) searchInput.value = query;
    if (categoryFilter) categoryFilter.value = category;
    if (locationFilter) locationFilter.value = location;
    
    searchMembers(query, category, location);
    
    // メンバーセクションへスクロール
    const membersSection = document.getElementById('members');
    if (membersSection) {
        setTimeout(() => {
            membersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function quickSearch(keyword) {
    const searchInput = document.getElementById('heroSearchInput');
    if (searchInput) {
        searchInput.value = keyword;
    }
    executeHeroSearch();
}

// メンバーセクション用クイック検索
function setQuickSearch(keyword) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = keyword;
    }
    performSearch();
}

// メンバーセクション検索実行
function performSearch() {
    const query = document.getElementById('searchInput')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const location = document.getElementById('locationFilter')?.value || 'all';
    
    searchMembers(query, category, location);
}

function handleSearch(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function sortResults() {
    const sortValue = document.getElementById('sortSelect')?.value || 'newest';
    let sortedMembers = [...allMembers];
    
    switch (sortValue) {
        case 'newest':
            sortedMembers.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
            break;
        case 'name':
            sortedMembers.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            break;
        case 'category':
            sortedMembers.sort((a, b) => (a.businessCategory || '').localeCompare(b.businessCategory || '', 'ja'));
            break;
    }
    
    renderMembers(sortedMembers);
}

// ============================================
// メンバー一覧・検索
// ============================================
async function loadMembers() {
    const membersGrid = document.getElementById('membersGrid');
    if (!membersGrid) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/members`);
        const data = await response.json();
        
        if (data.success) {
            allMembers = data.members;
            renderMembers(data.members);
            updateResultsCount(data.total);
        }
    } catch (error) {
        console.error('メンバー取得エラー:', error);
        membersGrid.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-exclamation-circle"></i>
                <h3>読み込みエラー</h3>
                <p>メンバー情報を取得できませんでした</p>
            </div>
        `;
    }
}

async function searchMembers(query = '', category = 'all', location = 'all') {
    const membersGrid = document.getElementById('membersGrid');
    if (!membersGrid) return;
    
    membersGrid.innerHTML = `
        <div class="loading-spinner glass-card">
            <div class="spinner"></div>
            <p>検索中...</p>
        </div>
    `;
    
    try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (category !== 'all') params.append('category', category);
        if (location !== 'all') params.append('location', location);
        
        const response = await fetch(`${API_BASE}/api/members/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
            allMembers = data.members;
            renderMembers(data.members);
            updateResultsCount(data.total, query);
            
            // タイトル更新
            const resultsTitle = document.getElementById('resultsTitle');
            if (resultsTitle) {
                resultsTitle.textContent = query ? `「${query}」の検索結果` : '事業者を探す';
            }
        }
    } catch (error) {
        console.error('検索エラー:', error);
        membersGrid.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-exclamation-circle"></i>
                <h3>検索エラー</h3>
                <p>検索中にエラーが発生しました</p>
            </div>
        `;
    }
}

function renderMembers(members) {
    const membersGrid = document.getElementById('membersGrid');
    if (!membersGrid) return;
    
    if (members.length === 0) {
        membersGrid.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-search"></i>
                <h3>メンバーが見つかりません</h3>
                <p>検索条件を変更してお試しください</p>
            </div>
        `;
        return;
    }
    
    membersGrid.innerHTML = members.map(member => `
        <div class="member-card" onclick="openMemberDetail('${member.id}')">
            <div class="member-card-header">
                <span class="member-card-category">${member.businessCategory || 'その他'}</span>
                <img src="${member.avatar}" alt="${member.name}" class="member-card-avatar" 
                     onerror="this.src='https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80'">
                <h3 class="member-card-name">${member.name}</h3>
                <p class="member-card-business">${member.business}</p>
            </div>
            <div class="member-card-body">
                <p class="member-card-intro">${member.introduction || '自己紹介文がありません'}</p>
                <div class="member-card-skills">
                    ${(member.skills || []).slice(0, 3).map(skill => 
                        `<span class="skill-tag">${skill}</span>`
                    ).join('')}
                </div>
                <div class="member-card-meta">
                    <span class="member-card-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${member.location || '未設定'}
                    </span>
                    <button class="member-card-btn">詳細を見る</button>
                </div>
            </div>
        </div>
    `).join('');
}

function updateResultsCount(count, query = '') {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        if (query) {
            resultsCount.textContent = `${count}件の結果`;
        } else {
            resultsCount.textContent = `全${count}名`;
        }
    }
}

// ============================================
// ブログ機能
// ============================================
async function loadBlogs() {
    const blogGrid = document.getElementById('blogGrid');
    if (!blogGrid) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/blogs?limit=6`);
        const data = await response.json();
        
        if (data.success) {
            allBlogs = data.blogs;
            renderBlogs(data.blogs);
        }
    } catch (error) {
        console.error('ブログ取得エラー:', error);
        blogGrid.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-exclamation-circle"></i>
                <h3>読み込みエラー</h3>
                <p>ブログを取得できませんでした</p>
            </div>
        `;
    }
}

function renderBlogs(blogs) {
    const blogGrid = document.getElementById('blogGrid');
    if (!blogGrid) return;
    
    if (blogs.length === 0) {
        blogGrid.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-newspaper"></i>
                <h3>ブログ記事がありません</h3>
                <p>まだ記事が投稿されていません</p>
            </div>
        `;
        return;
    }
    
    blogGrid.innerHTML = blogs.map(blog => `
        <div class="blog-card" onclick="openBlogDetail('${blog.slug}')">
            <div class="blog-card-image">
                <img src="${blog.featuredImage || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'}" alt="${blog.title}"
                     onerror="this.src='https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'">
                <span class="blog-card-category">${blog.category}</span>
            </div>
            <div class="blog-card-content">
                <div class="blog-card-author">
                    <img src="${blog.authorAvatar}" alt="${blog.authorName}"
                         onerror="this.src='https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80'">
                    <div class="blog-card-author-info">
                        <span class="blog-card-author-name">${blog.authorName}</span>
                        <span class="blog-card-date">${formatDate(blog.publishedAt)}</span>
                    </div>
                </div>
                <h3 class="blog-card-title">${blog.title}</h3>
                <p class="blog-card-excerpt">${blog.excerpt}</p>
                <div class="blog-card-meta">
                    <div class="blog-card-stats">
                        <span><i class="fas fa-eye"></i> ${blog.views || 0}</span>
                        <span><i class="fas fa-heart"></i> ${blog.likes || 0}</span>
                    </div>
                    <span class="blog-card-link">続きを読む <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function openBlogDetail(slug) {
    const modal = document.getElementById('blogDetailModal');
    const content = document.getElementById('blogDetailContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>読み込み中...</p>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    try {
        const response = await fetch(`${API_BASE}/api/blogs/${slug}`);
        const data = await response.json();
        
        if (data.success) {
            renderBlogDetail(data.blog);
        } else {
            content.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>エラー</h3>
                    <p>記事を取得できませんでした</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('ブログ詳細取得エラー:', error);
        content.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                <h3>エラー</h3>
                <p>記事を取得できませんでした</p>
            </div>
        `;
    }
}

function renderBlogDetail(blog) {
    const content = document.getElementById('blogDetailContent');
    if (!content) return;
    
    // Markdownをシンプルなパースで変換
    const htmlContent = parseMarkdown(blog.content);
    
    content.innerHTML = `
        <div class="blog-detail">
            ${blog.featuredImage ? `<img src="${blog.featuredImage}" alt="${blog.title}" class="blog-detail-image">` : ''}
            
            <div class="blog-detail-header">
                <span class="blog-detail-category">${blog.category}</span>
                <h1 class="blog-detail-title">${blog.title}</h1>
                <div class="blog-detail-author">
                    <img src="${blog.authorAvatar}" alt="${blog.authorName}">
                    <div>
                        <span class="blog-detail-author-name">${blog.authorName}</span>
                        <span class="blog-detail-date">${formatDate(blog.publishedAt)}</span>
                    </div>
                </div>
            </div>
            
            <div class="blog-detail-content">
                ${htmlContent}
            </div>
            
            ${(blog.tags && blog.tags.length > 0) ? `
                <div class="blog-detail-tags">
                    ${blog.tags.map(tag => `<span>#${tag}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="blog-detail-stats">
                <span><i class="fas fa-eye"></i> ${blog.views || 0} 閲覧</span>
                <button onclick="likeBlog('${blog.id}')" id="likeBtn-${blog.id}">
                    <i class="far fa-heart"></i> <span id="likeCount-${blog.id}">${blog.likes || 0}</span> いいね
                </button>
            </div>
        </div>
    `;
}

function parseMarkdown(text) {
    if (!text) return '';
    
    return text
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>')
        .replace(/<p><\/p>/g, '');
}

async function likeBlog(blogId) {
    try {
        const response = await fetch(`${API_BASE}/api/blogs/${blogId}/like`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            const countEl = document.getElementById(`likeCount-${blogId}`);
            const btnEl = document.getElementById(`likeBtn-${blogId}`);
            if (countEl) countEl.textContent = data.likes;
            if (btnEl) {
                btnEl.classList.add('liked');
                btnEl.querySelector('i').classList.replace('far', 'fas');
            }
        }
    } catch (error) {
        console.error('いいねエラー:', error);
    }
}

function closeBlogDetailModal() {
    const modal = document.getElementById('blogDetailModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// メンバー詳細
// ============================================
async function openMemberDetail(memberId) {
    const modal = document.getElementById('memberDetailModal');
    const content = document.getElementById('memberDetailContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>読み込み中...</p>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    try {
        const response = await fetch(`${API_BASE}/api/members/${memberId}`);
        const data = await response.json();
        
        if (data.success) {
            renderMemberDetail(data.member);
        } else {
            content.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>エラー</h3>
                    <p>メンバー情報を取得できませんでした</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('メンバー詳細取得エラー:', error);
        content.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                <h3>エラー</h3>
                <p>メンバー情報を取得できませんでした</p>
            </div>
        `;
    }
}

function renderMemberDetail(member) {
    const content = document.getElementById('memberDetailContent');
    if (!content) return;
    
    const snsLinks = [];
    if (member.sns) {
        if (member.sns.twitter) {
            snsLinks.push(`<a href="https://twitter.com/${member.sns.twitter}" target="_blank"><i class="fab fa-twitter"></i> Twitter</a>`);
        }
        if (member.sns.instagram) {
            snsLinks.push(`<a href="https://instagram.com/${member.sns.instagram}" target="_blank"><i class="fab fa-instagram"></i> Instagram</a>`);
        }
        if (member.sns.facebook) {
            snsLinks.push(`<a href="https://facebook.com/${member.sns.facebook}" target="_blank"><i class="fab fa-facebook"></i> Facebook</a>`);
        }
    }
    
    content.innerHTML = `
        <div class="member-detail">
            <div class="member-detail-header">
                <img src="${member.avatar}" alt="${member.name}" class="member-detail-avatar"
                     onerror="this.src='https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80'">
                <div class="member-detail-info">
                    <h2 class="member-detail-name">${member.name}</h2>
                    <p class="member-detail-business">${member.business}</p>
                    <div class="member-detail-meta">
                        <span><i class="fas fa-tag"></i> ${member.businessCategory || 'その他'}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${member.location || '未設定'}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${member.joinDate} 入会</span>
                    </div>
                    <div class="member-detail-skills">
                        ${(member.skills || []).map(skill => 
                            `<span class="skill-tag">${skill}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            ${member.introduction ? `
                <div class="member-detail-section">
                    <h3><i class="fas fa-user"></i> 自己紹介</h3>
                    <p>${member.introduction}</p>
                </div>
            ` : ''}
            
            ${member.website ? `
                <div class="member-detail-section">
                    <h3><i class="fas fa-globe"></i> ウェブサイト</h3>
                    <p><a href="${member.website}" target="_blank">${member.website}</a></p>
                </div>
            ` : ''}
            
            ${snsLinks.length > 0 ? `
                <div class="member-detail-section">
                    <h3><i class="fas fa-share-alt"></i> SNS</h3>
                    <div class="member-detail-sns">
                        ${snsLinks.join('')}
                    </div>
                </div>
            ` : ''}
            
            <div class="member-detail-actions">
                <button class="btn btn-primary" onclick="contactMember('${member.id}')">
                    <i class="fas fa-envelope"></i> メッセージを送る
                </button>
                <button class="btn btn-outline" onclick="closeMemberDetailModal()">
                    閉じる
                </button>
            </div>
        </div>
    `;
}

function closeMemberDetailModal() {
    const modal = document.getElementById('memberDetailModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function contactMember(memberId) {
    if (!currentUser) {
        showNotification('メッセージを送るにはログインが必要です', 'warning');
        closeMemberDetailModal();
        openLoginModal();
        return;
    }
    // 交流会での対面コミュニケーションを促す
    showNotification('次回の交流会で直接お会いしましょう！', 'success');
}

// ============================================
// 認証機能
// ============================================

// 会員登録
async function handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const password = form.password.value;
    const passwordConfirm = form.passwordConfirm.value;
    
    if (password !== passwordConfirm) {
        showNotification('パスワードが一致しません', 'error');
        return;
    }
    
    const skillsInput = form.skills.value;
    const skills = skillsInput ? skillsInput.split(',').map(s => s.trim()).filter(s => s) : [];
    
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登録中...';
    
    try {
        const response = await fetch(`${API_BASE}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: form.email.value,
                password: password,
                name: form.name.value,
                furigana: form.furigana.value,
                phone: form.phone.value,
                business: form.business.value,
                businessCategory: form.businessCategory.value,
                location: form.location.value,
                introduction: form.introduction.value,
                skills: skills
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.member;
            sessionId = data.sessionId;
            localStorage.setItem('sessionId', sessionId);
            
            closeRegisterModal();
            updateUIForLoggedInUser();
            await loadStats();
            await loadMembers();
            
            showSuccessModal('会員登録完了', 'みんなのWAへようこそ！<br>プロフィールが登録されました。');
        } else {
            showNotification(data.message || '登録に失敗しました', 'error');
        }
    } catch (error) {
        console.error('登録エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ログイン
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ログイン中...';
    
    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: form.email.value,
                password: form.password.value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.member;
            sessionId = data.sessionId;
            localStorage.setItem('sessionId', sessionId);
            
            closeLoginModal();
            updateUIForLoggedInUser();
            
            showNotification(`ようこそ、${currentUser.name}さん！`, 'success');
        } else {
            showNotification(data.message || 'ログインに失敗しました', 'error');
        }
    } catch (error) {
        console.error('ログインエラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// デモログイン
async function demoLogin(email, password = 'password123') {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = password;
    
    const form = document.getElementById('loginForm');
    handleLogin({ target: form, preventDefault: () => {} });
}

// ログアウト
async function logout() {
    try {
        await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
    } catch (error) {
        console.error('ログアウトエラー:', error);
    }
    
    clearSession();
    showNotification('ログアウトしました', 'info');
}

// UI更新: ログイン状態
function updateUIForLoggedInUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const navUserAvatar = document.getElementById('navUserAvatar');
    const navUserName = document.getElementById('navUserName');
    const adminLink = document.getElementById('adminLink');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) userMenu.style.display = 'block';
    if (navUserAvatar) navUserAvatar.src = currentUser.avatar;
    if (navUserName) navUserName.textContent = currentUser.name;
    
    // 管理者の場合は管理者リンクを表示
    if (adminLink) {
        adminLink.style.display = currentUser.isAdmin ? 'flex' : 'none';
    }
}

// UI更新: ログアウト状態
function updateUIForLoggedOutUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const adminLink = document.getElementById('adminLink');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
}

// ユーザードロップダウン
function toggleUserDropdown() {
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// マイプロフィール
function openMyProfile() {
    if (currentUser) {
        openMemberDetail(currentUser.id);
    }
    toggleUserDropdown();
}

// プロフィール編集
function openEditProfileModal() {
    if (!currentUser) {
        showNotification('ログインが必要です', 'warning');
        openLoginModal();
        return;
    }
    
    toggleUserDropdown();
    
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    // フォームに現在の値を設定
    document.getElementById('editName').value = currentUser.name || '';
    document.getElementById('editFurigana').value = currentUser.furigana || '';
    document.getElementById('editBusiness').value = currentUser.business || '';
    document.getElementById('editCategory').value = currentUser.businessCategory || 'その他';
    document.getElementById('editPhone').value = currentUser.phone || '';
    document.getElementById('editLocation').value = currentUser.location || '';
    document.getElementById('editIntroduction').value = currentUser.introduction || '';
    document.getElementById('editSkills').value = (currentUser.skills || []).join(', ');
    document.getElementById('editWebsite').value = currentUser.website || '';
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function handleEditProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const skillsInput = form.skills.value;
    const skills = skillsInput ? skillsInput.split(',').map(s => s.trim()).filter(s => s) : [];
    
    const updateData = {
        name: form.name.value,
        furigana: form.furigana.value,
        business: form.business.value,
        businessCategory: form.businessCategory.value,
        phone: form.phone.value,
        location: form.location.value,
        introduction: form.introduction.value,
        skills: skills,
        website: form.website.value,
        sessionId: sessionId
    };
    
    const submitBtn = form.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    try {
        const response = await fetch(`${API_BASE}/api/members/${currentUser.id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.member;
            updateUIForLoggedInUser();
            closeEditProfileModal();
            showNotification('プロフィールを更新しました', 'success');
            await loadMembers();
        } else {
            showNotification(data.message || '更新に失敗しました', 'error');
        }
    } catch (error) {
        console.error('プロフィール更新エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ============================================
// メッセージ機能
// ============================================
function openMessagesModal() {
    if (!currentUser) {
        showNotification('ログインが必要です', 'warning');
        openLoginModal();
        return;
    }
    
    toggleUserDropdown();
    
    const modal = document.getElementById('messagesModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        loadMessages();
    }
}

function closeMessagesModal() {
    const modal = document.getElementById('messagesModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    activeConversation = null;
}

async function loadMessages() {
    const content = document.getElementById('messagesContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>読み込み中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/messages`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            allMessages = data.messages;
            renderMessages();
        } else {
            content.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-inbox"></i>
                    <h3>メッセージを取得できませんでした</h3>
                </div>
            `;
        }
    } catch (error) {
        console.error('メッセージ取得エラー:', error);
        content.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-exclamation-circle"></i>
                <h3>エラーが発生しました</h3>
            </div>
        `;
    }
}

function renderMessages() {
    const content = document.getElementById('messagesContent');
    if (!content) return;
    
    // 会話相手ごとにグループ化
    const conversations = {};
    allMessages.forEach(msg => {
        const otherId = msg.fromId === currentUser.id ? msg.toId : msg.fromId;
        if (!conversations[otherId]) {
            conversations[otherId] = {
                otherUser: msg.otherUser,
                messages: [],
                lastMessage: msg,
                hasUnread: false
            };
        }
        conversations[otherId].messages.push(msg);
        if (!msg.read && msg.toId === currentUser.id) {
            conversations[otherId].hasUnread = true;
        }
    });
    
    const conversationList = Object.values(conversations);
    
    if (conversationList.length === 0) {
        content.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-inbox"></i>
                <h3>メッセージはありません</h3>
                <p>他のメンバーにメッセージを送って交流を始めましょう！</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `
        <div class="messages-container">
            <div class="messages-list">
                ${conversationList.map(conv => `
                    <div class="message-thread ${activeConversation === conv.otherUser?.id ? 'active' : ''}" 
                         onclick="openConversation('${conv.otherUser?.id}')">
                        <img src="${conv.otherUser?.avatar || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80'}" 
                             alt="${conv.otherUser?.name}" class="message-thread-avatar">
                        <div class="message-thread-info">
                            <div class="message-thread-name">${conv.otherUser?.name || '不明なユーザー'}</div>
                            <div class="message-thread-preview">${conv.lastMessage.content.substring(0, 30)}...</div>
                        </div>
                        <div>
                            <div class="message-thread-time">${formatMessageTime(conv.lastMessage.createdAt)}</div>
                            ${conv.hasUnread ? '<div class="message-thread-unread"></div>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="messages-view" id="messagesView">
                <div class="no-messages">
                    <i class="fas fa-comments"></i>
                    <p>会話を選択してください</p>
                </div>
            </div>
        </div>
    `;
}

function openConversation(userId) {
    activeConversation = userId;
    
    // 会話相手のメッセージを取得
    const messages = allMessages.filter(msg => 
        msg.fromId === userId || msg.toId === userId
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    const otherUser = messages[0]?.otherUser;
    
    // スレッドをアクティブにする
    document.querySelectorAll('.message-thread').forEach(thread => {
        thread.classList.toggle('active', thread.getAttribute('onclick').includes(userId));
    });
    
    const view = document.getElementById('messagesView');
    if (!view) return;
    
    view.innerHTML = `
        <div class="messages-header">
            <img src="${otherUser?.avatar || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80'}" 
                 alt="${otherUser?.name}">
            <div class="messages-header-info">
                <strong>${otherUser?.name || '不明なユーザー'}</strong>
                <span>${otherUser?.business || ''}</span>
            </div>
        </div>
        <div class="messages-content">
            ${messages.map(msg => `
                <div class="message-bubble ${msg.fromId === currentUser.id ? 'sent' : 'received'}">
                    ${msg.content}
                    <div class="message-bubble-time">${formatMessageTime(msg.createdAt)}</div>
                </div>
            `).join('')}
        </div>
        <div class="messages-input">
            <input type="text" id="messageInput" placeholder="メッセージを入力..." 
                   onkeydown="if(event.key==='Enter') sendMessageToUser('${userId}')">
            <button onclick="sendMessageToUser('${userId}')">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
    
    // 未読を既読にする
    markMessagesAsRead(userId);
    
    // スクロールを一番下に
    const messagesContent = view.querySelector('.messages-content');
    if (messagesContent) {
        messagesContent.scrollTop = messagesContent.scrollHeight;
    }
}

async function sendMessageToUser(toId) {
    const input = document.getElementById('messageInput');
    const content = input?.value?.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/messages`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ toId, content })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = '';
            await loadMessages();
            openConversation(toId);
        } else {
            showNotification(data.message || '送信に失敗しました', 'error');
        }
    } catch (error) {
        console.error('メッセージ送信エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

async function markMessagesAsRead(userId) {
    const unreadMessages = allMessages.filter(msg => 
        msg.fromId === userId && msg.toId === currentUser.id && !msg.read
    );
    
    for (const msg of unreadMessages) {
        try {
            await fetch(`${API_BASE}/api/messages/${msg.id}/read`, {
                method: 'PUT',
                headers: { 'x-session-id': sessionId }
            });
        } catch (error) {
            console.error('既読更新エラー:', error);
        }
    }
}

function formatMessageTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'たった今';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '時間前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '日前';
    
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

// メンバー詳細からメッセージ送信
function contactMember(memberId) {
    if (!currentUser) {
        showNotification('メッセージを送るにはログインが必要です', 'warning');
        closeMemberDetailModal();
        openLoginModal();
        return;
    }
    
    if (memberId === currentUser.id) {
        showNotification('自分自身にはメッセージを送れません', 'warning');
        return;
    }
    
    closeMemberDetailModal();
    openMessagesModal();
    
    // 少し遅延させてからメッセージ画面を開く
    setTimeout(() => {
        openConversation(memberId);
    }, 500);
}

// ============================================
// イベント参加機能
// ============================================
async function joinEvent() {
    if (!currentUser) {
        showNotification('イベントに参加するにはログインが必要です', 'warning');
        openLoginModal();
        return;
    }
    
    // 最新のイベント情報を取得
    try {
        const response = await fetch(`${API_BASE}/api/events?status=upcoming&limit=1`);
        const data = await response.json();
        
        if (data.success && data.events.length > 0) {
            const event = data.events[0];
            openEventDetailModal(event.id);
        } else {
            showNotification('現在参加可能なイベントがありません', 'info');
        }
    } catch (error) {
        console.error('イベント取得エラー:', error);
        showNotification('イベント情報を取得できませんでした', 'error');
    }
}

async function openEventDetailModal(eventId) {
    try {
        const response = await fetch(`${API_BASE}/api/events/${eventId}`);
        const data = await response.json();
        
        if (data.success) {
            showEventDetail(data.event);
        } else {
            showNotification('イベント情報を取得できませんでした', 'error');
        }
    } catch (error) {
        console.error('イベント詳細取得エラー:', error);
        showNotification('エラーが発生しました', 'error');
    }
}

function showEventDetail(event) {
    const eventDate = new Date(event.date);
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    
    const isJoined = currentUser && event.attendees?.includes(currentUser.id);
    const remainingSeats = event.capacity - (event.attendees?.length || 0);
    const capacityPercentage = ((event.attendees?.length || 0) / event.capacity) * 100;
    
    // メンバー詳細モーダルを再利用
    const modal = document.getElementById('memberDetailModal');
    const content = document.getElementById('memberDetailContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
        <div class="event-detail-modal">
            <div class="event-detail-header">
                <div class="event-detail-date">
                    <span class="month">${monthNames[eventDate.getMonth()]}</span>
                    <span class="day">${eventDate.getDate()}</span>
                    <span class="weekday">${weekdays[eventDate.getDay()]}</span>
                </div>
                <div class="event-detail-main">
                    <h2>${event.title}</h2>
                    <div class="event-detail-info">
                        <div class="event-detail-info-item">
                            <i class="fas fa-clock"></i>
                            <span>${event.time || '時間未定'}</span>
                        </div>
                        <div class="event-detail-info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.location || '会場未定'}</span>
                        </div>
                        <div class="event-detail-info-item">
                            <i class="fas fa-yen-sign"></i>
                            <span>参加費 ${event.fee?.toLocaleString() || 0}円</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${event.description ? `
                <div class="event-detail-description">
                    ${event.description}
                </div>
            ` : ''}
            
            <div class="event-detail-capacity">
                <span>${event.attendees?.length || 0}名参加</span>
                <div class="event-capacity-bar">
                    <div class="event-capacity-fill" style="width: ${capacityPercentage}%"></div>
                </div>
                <span>残り${remainingSeats}席</span>
            </div>
            
            <div class="event-detail-actions">
                ${isJoined ? `
                    <button class="btn btn-outline btn-large" onclick="cancelEventJoin('${event.id}')">
                        <i class="fas fa-times"></i> 参加をキャンセル
                    </button>
                    <span style="color: var(--primary); font-weight: 600;">
                        <i class="fas fa-check-circle"></i> 参加申込済み
                    </span>
                ` : remainingSeats > 0 ? `
                    <button class="btn btn-primary btn-large" onclick="submitEventJoin('${event.id}')">
                        <i class="fas fa-calendar-plus"></i> 参加申し込み
                    </button>
                ` : `
                    <button class="btn btn-primary btn-large" disabled>
                        <i class="fas fa-ban"></i> 定員に達しました
                    </button>
                `}
                <button class="btn btn-outline" onclick="closeMemberDetailModal()">
                    閉じる
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function submitEventJoin(eventId) {
    if (!currentUser) {
        showNotification('ログインが必要です', 'warning');
        closeMemberDetailModal();
        openLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/events/${eventId}/join`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('イベントへの参加申し込みが完了しました！', 'success');
            closeMemberDetailModal();
            showSuccessModal('参加申し込み完了', 
                'イベントへの参加申し込みを受け付けました。<br>当日のご参加をお待ちしております！');
        } else {
            showNotification(data.message || '参加申し込みに失敗しました', 'error');
        }
    } catch (error) {
        console.error('イベント参加エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

async function cancelEventJoin(eventId) {
    if (!confirm('イベントへの参加をキャンセルしますか？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/events/${eventId}/join`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('参加をキャンセルしました', 'info');
            closeMemberDetailModal();
        } else {
            showNotification(data.message || 'キャンセルに失敗しました', 'error');
        }
    } catch (error) {
        console.error('イベントキャンセルエラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

// ============================================
// 管理者機能
// ============================================
function openAdminPanel() {
    if (!currentUser || !currentUser.isAdmin) {
        showNotification('管理者権限が必要です', 'error');
        return;
    }
    
    toggleUserDropdown();
    
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        switchAdminTab('dashboard');
    }
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    editingBlogId = null;
    editingEventId = null;
}

function switchAdminTab(tab) {
    currentAdminTab = tab;
    
    // タブボタンの更新
    document.querySelectorAll('.admin-tab').forEach(btn => {
        const tabNames = {
            'dashboard': 'ダッシュボード',
            'members': 'メンバー',
            'blogs': 'ブログ',
            'events': 'イベント'
        };
        btn.classList.toggle('active', btn.textContent.includes(tabNames[tab]));
    });
    
    // コンテンツの更新
    switch(tab) {
        case 'dashboard':
            loadAdminDashboard();
            break;
        case 'blogs':
            loadAdminBlogs();
            break;
        case 'members':
            loadAdminMembers();
            break;
        case 'events':
            loadAdminEvents();
            break;
    }
}

// 管理者: ダッシュボード
async function loadAdminDashboard() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>ダッシュボード読み込み中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            renderAdminDashboard(data.dashboard);
        } else {
            adminContent.innerHTML = `<p>ダッシュボードの読み込みに失敗しました</p>`;
        }
    } catch (error) {
        console.error('ダッシュボード取得エラー:', error);
        adminContent.innerHTML = `<p>エラーが発生しました</p>`;
    }
}

function renderAdminDashboard(dashboard) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    const { overview, categoryStats, locationStats, recentMembers, recentBlogs } = dashboard;
    
    // カテゴリ別チャートデータ
    const maxCategory = Math.max(...Object.values(categoryStats));
    const categoryBars = Object.entries(categoryStats).map(([name, count]) => {
        const percentage = (count / maxCategory) * 100;
        return `
            <div class="admin-category-item">
                <span class="admin-category-label">${name}</span>
                <div class="admin-category-bar">
                    <div class="admin-category-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="admin-category-count">${count}</span>
            </div>
        `;
    }).join('');
    
    // 地域別チャートデータ
    const maxLocation = Math.max(...Object.values(locationStats));
    const locationBars = Object.entries(locationStats).map(([name, count]) => {
        const percentage = (count / maxLocation) * 100;
        return `
            <div class="admin-category-item">
                <span class="admin-category-label">${name}</span>
                <div class="admin-category-bar">
                    <div class="admin-category-fill" style="width: ${percentage}%; background: linear-gradient(90deg, var(--secondary) 0%, var(--secondary-light) 100%)"></div>
                </div>
                <span class="admin-category-count">${count}</span>
            </div>
        `;
    }).join('');
    
    adminContent.innerHTML = `
        <div class="admin-dashboard">
            <!-- 統計カード -->
            <div class="admin-stats-grid">
                <div class="admin-stat-card">
                    <div class="admin-stat-icon"><i class="fas fa-users"></i></div>
                    <div class="admin-stat-value">${overview.totalMembers}</div>
                    <div class="admin-stat-label">総メンバー数</div>
                    ${overview.newMembersThisMonth > 0 ? `
                        <div class="admin-stat-change positive">
                            <i class="fas fa-arrow-up"></i> 今月 +${overview.newMembersThisMonth}名
                        </div>
                    ` : ''}
                </div>
                <div class="admin-stat-card secondary">
                    <div class="admin-stat-icon"><i class="fas fa-newspaper"></i></div>
                    <div class="admin-stat-value">${overview.publishedBlogs}</div>
                    <div class="admin-stat-label">公開記事数</div>
                    <div class="admin-stat-change positive">
                        <i class="fas fa-eye"></i> ${overview.totalViews}閲覧
                    </div>
                </div>
                <div class="admin-stat-card accent">
                    <div class="admin-stat-icon"><i class="fas fa-calendar-check"></i></div>
                    <div class="admin-stat-value">${overview.upcomingEvents}</div>
                    <div class="admin-stat-label">予定イベント</div>
                    <div class="admin-stat-change positive">
                        <i class="fas fa-user-check"></i> 平均${overview.avgEventAttendance}名参加
                    </div>
                </div>
                <div class="admin-stat-card info">
                    <div class="admin-stat-icon"><i class="fas fa-heart"></i></div>
                    <div class="admin-stat-value">${overview.totalLikes}</div>
                    <div class="admin-stat-label">総いいね数</div>
                </div>
            </div>
            
            <!-- チャートセクション -->
            <div class="admin-grid-2">
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3><i class="fas fa-chart-pie"></i> カテゴリ別メンバー</h3>
                    </div>
                    <div class="admin-category-list">
                        ${categoryBars || '<p style="color: var(--text-muted);">データがありません</p>'}
                    </div>
                </div>
                
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3><i class="fas fa-map-marker-alt"></i> 地域別メンバー</h3>
                    </div>
                    <div class="admin-category-list">
                        ${locationBars || '<p style="color: var(--text-muted);">データがありません</p>'}
                    </div>
                </div>
            </div>
            
            <!-- 最近のアクティビティ -->
            <div class="admin-grid-2">
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3><i class="fas fa-user-plus"></i> 最近のメンバー</h3>
                        <button class="btn glass-btn-small" onclick="switchAdminTab('members')">
                            すべて見る
                        </button>
                    </div>
                    <div class="admin-activity-list">
                        ${recentMembers.map(member => `
                            <div class="admin-activity-item">
                                <img src="${member.avatar}" alt="${member.name}" class="admin-activity-avatar"
                                     onerror="this.src='https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80'">
                                <div class="admin-activity-info">
                                    <div class="admin-activity-name">${member.name}</div>
                                    <div class="admin-activity-desc">${member.business}</div>
                                </div>
                                <span class="admin-activity-time">${member.joinDate}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="admin-section">
                    <div class="admin-section-header">
                        <h3><i class="fas fa-edit"></i> 最近の記事</h3>
                        <button class="btn glass-btn-small" onclick="switchAdminTab('blogs')">
                            すべて見る
                        </button>
                    </div>
                    <div class="admin-activity-list">
                        ${recentBlogs.map(blog => `
                            <div class="admin-activity-item">
                                <img src="${blog.featuredImage || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'}" 
                                     alt="${blog.title}" class="admin-activity-avatar" style="border-radius: 8px;">
                                <div class="admin-activity-info">
                                    <div class="admin-activity-name">${blog.title}</div>
                                    <div class="admin-activity-desc">${blog.authorName} • ${blog.status === 'published' ? '公開中' : '下書き'}</div>
                                </div>
                                <span class="admin-activity-time">
                                    <i class="fas fa-eye"></i> ${blog.views || 0}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 管理者: ブログ一覧
async function loadAdminBlogs() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>読み込み中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/blogs`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            renderAdminBlogs(data.blogs);
        } else {
            adminContent.innerHTML = `<p>ブログの読み込みに失敗しました</p>`;
        }
    } catch (error) {
        console.error('管理者ブログ取得エラー:', error);
        adminContent.innerHTML = `<p>エラーが発生しました</p>`;
    }
}

function renderAdminBlogs(blogs) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-toolbar">
            <h3>ブログ記事一覧 (${blogs.length}件)</h3>
            <button class="btn glass-btn-primary" onclick="showBlogEditor()">
                <i class="fas fa-plus"></i> 新規作成
            </button>
        </div>
        
        <div class="admin-blog-list">
            ${blogs.length === 0 ? `
                <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                    ブログ記事がありません
                </p>
            ` : blogs.map(blog => `
                <div class="admin-blog-item">
                    <img src="${blog.featuredImage || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'}" 
                         alt="${blog.title}" class="admin-blog-image">
                    <div class="admin-blog-info">
                        <div class="admin-blog-title">${blog.title}</div>
                        <div class="admin-blog-meta">
                            ${blog.authorName} • ${formatDate(blog.updatedAt)}
                        </div>
                    </div>
                    <span class="admin-blog-status ${blog.status === 'published' ? 'status-published' : 'status-draft'}">
                        ${blog.status === 'published' ? '公開中' : '下書き'}
                    </span>
                    <div class="admin-blog-actions">
                        <button class="btn-edit" onclick="editBlog('${blog.id}')">
                            <i class="fas fa-edit"></i> 編集
                        </button>
                        <button class="btn-delete" onclick="deleteBlog('${blog.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function showBlogEditor(blog = null) {
    editingBlogId = blog?.id || null;
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-toolbar">
            <h3>${editingBlogId ? 'ブログ記事を編集' : '新規ブログ記事'}</h3>
            <button class="btn glass-btn-small" onclick="loadAdminBlogs()">
                <i class="fas fa-arrow-left"></i> 戻る
            </button>
        </div>
        
        <form class="blog-edit-form" onsubmit="saveBlog(event)">
            <div class="form-group">
                <label for="blogTitle">タイトル <span class="required">*</span></label>
                <input type="text" id="blogTitle" name="title" required class="glass-input"
                       value="${blog?.title || ''}" placeholder="記事のタイトルを入力">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="blogSlug">スラッグ（URL用）</label>
                    <input type="text" id="blogSlug" name="slug" class="glass-input"
                           value="${blog?.slug || ''}" placeholder="例: new-product-2024">
                </div>
                <div class="form-group">
                    <label for="blogCategory">カテゴリー</label>
                    <select id="blogCategory" name="category" class="glass-input">
                        <option value="一般" ${blog?.category === '一般' ? 'selected' : ''}>一般</option>
                        <option value="商品開発" ${blog?.category === '商品開発' ? 'selected' : ''}>商品開発</option>
                        <option value="地域DX" ${blog?.category === '地域DX' ? 'selected' : ''}>地域DX</option>
                        <option value="伝統工芸" ${blog?.category === '伝統工芸' ? 'selected' : ''}>伝統工芸</option>
                        <option value="イベント" ${blog?.category === 'イベント' ? 'selected' : ''}>イベント</option>
                        <option value="お知らせ" ${blog?.category === 'お知らせ' ? 'selected' : ''}>お知らせ</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="blogFeaturedImage">アイキャッチ画像URL</label>
                <input type="url" id="blogFeaturedImage" name="featuredImage" class="glass-input"
                       value="${blog?.featuredImage || ''}" placeholder="https://...">
            </div>
            
            <div class="form-group">
                <label for="blogContent">本文 <span class="required">*</span></label>
                <textarea id="blogContent" name="content" required class="glass-input" rows="12"
                          placeholder="記事の本文を入力（Markdown形式対応）">${blog?.content || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="blogExcerpt">抜粋（概要）</label>
                <textarea id="blogExcerpt" name="excerpt" class="glass-input" rows="3"
                          placeholder="記事の概要（省略時は本文から自動生成）">${blog?.excerpt || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="blogTags">タグ（カンマ区切り）</label>
                <input type="text" id="blogTags" name="tags" class="glass-input"
                       value="${(blog?.tags || []).join(', ')}" placeholder="例: 石鹸, 新商品, ハンドメイド">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="blogStatus">公開状態</label>
                    <select id="blogStatus" name="status" class="glass-input">
                        <option value="draft" ${blog?.status === 'draft' ? 'selected' : ''}>下書き</option>
                        <option value="published" ${blog?.status === 'published' ? 'selected' : ''}>公開</option>
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> ${editingBlogId ? '更新する' : '作成する'}
                </button>
                <button type="button" class="btn btn-outline" onclick="loadAdminBlogs()">
                    キャンセル
                </button>
            </div>
        </form>
    `;
}

async function editBlog(blogId) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/blogs`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            const blog = data.blogs.find(b => b.id === blogId);
            if (blog) {
                showBlogEditor(blog);
            }
        }
    } catch (error) {
        console.error('ブログ取得エラー:', error);
        showNotification('ブログの取得に失敗しました', 'error');
    }
}

async function saveBlog(event) {
    event.preventDefault();
    
    const form = event.target;
    const tagsInput = form.tags.value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const blogData = {
        title: form.title.value,
        slug: form.slug.value || form.title.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        content: form.content.value,
        excerpt: form.excerpt.value,
        category: form.category.value,
        tags: tags,
        featuredImage: form.featuredImage.value,
        status: form.status.value,
        sessionId: sessionId
    };
    
    try {
        const url = editingBlogId 
            ? `${API_BASE}/api/admin/blogs/${editingBlogId}`
            : `${API_BASE}/api/admin/blogs`;
        
        const response = await fetch(url, {
            method: editingBlogId ? 'PUT' : 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(blogData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(editingBlogId ? '記事を更新しました' : '記事を作成しました', 'success');
            loadAdminBlogs();
            loadBlogs(); // フロントのブログも更新
        } else {
            showNotification(data.message || '保存に失敗しました', 'error');
        }
    } catch (error) {
        console.error('ブログ保存エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

async function deleteBlog(blogId) {
    if (!confirm('この記事を削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/blogs/${blogId}`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('記事を削除しました', 'success');
            loadAdminBlogs();
            loadBlogs();
        } else {
            showNotification(data.message || '削除に失敗しました', 'error');
        }
    } catch (error) {
        console.error('ブログ削除エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

// 管理者: メンバー一覧
async function loadAdminMembers() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>読み込み中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/members`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            renderAdminMembers(data.members);
        } else {
            adminContent.innerHTML = `<p>メンバーの読み込みに失敗しました</p>`;
        }
    } catch (error) {
        console.error('管理者メンバー取得エラー:', error);
        adminContent.innerHTML = `<p>エラーが発生しました</p>`;
    }
}

function renderAdminMembers(members) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-toolbar">
            <h3>メンバー一覧 (${members.length}名)</h3>
        </div>
        
        <div class="admin-member-list">
            ${members.map(member => `
                <div class="admin-member-item">
                    <img src="${member.avatar}" alt="${member.name}">
                    <div class="admin-member-info">
                        <div class="admin-member-name">
                            ${member.name}
                            ${member.isAdmin ? '<span class="admin-badge">管理者</span>' : ''}
                        </div>
                        <div class="admin-member-email">${member.email}</div>
                    </div>
                    <div class="admin-toggle">
                        <label>管理者権限</label>
                        <input type="checkbox" 
                               ${member.isAdmin ? 'checked' : ''} 
                               ${member.id === currentUser.id ? 'disabled' : ''}
                               onchange="toggleAdminStatus('${member.id}', this.checked)">
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function toggleAdminStatus(memberId, isAdmin) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/members/${memberId}/admin`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ isAdmin, sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`管理者権限を${isAdmin ? '付与' : '解除'}しました`, 'success');
        } else {
            showNotification(data.message || '更新に失敗しました', 'error');
            loadAdminMembers(); // 失敗時はリロード
        }
    } catch (error) {
        console.error('管理者権限更新エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
        loadAdminMembers();
    }
}

// 管理者: イベント一覧
async function loadAdminEvents() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>読み込み中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/events`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            renderAdminEvents(data.events);
        } else {
            adminContent.innerHTML = `<p>イベントの読み込みに失敗しました</p>`;
        }
    } catch (error) {
        console.error('管理者イベント取得エラー:', error);
        adminContent.innerHTML = `<p>エラーが発生しました</p>`;
    }
}

function renderAdminEvents(events) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-toolbar">
            <h3>イベント一覧 (${events.length}件)</h3>
            <button class="btn glass-btn-primary" onclick="showEventEditor()">
                <i class="fas fa-plus"></i> 新規作成
            </button>
        </div>
        
        <div class="admin-event-list">
            ${events.length === 0 ? `
                <p style="text-align: center; color: var(--text-muted); padding: 40px;">
                    イベントがありません
                </p>
            ` : events.map(event => {
                const eventDate = new Date(event.date);
                const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
                return `
                    <div class="admin-event-item">
                        <div class="admin-event-date-box">
                            <span class="month">${monthNames[eventDate.getMonth()]}</span>
                            <span class="day">${eventDate.getDate()}</span>
                        </div>
                        <div class="admin-event-info">
                            <div class="admin-event-title">${event.title}</div>
                            <div class="admin-event-meta">
                                <span><i class="fas fa-clock"></i> ${event.time || '未定'}</span>
                                <span><i class="fas fa-map-marker-alt"></i> ${event.location || '未定'}</span>
                            </div>
                            <div class="admin-event-stats">
                                <span class="admin-event-stat">
                                    <i class="fas fa-users"></i> ${event.attendees?.length || 0}/${event.capacity}名
                                </span>
                                <span class="admin-event-stat">
                                    <i class="fas fa-yen-sign"></i> ${event.fee?.toLocaleString() || 0}円
                                </span>
                                <span class="admin-event-stat" style="background: ${event.status === 'upcoming' ? 'rgba(45,90,39,0.1)' : 'rgba(150,150,150,0.1)'}">
                                    ${event.status === 'upcoming' ? '予定' : event.status === 'completed' ? '終了' : event.status}
                                </span>
                            </div>
                        </div>
                        <div class="admin-event-actions">
                            <button class="btn-edit" onclick="editEvent('${event.id}')">
                                <i class="fas fa-edit"></i> 編集
                            </button>
                            <button class="btn-delete" onclick="deleteEvent('${event.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function showEventEditor(event = null) {
    editingEventId = event?.id || null;
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-toolbar">
            <h3>${editingEventId ? 'イベントを編集' : '新規イベント'}</h3>
            <button class="btn glass-btn-small" onclick="loadAdminEvents()">
                <i class="fas fa-arrow-left"></i> 戻る
            </button>
        </div>
        
        <form class="event-edit-form" onsubmit="saveEvent(event)">
            <div class="form-group">
                <label for="eventTitle">タイトル <span class="required">*</span></label>
                <input type="text" id="eventTitle" name="title" required class="glass-input"
                       value="${event?.title || ''}" placeholder="例：第38回 みんなのWA 異業種交流会">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="eventDate">開催日 <span class="required">*</span></label>
                    <input type="date" id="eventDate" name="date" required class="glass-input"
                           value="${event?.date || ''}">
                </div>
                <div class="form-group">
                    <label for="eventTime">時間</label>
                    <input type="text" id="eventTime" name="time" class="glass-input"
                           value="${event?.time || ''}" placeholder="例：14:00〜17:00">
                </div>
            </div>
            
            <div class="form-group">
                <label for="eventLocation">会場</label>
                <input type="text" id="eventLocation" name="location" class="glass-input"
                       value="${event?.location || ''}" placeholder="例：彦根市民会館 2F 会議室A">
            </div>
            
            <div class="form-group">
                <label for="eventDescription">説明</label>
                <textarea id="eventDescription" name="description" class="glass-input" rows="4"
                          placeholder="イベントの詳細説明...">${event?.description || ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="eventCapacity">定員</label>
                    <input type="number" id="eventCapacity" name="capacity" class="glass-input"
                           value="${event?.capacity || 30}" min="1" max="500">
                </div>
                <div class="form-group">
                    <label for="eventFee">参加費（円）</label>
                    <input type="number" id="eventFee" name="fee" class="glass-input"
                           value="${event?.fee || 0}" min="0">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="eventImage">イメージ画像URL</label>
                    <input type="url" id="eventImage" name="image" class="glass-input"
                           value="${event?.image || ''}" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label for="eventStatus">ステータス</label>
                    <select id="eventStatus" name="status" class="glass-input">
                        <option value="upcoming" ${event?.status === 'upcoming' ? 'selected' : ''}>予定</option>
                        <option value="completed" ${event?.status === 'completed' ? 'selected' : ''}>終了</option>
                        <option value="cancelled" ${event?.status === 'cancelled' ? 'selected' : ''}>中止</option>
                    </select>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> ${editingEventId ? '更新する' : '作成する'}
                </button>
                <button type="button" class="btn btn-outline" onclick="loadAdminEvents()">
                    キャンセル
                </button>
            </div>
        </form>
    `;
}

async function editEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/events`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            const event = data.events.find(e => e.id === eventId);
            if (event) {
                showEventEditor(event);
            }
        }
    } catch (error) {
        console.error('イベント取得エラー:', error);
        showNotification('イベントの取得に失敗しました', 'error');
    }
}

async function saveEvent(event) {
    event.preventDefault();
    
    const form = event.target;
    
    const eventData = {
        title: form.title.value,
        date: form.date.value,
        time: form.time.value,
        location: form.location.value,
        description: form.description.value,
        capacity: parseInt(form.capacity.value) || 30,
        fee: parseInt(form.fee.value) || 0,
        image: form.image.value,
        status: form.status.value,
        sessionId: sessionId
    };
    
    try {
        const url = editingEventId 
            ? `${API_BASE}/api/admin/events/${editingEventId}`
            : `${API_BASE}/api/admin/events`;
        
        const response = await fetch(url, {
            method: editingEventId ? 'PUT' : 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(eventData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(editingEventId ? 'イベントを更新しました' : 'イベントを作成しました', 'success');
            loadAdminEvents();
        } else {
            showNotification(data.message || '保存に失敗しました', 'error');
        }
    } catch (error) {
        console.error('イベント保存エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('このイベントを削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('イベントを削除しました', 'success');
            loadAdminEvents();
        } else {
            showNotification(data.message || '削除に失敗しました', 'error');
        }
    } catch (error) {
        console.error('イベント削除エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

// ============================================
// モーダル制御
// ============================================
function openRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('registerForm')?.reset();
    }
}

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('loginForm')?.reset();
    }
}

function switchToLogin() {
    closeRegisterModal();
    setTimeout(openLoginModal, 200);
}

function switchToRegister() {
    closeLoginModal();
    setTimeout(openRegisterModal, 200);
}

function showSuccessModal(title, message) {
    const modal = document.getElementById('successModal');
    const titleEl = document.getElementById('successTitle');
    const messageEl = document.getElementById('successMessage');
    
    if (modal) {
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.innerHTML = message;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// 通知
// ============================================
function showNotification(message, type = 'info') {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: 'rgba(45, 90, 39, 0.95)',
        error: 'rgba(231, 76, 60, 0.95)',
        warning: 'rgba(243, 156, 18, 0.95)',
        info: 'rgba(52, 152, 219, 0.95)'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${colors[type]};
        backdrop-filter: blur(10px);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
        border: 1px solid rgba(255,255,255,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// イベントリスナー設定
// ============================================
function setupEventListeners() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const scrollTopBtn = document.getElementById('scrollTop');
    
    // スクロール時のナビバー変更
    window.addEventListener('scroll', function() {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
        
        if (scrollTopBtn) {
            if (window.scrollY > 500) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        }
    });

    // モバイルメニュートグル
    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            navMenu?.classList.toggle('active');
        });
    }

    // メニューリンクをクリックしたらメニューを閉じる
    navMenu?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navToggle?.classList.remove('active');
            navMenu?.classList.remove('active');
        });
    });

    // スムーススクロール
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navHeight = navbar?.offsetHeight || 70;
                const targetPosition = targetElement.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // スクロールトップボタン
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // モーダル外クリックで閉じる
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });
    
    // ドロップダウン外クリックで閉じる
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('dropdownMenu');
        const userBtn = document.querySelector('.user-avatar-btn');
        
        if (dropdown && !dropdown.contains(e.target) && !userBtn?.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}
