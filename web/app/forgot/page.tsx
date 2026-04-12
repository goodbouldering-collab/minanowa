import Link from 'next/link';
import { requestReset } from './actions';

export const dynamic = 'force-dynamic';

export default function ForgotPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ← ログインに戻る
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">パスワード再発行</h1>
          <p className="text-slate-600 mt-2 text-sm">
            登録済みのメールアドレスを入力してください。
            <br />
            リセット用のリンクをお送りします。
          </p>
        </div>

        <form
          action={requestReset}
          className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 space-y-4"
        >
          {searchParams.error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {searchParams.error}
            </div>
          )}
          {searchParams.sent && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              リセットリンクをメールでお送りしました。メールを確認してください。
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 text-white font-medium py-2.5 hover:bg-brand-700 transition-colors"
          >
            リセットリンクを送信
          </button>
        </form>
      </div>
    </main>
  );
}
