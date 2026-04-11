# みんなのWA - Render デプロイ完全覚書
最終更新: 2026-03-23

---

## プロジェクト情報

| 項目 | 値 |
|------|---|
| GitHubリポジトリ | https://github.com/goodbouldering-collab/minanowa |
| ブランチ | `genspark_ai_developer` |
| 技術スタック | Node.js + Express + JSONファイルDB |
| 主要ファイル | server.js, index.html, admin.html, data.json |

---

## STEP 1: Renderでサービス作成

1. https://render.com にGitHubアカウントでログイン
2. **New+ → Web Service**
3. **Build and deploy from a Git repository** を選択
4. リポジトリ `goodbouldering-collab/minanowa` を **Connect**

---

## STEP 2: 基本設定（Settings画面）

| 項目 | 値 |
|------|---|
| Name | `minanowa` |
| Branch | `genspark_ai_developer` |
| Build Command | `rm -rf node_modules && npm install` |
| Start Command | `node server.js` |
| Plan | **Starter ($7/月)** ※永続ディスクに必須 |

### ⚠️ Build Command 重要
Renderのダッシュボードの Settings → Build & Deploy で
**Build Command** が `rm -rf node_modules && npm install` になっているか必ず確認。
render.yamlの値と違う場合、ダッシュボード側が優先される。

---

## STEP 3: 環境変数（Environment画面）

左メニュー **Environment** → **Add** で以下4つを追加：

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `RENDER` | `true` |
| `PERSISTENT_DIR` | `/data` |

---

## STEP 4: 永続ディスク（Disks画面）

### 追加方法（2パターン）
- **作成時**: 設定画面の一番下 **Advanced** → **Add Disk**
- **作成後**: 左メニュー **Disks** → **Add Disk**

### 入力値

| 項目 | 値 |
|------|---|
| Mount Path | `/data` |
| Size | `1` (GB) |

※ Name欄は自動付与（入力不要な場合あり）

### 永続ディスクの役割
- `/data/data.json` → メンバー・イベント等のデータ
- `/data/uploads/` → アップロード画像
- `/data/backups/` → データバックアップ
- デプロイしてもこれらは一切消えない

---

## STEP 5: カスタムドメイン（独自ドメイン設定）

1. 左メニュー **Settings** → **Custom Domains** → **Add Custom Domain**
2. `minanowa.com` を入力
3. Renderが表示するDNS設定をドメイン管理画面で設定

---

## STEP 6: デプロイ

- **自動**: GitHubにプッシュされると自動デプロイ
- **手動**: Deploys → **Manual Deploy** → **Clear build cache & deploy**

### 成功の確認
ログに以下が表示されればOK：
```
🎉 みんなのWA Server running on port 10000
📁 Data file: /data/data.json
💾 Persistent dir: /data
✅ 既存データを使用します（永続ディスク）
```

---

## トラブルシューティング

### エラー: Cannot find module './debug'
**原因**: node_modulesのキャッシュが壊れている
**対処**:
1. Settings → Build & Deploy → Build Command を確認
2. `rm -rf node_modules && npm install` になっているか確認
3. Deploys → Manual Deploy → **Clear build cache & deploy** で再デプロイ

### エラー: Port scan timeout reached
**原因**: サーバーが正しいポートで起動していない
**対処**:
1. Environment で `PORT` が `10000` に設定されているか確認
2. `RENDER` が `true` に設定されているか確認

---

## 運用ルール（超重要）

```
┌─────────────────────────────────────┐
│ コード修正 → AIデベロッパー          │
│   → GitHubに自動プッシュ             │
│   → Renderが自動デプロイ             │
│                                      │
│ データ変更 → 本番の管理画面のみ！     │
│   会員登録、イベント管理、ブログ等    │
│                                      │
│ ⚠️ data.jsonはAIデベロッパーで       │
│    絶対に編集しないこと！             │
│    編集すると本番データと競合する     │
└─────────────────────────────────────┘
```

### なぜdata.jsonを編集してはいけないか
- 本番サイトでユーザーが登録したデータは `/data/data.json` に保存される
- GitHubの `data.json` は初回デプロイ時のシードデータとしてのみ使われる
- AIデベロッパーで `data.json` を編集しても本番には反映されない（安全設計）
- 2回目以降のデプロイでは `/data/data.json` が既に存在するためコピーされない

---

## データの流れ（図解）

```
【初回デプロイ】
GitHub の data.json ──コピー──→ /data/data.json（永続ディスク）

【2回目以降のデプロイ】
GitHub の data.json ──無視──→ /data/data.json は既存のまま維持 ✅

【ユーザーの操作】
管理画面で変更 → server.js → /data/data.json に保存 → デプロイしても消えない ✅

【コード更新】
AIデベロッパー → GitHub → Render再デプロイ → コードだけ更新、データ無傷 ✅
```

---

## 改修した主なファイル

### server.js の変更点
```javascript
// 永続ディスク対応（Renderでは/data、ローカルでは__dirname）
const PERSISTENT_DIR = process.env.PERSISTENT_DIR || (process.env.RENDER ? '/data' : __dirname);
const DATA_FILE = path.join(PERSISTENT_DIR, 'data.json');
const SEED_DATA_FILE = path.join(__dirname, 'data.json');

// uploads, backups も永続ディスクに保存
const uploadDir = path.join(PERSISTENT_DIR, 'uploads');
// backups も path.join(PERSISTENT_DIR, 'backups') に変更済み

// 起動時: 初回のみシードデータをコピー
try {
    await fs.access(DATA_FILE);  // 既にある→何もしない
} catch {
    await fs.copyFile(SEED_DATA_FILE, DATA_FILE);  // 初回のみコピー
}
```

### .gitignore の変更点
- `package-lock.json` の除外を解除（リポジトリに含める）
- `data.json` の除外は以前から解除済み

### admin.html の変更点
- ナビ下に運用ルール注意バーを追加：
  「データ変更は管理画面のみ／コード修正はAIデベロッパー → GitHub → Render自動デプロイ」

---

## Git コミット履歴

```
380fb0d fix: ビルド時にnode_modulesを完全クリア（キャッシュ破損対策）
dbc6dc2 fix: package-lock.jsonをリポジトリに含める（Renderデプロイ修正）
f179935 docs: Renderデプロイ覚書を追加
3fcb522 feat: Render永続ディスク対応 - デプロイ時のデータ消失を防止
34f30bd chore: data.jsonをリポジトリに永続的に含める（.gitignoreから除外解除）
```

---

## 費用まとめ

| サービス | 費用 |
|---------|------|
| Render Starter | $7/月 |
| 永続ディスク 1GB | $0.25/月 |
| カスタムドメイン | ドメイン費用のみ（年間約1,400円〜） |
| **合計** | **約$7.25/月（約1,100円/月）** |
