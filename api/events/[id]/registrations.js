// api/events/[id]/registrations.js
// GET /api/events/:id/registrations — 参加者一覧（メンバー情報・支払状態・紹介付き）
// server.js 621-636 行目から移植
'use strict';

const { withCors, withMethods, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData } = require('../../../lib/data-cache');

async function GET(req, res) {
  try {
    const id = req.query.id;
    const data = await readData();
    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) return fail(res, 404, 'not found');

    const regs = ev.registrations || [];
    const members = regs.map((mid) => {
      const m = (data.members || []).find((x) => x.id === mid);
      const payment = (ev.regDetails || {})[mid] || {};
      const referral = (ev.referrals || {})[mid] || null;
      if (!m) {
        return { id: mid, name: '(退会済み)', avatar: '', payment, referral };
      }
      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        profession: m.profession,
        business: m.business,
        location: m.location,
        payment,
        referral,
      };
    });

    return ok(res, {
      registrations: members,
      count: regs.length,
      referrals: ev.referrals || {},
    });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
