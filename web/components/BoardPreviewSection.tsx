import Link from 'next/link';
import type { Board } from '@/types/domain';

function formatRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return new Date(d).toLocaleDateString('ja-JP');
}

export function BoardPreviewSection({ boards }: { boards: Board[] }) {
  return (
    <section id="board" className="py-16 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">掲示板</h2>
            <p className="text-slate-600 text-sm">
              悩み相談・コラボ・告知などいつでも仲間に発信
            </p>
          </div>
          <Link
            href="/board"
            className="text-sm px-4 py-2 bg-brand-600 text-white rounded-full font-medium hover:bg-brand-700 transition-colors whitespace-nowrap"
          >
            投稿・一覧 →
          </Link>
        </div>

        {boards.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            まだ投稿がありません
          </div>
        ) : (
          <div className="space-y-3">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/board#${b.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-card transition-shadow"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">{b.authorName}</span>
                  {b.category && (
                    <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">
                      {b.category}
                    </span>
                  )}
                  <span>·</span>
                  <span>{formatRelative(b.createdAt)}</span>
                </div>
                <h3 className="font-semibold text-sm text-slate-900 line-clamp-1">
                  {b.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.content}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-slate-500 bg-sky-50 border border-sky-100 rounded-xl py-3 px-4">
          💡 コラボ相談・お悩み共有・告知など何でもOK！メンバー同士で助け合いましょう
        </div>
      </div>
    </section>
  );
}
