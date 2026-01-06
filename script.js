// ============================================
// みんなのWA - 彦根コミュニティ JavaScript
// Interactive Glassmorphism Edition v2.0
// ============================================

// ブラウザのスクロール位置復元を無効化（常にトップから表示）
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

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

// ページロード直後に完全にスクロールをブロック（最優先）
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// スクロール位置を強制的にトップに固定
window.scrollTo(0, 0);
document.documentElement.scrollTop = 0;
document.body.scrollTop = 0;

// スクロールイベントをブロック（ページ準備完了まで）
let scrollBlocked = true;
const blockScroll = (e) => {
    if (scrollBlocked) {
        e.preventDefault();
        e.stopPropagation();
        window.scrollTo(0, 0);
        return false;
    }
};

// 全てのスクロールイベントをブロック
window.addEventListener('scroll', blockScroll, { passive: false, capture: true });
window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
window.addEventListener('touchmove', blockScroll, { passive: false, capture: true });

// no-jsクラスを削除（JavaScriptが有効であることを示す）
document.documentElement.classList.remove('no-js');
if (document.body) {
    document.body.classList.remove('no-js');
}

console.log('🔒 スクロール完全ブロック中...');

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
        loadCollabAndBlogs(),
        loadNextEvent()
    ]);
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // インタラクティブ要素の初期化
    await loadHeroImages(); // ヒーロー画像を動的ロード（内部でinitHeroSlider()を呼ぶ）
    await loadAboutImage(); // About画像を動的ロード
    
    // 画像読み込み後、URLパラメータがなければトップへスクロール確認
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlParams = urlParams.get('event') || window.location.hash;
    if (!hasUrlParams) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        console.log('📍 画像読み込み後、トップへスクロール確認');
    }
    
    initParticles();
    initTestimonialSlider();
    initScrollAnimations();
    
    // 未読メッセージチェック（ログイン時）
    if (currentUser) {
        checkUnreadMessages();
    }
    
    const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`🌸 みんなのWA - 初期化完了 (${loadTime}s)`);
    
    // 最終的にスクロール位置を確認（変数は上で既に宣言済み）
    if (!hasUrlParams) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }
    
    // ページを表示してスクロールブロックを解除
    requestAnimationFrame(() => {
        // HTMLにreadyクラスを追加
        document.documentElement.classList.add('ready');
        document.body.classList.add('loaded');
        
        // スクロールブロックを解除
        scrollBlocked = false;
        
        console.log('✨ ページ表示完了 - スクロール解除');
    });
}

// 次回イベント情報を取得・表示
async function loadNextEvent() {
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        if (data.events && data.events.length > 0) {
            // 今日以降のイベントを取得してソート
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const upcomingEvents = data.events
                .filter(event => new Date(event.date) >= today)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (upcomingEvents.length > 0) {
                const event = upcomingEvents[0];
                updateEventDisplay(event);
            }
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
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        if (data) {
            const publicMembers = data.members.filter(m => m.isPublic);
            const categories = new Set(publicMembers.map(m => m.businessCategory));
            
            animateCounter('memberCount', publicMembers.length);
            animateCounter('categoryCount', categories.size);
            
            // 開催回数を更新
            const eventCountElement = document.querySelector('.hero-stat .stat-number[data-count]');
            if (eventCountElement && data.events) {
                eventCountElement.setAttribute('data-count', data.events.length);
                animateCounter(eventCountElement, data.events.length);
            }
        }
    } catch (error) {
        console.error('統計情報取得エラー:', error);
    }
}

function animateCounter(elementIdOrElement, targetValue) {
    const element = typeof elementIdOrElement === 'string' 
        ? document.getElementById(elementIdOrElement)
        : elementIdOrElement;
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
// ヒーロー画像を動的にロード
async function loadHeroImages() {
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        if (data.heroImages && data.heroImages.length > 0) {
            const sliderContainer = document.querySelector('.hero-slider');
            const dotsContainer = document.querySelector('.slider-dots');
            
            if (sliderContainer && dotsContainer) {
                // スライドを生成
                sliderContainer.innerHTML = data.heroImages.map((img, index) => 
                    `<div class="slide ${index === 0 ? 'active' : ''}" style="background-image: url('${img.url}')"></div>`
                ).join('');
                
                // ドットを生成
                dotsContainer.innerHTML = data.heroImages.map((img, index) => 
                    `<button class="dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></button>`
                ).join('');
                
                console.log('✅ ヒーロー画像ロード完了:', data.heroImages.length, '枚');
                
                // スライダーを初期化
                initHeroSlider();
            }
        }
    } catch (error) {
        console.error('❌ ヒーロー画像のロードエラー:', error);
        // エラー時は既存のスライダーを初期化
        initHeroSlider();
    }
}

// About画像を動的にロード
async function loadAboutImage() {
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        if (data.aboutImage) {
            const aboutImageElement = document.querySelector('.about-image-card img');
            if (aboutImageElement) {
                aboutImageElement.src = data.aboutImage.url || data.aboutImage;
                aboutImageElement.alt = data.aboutImage.alt || 'みんなのWA交流会の様子';
                console.log('✅ About画像ロード完了');
            }
        }
    } catch (error) {
        console.error('❌ About画像のロードエラー:', error);
    }
}

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
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        if (data.members) {
            // 公開メンバーのみをフィルター
            const publicMembers = data.members.filter(m => m.isPublic);
            allMembers = publicMembers;
            renderMembers(publicMembers);
            updateResultsCount(publicMembers.length);
            // setupMembersNavigation(); // ナビゲーションとスワイプを無効化
            
            // スクロールページャーをセットアップ
            setTimeout(() => {
                setupScrollPager('membersGrid', 'membersPager');
            }, 100);
        }
    } catch (error) {
        console.error('メンバー読み込みエラー:', error);
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
    
    membersGrid.innerHTML = members.map(member => {
        // OGP画像のURLを取得（存在しない場合はデフォルト画像）
        const ogpImage = member.websiteOgpImage || member.avatar || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80';
        
        // URLからドメインを抽出
        const websiteUrl = member.website || '';
        const displayUrl = websiteUrl ? websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
        
        return `
            <div class="member-card" onclick="openMemberDetail('${member.id}')">
                ${websiteUrl ? `
                    <div class="member-card-ogp">
                        <img src="${ogpImage}" alt="${member.name}" onerror="this.src='https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80'">
                        <span class="member-card-category">${member.businessCategory || 'その他'}</span>
                    </div>
                ` : `
                    <div class="member-card-header">
                        <span class="member-card-category">${member.businessCategory || 'その他'}</span>
                        <h3 class="member-card-name">${member.name}</h3>
                        <p class="member-card-business">${member.business}</p>
                    </div>
                `}
                <div class="member-card-body">
                    ${websiteUrl ? `
                        <h3 class="member-card-name" style="color: var(--text-primary); margin-bottom: 4px;">${member.name}</h3>
                        <p class="member-card-business" style="color: var(--text-muted); margin-bottom: 8px;">${member.business}</p>
                        <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="member-card-url" onclick="event.stopPropagation()">
                            <i class="fas fa-external-link-alt"></i>
                            <span>${displayUrl}</span>
                        </a>
                    ` : ''}
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
        `;
    }).join('');
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

// スクロールページャーの更新
function setupScrollPager(scrollContainerId, pagerId) {
    const container = document.getElementById(scrollContainerId);
    const pager = document.getElementById(pagerId);
    
    if (!container || !pager) return;
    
    const thumb = pager.querySelector('.pager-thumb');
    if (!thumb) return;
    
    function updatePager() {
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;
        
        // ページャーの幅を計算（表示領域の割合）
        const thumbWidth = (clientWidth / scrollWidth) * 100;
        // ページャーの位置を計算
        const thumbLeft = (scrollLeft / scrollWidth) * 100;
        
        thumb.style.width = `${thumbWidth}%`;
        thumb.style.left = `${thumbLeft}%`;
    }
    
    // スクロール時に更新
    container.addEventListener('scroll', updatePager);
    
    // 初期化時に更新
    updatePager();
    
    // リサイズ時に更新
    window.addEventListener('resize', updatePager);
}

// メンバーグリッドのナビゲーションとスワイプ設定
function setupMembersNavigation() {
    const membersGrid = document.getElementById('membersGrid');
    const prevBtn = document.getElementById('membersPrev');
    const nextBtn = document.getElementById('membersNext');
    
    if (!membersGrid) return;
    
    // カスタムスムーススクロール関数（高速化）
    function smoothScroll(element, targetLeft, duration = 400) {
        const startLeft = element.scrollLeft;
        const distance = targetLeft - startLeft;
        const startTime = performance.now();
        
        // イージング関数（スムーズな動き）
        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
        
        function animation(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutQuad(progress);
            
            element.scrollLeft = startLeft + distance * easedProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }
        
        requestAnimationFrame(animation);
    }
    
    // ナビゲーションボタン
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            smoothScroll(membersGrid, membersGrid.scrollLeft - 300);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            smoothScroll(membersGrid, membersGrid.scrollLeft + 300);
        });
    }
    
    // スワイプ機能
    let touchStartX = 0;
    let touchEndX = 0;
    
    membersGrid.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    membersGrid.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleMemberSwipe();
    }, { passive: true });
    
    function handleMemberSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // 左スワイプ（次へ）
                smoothScroll(membersGrid, membersGrid.scrollLeft + 300);
            } else {
                // 右スワイプ（前へ）
                smoothScroll(membersGrid, membersGrid.scrollLeft - 300);
            }
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

// コラボとブログをミックスして表示
// グローバル変数
let allCollabItems = [];
let filteredCollabItems = [];

