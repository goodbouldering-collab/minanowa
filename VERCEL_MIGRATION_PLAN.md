# みんなのWA Vercel 移行プラン (server.js → api/* 個別関数化)

**作成日**: 2026-04-29
**完了日**: 2026-04-30
**ステータス**: ✅ **移行完了**（本番トラフィックは Vercel・Render は同日 suspend）

> 本ドキュメントは移行プラン兼実施記録。以降のメンテで参照しやすいよう履歴として保持する。

## 結果サマリー（2026-04-30）

- 本番ドメイン `https://minanowa.com` は Cloudflare DNS proxy 経由で **Vercel** が応答（`x-vercel-id` 確認済）
- `/api/health` 応答: `runtime: nodejs / region: iad1 / supabase: true / supabaseSchema: legacy_minanowa`
- 全 52 Serverless Functions（`api/**/*.js`）デプロイ済・公開エンドポイント 12 本 + SSR 動的ルート（`/blog/:id`, `/event/:id`, `/event/:id/ics`）疎通 200 確認
- 旧 Render サービス `srv-d6vv6cp4tr6s73ds7ip0` は 2026-04-30 09:06 にユーザー手動 suspend（課金停止・Disk は保留中）
- 完全削除は 1〜2 週間 Vercel 安定運用を見てから手動実施予定

## 当時の現状（着手時点・並行稼働）

- **本番**: Render Starter `minanowa.onrender.com` ($7/月) で稼働中
- **DNS 切替先**: minanowa.com（Cloudflare 経由 → Render）
- **Vercel プロジェクト**: `prj_zVxZrMg0XkvuRqoWi9tr3iBXJNZm` 作成済（移行用、当初500エラー）
- **データ層**: Supabase `legacy_minanowa` スキーマに既に同期済み（USE_SUPABASE=true で Render が運用中）
- **画像ストレージ**: Supabase Storage `media/legacy_minanowa/` に移行済み（22ファイル / DB内 URL 書き換え済み）

## 1. 現状の API ルート一覧（合計 62本）

### Auth 系（7本）
- `POST /api/register`, `POST /api/login`
- `POST /api/password-reset/request`, `GET /api/password-reset/verify/:token`, `POST /api/password-reset/confirm`
- `POST /api/auth/google`, `POST /api/register/google`

### Members 系（6本）
- `GET /api/members`, `GET /api/members/:id`, `PUT /api/members/:id`
- `GET /api/members/:id/participation`, `GET /api/members/participation/all`
- `PUT /api/admin/members/:id`, `DELETE /api/admin/members/:id`

### Events 系（10本）
- `GET /api/events`
- `POST /api/events/:id/register`, `DELETE /api/events/:id/register`, `GET /api/events/:id/registrations`
- `POST /api/events/:id/create-checkout`, `POST /api/events/:id/confirm-payment`, `POST /api/events/:id/toggle-payment`
- `POST/PUT/DELETE /api/admin/events[/:id]`

### Blogs 系（5本）
- `GET /api/blogs`
- `POST/PUT/DELETE /api/admin/blogs[/:id]`
- `GET /blog/:id`（OG タグ用 SSR HTML）

### Boards（掲示板）系（5本）
- `GET/POST /api/boards`, `POST /api/boards/:id/reply`, `PUT/DELETE /api/boards/:id`
- `PUT/DELETE /api/admin/boards/:id`

### Interviews / Operating Members（7本）
### Admin / Backups（8本）
### Site Settings / Messages / Misc（10本）
### SSR / Static-ish（4本）

詳細は server.js を grep。

## 2. 提案ディレクトリ構造

```
api/
  auth/{register,login,google,register-google}.js
  auth/password-reset/{request,confirm}.js
  auth/password-reset/verify/[token].js
  members/{index,[id]}.js
  members/[id]/participation.js
  events/{index,[id]}.js
  events/[id]/{register,registrations,create-checkout,confirm-payment,toggle-payment}.js
  blogs/{index,[id]}.js
  boards/{index,[id]}.js
  boards/[id]/reply.js
  interviews/{index,[id]}.js
  operating-members/{index,admin}.js
  admin/{backup,sync-map-coords}.js
  admin/backups/{index,[filename]}.js
  admin/backups/[filename]/restore.js
  admin/backups/upload.js
  {site-settings,messages,contact,upload,resolve-map-url,og-image}.js
  ai/generate-shop-info.js
  ssr/{robots,sitemap,feed}.js
  ssr/blog/[id].js
  ssr/event/[id].js
  ssr/event/[id]/ics.js
lib/
  supabase-store.js   (既存)
  vercel-utils.js     (新規: cors / body parse / auth wrapper)
  auth.js             (新規: bcrypt + Google verify + admin token check)
  data-cache.js       (新規: cache wrapper)
public/
  index.html
  admin.html
  favicon.svg / icon-*.png / manifest.json / sw.js
vercel.json
```

