// api/site-settings.js
// GET /api/site-settings — サイト設定取得
// PUT /api/site-settings — サイト設定更新（管理者のみ）
// server.js 836-846 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, handleErr, requireAdmin } = require('../lib/vercel-utils');
const { readData, writeData } = require('../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    return ok(res, data.siteSettings || {});
  } catch (e) {
    return handleErr(res, e);
  }
}

async function PUT(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const body = await readJson(req);
    data.siteSettings = { ...(data.siteSettings || {}), ...body };
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, settings: data.siteSettings });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET, PUT }));
module.exports.config = { runtime: 'nodejs' };
