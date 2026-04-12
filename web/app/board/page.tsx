import Link from 'next/link';
import { getAllBoards, getBoardRepliesByBoardIds } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { createBoardPost, createBoardReply } from './actions';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['コラボ募集', 'イベント企画', 'お知らせ', '質問', 'その他'];

function formatDateTime(d: string) {
  try {
    return new Date(d).toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const boards = await getAllBoards();
  const replies = await getBoardRepliesByBoardIds(boards.map((b) => b.id));
  const repliesByBoard = new Map<string, typeof replies>();
  replies.forEach((r) => {
    if (!repliesByBoard.has(r.boardId)) repliesByBoard.set(r.boardId, []);
    repliesByBoard.get(r.boardId)!.push(r);
  });

  return (
    <>
      <SiteHeader />
      <main className="bg-slate-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-6 text-sm">
            <Link href="/" className="text-slate-500 hover:text-brand-700">
              ← トップに戻る
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">掲示板</h1>
          <p className="text-slate-600 text-sm mb-8">
            悩み相談・コラボ・告知などいつでも仲間に発信
          </p>

          {searchParams.error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {searchParams.error}
            </div>
          )}

          {/* 投稿フォーム */}
          {user ? (
            <form
              action={createBoardPost}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card mb-8 space-y-3"
            >
              <h2 className="font-bold text-slate-900">新しく投稿する</h2>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">カテゴリ</label>
                <select
                  name="category"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  defaultValue={CATEGORIES[0]}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">タイトル</label>
                <input
                  name="title"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">内容</label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 text-white font-medium py-2.5 text-sm hover:bg-brand-700 transition-colors"
              >
                投稿する
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center mb-8">
              <p className="text-sm text-slate-600 mb-3">投稿するにはログインしてください</p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-brand-600 text-white rounded-full text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                ログイン
              </Link>
            </div>
          )}

          {/* 投稿一覧 */}
          <div className="space-y-4">
            {boards.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                まだ投稿がありません
              </div>
            ) : (
              boards.map((b) => {
                const boardReplies = repliesByBoard.get(b.id) ?? [];
                return (
                  <div
                    key={b.id}
                    id={b.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 scroll-mt-20"
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span className="font-medium text-slate-700">{b.authorName}</span>
                      {b.category && (
                        <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full">
                          {b.category}
                        </span>
                      )}
                      <span>·</span>
                      <time>{formatDateTime(b.createdAt)}</time>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{b.title}</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {b.content}
                    </p>

                    {boardReplies.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-slate-100 space-y-3">
                        {boardReplies.map((r) => (
                          <div key={r.id} className="text-sm">
                            <div className="text-xs text-slate-500 mb-0.5">
                              <span className="font-medium text-slate-700">{r.authorName}</span>
                              <span className="mx-1">·</span>
                              <time>{formatDateTime(r.createdAt)}</time>
                            </div>
                            <p className="text-slate-600 whitespace-pre-wrap">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {user && (
                      <form
                        action={createBoardReply}
                        className="mt-4 pt-3 border-t border-slate-100 flex gap-2"
                      >
                        <input type="hidden" name="board_id" value={b.id} />
                        <input
                          name="content"
                          required
                          placeholder="返信を書く..."
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                        >
                          返信
                        </button>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <SiteFooter />
      </main>
    </>
  );
}
