// api/admin/operating-members.js
// GET /api/admin/operating-members — 運営メンバー ID 一覧
// PUT /api/admin/operating-members — 運営メンバー ID 一覧を上書き保存
// server.js 1074-1087 行目から移植
'use strict';

const { withCors, withMethods, readJson, requireAdmin, ok, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);
    return ok(res, data.operatingMembers || []);
  } catch (e) {
    return handleErr(res, e);
  }
}

async function PUT(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const body = await readJson(req);
    data.operatingMembers = body.memberIds || [];
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, operatingMembers: data.operatingMembers });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET, PUT }));
module.exports.config = { runtime: 'nodejs' };
