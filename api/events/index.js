// api/events/index.js
// GET /api/events — イベント一覧
// server.js 575-577 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    return ok(res, data.events || []);
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
