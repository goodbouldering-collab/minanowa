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

export async function saveBlog(formData: FormData) {
  const supabase = createClient();
  const id = s(formData, 'id');

  const payload = {
    title: s(formData, 'title') ?? '',
    date: s(formData, 'date') ?? '',
    category: s(formData, 'category'),
    excerpt: s(formData, 'excerpt'),
    content: s(formData, 'content'),
    author: s(formData, 'author'),
    image_url: s(formData, 'image_url'),
  };

  if (!payload.title || !payload.date) {
    redirect('/admin/blogs?error=' + encodeURIComponent('タイトルと日付は必須です'));
  }

  if (id) {
    const { error } = await supabase.from('blogs').update(payload).eq('id', id);
    if (error) {
      redirect('/admin/blogs/' + id + '?error=' + encodeURIComponent(error.message));
    }
  } else {
    const { error } = await supabase.from('blogs').insert(payload);
    if (error) {
      redirect('/admin/blogs/new?error=' + encodeURIComponent(error.message));
    }
  }

  revalidatePath('/admin/blogs');
  revalidatePath('/');
  redirect('/admin/blogs');
}

export async function deleteBlog(formData: FormData) {
  const id = s(formData, 'id');
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from('blogs').delete().eq('id', id);
  if (error) {
    redirect('/admin/blogs?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/blogs');
  revalidatePath('/');
  redirect('/admin/blogs');
}