async function loadCollabAndBlogs() {
    const carousel = document.getElementById('collabBlogCarousel');
    if (!carousel) {
        console.error('collabBlogCarousel element not found');
        return;
    }
    
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        console.log('Data loaded:', data);
        
        const collabs = (data.collaborations) ? data.collaborations.filter(c => c.isPublic) : [];
        const blogs = (data.blogs) ? data.blogs.slice(0, 6) : [];
        
        console.log('Filtered collabs:', collabs.length, 'blogs:', blogs.length);
        
        // コラボとブログをミックス
        allCollabItems = [];
        
        // コラボを追加
        collabs.forEach(collab => {
            allCollabItems.push({ type: 'collab', data: collab });
        });
        
        // ブログを追加
        blogs.forEach(blog => {
            allCollabItems.push({ type: 'blog', data: blog });
        });
        
        // ランダムにシャッフル
        allCollabItems.sort(() => Math.random() - 0.5);
        
        console.log('Total items to render:', allCollabItems.length);
        
        // 初期表示
        filteredCollabItems = [...allCollabItems];
        currentCollabPage = 0;
        renderCollabCarousel();
        setupCollabTabs();
        // setupCollabNavigation(); // ナビゲーションを無効化
        
        // スクロールページャーをセットアップ
        setTimeout(() => {
            setupScrollPager('collabBlogCarousel', 'collabPager');
        }, 100);
    } catch (error) {
        console.error('コンテンツ取得エラー:', error);
        carousel.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-exclamation-circle"></i>
                <h3>読み込みエラー</h3>
                <p>コンテンツを取得できませんでした: ${error.message}</p>
            </div>
        `;
    }
}

function renderCollabCarousel() {
    const carousel = document.getElementById('collabBlogCarousel');
    if (!carousel) return;
    
    if (filteredCollabItems.length === 0) {
        carousel.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-newspaper"></i>
                <h3>コンテンツがありません</h3>
                <p>該当する投稿がありません</p>
            </div>
        `;
        return;
    }
    
    // すべてのアイテムを表示（ページネーションなし）
    carousel.innerHTML = filteredCollabItems.map(item => renderCollabItem(item)).join('');
}

function renderCollabItem(item) {
    if (item.type === 'collab') {
        const collab = item.data;
        return `
            <div class="unified-card" onclick="openCollabDetail('${collab.id}')">
                <div class="unified-card-image">
                    <img src="${collab.image || collab.coverImageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80'}" alt="${collab.title}">
                    <span class="unified-card-category">${collab.category || 'コラボ事例'}</span>
                </div>
                <div class="unified-card-content">
                    <h3 class="unified-card-title">${collab.title}</h3>
                    <p class="unified-card-description">${collab.description}</p>
                    <div class="unified-card-meta">
                        <div class="unified-card-members">
                            ${collab.members ? collab.members.slice(0, 2).map((member, idx) => 
                                `<img src="${member.avatar}" alt="${member.name}" title="${member.name}">`
                            ).join('') : ''}
                        </div>
                        ${collab.result ? `<span class="unified-card-badge"><i class="fas fa-chart-line"></i> ${collab.result}</span>` : ''}
                    </div>
                    <button class="read-more-btn" onclick="event.stopPropagation(); openCollabDetail('${collab.id}')">
                        続きを読む <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    } else {
        const blog = item.data;
        return `
            <div class="unified-card" onclick="openBlogDetail('${blog.slug}')">
                <div class="unified-card-image">
                    <img src="${blog.featuredImage || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'}" alt="${blog.title}">
                    <span class="unified-card-category">${blog.category}</span>
                </div>
                <div class="unified-card-content">
                    <h3 class="unified-card-title">${blog.title}</h3>
                    <p class="unified-card-description">${blog.excerpt || blog.description || ''}</p>
                    <div class="unified-card-meta">
                        <div class="unified-card-author">
                            <img src="${blog.authorAvatar}" alt="${blog.authorName}">
                            <span>${blog.authorName}</span>
                        </div>
                        <span class="unified-card-date"><i class="far fa-calendar"></i> ${formatDate(blog.publishedAt)}</span>
                    </div>
                    <button class="read-more-btn" onclick="event.stopPropagation(); openBlogDetail('${blog.slug}')">
                        続きを読む <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    }
}

function setupCollabTabs() {
    const tabs = document.querySelectorAll('.collab-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // タブのアクティブ状態を切り替え
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // フィルタリング
            const filter = tab.dataset.filter;
            if (filter === 'all') {
                filteredCollabItems = [...allCollabItems];
            } else if (filter === 'collab') {
                filteredCollabItems = allCollabItems.filter(item => item.type === 'collab');
            } else if (filter === 'news') {
                // お知らせカテゴリのブログを表示
                filteredCollabItems = allCollabItems.filter(item => 
                    item.type === 'blog' && item.data.category === 'お知らせ'
                );
            } else if (filter === 'blog') {
                // お知らせ以外のブログを表示
                filteredCollabItems = allCollabItems.filter(item => 
                    item.type === 'blog' && item.data.category !== 'お知らせ'
                );
            }
            
            renderCollabCarousel();
            
            // カルーセルを先頭にスクロール
            const carousel = document.getElementById('collabBlogCarousel');
            if (carousel) {
                carousel.scrollLeft = 0;
            }
            
            // ページャーを更新
            setTimeout(() => {
                setupScrollPager('collabBlogCarousel', 'collabPager');
            }, 100);
        });
    });
}

function setupCollabNavigation() {
    const prevBtn = document.getElementById('collabPrev');
    const nextBtn = document.getElementById('collabNext');
    const carousel = document.getElementById('collabBlogCarousel');
    
    if (!carousel) return;
    
    // スムーススクロール関数
    function smoothScroll(element, targetLeft, duration = 400) {
        const startLeft = element.scrollLeft;
        const distance = targetLeft - startLeft;
        const startTime = performance.now();
        
        function easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
        
        function animation(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeInOutQuad(progress);
            
            element.scrollLeft = startLeft + distance * easedProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }
        
        requestAnimationFrame(animation);
    }
    
    // ナビゲーションボタン
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            smoothScroll(carousel, carousel.scrollLeft - 300);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            smoothScroll(carousel, carousel.scrollLeft + 300);
        });
    }
}

