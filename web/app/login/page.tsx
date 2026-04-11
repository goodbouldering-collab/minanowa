import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signIn } from './actions';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/me');
  }

  const errorMessage = searchParams.error;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← トップに戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">ログイン</h1>
          <p className="text-slate-600 mt-2 text-sm">
            みんなのWA メンバー専用ページ
          </p>
        </div>

        <form
          action={signIn}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
        >
          {errorMessage && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
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
              autoComplete="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-rose-600 text-white font-medium py-2.5 hover:bg-rose-700 transition-colors"
          >
            ログイン
          </button>

          <p className="text-xs text-slate-500 text-center pt-2">
            初回ログインの方はパスワード <code className="px-1 py-0.5 bg-slate-100 rounded">minanowa2026</code> をお試しください
          </p>
        </form>
      </div>
    </main>
  );
}
