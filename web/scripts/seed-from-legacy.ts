// 旧 data.json の内容を Supabase に投入する一回限りのスクリプト
// 実行: npm run migrate:seed
//
// 前提:
//   - .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が設定済み
//   - 0001/0002 マイグレーションが Supabase 側で実行済み
//
// 注意:
//   - 既存ユーザーのパスワードは Supabase Auth に持ち込めない (bcrypt と独自ハッシュが違う)
//   - メンバー本人は初回ログイン時にパスワードリセットが必要
//   - このスクリプトは何度実行しても upsert で冪等

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'minanowa' },
});

const legacyPath = resolve(__dirname, '../../legacy/data.json');
const data = JSON.parse(readFileSync(legacyPath, 'utf-8'));

// 旧 ID は文字列 ("admin-001" など) なので、UUID に変換するマップを作る
const idMap = new Map<string, string>();
const ensureUuid = (oldId: string): string => {
  if (!idMap.has(oldId)) {
    idMap.set(oldId, crypto.randomUUID());
  }
  return idMap.get(oldId)!;
};

async function seedSiteSettings() {
  const s = data.siteSettings ?? {};
  const { error } = await supabase.from('site_settings').upsert({
    id: 1,
    hero_title: s.heroTitle ?? null,
    hero_subtitle: s.heroSubtitle ?? null,
    about_title: s.aboutTitle ?? null,
    about_text: s.aboutText ?? null,
    instagram_account: s.instagramAccount ?? null,
    stripe_publishable_key: s.stripePublishableKey ?? null,
    google_client_id: s.googleClientId ?? null,
  });
  if (error) throw error;
  console.log('✓ site_settings');
}

async function seedMembers() {
  const rows = (data.members ?? []).map((m: any) => ({
    id: ensureUuid(m.id),
    email: m.email,
    name: m.name,
    furigana: m.furigana ?? null,
    phone: m.phone ?? null,
    business: m.business ?? null,
    business_category: m.businessCategory ?? null,
    introduction: m.introduction ?? null,
    avatar_url: m.avatar ?? null,
    location: m.location ?? null,
    website: m.website ?? null,
    instagram: m.instagram ?? null,
    sns: m.sns ?? null,
    skills: m.skills ?? null,
    join_date: m.joinDate ?? null,
    is_public: m.isPublic ?? true,
    is_admin: m.isAdmin ?? false,
    profession: m.profession ?? null,
    homepage: m.homepage ?? null,
    google_map_url: m.googleMapUrl ?? null,
    role: m.role ?? null,
    map_lat: m.mapLat ?? null,
    map_lng: m.mapLng ?? null,
  }));
  const { error } = await supabase.from('members').upsert(rows);
  if (error) throw error;
  console.log(`✓ members (${rows.length})`);
}

async function seedEvents() {
  const events = data.events ?? [];
  const eventRows = events.map((e: any) => ({
    id: ensureUuid(e.id),
    title: e.title,
    date: e.date,
    time: e.time ?? null,
    location: e.location ?? null,
    description: e.description ?? null,
    detailed_info: e.detailedInfo ?? null,
    participants: e.participants ?? null,
    fee: e.fee ?? null,
    image_url: e.imageUrl ?? null,
    is_past: e.isPast ?? false,
    application_url: e.applicationUrl ?? null,
    reg_details: e.regDetails ?? null,
  }));
  const { error: e1 } = await supabase.from('events').upsert(eventRows);
  if (e1) throw e1;
  console.log(`✓ events (${eventRows.length})`);

  // registrations 配列を正規化
  const regRows = events.flatMap((e: any) =>
    (e.registrations ?? []).map((r: any) => ({
      event_id: ensureUuid(e.id),
      member_id: r.memberId ? ensureUuid(r.memberId) : null,
      guest_name: r.name ?? null,
      guest_email: r.email ?? null,
      status: r.status ?? 'registered',
    }))
  );
  if (regRows.length > 0) {
    const { error: e2 } = await supabase
      .from('event_registrations')
      .insert(regRows);
    if (e2) throw e2;
  }
  console.log(`✓ event_registrations (${regRows.length})`);
}

async function seedBlogs() {
  const rows = (data.blogs ?? []).map((b: any) => ({
    id: ensureUuid(b.id),
    title: b.title,
    date: b.date,
    category: b.category ?? null,
    excerpt: b.excerpt ?? null,
    content: b.content ?? null,
    author: b.author ?? null,
    image_url: b.imageUrl ?? null,
  }));
  const { error } = await supabase.from('blogs').upsert(rows);
  if (error) throw error;
  console.log(`✓ blogs (${rows.length})`);
}

async function seedBoards() {
  const boards = data.boards ?? [];
  const boardRows = boards.map((b: any) => ({
    id: ensureUuid(b.id),
    author_id: b.authorId ? ensureUuid(b.authorId) : null,
    author_name: b.authorName,
    author_avatar: b.authorAvatar ?? null,
    title: b.title,
    content: b.content,
    category: b.category ?? null,
    mention_to_id: b.mentionToId ? ensureUuid(b.mentionToId) : null,
    mention_to_name: b.mentionToName ?? null,
  }));
  const { error: e1 } = await supabase.from('boards').upsert(boardRows);
  if (e1) throw e1;
  console.log(`✓ boards (${boardRows.length})`);

  const replyRows = boards.flatMap((b: any) =>
    (b.replies ?? []).map((r: any) => ({
      board_id: ensureUuid(b.id),
      author_id: r.authorId ? ensureUuid(r.authorId) : null,
      author_name: r.authorName,
      author_avatar: r.authorAvatar ?? null,
      content: r.content,
    }))
  );
  if (replyRows.length > 0) {
    const { error: e2 } = await supabase.from('board_replies').insert(replyRows);
    if (e2) throw e2;
  }
  console.log(`✓ board_replies (${replyRows.length})`);
}

async function seedOperatingMembers() {
  const validMemberIds = new Set(
    (data.members ?? []).map((m: any) => m.id as string)
  );
  const rows = (data.operatingMembers ?? [])
    .filter(
      (id: any) => typeof id === 'string' && validMemberIds.has(id)
    )
    .map((memberId: string, i: number) => ({
      member_id: ensureUuid(memberId),
      sort_order: i,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('operating_members').upsert(rows);
  if (error) throw error;
  console.log(`✓ operating_members (${rows.length})`);
}

async function main() {
  console.log('🌱 Seeding from legacy/data.json...');
  await seedSiteSettings();
  await seedMembers();
  await seedEvents();
  await seedBlogs();
  await seedBoards();
  await seedOperatingMembers();
  console.log('\n✅ Done');
  console.log('\nID マッピング (旧→新) を保存:');
  const mapping = Object.fromEntries(idMap);
  const out = resolve(__dirname, '../../legacy/id-mapping.json');
  require('node:fs').writeFileSync(out, JSON.stringify(mapping, null, 2));
  console.log(`  ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