function renderCollabAndBlogs(items) {
    const grid = document.getElementById('collabBlogGrid');
    if (!grid) return;
    
    if (items.length === 0) {
        grid.innerHTML = `
            <div class="no-results glass-card">
                <i class="fas fa-newspaper"></i>
                <h3>コンテンツがありません</h3>
                <p>まだ投稿されていません</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = items.map(item => {
        if (item.type === 'collab') {
            const collab = item.data;
            return `
                <div class="collab-card">
                    <div class="collab-image">
                        <img src="${collab.coverImageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80'}" alt="${collab.title}">
                    </div>
                    <div class="collab-content">
                        <div class="collab-members">
                            ${collab.memberAvatars ? collab.memberAvatars.slice(0, 2).map((avatar, idx) => 
                                `${idx > 0 ? '<span class="plus">×</span>' : ''}<img src="${avatar}" alt="メンバー${idx + 1}">`
                            ).join('') : ''}
                        </div>
                        <h3>${collab.title}</h3>
                        <p>${collab.description}</p>
                        <div class="collab-result">
                            <span><i class="fas fa-chart-line"></i> ${collab.result || '成果'}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const blog = item.data;
            return `
                <div class="blog-card" onclick="openBlogDetail('${blog.slug}')">
                    <div class="blog-card-image">
                        <img src="${blog.featuredImage || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80'}" alt="${blog.title}">
                        <span class="blog-card-category">${blog.category}</span>
                    </div>
                    <div class="blog-card-content">
                        <div class="blog-card-author">
                            <img src="${blog.authorAvatar}" alt="${blog.authorName}">
                            <div>
                                <span class="author-name">${blog.authorName}</span>
                                <span class="blog-card-date">${formatDate(blog.publishDate)}</span>
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
            `;
        }
    }).join('');
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
        // allCollabItemsからブログを検索
        const blogItem = allCollabItems.find(item => 
            item.type === 'blog' && item.data.slug === slug
        );
        
        if (blogItem && blogItem.data) {
            renderBlogDetail(blogItem.data);
        } else {
            content.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>エラー</h3>
                    <p>記事が見つかりませんでした</p>
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
        // ローカルでいいねをカウント（data.jsonベース）
        const blogItem = allCollabItems.find(item => 
            item.type === 'blog' && item.data.id === blogId
        );
        
        if (blogItem && blogItem.data) {
            // いいね数を増やす
            blogItem.data.likes = (blogItem.data.likes || 0) + 1;
            
            // UIを更新
            const countEl = document.getElementById(`likeCount-${blogId}`);
            const btnEl = document.getElementById(`likeBtn-${blogId}`);
            if (countEl) countEl.textContent = blogItem.data.likes;
            if (btnEl) {
                btnEl.classList.add('liked');
                btnEl.querySelector('i').classList.replace('far', 'fas');
                btnEl.disabled = true;
            }
            
            console.log('いいね成功:', blogItem.data.title, '- 合計:', blogItem.data.likes);
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
// コラボ事例詳細
// ============================================
async function openCollabDetail(collabId) {
    const modal = document.getElementById('blogDetailModal'); // ブログと同じモーダルを使用
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
        // allCollabItemsからコラボ事例を検索
        const collabItem = allCollabItems.find(item => 
            item.type === 'collab' && item.data.id === collabId
        );
        
        if (collabItem && collabItem.data) {
            renderCollabDetail(collabItem.data);
        } else {
            content.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>エラー</h3>
                    <p>コラボ事例が見つかりませんでした</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('コラボ詳細取得エラー:', error);
        content.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                <h3>エラー</h3>
                <p>コラボ事例を取得できませんでした</p>
            </div>
        `;
    }
}

function renderCollabDetail(collab) {
    const content = document.getElementById('blogDetailContent');
    if (!content) return;
    
    // コラボメンバーのHTML生成
    const membersHtml = collab.members ? collab.members.map(member => `
        <div class="collab-detail-member">
            <img src="${member.avatar}" alt="${member.name}">
            <div>
                <h4>${member.name}</h4>
                <p>${member.business}</p>
            </div>
        </div>
    `).join('') : '';
    
    content.innerHTML = `
        <div class="blog-detail collab-detail">
            ${collab.image || collab.coverImageUrl ? `
                <img src="${collab.image || collab.coverImageUrl}" alt="${collab.title}" class="blog-detail-image">
            ` : ''}
            
            <div class="blog-detail-header">
                <span class="blog-detail-category">コラボ事例</span>
                <h1 class="blog-detail-title">${collab.title}</h1>
                ${collab.date ? `
                    <div class="blog-detail-date-simple">
                        <i class="fas fa-calendar-alt"></i> ${formatDate(collab.date)}
                    </div>
                ` : ''}
            </div>
            
            ${membersHtml ? `
                <div class="collab-detail-members-section">
                    <h3><i class="fas fa-users"></i> 参加メンバー</h3>
                    <div class="collab-detail-members-grid">
                        ${membersHtml}
                    </div>
                </div>
            ` : ''}
            
            <div class="blog-detail-content">
                <h3><i class="fas fa-info-circle"></i> コラボの概要</h3>
                <p>${collab.description}</p>
                
                ${collab.details ? `
                    <h3><i class="fas fa-file-alt"></i> 詳細</h3>
                    <p>${collab.details}</p>
                ` : ''}
                
                ${collab.result ? `
                    <div class="collab-result-detail">
                        <h3><i class="fas fa-chart-line"></i> 成果</h3>
                        <p>${collab.result}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
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
        // data.jsonから読み込んだallMembersを使用
        const member = allMembers.find(m => m.id === memberId);
        
        if (member) {
            renderMemberDetail(member);
        } else {
            content.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>エラー</h3>
                    <p>メンバー情報が見つかりませんでした</p>
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
            
            // ページ最上部へスクロール
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // 次回イベントを表示
            if (allEvents && allEvents.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const nextEventIndex = allEvents.findIndex(e => {
                    const eventDate = new Date(e.date);
                    eventDate.setHours(0, 0, 0, 0);
                    return eventDate >= today;
                });
                
                if (nextEventIndex !== -1) {
                    currentCarouselIndex = nextEventIndex;
                    renderCarousel();
                }
            }
            
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

// パスワードリセット関数
function openForgotPasswordModal(event) {
    event.preventDefault();
    closeLoginModal();
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // フォームとメッセージをリセット
        const form = document.getElementById('forgotPasswordForm');
        const successMsg = document.getElementById('resetSuccessMessage');
        if (form) form.style.display = 'block';
        if (successMsg) successMsg.style.display = 'none';
        document.getElementById('resetEmail').value = '';
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function backToLogin() {
    closeForgotPasswordModal();
    openLoginModal();
}

async function handleForgotPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.btn-submit');
    const originalText = submitBtn.innerHTML;
    const email = form.email.value;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
    
    try {
        // 実際のアプリケーションではここでAPIを呼び出します
        // const response = await fetch(`${API_BASE}/api/forgot-password`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email })
        // });
        
        // デモ用：1秒後に成功メッセージを表示
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // フォームを非表示にして成功メッセージを表示
        form.style.display = 'none';
        document.getElementById('resetSuccessMessage').style.display = 'block';
        
        // 3秒後にログイン画面に戻る
        setTimeout(() => {
            backToLogin();
        }, 3000);
        
    } catch (error) {
        console.error('パスワードリセットエラー:', error);
        showNotification('送信に失敗しました。もう一度お試しください。', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
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
    
    // アバタープレビューを設定
    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview) {
        avatarPreview.src = currentUser.avatar || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// アバター画像変更ハンドラー
let selectedAvatarFile = null;

function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
        showNotification('画像ファイルは5MB以下にしてください', 'error');
        return;
    }
    
    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
        showNotification('画像ファイルを選択してください', 'error');
        return;
    }
    
    // プレビュー表示
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) {
            avatarPreview.src = e.target.result;
        }
        selectedAvatarFile = file;
        showNotification('画像を選択しました。保存ボタンを押してください', 'success');
    };
    reader.readAsDataURL(file);
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
    
    const submitBtn = form.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    try {
        let avatarUrl = currentUser.avatar;
        
        // アバター画像がアップロードされている場合
        if (selectedAvatarFile) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 画像をアップロード中...';
            
            // 画像をBase64に変換（実際のプロジェクトではサーバーにアップロード）
            const reader = new FileReader();
            avatarUrl = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(selectedAvatarFile);
            });
            
            // 注: 実際のプロジェクトでは、ここでサーバーに画像をアップロードし、URLを取得
            // const uploadResponse = await fetch(`${API_BASE}/api/upload/avatar`, {
            //     method: 'POST',
            //     body: formData
            // });
            // avatarUrl = uploadResponse.data.url;
        }
        
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
            avatar: avatarUrl,
            sessionId: sessionId
        };
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
        
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
            selectedAvatarFile = null; // リセット
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
            'events': 'イベント',
            'testimonials': '会員の声',
            'collaborations': 'コラボ',
            'images': '画像'
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
        case 'testimonials':
            loadAdminTestimonials();
            break;
        case 'collaborations':
            loadAdminCollaborations();
            break;
        case 'images':
            loadAdminImages();
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
                            ${!member.isPublic ? '<span class="admin-badge" style="background: var(--text-muted)">非公開</span>' : ''}
                        </div>
                        <div class="admin-member-email">${member.email}</div>
                        <div class="admin-member-meta">
                            <span><i class="fas fa-briefcase"></i> ${member.business || '未設定'}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${member.location || '未設定'}</span>
                        </div>
                    </div>
                    <div class="admin-member-actions">
                        <button class="btn-edit" onclick="editMemberProfile('${member.id}')">
                            <i class="fas fa-edit"></i> 編集
                        </button>
                        <div class="admin-toggle">
                            <label>公開</label>
                            <input type="checkbox" 
                                   ${member.isPublic ? 'checked' : ''}
                                   onchange="toggleMemberPublic('${member.id}', this.checked)">
                        </div>
                        <div class="admin-toggle">
                            <label>管理者</label>
                            <input type="checkbox" 
                                   ${member.isAdmin ? 'checked' : ''} 
                                   ${member.id === currentUser.id ? 'disabled' : ''}
                                   onchange="toggleAdminStatus('${member.id}', this.checked)">
                        </div>
                        <button class="btn-delete" 
                                ${member.id === currentUser.id ? 'disabled' : ''}
                                onclick="deleteMember('${member.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function editMemberProfile(memberId) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/members`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        
        if (data.success) {
            const member = data.members.find(m => m.id === memberId);
            if (member) {
                showMemberEditor(member);
            }
        }
    } catch (error) {
        console.error('メンバー取得エラー:', error);
        showNotification('メンバー情報の取得に失敗しました', 'error');
    }
}

function showMemberEditor(member) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-toolbar">
            <h3>メンバープロフィール編集</h3>
            <button class="btn glass-btn-small" onclick="loadAdminMembers()">
                <i class="fas fa-arrow-left"></i> 戻る
            </button>
        </div>
        
        <form class="member-edit-form" onsubmit="saveMemberProfile(event, '${member.id}')">
            <div class="form-row">
                <div class="form-group">
                    <label for="memberName">名前 <span class="required">*</span></label>
                    <input type="text" id="memberName" name="name" required class="glass-input"
                           value="${member.name || ''}" placeholder="例：田中 太郎">
                </div>
                <div class="form-group">
                    <label for="memberFurigana">ふりがな</label>
                    <input type="text" id="memberFurigana" name="furigana" class="glass-input"
                           value="${member.furigana || ''}" placeholder="例：たなか たろう">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="memberEmail">メールアドレス <span class="required">*</span></label>
                    <input type="email" id="memberEmail" name="email" required class="glass-input"
                           value="${member.email || ''}" placeholder="example@email.com">
                </div>
                <div class="form-group">
                    <label for="memberPhone">電話番号</label>
                    <input type="tel" id="memberPhone" name="phone" class="glass-input"
                           value="${member.phone || ''}" placeholder="090-1234-5678">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="memberBusiness">事業・職業 <span class="required">*</span></label>
                    <input type="text" id="memberBusiness" name="business" required class="glass-input"
                           value="${member.business || ''}" placeholder="例：ITコンサルタント">
                </div>
                <div class="form-group">
                    <label for="memberCategory">業種カテゴリ</label>
                    <select id="memberCategory" name="businessCategory" class="glass-input">
                        <option value="製造・クラフト" ${member.businessCategory === '製造・クラフト' ? 'selected' : ''}>製造・クラフト</option>
                        <option value="IT・デジタル" ${member.businessCategory === 'IT・デジタル' ? 'selected' : ''}>IT・デジタル</option>
                        <option value="飲食・食品" ${member.businessCategory === '飲食・食品' ? 'selected' : ''}>飲食・食品</option>
                        <option value="デザイン・クリエイティブ" ${member.businessCategory === 'デザイン・クリエイティブ' ? 'selected' : ''}>デザイン・クリエイティブ</option>
                        <option value="教育・研修" ${member.businessCategory === '教育・研修' ? 'selected' : ''}>教育・研修</option>
                        <option value="サービス" ${member.businessCategory === 'サービス' ? 'selected' : ''}>サービス</option>
                        <option value="その他" ${member.businessCategory === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <label for="memberIntroduction">自己紹介</label>
                <textarea id="memberIntroduction" name="introduction" class="glass-input" rows="4"
                          placeholder="あなたの事業や活動について...">${member.introduction || ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="memberLocation">活動地域</label>
                    <input type="text" id="memberLocation" name="location" class="glass-input"
                           value="${member.location || ''}" placeholder="例：彦根市">
                </div>
            </div>
            
            <div class="form-group">
                <label for="memberAvatar">プロフィール写真URL</label>
                <div class="avatar-preview-container">
                    <img id="avatarPreview" src="${member.avatar || 'https://i.pravatar.cc/200?img=1'}" 
                         alt="プロフィール写真プレビュー" class="avatar-preview-image"
                         onerror="this.src='https://i.pravatar.cc/200?img=1'">
                    <div class="avatar-input-group">
                        <input type="url" id="memberAvatar" name="avatar" class="glass-input"
                               value="${member.avatar || ''}" placeholder="https://example.com/photo.jpg"
                               oninput="updateAvatarPreview(this.value)">
                        <small class="form-help">画像のURLを入力してください（例：https://example.com/photo.jpg）</small>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label for="memberWebsite">ウェブサイト</label>
                <input type="url" id="memberWebsite" name="website" class="glass-input"
                       value="${member.website || ''}" placeholder="https://example.com">
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="memberTwitter">Twitter</label>
                    <input type="text" id="memberTwitter" name="twitter" class="glass-input"
                           value="${member.sns?.twitter || ''}" placeholder="@username">
                </div>
                <div class="form-group">
                    <label for="memberInstagram">Instagram/Facebook</label>
                    <input type="text" id="memberInstagram" name="instagram" class="glass-input"
                           value="${member.sns?.instagram || member.sns?.facebook || ''}" placeholder="@username">
                </div>
            </div>
            
            <div class="form-group">
                <label for="memberSkills">スキル・専門分野（カンマ区切り）</label>
                <input type="text" id="memberSkills" name="skills" class="glass-input"
                       value="${(member.skills || []).join(', ')}" placeholder="例：Web制作, マーケティング, デザイン">
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" name="isPublic" ${member.isPublic ? 'checked' : ''}>
                    プロフィールを公開する
                </label>
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 20px;">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> 保存する
                </button>
                <button type="button" class="btn btn-outline" onclick="loadAdminMembers()">
                    キャンセル
                </button>
            </div>
        </form>
    `;
}

function updateAvatarPreview(url) {
    const previewImg = document.getElementById('avatarPreview');
    if (previewImg && url) {
        previewImg.src = url;
    }
}

function updateEventImagePreview(url) {
    const previewContainer = document.getElementById('eventImagePreview');
    if (!previewContainer) return;
    
    if (url && url.trim()) {
        previewContainer.innerHTML = `
            <div style="position: relative; display: inline-block;">
                <img src="${url}" alt="イベント写真プレビュー" 
                     style="max-width: 100%; max-height: 200px; border-radius: 12px; border: 2px solid var(--border); object-fit: cover;"
                     onerror="this.style.display='none'; this.parentElement.innerHTML='<p style=\\'color: var(--text-secondary); font-size: 0.9rem;\\'>画像の読み込みに失敗しました</p>'">
                <button type="button" onclick="removeEventImage()" 
                        style="position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    } else {
        previewContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">写真が選択されていません</p>';
    }
}

async function uploadEventImage(input) {
    const file = input.files[0];
    if (!file) return;
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const statusText = document.getElementById('uploadStatus');
    
    try {
        progressDiv.style.display = 'block';
        statusText.textContent = 'アップロード中...';
        progressBar.style.width = '30%';
        
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`${API_BASE}/api/admin/upload-event-image`, {
            method: 'POST',
            body: formData
        });
        
        progressBar.style.width = '70%';
        
        const data = await response.json();
        
        if (data.success) {
            progressBar.style.width = '100%';
            statusText.textContent = 'アップロード完了！';
            
            // URLを隠しフィールドに設定
            document.getElementById('eventImageUrl').value = data.imageUrl;
            
            // プレビューを更新
            updateEventImagePreview(data.imageUrl);
            
            setTimeout(() => {
                progressDiv.style.display = 'none';
                progressBar.style.width = '0%';
            }, 2000);
        } else {
            throw new Error(data.message || 'アップロードに失敗しました');
        }
    } catch (error) {
        console.error('画像アップロードエラー:', error);
        statusText.textContent = 'エラー: ' + error.message;
        progressBar.style.width = '0%';
        alert('画像のアップロードに失敗しました: ' + error.message);
    }
}

function removeEventImage() {
    if (!confirm('この写真を削除してもよろしいですか？')) return;
    
    document.getElementById('eventImageUrl').value = '';
    document.getElementById('eventImageFile').value = '';
    updateEventImagePreview('');
}

async function saveMemberProfile(event, memberId) {
    event.preventDefault();
    
    const form = event.target;
    
    const memberData = {
        name: form.name.value,
        furigana: form.furigana.value,
        email: form.email.value,
        phone: form.phone.value,
        business: form.business.value,
        businessCategory: form.businessCategory.value,
        introduction: form.introduction.value,
        location: form.location.value,
        avatar: form.avatar.value,
        website: form.website.value,
        sns: {
            twitter: form.twitter.value,
            instagram: form.instagram.value
        },
        skills: form.skills.value.split(',').map(s => s.trim()).filter(s => s),
        isPublic: form.isPublic.checked,
        sessionId: sessionId
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/members/${memberId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(memberData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('メンバー情報を更新しました', 'success');
            loadAdminMembers();
        } else {
            showNotification(data.message || '更新に失敗しました', 'error');
        }
    } catch (error) {
        console.error('メンバー更新エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
    }
}

async function toggleMemberPublic(memberId, isPublic) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/members/${memberId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ isPublic, sessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`プロフィールを${isPublic ? '公開' : '非公開'}にしました`, 'success');
        } else {
            showNotification(data.message || '更新に失敗しました', 'error');
            loadAdminMembers();
        }
    } catch (error) {
        console.error('公開状態更新エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
        loadAdminMembers();
    }
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
            loadAdminMembers();
        }
    } catch (error) {
        console.error('管理者権限更新エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
        loadAdminMembers();
    }
}

async function deleteMember(memberId) {
    if (!confirm('このメンバーを削除しますか？\nこの操作は取り消せません。')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/members/${memberId}`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('メンバーを削除しました', 'success');
            loadAdminMembers();
        } else {
            showNotification(data.message || '削除に失敗しました', 'error');
        }
    } catch (error) {
        console.error('メンバー削除エラー:', error);
        showNotification('サーバーエラーが発生しました', 'error');
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
                    <label for="eventFee">参加費</label>
                    <input type="text" id="eventFee" name="fee" class="glass-input"
                           value="${event?.fee || ''}" placeholder="例：3,000円＋持ち寄り一品 / 4,000円">
                </div>
            </div>
            
            <div class="form-group">
                <label for="eventFeeDetails">参加費詳細</label>
                <textarea id="eventFeeDetails" name="feeDetails" class="glass-input" rows="2"
                          placeholder="持ち寄り一品の例や詳細説明...">${event?.feeDetails || ''}</textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="eventCashback">キャッシュバック特典</label>
                    <input type="text" id="eventCashback" name="cashback" class="glass-input"
                           value="${event?.cashback || ''}" placeholder="例：新規お連れ様1人につき500円">
                </div>
                <div class="form-group">
                    <label for="eventFreeEntry">無料参加条件</label>
                    <input type="text" id="eventFreeEntry" name="freeEntry" class="glass-input"
                           value="${event?.freeEntry || ''}" placeholder="例：体験会のみ参加は無料">
                </div>
            </div>
            
            <div class="form-group">
                <label for="eventFormUrl">応募フォームURL</label>
                <input type="url" id="eventFormUrl" name="formUrl" class="glass-input"
                       value="${event?.formUrl || ''}" placeholder="https://forms.google.com/...">
            </div>
            
            <div class="form-group">
                <label for="eventNotes">備考</label>
                <input type="text" id="eventNotes" name="notes" class="glass-input"
                       value="${event?.notes || ''}" placeholder="搬入・撤収時間など">
            </div>
            
            <div class="form-group">
                <label for="eventTimetable">タイムテーブル（1行1項目：時間 活動内容）</label>
                <textarea id="eventTimetable" name="timetable" class="glass-input" rows="6"
                          placeholder="12:00 開会・フリートーク
12:30 1分自己紹介（希望者のみ）
13:00 名刺交換・事業体験
14:00 お悩み相談・シェア会
15:00 閉会">${event?.timetable ? event.timetable.map(t => `${t.time} ${t.activity}`).join('\n') : ''}</textarea>
            </div>
            
            <div class="form-group">
                <label for="eventImageFile">イベント写真</label>
                <input type="hidden" id="eventImageUrl" name="image" value="${event?.image || ''}">
                <div style="margin-bottom: 10px;">
                    <input type="file" id="eventImageFile" accept="image/*" 
                           class="glass-input" style="padding: 10px;"
                           onchange="uploadEventImage(this)">
                    <small style="display: block; margin-top: 5px; color: var(--text-secondary);">
                        <i class="fas fa-info-circle"></i> JPEG, PNG, GIF, WebP形式（最大5MB）
                    </small>
                </div>
                <div id="eventImagePreview" style="margin-top: 15px;">
                    ${event?.image ? `
                        <div style="position: relative; display: inline-block;">
                            <img src="${event.image}" alt="イベント写真プレビュー" 
                                 style="max-width: 100%; max-height: 200px; border-radius: 12px; border: 2px solid var(--border); object-fit: cover;"
                                 onerror="this.style.display='none'">
                            <button type="button" onclick="removeEventImage()" 
                                    style="position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : '<p style="color: var(--text-secondary); font-size: 0.9rem;">写真が選択されていません</p>'}
                </div>
                <div id="uploadProgress" style="display: none; margin-top: 10px;">
                    <div style="background: #e0e0e0; border-radius: 10px; overflow: hidden;">
                        <div id="uploadProgressBar" style="width: 0%; height: 20px; background: var(--primary); transition: width 0.3s;"></div>
                    </div>
                    <p id="uploadStatus" style="margin-top: 5px; font-size: 0.9rem; color: var(--text-secondary);"></p>
                </div>
            </div>
            
            <div class="form-group">
                <label for="eventStatus">ステータス</label>
                <select id="eventStatus" name="status" class="glass-input">
                    <option value="upcoming" ${event?.status === 'upcoming' ? 'selected' : ''}>予定</option>
                    <option value="completed" ${event?.status === 'completed' ? 'selected' : ''}>終了</option>
                    <option value="cancelled" ${event?.status === 'cancelled' ? 'selected' : ''}>中止</option>
                </select>
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
    
    // タイムテーブルをパース
    const timetableText = form.timetable.value.trim();
    const timetable = timetableText ? timetableText.split('\n').map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            return {
                time: parts[0],
                activity: parts.slice(1).join(' ')
            };
        }
        return null;
    }).filter(t => t !== null) : [];
    
    const eventData = {
        title: form.title.value,
        date: form.date.value,
        time: form.time.value,
        location: form.location.value,
        description: form.description.value,
        capacity: parseInt(form.capacity.value) || 30,
        fee: form.fee.value,
        feeDetails: form.feeDetails.value,
        cashback: form.cashback.value,
        freeEntry: form.freeEntry.value,
        formUrl: form.formUrl.value,
        notes: form.notes.value,
        timetable: timetable,
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

// ============================================
// 運営チーム表示
// ============================================
async function loadTeamMembers() {
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        if (data.members) {
            const adminMembers = data.members.filter(m => m.isAdmin && m.isPublic);
            // 役職順にソート（代表 > サポート > その他）
            const roleOrder = { '代表': 1, 'サポート': 2 };
            adminMembers.sort((a, b) => {
                const orderA = roleOrder[a.role] || 999;
                const orderB = roleOrder[b.role] || 999;
                return orderA - orderB;
            });
            
            const teamGrid = document.getElementById('teamGrid');
            if (teamGrid && adminMembers.length > 0) {
                // コンパクト版カード（トップ配置用）
                teamGrid.innerHTML = adminMembers.map(member => `
                    <div class="team-compact-card" data-aos="fade-up">
                        <div class="team-compact-avatar">
                            <img src="${member.avatar || 'https://i.pravatar.cc/200'}" alt="${member.name}">
                        </div>
                        <div class="team-compact-role">${member.role || '運営メンバー'}</div>
                        <h3 class="team-compact-name">${member.name}</h3>
                        <p class="team-compact-business">${member.business}</p>
                        <p class="team-compact-intro">${member.introduction || ''}</p>
                    </div>
                `).join('');
                console.log('✅ 運営チーム（コンパクト版）表示完了:', adminMembers.length, '名');
            }
        }
    } catch (error) {
        console.error('❌ 運営チームの読み込みエラー:', error);
    }
}

