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
    
    // 編集・削除メソッド
    showMemberForm() {
        const content = document.querySelector(`[data-content="members"]`);
        content.innerHTML = this.renderMemberForm();
    }
    
    renderMemberForm(member = null) {
        const isEdit = member !== null;
        return `
            <div class="admin-slide-section-header">
                <h3>${isEdit ? 'メンバー編集' : 'メンバー追加'}</h3>
                <button class="btn btn-secondary" onclick="adminPanel.loadMembers(document.querySelector('[data-content=\\'members\\']'))">
                    キャンセル
                </button>
            </div>
            
            <form class="admin-slide-form" onsubmit="adminPanel.saveMember(event, ${isEdit ? `'${member.id}'` : 'null'})">
                <div class="admin-slide-form-group">
                    <label>名前 *</label>
                    <input type="text" name="name" value="${member?.name || ''}" required>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>メールアドレス *</label>
                    <input type="email" name="email" value="${member?.email || ''}" required ${isEdit ? 'readonly' : ''}>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>事業内容</label>
                    <input type="text" name="business" value="${member?.business || ''}">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>カテゴリ</label>
                    <select name="businessCategory">
                        <option value="">選択してください</option>
                        <option value="飲食" ${member?.businessCategory === '飲食' ? 'selected' : ''}>飲食</option>
                        <option value="小売" ${member?.businessCategory === '小売' ? 'selected' : ''}>小売</option>
                        <option value="サービス" ${member?.businessCategory === 'サービス' ? 'selected' : ''}>サービス</option>
                        <option value="製造" ${member?.businessCategory === '製造' ? 'selected' : ''}>製造</option>
                        <option value="IT" ${member?.businessCategory === 'IT' ? 'selected' : ''}>IT</option>
                        <option value="建築・不動産" ${member?.businessCategory === '建築・不動産' ? 'selected' : ''}>建築・不動産</option>
                        <option value="医療・福祉" ${member?.businessCategory === '医療・福祉' ? 'selected' : ''}>医療・福祉</option>
                        <option value="教育" ${member?.businessCategory === '教育' ? 'selected' : ''}>教育</option>
                        <option value="その他" ${member?.businessCategory === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>所在地</label>
                    <input type="text" name="location" value="${member?.location || ''}">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>ウェブサイト</label>
                    <input type="url" name="website" value="${member?.website || ''}">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>自己紹介</label>
                    <textarea name="introduction" rows="5">${member?.introduction || ''}</textarea>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>承認ステータス</label>
                    <select name="approvalStatus">
                        <option value="pending" ${member?.approvalStatus === 'pending' ? 'selected' : ''}>未承認</option>
                        <option value="approved" ${member?.approvalStatus === 'approved' ? 'selected' : ''}>承認済み</option>
                    </select>
                </div>
                
                <div class="admin-slide-form-actions">
                    <button type="button" class="btn-secondary" onclick="adminPanel.loadMembers(document.querySelector('[data-content=\\'members\\']'))">
                        キャンセル
                    </button>
                    <button type="submit" class="btn-primary">
                        ${isEdit ? '更新' : '追加'}
                    </button>
                </div>
            </form>
        `;
    }
    
    async editMember(id) {
        console.log('📝 メンバー編集:', id);
        try {
            const response = await fetch(`${this.API_BASE}/api/members/${id}`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                const content = document.querySelector(`[data-content="members"]`);
                content.innerHTML = this.renderMemberForm(data.member);
            } else {
                alert('メンバー情報の取得に失敗しました');
            }
        } catch (error) {
            console.error('メンバー取得エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async saveMember(event, memberId) {
        event.preventDefault();
        console.log('💾 メンバー保存:', memberId);
        
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);
        
        try {
            const url = memberId 
                ? `${this.API_BASE}/api/admin/members/${memberId}`
                : `${this.API_BASE}/api/admin/members`;
            
            const response = await fetch(url, {
                method: memberId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': this.sessionId
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(memberId ? 'メンバー情報を更新しました' : 'メンバーを追加しました');
                const content = document.querySelector(`[data-content="members"]`);
                this.loadMembers(content);
            } else {
                alert('保存に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('保存エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async deleteMember(id, name) {
        if (!confirm(`${name} を削除しますか？この操作は取り消せません。`)) {
            return;
        }
        
        console.log('🗑️ メンバー削除:', id);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/members/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': this.sessionId }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('メンバーを削除しました');
                const content = document.querySelector(`[data-content="members"]`);
                this.loadMembers(content);
            } else {
                alert('削除に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('削除エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    showBlogForm() {
        const content = document.querySelector(`[data-content="blogs"]`);
        content.innerHTML = this.renderBlogForm();
    }
    
    renderBlogForm(blog = null) {
        const isEdit = blog !== null;
        return `
            <div class="admin-slide-section-header">
                <h3>${isEdit ? 'ブログ編集' : 'ブログ追加'}</h3>
                <button class="btn btn-secondary" onclick="adminPanel.loadBlogs(document.querySelector('[data-content=\\'blogs\\']'))">
                    キャンセル
                </button>
            </div>
            
            <form class="admin-slide-form" onsubmit="adminPanel.saveBlog(event, ${isEdit ? `'${blog.id}'` : 'null'})">
                <div class="admin-slide-form-group">
                    <label>タイトル *</label>
                    <input type="text" name="title" value="${blog?.title || ''}" required>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>スラッグ（URL用）*</label>
                    <input type="text" name="slug" value="${blog?.slug || ''}" required pattern="[a-z0-9-]+" 
                           placeholder="例: my-first-post" ${isEdit ? 'readonly' : ''}>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>カテゴリ *</label>
                    <select name="category" required>
                        <option value="">選択してください</option>
                        <option value="コラボ事例" ${blog?.category === 'コラボ事例' ? 'selected' : ''}>コラボ事例</option>
                        <option value="商品開発" ${blog?.category === '商品開発' ? 'selected' : ''}>商品開発</option>
                        <option value="DX支援" ${blog?.category === 'DX支援' ? 'selected' : ''}>DX支援</option>
                        <option value="イベント企画" ${blog?.category === 'イベント企画' ? 'selected' : ''}>イベント企画</option>
                        <option value="マーケティング" ${blog?.category === 'マーケティング' ? 'selected' : ''}>マーケティング</option>
                        <option value="レポート" ${blog?.category === 'レポート' ? 'selected' : ''}>レポート</option>
                        <option value="お知らせ" ${blog?.category === 'お知らせ' ? 'selected' : ''}>お知らせ</option>
                        <option value="イベントレポート" ${blog?.category === 'イベントレポート' ? 'selected' : ''}>イベントレポート</option>
                    </select>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>概要 *</label>
                    <textarea name="excerpt" rows="3" required>${blog?.excerpt || ''}</textarea>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>本文 *</label>
                    <textarea name="content" rows="10" required>${blog?.content || ''}</textarea>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>著者名</label>
                    <input type="text" name="authorName" value="${blog?.authorName || '管理者'}">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>アイキャッチ画像URL</label>
                    <input type="url" name="featuredImage" value="${blog?.featuredImage || ''}">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>公開ステータス</label>
                    <select name="isPublic">
                        <option value="true" ${blog?.isPublic !== false ? 'selected' : ''}>公開</option>
                        <option value="false" ${blog?.isPublic === false ? 'selected' : ''}>下書き</option>
                    </select>
                </div>
                
                <div class="admin-slide-form-actions">
                    <button type="button" class="btn-secondary" onclick="adminPanel.loadBlogs(document.querySelector('[data-content=\\'blogs\\']'))">
                        キャンセル
                    </button>
                    <button type="submit" class="btn-primary">
                        ${isEdit ? '更新' : '追加'}
                    </button>
                </div>
            </form>
        `;
    }
    
    async editBlog(id) {
        console.log('📝 ブログ編集:', id);
        try {
            const response = await fetch(`${this.API_BASE}/api/blogs/${id}`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                const content = document.querySelector(`[data-content="blogs"]`);
                content.innerHTML = this.renderBlogForm(data.blog);
            } else {
                alert('ブログ情報の取得に失敗しました');
            }
        } catch (error) {
            console.error('ブログ取得エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async saveBlog(event, blogId) {
        event.preventDefault();
        console.log('💾 ブログ保存:', blogId);
        
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);
        data.isPublic = data.isPublic === 'true';
        data.publishDate = new Date().toISOString();
        
        try {
            const url = blogId 
                ? `${this.API_BASE}/api/admin/blogs/${blogId}`
                : `${this.API_BASE}/api/admin/blogs`;
            
            const response = await fetch(url, {
                method: blogId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': this.sessionId
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(blogId ? 'ブログを更新しました' : 'ブログを追加しました');
                const content = document.querySelector(`[data-content="blogs"]`);
                this.loadBlogs(content);
            } else {
                alert('保存に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('保存エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async deleteBlog(id, title) {
        if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) {
            return;
        }
        
        console.log('🗑️ ブログ削除:', id);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/blogs/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': this.sessionId }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('ブログを削除しました');
                const content = document.querySelector(`[data-content="blogs"]`);
                this.loadBlogs(content);
            } else {
                alert('削除に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('削除エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    
    showEventForm() {
        const content = document.querySelector(`[data-content="events"]`);
        content.innerHTML = this.renderEventForm();
    }
    
    renderEventForm(event = null) {
        const isEdit = event !== null;
        const dateValue = event?.date ? new Date(event.date).toISOString().slice(0, 16) : '';
        
        return `
            <div class="admin-slide-section-header">
                <h3>${isEdit ? 'イベント編集' : 'イベント追加'}</h3>
                <button class="btn btn-secondary" onclick="adminPanel.loadEvents(document.querySelector('[data-content=\\'events\\']'))">
                    キャンセル
                </button>
            </div>
            
            <form class="admin-slide-form" onsubmit="adminPanel.saveEvent(event, ${isEdit ? `'${event.id}'` : 'null'})">
                <div class="admin-slide-form-group">
                    <label>タイトル *</label>
                    <input type="text" name="title" value="${event?.title || ''}" required>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>開催日時 *</label>
                    <input type="datetime-local" name="date" value="${dateValue}" required>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>場所 *</label>
                    <input type="text" name="location" value="${event?.location || ''}" required>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>説明 *</label>
                    <textarea name="description" rows="5" required>${event?.description || ''}</textarea>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>定員</label>
                    <input type="number" name="capacity" value="${event?.capacity || ''}" min="1">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>イベント画像URL</label>
                    <input type="url" name="imageUrl" value="${event?.imageUrl || ''}">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>ステータス</label>
                    <select name="status">
                        <option value="published" ${event?.status === 'published' ? 'selected' : ''}>公開</option>
                        <option value="draft" ${event?.status === 'draft' ? 'selected' : ''}>下書き</option>
                        <option value="archived" ${event?.status === 'archived' ? 'selected' : ''}>アーカイブ</option>
                    </select>
                </div>
                
                <div class="admin-slide-form-actions">
                    <button type="button" class="btn-secondary" onclick="adminPanel.loadEvents(document.querySelector('[data-content=\\'events\\']'))">
                        キャンセル
                    </button>
                    <button type="submit" class="btn-primary">
                        ${isEdit ? '更新' : '追加'}
                    </button>
                </div>
            </form>
        `;
    }
    
    async editEvent(id) {
        console.log('📝 イベント編集:', id);
        try {
            const response = await fetch(`${this.API_BASE}/api/events/${id}`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                const content = document.querySelector(`[data-content="events"]`);
                content.innerHTML = this.renderEventForm(data.event);
            } else {
                alert('イベント情報の取得に失敗しました');
            }
        } catch (error) {
            console.error('イベント取得エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async saveEvent(event, eventId) {
        event.preventDefault();
        console.log('💾 イベント保存:', eventId);
        
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);
        
        try {
            const url = eventId 
                ? `${this.API_BASE}/api/admin/events/${eventId}`
                : `${this.API_BASE}/api/admin/events`;
            
            const response = await fetch(url, {
                method: eventId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': this.sessionId
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(eventId ? 'イベントを更新しました' : 'イベントを追加しました');
                const content = document.querySelector(`[data-content="events"]`);
                this.loadEvents(content);
            } else {
                alert('保存に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('保存エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async deleteEvent(id, title) {
        if (!confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) {
            return;
        }
        
        console.log('🗑️ イベント削除:', id);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/events/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': this.sessionId }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('イベントを削除しました');
                const content = document.querySelector(`[data-content="events"]`);
                this.loadEvents(content);
            } else {
                alert('削除に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('削除エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    
    showTestimonialForm() {
        const content = document.querySelector(`[data-content="testimonials"]`);
        content.innerHTML = this.renderTestimonialForm();
    }
    
    renderTestimonialForm(testimonial = null) {
        const isEdit = testimonial !== null;
        return `
            <div class="admin-slide-section-header">
                <h3>${isEdit ? '会員の声編集' : '会員の声追加'}</h3>
                <button class="btn btn-secondary" onclick="adminPanel.loadTestimonials(document.querySelector('[data-content=\\'testimonials\\']'))">
                    キャンセル
                </button>
            </div>
            
            <form class="admin-slide-form" onsubmit="adminPanel.saveTestimonial(event, ${isEdit ? `'${testimonial.id}'` : 'null'})">
                <div class="admin-slide-form-group">
                    <label>メンバー名 *</label>
                    <input type="text" name="memberName" value="${testimonial?.memberName || ''}" required>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>役職・事業名</label>
                    <input type="text" name="memberRole" value="${testimonial?.memberRole || ''}">
                </div>
                
                <div class="admin-slide-form-group">
                    <label>評価 *</label>
                    <select name="rating" required>
                        <option value="">選択してください</option>
                        <option value="5" ${testimonial?.rating === 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (5)</option>
                        <option value="4" ${testimonial?.rating === 4 ? 'selected' : ''}>⭐⭐⭐⭐ (4)</option>
                        <option value="3" ${testimonial?.rating === 3 ? 'selected' : ''}>⭐⭐⭐ (3)</option>
                        <option value="2" ${testimonial?.rating === 2 ? 'selected' : ''}>⭐⭐ (2)</option>
                        <option value="1" ${testimonial?.rating === 1 ? 'selected' : ''}>⭐ (1)</option>
                    </select>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>コメント *</label>
                    <textarea name="content" rows="5" required>${testimonial?.content || ''}</textarea>
                </div>
                
                <div class="admin-slide-form-group">
                    <label>アバター画像URL</label>
                    <input type="url" name="memberAvatar" value="${testimonial?.memberAvatar || ''}">
                </div>
                
                <div class="admin-slide-form-actions">
                    <button type="button" class="btn-secondary" onclick="adminPanel.loadTestimonials(document.querySelector('[data-content=\\'testimonials\\']'))">
                        キャンセル
                    </button>
                    <button type="submit" class="btn-primary">
                        ${isEdit ? '更新' : '追加'}
                    </button>
                </div>
            </form>
        `;
    }
    
    async editTestimonial(id) {
        console.log('📝 会員の声編集:', id);
        try {
            const response = await fetch(`${this.API_BASE}/api/testimonials`, {
                headers: { 'x-session-id': this.sessionId }
            });
            const data = await response.json();
            
            if (data.success) {
                const testimonial = data.testimonials.find(t => t.id === id);
                if (testimonial) {
                    const content = document.querySelector(`[data-content="testimonials"]`);
                    content.innerHTML = this.renderTestimonialForm(testimonial);
                } else {
                    alert('会員の声が見つかりませんでした');
                }
            } else {
                alert('会員の声情報の取得に失敗しました');
            }
        } catch (error) {
            console.error('会員の声取得エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async saveTestimonial(event, testimonialId) {
        event.preventDefault();
        console.log('💾 会員の声保存:', testimonialId);
        
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData);
        data.rating = parseInt(data.rating);
        
        try {
            const url = testimonialId 
                ? `${this.API_BASE}/api/admin/testimonials/${testimonialId}`
                : `${this.API_BASE}/api/admin/testimonials`;
            
            const response = await fetch(url, {
                method: testimonialId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': this.sessionId
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(testimonialId ? '会員の声を更新しました' : '会員の声を追加しました');
                const content = document.querySelector(`[data-content="testimonials"]`);
                this.loadTestimonials(content);
            } else {
                alert('保存に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('保存エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
    async deleteTestimonial(id) {
        if (!confirm('この会員の声を削除しますか？この操作は取り消せません。')) {
            return;
        }
        
        console.log('🗑️ 会員の声削除:', id);
        
        try {
            const response = await fetch(`${this.API_BASE}/api/admin/testimonials/${id}`, {
                method: 'DELETE',
                headers: { 'x-session-id': this.sessionId }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('会員の声を削除しました');
                const content = document.querySelector(`[data-content="testimonials"]`);
                this.loadTestimonials(content);
            } else {
                alert('削除に失敗しました: ' + (result.error || ''));
            }
        } catch (error) {
            console.error('削除エラー:', error);
            alert('エラーが発生しました');
        }
    }
    
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
