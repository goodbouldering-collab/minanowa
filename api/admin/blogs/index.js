// api/admin/blogs/index.js
// POST /api/admin/blogs — ブログ作成 (お知らせ / 活動レポート / 活動ムービー 統合)
// server.js 897-914 行目から移植
'use strict';

const { withCors, withMethods, readJson, requireAdmin, ok, handleErr } = require('../../../lib/vercel-utils');
const { readData, writeData, genId } = require('../../../lib/data-cache');

function extractYoutubeId(url) {
  if (!url) return '';
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
  return m ? m[1] : '';
}

async function POST(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const body = { ...(await readJson(req)) };
    if (body.youtubeUrl && !body.youtubeId) {
      body.youtubeId = extractYoutubeId(body.youtubeUrl);
    }
    if (body.youtubeId && !body.imageUrl) {
      body.imageUrl = `https://img.youtube.com/vi/${body.youtubeId}/hqdefault.jpg`;
    }
    const blog = {
      id: genId('blog'),
      ...body,
      date: body.date || new Date().toISOString().split('T')[0],
    };
    if (!data.blogs) data.blogs = [];
    data.blogs.push(blog);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, blog });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
