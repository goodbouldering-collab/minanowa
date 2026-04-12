'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/constants';

export async function requestReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    redirect('/forgot?error=' + encodeURIComponent('メールアドレスを入力してください'));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/me/password`,
  });

  if (error) {
    redirect('/forgot?error=' + encodeURIComponent(error.message));
  }

  redirect('/forgot?sent=1');
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 6) {
    redirect('/me/password?error=' + encodeURIComponent('6文字以上にしてください'));
  }
  if (password !== confirm) {
    redirect('/me/password?error=' + encodeURIComponent('確認用と一致しません'));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect('/me/password?error=' + encodeURIComponent(error.message));
  }

  redirect('/me?saved=1');
}
