'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createBoardPost(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=' + encodeURIComponent('投稿にはログインが必要です'));
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (!member) {
    redirect('/me?error=' + encodeURIComponent('メンバー情報が見つかりません'));
  }

  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim() || null;
  const mentionToId = String(formData.get('mention_to_id') ?? '').trim() || null;
  const mentionToName =
    String(formData.get('mention_to_name') ?? '').trim() || null;

  if (!title || !content) {
    redirect('/board?error=' + encodeURIComponent('タイトルと内容は必須です'));
  }

  const { error } = await supabase.from('boards').insert({
    author_id: member.id,
    author_name: member.name,
    author_avatar: member.avatar_url,
    title,
    content,
    category,
    mention_to_id: mentionToId,
    mention_to_name: mentionToName,
  });

  if (error) {
    redirect('/board?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/board');
  revalidatePath('/');
  redirect('/board');
}

export async function createBoardReply(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=' + encodeURIComponent('返信にはログインが必要です'));
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (!member) {
    redirect('/me?error=' + encodeURIComponent('メンバー情報が見つかりません'));
  }

  const boardId = String(formData.get('board_id') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();

  if (!boardId || !content) {
    redirect('/board?error=' + encodeURIComponent('内容が空です'));
  }

  const { error } = await supabase.from('board_replies').insert({
    board_id: boardId,
    author_id: member.id,
    author_name: member.name,
    author_avatar: member.avatar_url,
    content,
  });

  if (error) {
    redirect('/board?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/board');
  redirect(`/board#${boardId}`);
}
