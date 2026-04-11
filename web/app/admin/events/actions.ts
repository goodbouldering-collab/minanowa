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

function num(formData: FormData, key: string): number | null {
  const v = s(formData, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

export async function saveEvent(formData: FormData) {
  const supabase = createClient();
  const id = s(formData, 'id');

  const payload = {
    title: s(formData, 'title') ?? '',
    date: s(formData, 'date') ?? '',
    time: s(formData, 'time'),
    location: s(formData, 'location'),
    description: s(formData, 'description'),
    detailed_info: s(formData, 'detailed_info'),
    participants: num(formData, 'participants'),
    fee: s(formData, 'fee'),
    image_url: s(formData, 'image_url'),
    application_url: s(formData, 'application_url'),
    is_past: bool(formData, 'is_past'),
  };

  if (!payload.title || !payload.date) {
    redirect('/admin/events?error=' + encodeURIComponent('タイトルと日付は必須です'));
  }

  if (id) {
    const { error } = await supabase.from('events').update(payload).eq('id', id);
    if (error) {
      redirect('/admin/events/' + id + '?error=' + encodeURIComponent(error.message));
    }
  } else {
    const { error } = await supabase.from('events').insert(payload);
    if (error) {
      redirect('/admin/events/new?error=' + encodeURIComponent(error.message));
    }
  }

  revalidatePath('/admin/events');
  revalidatePath('/');
  redirect('/admin/events');
}

export async function deleteEvent(formData: FormData) {
  const id = s(formData, 'id');
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) {
    redirect('/admin/events?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/events');
  revalidatePath('/');
  redirect('/admin/events');
}
