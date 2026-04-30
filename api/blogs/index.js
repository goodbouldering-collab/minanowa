// api/blogs/index.js
// GET /api/blogs — 全ブログ一覧
// server.js 757-759 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    return ok(res, data.blogs || []);
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
