# Render デプロイ覚書

## 1. サービス作成
- render.com にGitHubでログイン
- New+ → Web Service → GitHubリポジトリ `goodbouldering-collab/minanowa` を接続

## 2. 基本設定
| 項目 | 値 |
|------|---|
| Name | `minanowa` |
| Branch | `genspark_ai_developer` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Plan | **Starter ($7/月)** |

## 3. 環境変数 (Environment)
| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `RENDER` | `true` |
| `PERSISTENT_DIR` | `/data` |

## 4. 永続ディスク (Disks)
作成時: Advanced → Add Disk / 作成後: 左メニュー Disks → Add Disk

| 項目 | 値 |
|------|---|
| Mount Path | `/data` |
| Size | `1` GB |

## 5. カスタムドメイン
Settings → Custom Domains → Add Custom Domain → `minanowa.com` 入力
→ Renderが表示するDNS設定をドメイン管理画面で設定

## 運用ルール
- **コード修正** → AIデベロッパー → GitHub → Render自動デプロイ
- **データ変更** → 本番の管理画面から操作
- **data.jsonはAIデベロッパーで絶対に編集しない**
