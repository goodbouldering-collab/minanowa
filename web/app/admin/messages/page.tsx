import { createClient } from '@/lib/supabase/server';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { markRead, markUnread, deleteMessage } from './actions';
import type { MessageRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  const messages = (data ?? []) as MessageRow[];
  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">お問い合わせ</h1>
        <p className="text-sm text-slate-500 mt-1">
          全 {messages.length} 件 / 未読 {unreadCount} 件
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border p-5 space-y-2 ${
              m.is_read
                ? 'bg-white border-slate-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  {!m.is_read && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full font-bold">
                      未読
                    </span>
                  )}
                  <span>{new Date(m.created_at).toLocaleString('ja-JP')}</span>
                </div>
                <div className="font-bold text-slate-900">{m.name}</div>
                <a
                  href={`mailto:${m.email}`}
                  className="text-sm text-rose-600 hover:underline"
                >
                  {m.email}
                </a>
                <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                  {m.message}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <form action={m.is_read ? markUnread : markRead}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 whitespace-nowrap"
                  >
                    {m.is_read ? '未読に戻す' : '既読にする'}
                  </button>
                </form>
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={m.id} />
                  <DeleteButton message="このお問い合わせを削除しますか？" />
                </form>
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            お問い合わせはまだありません
          </div>
        )}
      </div>
    </div>
  );
}
