// 本番 (https://minanowa.onrender.com) の API から全データを取得し
// Supabase legacy_minanowa スキーマに投入する
// 使い方: node scripts/seed-from-production.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const BASE = process.env.SEED_SOURCE_URL || 'https://minanowa.onrender.com';
const SCHEMA = process.env.SUPABASE_SCHEMA || 'legacy_minanowa';
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env に設定されていません');
  process.exit(1);
}

const supabase = createClient(URL, KEY, { db: { schema: SCHEMA }, auth: { persistSession: false } });

async function fetchJson(p) {
  const r = await fetch(BASE + p, { headers: { 'accept': 'application/json' } });
  if (!r.ok) throw new Error(`${p} -> ${r.status}`);
  return r.json();
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

(async () => {
  console.log(`source: ${BASE}`);
  console.log(`target: ${URL} (schema ${SCHEMA})`);
  console.log('--- fetching ---');

  const [members, events, blogs, boards, settings, opMembers] = await Promise.all([
    fetchJson('/api/members'),
    fetchJson('/api/events'),
    fetchJson('/api/blogs'),
    fetchJson('/api/boards'),
    fetchJson('/api/site-settings').catch(() => ({})),
    fetchJson('/api/operating-members').catch(() => []),
  ]);

  console.log(`members=${members.length} events=${events.length} blogs=${blogs.length} boards=${boards.length}`);

  // /api/members はパスワードを返さないので、password_hash は null のまま
  // → 既存ユーザーはログイン時に 1度だけ「パスワードを忘れた」→ リセットフローが必要
  // (旧版 server.js を継続運用する間に data.json から password ハッシュを補填する選択肢もあり)

  const members_rows = members.map(memberToRow);
  const events_rows = events.map(eventToRow);
  const blogs_rows = blogs.map(blogToRow);
  const boards_rows = boards.map(boardToRow);

  console.log('--- upserting ---');

  const results = await Promise.all([
    members_rows.length ? supabase.from('members').upsert(members_rows) : Promise.resolve({ error: null }),
    events_rows.length ? supabase.from('events').upsert(events_rows) : Promise.resolve({ error: null }),
    blogs_rows.length ? supabase.from('blogs').upsert(blogs_rows) : Promise.resolve({ error: null }),
    boards_rows.length ? supabase.from('boards').upsert(boards_rows) : Promise.resolve({ error: null }),
    supabase.from('site_settings').upsert({
      id: 1,
      hero_title: settings.heroTitle ?? null,
      hero_subtitle: settings.heroSubtitle ?? null,
      about_title: settings.aboutTitle ?? null,
      about_text: settings.aboutText ?? null,
      instagram_account: settings.instagramAccount ?? null,
      stripe_publishable_key: settings.stripePublishableKey ?? null,
      google_client_id: settings.googleClientId ?? null,
    }),
  ]);

  for (const [i, r] of results.entries()) {
    if (r && r.error) {
      console.error(`step ${i} error:`, r.error);
      process.exit(1);
    }
  }

  // operating_members
  await supabase.from('operating_members').delete().not('member_id', 'is', null);
  const opRows = (Array.isArray(opMembers) ? opMembers : []).map((id, i) => ({ member_id: id, sort_order: i }));
  if (opRows.length) {
    const { error } = await supabase.from('operating_members').insert(opRows);
    if (error) { console.error('operating_members error:', error); process.exit(1); }
  }

  // 旧ローカル data.json から bcrypt ハッシュを拾って補填
  try {
    const local = require('../data.json');
    const withPw = (local.members || []).filter((m) => m.password && m.id);
    if (withPw.length) {
      console.log(`--- backfilling bcrypt hashes from local data.json (${withPw.length} users) ---`);
      for (const m of withPw) {
        await supabase.from('members').update({ password_hash: m.password }).eq('id', m.id);
      }
    }
  } catch {
    console.log('(local data.json not readable, skipping password hash backfill)');
  }

  console.log('--- done ---');
})().catch((e) => { console.error(e); process.exit(1); });
