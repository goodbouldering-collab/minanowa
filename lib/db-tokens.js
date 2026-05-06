// lib/db-tokens.js
// パスワードリセット / ゲスト→本登録のトークンを password_resets テーブルで管理。
// 旧 lib/reset-tokens.js の in-memory 実装は Lambda コンテナ間で共有されない不具合
// (request と confirm が別コンテナで処理されるとトークン未検出) があり、
// 本ファイルで Supabase 永続層に置き換える。
//
// password_resets スキーマ (legacy_minanowa):
//   token       text primary key
//   member_id   text       — どのメンバーに紐付くか
//   expires_at  timestamptz
//   used        boolean
//   created_at  timestamptz
//   used_at     timestamptz (任意)
//   kind        text       (任意: 'reset' | 'complete-signup' 等)
'use strict';

const crypto = require('crypto');
const { readData, writeData } = require('./data-cache');

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

async function createTokenForMember({ memberId, ttlMs = DEFAULT_TTL_MS, kind = 'reset' }) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const data = await readData();
  if (!data.passwordResets) data.passwordResets = [];
  // 同一 member の古い未使用トークンは無効化する (上書きしないが古いものを use 済にする)
  data.passwordResets.forEach(r => {
    if (r.memberId === memberId && !r.used) r.used = true;
  });
  data.passwordResets.push({
    token,
    memberId,
    expiresAt,
    used: false,
    createdAt: new Date().toISOString(),
    kind,
  });
  await writeData(data);
  return { token, expiresAt };
}

async function createTokenForEmail(email, opts = {}) {
  const data = await readData();
  const member = (data.members || []).find(m => (m.email || '').toLowerCase() === email.toLowerCase());
  if (!member) return null;
  return createTokenForMember({ memberId: member.id, ...opts });
}

async function getToken(token) {
  if (!token) return null;
  const data = await readData();
  const t = (data.passwordResets || []).find(r => r.token === token && !r.used);
  if (!t) return null;
  if (new Date(t.expiresAt) < new Date()) return null;
  // 元 lib との互換性: { email } を返す
  const member = (data.members || []).find(m => m.id === t.memberId);
  return {
    email: member && member.email,
    memberId: t.memberId,
    expiresAt: t.expiresAt,
    kind: t.kind,
  };
}

async function consumeToken(token) {
  if (!token) return false;
  const data = await readData();
  const t = (data.passwordResets || []).find(r => r.token === token);
  if (!t) return false;
  t.used = true;
  t.usedAt = new Date().toISOString();
  await writeData(data);
  return true;
}

module.exports = {
  createTokenForMember,
  createTokenForEmail,
  getToken,
  consumeToken,
};
