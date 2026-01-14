// 管理者パネル - 左サイドバー機能

// サイドバーの初期化
function initAdminSidebar() {
    const adminPanel = document.querySelector('.admin-panel');
    if (!adminPanel) return;

    // 既存の構造を保存
    const adminContent = document.getElementById('adminContent');
    
    // 新しいサイドバー構造を作成
    adminPanel.innerHTML = `
        <!-- モバイルメニュートグル -->
        <button class="admin-mobile-toggle" onclick="toggleAdminSidebar()">
            <i class="fas fa-bars"></i>
        </button>

        <!-- サイドバーオーバーレイ -->
        <div class="admin-sidebar-overlay" onclick="closeAdminSidebar()"></div>

        <!-- 左サイドバー -->
        <aside class="admin-sidebar" id="adminSidebar">
            <div class="admin-sidebar-header">
                <h2><i class="fas fa-cog"></i> 管理者パネル</h2>
            </div>
            
            <nav class="admin-sidebar-nav">
                <div class="admin-nav-item active" onclick="switchAdminTab('dashboard')">
                    <i class="fas fa-chart-line"></i>
                    <span>ダッシュボード</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('members')">
                    <i class="fas fa-users"></i>
                    <span>メンバー管理</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('blogs')">
                    <i class="fas fa-newspaper"></i>
                    <span>活動レポート管理</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('events')">
                    <i class="fas fa-calendar"></i>
                    <span>イベント管理</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('testimonials')">
                    <i class="fas fa-comments"></i>
                    <span>会員の声</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('collaborations')">
                    <i class="fas fa-handshake"></i>
                    <span>お知らせ・レポート</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('images')">
                    <i class="fas fa-images"></i>
                    <span>画像管理</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('pageContent')">
                    <i class="fas fa-file-alt"></i>
                    <span>ページ内容管理</span>
                </div>
                <div class="admin-nav-item" onclick="switchAdminTab('faqs')">
                    <i class="fas fa-question-circle"></i>
                    <span>FAQ管理</span>
                </div>
            </nav>
            
            <div class="admin-sidebar-footer">
                <button class="admin-logout-btn" onclick="handleAdminLogout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>ログアウト</span>
                </button>
            </div>
        </aside>

        <!-- メインコンテンツエリア -->
        <main class="admin-main-content">
            <div class="admin-topbar">
                <div class="admin-topbar-left">
                    <h3 id="adminTopbarTitle">ダッシュボード</h3>
                    <p id="adminTopbarSubtitle">システム全体の統計情報</p>
                </div>
                <div class="admin-topbar-right">
                    <button class="admin-close-btn" onclick="closeAdminModal()">
                        <i class="fas fa-times"></i>
                        <span>閉じる</span>
                    </button>
                </div>
            </div>
            <div class="admin-content-area" id="adminContent">
                ${adminContent ? adminContent.innerHTML : ''}
            </div>
        </main>
    `;
}

// サイドバーのトグル（モバイル用）
function toggleAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.querySelector('.admin-sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

// サイドバーを閉じる
function closeAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.querySelector('.admin-sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// タブ切り替えを拡張（サイドバー対応）
const originalSwitchAdminTab = window.switchAdminTab;
window.switchAdminTab = function(tabName) {
    // 既存のタブ切り替え処理を実行
    if (originalSwitchAdminTab) {
        originalSwitchAdminTab(tabName);
    }
    
    // サイドバーのアクティブ状態を更新
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // クリックされたタブをアクティブに
    const clickedItem = Array.from(navItems).find(item => {
        return item.getAttribute('onclick').includes(`'${tabName}'`);
    });
    
    if (clickedItem) {
        clickedItem.classList.add('active');
    }
    
    // トップバーのタイトルを更新
    const titles = {
        'dashboard': { title: 'ダッシュボード', subtitle: 'システム全体の統計情報' },
        'members': { title: 'メンバー管理', subtitle: '会員情報の管理と編集' },
        'blogs': { title: '活動レポート管理', subtitle: 'ブログ記事の作成と管理' },
        'events': { title: 'イベント管理', subtitle: '交流会の作成と管理' },
        'testimonials': { title: '会員の声', subtitle: 'お客様の声の管理' },
        'collaborations': { title: 'お知らせ・レポート', subtitle: 'コラボ事例とお知らせの管理' },
        'images': { title: '画像管理', subtitle: 'サイト画像のアップロードと管理' },
        'pageContent': { title: 'ページ内容管理', subtitle: 'サイトコンテンツの編集' },
        'faqs': { title: 'FAQ管理', subtitle: 'よくある質問の管理' }
    };
    
    const titleInfo = titles[tabName] || { title: '管理', subtitle: '' };
    const titleElement = document.getElementById('adminTopbarTitle');
    const subtitleElement = document.getElementById('adminTopbarSubtitle');
    
    if (titleElement) titleElement.textContent = titleInfo.title;
    if (subtitleElement) subtitleElement.textContent = titleInfo.subtitle;
    
    // モバイルでサイドバーを閉じる
    if (window.innerWidth <= 1024) {
        closeAdminSidebar();
    }
};

// ログアウト処理
function handleAdminLogout() {
    if (confirm('ログアウトしますか？')) {
        closeAdminModal();
        logout();
    }
}

// 管理者パネルを開く時にサイドバーを初期化
const originalOpenAdminPanel = window.openAdminPanel;
window.openAdminPanel = function() {
    if (originalOpenAdminPanel) {
        originalOpenAdminPanel();
    }
    
    // サイドバーを初期化
    setTimeout(() => {
        initAdminSidebar();
    }, 100);
};

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 管理者パネルが開かれた時にサイドバーを初期化
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.style.display === 'flex') {
                    initAdminSidebar();
                }
            });
        });
        
        observer.observe(adminModal, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
});
