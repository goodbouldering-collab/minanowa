import Link from 'next/link';
import type { Member } from '@/types/domain';

export function MembersSection({ members }: { members: Member[] }) {
  return (
    <section id="members" className="py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">メンバー</h2>
            <p className="text-slate-600 text-sm">
              彦根を中心に活躍する事業者たち。🎁マーク付きメンバーは相互利用で割引・特典あり！
            </p>
          </div>
          <Link
            href="/members"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap"
          >
            もっと見る →
          </Link>
        </div>
        {members.length === 0 ? (
          <p className="text-center text-slate-500">公開メンバーはまだいません</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                {m.business && (
                  <p className="text-xs text-slate-500 mb-1 line-clamp-1">
                    {m.business}
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
    </section>
  );
}
