// Supabase 経由の永続化レイヤ
// 従来の readData()/writeData() を置き換える drop-in replacement
// data.json と同じ形状のオブジェクトを返し、差分を各テーブルに反映する
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SCHEMA = process.env.SUPABASE_SCHEMA || 'legacy_minanowa';
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.warn('[supabase-store] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing; falling back to data.json');
}

const supabase = URL && KEY
  ? createClient(URL, KEY, { db: { schema: SCHEMA }, auth: { persistSession: false } })
  : null;

function isEnabled() { return !!supabase; }

// ---------- row <-> legacy object mappers ----------
function memberFromRow(r) {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    furigana: r.furigana,
    phone: r.phone,
    password: r.password_hash,
    googleSub: r.google_sub,
    business: r.business,
    businessCategory: r.business_category,
    profession: r.profession,
    introduction: r.introduction,
    memberBenefit: r.member_benefit,
    avatar: r.avatar,
    location: r.location,
    website: r.website,
    instagram: r.instagram,
    homepage: r.homepage,
    googleMapUrl: r.google_map_url,
    role: r.role,
    mapLat: r.map_lat,
    mapLng: r.map_lng,
    sns: r.sns,
    skills: r.skills,
    joinDate: r.join_date,
    isPublic: r.is_public,
    isAdmin: r.is_admin,
  };
}
function memberToRow(m) {
  return {
    id: m.id,
    email: m.email ?? null,
    name: m.name ?? '',
    furigana: m.furigana ?? null,
    phone: m.phone ?? null,
    password_hash: m.password ?? null,
    google_sub: m.googleSub ?? null,
    business: m.business ?? null,
    business_category: m.businessCategory ?? null,
    profession: m.profession ?? null,
    introduction: m.introduction ?? null,
    member_benefit: m.memberBenefit ?? null,
    avatar: m.avatar ?? null,
    location: m.location ?? null,
    website: m.website ?? null,
    instagram: m.instagram ?? null,
    homepage: m.homepage ?? null,
    google_map_url: m.googleMapUrl ?? null,
    role: m.role ?? null,
    map_lat: m.mapLat ?? null,
    map_lng: m.mapLng ?? null,
    sns: m.sns ?? null,
    skills: m.skills ?? null,
    join_date: m.joinDate ?? null,
    is_public: m.isPublic !== false,
    is_admin: m.isAdmin === true,
  };
}

function eventFromRow(r) {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    time: r.time,
    location: r.location,
    description: r.description,
    detailedInfo: r.detailed_info,
    participants: r.participants,
    fee: r.fee,
    imageUrl: r.image_url,
    isPast: r.is_past,
    applicationUrl: r.application_url,
    registrations: r.registrations || [],
    regDetails: r.reg_details || {},
  };
}
function eventToRow(e) {
  return {
    id: e.id,
    title: e.title ?? '',
    date: e.date ?? '',
    time: e.time ?? null,
    location: e.location ?? null,
    description: e.description ?? null,
    detailed_info: e.detailedInfo ?? null,
    participants: typeof e.participants === 'number' ? e.participants : null,
    fee: e.fee ?? null,
    image_url: e.imageUrl ?? null,
    is_past: e.isPast === true,
    application_url: e.applicationUrl ?? null,
    registrations: e.registrations || [],
    reg_details: e.regDetails || {},
  };
}

function blogFromRow(r) {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    category: r.category,
    excerpt: r.excerpt,
    content: r.content,
    author: r.author,
    imageUrl: r.image_url,
  };
}
function blogToRow(b) {
  return {
    id: b.id,
    title: b.title ?? '',
    date: b.date ?? '',
    category: b.category ?? null,
    excerpt: b.excerpt ?? null,
    content: b.content ?? null,
    author: b.author ?? null,
    image_url: b.imageUrl ?? null,
  };
}

function boardFromRow(r) {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorAvatar: r.author_avatar,
    title: r.title,
    content: r.content,
    category: r.category,
    mentionToId: r.mention_to_id,
    mentionToName: r.mention_to_name,
    replies: r.replies || [],
    createdAt: r.created_at,
  };
}
function boardToRow(b) {
  return {
    id: b.id,
    author_id: b.authorId ?? null,
    author_name: b.authorName ?? '',
    author_avatar: b.authorAvatar ?? null,
    title: b.title ?? '',
    content: b.content ?? '',
    category: b.category ?? null,
    mention_to_id: b.mentionToId ?? null,
    mention_to_name: b.mentionToName ?? null,
    replies: b.replies || [],
  };
}

function messageFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    subject: r.subject,
    message: r.message,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}
