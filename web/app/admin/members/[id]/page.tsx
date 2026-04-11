import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveMember } from '../actions';
import type { MemberRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function EditMemberPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!data) notFound();
  const member = data as MemberRow;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/members" className="text-sm text-slate-500 hover:text-slate-700">
          ← 一覧
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">メンバー編集</h1>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}

      <form action={saveMember} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <input type="hidden" name="id" value={member.id} />

        <div className="text-xs text-slate-500 bg-slate-50 rounded p-3">
          メールアドレス: <span className="font-mono">{member.email}</span>
          （Supabase Auth で管理）
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="名前" name="name" required defaultValue={member.name} />
          <Field label="ふりがな" name="furigana" defaultValue={member.furigana ?? ''} />
        </div>

        <Field label="事業名" name="business" defaultValue={member.business ?? ''} />

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="業種"
            name="business_category"
            defaultValue={member.business_category ?? ''}
          />
          <Field label="電話" name="phone" defaultValue={member.phone ?? ''} />
        </div>

        <Field label="地域" name="location" defaultValue={member.location ?? ''} />

        <div>
          <label htmlFor="introduction" className="block text-sm font-medium text-slate-700 mb-1">
            紹介文
          </label>
          <textarea
            id="introduction"
            name="introduction"
            rows={4}
            defaultValue={member.introduction ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <Field
          label="アバター画像URL"
          name="avatar_url"
          defaultValue={member.avatar_url ?? ''}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="ホームページ" name="homepage" defaultValue={member.homepage ?? ''} />
          <Field label="Instagram" name="instagram" defaultValue={member.instagram ?? ''} />
        </div>

        <Field label="Webサイト" name="website" defaultValue={member.website ?? ''} />
        <Field
          label="Google Map URL"
          name="google_map_url"
          defaultValue={member.google_map_url ?? ''}
        />

        <div className="flex gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_public"
              defaultChecked={member.is_public}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            一般公開
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_admin"
              defaultChecked={member.is_admin}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            管理者権限
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700"
          >
            保存
          </button>
          <Link
            href="/admin/members"
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
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
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
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
      />
    </div>
  );
}
