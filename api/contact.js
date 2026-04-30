// api/contact.js
// POST /api/contact — 問い合わせフォーム
// server.js 1110-1112 行目から移植
// 現状はメール送信などせずに 200 を返すだけのスタブ。将来的に Supabase / Resend へ通知する想定。
'use strict';

const { withCors, withMethods, readJson, ok, handleErr } = require('../lib/vercel-utils');

async function POST(req, res) {
  try {
    // body は今のところ使わないが parse はして将来の拡張に備える
    await readJson(req).catch(() => ({}));
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, message: 'お問い合わせを受け付けました' });
  } catch (e) {
    return handleErr(res, e, '問い合わせの受付に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
