/**
 * build.js - Cloudflare Pages 用ビルドスクリプト
 *
 * 静的ファイルを public/ ディレクトリにコピーします。
 * Cloudflare Pages はこのディレクトリを公開します。
 *
 * 使い方: npm run build
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'public');

// Static files to include in Pages deployment
const STATIC_FILES = [
    'index.html',
    'admin.html',
    'favicon.svg'
];

// Clean and create output directory
if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// Copy static files
STATIC_FILES.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(OUT_DIR, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✅ ${file}`);
    } else {
        console.log(`  ⚠️  ${file} (not found, skipped)`);
    }
});

// Copy uploads directory if it exists
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(uploadsDir)) {
    const destUploads = path.join(OUT_DIR, 'uploads');
    fs.mkdirSync(destUploads, { recursive: true });
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
        fs.copyFileSync(path.join(uploadsDir, file), path.join(destUploads, file));
    });
    console.log(`  ✅ uploads/ (${files.length} files)`);
}

console.log(`\n🎉 Build complete! Output: ${OUT_DIR}`);
console.log(`\n⚠️  注意: Cloudflare Pages は静的ファイルのみ公開します。`);
console.log(`   APIサーバー (server.js) は別途デプロイが必要です。`);
console.log(`   推奨: Render, Railway, Fly.io など`);
