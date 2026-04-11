import { createClient } from '@/lib/supabase/server';
import {
  toEvent,
  toBlog,
  toMember,
  toSiteSettings,
} from '@/lib/supabase-mappers';

export async function getSiteSettings() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data ? toSiteSettings(data) : null;
}

export async function getUpcomingEvents(limit = 6) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_past', false)
    .order('date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toEvent);
}

export async function getRecentBlogs(limit = 6) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('blogs')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toBlog);
}

export async function getPublicMembers(limit = 12) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toMember);
}
