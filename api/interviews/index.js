// api/interviews/index.js
// GET /api/interviews — blogs の category=活動ムービー を interview 形式で返す（後方互換）
// server.js 988-1004 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    const videoBlogs = (data.blogs || []).filter((b) => b.category === '活動ムービー' && b.youtubeId);
    const asInterviews = videoBlogs.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.excerpt || b.content || '',
      youtubeUrl: b.youtubeUrl || '',
      youtubeId: b.youtubeId || '',
      speaker: b.author || '運営事務局',
      date: b.date || '',
      order: b.order || 0,
    }));
    const legacy = data.interviews || [];
    const allIds = new Set(asInterviews.map((i) => i.id));
    legacy.forEach((iv) => {
      if (!allIds.has(iv.id)) asInterviews.push(iv);
    });
    return ok(res, asInterviews);
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
