// api/events/[id].js
// GET /api/events/:id — イベント単体取得（server.js には個別ルート無いが、
//                                       Vercel 移行後の利便性向上のため追加）
'use strict';

const { withCors, withMethods, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const id = req.query.id;
    const data = await readData();
    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) return fail(res, 404, 'not found');
    return ok(res, ev);
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
