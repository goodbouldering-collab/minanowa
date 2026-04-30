// api/password-reset/request.js
// POST /api/password-reset/request — リセットトークン発行
// server.js 252-280 行目から移植
//
// 注意: Phase 1 では in-memory Map（lib/reset-tokens.js）でトークン保持。
// Lambda コンテナ間で共有されないため warm 期間でしか機能しない。
// Week 3 で Supabase テーブル化する予定。
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');
const { createToken } = require('../../lib/reset-tokens');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const { email } = body;
    if (!email) return fail(res, 400, 'メールアドレスを入力してください');

    const data = await readData();
    const member = data.members.find((m) => m.email === email);
    if (!member) {
      // アカウントの存在を漏らさないため、常に成功扱い
      return ok(res, { success: true, message: 'リセットリンクを生成しました' });
    }

    const { token } = createToken(email);

    // eslint-disable-next-line no-console
    console.log(`Password reset token generated for ${email}: ${token}`);
    return ok(res, { success: true, token, message: 'リセットリンクを生成しました' });
  } catch (e) {
    return handleErr(res, e, 'エラーが発生しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
