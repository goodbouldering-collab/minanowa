import type { Event } from '@/types/domain';

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

export function EventsSection({ events }: { events: Event[] }) {
  return (
    <section id="events" className="py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            交流会・イベント
          </h2>
          <p className="text-slate-600">
            ここから仲間・お客さん・コラボが生まれます
          </p>
        </div>
        {events.length === 0 ? (
          <p className="text-center text-slate-500">予定中のイベントはありません</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((e) => (
              <article
                key={e.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {e.imageUrl && (
                  <div className="aspect-video bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.imageUrl}
                      alt={e.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold text-brand mb-2">
                    {formatDate(e.date)}
                    {e.time && ` ${e.time}`}
                  </p>
                  <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">
                    {e.title}
                  </h3>
                  {e.location && (
                    <p className="text-sm text-slate-500 mb-2">📍 {e.location}</p>
                  )}
                  {e.description && (
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {e.description}
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
