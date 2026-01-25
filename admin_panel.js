// ========================================
// 管理者パネル - 完全再構築版
// ========================================

(function() {
    'use strict';
    
    const API_BASE = window.location.origin;
    let currentTab = 'dashboard';
    let sessionId = null;
    
    // 初期化
    function initAdminPanel() {
        console.log('🎯 管理者パネル初期化開始');
        
        // セッションIDを取得
        sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId');
        
        if (!sessionId) {
            console.error('❌ セッションIDが見つかりません');
            return;
        }
        
        // タブクリックイベント
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                switchTab(tabName);
            });
        });
        
        console.log('✅ 管理者パネル初期化完了');
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
        if (!contentElement) {
            console.warn('⚠️ タブコンテンツ要素が見つかりません:', tabName);
            return;
        }
        
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
                    contentElement.innerHTML = '<div class="admin-message">このタブは準備中です</div>';
            }
        } catch (error) {
            console.error('❌ データ読み込みエラー:', error);
            contentElement.innerHTML = '<div class="admin-error">データの読み込みに失敗しました</div>';
        }
    }
    
    // ========================================
    // ダッシュボード
    // ========================================
    async function loadDashboard(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        try {
            const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
                headers: { 'x-session-id': sessionId }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'データ取得失敗');
            }
            
            const stats = data.stats || {};
            
            container.innerHTML = `
                <div class="admin-dashboard">
                    <h2>📊 ダッシュボード</h2>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">👥</div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.totalMembers || 0}</div>
                                <div class="stat-label">総メンバー数</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">✅</div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.publicMembers || 0}</div>
                                <div class="stat-label">公開メンバー</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">📝</div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.totalBlogs || 0}</div>
                                <div class="stat-label">ブログ記事</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">📅</div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.totalEvents || 0}</div>
                                <div class="stat-label">イベント</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">💬</div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.totalTestimonials || 0}</div>
                                <div class="stat-label">会員の声</div>
                            </div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">🔐</div>
                            <div class="stat-info">
                                <div class="stat-value">${stats.activeSessions || 0}</div>
                                <div class="stat-label">アクティブセッション</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-info">
                        <p>✨ みんなのWA 管理システム v2.0</p>
                        <p>最終更新: ${new Date().toLocaleString('ja-JP')}</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ ダッシュボード読み込みエラー:', error);
            container.innerHTML = `
                <div class="admin-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>ダッシュボードの読み込みに失敗しました</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    }
    
    // ========================================
    // メンバー管理
    // ========================================
    async function loadMembers(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        try {
            const response = await fetch(`${API_BASE}/api/admin/members`, {
                headers: { 'x-session-id': sessionId }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'メンバー取得失敗');
            }
            
            const members = data.members || [];
            
            container.innerHTML = `
                <div class="admin-section">
                    <div class="admin-header">
                        <h2>👥 メンバー管理</h2>
                        <button class="admin-btn-primary" onclick="window.adminPanel.addMember()">
                            <i class="fas fa-plus"></i> 新規追加
                        </button>
                    </div>
                    
                    <div class="admin-table-wrapper">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>アバター</th>
                                    <th>名前</th>
                                    <th>メール</th>
                                    <th>事業</th>
                                    <th>カテゴリ</th>
                                    <th>公開</th>
                                    <th>管理者</th>
                                    <th>登録日</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${members.map(member => `
                                    <tr>
                                        <td>
                                            <img src="${member.avatar || 'https://i.pravatar.cc/100?img=1'}" 
                                                 alt="${member.name}" 
                                                 class="admin-avatar"
                                                 onerror="this.src='https://i.pravatar.cc/100?img=1'">
                                        </td>
                                        <td><strong>${member.name || '-'}</strong></td>
                                        <td>${member.email || '-'}</td>
                                        <td>${member.business || '-'}</td>
                                        <td><span class="admin-badge">${member.businessCategory || 'その他'}</span></td>
                                        <td>
                                            <span class="admin-status ${member.isPublic ? 'active' : 'inactive'}">
                                                ${member.isPublic ? '✓ 公開' : '✗ 非公開'}
                                            </span>
                                        </td>
                                        <td>
                                            ${member.isAdmin ? '<span class="admin-badge admin">🔐 管理者</span>' : '-'}
                                        </td>
                                        <td>${formatDate(member.joinDate)}</td>
                                        <td>
                                            <div class="admin-actions">
                                                <button class="admin-btn-icon" onclick="window.adminPanel.editMember('${member.id}')" title="編集">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="admin-btn-icon danger" onclick="window.adminPanel.deleteMember('${member.id}')" title="削除">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="admin-footer">
                        <p>総数: <strong>${members.length}</strong> 名</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ メンバー読み込みエラー:', error);
            container.innerHTML = `
                <div class="admin-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>メンバーの読み込みに失敗しました</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    }
    
    // ========================================
    // ブログ管理
    // ========================================
    async function loadBlogs(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        try {
            const response = await fetch(`${API_BASE}/api/blogs?limit=100`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'ブログ取得失敗');
            }
            
            const blogs = data.blogs || [];
            
            container.innerHTML = `
                <div class="admin-section">
                    <div class="admin-header">
                        <h2>📝 ブログ管理</h2>
                        <button class="admin-btn-primary" onclick="window.adminPanel.addBlog()">
                            <i class="fas fa-plus"></i> 新規作成
                        </button>
                    </div>
                    
                    <div class="admin-grid">
                        ${blogs.map(blog => `
                            <div class="admin-card">
                                <div class="admin-card-image">
                                    <img src="${blog.featuredImage || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&q=80'}" 
                                         alt="${blog.title}"
                                         onerror="this.src='https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&q=80'">
                                    <span class="admin-card-badge">${blog.category}</span>
                                </div>
                                <div class="admin-card-content">
                                    <h3>${blog.title}</h3>
                                    <p class="admin-card-excerpt">${blog.excerpt || ''}</p>
                                    <div class="admin-card-meta">
                                        <span><i class="fas fa-user"></i> ${blog.authorName}</span>
                                        <span><i class="fas fa-calendar"></i> ${formatDate(blog.publishedAt)}</span>
                                    </div>
                                    <div class="admin-card-stats">
                                        <span><i class="fas fa-eye"></i> ${blog.views || 0}</span>
                                        <span><i class="fas fa-heart"></i> ${blog.likes || 0}</span>
                                    </div>
                                    <div class="admin-card-actions">
                                        <button class="admin-btn-secondary" onclick="window.adminPanel.editBlog('${blog.id}')">
                                            <i class="fas fa-edit"></i> 編集
                                        </button>
                                        <button class="admin-btn-danger" onclick="window.adminPanel.deleteBlog('${blog.id}')">
                                            <i class="fas fa-trash"></i> 削除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="admin-footer">
                        <p>総数: <strong>${blogs.length}</strong> 件</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ ブログ読み込みエラー:', error);
            container.innerHTML = `
                <div class="admin-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>ブログの読み込みに失敗しました</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    }
    
    // ========================================
    // イベント管理
    // ========================================
    async function loadEvents(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        try {
            const response = await fetch(`${API_BASE}/api/events?showAll=true`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'イベント取得失敗');
            }
            
            const events = data.events || [];
            
            container.innerHTML = `
                <div class="admin-section">
                    <div class="admin-header">
                        <h2>📅 イベント管理</h2>
                        <button class="admin-btn-primary" onclick="window.adminPanel.addEvent()">
                            <i class="fas fa-plus"></i> 新規作成
                        </button>
                    </div>
                    
                    <div class="admin-list">
                        ${events.map(event => `
                            <div class="admin-list-item">
                                <div class="admin-list-main">
                                    <h3>${event.title}</h3>
                                    <p class="admin-list-desc">${event.description || ''}</p>
                                    <div class="admin-list-meta">
                                        <span><i class="fas fa-calendar"></i> ${event.date}</span>
                                        <span><i class="fas fa-clock"></i> ${event.time}</span>
                                        <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
                                        <span><i class="fas fa-users"></i> ${event.attendees?.length || 0}/${event.capacity || 0}</span>
                                    </div>
                                </div>
                                <div class="admin-list-actions">
                                    <button class="admin-btn-secondary" onclick="window.adminPanel.editEvent('${event.id}')">
                                        <i class="fas fa-edit"></i> 編集
                                    </button>
                                    <button class="admin-btn-danger" onclick="window.adminPanel.deleteEvent('${event.id}')">
                                        <i class="fas fa-trash"></i> 削除
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="admin-footer">
                        <p>総数: <strong>${events.length}</strong> 件</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ イベント読み込みエラー:', error);
            container.innerHTML = `
                <div class="admin-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>イベントの読み込みに失敗しました</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    }
    
    // ========================================
    // 会員の声管理
    // ========================================
    async function loadTestimonials(container) {
        container.innerHTML = '<div class="admin-loading"><div class="spinner"></div><p>読み込み中...</p></div>';
        
        try {
            const response = await fetch(`${API_BASE}/api/testimonials`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || '会員の声取得失敗');
            }
            
            const testimonials = data.testimonials || [];
            
            container.innerHTML = `
                <div class="admin-section">
                    <div class="admin-header">
                        <h2>💬 会員の声管理</h2>
                        <button class="admin-btn-primary" onclick="window.adminPanel.addTestimonial()">
                            <i class="fas fa-plus"></i> 新規追加
                        </button>
                    </div>
                    
                    <div class="admin-list">
                        ${testimonials.map(testimonial => `
                            <div class="admin-list-item">
                                <div class="admin-list-main">
                                    <div class="testimonial-header">
                                        <strong>${testimonial.memberName}</strong>
                                        <span class="admin-badge">${testimonial.business || '-'}</span>
                                        <div class="rating">
                                            ${'★'.repeat(testimonial.rating || 5)}${'☆'.repeat(5 - (testimonial.rating || 5))}
                                        </div>
                                    </div>
                                    <p class="admin-list-desc">"${testimonial.content}"</p>
                                    <div class="admin-list-meta">
                                        <span><i class="fas fa-calendar"></i> ${formatDate(testimonial.joinDate)}</span>
                                    </div>
                                </div>
                                <div class="admin-list-actions">
                                    <button class="admin-btn-secondary" onclick="window.adminPanel.editTestimonial('${testimonial.id}')">
                                        <i class="fas fa-edit"></i> 編集
                                    </button>
                                    <button class="admin-btn-danger" onclick="window.adminPanel.deleteTestimonial('${testimonial.id}')">
                                        <i class="fas fa-trash"></i> 削除
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="admin-footer">
                        <p>総数: <strong>${testimonials.length}</strong> 件</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ 会員の声読み込みエラー:', error);
            container.innerHTML = `
                <div class="admin-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>会員の声の読み込みに失敗しました</p>
                    <p class="error-detail">${error.message}</p>
                </div>
            `;
        }
    }
    
    // ========================================
    // ユーティリティ関数
    // ========================================
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
    
    // ========================================
    // CRUD操作（準備中）
    // ========================================
    const adminActions = {
        // メンバー
        addMember: () => alert('メンバー追加機能は準備中です'),
        editMember: (id) => alert(`メンバー編集機能は準備中です (ID: ${id})`),
        deleteMember: (id) => {
            if (confirm('本当に削除しますか？')) {
                alert(`メンバー削除機能は準備中です (ID: ${id})`);
            }
        },
        
        // ブログ
        addBlog: () => alert('ブログ作成機能は準備中です'),
        editBlog: (id) => alert(`ブログ編集機能は準備中です (ID: ${id})`),
        deleteBlog: (id) => {
            if (confirm('本当に削除しますか？')) {
                alert(`ブログ削除機能は準備中です (ID: ${id})`);
            }
        },
        
        // イベント
        addEvent: () => alert('イベント作成機能は準備中です'),
        editEvent: (id) => alert(`イベント編集機能は準備中です (ID: ${id})`),
        deleteEvent: (id) => {
            if (confirm('本当に削除しますか？')) {
                alert(`イベント削除機能は準備中です (ID: ${id})`);
            }
        },
        
        // 会員の声
        addTestimonial: () => alert('会員の声追加機能は準備中です'),
        editTestimonial: (id) => alert(`会員の声編集機能は準備中です (ID: ${id})`),
        deleteTestimonial: (id) => {
            if (confirm('本当に削除しますか？')) {
                alert(`会員の声削除機能は準備中です (ID: ${id})`);
            }
        }
    };
    
    // グローバルに公開
    window.adminPanel = adminActions;
    
    // モーダルが開かれた時に初期化
    window.addEventListener('openAdminModal', () => {
        initAdminPanel();
        setTimeout(() => switchTab('dashboard'), 100);
    });
    
    // DOMContentLoaded でも初期化を試みる
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ 管理者パネルスクリプト読み込み完了');
        });
    } else {
        console.log('✅ 管理者パネルスクリプト読み込み完了');
    }
    
})();
