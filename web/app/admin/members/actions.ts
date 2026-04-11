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

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

export async function saveMember(formData: FormData) {
  const supabase = createClient();
  const id = s(formData, 'id');
  if (!id) {
    redirect('/admin/members?error=' + encodeURIComponent('IDが指定されていません'));
  }

  const payload = {
    name: s(formData, 'name') ?? '',
    furigana: s(formData, 'furigana'),
    phone: s(formData, 'phone'),
    business: s(formData, 'business'),
    business_category: s(formData, 'business_category'),
    introduction: s(formData, 'introduction'),
    avatar_url: s(formData, 'avatar_url'),
    location: s(formData, 'location'),
    website: s(formData, 'website'),
    instagram: s(formData, 'instagram'),
    homepage: s(formData, 'homepage'),
    google_map_url: s(formData, 'google_map_url'),
    is_public: bool(formData, 'is_public'),
    is_admin: bool(formData, 'is_admin'),
  };

  const { error } = await (supabase.from('members') as any).update(payload).eq('id', id);
  if (error) {
    redirect('/admin/members/' + id + '?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/members');
  revalidatePath('/');
  redirect('/admin/members');
}
