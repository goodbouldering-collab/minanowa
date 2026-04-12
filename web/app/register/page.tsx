import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signUp } from './actions';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  'IT・Web',
  '飲食',
  '教育・研修',
  '建設・不動産',
  'サービス',
  '農業・食品',
  '製造',
  '小売',
  'その他',
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/me');

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← トップに戻る
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">会員登録</h1>
          <p className="text-slate-600 mt-2 text-sm">
            みんなのWA に参加して、仲間・お客さん・コラボを手に入れよう
          </p>
        </div>

        <form
          action={signUp}
          className="bg-white rounded-2xl shadow-card border border-slate-200 p-6 space-y-4"
        >
          {searchParams.error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {searchParams.error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="お名前 *" name="name" required />
            <Field label="ふりがな" name="furigana" />
          </div>
          <Field label="メールアドレス *" name="email" type="email" required />
          <Field
            label="パスワード * (6文字以上)"
            name="password"
            type="password"
            required
            minLength={6}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="電話番号" name="phone" type="tel" />
            <Field label="地域" name="location" placeholder="例: 彦根市" />
          </div>

          <Field label="店名" name="profession" placeholder="例: ○○サロン、○○カフェ" />
          <Field label="事業内容" name="business" />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              業種
            </label>
            <select
              name="business_category"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              defaultValue=""
            >
              <option value="">選択してください</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              自己紹介・事業紹介
            </label>
            <textarea
              name="introduction"
              rows={3}
              placeholder="お店やサービスの紹介文"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="ホームページ" name="website" type="url" placeholder="https://" />
            <Field label="Instagram ID" name="instagram" placeholder="your_id" />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 text-white font-medium py-2.5 hover:bg-brand-700 transition-colors"
          >
            登録する
          </button>

          <p className="text-xs text-slate-500 text-center pt-2">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-brand-600 hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  );
}
