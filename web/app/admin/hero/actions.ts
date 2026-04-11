'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function s(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

export async function saveHero(formData: FormData) {
  const supabase = createClient();

  const payload = {
    id: 1,
    hero_title: s(formData, 'hero_title'),
    hero_subtitle: s(formData, 'hero_subtitle'),
    about_title: s(formData, 'about_title'),
    about_text: s(formData, 'about_text'),
    instagram_account: s(formData, 'instagram_account'),
    stripe_publishable_key: s(formData, 'stripe_publishable_key'),
    google_client_id: s(formData, 'google_client_id'),
  };

  const { error } = await supabase.from('site_settings').upsert(payload);
  if (error) {
    redirect('/admin/hero?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/hero');
  revalidatePath('/');
  redirect('/admin/hero?saved=1');
}