// ============================================
// Event Card Slider
// ============================================
// allEvents is declared globally at line 14
let currentEventIndex = 0;

async function loadAllEvents() {
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        
        if (data.events) {
            allEvents = data.events || [];
            console.log('✅ イベント読み込み完了:', allEvents.length, '件');
            
            // カルーセル表示を初期化（最新UI）
            if (allEvents.length > 0 && document.getElementById('eventCarouselTrack')) {
                // 次回イベントを見つける（今日以降の最初のイベント）
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const upcomingIndex = allEvents.findIndex(e => {
                    const eventDate = new Date(e.date);
                    eventDate.setHours(0, 0, 0, 0);
                    return eventDate >= today;
                });
                currentCarouselIndex = upcomingIndex >= 0 ? upcomingIndex : 0;
                renderCarousel();
            }
            // 旧UI対応
            else if (allEvents.length > 0 && document.getElementById('eventMainDisplay')) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const upcomingIndex = allEvents.findIndex(e => {
                    const eventDate = new Date(e.date);
                    eventDate.setHours(0, 0, 0, 0);
                    return eventDate >= today;
                });
                currentTimelineIndex = upcomingIndex >= 0 ? upcomingIndex : 0;
                renderTimelineDisplay();
            }
            else if (allEvents.length > 0 && document.getElementById('eventContentWrapper')) {
                switchEventTab(0);
            }
        }
    } catch (error) {
        console.error('イベント読み込みエラー:', error);
    }
}

