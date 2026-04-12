import Link from 'next/link';
import { getPublicMembers } from '@/lib/queries';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export default async function MembersListPage() {
  const members = await getPublicMembers();

  return (
    <>
      <SiteHeader />
      <main className="bg-slate-50 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-6 text-sm">
            <Link href="/" className="text-slate-500 hover:text-brand-700">
              ← トップに戻る
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">メンバー一覧</h1>
          <p className="text-slate-600 text-sm mb-8">
            彦根を中心に活躍する事業者 {members.length} 名
          </p>

          {members.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              公開メンバーがいません
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {members.map((m) => (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="bg-white rounded-2xl shadow-card border border-slate-200 p-4 hover:shadow-lifted transition-shadow text-center block"
                >
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-slate-100 overflow-hidden">
                    {m.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xl">
                        {m.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mb-1">{m.name}</h3>
                  {m.profession && (
                    <p className="text-xs text-slate-500 line-clamp-1 mb-1">
                      {m.profession}
                    </p>
                  )}
                  {m.businessCategory && (
                    <span className="inline-block text-[10px] px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">
                      {m.businessCategory}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
