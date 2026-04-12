import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { MemberRow } from '@/types/database';

export const dynamic = 'force-dynamic';

async function getCounts() {
  const supabase = createClient();
  const [members, events, blogs, boards, unreadMessages] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('blogs').select('*', { count: 'exact', head: true }),
    supabase.from('boards').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
  ]);
  return {
    members: members.count ?? 0,
    events: events.count ?? 0,
    blogs: blogs.count ?? 0,
    boards: boards.count ?? 0,
    unreadMessages: unreadMessages.count ?? 0,
  };
}

async function getRecentMembers(): Promise<MemberRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  return (data ?? []) as MemberRow[];
}

export default async function AdminDashboard() {
  const [counts, recentMembers] = await Promise.all([
    getCounts(),
    getRecentMembers(),
  ]);

  const stats = [
    { label: 'メンバー', value: counts.members, icon: '👥', href: '/admin/members', color: 'bg-rose-50 text-rose-700' },
    { label: 'イベント', value: counts.events, icon: '📅', href: '/admin/events', color: 'bg-amber-50 text-amber-700' },
    { label: 'お知らせ・レポート', value: counts.blogs, icon: '📰', href: '/admin/blogs', color: 'bg-emerald-50 text-emerald-700' },
    { label: '掲示板', value: counts.boards, icon: '💬', href: '/admin/boards', color: 'bg-sky-50 text-sky-700' },
    { label: '未読お問い合わせ', value: counts.unreadMessages, icon: '✉️', href: '/admin/messages', color: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-1">サイト全体の状況を確認できます</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">最新メンバー</h2>
        {recentMembers.length === 0 ? (
          <p className="text-sm text-slate-500">登録メンバーがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">名前</th>
                  <th className="pb-2 font-medium">事業</th>
                  <th className="pb-2 font-medium">業種</th>
                  <th className="pb-2 font-medium">登録日</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 font-medium text-slate-900">{m.name}</td>
                    <td className="py-3 text-slate-600">{m.business ?? '—'}</td>
                    <td className="py-3 text-slate-600">{m.business_category ?? '—'}</td>
                    <td className="py-3 text-slate-500 text-xs">
                      {(() => {
                        const d = m.join_date ?? m.created_at;
                        return d ? new Date(d).toLocaleDateString('ja-JP') : '—';
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
