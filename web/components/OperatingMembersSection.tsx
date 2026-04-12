import type { Member } from '@/types/domain';

export function OperatingMembersSection({ members }: { members: Member[] }) {
  return (
    <section id="opMembers" className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">運営メンバー</h2>
          <p className="text-slate-600 text-sm">
            運営に関わるとITスキル・企画力が身につきます
          </p>
        </div>

        {members.length === 0 ? (
          <p className="text-center text-sm text-slate-500">運営メンバーは準備中です</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {members.map((m) => (
              <div
                key={m.id}
                className="text-center bg-white rounded-2xl border border-slate-200 p-4 shadow-card"
              >
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-slate-100 overflow-hidden">
                  {m.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.avatarUrl}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl">
                      {m.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="font-bold text-xs text-slate-900 line-clamp-1">{m.name}</p>
                {m.profession && (
                  <p className="text-[10px] text-slate-500 line-clamp-1">{m.profession}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="max-w-xl mx-auto text-center p-5 bg-brand-50 border border-brand-200 border-dashed rounded-2xl">
          <p className="font-bold text-sm text-brand-800 mb-1">📢 運営メンバー募集中！</p>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            サイト制作・SNS運用・イベント企画など、一緒に活動しませんか？
            <br />
            経験不問 ── やる気があればOKです。
          </p>
          <a
            href="#contact"
            className="inline-block text-xs px-4 py-2 bg-brand-600 text-white rounded-full font-medium hover:bg-brand-700 transition-colors"
          >
            お問い合わせから応募する
          </a>
        </div>
      </div>
    </section>
  );
}
