# みんなのWA

彦根発 異業種交流コミュニティのウェブサイト。

## 構成（本番実態）

ルート直下に全てがある単層構造。サブディレクトリに `legacy/` や `web/` は存在しない。

```
みんなのWA/
├── server.js          # Express サーバー (port 3000 開発 / 10000 本番)
├── index.html         # フロント (約5,400行 / 単一HTMLにJS埋め込み)
├── admin.html         # 管理画面
├── data.json          # ファイルベース永続化（Render /data ディスクに配置）
├── lib/
│   └── supabase-store.js   # Supabase 永続層（env 切替で opt-in）
├── supabase/migrations/    # Supabase スキーマ（opt-in 用）
├── uploads/                # アップロード画像（/data 配下）
├── scripts/
│   └── seed-from-production.js
├── package.json
├── render.yaml             # Render Blueprint
└── Dockerfile
```

## 起動

```bash
npm install
npm run dev              # http://localhost:3000 (nodemon)
# or
npm start                # node server.js
```

## 本番

- URL: [minanowa.onrender.com](https://minanowa.onrender.com)
- Render サービス: `minanowa` (srv-d6vv6cp4tr6s73ds7ip0)
- リージョン: **Oregon**（`render.yaml` の `region: singapore` は記述ミスで実際は Oregon。変更する場合は Render ダッシュボードから）
- プラン: **Starter ($7/月) + 永続ディスク `/data` 1GB**（このプロジェクトは例外的に Starter 維持）
- 監視ブランチ: `main`（旧 `genspark_ai_developer`）
- 自動デプロイ: commit push で発火

### Render プラン運用（例外: Starter 維持中）

全プロジェクト共通方針は「新規は Free + 親リポ統合 keepalive で開始、本番化で Starter 昇格」だが、**このプロジェクトは例外的に最初から Starter を維持**している。keepalive 対象外（親リポ `render-keepalive.yml` の matrix にも入れていない）。

**理由**: `data.json`（会員・投稿）と `uploads/`（画像）を Render の永続ディスク `/data` に保存しているが、**Free プランでは永続ディスクが使えない**ため、Free 化するとデータが全消失する。

将来 Free 化する場合の手順:

1. **データ層を Supabase に完全移行**（`lib/supabase-store.js` は実装済み・本番未使用）
   - 環境変数 `USE_SUPABASE=true` で切替可能
   - 本番 `data.json` と `uploads/` の Supabase Storage への移行スクリプト作成・実行
2. Render Dashboard で **Disk を切り離す**
3. Render Dashboard で **Instance Type を Free に変更**
4. **親リポ `claude-workspace/.github/workflows/render-keepalive.yml` の matrix に `minanowa` を追加**してコミット
5. このセクションを「Free 稼働中」記載に更新

詳細・全プロジェクト共通ルールは親 CLAUDE.md「Render プラン運用ルール」参照。

## データ層

**デフォルトはファイルベース** (`data.json` を `/data` ディスクに保存)。

Supabase 永続層が `lib/supabase-store.js` に実装済みで、環境変数で opt-in 可能：

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
USE_SUPABASE=true   # これで Supabase モードに切り替わる
```

スキーマは `supabase/migrations/` に配置。現状は **使っていない**（ファイルベース単独で運用中）。
data.json 破損など問題が起きたら Supabase モードに切り替える想定。

## 運用ルール

- **data.json をコードから編集禁止**。データ変更は必ず管理画面 (`/admin`) から
- `uploads/` 配下は永続ディスク。コミット対象外（`.gitignore`）
- バックアップ: `node scripts/seed-from-production.js` で本番からシード取得可能

## リファクタ履歴（参考）

過去に Next.js + Supabase 版 (`web/` ディレクトリ) への全面移行を試みたが、2026-04-21 に撤回してルート直下型の本番構造に戻した。

- 復元用 git タグ: `pre-refactor-nextjs-20260411`（commit `f0dc908`）
- 復元用バックアップ: `../_backups/minanowa-pre-refactor-20260411.tar.gz`
- 削除済み refactor ブランチ（残っていれば `refactor/nextjs-supabase`）

## 共通規約（親 CLAUDE.md より継承）

- HTTPS 強制：`index.html` に `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">` 設置済み
- 外部画像は HTTPS 限定（HTTP 画像はミックスコンテンツでブロックされる）
- EUC-JP 変換が必要な外部取り込み（グッぼる本店）は `iconv-lite` 経由で

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| 本番の画像が消えた | Render ダッシュボードで `/data` ディスクのマウント確認 |
| data.json が壊れた | Render ディスクスナップショットから復元、または Supabase モードに切り替え |
| デプロイが走らない | `main` ブランチに push しているか確認。Render 監視ブランチは `main` |
| ローカルで `data.json` が空 | 本番から `scripts/seed-from-production.js` でシード |
