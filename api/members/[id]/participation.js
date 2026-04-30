// api/members/[id]/participation.js
// GET /api/members/:id/participation
// 過去イベントへの参加カウント＋ランク（gold/silver/bronze/none）
// server.js 639-656 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../../../lib/vercel-utils');
const { readData } = require('../../../lib/data-cache');

async function GET(req, res) {
  try {
    const memberId = req.query.id;
    const data = await readData();
    const now = new Date();
    const count = (data.events || []).filter((ev) => {
      const isPast = new Date(ev.date) < now;
      return isPast && (ev.registrations || []).includes(memberId);
    }).length;
    let rank = 'none';
    if (count >= 12) rank = 'gold';
    else if (count >= 6) rank = 'silver';
    else if (count >= 3) rank = 'bronze';
    return ok(res, { memberId, count, rank });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
