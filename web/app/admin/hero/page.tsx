import { createClient } from '@/lib/supabase/server';
import { saveHero } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminHeroPage({
  searchParams,
}: {
  searchParams: { error?: string; saved?: string };
}) {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">トップページ設定</h1>
        <p className="text-sm text-slate-500 mt-1">サイト全体の表示内容</p>
      </div>

      {searchParams.error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {searchParams.error}
        </div>
      )}
      {searchParams.saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          保存しました
        </div>
      )}

      <form action={saveHero} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <Field
          label="ヒーロータイトル"
          name="hero_title"
          defaultValue={settings?.hero_title ?? ''}
        />
        <Field
          label="ヒーローサブタイトル"
          name="hero_subtitle"
          defaultValue={settings?.hero_subtitle ?? ''}
        />
        <Field
          label="アバウトタイトル"
          name="about_title"
          defaultValue={settings?.about_title ?? ''}
        />

        <div>
          <label htmlFor="about_text" className="block text-sm font-medium text-slate-700 mb-1">
            アバウトテキスト
          </label>
          <textarea
            id="about_text"
            name="about_text"
            rows={4}
            defaultValue={settings?.about_text ?? ''}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </div>

        <Field
          label="Instagram アカウント"
          name="instagram_account"
          placeholder="例: minnano_wa.shiga"
          defaultValue={settings?.instagram_account ?? ''}
        />

        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h3 className="text-sm font-bold text-slate-700">外部サービス連携</h3>
          <Field
            label="Stripe Publishable Key"
            name="stripe_publishable_key"
            placeholder="pk_live_... または pk_test_..."
            defaultValue={settings?.stripe_publishable_key ?? ''}
          />
          <Field
            label="Google Client ID"
            name="google_client_id"
            placeholder="xxxxxxxx.apps.googleusercontent.com"
            defaultValue={settings?.google_client_id ?? ''}
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
      />
    </div>
  );
}
