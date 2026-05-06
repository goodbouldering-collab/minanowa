# みんなのWA

彦根発 異業種交流コミュニティのウェブサイト。

## 構成（本番実態）

**2026-04-30 より Vercel Serverless Functions（`api/*`）+ Supabase に集約**。Render Starter は同日 suspend 済み。`server.js` は手元のローカル開発・将来的な復旧用に残しているが、本番では一切使われていない。

```
みんなのWA/
├── api/                    # Vercel Serverless Functions（本番ハンドラ・全 52 ファイル）
│   ├── auth/               # 認証系（register/login/google/password-reset）
│   ├── members/            # 会員 CRUD + participation
│   ├── events/             # イベント + Stripe 決済
│   ├── blogs/              # ブログ
│   ├── boards/             # 掲示板
│   ├── interviews/         # インタビュー
│   ├── operating-members/  # 運営メンバー
│   ├── admin/              # 管理 API（backups / sync-map-coords / events 等）
│   ├── ssr/                # OG タグ用 SSR HTML（blog/event/feed/sitemap/robots）
│   ├── ai/generate-shop-info.js
│   ├── upload.js           # multipart → Supabase Storage 直送
│   ├── og-image.js, resolve-map-url.js, contact.js, messages.js, site-settings.js
│   └── health.js
├── lib/
│   ├── supabase-store.js   # Supabase 永続層（本番で常時 ON）
│   ├── vercel-utils.js     # CORS / method 振り分け / readJson / readMultipart / ok / fail
│   ├── auth.js             # bcrypt + Google OAuth + admin token check
│   ├── data-cache.js       # singleton キャッシュ（コールドスタート対策）
│   ├── reset-tokens.js     # パスワードリセット用 in-memory トークン
│   └── mailer.js           # Resend 経由のメール送信（RESEND_API_KEY / MAIL_FROM）
├── index.html              # トップページ（リポルート直下が Vercel に配信される）
├── admin.html              # 管理画面（同上）
├── favicon.svg / icon-*.png / apple-touch-icon.png / manifest.json / sw.js
├── supabase/migrations/    # legacy_minanowa スキーマ（本番運用中・0001〜0004）
├── scripts/
│   ├── pull-from-prod.js          # Supabase 本番 → ローカル dev スキーマへ
│   ├── migrate-uploads-to-storage.js   # uploads/ → Supabase Storage（実行済）
│   ├── fix-storage-urls.js        # DB 内 /uploads/xxx URL を Storage URL に書換（実行済）
│   └── gen-favicons.mjs           # favicon.svg → PNG 各サイズを sharp で生成
├── server.js               # 旧 Express サーバー（ローカル開発・復旧用にのみ残置）
├── data.json               # 旧 Render /data 由来の最終スナップショット（参考）
├── package.json
├── vercel.json             # rewrites（SSR 用）+ functions maxDuration 60s + headers
├── render.yaml             # 旧 Blueprint（参考に保持・本番未使用）
└── Dockerfile              # 同上
```

**注意: `public/` ディレクトリは存在しない**。Vercel の `outputDirectory: '.'` 設定で
リポルート直下が静的配信されるため、index.html / admin.html / favicon 等は **必ずルート
直下に置く**。以前 `public/` に同期コピーがあったが完全な死コードだったので 2026-05-07
に撤去済み (commit で確認可)。

## 起動

### ローカル（Vercel CLI 経由・推奨）

```bash
npm install
npx vercel dev --listen 3000   # api/* + ルート直下静的ファイルを Vercel と同等の挙動で起動
```

### ローカル（旧 Express でサクッと触りたいとき）

```bash
npm start                  # node server.js（Supabase 接続 + 旧 data.json）
```

`server.js` は本番では動いていない。`api/*` のロジックを手早く確認したいだけの参考用。

## 本番

