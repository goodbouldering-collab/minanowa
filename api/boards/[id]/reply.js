// api/boards/[id]/reply.js
// POST /api/boards/:id/reply — 掲示板投稿に返信
// server.js 793-806 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData, writeData, genId } = require('../../../lib/data-cache');

async function POST(req, res) {
  try {
    const data = await readData();
    const id = req.query.id;
    const post = (data.boards || []).find((b) => b.id === id);
    if (!post) return fail(res, 404, 'not found');
    if (!post.replies) post.replies = [];

    const body = await readJson(req);
    const dup = post.replies.find(
      (r) => r.authorId === body.authorId && (r.content || '').trim() === (body.content || '').trim()
    );
    if (dup) {
      res.setHeader('Cache-Control', 'no-store');
      return ok(res, { success: true, reply: dup, duplicate: true });
    }
    const reply = { id: genId('reply'), ...body, createdAt: new Date().toISOString() };
    post.replies.push(reply);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, reply });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
