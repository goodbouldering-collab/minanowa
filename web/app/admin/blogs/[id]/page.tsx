import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveBlog } from '../actions';
import type { BlogRow } from '@/types/database';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['お知らせ', '活動レポート', '活動ムービー'];

export default async function EditBlogPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const isNew = params.id === 'new';
  let blog: BlogRow | null = null;

  if (!isNew) {
    const supabase = createClient();
    const { data } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    if (!data) notFound();
    blog = data;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/blogs" className="text-sm text-slate-500 hover:text-slate-700">
          ← 一覧
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? '記事新規作成' : '記事編集'}
        </h1>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}

      <form action={saveBlog} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        {!isNew && <input type="hidden" name="id" value={blog!.id} />}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
            タイトル<span className="text-rose-600 ml-1">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={blog?.title ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
              日付<span className="text-rose-600 ml-1">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={blog?.date ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
              カテゴリ
            </label>
            <select
              id="category"
              name="category"
              defaultValue={blog?.category ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white"
            >
              <option value="">未分類</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="author" className="block text-sm font-medium text-slate-700 mb-1">
            著者
          </label>
          <input
            id="author"
            name="author"
            defaultValue={blog?.author ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-slate-700 mb-1">
            画像URL
          </label>
          <input
            id="image_url"
            name="image_url"
            placeholder="https://..."
            defaultValue={blog?.image_url ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-slate-700 mb-1">
            概要（一覧表示用）
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            rows={2}
            defaultValue={blog?.excerpt ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">
            本文
          </label>
          <textarea
            id="content"
            name="content"
            rows={10}
            defaultValue={blog?.content ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700"
          >
            保存
          </button>
          <Link
            href="/admin/blogs"
            className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
