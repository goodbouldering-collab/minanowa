// api/boards/index.js
// GET  /api/boards — 掲示板一覧（連続重複は自動クリーンアップ）
// POST /api/boards — 投稿作成（同一著者・同一本文の連投はサイレント抑止）
// server.js 762-791 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData, genId } = require('../../lib/data-cache');

async function GET(req, res) {
  try {
    const data = await readData();
    const boards = data.boards || [];
    let cleaned = false;
    const seen = new Set();
    const filtered = [];
    for (const b of boards) {
      const key = (b.authorId || '') + '::' + (b.content || '').trim();
      if (seen.has(key)) {
        cleaned = true;
        continue;
      }
      seen.add(key);
      filtered.push(b);
    }
    if (cleaned) {
      data.boards = filtered;
      await writeData(data);
    }
    return ok(res, filtered);
  } catch (e) {
    return handleErr(res, e);
  }
}

async function POST(req, res) {
  try {
    const data = await readData();
    if (!data.boards) data.boards = [];
    const body = await readJson(req);
    const dup = data.boards.find(
      (b) => b.authorId === body.authorId && (b.content || '').trim() === (body.content || '').trim()
    );
    if (dup) {
      res.setHeader('Cache-Control', 'no-store');
      return ok(res, { success: true, post: dup, duplicate: true });
    }
    const post = { id: genId('board'), ...body, replies: [], createdAt: new Date().toISOString() };
    data.boards.unshift(post);
    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, post });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET, POST }));
module.exports.config = { runtime: 'nodejs' };
