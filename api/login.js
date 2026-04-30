// api/login.js
// POST /api/login — メール/パスワードログイン
// server.js 235-245 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../lib/vercel-utils');
const { readData } = require('../lib/data-cache');
const { verifyPassword } = require('../lib/auth');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const { email, password } = body;

    const data = await readData();
    const member = data.members.find((m) => m.email === email);
    if (!member || !(await verifyPassword(password, member.password))) {
      return fail(res, 401, 'メールアドレスまたはパスワードが正しくありません');
    }

    const { password: _omit, ...safe } = member;
    return ok(res, { success: true, member: safe });
  } catch (e) {
    return handleErr(res, e, 'ログインに失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