function renderEventCard(index) {
    if (index < 0 || index >= allEvents.length) return;
    
    const event = allEvents[index];
    const eventDate = new Date(event.date);
    const isCompleted = event.status === 'completed';
    const isUpcoming = event.status === 'upcoming';
    
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const year = eventDate.getFullYear();
    const month = monthNames[eventDate.getMonth()];
    const day = eventDate.getDate();
    const weekday = weekdayNames[eventDate.getDay()];
    
//     document.getElementById('eventImage').src = event.image || 'https://via.placeholder.com/1200x600?text=Event';
//     document.getElementById('eventImage').alt = event.title;
    
    const statusBadge = document.getElementById('eventStatusBadge');
    if (isCompleted) {
        statusBadge.textContent = '開催済み';
        statusBadge.className = 'event-status-badge completed';
    } else if (isUpcoming) {
        statusBadge.textContent = '次回開催';
        statusBadge.className = 'event-status-badge upcoming';
    }
    
    document.getElementById('eventYear').textContent = year;
    document.getElementById('eventMonth').textContent = month;
    document.getElementById('eventDay').textContent = `${day}日`;
    document.getElementById('eventWeekday').textContent = `(${weekday})`;
    document.getElementById('eventTitle').textContent = event.title;
    document.getElementById('eventTime').textContent = event.time || '時間未定';
    document.getElementById('eventLocation').textContent = event.location || '場所未定';
    document.getElementById('eventDescription').textContent = event.description || '';
    
    const statsHtml = [];
    if (isCompleted && event.participantCount) {
        statsHtml.push(`
            <div class="event-stat-item">
                <i class="fas fa-users"></i>
                <div>
                    <div class="event-stat-value">${event.participantCount}</div>
                    <div class="event-stat-label">参加者</div>
                </div>
            </div>
        `);
    }
    if (event.capacity) {
        statsHtml.push(`
            <div class="event-stat-item">
                <i class="fas fa-chair"></i>
                <div>
                    <div class="event-stat-value">${event.capacity}</div>
                    <div class="event-stat-label">定員</div>
                </div>
            </div>
        `);
    }
    document.getElementById('eventStats').innerHTML = statsHtml.join('');
    document.getElementById('eventStats').style.display = statsHtml.length > 0 ? 'flex' : 'none';
    
    const reportSection = document.getElementById('eventReport');
    if (isCompleted && event.report) {
        document.getElementById('eventReportText').textContent = event.report;
        reportSection.style.display = 'block';
    } else {
        reportSection.style.display = 'none';
    }
    
    const infoHtml = [];
    if (event.fee) {
        infoHtml.push(`
            <div class="event-info-item">
                <i class="fas fa-yen-sign"></i>
                <div>
                    <strong>参加費</strong><br>
                    ${event.fee}
                    ${event.feeDetails ? `<br><small>${event.feeDetails}</small>` : ''}
                </div>
            </div>
        `);
    }
    if (event.cashback) {
        infoHtml.push(`
            <div class="event-info-item">
                <i class="fas fa-gift"></i>
                <div>
                    <strong>キャッシュバック</strong><br>
                    ${event.cashback}
                </div>
            </div>
        `);
    }
    if (event.freeEntry) {
        infoHtml.push(`
            <div class="event-info-item">
                <i class="fas fa-ticket-alt"></i>
                <div>
                    <strong>無料参加</strong><br>
                    ${event.freeEntry}
                </div>
            </div>
        `);
    }
    if (event.timetable && event.timetable.length > 0) {
        const timetableItems = event.timetable.map(item => `
            <div class="timetable-item">
                <strong>${item.time}</strong> ${item.activity}
            </div>
        `).join('');
        infoHtml.push(`
            <div class="event-info-item timetable-section">
                <i class="fas fa-clock"></i>
                <div>
                    <strong>タイムテーブル</strong>
                    <div class="timetable-list">
                        ${timetableItems}
                    </div>
                </div>
            </div>
        `);
    }
    if (event.notes) {
        infoHtml.push(`
            <div class="event-info-item">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>備考</strong><br>
                    ${event.notes}
                </div>
            </div>
        `);
    }
    document.getElementById('eventInfoGrid').innerHTML = infoHtml.join('');
    
    const footerHtml = [];
    if (isUpcoming && event.formUrl) {
        footerHtml.push(`
            <a href="${event.formUrl}" target="_blank" class="btn btn-primary btn-large">
                <i class="fas fa-calendar-plus"></i> 参加申し込み
            </a>
        `);
    }
    document.getElementById('eventCardFooter').innerHTML = footerHtml.join('');
}

function navigateEvent(direction) {
    if (direction === 'prev') {
        currentEventIndex = (currentEventIndex - 1 + allEvents.length) % allEvents.length;
    } else {
        currentEventIndex = (currentEventIndex + 1) % allEvents.length;
    }
    renderEventCard(currentEventIndex);
    updateTimelineIndicator();
}

function jumpToEvent(type) {
    const upcomingIndex = allEvents.findIndex(e => e.status === 'upcoming');
    const pastEvents = allEvents.filter(e => e.status === 'completed');
    
    if (type === 'current' && upcomingIndex !== -1) {
        currentEventIndex = upcomingIndex;
    } else if (type === 'past' && pastEvents.length > 0) {
        currentEventIndex = 0;
    } else if (type === 'future') {
        const futureIndex = allEvents.findIndex((e, i) => i > upcomingIndex && e.status === 'upcoming');
        currentEventIndex = futureIndex !== -1 ? futureIndex : allEvents.length - 1;
    }
    
    renderEventCard(currentEventIndex);
    updateTimelineIndicator();
}

