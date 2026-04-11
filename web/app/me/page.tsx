import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { toMember } from '@/lib/supabase-mappers';
import { signOut } from '../login/actions';

export const dynamic = 'force-dynamic';

export default async function MyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: row } = await supabase
    .from('members')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const member = row ? toMember(row) : null;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
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

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">マイページ</h1>

          {member ? (
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                {member.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-3xl">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="text-xl font-bold text-slate-900">{member.name}</h2>
                {member.business && (
                  <p className="text-sm text-slate-600">{member.business}</p>
                )}
                {member.businessCategory && (
                  <span className="inline-block text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {member.businessCategory}
                  </span>
                )}
                <dl className="text-sm text-slate-600 pt-4 space-y-1">
                  <div>
                    <dt className="inline font-medium text-slate-700">メール: </dt>
                    <dd className="inline">{user.email}</dd>
                  </div>
                  {member.isAdmin && (
                    <div className="pt-2">
                      <Link
                        href="/admin"
                        className="inline-block text-xs px-3 py-1 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                      >
                        管理画面へ
                      </Link>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              <p>メンバー情報が見つかりません。</p>
              <p className="text-xs text-slate-500 mt-2">Auth ID: {user.id}</p>
              <p className="text-xs text-slate-500">Email: {user.email}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