function messageToRow(m) {
  return {
    id: m.id,
    name: m.name ?? null,
    email: m.email ?? null,
    phone: m.phone ?? null,
    subject: m.subject ?? null,
    message: m.message ?? null,
    is_read: m.isRead === true,
  };
}

function settingsFromRow(r) {
  if (!r) return {};
  return {
    heroTitle: r.hero_title,
    heroSubtitle: r.hero_subtitle,
    aboutTitle: r.about_title,
    aboutText: r.about_text,
    instagramAccount: r.instagram_account,
    stripePublishableKey: r.stripe_publishable_key,
    stripeSecretKey: r.stripe_secret_key,
    googleClientId: r.google_client_id,
  };
}
function settingsToRow(s) {
  return {
    id: 1,
    hero_title: s.heroTitle ?? null,
    hero_subtitle: s.heroSubtitle ?? null,
    about_title: s.aboutTitle ?? null,
    about_text: s.aboutText ?? null,
    instagram_account: s.instagramAccount ?? null,
    stripe_publishable_key: s.stripePublishableKey ?? null,
    stripe_secret_key: s.stripeSecretKey ?? null,
    google_client_id: s.googleClientId ?? null,
  };
}

// ---------- load & save ----------
async function readAll() {
  if (!supabase) throw new Error('supabase not configured');
  const [mem, ev, bl, bo, ms, st, op] = await Promise.all([
    supabase.from('members').select('*'),
    supabase.from('events').select('*'),
    supabase.from('blogs').select('*'),
    supabase.from('boards').select('*'),
    supabase.from('messages').select('*').order('created_at', { ascending: false }),
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('operating_members').select('*').order('sort_order', { ascending: true }),
  ]);
  const first = [mem, ev, bl, bo, ms, op].find((r) => r.error);
  if (first && first.error) throw first.error;
  if (st.error && st.error.code !== 'PGRST116') throw st.error;

  return {
    members: (mem.data || []).map(memberFromRow),
    events: (ev.data || []).map(eventFromRow),
    blogs: (bl.data || []).map(blogFromRow),
    boards: (bo.data || []).map(boardFromRow),
    messages: (ms.data || []).map(messageFromRow),
    siteSettings: settingsFromRow(st.data),
    operatingMembers: (op.data || []).map((r) => r.member_id),
    interviews: [],
    groupChats: [],
  };
}

async function writeAll(data) {
  if (!supabase) throw new Error('supabase not configured');

  const members = (data.members || []).map(memberToRow);
  const events = (data.events || []).map(eventToRow);
  const blogs = (data.blogs || []).map(blogToRow);
  const boards = (data.boards || []).map(boardToRow);
  const messages = (data.messages || []).map(messageToRow);
  const opMembers = (data.operatingMembers || []).map((id, i) => ({ member_id: id, sort_order: i }));
  const settings = settingsToRow(data.siteSettings || {});

  // 並行upsertで一気に同期
  const results = await Promise.all([
    members.length ? supabase.from('members').upsert(members) : { error: null },
    events.length ? supabase.from('events').upsert(events) : { error: null },
    blogs.length ? supabase.from('blogs').upsert(blogs) : { error: null },
    boards.length ? supabase.from('boards').upsert(boards) : { error: null },
    messages.length ? supabase.from('messages').upsert(messages) : { error: null },
    supabase.from('site_settings').upsert(settings),
  ]);
  const bad = results.find((r) => r && r.error);
  if (bad && bad.error) throw bad.error;

  // operatingMembers は差し替え
  await supabase.from('operating_members').delete().not('member_id', 'is', null);
  if (opMembers.length) {
    const { error } = await supabase.from('operating_members').insert(opMembers);
    if (error) throw error;
  }

  // 現在のDBに存在するが data.members に無いレコードを削除 (admin delete 反映)
  await syncDeletes('members', members.map((m) => m.id));
  await syncDeletes('events', events.map((e) => e.id));
  await syncDeletes('blogs', blogs.map((b) => b.id));
  await syncDeletes('boards', boards.map((b) => b.id));
  await syncDeletes('messages', messages.map((m) => m.id));
}

async function syncDeletes(table, ids) {
  const { data: existing, error } = await supabase.from(table).select('id');
  if (error) throw error;
  const keep = new Set(ids);
  const toDelete = (existing || []).map((r) => r.id).filter((id) => !keep.has(id));
  if (toDelete.length === 0) return;
  const { error: delErr } = await supabase.from(table).delete().in('id', toDelete);
  if (delErr) throw delErr;
}

module.exports = {
  supabase,
  isEnabled,
  readAll,
  writeAll,
};
