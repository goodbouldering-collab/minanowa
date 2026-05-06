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
let _cacheLoadedAt = 0;
// TTL: cache を強制 invalidate するまでの最大寿命 (ms)。
// 直接 SQL や別 Lambda の writeData による外部変更が、最大この時間で次の
// 読み取りに反映される。短すぎると Supabase fetch が増えて遅延、
// 長すぎると stale になるトレードオフ。60 秒が目安。
const CACHE_TTL_MS = parseInt(process.env.DATA_CACHE_TTL_MS || '60000', 10);

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
  // TTL 切れの cache は自動 invalidate
  if (_cache && (Date.now() - _cacheLoadedAt) > CACHE_TTL_MS) {
    _cache = null;
  }
  if (_cache) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = _loadFromSupabase()
    .then((d) => { _cache = d; _cacheLoadedAt = Date.now(); _cachePromise = null; return d; })
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
  _cacheLoadedAt = Date.now();
}

/** invalidate: 強制再ロード用 (admin tools 等で使う想定) */
function invalidate() {
  _cache = null;
  _cachePromise = null;
  _cacheLoadedAt = 0;
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
