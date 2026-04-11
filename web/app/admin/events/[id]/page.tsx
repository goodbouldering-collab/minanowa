import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveEvent } from '../actions';
import type { EventRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const isNew = params.id === 'new';
  let event: EventRow | null = null;

  if (!isNew) {
    const supabase = createClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    if (!data) notFound();
    event = data;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/events" className="text-sm text-slate-500 hover:text-slate-700">
          ← 一覧
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? 'イベント新規作成' : 'イベント編集'}
        </h1>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}

      <form action={saveEvent} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        {!isNew && <input type="hidden" name="id" value={event!.id} />}

        <Field label="タイトル" name="title" required defaultValue={event?.title ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="日付"
            name="date"
            type="date"
            required
            defaultValue={event?.date ?? ''}
          />
          <Field
            label="時間"
            name="time"
            placeholder="例: 18:00-20:00"
            defaultValue={event?.time ?? ''}
          />
        </div>

        <Field label="場所" name="location" defaultValue={event?.location ?? ''} />
        <Field
          label="画像URL"
          name="image_url"
          placeholder="https://..."
          defaultValue={event?.image_url ?? ''}
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
            説明（一覧表示用）
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={event?.description ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="detailed_info" className="block text-sm font-medium text-slate-700 mb-1">
            詳細情報
          </label>
          <textarea
            id="detailed_info"
            name="detailed_info"
            rows={5}
            defaultValue={event?.detailed_info ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="定員"
            name="participants"
            type="number"
            defaultValue={event?.participants?.toString() ?? ''}
          />
          <Field label="参加費" name="fee" defaultValue={event?.fee ?? ''} />
        </div>

        <Field
          label="申込URL"
          name="application_url"
          placeholder="https://..."
          defaultValue={event?.application_url ?? ''}
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_past"
            defaultChecked={event?.is_past ?? false}
            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
          />
          終了済みとしてマーク
        </label>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700"
          >
            保存
          </button>
          <Link
            href="/admin/events"
            className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-600 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
      />
    </div>
  );
}
