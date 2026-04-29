// lib/vercel-utils.js
// Vercel native handler 用の共通ヘルパー集
// (req, res) => {} 形式のハンドラに対する CORS / methods / body / auth wrappers
'use strict';

const Busboy = require('busboy');
const auth = require('./auth');

// ==================== CORS ====================
const DEFAULT_CORS = {
  origin: '*',
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  headers: 'Content-Type, Authorization, x-member-id, x-admin-token',
};

function applyCors(res, opts = {}) {
  const o = { ...DEFAULT_CORS, ...opts };
  res.setHeader('Access-Control-Allow-Origin', o.origin);
  res.setHeader('Access-Control-Allow-Methods', o.methods);
  res.setHeader('Access-Control-Allow-Headers', o.headers);
}

/**
 * withCors: ハンドラを CORS ヘッダ + OPTIONS short-circuit でラップする
 * @param {(req, res) => any} handler
 * @param {object} [opts]
 */
function withCors(handler, opts = {}) {
  return async (req, res) => {
    applyCors(res, opts);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    return handler(req, res);
  };
}

// ==================== Method routing ====================
/**
 * withMethods: HTTP method ごとにハンドラを振り分ける
 * @param {Record<string, (req, res) => any>} map - { GET: fn, POST: fn, ... }
 */
function withMethods(map) {
  const upperMap = {};
  for (const k of Object.keys(map || {})) upperMap[k.toUpperCase()] = map[k];
  const allowed = Object.keys(upperMap).join(', ');
  return async (req, res) => {
    const m = (req.method || 'GET').toUpperCase();
    const handler = upperMap[m];
    if (!handler) {
      res.setHeader('Allow', allowed);
      return fail(res, 405, `Method ${m} not allowed`);
    }
    return handler(req, res);
  };
}

// ==================== Body parsing ====================
/**
 * readJson: req.body が parsed なら返す。raw stream なら手動 parse。
 * Vercel は通常 JSON body を auto-parse するが、bodyParser:false の時のフォールバック。
 */
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

/**
 * readMultipart: multipart/form-data を busboy で parse して
 *   { fields: {...}, files: [{ field, filename, mimeType, buffer }] }
 * を返す。
 *
 * 使う側は必ず:
 *   exports.config = { api: { bodyParser: false } };
 * を設定すること。
 */
function readMultipart(req, opts = {}) {
  const limits = {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 10,
    ...(opts.limits || {}),
  };
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = Busboy({ headers: req.headers, limits });
    } catch (e) {
      return reject(e);
    }
    const fields = {};
    const files = [];
    let truncated = false;

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (fieldName, fileStream, info) => {
      const { filename, mimeType } = info || {};
      const chunks = [];
      fileStream.on('data', (d) => chunks.push(d));
      fileStream.on('limit', () => { truncated = true; });
      fileStream.on('end', () => {
        files.push({
          field: fieldName,
          filename,
          mimeType,
          buffer: Buffer.concat(chunks),
          truncated,
        });
      });
      fileStream.on('error', reject);
    });

    bb.on('error', reject);
    bb.on('close', () => resolve({ fields, files }));
    req.pipe(bb);
  });
}

// ==================== Auth wrappers ====================
/**
 * requireMember: x-member-id ヘッダ (or query.memberId) からメンバーを引いて返す
 * @param {object} req
 * @param {object} dataOrLoader - data オブジェクト or () => Promise<data>
 * @returns {Promise<object>} member
 * @throws { code, status, message }
 */
async function requireMember(req, dataOrLoader) {
  const headerId = req.headers && (req.headers['x-member-id'] || req.headers['X-Member-Id']);
  const queryId = req.query && req.query.memberId;
  const memberId = headerId || queryId;
  if (!memberId) {
    const err = new Error('未認証 (x-member-id ヘッダが必要)');
    err.status = 401; err.code = 'UNAUTHENTICATED';
    throw err;
  }
  const data = typeof dataOrLoader === 'function' ? await dataOrLoader() : dataOrLoader;
  const member = (data && data.members || []).find((m) => m.id === memberId);
  if (!member) {
    const err = new Error('メンバーが存在しません');
    err.status = 401; err.code = 'UNKNOWN_MEMBER';
    throw err;
  }
  return member;
}

/**
 * requireAdmin: requireMember + isAdmin チェック
 * 加えて x-admin-token ヘッダによる ADMIN_TOKEN env マッチも許可（運用ツール用）
 */
async function requireAdmin(req, dataOrLoader) {
  // 1) admin token 経由
  if (auth.checkAdminToken(req)) {
    return { id: 'admin-token', name: 'admin-token', isAdmin: true, _viaToken: true };
  }
  // 2) member 経由
  const member = await requireMember(req, dataOrLoader);
  if (member.isAdmin !== true) {
    const err = new Error('管理者権限が必要です');
    err.status = 403; err.code = 'FORBIDDEN';
    throw err;
  }
  return member;
}

// ==================== Response helpers ====================
function ok(res, data = { ok: true }, status = 200) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function fail(res, status, message, extra = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: message, ...extra }));
}

/**
 * handleErr: catch (e) { handleErr(res, e, 'message') } として使う共通エラーハンドラ
 */
function handleErr(res, e, msg = 'サーバーエラーが発生しました') {
  // throw されたカスタムエラー (status / code 付き) は尊重
  if (e && typeof e.status === 'number') {
    return fail(res, e.status, e.message || msg, e.code ? { code: e.code } : {});
  }
  // それ以外は 500
  // eslint-disable-next-line no-console
  console.error('[handleErr]', msg, e && e.stack || e);
  return fail(res, 500, msg);
}

module.exports = {
  withCors,
  withMethods,
  readJson,
  readMultipart,
  requireMember,
  requireAdmin,
  ok,
  fail,
  handleErr,
  applyCors,
};
