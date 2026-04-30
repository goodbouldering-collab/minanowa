// api/events/[id]/toggle-payment.js
// POST /api/events/:id/toggle-payment — 管理者による支払ステータス切替
// server.js 737-754 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr, requireAdmin } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

async function POST(req, res) {
  try {
    const id = req.query.id;
    const body = await readJson(req);
    const { memberId, newStatus } = body;

    const data = await readData();
    await requireAdmin(req, data);

    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) return fail(res, 404, 'not found');
    if (!ev.regDetails || !ev.regDetails[memberId]) {
      return fail(res, 404, 'registration not found');
    }
    ev.regDetails[memberId].paymentStatus = newStatus; // 'paid' or 'pending' or 'onsite'
    if (newStatus === 'paid') {
      ev.regDetails[memberId].paidAt = new Date().toISOString();
    } else {
      delete ev.regDetails[memberId].paidAt;
    }
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, paymentStatus: newStatus });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
