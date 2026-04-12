import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SITE_NAME } from '@/lib/constants';

const NAV_ITEMS = [
  { href: '/#about', label: 'みんなのWAとは' },
  { href: '/#events', label: '交流会・イベント' },
  { href: '/#blogs', label: '活動レポート' },
  { href: '/#members', label: 'メンバー' },
  { href: '/#board', label: '掲示板' },
  { href: '/#faq', label: 'よくある質問' },
  { href: '/#contact', label: 'お問い合わせ' },
];

export async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="font-bold text-brand-600 text-lg whitespace-nowrap">
          {SITE_NAME}
        </Link>
        <nav className="hidden lg:flex items-center gap-1 text-sm text-slate-600">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-full hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/me"
              className="text-sm px-4 py-1.5 bg-brand-600 text-white rounded-full font-medium hover:bg-brand-700 transition-colors"
            >
              マイページ
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm px-3 py-1.5 text-slate-700 hover:text-brand-700 transition-colors"
              >
                ログイン
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-1.5 bg-brand-600 text-white rounded-full font-medium hover:bg-brand-700 transition-colors"
              >
                無料登録
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
