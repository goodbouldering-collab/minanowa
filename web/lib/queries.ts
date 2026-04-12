import { createClient } from '@/lib/supabase/server';
import {
  toEvent,
  toBlog,
  toMember,
  toSiteSettings,
  toBoard,
  toBoardReply,
} from '@/lib/supabase-mappers';
import type {
  Event,
  Blog,
  Member,
  SiteSettings,
  Board,
  BoardReply,
} from '@/types/domain';

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data ? toSiteSettings(data) : null;
}

export async function getUpcomingEvents(limit = 6): Promise<Event[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_past', false)
    .order('date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as never[]).map(toEvent);
}

export async function getEvent(id: string): Promise<Event | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toEvent(data as never) : null;
}

export async function getRecentBlogs(limit = 6): Promise<Blog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as never[]).map(toBlog);
}

export async function getAllBlogs(): Promise<Blog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as never[]).map(toBlog);
}

export async function getBlog(id: string): Promise<Blog | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toBlog(data as never) : null;
}

export async function getPublicMembers(limit?: number): Promise<Member[]> {
  const supabase = createClient();
  let query = supabase
    .from('members')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: true });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as never[]).map(toMember);
}

export async function getMember(id: string): Promise<Member | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toMember(data as never) : null;
}

export async function getRecentBoards(limit = 5): Promise<Board[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as never[]).map(toBoard);
}

export async function getAllBoards(): Promise<Board[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as never[]).map(toBoard);
}

export async function getBoardRepliesByBoardIds(
  ids: string[]
): Promise<BoardReply[]> {
  if (ids.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('board_replies')
    .select('*')
    .in('board_id', ids)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as never[]).map(toBoardReply);
}

export async function getOperatingMembers(): Promise<Member[]> {
  const supabase = createClient();
  const { data: opData, error } = await supabase
    .from('operating_members')
    .select('member_id, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const ids = ((opData ?? []) as { member_id: string }[]).map(
    (o) => o.member_id
  );
  if (ids.length === 0) return [];
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .in('id', ids);
  if (memberError) throw memberError;
  const byId = new Map<string, Member>();
  ((memberData ?? []) as { id: string }[]).forEach((m) => {
    byId.set(m.id, toMember(m as never));
  });
  return ids
    .map((id) => byId.get(id))
    .filter((m): m is Member => Boolean(m));
}
