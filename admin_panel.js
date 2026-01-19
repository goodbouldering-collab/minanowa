// 管理者パネル - シンプルタブ式
(function() {
    'use strict';
    
    const API_BASE = window.location.origin;
    let currentTab = 'dashboard';
    
    // 初期化
    function initAdminPanel() {
        console.log('🎯 管理者パネル初期化');
        
        // タブクリックイベント
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                switchTab(tabName);
            });
        });
    }
    
    // タブ切り替え
    function switchTab(tabName) {
        console.log('📑 タブ切り替え:', tabName);
        
        // タブボタンの状態更新
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        // コンテンツ表示
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === `admin-${tabName}`) {
                content.classList.add('active');
            }
        });
        
        currentTab = tabName;
        
        // データ読み込み
        loadTabData(tabName);
    }
    
    // タブデータ読み込み
    async function loadTabData(tabName) {
        const contentElement = document.getElementById(`admin-${tabName}`);
        if (!contentElement) return;
        
        try {
            switch(tabName) {
                case 'dashboard':
                    await loadDashboard(contentElement);
                    break;
                case 'members':
                    await loadMembers(contentElement);
                    break;
                case 'blogs':
                    await loadBlogs(contentElement);
                    break;
                case 'events':
                    await loadEvents(contentElement);
                    break;
                case 'testimonials':
                    await loadTestimonials(contentElement);
                    break;
                default:
                    contentElement.innerHTML = '<p>このタブは準備中です</p>';
            }
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            contentElement.innerHTML = '<p class="error">データの読み込みに失敗しました</p>';
        }
    }
    
    // ダッシュボード読み込み
    async function loadDashboard(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
            headers: {
                'x-session-id': sessionStorage.getItem('sessionId')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.dashboard;
            container.innerHTML = `
                <div class="admin-stats">
                    <div class="admin-stat-card">
                        <div class="admin-stat-label">総メンバー数</div>
                        <div class="admin-stat-value">${stats.overview?.totalMembers || 0}</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-label">公開メンバー</div>
                        <div class="admin-stat-value">${stats.overview?.publicMembers || 0}</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-label">総イベント数</div>
                        <div class="admin-stat-value">${stats.overview?.totalEvents || 0}</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-label">総ブログ数</div>
                        <div class="admin-stat-value">${stats.overview?.totalBlogs || 0}</div>
                    </div>
                </div>
            `;
        }
    }
    
    // メンバー一覧読み込み
    async function loadMembers(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        const response = await fetch(`${API_BASE}/api/admin/members`, {
            headers: {
                'x-session-id': sessionStorage.getItem('sessionId')
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const members = data.members || [];
            
            let html = `
                <div class="admin-actions">
                    <button class="admin-btn admin-btn-primary" onclick="alert('新規メンバー追加機能は準備中です')">
                        <i class="fas fa-plus"></i> 新規追加
                    </button>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>名前</th>
                            <th>事業内容</th>
                            <th>所在地</th>
                            <th>状態</th>
                            <th>アクション</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            members.forEach(member => {
                html += `
                    <tr>
                        <td>${member.name}</td>
                        <td>${member.business || '-'}</td>
                        <td>${member.location || '-'}</td>
                        <td>${member.isPublic ? '公開' : '非公開'}</td>
                        <td>
                            <button class="admin-btn admin-btn-edit" onclick="editMember('${member.id}')">編集</button>
                            <button class="admin-btn admin-btn-delete" onclick="deleteMember('${member.id}')">削除</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        }
    }
    
    // ブログ一覧読み込み
    async function loadBlogs(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        const response = await fetch(`${API_BASE}/api/blogs?limit=100`);
        const data = await response.json();
        
        if (data.success) {
            const blogs = data.blogs || [];
            
            let html = `
                <div class="admin-actions">
                    <button class="admin-btn admin-btn-primary" onclick="alert('新規ブログ追加機能は準備中です')">
                        <i class="fas fa-plus"></i> 新規追加
                    </button>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>タイトル</th>
                            <th>カテゴリ</th>
                            <th>公開日</th>
                            <th>アクション</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            blogs.forEach(blog => {
                const date = new Date(blog.publishedAt).toLocaleDateString('ja-JP');
                html += `
                    <tr>
                        <td>${blog.title}</td>
                        <td>${blog.category || '-'}</td>
                        <td>${date}</td>
                        <td>
                            <button class="admin-btn admin-btn-edit" onclick="alert('編集機能は準備中です')">編集</button>
                            <button class="admin-btn admin-btn-delete" onclick="alert('削除機能は準備中です')">削除</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        }
    }
    
    // イベント一覧読み込み
    async function loadEvents(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        const response = await fetch(`${API_BASE}/api/events?showAll=true`);
        const data = await response.json();
        
        if (data.success) {
            const events = data.events || [];
            
            let html = `
                <div class="admin-actions">
                    <button class="admin-btn admin-btn-primary" onclick="alert('新規イベント追加機能は準備中です')">
                        <i class="fas fa-plus"></i> 新規追加
                    </button>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>タイトル</th>
                            <th>日時</th>
                            <th>場所</th>
                            <th>アクション</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            events.forEach(event => {
                const date = new Date(event.date).toLocaleDateString('ja-JP');
                html += `
                    <tr>
                        <td>${event.title}</td>
                        <td>${date} ${event.time || ''}</td>
                        <td>${event.location || '-'}</td>
                        <td>
                            <button class="admin-btn admin-btn-edit" onclick="alert('編集機能は準備中です')">編集</button>
                            <button class="admin-btn admin-btn-delete" onclick="alert('削除機能は準備中です')">削除</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        }
    }
    
    // 会員の声読み込み
    async function loadTestimonials(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        const response = await fetch(`${API_BASE}/api/testimonials`);
        const data = await response.json();
        
        if (data.success) {
            const testimonials = data.testimonials || [];
            
            let html = `
                <div class="admin-actions">
                    <button class="admin-btn admin-btn-primary" onclick="alert('新規追加機能は準備中です')">
                        <i class="fas fa-plus"></i> 新規追加
                    </button>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>名前</th>
                            <th>コメント</th>
                            <th>アクション</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            testimonials.forEach(testimonial => {
                const shortComment = testimonial.comment.substring(0, 50) + '...';
                html += `
                    <tr>
                        <td>${testimonial.name}</td>
                        <td>${shortComment}</td>
                        <td>
                            <button class="admin-btn admin-btn-edit" onclick="alert('編集機能は準備中です')">編集</button>
                            <button class="admin-btn admin-btn-delete" onclick="alert('削除機能は準備中です')">削除</button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
        }
    }
    
    // グローバル関数
    window.editMember = function(id) {
        alert(`メンバー編集機能は準備中です (ID: ${id})`);
    };
    
    window.deleteMember = function(id) {
        if (confirm('本当に削除しますか？')) {
            alert(`削除機能は準備中です (ID: ${id})`);
        }
    };
    
    // openAdminModal関数を上書き
    const originalOpenAdminModal = window.openAdminModal;
    window.openAdminModal = function() {
        if (originalOpenAdminModal) {
            originalOpenAdminModal();
        }
        // モーダルが開いたら初期化
        setTimeout(() => {
            initAdminPanel();
            switchTab('dashboard');
        }, 100);
    };
    
    console.log('✅ 管理者パネルスクリプト読み込み完了');
})();
