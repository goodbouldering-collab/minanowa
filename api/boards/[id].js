// api/boards/[id].js
// PUT    /api/boards/:id — 自分の投稿のみ編集
// DELETE /api/boards/:id — 自分の投稿のみ削除
// server.js 808-833 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');

async function PUT(req, res) {
  try {
    const data = await readData();
    const id = req.query.id;
    const post = (data.boards || []).find((b) => b.id === id);
    if (!post) return fail(res, 404, 'not found');

    const body = await readJson(req);
    if (post.authorId !== body.authorId) {
      return fail(res, 403, '自分の投稿のみ編集できます');
    }
    post.title = body.title || post.title;
    post.content = body.content || post.content;
    post.category = body.category || post.category;
    post.updatedAt = new Date().toISOString();
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, post });
  } catch (e) {
    return handleErr(res, e);
  }
}

async function DELETE(req, res) {
  try {
    const data = await readData();
    const id = req.query.id;
    const idx = (data.boards || []).findIndex((b) => b.id === id);
    if (idx === -1) return fail(res, 404, 'not found');

    const body = await readJson(req);
    if (data.boards[idx].authorId !== body.authorId) {
      return fail(res, 403, '自分の投稿のみ削除できます');
    }
    data.boards.splice(idx, 1);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ PUT, DELETE }));
module.exports.config = { runtime: 'nodejs' };
