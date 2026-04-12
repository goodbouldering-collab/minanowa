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

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const payload = {
    name: s(formData, 'name') ?? '',
    furigana: s(formData, 'furigana'),
    phone: s(formData, 'phone'),
    location: s(formData, 'location'),
    business: s(formData, 'business'),
    business_category: s(formData, 'business_category'),
    profession: s(formData, 'profession'),
    introduction: s(formData, 'introduction'),
    website: s(formData, 'website'),
    instagram: s(formData, 'instagram'),
    google_map_url: s(formData, 'google_map_url'),
    is_public: formData.get('is_public') === 'on',
  };

  if (!payload.name) {
    redirect('/me?error=' + encodeURIComponent('お名前は必須です'));
  }

  const { error } = await supabase.from('members').update(payload).eq('id', user.id);

  if (error) {
    redirect('/me?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/me');
  revalidatePath('/');
  redirect('/me?saved=1');
}
