// api/events/[id]/confirm-payment.js
// POST /api/events/:id/confirm-payment — Stripe success callback で支払 paid に更新
// server.js 720-735 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

async function POST(req, res) {
  try {
    const id = req.query.id;
    const body = await readJson(req);
    const { memberId } = body;

    const data = await readData();
    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) return fail(res, 404, 'not found');
    if (!ev.regDetails) ev.regDetails = {};
    if (ev.regDetails[memberId]) {
      ev.regDetails[memberId].paymentStatus = 'paid';
      ev.regDetails[memberId].paidAt = new Date().toISOString();
    }
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
