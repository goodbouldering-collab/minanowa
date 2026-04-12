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
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-emerald-50 to-amber-50 py-24 px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-brand-300/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-accent-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <p className="text-sm font-bold tracking-[0.25em] text-brand-600 mb-6">
          {SITE_NAME}
        </p>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-[1.15]">
          {title}
        </h1>
        <p className="text-base md:text-lg text-slate-700 mb-8 leading-relaxed">
          {subtitle}
        </p>

        <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-700 mb-10">
          <span className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white shadow-sm">
            🤝 仲間がお客さんに
          </span>
          <span className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white shadow-sm">
            🎁 メンバー割引
          </span>
          <span className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white shadow-sm">
            🚀 コラボがすぐ形に
          </span>
          <span className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white shadow-sm">
            📍 彦根市発・登録無料
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {user ? (
            <Link
              href="/me"
              className="inline-block px-6 py-3 bg-brand-600 text-white rounded-full font-semibold shadow-lifted hover:bg-brand-700 transition-colors"
            >
              マイページへ
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-block px-6 py-3 bg-brand-600 text-white rounded-full font-semibold shadow-lifted hover:bg-brand-700 transition-colors"
              >
                無料で会員登録
              </Link>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-white/80 text-slate-800 rounded-full font-semibold border border-slate-200 hover:bg-white transition-colors"
              >
                ログイン
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
