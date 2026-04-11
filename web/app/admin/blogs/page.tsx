import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteBlog } from './actions';
import type { BlogRow } from '@/types/database';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['お知らせ', '活動レポート', '活動ムービー'];

export default async function AdminBlogsPage({
  searchParams,
}: {
  searchParams: { error?: string; category?: string };
}) {
  const supabase = createClient();
  const query = supabase.from('blogs').select('*').order('date', { ascending: false });
  if (searchParams.category) {
    query.eq('category', searchParams.category);
  }
  const { data } = await query;
  const blogs = (data ?? []) as BlogRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">お知らせ・レポート</h1>
          <p className="text-sm text-slate-500 mt-1">記事の管理</p>
        </div>
        <Link
          href="/admin/blogs/new"
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

      <div className="flex gap-2 flex-wrap">
        <Link
          href="/admin/blogs"
          className={`text-xs px-3 py-1.5 rounded-full ${
            !searchParams.category
              ? 'bg-rose-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          全て
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/admin/blogs?category=${encodeURIComponent(cat)}`}
            className={`text-xs px-3 py-1.5 rounded-full ${
              searchParams.category === cat
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">画像</th>
              <th className="px-4 py-3 text-left font-medium">タイトル</th>
              <th className="px-4 py-3 text-left font-medium">カテゴリ</th>
              <th className="px-4 py-3 text-left font-medium">日付</th>
              <th className="px-4 py-3 text-left font-medium">著者</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {blogs.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  {b.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={b.image_url}
                      alt={b.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                  {b.title}
                </td>
                <td className="px-4 py-3">
                  {b.category && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                      {b.category}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{b.date}</td>
                <td className="px-4 py-3 text-slate-600 text-xs">{b.author ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/blogs/${b.id}`}
                      className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                    >
                      編集
                    </Link>
                    <form action={deleteBlog} className="inline">
                      <input type="hidden" name="id" value={b.id} />
                      <DeleteButton message={`「${b.title}」を削除しますか？`} />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(blogs ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  記事がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
