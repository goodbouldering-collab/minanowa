// api/events/[id]/register.js
// POST   /api/events/:id/register — イベント参加登録（紹介者割引付き）
// DELETE /api/events/:id/register — 参加キャンセル
// server.js 578-619 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

async function POST(req, res) {
  try {
    const id = req.query.id;
    const body = await readJson(req);
    const { memberId, paymentMethod, referrerId } = body;
    if (!memberId) return fail(res, 400, 'memberId is required');

    const data = await readData();
    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) return fail(res, 404, 'not found');
    if (!ev.registrations) ev.registrations = [];
    if (!ev.regDetails) ev.regDetails = {};
    if (!ev.referrals) ev.referrals = {};

    if (ev.registrations.includes(memberId)) {
      return fail(res, 400, '既に登録済み');
    }
    // Check capacity
    const cap = parseInt(ev.participants, 10) || 0;
    if (cap > 0 && ev.registrations.length >= cap) {
      return fail(res, 400, '定員に達しました');
    }

    ev.registrations.push(memberId);
    ev.regDetails[memberId] = {
      paymentMethod: paymentMethod || 'onsite',
      paymentStatus: paymentMethod === 'stripe' ? 'pending' : 'onsite',
      registeredAt: new Date().toISOString(),
    };

    // Handle referral: first-timer nominates a referrer who gets 500 yen discount
    if (referrerId && referrerId !== memberId) {
      ev.referrals[memberId] = {
        referrerId,
        discount: 500,
        createdAt: new Date().toISOString(),
      };
      // Apply discount to referrer's regDetails
      if (ev.regDetails[referrerId]) {
        ev.regDetails[referrerId].referralDiscount = (ev.regDetails[referrerId].referralDiscount || 0) + 500;
        ev.regDetails[referrerId].referredBy = ev.regDetails[referrerId].referredBy || [];
        ev.regDetails[referrerId].referredBy.push(memberId);
      }
    }

    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, {
      success: true,
      registrations: ev.registrations,
      regDetails: ev.regDetails,
    });
  } catch (e) {
    return handleErr(res, e);
  }
}

async function DELETE(req, res) {
  try {
    const id = req.query.id;
    const body = await readJson(req);
    const { memberId } = body;
    if (!memberId) return fail(res, 400, 'memberId is required');

    const data = await readData();
    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) return fail(res, 404, 'not found');
    if (!ev.registrations) ev.registrations = [];
    ev.registrations = ev.registrations.filter((mid) => mid !== memberId);

    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, registrations: ev.registrations });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ POST, DELETE }));
module.exports.config = { runtime: 'nodejs' };
