'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function markRead(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = createClient();
  const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', id);
  if (error) {
    redirect('/admin/messages?error=' + encodeURIComponent(error.message));
  }
  revalidatePath('/admin/messages');
}

export async function markUnread(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = createClient();
  const { error } = await supabase.from('messages').update({ is_read: false }).eq('id', id);
  if (error) {
    redirect('/admin/messages?error=' + encodeURIComponent(error.message));
  }
  revalidatePath('/admin/messages');
}

export async function deleteMessage(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const supabase = createClient();
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) {
    redirect('/admin/messages?error=' + encodeURIComponent(error.message));
  }
  revalidatePath('/admin/messages');
}
