// api/admin/events/index.js
// POST /api/admin/events — 管理者によるイベント新規作成
// server.js 868-875 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, handleErr, requireAdmin } = require('../../../lib/vercel-utils');
const { readData, writeData, genId } = require('../../../lib/data-cache');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const data = await readData();
    await requireAdmin(req, data);

    const ev = { id: genId('event'), ...body, registrations: [] };
    if (!Array.isArray(data.events)) data.events = [];
    data.events.push(ev);

    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, event: ev });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
