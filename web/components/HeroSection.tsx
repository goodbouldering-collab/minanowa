import Link from 'next/link';
import type { SiteSettings } from '@/types/domain';
import { SITE_NAME } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

export async function HeroSection({ settings }: { settings: SiteSettings | null }) {
  const title = settings?.heroTitle ?? 'つながりが地元を熱くする';
  const subtitle =
    settings?.heroSubtitle ??
    '国宝・彦根城のおひざ元から、地域の事業者がつながる交流の場';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="relative bg-gradient-to-br from-rose-50 via-amber-50 to-rose-100 py-20 px-6">
      <div className="absolute top-4 right-6">
        {user ? (
          <Link
            href="/me"
            className="text-sm px-4 py-2 bg-white/80 hover:bg-white rounded-full text-slate-700 font-medium shadow-sm transition-colors"
          >
            マイページ
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm px-4 py-2 bg-white/80 hover:bg-white rounded-full text-slate-700 font-medium shadow-sm transition-colors"
          >
            ログイン
          </Link>
        )}
      </div>
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-semibold tracking-widest text-brand mb-4">
          {SITE_NAME}
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
          {title}
        </h1>
        <p className="text-base md:text-lg text-slate-600 mb-8">{subtitle}</p>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-700">
          <span className="bg-white/70 px-3 py-1.5 rounded-full">🤝 仲間がお客さんに</span>
          <span className="bg-white/70 px-3 py-1.5 rounded-full">🎁 メンバー割引</span>
          <span className="bg-white/70 px-3 py-1.5 rounded-full">🚀 コラボがすぐ形に</span>
          <span className="bg-white/70 px-3 py-1.5 rounded-full">📍 彦根市発・登録無料</span>
        </div>
      </div>
    </section>
  );
}