function updateTimelineIndicator() {
    const dots = document.querySelectorAll('.timeline-dot');
    dots.forEach(dot => dot.classList.remove('active'));
    
    const currentEvent = allEvents[currentEventIndex];
    if (currentEvent) {
        if (currentEvent.status === 'completed') {
            dots[0]?.classList.add('active');
        } else {
            dots[1]?.classList.add('active');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // URLパラメータチェック（イベント直リンクかどうか）
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');
    const hasHash = window.location.hash;
    
    const eventWrapper = document.getElementById('eventContentWrapper');
    const eventMainDisplay = document.getElementById('eventMainDisplay');
    const eventCarouselTrack = document.getElementById('eventCarouselTrack');
    
    // 運営チームを読み込み
    const teamGrid = document.getElementById('teamGrid');
    if (teamGrid) {
        console.log('👥 運営チームセクション検出 - チーム情報読み込み開始');
        loadTeamMembers();
    }
    
    if (eventWrapper || eventMainDisplay || eventCarouselTrack) {
        console.log('📅 イベントセクション検出 - イベント読み込み開始');
        loadAllEvents();
        
        // URLパラメータでイベントID指定時は該当イベントへジャンプ
        if (eventId && allEvents) {
            setTimeout(() => {
                const eventIndex = allEvents.findIndex(e => e.id === eventId);
                if (eventIndex !== -1) {
                    jumpToEvent(eventIndex);
                    // イベントセクションへスクロール
                    const eventSection = document.querySelector('.event-section');
                    if (eventSection) {
                        eventSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }, 500);
        }
    }
});

// 新しいイベントタブ表示機能
let currentEventTab = 0;

function switchEventTab(index) {
    currentEventTab = index;
    
    // タブのアクティブ状態を更新
    document.querySelectorAll('.event-tab').forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // イベントコンテンツを表示
    renderEventContent(index);
}

// カルーセル表示用グローバル変数
let currentCarouselIndex = 0;
let carouselTouchStartX = 0;
let carouselTouchEndX = 0;

// カルーセルナビゲーション
function navigateCarousel(direction) {
    if (!allEvents || allEvents.length === 0) return;
    
    currentCarouselIndex += direction;
    currentCarouselIndex = Math.max(0, Math.min(allEvents.length - 1, currentCarouselIndex));
    
    renderCarousel();
}

// タブクリックでカルーセル移動（画面ジャンプなし）
function jumpToEvent(index) {
    if (!allEvents || allEvents.length === 0) return;
    currentCarouselIndex = index;
    renderCarousel();
    // スクロールは行わない（画面位置を維持）
}

// カルーセル表示を描画
function renderCarousel() {
    console.log('🎠 renderCarousel 呼び出し - イベント数:', allEvents?.length);
    
    if (!allEvents || allEvents.length === 0) {
        console.error('❌ allEventsが空です');
        return;
    }
    
    // スマートナビゲーション要素を使用
    const tabsSmart = document.getElementById('eventTabsSmart');
    const carouselTrack = document.getElementById('eventCarouselTrack');
    const dotsBottom = document.getElementById('carouselDotsBottom');
    const prevBtn = document.getElementById('smartPrevBtn');
    const nextBtn = document.getElementById('smartNextBtn');
    
    console.log('🔍 要素チェック:', {
        tabsSmart: !!tabsSmart,
        carouselTrack: !!carouselTrack,
        dotsBottom: !!dotsBottom,
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn
    });
    
    if (!tabsSmart || !carouselTrack) {
        console.error('❌ カルーセル要素が見つかりません');
        return;
    }
    
    // ボタン状態更新
    if (prevBtn) prevBtn.disabled = currentCarouselIndex === 0;
    if (nextBtn) nextBtn.disabled = currentCarouselIndex === allEvents.length - 1;
    
    // ヒーローバッジ更新（次回イベント）
    updateHeroEventBadge();
    
    // 次回イベントのインデックスを取得（今日以降の最も近いイベント）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextEventIndex = allEvents.findIndex(e => {
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
    });
    
    // スマートタブ表示（日付バッジデザイン）
    tabsSmart.innerHTML = allEvents.map((e, index) => {
        const eventDate = new Date(e.date);
        const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
        const day = eventDate.getDate().toString().padStart(2, '0');
        const year = eventDate.getFullYear();
        const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdayNames[eventDate.getDay()];
        const isActive = index === currentCarouselIndex;
        const isCompleted = e.status === 'completed';
        const isNextEvent = index === nextEventIndex;
        
        return `
            <button class="event-tab-badge ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isNextEvent ? 'next-event' : ''}" 
                    onclick="jumpToEvent(${index})" title="${e.title}">
                ${isNextEvent ? '<span class="next-badge-mini">次回</span>' : ''}
                <span class="badge-date-main">${month}/${day}</span>
                <span class="badge-date-sub">${year}(${weekday})</span>
            </button>
        `;
    }).join('');
    
    // アクティブなタブを中央にスクロール
    setTimeout(() => {
        const activeTab = tabsSmart.querySelector('.event-tab-badge.active');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, 100);
    
    // カルーセルスライド
    console.log('📋 カルーセルスライド生成開始');
    carouselTrack.innerHTML = allEvents.map((e, index) => {
        return `<div class="event-carousel-slide">${renderCarouselCard(e)}</div>`;
    }).join('');
    
    // カルーセル位置更新
    carouselTrack.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
    console.log('📍 カルーセル位置:', currentCarouselIndex, 'transform:', carouselTrack.style.transform);
    
    // ドット表示（下部）
    if (dotsBottom) {
        dotsBottom.innerHTML = allEvents.map((_, index) => 
            `<button class="carousel-dot ${index === currentCarouselIndex ? 'active' : ''}" 
                     onclick="jumpToEvent(${index})" 
                     aria-label="イベント ${index + 1}"></button>`
        ).join('');
        console.log('🔘 ドット生成完了:', allEvents.length, '個');
    }
    
    // タッチスワイプ対応（カードタップは無効化）
    setupCarouselSwipe();
    console.log('✅ renderCarousel 完了');
    
    // ページャーを更新
    updateEventPager();
}

// ヒーローセクションの次回イベントバッジを更新
function updateHeroEventBadge() {
    const nextEventTitleGold = document.getElementById('nextEventTitleGold');
    const nextEventDateText = document.getElementById('nextEventDateText');
    
    if (!allEvents || allEvents.length === 0) return;
    
    // 今日の日付（時刻を0時に設定）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 今日以降のイベントで最も近いものを取得
    const upcomingEvents = allEvents.filter(e => {
        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const nextEvent = upcomingEvents[0];
    
    if (nextEvent) {
        const eventDate = new Date(nextEvent.date);
        const year = eventDate.getFullYear();
        const month = eventDate.getMonth() + 1;
        const day = eventDate.getDate();
        const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdayNames[eventDate.getDay()];
        
        // ボタン上の金色イベント名更新
        if (nextEventTitleGold) {
            nextEventTitleGold.textContent = nextEvent.title || `第${nextEvent.id.replace('event-', '')}回 みんなのWA 交流会`;
        }
        
        // 日時情報更新
        if (nextEventDateText) {
            nextEventDateText.textContent = `${year}年${month}月${day}日（${weekday}） ${nextEvent.time || ''}`;
        }
    } else {
        if (nextEventTitleGold) {
            nextEventTitleGold.textContent = '次回イベント準備中';
        }
        if (nextEventDateText) {
            nextEventDateText.textContent = '日程調整中';
        }
    }
}

// カルーセルカード生成（最新デザイン）
function renderCarouselCard(event) {
    const eventDate = new Date(event.date);
    const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
    const day = eventDate.getDate().toString().padStart(2, '0');
    const weekday = weekdayNames[eventDate.getDay()];
    const year = eventDate.getFullYear();
    
    const isCompleted = event.status === 'completed';
    const statusText = isCompleted ? '開催済み' : '開催予定';
    const statusClass = isCompleted ? 'completed' : 'upcoming';
    
    // 写真がある場合のみ表示（デフォルト画像は使用しない）
    const hasImage = event.image && event.image.trim() !== '' && !event.image.includes('genspark.ai/api/files/s/ERlCiKcs');
    
    return `
        <div class="event-compact-card">
            ${hasImage ? `
                <div class="event-image-wrapper">
                    <img src="${event.image}" alt="${event.title}" class="event-image" 
                         onerror="this.style.display='none'; this.parentElement.style.display='none';">
                    <div class="event-image-overlay"></div>
                </div>
            ` : ''}
            
            <div class="event-compact-header">
                <h3 class="event-compact-title-only">${event.title}</h3>
            </div>
            
            <div class="event-compact-meta">
                <span><i class="fas fa-clock"></i> ${event.time || '時間未定'}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${event.location || '場所未定'}</span>
                ${event.capacity ? `<span><i class="fas fa-users"></i> 定員${event.capacity}名</span>` : ''}
            </div>
            
            <div class="event-details">
                ${event.description ? `<p class="event-description">${event.description}</p>` : ''}
                
                ${event.fee || event.feeDetails || event.cashback || event.freeEntry ? `
                    <div class="event-info-grid">
                        ${event.fee ? `<div class="info-item"><strong>参加費</strong><span>${event.fee}</span></div>` : ''}
                        ${event.feeDetails ? `<div class="info-item"><strong>詳細</strong><span>${event.feeDetails}</span></div>` : ''}
                        ${event.cashback ? `<div class="info-item"><strong>特典</strong><span>${event.cashback}</span></div>` : ''}
                        ${event.freeEntry ? `<div class="info-item"><strong>無料</strong><span>${event.freeEntry}</span></div>` : ''}
                    </div>
                ` : ''}
                
                ${event.timetable && event.timetable.length > 0 ? `
                    <div class="event-timetable">
                        ${event.timetable.map(item => `<div class="tt-item"><span>${item.time}</span><span>${item.activity}</span></div>`).join('')}
                    </div>
                ` : ''}
                
                ${event.notes ? `<p class="event-notes"><i class="fas fa-exclamation-circle"></i> ${event.notes}</p>` : ''}
            </div>
            
            ${event.formUrl && !isCompleted ? `
                <div class="event-action-footer">
                    <a href="${event.formUrl}" target="_blank" class="event-action-btn">
                        <i class="fas fa-edit"></i> 申し込みフォーム
                    </a>
                </div>
            ` : ''}
        </div>
    `;
}

// イベントカードを生成（写真含む）
function renderEventCard(event, includeImage = true) {
    const eventDate = new Date(event.date);
    const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
    const day = eventDate.getDate().toString().padStart(2, '0');
    const weekday = weekdayNames[eventDate.getDay()];
    const year = eventDate.getFullYear();
    
    const isCompleted = event.status === 'completed';
    const statusText = isCompleted ? '開催済み' : '開催予定';
    const statusClass = isCompleted ? 'completed' : 'upcoming';
    
    const defaultImage = 'https://www.genspark.ai/api/files/s/ERlCiKcs';
    const eventImage = event.image || defaultImage;
    
    return `
        <div class="event-compact-card">
            ${includeImage ? `
                <div class="event-image-wrapper">
                    <img src="${eventImage}" alt="${event.title}" class="event-image" 
                         onerror="this.src='${defaultImage}'">
                    <div class="event-image-overlay"></div>
                </div>
            ` : ''}
            
            <div class="event-compact-header">
                <div class="event-date-badge">
                    <div class="month-day">${month}/${day}</div>
                    <div class="year-weekday">${year}年 (${weekday})</div>
                </div>
                <div class="event-compact-info">
                    <h3 class="event-compact-title">
                        ${event.title}
                        <span class="event-status-inline ${statusClass}">${statusText}</span>
                    </h3>
                    <div class="event-compact-meta">
                        <span><i class="fas fa-clock"></i> ${event.time || '時間未定'}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${event.location || '場所未定'}</span>
                        ${event.capacity ? `<span><i class="fas fa-users"></i> 定員${event.capacity}名</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="event-details">
                ${event.description ? `
                    <div class="event-detail-section">
                        <h4><i class="fas fa-info-circle"></i> 内容</h4>
                        <div class="event-detail-content">${event.description}</div>
                    </div>
                ` : ''}
                
                <div class="event-detail-section">
                    <h4><i class="fas fa-ticket-alt"></i> 参加費・詳細</h4>
                    <ul class="event-detail-list">
                        ${event.fee ? `<li><strong>参加費:</strong> ${event.fee}</li>` : ''}
                        ${event.feeDetails ? `<li><strong>詳細:</strong> ${event.feeDetails}</li>` : ''}
                        ${event.cashback ? `<li><strong>特典:</strong> ${event.cashback}</li>` : ''}
                        ${event.freeEntry ? `<li><strong>無料参加:</strong> ${event.freeEntry}</li>` : ''}
                        ${event.notes ? `<li><strong>備考:</strong> ${event.notes}</li>` : ''}
                    </ul>
                </div>
                
                ${event.timetable && event.timetable.length > 0 ? `
                    <div class="event-detail-section">
                        <h4><i class="fas fa-calendar-check"></i> タイムテーブル</h4>
                        <div class="timetable-compact">
                            ${event.timetable.map(item => `
                                <div class="timetable-compact-item">
                                    <span class="time">${item.time}</span>
                                    <span class="activity">${item.activity}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${event.formUrl ? `
                    <a href="${event.formUrl}" target="_blank" class="event-action-btn">
                        <i class="fas fa-edit"></i> 申し込みフォーム
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

// イベントカルーセルのページャー更新（スライド式カルーセル用）
function updateEventPager() {
    const pager = document.getElementById('eventPager');
    if (!pager || !allEvents || allEvents.length === 0) return;
    
    const thumb = pager.querySelector('.pager-thumb');
    if (!thumb) return;
    
    const totalSlides = allEvents.length;
    const currentSlide = currentCarouselIndex;
    
    // ページャーの幅を計算（1スライド分の割合）
    const thumbWidth = (1 / totalSlides) * 100;
    // ページャーの位置を計算
    const thumbLeft = (currentSlide / totalSlides) * 100;
    
    thumb.style.width = `${thumbWidth}%`;
    thumb.style.left = `${thumbLeft}%`;
}

// カルーセルスワイプ設定
function setupCarouselSwipe() {
    const track = document.getElementById('eventCarouselTrack');
    if (!track) return;
    
    let startX = 0;
    let startY = 0;
    let isSwiping = false;
    let hasMoved = false;
    
    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        carouselTouchStartX = startX;
        isSwiping = false;
        hasMoved = false;
    }, { passive: true });
    
    track.addEventListener('touchmove', (e) => {
        if (!isSwiping) {
            const diffX = Math.abs(e.touches[0].clientX - startX);
            const diffY = Math.abs(e.touches[0].clientY - startY);
            
            // 横方向の移動が縦方向より大きい場合のみスワイプと判定
            if (diffX > 10 && diffX > diffY) {
                isSwiping = true;
                hasMoved = true;
            }
        }
        
        if (isSwiping) {
            carouselTouchEndX = e.touches[0].clientX;
        }
    }, { passive: true });
    
    track.addEventListener('touchend', () => {
        if (isSwiping && hasMoved) {
            handleCarouselSwipe();
        }
        isSwiping = false;
        hasMoved = false;
    });
    
    // カードのクリック時の移動を無効化（タップではカードの内容を操作可能に）
    const cards = track.querySelectorAll('.event-compact-card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            // リンクボタン以外のクリックは何もしない
            if (!e.target.closest('.event-action-btn')) {
                e.stopPropagation();
            }
        });
    });
}

function handleCarouselSwipe() {
    const swipeThreshold = 50;
    const diff = carouselTouchStartX - carouselTouchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // 左スワイプ（次へ）
            navigateCarousel(1);
        } else {
            // 右スワイプ（前へ）
            navigateCarousel(-1);
        }
    }
    
    carouselTouchStartX = 0;
    carouselTouchEndX = 0;
}

// イベントはloadAllEvents()内で初期化される

// ============================================
// 会員の声管理
// ============================================

async function loadAdminTestimonials() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>会員の声を読み込み中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/testimonials`);
        const testimonials = await response.json();
        
        renderAdminTestimonials(testimonials);
    } catch (error) {
        console.error('会員の声取得エラー:', error);
        adminContent.innerHTML = `<p>エラーが発生しました</p>`;
    }
}

function renderAdminTestimonials(testimonials) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    const testimonialsHtml = testimonials.map(t => `
        <div class="admin-item">
            <div class="admin-item-header">
                <div class="admin-item-info">
                    <img src="${t.memberAvatar}" alt="${t.memberName}" class="admin-item-avatar">
                    <div>
                        <h4>${t.memberName}</h4>
                        <p class="admin-item-meta">${t.business} • 評価: ${'★'.repeat(t.rating)}</p>
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn btn-sm btn-outline" onclick="editTestimonial('${t.id}')">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTestimonial('${t.id}')">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
            <div class="admin-item-content">
                <p>${t.content.substring(0, 150)}${t.content.length > 150 ? '...' : ''}</p>
            </div>
        </div>
    `).join('');
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <div class="admin-section-header">
                <h3><i class="fas fa-comments"></i> 会員の声管理</h3>
                <button class="btn btn-primary" onclick="createTestimonial()">
                    <i class="fas fa-plus"></i> 新規作成
                </button>
            </div>
            <div class="admin-items-grid">
                ${testimonialsHtml || '<p class="admin-empty">会員の声がまだありません</p>'}
            </div>
        </div>
    `;
}

function createTestimonial() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <div class="admin-section-header">
                <h3><i class="fas fa-plus"></i> 会員の声を作成</h3>
                <button class="btn btn-outline" onclick="loadAdminTestimonials()">
                    <i class="fas fa-arrow-left"></i> 戻る
                </button>
            </div>
            <form class="admin-form" onsubmit="handleCreateTestimonial(event)">
                <div class="form-group">
                    <label>メンバー名</label>
                    <input type="text" name="memberName" class="glass-input" required>
                </div>
                <div class="form-group">
                    <label>事業内容</label>
                    <input type="text" name="business" class="glass-input" required>
                </div>
                <div class="form-group">
                    <label>アバター画像URL</label>
                    <input type="url" name="memberAvatar" class="glass-input" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label>内容</label>
                    <textarea name="content" class="glass-input" rows="6" required></textarea>
                </div>
                <div class="form-group">
                    <label>評価（1-5）</label>
                    <input type="number" name="rating" class="glass-input" min="1" max="5" value="5" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="isPublic" checked> 公開する
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="loadAdminTestimonials()">キャンセル</button>
                    <button type="submit" class="btn btn-primary">作成</button>
                </div>
            </form>
        </div>
    `;
}

async function handleCreateTestimonial(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        memberName: formData.get('memberName'),
        business: formData.get('business'),
        memberAvatar: formData.get('memberAvatar') || 'https://i.pravatar.cc/200?img=1',
        content: formData.get('content'),
        rating: parseInt(formData.get('rating')),
        isPublic: formData.get('isPublic') === 'on'
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/testimonials`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId 
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('会員の声を作成しました');
            loadAdminTestimonials();
        } else {
            alert('作成に失敗しました');
        }
    } catch (error) {
        console.error('作成エラー:', error);
        alert('エラーが発生しました');
    }
}

async function deleteTestimonial(id) {
    if (!confirm('この会員の声を削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/testimonials/${id}`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('会員の声を削除しました');
            loadAdminTestimonials();
        } else {
            alert('削除に失敗しました');
        }
    } catch (error) {
        console.error('削除エラー:', error);
        alert('エラーが発生しました');
    }
}

// ============================================
// コラボ事例管理
// ============================================

async function loadAdminCollaborations() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>コラボ事例を読み込み中...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/collaborations`);
        const collaborations = await response.json();
        
        renderAdminCollaborations(collaborations);
    } catch (error) {
        console.error('コラボ事例取得エラー:', error);
        adminContent.innerHTML = `<p>エラーが発生しました</p>`;
    }
}

function renderAdminCollaborations(collaborations) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    const collabsHtml = collaborations.map(c => `
        <div class="admin-item">
            <div class="admin-item-header">
                <div class="admin-item-info">
                    <img src="${c.image}" alt="${c.title}" class="admin-item-image">
                    <div>
                        <h4>${c.title}</h4>
                        <p class="admin-item-meta">${c.category} • ${c.result}</p>
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn btn-sm btn-outline" onclick="editCollaboration('${c.id}')">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCollaboration('${c.id}')">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
            </div>
            <div class="admin-item-content">
                <p>${c.description}</p>
                <div class="collab-members">
                    ${c.members.map(m => `<span class="member-badge">${m.name}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <div class="admin-section-header">
                <h3><i class="fas fa-handshake"></i> コラボ事例管理</h3>
                <button class="btn btn-primary" onclick="createCollaboration()">
                    <i class="fas fa-plus"></i> 新規作成
                </button>
            </div>
            <div class="admin-items-grid">
                ${collabsHtml || '<p class="admin-empty">コラボ事例がまだありません</p>'}
            </div>
        </div>
    `;
}

function createCollaboration() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <div class="admin-section-header">
                <h3><i class="fas fa-plus"></i> コラボ事例を作成</h3>
                <button class="btn btn-outline" onclick="loadAdminCollaborations()">
                    <i class="fas fa-arrow-left"></i> 戻る
                </button>
            </div>
            <form class="admin-form" onsubmit="handleCreateCollaboration(event)">
                <div class="form-group">
                    <label>タイトル</label>
                    <input type="text" name="title" class="glass-input" required>
                </div>
                <div class="form-group">
                    <label>説明</label>
                    <textarea name="description" class="glass-input" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <label>画像URL</label>
                    <input type="url" name="image" class="glass-input" placeholder="https://..." required>
                </div>
                <div class="form-group">
                    <label>成果</label>
                    <input type="text" name="result" class="glass-input" placeholder="例: 売上30%UP" required>
                </div>
                <div class="form-group">
                    <label>カテゴリ</label>
                    <input type="text" name="category" class="glass-input" placeholder="例: 商品開発" required>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" name="isPublic" checked> 公開する
                    </label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="loadAdminCollaborations()">キャンセル</button>
                    <button type="submit" class="btn btn-primary">作成</button>
                </div>
            </form>
        </div>
    `;
}

async function handleCreateCollaboration(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        image: formData.get('image'),
        result: formData.get('result'),
        category: formData.get('category'),
        members: [],
        isPublic: formData.get('isPublic') === 'on'
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/collaborations`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId 
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('コラボ事例を作成しました');
            loadAdminCollaborations();
        } else {
            alert('作成に失敗しました');
        }
    } catch (error) {
        console.error('作成エラー:', error);
        alert('エラーが発生しました');
    }
}

