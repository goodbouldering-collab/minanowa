'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const furigana = String(formData.get('furigana') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const location = String(formData.get('location') ?? '').trim() || null;
  const business = String(formData.get('business') ?? '').trim() || null;
  const businessCategory =
    String(formData.get('business_category') ?? '').trim() || null;
  const profession = String(formData.get('profession') ?? '').trim() || null;
  const introduction = String(formData.get('introduction') ?? '').trim() || null;
  const website = String(formData.get('website') ?? '').trim() || null;
  const instagram = String(formData.get('instagram') ?? '').trim() || null;

  if (!email || !password || !name) {
    redirect(
      '/register?error=' +
        encodeURIComponent('メールアドレス・パスワード・お名前は必須です')
    );
  }

  if (password.length < 6) {
    redirect(
      '/register?error=' + encodeURIComponent('パスワードは6文字以上にしてください')
    );
  }

  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (authError || !authData.user) {
    redirect(
      '/register?error=' +
        encodeURIComponent(
          '登録に失敗しました: ' + (authError?.message ?? '不明なエラー')
        )
    );
  }

  // members 行を service_role で upsert
  const admin = createAdminClient();
  const { error: memberError } = await admin.from('members').upsert({
    id: authData.user.id,
    email,
    name,
    furigana,
    phone,
    location,
    business,
    business_category: businessCategory,
    profession,
    introduction,
    website,
    instagram,
    is_public: true,
    is_admin: false,
    join_date: new Date().toISOString().slice(0, 10),
  });

  if (memberError) {
    redirect(
      '/register?error=' +
        encodeURIComponent(
          'プロフィールの保存に失敗しました: ' + memberError.message
        )
    );
  }

  revalidatePath('/', 'layout');
  redirect('/me');
}
