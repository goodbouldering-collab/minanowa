/* 管理者パネル - 横スライド方式（再構築版） */

class AdminSlidePanel {
    constructor() {
        this.currentTab = 0;
        this.tabs = ['dashboard', 'members', 'blogs', 'events', 'testimonials', 'faqs', 'images', 'settings'];
        this.API_BASE = window.location.origin;
        this.sessionId = localStorage.getItem('sessionId');
        
        this.init();
    }
    
    init() {
        console.log('🎯 AdminSlidePanel.init() 開始');
        console.log('📊 タブ数:', this.tabs.length);
        
        // タブクリックイベント
        const tabElements = document.querySelectorAll('.admin-slide-tab');
        console.log('🔍 タブ要素数:', tabElements.length);
        
        tabElements.forEach((tab, index) => {
            console.log(`  タブ${index}:`, tab.dataset.tab);
            tab.addEventListener('click', () => {
                console.log(`🖱️ タブ${index}クリック:`, tab.dataset.tab);
                this.switchTab(index);
            });
        });
        
        // 初期タブのロード
        console.log('📥 初期タブ（ダッシュボード）をロード...');
        this.loadTab(0);
    }
    
    switchTab(index) {
        console.log(`🔄 タブ切り替え: ${this.currentTab} → ${index}`);
        this.currentTab = index;
        const wrapper = document.getElementById('adminSlideWrapper');
        
        if (!wrapper) {
            console.error('❌ adminSlideWrapper が見つかりません！');
            return;
        }
        
        // タブのアクティブ状態を更新
        document.querySelectorAll('.admin-slide-tab').forEach((tab, i) => {
            const isActive = i === index;
            tab.classList.toggle('active', isActive);
            if (isActive) {
                console.log(`✅ タブ${i}をアクティブ化:`, tab.dataset.tab);
            }
        });
        
        // スライド移動
        const translateX = -index * 100;
        console.log(`📐 スライド移動: translateX(${translateX}%)`);
        wrapper.style.transform = `translateX(${translateX}%)`;
        
        // コンテンツをロード
        this.loadTab(index);
    }
    
    loadTab(index) {
        const tabName = this.tabs[index];
        const content = document.querySelector(`[data-content="${tabName}"]`);
        
        // 既にロード済みかチェック
        if (content.dataset.loaded === 'true') return;
        
        // ロード処理
        switch(tabName) {
            case 'dashboard':
                this.loadDashboard(content);
                break;
            case 'members':
                this.loadMembers(content);
                break;
            case 'blogs':
                this.loadBlogs(content);
                break;
            case 'events':
                this.loadEvents(content);
                break;
            case 'testimonials':
                this.loadTestimonials(content);
                break;
            case 'faqs':
                this.loadFAQs(content);
                break;
            case 'images':
                this.loadImages(content);
                break;
            case 'settings':
                this.loadSettings(content);
                break;
        }
        
        content.dataset.loaded = 'true';
    }
    