async function deleteCollaboration(id) {
    if (!confirm('このコラボ事例を削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/collaborations/${id}`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('コラボ事例を削除しました');
            loadAdminCollaborations();
        } else {
            alert('削除に失敗しました');
        }
    } catch (error) {
        console.error('削除エラー:', error);
        alert('エラーが発生しました');
    }
}

// ============================================
// 画像管理
// ============================================

async function loadAdminImages() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = `
        <div class="admin-section">
            <div class="admin-section-header">
                <h3><i class="fas fa-images"></i> 画像管理</h3>
            </div>
            <div class="admin-images">
                <div class="admin-image-section">
                    <h4>ヒーロー画像（スライドショー）</h4>
                    <p class="admin-hint">トップページのヒーロースライドで使用される画像を管理します</p>
                    <div id="heroImagesContainer"></div>
                    <button class="btn btn-primary" onclick="addHeroImage()">
                        <i class="fas fa-plus"></i> ヒーロー画像を追加
                    </button>
                </div>
                <div class="admin-image-section">
                    <h4>About画像</h4>
                    <p class="admin-hint">「みんなのWAとは」セクションで使用される画像</p>
                    <div id="aboutImageContainer"></div>
                </div>
            </div>
        </div>
    `;
    
    loadAdminHeroImages();
    loadAdminAboutImage();
}

