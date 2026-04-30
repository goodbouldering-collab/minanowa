// api/members/participation/all.js
// GET /api/members/participation/all
// 全メンバーの参加カウント＋ランクを bulk で返す
// server.js 658-680 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../../../lib/vercel-utils');
const { readData } = require('../../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    const now = new Date();
    const pastEvents = (data.events || []).filter((ev) => new Date(ev.date) < now);
    const counts = {};
    pastEvents.forEach((ev) => {
      (ev.registrations || []).forEach((mid) => {
        counts[mid] = (counts[mid] || 0) + 1;
      });
    });
    const result = {};
    Object.entries(counts).forEach(([mid, count]) => {
      let rank = 'none';
      if (count >= 12) rank = 'gold';
      else if (count >= 6) rank = 'silver';
      else if (count >= 3) rank = 'bronze';
      result[mid] = { count, rank };
    });
    return ok(res, result);
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
