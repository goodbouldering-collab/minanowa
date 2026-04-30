// api/messages.js
// GET  /api/messages?userId=...  — userId が from / to のいずれかに含まれるメッセージを返す
// POST /api/messages              — メッセージ送信
// server.js 849-864 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, handleErr } = require('../lib/vercel-utils');
const { readData, writeData, genId } = require('../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    const { userId } = req.query || {};
    return ok(res, (data.messages || []).filter((m) => m.from === userId || m.to === userId));
  } catch (e) {
    return handleErr(res, e);
  }
}

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const data = await readData();
    if (!Array.isArray(data.messages)) data.messages = [];
    const msg = { id: genId('msg'), ...body, timestamp: new Date().toISOString(), read: false };
    data.messages.push(msg);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, message: msg });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET, POST }));
module.exports.config = { runtime: 'nodejs' };
