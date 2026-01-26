// ============================================
// バックアップシステム（簡易版）
// ============================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// バックアップディレクトリを作成
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * バックアップを作成
 */
function createBackup() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.log('⚠️ data.jsonが存在しないため、バックアップをスキップします');
            return null;
        }

        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        const backupFile = path.join(BACKUP_DIR, `data-${timestamp}.json`);
        
        fs.copyFileSync(DATA_FILE, backupFile);
        console.log(`✅ バックアップを作成しました: ${backupFile}`);
        
        return backupFile;
    } catch (error) {
        console.error('❌ バックアップ作成エラー:', error);
        return null;
    }
}

/**
 * バックアップ一覧を取得
 */
function listBackups() {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return [];
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.startsWith('data-') && file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.mtime,
                    createdISO: stats.mtime.toISOString()
                };
            })
            .sort((a, b) => b.created - a.created);

        return files;
    } catch (error) {
        console.error('❌ バックアップ一覧取得エラー:', error);
        return [];
    }
}

/**
 * バックアップから復元
 */
function restoreBackup(backupFilename) {
    try {
        const backupPath = path.join(BACKUP_DIR, backupFilename);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error('バックアップファイルが見つかりません');
        }

        // 現在のdata.jsonをバックアップ
        if (fs.existsSync(DATA_FILE)) {
            createBackup();
        }

        // バックアップから復元
        fs.copyFileSync(backupPath, DATA_FILE);
        console.log(`✅ バックアップから復元しました: ${backupFilename}`);
        
        return true;
    } catch (error) {
        console.error('❌ バックアップ復元エラー:', error);
        throw error;
    }
}

/**
 * バックアップを削除
 */
function deleteBackup(backupFilename) {
    try {
        const backupPath = path.join(BACKUP_DIR, backupFilename);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error('バックアップファイルが見つかりません');
        }

        fs.unlinkSync(backupPath);
        console.log(`✅ バックアップを削除しました: ${backupFilename}`);
        
        return true;
    } catch (error) {
        console.error('❌ バックアップ削除エラー:', error);
        throw error;
    }
}

module.exports = {
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup
};
