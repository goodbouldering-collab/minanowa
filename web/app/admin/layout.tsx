import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '../login/actions';

export const dynamic = 'force-dynamic';

const navItems = [
  { href: '/admin', label: 'ダッシュボード', icon: '📊' },
  { href: '/admin/hero', label: 'トップページ', icon: '🏠' },
  { href: '/admin/events', label: 'イベント', icon: '📅' },
  { href: '/admin/blogs', label: 'お知らせ・レポート', icon: '📰' },
  { href: '/admin/members', label: 'メンバー', icon: '👥' },
  { href: '/admin/boards', label: '掲示板', icon: '💬' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=' + encodeURIComponent('管理画面にはログインが必要です'));
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, name, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!member?.is_admin) {
    redirect('/me');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-bold text-slate-900">
              みんなのWA
            </Link>
            <span className="text-[10px] px-2 py-0.5 bg-rose-600 text-white rounded-full font-bold tracking-wider">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{member.name}</span>
            <Link
              href="/"
              className="text-slate-500 hover:text-slate-700"
            >
              サイトへ
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-slate-500 hover:text-rose-600"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-sm text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-t-lg whitespace-nowrap border-b-2 border-transparent hover:border-rose-300 transition-colors"
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
