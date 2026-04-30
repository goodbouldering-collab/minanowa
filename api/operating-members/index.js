// api/operating-members/index.js
// GET /api/operating-members — 運営メンバー（明示設定が無ければ isAdmin かつ公開メンバーをフォールバック表示）
// server.js 1056-1073 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    const members = data.members || [];
    const opIds = data.operatingMembers || [];
    const explicit = members
      .filter((m) => opIds.includes(m.id))
      .map(({ password, ...m }) => m);
    if (explicit.length === 0) {
      const fallback = members
        .filter((m) => m.isAdmin && m.isPublic !== false)
        .map(({ password, ...m }) => m);
      return ok(res, fallback);
    }
    return ok(res, explicit);
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
