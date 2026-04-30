// api/admin/interviews/index.js
// POST /api/admin/interviews — レガシー互換：blogs に 活動ムービー として作成
// server.js 1006-1022 行目から移植
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

    const body = await readJson(req);
    const { youtubeUrl, title, speaker, description, date } = body;
    const youtubeId = extractYoutubeId(youtubeUrl);
    const blog = {
      id: genId('blog'),
      title: title || '',
      date: date || new Date().toISOString().split('T')[0],
      category: '活動ムービー',
      excerpt: description || '',
      content: description || '',
      author: speaker || '運営事務局',
      imageUrl: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '',
      youtubeUrl: youtubeUrl || '',
      youtubeId,
    };
    if (!data.blogs) data.blogs = [];
    data.blogs.push(blog);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, interview: blog });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
