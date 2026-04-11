import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteEvent } from './actions';
import type { EventRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false });
  const events = (data ?? []) as EventRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">イベント</h1>
          <p className="text-sm text-slate-500 mt-1">交流会・勉強会の管理</p>
        </div>
        <Link
          href="/admin/events/new"
          className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700"
        >
          + 新規作成
        </Link>
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
              <th className="px-4 py-3 text-left font-medium">タイトル</th>
              <th className="px-4 py-3 text-left font-medium">日時</th>
              <th className="px-4 py-3 text-left font-medium">場所</th>
              <th className="px-4 py-3 text-left font-medium">状態</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  {e.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={e.image_url}
                      alt={e.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                  {e.title}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                  {e.date}
                  {e.time && <span className="block text-slate-400">{e.time}</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs max-w-[10rem] truncate">
                  {e.location ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {e.is_past ? (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      終了
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                      公開中
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/events/${e.id}`}
                      className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      編集
                    </Link>
                    <form action={deleteEvent} className="inline">
                      <input type="hidden" name="id" value={e.id} />
                      <DeleteButton message={`「${e.title}」を削除しますか？`} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(events ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  イベントがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
