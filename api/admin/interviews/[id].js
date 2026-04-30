// api/admin/interviews/[id].js
// PUT    /api/admin/interviews/:id — レガシー互換：blogs を編集
// DELETE /api/admin/interviews/:id — レガシー互換：blogs と legacy interviews 双方から削除
// server.js 1023-1053 行目から移植
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

    const body = await readJson(req);
    const { youtubeUrl, title, speaker, description, date } = body;
    const youtubeId = youtubeUrl ? extractYoutubeId(youtubeUrl) : data.blogs[idx].youtubeId;
    Object.assign(data.blogs[idx], {
      title: title || data.blogs[idx].title,
      excerpt: description || data.blogs[idx].excerpt,
      content: description || data.blogs[idx].content,
      author: speaker || data.blogs[idx].author,
      date: date || data.blogs[idx].date,
      youtubeUrl: youtubeUrl || data.blogs[idx].youtubeUrl,
      youtubeId: youtubeId || data.blogs[idx].youtubeId,
      imageUrl: youtubeId
        ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
        : data.blogs[idx].imageUrl,
    });
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, interview: data.blogs[idx] });
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
    data.interviews = (data.interviews || []).filter((i) => i.id !== id);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ PUT, DELETE }));
module.exports.config = { runtime: 'nodejs' };
