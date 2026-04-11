import type { Blog } from '@/types/domain';

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

export function BlogsSection({ blogs }: { blogs: Blog[] }) {
  return (
    <section id="blogs" className="py-16 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            お知らせ・レポート
          </h2>
          <p className="text-slate-600">
            交流会やコラボの様子をお届けします
          </p>
        </div>
        {blogs.length === 0 ? (
          <p className="text-center text-slate-500">記事はまだありません</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((b) => (
              <article
                key={b.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {b.imageUrl && (
                  <div className="aspect-video bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {b.category && (
                      <span className="text-xs px-2 py-0.5 bg-brand/10 text-brand rounded-full font-semibold">
                        {b.category}
                      </span>
                    )}
                    <p className="text-xs text-slate-500">{formatDate(b.date)}</p>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">
                    {b.title}
                  </h3>
                  {b.excerpt && (
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {b.excerpt}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
