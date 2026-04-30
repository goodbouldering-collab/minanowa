// api/members/index.js
// GET /api/members — メンバー一覧（password を除外）
// server.js 395-400 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    return ok(res, data.members.map(({ password, ...m }) => m));
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