async function loadAdminHeroImages() {
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        const images = data.heroImages || [];
        
        const container = document.getElementById('heroImagesContainer');
        if (!container) return;
        
        container.innerHTML = images.map((img, index) => `
            <div class="admin-image-item">
                <img src="${img.url}" alt="${img.alt}">
                <input type="text" value="${img.url}" class="glass-input" placeholder="画像URL" data-index="${index}" data-field="url">
                <input type="text" value="${img.alt}" class="glass-input" placeholder="代替テキスト" data-index="${index}" data-field="alt">
                <button class="btn btn-sm btn-danger" onclick="removeHeroImage(${index})">
                    <i class="fas fa-trash"></i> 削除
                </button>
            </div>
        `).join('') + `
            <button class="btn btn-primary" onclick="saveHeroImages()">
                <i class="fas fa-save"></i> 保存
            </button>
        `;
    } catch (error) {
        console.error('ヒーロー画像取得エラー:', error);
    }
}

async function loadAdminAboutImage() {
    try {
        // data.jsonからデータを取得
        const response = await fetch('./data.json');
        const data = await response.json();
        const aboutImage = data.aboutImage;
        
        const container = document.getElementById('aboutImageContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="admin-image-item">
                <img src="${aboutImage.url}" alt="${aboutImage.alt}">
                <input type="text" id="aboutImageUrl" value="${aboutImage.url}" class="glass-input" placeholder="画像URL">
                <input type="text" id="aboutImageAlt" value="${aboutImage.alt}" class="glass-input" placeholder="代替テキスト">
                <button class="btn btn-primary" onclick="saveAboutImage()">
                    <i class="fas fa-save"></i> 保存
                </button>
            </div>
        `;
    } catch (error) {
        console.error('About画像取得エラー:', error);
    }
}

async function saveHeroImages() {
    const inputs = document.querySelectorAll('#heroImagesContainer input[data-index]');
    const images = [];
    const imageMap = new Map();
    
    inputs.forEach(input => {
        const index = input.dataset.index;
        const field = input.dataset.field;
        if (!imageMap.has(index)) {
            imageMap.set(index, { id: `hero-img-${parseInt(index) + 1}`, order: parseInt(index) + 1 });
        }
        imageMap.get(index)[field] = input.value;
    });
    
    imageMap.forEach(img => images.push(img));
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/hero-images`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId 
            },
            body: JSON.stringify({ images })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('ヒーロー画像を保存しました');
            loadHeroImages();
        } else {
            alert('保存に失敗しました');
        }
    } catch (error) {
        console.error('保存エラー:', error);
        alert('エラーが発生しました');
    }
}

async function saveAboutImage() {
    const url = document.getElementById('aboutImageUrl').value;
    const alt = document.getElementById('aboutImageAlt').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/about-image`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-session-id': sessionId 
            },
            body: JSON.stringify({ url, alt })
        });
        
        const result = await response.json();
        if (result.success) {
            showSuccess('About画像を保存しました');
        } else {
            alert('保存に失敗しました');
        }
    } catch (error) {
        console.error('保存エラー:', error);
        alert('エラーが発生しました');
    }
}

// ============================================
// お問い合わせフォーム
// ============================================
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
}

async function handleContactSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.contact-submit-btn');
    const formData = {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value || '',
        subject: form.subject.value,
        message: form.message.value,
        timestamp: new Date().toISOString()
    };
    
    // ボタンを無効化
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 送信中...';
    
    try {
        // 実際のAPIエンドポイントに送信する場合
        // const response = await fetch(`${API_BASE}/api/contact`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(formData)
        // });
        // const result = await response.json();
        
        // デモ用: 2秒待機してから成功表示
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('お問い合わせ送信:', formData);
        
        // 成功メッセージを表示
        document.getElementById('contactSuccess').style.display = 'flex';
        form.style.display = 'none';
        
    } catch (error) {
        console.error('送信エラー:', error);
        alert('送信に失敗しました。もう一度お試しください。');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 送信する';
    }
}

// ============================================
// Aboutセクション - タブ切り替え
// ============================================
function switchAboutTab(tabName) {
    // すべてのタブとパネルを非アクティブに
    document.querySelectorAll('.about-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 選択されたタブとパネルをアクティブに
    const selectedTab = document.querySelector(`.about-tab[data-tab="${tabName}"]`);
    const selectedPanel = document.getElementById(`${tabName}-panel`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedPanel) selectedPanel.classList.add('active');
}

// アコーディオン開閉関数
function toggleAccordion(header) {
    const item = header.parentElement;
    const isActive = item.classList.contains('active');
    
    // すべてのアコーディオンを閉じる（オプション：1つだけ開く場合）
    // document.querySelectorAll('.accordion-item').forEach(i => {
    //     i.classList.remove('active');
    // });
    
    // クリックされたアイテムをトグル
    if (isActive) {
        item.classList.remove('active');
    } else {
        item.classList.add('active');
    }
}

// ============================================
// Aboutセクション - データ駆動型アニメーション
// ============================================
function initAboutDataAnimation() {
    // カウントアップアニメーション関数
    function animateCounter(element, target, duration = 2000, suffix = '') {
        if (!element) return;
        
        let current = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current) + suffix;
        }, 16);
    }
    
    // Intersection Observerでスクロール時にアニメーション
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // メインメトリクスのアニメーション
                const memberCount = document.getElementById('aboutMemberCount');
                const eventCount = document.getElementById('aboutEventCount');
                const collabCount = document.getElementById('aboutCollabCount');
                
                // 実際のデータから取得（data.jsonから）
                fetch('./data.json')
                    .then(res => res.json())
                    .then(data => {
                        const members = data.members.filter(m => m.isPublic).length;
                        const events = data.events.length;
                        const collabs = data.collaborations?.length || 0;
                        const posts = data.blogs?.length || 0;
                        
                        // カウントアップアニメーション
                        animateCounter(memberCount, members, 2000, '+');
                        animateCounter(eventCount, events, 2000, '回');
                        animateCounter(collabCount, collabs > 0 ? collabs : 200, 2000, '+');
                        
                        // 統計カード
                        const categoryCount = document.getElementById('categoryCount');
                        const totalPostCount = document.getElementById('totalPostCount');
                        const collabSuccessRate = document.getElementById('collabSuccessRate');
                        
                        // ユニークなカテゴリ数を計算
                        const categories = new Set(data.members.map(m => m.businessCategory));
                        animateCounter(categoryCount, categories.size, 1500, '業種');
                        
                        // 投稿数
                        animateCounter(totalPostCount, posts > 0 ? posts : 6, 1500, '件');
                        
                        // コラボ成功率（実際のデータまたはダミー）
                        animateCounter(collabSuccessRate, 85, 1500, '');
                        
                        // 特徴カードの数値
                        const monthlyAttendance = document.getElementById('monthlyAttendance');
                        const activeCollabs = document.getElementById('activeCollabs');
                        const referralCount = document.getElementById('referralCount');
                        
                        animateCounter(monthlyAttendance, Math.floor(members * 0.6), 1500, '');
                        animateCounter(activeCollabs, Math.floor(collabs * 0.3) || 12, 1500, '');
                        animateCounter(referralCount, Math.floor(members * 3), 1500, '');
                        
                        // プログレスバーのアニメーション（stats tab用）
                        setTimeout(() => {
                            const monthlyAttendanceBar = document.getElementById('monthlyAttendanceBar');
                            const activeCollabsBar = document.getElementById('activeCollabsBar');
                            const referralCountBar = document.getElementById('referralCountBar');
                            const satisfactionBar = document.getElementById('satisfactionBar');
                            const satisfactionRate = document.getElementById('satisfactionRate');
                            
                            if (monthlyAttendanceBar) monthlyAttendanceBar.style.width = `${Math.min((members * 0.6) * 2, 100)}%`;
                            if (activeCollabsBar) activeCollabsBar.style.width = `${Math.min(collabs * 5, 100)}%`;
                            if (referralCountBar) referralCountBar.style.width = `${Math.min((members * 3) / 2, 100)}%`;
                            if (satisfactionBar) satisfactionBar.style.width = '96%';
                            if (satisfactionRate) animateCounter(satisfactionRate, 96, 1500, '');
                        }, 500);
                        
                        // プログレスバーのアニメーション
                        setTimeout(() => {
                            const categoryProgress = document.getElementById('categoryProgress');
                            const postProgress = document.getElementById('postProgress');
                            const collabProgress = document.getElementById('collabProgress');
                            
                            if (categoryProgress) categoryProgress.style.width = `${Math.min(categories.size * 10, 100)}%`;
                            if (postProgress) postProgress.style.width = `${Math.min(posts * 15, 100)}%`;
                            if (collabProgress) collabProgress.style.width = '85%';
                        }, 500);
                    })
                    .catch(err => {
                        console.error('データ読み込みエラー:', err);
                        // フォールバック値
                        animateCounter(memberCount, 50, 2000, '+');
                        animateCounter(eventCount, 36, 2000, '回');
                        animateCounter(collabCount, 200, 2000, '+');
                        animateCounter(categoryCount, 8, 1500, '業種');
                        animateCounter(totalPostCount, 6, 1500, '件');
                        animateCounter(collabSuccessRate, 85, 1500, '');
                        animateCounter(monthlyAttendance, 30, 1500, '');
                        animateCounter(activeCollabs, 12, 1500, '');
                        animateCounter(referralCount, 150, 1500, '');
                    });
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    
    const aboutSection = document.querySelector('.about-section');
    if (aboutSection) {
        observer.observe(aboutSection);
    }
}

function resetContactForm() {
    const form = document.getElementById('contactForm');
    const success = document.getElementById('contactSuccess');
    
    form.reset();
    form.style.display = 'block';
    success.style.display = 'none';
    
    const submitBtn = form.querySelector('.contact-submit-btn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 送信する';
}

// 初期化に追加
document.addEventListener('DOMContentLoaded', () => {
    initContactForm();
    initAboutDataAnimation();
});
