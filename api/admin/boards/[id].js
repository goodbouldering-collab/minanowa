// api/admin/boards/[id].js
// PUT    /api/admin/boards/:id — 管理者による掲示板編集
// DELETE /api/admin/boards/:id — 管理者による掲示板削除
// server.js 963-985 行目から移植
'use strict';

const { withCors, withMethods, readJson, requireAdmin, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData, writeData } = require('../../../lib/data-cache');

async function PUT(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    const id = req.query.id;
    const post = (data.boards || []).find((b) => b.id === id);
    if (!post) return fail(res, 404, 'not found');

    const body = await readJson(req);
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
    await requireAdmin(req, data);

    const id = req.query.id;
    data.boards = (data.boards || []).filter((b) => b.id !== id);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ PUT, DELETE }));
module.exports.config = { runtime: 'nodejs' };
