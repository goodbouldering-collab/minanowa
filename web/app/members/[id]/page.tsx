import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMember } from '@/lib/queries';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const member = await getMember(params.id);
  if (!member || !member.isPublic) return { title: 'メンバー' };
  return {
    title: member.name,
    description: member.introduction ?? member.business ?? undefined,
    openGraph: {
      title: member.name,
      description: member.introduction ?? undefined,
      images: member.avatarUrl ? [member.avatarUrl] : undefined,
    },
  };
}

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const member = await getMember(params.id);
  if (!member || !member.isPublic) notFound();

  return (
    <>
      <SiteHeader />
      <main className="bg-slate-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-6 text-sm">
            <Link href="/members" className="text-slate-500 hover:text-brand-700">
              ← メンバー一覧に戻る
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-slate-200 p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-32 h-32 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                {member.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-black text-slate-900">{member.name}</h1>
                {member.furigana && (
                  <p className="text-xs text-slate-500 mt-0.5">{member.furigana}</p>
                )}
                {member.profession && (
                  <p className="text-sm text-slate-700 mt-2 font-medium">
                    {member.profession}
                  </p>
                )}
                {member.business && (
                  <p className="text-sm text-slate-600 mt-1">{member.business}</p>
                )}
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                  {member.businessCategory && (
                    <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full font-semibold">
                      {member.businessCategory}
                    </span>
                  )}
                  {member.location && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      📍 {member.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {member.introduction && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h2 className="font-bold text-slate-900 mb-2 text-sm">自己紹介</h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {member.introduction}
                </p>
              </div>
            )}

            {member.skills && member.skills.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold text-slate-900 mb-2 text-sm">スキル</h2>
                <div className="flex flex-wrap gap-2">
                  {member.skills.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {member.website && (
                <a
                  href={member.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-center text-slate-700 transition-colors"
                >
                  🌐 ウェブサイト
                </a>
              )}
              {member.instagram && (
                <a
                  href={
                    member.instagram.startsWith('http')
                      ? member.instagram
                      : `https://instagram.com/${member.instagram}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-pink-50 hover:bg-pink-100 rounded-lg text-center text-pink-700 transition-colors"
                >
                  📸 Instagram
                </a>
              )}
              {member.googleMapUrl && (
                <a
                  href={member.googleMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-center text-emerald-700 transition-colors"
                >
                  🗺 Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
