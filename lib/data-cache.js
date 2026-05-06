// lib/data-cache.js
// server.js の `_cache` パターンを Lambda モジュールトップレベルへ移植。
//
// 注意: serverless では各コンテナが別プロセスのため、cache は同一インスタンス内の
// "warm" 期間にしか効かない。それでも以下のメリットがある:
//   - 1 リクエスト中に複数回 readData() を呼んでも Supabase に再 fetch しない
//   - warm な Lambda が連続して同じユーザーを処理する間は高速
//   - write 系は writeData() 後に cache を上書きする
//
// 並行 Lambda 間で stale が出る前提の運用にすること:
//   - 書き込み系ハンドラは res.setHeader('Cache-Control', 'no-store') を返す
//   - 読み取り系も Vercel の Edge cache には載せない（クライアント主導のキャッシュは可）
'use strict';

const supaStore = require('./supabase-store');

// モジュールトップレベルに保持。同じ Lambda コンテナ内では使い回される。
let _cache = null;
let _cachePromise = null;

const EMPTY_DATA = () => ({
  members: [],
  events: [],
  blogs: [],
  boards: [],
  messages: [],
  operatingMembers: [],
  siteSettings: {},
  passwordResets: [],
  interviews: [],
  groupChats: [],
});

async function _loadFromSupabase() {
  const data = await supaStore.readAll();
  // null 安全に正規化
  return {
    members: data.members || [],
    events: data.events || [],
    blogs: data.blogs || [],
    boards: data.boards || [],
    messages: data.messages || [],
    operatingMembers: data.operatingMembers || [],
    siteSettings: data.siteSettings || {},
    passwordResets: data.passwordResets || [],
    interviews: data.interviews || [],
    groupChats: data.groupChats || [],
  };
}

/**
 * readData: cache hit → そのまま返す。cold miss は Supabase から読む。
 * Supabase が無効ならエラーを投げる（Vercel 側では data.json は使えない）。
 */
async function readData() {
  if (!supaStore.isEnabled()) {
    // Vercel 環境では data.json は永続化されない。Supabase 必須。
    const err = new Error('Supabase が設定されていません (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    err.status = 500; err.code = 'NO_SUPABASE';
    throw err;
  }
  if (_cache) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = _loadFromSupabase()
    .then((d) => { _cache = d; _cachePromise = null; return d; })
    .catch((e) => { _cachePromise = null; throw e; });
  return _cachePromise;
}

/**
 * writeData: Supabase に書き込んで cache を更新する write-through cache。
 */
async function writeData(data) {
  if (!supaStore.isEnabled()) {
    const err = new Error('Supabase が設定されていません');
    err.status = 500; err.code = 'NO_SUPABASE';
    throw err;
  }
  await supaStore.writeAll(data);
  _cache = data;
}

/** invalidate: 強制再ロード用 (admin tools 等で使う想定) */
function invalidate() {
  _cache = null;
  _cachePromise = null;
}

/**
 * peekCache: 読み込みを発行せず、現在のキャッシュ状態を覗く（テスト/デバッグ用）
 */
function peekCache() {
  return _cache;
}

/** genId: ID 生成ヘルパ (server.js と同じ規約) */
function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

module.exports = {
  readData,
  writeData,
  invalidate,
  peekCache,
  genId,
  EMPTY_DATA,
};
