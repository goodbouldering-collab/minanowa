// lib/reset-tokens.js
// パスワードリセット用トークンの一時保管庫。
// ⚠️ in-memory Map なので Lambda コンテナ間で共有されない（Phase 1 暫定）。
//   Week 3 で Supabase テーブル化する予定（reset_tokens テーブル）。
//
// 同一コンテナの warm 期間中は機能する（=同じ Lambda が連続して
// request → confirm を捌けば動く）。冷えていたり別コンテナが当たると
// トークンが見つからず 400 を返す。
'use strict';

const crypto = require('crypto');

// モジュールトップレベルに保持
const _tokens = new Map(); // token -> { email, expiresAt }

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

function _gc() {
  const now = Date.now();
  for (const [t, v] of _tokens) {
    if (v.expiresAt < now) _tokens.delete(t);
  }
}

function createToken(email, ttlMs = DEFAULT_TTL_MS) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ttlMs;
  _tokens.set(token, { email, expiresAt });
  _gc();
  return { token, expiresAt };
}

function getToken(token) {
  const entry = _tokens.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    _tokens.delete(token);
    return null;
  }
  return entry;
}

function deleteToken(token) {
  return _tokens.delete(token);
}

module.exports = {
  createToken,
  getToken,
  deleteToken,
};