- URL: [minanowa.com](https://minanowa.com)（Cloudflare DNS proxy → Vercel）
- Vercel プロジェクト: `minanowa` (`prj_zVxZrMg0XkvuRqoWi9tr3iBXJNZm`)
- Vercel 既定ドメイン: `minanowa.vercel.app`
- カスタムドメイン: `minanowa.com`, `www.minanowa.com`（両方 Vercel に紐付け済み・SSL 自動）
- リージョン: `iad1`（Vercel デフォルト・米東）
- 監視ブランチ: `main`
- 自動デプロイ: `main` push で Vercel が即時ビルド & 本番反映
- PR ごとに Preview URL 自動発行（SSO 認証あり）

### 旧 Render（参考・suspend 済み）

- Render サービス: `minanowa` (`srv-d6vv6cp4tr6s73ds7ip0`)
- 状態: **2026-04-30 09:06 ユーザー手動 suspend**（課金停止）
- Disk: 旧 `/data` (1GB) は保留中（中身は Supabase Storage に移行済）
- 完全削除は 1〜2 週間 Vercel 安定運用を確認してから手動で実施予定

## データ層

### 永続層（本番で常時 ON）

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_SCHEMA=legacy_minanowa
USE_SUPABASE=true
```

- スキーマ: `legacy_minanowa`（テーブル: `members`, `events`, `blogs`, `boards`, `interviews`, `operating_members`, `messages`, `site_settings`, `password_reset_tokens` 等）
- 画像: Supabase Storage `media` バケット `legacy_minanowa/` プレフィックス（旧 uploads/ から 22 ファイル移行済み）
- ローカル開発時は dev スキーマ運用（`.env.example` 参照）

### キャッシュ

`lib/data-cache.js` がハンドラ間で Supabase クライアントと読み取り結果を singleton 化。Lambda コンテナが温まっている間は Supabase fetch が発生しない。書き込み系ハンドラは `Cache-Control: no-store` で stale 防止。

## 運用ルール

- **データ変更は必ず管理画面 (`/admin`) から**。`data.json` は本番では使われていないが、ローカルでも触らない
- 画像アップロードは Vercel multipart 経由 → Supabase Storage に直送（`api/upload.js`）
- バックアップ: `api/admin/backup.js` が Supabase Storage に JSON ダンプを保存（管理画面の「バックアップ」から取得・リストア可能）
- 本番 → ローカル dev スキーマへのデータ取り込みは `node scripts/pull-from-prod.js`

## 移行履歴

| 日付 | 出来事 |
|---|---|
| 2026-03-22 | Render Starter で初回デプロイ |
| 2026-04-11 | Next.js + Supabase 版 (`web/`) への全面移行を試行 |
| 2026-04-21 | 上記を撤回しルート直下 Express 構造に戻す（git tag `pre-refactor-nextjs-20260411`、commit `f0dc908`、`../_backups/minanowa-pre-refactor-20260411.tar.gz`） |
| 2026-04-29 | Vercel 移行プラン策定（[VERCEL_MIGRATION_PLAN.md](VERCEL_MIGRATION_PLAN.md)）。Express → `api/*` 個別関数化、Supabase Storage への画像移行 |
| 2026-04-29〜30 | Week 1〜2 完了：基盤 + 全 52 ハンドラ移植 + `public/` 切替 + Supabase Storage 移行（22 ファイル） |
| 2026-04-30 | DNS（Cloudflare proxy）を Render → Vercel に切替、本番疎通確認、Render を suspend |

## 共通規約（親 CLAUDE.md より継承）

- HTTPS 強制：`public/index.html` に `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">` 設置済み
- 外部画像は HTTPS 限定（HTTP 画像はミックスコンテンツでブロックされる）
- EUC-JP 変換が必要な外部取り込み（グッぼる本店）は `iconv-lite` 経由で

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| 本番が落ちた | Vercel Dashboard `Deployments` で前バージョンに 1 クリック Rollback |
| デプロイがエラー | `vercel logs <deployment-url>` または Dashboard で詳細確認。`api/*` のシンタックスエラーは `vercel build` ローカル実行で再現可 |
| 画像が表示されない | Supabase Storage `media/legacy_minanowa/` の存在確認。URL は `https://<project>.supabase.co/storage/v1/object/public/media/legacy_minanowa/<filename>` 形式 |
| `/api/*` が 500 | `vercel logs` で `runtime: nodejs` 確認、Supabase 接続エラーなら `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` を Vercel Project Settings で確認 |
| カスタムドメインが繋がらない | Cloudflare DNS で `minanowa.com` の CNAME（または A レコード proxy）が Vercel を指しているか確認 |
| 緊急時の Render 復活 | Render Dashboard で resume → DNS を Cloudflare proxy → Render に戻す（最終スナップショットの data.json は disk 内に残存） |
