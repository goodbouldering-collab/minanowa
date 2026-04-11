# みんなのWA

彦根発 異業種交流コミュニティのウェブサイト。

## ディレクトリ構成（リファクタ移行中）

```
みんなのWA/
├── legacy/          # 旧 Express + 素HTML/JS 版（本番稼働中）
│   ├── server.js    # Express サーバー (port 3000)
│   ├── index.html   # フロントエンド (5,400行)
│   ├── admin.html   # 管理画面
│   ├── data.json    # ファイルベース永続化
│   └── ...
└── web/             # 新 Next.js + Supabase 版（移行先）
    ├── app/         # App Router
    ├── lib/         # supabase クライアント / mapper / constants
    ├── types/       # database (snake_case) / domain (camelCase)
    ├── supabase/migrations/  # SQL マイグレーション
    └── scripts/     # シードスクリプト
```

## 起動

### 旧版 (本番)
```bash
cd legacy && node server.js   # http://localhost:3000
```

### 新版 (開発中)
```bash
cd web && npm install && npm run dev   # http://localhost:3010
```

## リファクタ進行状況

| Step | 内容 | 状態 |
|---|---|---|
| 1 | 土台作成 (Next.js 雛形 + Supabase スキーマ + mapper) | ✅ 完了 |
| 2 | 閲覧側ページ移植 (トップ/メンバー/ブログ/イベント) | ⏳ 未着手 |
| 3 | 管理画面移植 | ⏳ 未着手 |
| 4 | 認証 + マイページ (Supabase Auth) | ⏳ 未着手 |
| 5 | Render 切替 + legacy 削除 | ⏳ 未着手 |

## 復元手段

| 手段 | 場所 |
|---|---|
| git タグ | `pre-refactor-nextjs-20260411` (commit `f0dc908`) |
| バックアップ | `../_backups/minanowa-pre-refactor-20260411.tar.gz` |
| 元ブランチ | `genspark_ai_developer` (無傷) |

戻すとき: `git checkout genspark_ai_developer`

## 次セッションでの手動作業

リファクタを進めるには以下のセットアップが必要：

1. **Supabase プロジェクト作成**
   - https://supabase.com/dashboard で新規作成
   - リージョン: `Northeast Asia (Tokyo)`
   - プロジェクト名: `minanowa`

2. **マイグレーション実行**
   - Supabase ダッシュボード → SQL Editor
   - `web/supabase/migrations/0001_initial_schema.sql` を実行
   - `web/supabase/migrations/0002_rls_policies.sql` を実行

3. **環境変数設定**
   ```bash
   cd web
   cp .env.local.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   # SUPABASE_SERVICE_ROLE_KEY を埋める
   ```

4. **シード投入**
   ```bash
   cd web
   npm install
   npm run migrate:seed
   ```
   → `legacy/data.json` の内容が Supabase に投入される
   → 旧ID→新UUIDのマッピングが `legacy/id-mapping.json` に保存される

5. **Google OAuth (任意)**
   - Supabase Auth → Providers → Google
   - 旧 `siteSettings.googleClientId` を登録

## 既存ユーザーへの影響

- 旧 `bcrypt` ハッシュは Supabase Auth に持ち込めない
- 既存メンバーは初回ログイン時にパスワードリセットが必要
- メールアドレスは保持されるので「パスワードを忘れた」フローでリセット可能

## 共通規約 (親 CLAUDE.md より継承)

- 定数は `web/lib/constants.ts` に集約 (会社情報・URL等をハードコードしない)
- Supabase は snake_case、UI は camelCase、変換は `web/lib/supabase-mappers.ts` に集約
- ブログ記事には JSON-LD (BlogPosting / FAQPage / SpeakableSpecification) を出力
