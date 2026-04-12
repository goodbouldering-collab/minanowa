import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEvent } from '@/lib/queries';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const event = await getEvent(params.id);
  if (!event) return { title: 'イベントが見つかりません' };
  return {
    title: event.title,
    description: event.description ?? undefined,
    openGraph: {
      title: event.title,
      description: event.description ?? undefined,
      images: event.imageUrl ? [event.imageUrl] : undefined,
      type: 'article',
    },
  };
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  } catch {
    return d;
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEvent(params.id);
  if (!event) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.date + (event.time ? `T${event.time}` : ''),
    image: event.imageUrl ? [event.imageUrl] : undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location ?? '彦根市',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.location ?? '彦根市',
        addressRegion: '滋賀県',
        addressCountry: 'JP',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: event.fee
      ? {
          '@type': 'Offer',
          price: event.fee,
          priceCurrency: 'JPY',
          availability: 'https://schema.org/InStock',
        }
      : undefined,
  };

  return (
    <>
      <SiteHeader />
      <main className="bg-white">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-6 text-sm">
            <Link href="/#events" className="text-slate-500 hover:text-brand-700">
              ← イベント一覧に戻る
            </Link>
          </div>
          {event.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full aspect-video object-cover rounded-2xl mb-6"
            />
          )}
          {event.isPast && (
            <p className="inline-block text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full mb-3">
              終了したイベント
            </p>
          )}
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4">
            {event.title}
          </h1>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div>
              <dt className="text-xs text-slate-500 font-medium mb-0.5">📅 日時</dt>
              <dd>
                {formatDate(event.date)}
                {event.time && ` ${event.time}`}
              </dd>
            </div>
            {event.location && (
              <div>
                <dt className="text-xs text-slate-500 font-medium mb-0.5">📍 場所</dt>
                <dd>{event.location}</dd>
              </div>
            )}
            {event.fee && (
              <div>
                <dt className="text-xs text-slate-500 font-medium mb-0.5">💰 参加費</dt>
                <dd>{event.fee}</dd>
              </div>
            )}
            {event.participants !== null && (
              <div>
                <dt className="text-xs text-slate-500 font-medium mb-0.5">👥 定員</dt>
                <dd>{event.participants}名</dd>
              </div>
            )}
          </dl>
          {event.description && (
            <p className="text-base text-slate-700 leading-relaxed mb-6">
              {event.description}
            </p>
          )}
          {event.detailedInfo && (
            <div className="whitespace-pre-wrap text-slate-800 leading-relaxed mb-8">
              {event.detailedInfo}
            </div>
          )}
          {!event.isPast && event.applicationUrl && (
            <a
              href={event.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-brand-600 text-white rounded-full font-semibold shadow-lifted hover:bg-brand-700 transition-colors"
            >
              申し込む →
            </a>
          )}
        </article>
        <SiteFooter />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
