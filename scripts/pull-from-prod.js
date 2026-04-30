#!/usr/bin/env node
// 本番 (Render + Supabase) から全データを取得し data.json に書き戻すスクリプト
// ローカルdata.jsonをバックアップ扱いとして最新化する用途
const fs = require('fs');
const path = require('path');
const BASE = process.env.PROD_URL || 'https://minanowa.onrender.com';

async function j(p) {
  const r = await fetch(`${BASE}${p}`);
  if (!r.ok) throw new Error(`${p} -> ${r.status}`);
  return r.json();
}

(async () => {
  const [members, events, blogs, boards, settings] = await Promise.all([
    j('/api/members'),
    j('/api/events'),
    j('/api/blogs'),
    j('/api/boards'),
    j('/api/site-settings'),
  ]);
  // operatingMembers と messages は認証/管理API なので現行 data.json の値を残す
  const current = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'));
  const snapshot = {
    siteSettings: settings || current.siteSettings || {},
    members,
    events,
    blogs,
    boards,
    messages: current.messages || [],
    groupChats: current.groupChats || [],
    interviews: current.interviews || [],
    operatingMembers: current.operatingMembers || [],
  };
  const out = path.join(__dirname, '..', 'data.json');
  fs.writeFileSync(out, JSON.stringify(snapshot, null, 2));
  console.log(`✅ Wrote ${out}`);
  console.log(`   members=${members.length} events=${events.length} blogs=${blogs.length} boards=${boards.length}`);
})().catch((e) => { console.error(e); process.exit(1); });
