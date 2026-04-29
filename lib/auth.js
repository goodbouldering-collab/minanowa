// lib/auth.js
// 認証系の薄いラッパ。bcryptjs / google-auth-library / admin token check をまとめる。
'use strict';

const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

// ==================== bcrypt ====================
async function hashPassword(plain) {
  if (!plain) return '';
  return bcrypt.hash(String(plain), 10);
}

/**
 * verifyPassword: 平文パスワードと hash を比較
 * hash が空なら false（Google 専用ユーザー等）
 */
async function verifyPassword(plain, hash) {
  if (!hash || !plain) return false;
  try {
    return await bcrypt.compare(String(plain), String(hash));
  } catch {
    return false;
  }
}

// ==================== Google OAuth ====================
/**
 * verifyGoogleIdToken: Google ID token を検証して payload を返す
 * @param {string} idToken - フロントが取得した credential
 * @param {string} clientId - 期待する audience
 * @returns {Promise<{ googleId, email, name, picture, payload }>}
 */
async function verifyGoogleIdToken(idToken, clientId) {
  if (!idToken) {
    const err = new Error('トークンが必要です');
    err.status = 400; err.code = 'NO_TOKEN';
    throw err;
  }
  if (!clientId) {
    const err = new Error('Google Client IDが設定されていません');
    err.status = 500; err.code = 'NO_CLIENT_ID';
    throw err;
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload) {
    const err = new Error('Google トークンの payload を取得できませんでした');
    err.status = 401; err.code = 'INVALID_TOKEN';
    throw err;
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    payload,
  };
}

// ==================== Admin token ====================
/**
 * checkAdminToken: x-admin-token ヘッダ or ?adminToken= が
 * process.env.ADMIN_TOKEN と一致するか
 *
 * ADMIN_TOKEN が未設定の場合は常に false （= token 経由の admin 認証は無効）
 * 運用上は requireAdmin 内で member.isAdmin チェックがフォールバックとなる
 */
function checkAdminToken(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const provided =
    (req.headers && (req.headers['x-admin-token'] || req.headers['X-Admin-Token'])) ||
    (req.query && req.query.adminToken) ||
    null;
  if (!provided) return false;
  // タイミング攻撃を多少緩和
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

module.exports = {
  hashPassword,
  verifyPassword,
  verifyGoogleIdToken,
  checkAdminToken,
};
