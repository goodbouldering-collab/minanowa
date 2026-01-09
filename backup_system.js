// ============================================
// 自動バックアップシステム
// ============================================

const fs = require('fs');
const path = require('path');

// バックアップディレクトリ
const BACKUP_DIR = path.join(__dirname, 'backups');
const DATA_FILE = path.join(__dirname, 'data.json');

// バックアップディレクトリを作成
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// バックアップを作成
function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `data-${timestamp}.json`);
        
        if (fs.existsSync(DATA_FILE)) {
            fs.copyFileSync(DATA_FILE, backupFile);
            console.log(`✅ バックアップ作成: ${path.basename(backupFile)}`);
            
            // 古いバックアップを削除（最新30件のみ保持）
            cleanOldBackups();
            
            return backupFile;
        }
    } catch (error) {
        console.error('❌ バックアップ作成エラー:', error);
    }
}

// 古いバックアップを削除
function cleanOldBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('data-') && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(BACKUP_DIR, file),
                time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        // 最新30件以外を削除
        if (files.length > 30) {
            files.slice(30).forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`🗑️ 古いバックアップ削除: ${file.name}`);
            });
        }
    } catch (error) {
        console.error('❌ バックアップクリーンアップエラー:', error);
    }
}

// バックアップ一覧を取得
function listBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('data-') && file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.mtime
                };
            })
            .sort((a, b) => b.created - a.created);
        
        return files;
    } catch (error) {
        console.error('❌ バックアップ一覧取得エラー:', error);
        return [];
    }
}

// バックアップから復元
function restoreBackup(backupFile) {
    try {
        const backupPath = path.join(BACKUP_DIR, backupFile);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error('バックアップファイルが見つかりません');
        }
        
        // 復元前に現在のデータをバックアップ
        createBackup();
        
        // 復元
        fs.copyFileSync(backupPath, DATA_FILE);
        console.log(`✅ バックアップから復元: ${backupFile}`);
        
        return true;
    } catch (error) {
        console.error('❌ バックアップ復元エラー:', error);
        return false;
    }
}

// 自動バックアップを開始（1時間ごと）
function startAutoBackup() {
    // 起動時にバックアップ
    createBackup();
    
    // 1時間ごとにバックアップ
    setInterval(() => {
        createBackup();
    }, 60 * 60 * 1000); // 1時間
    
    console.log('🔄 自動バックアップを開始（1時間ごと）');
}

module.exports = {
    createBackup,
    listBackups,
    restoreBackup,
    startAutoBackup
};