    async loadDashboard(content) {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/dashboard`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                content.innerHTML = this.renderDashboard(data.dashboard);
            } else {
                content.innerHTML = this.renderError('ダッシュボードの読み込みに失敗しました');
            }
        } catch (error) {
            console.error('ダッシュボード取得エラー:', error);
            content.innerHTML = this.renderError('エラーが発生しました');
        }
    }
    
    renderDashboard(dashboard) {
        const { overview, categoryStats, locationStats, recentMembers, recentBlogs } = dashboard;
        
        return `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-chart-line"></i> ダッシュボード</h3>
            </div>
            
            <div class="admin-slide-stats">
                <div class="admin-slide-stat-card">
                    <div class="admin-slide-stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="admin-slide-stat-info">
                        <div class="admin-slide-stat-value">${overview.totalMembers}</div>
                        <div class="admin-slide-stat-label">総メンバー数</div>
                    </div>
                </div>
                
                <div class="admin-slide-stat-card">
                    <div class="admin-slide-stat-icon">
                        <i class="fas fa-newspaper"></i>
                    </div>
                    <div class="admin-slide-stat-info">
                        <div class="admin-slide-stat-value">${overview.publishedBlogs}</div>
                        <div class="admin-slide-stat-label">公開記事数</div>
                    </div>
                </div>
                
                <div class="admin-slide-stat-card">
                    <div class="admin-slide-stat-icon">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="admin-slide-stat-info">
                        <div class="admin-slide-stat-value">${overview.upcomingEvents}</div>
                        <div class="admin-slide-stat-label">予定イベント</div>
                    </div>
                </div>
                
                <div class="admin-slide-stat-card">
                    <div class="admin-slide-stat-icon">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="admin-slide-stat-info">
                        <div class="admin-slide-stat-value">${overview.totalLikes}</div>
                        <div class="admin-slide-stat-label">総いいね数</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadMembers(content) {
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/members`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                content.innerHTML = this.renderMembers(data.members);
            } else {
                content.innerHTML = this.renderError('メンバー情報の読み込みに失敗しました');
            }
        } catch (error) {
            console.error('メンバー取得エラー:', error);
            content.innerHTML = this.renderError('エラーが発生しました');
        }
    }
    
    renderMembers(members) {
        return `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-users"></i> メンバー管理</h3>
                <button class="btn btn-primary" onclick="adminPanel.showMemberForm()">
                    <i class="fas fa-plus"></i> 新規メンバー追加
                </button>
            </div>
            
            <div class="admin-slide-table">
                <table>
                    <thead>
                        <tr>
                            <th>名前</th>
                            <th>事業内容</th>
                            <th>カテゴリ</th>
                            <th>場所</th>
                            <th>登録日</th>
                            <th>ステータス</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map(member => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <img src="${member.avatar || 'https://i.pravatar.cc/200?img=1'}" 
                                             alt="${member.name}" 
                                             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                        <strong>${member.name}</strong>
                                    </div>
                                </td>
                                <td>${member.business || '-'}</td>
                                <td><span style="background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem;">${member.businessCategory || 'その他'}</span></td>
                                <td>${member.location || '-'}</td>
                                <td>${new Date(member.createdAt).toLocaleDateString('ja-JP')}</td>
                                <td>
                                    <span style="color: ${member.approvalStatus === 'approved' ? '#48bb78' : '#f56565'}; font-weight: 600;">
                                        ${member.approvalStatus === 'approved' ? '承認済み' : '未承認'}
                                    </span>
                                </td>
                                <td>
                                    <div class="admin-slide-actions">
                                        <button class="btn-edit" onclick="adminPanel.editMember('${member.id}')">
                                            <i class="fas fa-edit"></i> 編集
                                        </button>
                                        <button class="btn-delete" onclick="adminPanel.deleteMember('${member.id}', '${member.name}')">
                                            <i class="fas fa-trash"></i> 削除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    async loadBlogs(content) {
        try {
            const response = await fetch(`${this.API_BASE}/api/blogs?limit=100`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                content.innerHTML = this.renderBlogs(data.blogs);
            } else {
                content.innerHTML = this.renderError('ブログ情報の読み込みに失敗しました');
            }
        } catch (error) {
            console.error('ブログ取得エラー:', error);
            content.innerHTML = this.renderError('エラーが発生しました');
        }
    }
    
    renderBlogs(blogs) {
        return `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-newspaper"></i> 活動レポート管理</h3>
                <button class="btn btn-primary" onclick="adminPanel.showBlogForm()">
                    <i class="fas fa-plus"></i> 新規記事追加
                </button>
            </div>
            
            <div class="admin-slide-table">
                <table>
                    <thead>
                        <tr>
                            <th>タイトル</th>
                            <th>カテゴリ</th>
                            <th>著者</th>
                            <th>公開日</th>
                            <th>閲覧数</th>
                            <th>ステータス</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${blogs.map(blog => `
                            <tr>
                                <td><strong>${blog.title}</strong></td>
                                <td><span style="background: #e2e8f0; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem;">${blog.category}</span></td>
                                <td>${blog.authorName}</td>
                                <td>${new Date(blog.publishDate || blog.createdAt).toLocaleDateString('ja-JP')}</td>
                                <td>${blog.views || 0}</td>
                                <td>
                                    <span style="color: ${blog.isPublic ? '#48bb78' : '#f56565'}; font-weight: 600;">
                                        ${blog.isPublic ? '公開' : '下書き'}
                                    </span>
                                </td>
                                <td>
                                    <div class="admin-slide-actions">
                                        <button class="btn-edit" onclick="adminPanel.editBlog('${blog.id}')">
                                            <i class="fas fa-edit"></i> 編集
                                        </button>
                                        <button class="btn-delete" onclick="adminPanel.deleteBlog('${blog.id}', '${blog.title}')">
                                            <i class="fas fa-trash"></i> 削除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    async loadEvents(content) {
        try {
            const response = await fetch(`${this.API_BASE}/api/events?showAll=true`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                content.innerHTML = this.renderEvents(data.events);
            } else {
                content.innerHTML = this.renderError('イベント情報の読み込みに失敗しました');
            }
        } catch (error) {
            console.error('イベント取得エラー:', error);
            content.innerHTML = this.renderError('エラーが発生しました');
        }
    }
    
    renderEvents(events) {
        return `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-calendar"></i> イベント管理</h3>
                <button class="btn btn-primary" onclick="adminPanel.showEventForm()">
                    <i class="fas fa-plus"></i> 新規イベント追加
                </button>
            </div>
            
            <div class="admin-slide-table">
                <table>
                    <thead>
                        <tr>
                            <th>タイトル</th>
                            <th>開催日</th>
                            <th>場所</th>
                            <th>定員</th>
                            <th>参加者数</th>
                            <th>ステータス</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${events.map(event => `
                            <tr>
                                <td><strong>${event.title}</strong></td>
                                <td>${new Date(event.date).toLocaleDateString('ja-JP')}</td>
                                <td>${event.location}</td>
                                <td>${event.capacity || '-'}</td>
                                <td>${event.attendeeCount || 0}</td>
                                <td>
                                    <span style="color: ${event.status === 'published' ? '#48bb78' : '#f56565'}; font-weight: 600;">
                                        ${event.status === 'published' ? '公開中' : '非公開'}
                                    </span>
                                </td>
                                <td>
                                    <div class="admin-slide-actions">
                                        <button class="btn-edit" onclick="adminPanel.editEvent('${event.id}')">
                                            <i class="fas fa-edit"></i> 編集
                                        </button>
                                        <button class="btn-delete" onclick="adminPanel.deleteEvent('${event.id}', '${event.title}')">
                                            <i class="fas fa-trash"></i> 削除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    async loadTestimonials(content) {
        try {
            const response = await fetch(`${this.API_BASE}/api/testimonials`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                content.innerHTML = this.renderTestimonials(data.testimonials);
            } else {
                content.innerHTML = this.renderError('会員の声の読み込みに失敗しました');
            }
        } catch (error) {
            console.error('会員の声取得エラー:', error);
            content.innerHTML = this.renderError('エラーが発生しました');
        }
    }
    
    renderTestimonials(testimonials) {
        return `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-comments"></i> 会員の声</h3>
                <button class="btn btn-primary" onclick="adminPanel.showTestimonialForm()">
                    <i class="fas fa-plus"></i> 新規追加
                </button>
            </div>
            
            <div class="admin-slide-table">
                <table>
                    <thead>
                        <tr>
                            <th>メンバー名</th>
                            <th>評価</th>
                            <th>コメント</th>
                            <th>公開日</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${testimonials.map(testimonial => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <img src="${testimonial.memberAvatar || 'https://i.pravatar.cc/200?img=1'}" 
                                             alt="${testimonial.memberName}" 
                                             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                                        <strong>${testimonial.memberName}</strong>
                                    </div>
                                </td>
                                <td>
                                    ${'⭐'.repeat(testimonial.rating)}
                                </td>
                                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${testimonial.content}
                                </td>
                                <td>${new Date(testimonial.createdAt).toLocaleDateString('ja-JP')}</td>
                                <td>
                                    <div class="admin-slide-actions">
                                        <button class="btn-edit" onclick="adminPanel.editTestimonial('${testimonial.id}')">
                                            <i class="fas fa-edit"></i> 編集
                                        </button>
                                        <button class="btn-delete" onclick="adminPanel.deleteTestimonial('${testimonial.id}')">
                                            <i class="fas fa-trash"></i> 削除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    async loadFAQs(content) {
        content.innerHTML = `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-question-circle"></i> FAQ管理</h3>
                <button class="btn btn-primary" onclick="adminPanel.showFAQForm()">
                    <i class="fas fa-plus"></i> 新規FAQ追加
                </button>
            </div>
            <p style="color: #718096;">FAQデータの取得機能を実装中です...</p>
        `;
    }
    
    async loadImages(content) {
        content.innerHTML = `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-images"></i> 画像管理</h3>
            </div>
            <p style="color: #718096;">画像管理機能を実装中です...</p>
        `;
    }
    
    async loadSettings(content) {
        content.innerHTML = `
            <div class="admin-slide-section-header">
                <h3><i class="fas fa-sliders-h"></i> システム設定</h3>
            </div>
            <p style="color: #718096;">設定機能を実装中です...</p>
        `;
    }
    
    renderError(message) {
        return `
            <div class="admin-slide-message error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
    }
    
    // 編集・削除メソッド（プレースホルダー）
    showMemberForm() { alert('メンバー追加フォームを表示します'); }
    editMember(id) { alert(`メンバー ${id} を編集します`); }
    deleteMember(id, name) { 
        if (confirm(`${name} を削除しますか？`)) {
            alert(`メンバー ${id} を削除します`); 
        }
    }
    
    showBlogForm() { alert('ブログ追加フォームを表示します'); }
    editBlog(id) { alert(`ブログ ${id} を編集します`); }
    deleteBlog(id, title) { 
        if (confirm(`「${title}」を削除しますか？`)) {
            alert(`ブログ ${id} を削除します`); 
        }
    }
    
    showEventForm() { alert('イベント追加フォームを表示します'); }
    editEvent(id) { alert(`イベント ${id} を編集します`); }
    deleteEvent(id, title) { 
        if (confirm(`「${title}」を削除しますか？`)) {
            alert(`イベント ${id} を削除します`); 
        }
    }
    
    showTestimonialForm() { alert('会員の声追加フォームを表示します'); }
    editTestimonial(id) { alert(`会員の声 ${id} を編集します`); }
    deleteTestimonial(id) { 
        if (confirm('この会員の声を削除しますか？')) {
            alert(`会員の声 ${id} を削除します`); 
        }
    }
    
    showFAQForm() { alert('FAQ追加フォームを表示します'); }
}

// 初期化 - グローバル変数として宣言
let adminPanel = null;

// 管理者パネルを初期化する関数（モーダル開閉時に呼ばれる）
function initAdminSlidePanel() {
    const adminSlidePanel = document.querySelector('.admin-slide-panel');
    if (adminSlidePanel && !adminPanel) {
        console.log('🎯 AdminSlidePanel初期化開始');
        adminPanel = new AdminSlidePanel();
        console.log('✅ AdminSlidePanel初期化完了');
    }
}

// DOMContentLoadedでも初期化を試みる
document.addEventListener('DOMContentLoaded', () => {
    // モーダルが既に存在する場合は初期化
    setTimeout(() => {
        initAdminSlidePanel();
    }, 100);
});
