import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { MemberRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('members')
    .select('*')
    .order('name');
  const members = (data ?? []) as MemberRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">メンバー</h1>
          <p className="text-sm text-slate-500 mt-1">登録メンバー {members.length} 名</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">画像</th>
              <th className="px-4 py-3 text-left font-medium">名前</th>
              <th className="px-4 py-3 text-left font-medium">事業</th>
              <th className="px-4 py-3 text-left font-medium">業種</th>
              <th className="px-4 py-3 text-left font-medium">メール</th>
              <th className="px-4 py-3 text-left font-medium">公開</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  {m.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.avatar_url}
                      alt={m.name}
                      className="w-10 h-10 object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      {m.name.charAt(0)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {m.name}
                  {m.is_admin && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-rose-600 text-white rounded">
                      ADMIN
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {m.business ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">
                  {m.business_category ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{m.email}</td>
                <td className="px-4 py-3">
                  {m.is_public ? (
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                      公開
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                      非公開
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                  >
                    編集
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
