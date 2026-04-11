'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function deleteBoard(formData: FormData) {
  const id = formData.get('id');
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from('boards').delete().eq('id', String(id));
  if (error) {
    redirect('/admin/boards?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/boards');
  redirect('/admin/boards');
}

export async function deleteReply(formData: FormData) {
  const id = formData.get('id');
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.from('board_replies').delete().eq('id', String(id));
  if (error) {
    redirect('/admin/boards?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/admin/boards');
  redirect('/admin/boards');
}
