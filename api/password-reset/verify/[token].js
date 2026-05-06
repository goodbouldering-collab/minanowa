// api/password-reset/verify/[token].js
// GET /api/password-reset/verify/:token — トークン検証
// server.js 283-289 行目から移植
//
// Vercel の dynamic segment はファイル名 [token].js に対応し、
// 値は req.query.token に入る。
'use strict';

const { withCors, withMethods, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { getToken } = require('../../../lib/db-tokens');

async function GET(req, res) {
  try {
    const token = (req.query && req.query.token) || '';
    const entry = await getToken(token);
    if (!entry || !entry.email) {
      return fail(res, 400, 'リセットリンクが無効または期限切れです');
    }
    const masked = entry.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    return ok(res, { success: true, email: masked });
  } catch (e) {
    return handleErr(res, e, 'トークンの検証に失敗しました');
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
