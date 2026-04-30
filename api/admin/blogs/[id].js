// api/admin/blogs/[id].js
// PUT    /api/admin/blogs/:id — ブログ編集
// DELETE /api/admin/blogs/:id — ブログ削除
// server.js 915-939 行目から移植
'use strict';

const { withCors, withMethods, readJson, requireAdmin, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

function extractYoutubeId(url) {
  if (!url) return '';
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
  return m ? m[1] : '';
}

async function PUT(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const id = req.query.id;
    const idx = (data.blogs || []).findIndex((b) => b.id === id);
    if (idx === -1) return fail(res, 404, 'not found');

    const body = { ...(await readJson(req)) };
    if (body.youtubeUrl && !body.youtubeId) {
      body.youtubeId = extractYoutubeId(body.youtubeUrl);
    }
    if (body.youtubeId && !body.imageUrl) {
      body.imageUrl = `https://img.youtube.com/vi/${body.youtubeId}/hqdefault.jpg`;
    }
    data.blogs[idx] = { ...data.blogs[idx], ...body, id: data.blogs[idx].id };
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, blog: data.blogs[idx] });
  } catch (e) {
    return handleErr(res, e);
  }
}

async function DELETE(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const id = req.query.id;
    data.blogs = (data.blogs || []).filter((b) => b.id !== id);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ PUT, DELETE }));
module.exports.config = { runtime: 'nodejs' };
