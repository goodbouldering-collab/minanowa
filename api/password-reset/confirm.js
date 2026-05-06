// api/password-reset/confirm.js
// POST /api/password-reset/confirm — 新パスワード設定
// server.js 292-318 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');
const { hashPassword } = require('../../lib/auth');
const { getToken, consumeToken } = require('../../lib/db-tokens');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const { token, password } = body;
    if (!token || !password) return fail(res, 400, 'トークンとパスワードが必要です');
    if (String(password).length < 6) return fail(res, 400, 'パスワードは6文字以上にしてください');

    const entry = await getToken(token);
    if (!entry) return fail(res, 400, 'リセットリンクが無効または期限切れです');

    const data = await readData();
    const member = data.members.find((m) => m.id === entry.memberId);
    if (!member) return fail(res, 404, 'ユーザーが見つかりません');

    member.password = await hashPassword(password);
    await writeData(data);

    await consumeToken(token);

    return ok(res, { success: true, message: 'パスワードを更新しました' });
  } catch (e) {
    return handleErr(res, e, 'パスワードの更新に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
