import type { Member } from '@/types/domain';

export function MembersSection({ members }: { members: Member[] }) {
  return (
    <section id="members" className="py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">メンバー</h2>
          <p className="text-slate-600">
            彦根を中心に活躍する事業者たち
          </p>
        </div>
        {members.length === 0 ? (
          <p className="text-center text-slate-500">公開メンバーはまだいません</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {members.map((m) => (
              <article
                key={m.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow text-center"
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
                  <span className="inline-block text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {m.businessCategory}
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