`vercel.json` で `/blog/:id` 等を `/api/ssr/blog/[id]` に rewrite し、未定義パスは `public/` に静的配信。

## 3. 共通ヘルパー設計（lib/vercel-utils.js）

```js
function withCors(handler, opts = {}) { /* OPTIONS short-circuit + CORS headers */ }
function withMethods(map) { /* { GET: fn, POST: fn } → method 振り分け */ }
function readJson(req) { /* body parse */ }
function readMultipart(req) { /* busboy で file を Buffer 化 */ }
async function requireMember(req) { /* x-member-id ヘッダ → members から検証 */ }
async function requireAdmin(req) { /* member.isAdmin === true をチェック */ }
function ok(res, data) / function fail(res, code, msg) { /* JSON 返却 */ }
```

設計ポイント:
- `compression` 不要（Vercel エッジが自動 gzip/br）
- `cors` は `withCors` で自前実装（OPTIONS は 204）
- `body-parser` 不要（Vercel が自動 parse）
- `multer` 廃止 → `busboy` で Buffer 化 → Supabase Storage 直送
- `express.static` 廃止（public/ 自動配信）

## 4. データ層キャッシュ戦略（lib/data-cache.js）

server.js の `_cache` パターンを移植。serverless ではコンテナ間で状態共有しないため:
- Read 系: warm hit なら cache、cold miss は `supaStore.readAll()`
- Write 系: 必ず `supaStore.writeAll()` + ローカル cache 更新
- Lambda 間で stale を避けるため write 系は `Cache-Control: no-store` を返却

## 5. 移行ステップ

### Week 1 — 基盤整備
1. `package.json` から `express`, `compression`, `body-parser`, `cors`, `multer`, `serverless-http` 削除、`busboy` 追加
2. `lib/vercel-utils.js`, `lib/auth.js`, `lib/data-cache.js` 新規作成
3. `vercel.json` 書き換え（builds 廃止、`functions` で `maxDuration: 60`、`rewrites` で SSR ルートと SPA fallback）
4. `index.html` / `admin.html` / `favicon.*` / `sw.js` を `public/` に移動
5. ダミー `api/health.js` で Vercel Preview デプロイ疎通確認

### Week 2 — API 移植（カテゴリ単位で PR 分割）
- PR-A: auth 系 7本
- PR-B: members 系 6本 + site-settings + messages
- PR-C: events 系 10本（Stripe checkout 注意）
- PR-D: blogs / boards / interviews / operating-members
- PR-E: admin/backups + upload + ai/generate-shop-info
- PR-F: SSR ルート

server.js の各ハンドラ本体ロジックは**コピペ可能**:
- `req.params.id` → `req.query.id`
- `req.body` / `res.json()` / `res.status()` はそのまま動く

### Week 3 — テスト & cutover
1. `minanowa.vercel.app` Preview で全 62 ルートを Postman collection で叩く
2. 管理画面 (admin.html) を Preview に向けて手動回帰
3. Stripe sandbox で決済フロー検証
4. Google OAuth の origin に `minanowa.vercel.app` 追加
5. DNS で `minanowa.com` を Vercel に向け切り、Render は 1 週間並行稼働 → 問題なければ停止

## 6. 落とし穴と回避策

| 落とし穴 | 回避策 |
|---|---|
| `app.listen` 内の起動時タスク (FORCE_RESEED, map-coords cache, interview→blog migration) が失われる | 一回限りの `api/admin/run-migration.js` に切り出し、手動 POST 起動 |
| 起動時 AI 補完が serverless で動かない | Vercel Cron or admin ボタンで明示起動 |
| `resetTokens` が in-memory Map なので Lambda 間で共有されない | Supabase に `password_reset_tokens` テーブル追加（短期 TTL） |
| `getStripe()` の動的 key 取得 | 各ハンドラで `lib/stripe.js` の局所版を呼ぶ |
| multipart upload で `bodyParser: false` 漏れ | `export const config = { api: { bodyParser: false } }` 必須 |
| Edge runtime と Node runtime 混在 | `export const config = { runtime: 'nodejs' }` を全ファイル明示 |
| OG SSR の `res.send(html)` | `res.setHeader('Content-Type','text/html'); res.end(html)` |
| `writeFile` バックアップロジック | Supabase Storage に backup JSON put |
| Cold start レイテンシ | `lib/data-cache.js` で Supabase クライアントを singleton 化 |
| `express.static` の `Cache-Control` 制御 | `vercel.json` の `headers` で同等のパターン定義 |
