'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function submitContact(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (!name || !email || !message) {
    redirect('/?contact=missing#contact');
  }

  const supabase = createClient();
  const { error } = await supabase.from('messages').insert({
    name,
    email,
    message,
  });

  if (error) {
    redirect('/?contact=error#contact');
  }

  redirect('/?contact=sent#contact');
}
