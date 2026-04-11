import { createClient } from '@/lib/supabase/server';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteBoard, deleteReply } from './actions';
import type { BoardRow, BoardReplyRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminBoardsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: boardsData } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: repliesData } = await supabase
    .from('board_replies')
    .select('*')
    .order('created_at', { ascending: false });

  const boards = (boardsData ?? []) as BoardRow[];
  const replies = (repliesData ?? []) as BoardReplyRow[];

  const repliesByBoard = new Map<string, BoardReplyRow[]>();
  replies.forEach((r) => {
    if (!repliesByBoard.has(r.board_id)) repliesByBoard.set(r.board_id, []);
    repliesByBoard.get(r.board_id)!.push(r);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">掲示板</h1>
        <p className="text-sm text-slate-500 mt-1">
          スレッド {boards.length} 件 / 返信 {replies.length} 件
        </p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}

      <div className="space-y-4">
        {boards.map((board) => {
          const boardReplies = repliesByBoard.get(board.id) ?? [];
          return (
            <div
              key={board.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-medium text-slate-700">{board.author_name}</span>
                    <span>•</span>
                    <span>{new Date(board.created_at).toLocaleString('ja-JP')}</span>
                    {board.category && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full">
                          {board.category}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900">{board.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                    {board.content}
                  </p>
                </div>
                <form action={deleteBoard}>
                  <input type="hidden" name="id" value={board.id} />
                  <DeleteButton message="このスレッドを削除しますか？" />
                </form>
              </div>

              {boardReplies.length > 0 && (
                <div className="pl-4 border-l-2 border-slate-100 space-y-2">
                  {boardReplies.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 mb-0.5">
                          <span className="font-medium text-slate-700">{r.author_name}</span>
                          <span className="mx-1">•</span>
                          <span>{new Date(r.created_at).toLocaleString('ja-JP')}</span>
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap">{r.content}</p>
                      </div>
                      <form action={deleteReply}>
                        <input type="hidden" name="id" value={r.id} />
                        <DeleteButton message="この返信を削除しますか？" />
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {boards.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            掲示板の投稿がありません
          </div>
        )}
      </div>
    </div>
  );
}
