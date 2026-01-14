// コンテンツ統合スクリプト：コラボ事例をブログに統合

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('📊 統合前の状態:');
console.log('  ブログ記事:', data.blogs?.length || 0);
console.log('  コラボ事例:', data.collaborations?.length || 0);

// コラボ事例をブログ形式に変換
if (data.collaborations && data.collaborations.length > 0) {
    const convertedCollabs = data.collaborations.map(collab => {
        return {
            id: collab.id,
            title: collab.title,
            slug: collab.id.replace('collab-', 'report-'),
            content: `# ${collab.title}

## 概要
${collab.description}

## 参加メンバー
${collab.members.map(m => `- ${m.name}（${m.role}）`).join('\n')}

## 成果
${collab.result}

この活動は「${collab.category}」カテゴリーでの取り組みです。
`,
            excerpt: collab.description.substring(0, 100) + '...',
            authorId: 'system',
            authorName: 'みんなのWA運営',
            authorAvatar: 'https://i.pravatar.cc/200?img=68',
            category: collab.category,
            tags: ['コラボ事例', collab.category, ...collab.members.map(m => m.role)],
            featuredImage: collab.image,
            publishedAt: collab.createdAt,
            updatedAt: collab.createdAt,
            status: collab.isPublic ? 'published' : 'draft',
            views: Math.floor(Math.random() * 500) + 100,
            likes: Math.floor(Math.random() * 80) + 20,
            // 元のコラボデータを保持
            _originalCollab: {
                members: collab.members,
                result: collab.result
            }
        };
    });
    
    // ブログに追加（重複チェック）
    const existingIds = new Set(data.blogs.map(b => b.id));
    const newBlogs = convertedCollabs.filter(b => !existingIds.has(b.id));
    
    data.blogs = [...data.blogs, ...newBlogs];
    
    console.log('\n📝 変換されたコラボ事例:', newBlogs.length, '件');
    newBlogs.forEach(b => {
        console.log(`  - ${b.title} (${b.category})`);
    });
    
    // collaborationsフィールドを削除
    delete data.collaborations;
}

// データを保存
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log('\n✅ 統合完了:');
console.log('  総ブログ記事数:', data.blogs.length);
console.log('  カテゴリ:');
const categories = {};
data.blogs.forEach(b => {
    categories[b.category] = (categories[b.category] || 0) + 1;
});
Object.entries(categories).forEach(([cat, count]) => {
    console.log(`    - ${cat}: ${count}件`);
});
