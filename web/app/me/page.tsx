import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { toMember } from '@/lib/supabase-mappers';
import { signOut } from '../login/actions';
import { updateProfile } from './actions';

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

export default async function MyPage({
  searchParams,
}: {
  searchParams: { error?: string; saved?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: row } = await supabase
    .from('members')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const member = row ? toMember(row) : null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← トップに戻る
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-slate-600 hover:text-rose-600 transition-colors"
            >
              ログアウト
            </button>
          </form>
        </div>

        {searchParams.saved && (
          <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
            プロフィールを更新しました
          </div>
        )}
        {searchParams.error && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            {searchParams.error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">マイページ</h1>
            {member?.isAdmin && (
              <Link
                href="/admin"
                className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-full hover:bg-brand-700 font-semibold"
              >
                管理画面へ
              </Link>
            )}
          </div>

          {!member ? (
            <div className="text-sm text-slate-600">
              <p>メンバー情報が見つかりません。再度ログインしてください。</p>
              <p className="text-xs text-slate-500 mt-2">Email: {user.email}</p>
            </div>
          ) : (
            <form action={updateProfile} className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                  {member.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500">ログイン中</p>
                  <p className="font-semibold text-slate-900">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="お名前 *" name="name" defaultValue={member.name} required />
                <Field label="ふりがな" name="furigana" defaultValue={member.furigana ?? ''} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="電話番号" name="phone" type="tel" defaultValue={member.phone ?? ''} />
                <Field label="地域" name="location" defaultValue={member.location ?? ''} />
              </div>
              <Field label="店名" name="profession" defaultValue={member.profession ?? ''} />
              <Field label="事業内容" name="business" defaultValue={member.business ?? ''} />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">業種</label>
                <select
                  name="business_category"
                  defaultValue={member.businessCategory ?? ''}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">自己紹介</label>
                <textarea
                  name="introduction"
                  rows={4}
                  defaultValue={member.introduction ?? ''}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="ホームページ" name="website" type="url" defaultValue={member.website ?? ''} />
                <Field label="Instagram ID" name="instagram" defaultValue={member.instagram ?? ''} />
              </div>
              <Field
                label="Google Maps URL"
                name="google_map_url"
                type="url"
                defaultValue={member.googleMapUrl ?? ''}
              />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_public"
                  defaultChecked={member.isPublic}
                  className="rounded"
                />
                メンバー一覧に公開する
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 text-white font-medium py-2.5 hover:bg-brand-700 transition-colors"
              >
                保存する
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  );
}
