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
const { sendMail } = require('../../lib/mailer');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const { email } = body;
    if (!email) return fail(res, 400, 'メールアドレスを入力してください');

    const data = await readData();
    const member = data.members.find((m) => m.email === email);
    if (!member) {
      return ok(res, { success: true, message: 'リセットリンクを生成しました' });
    }

    const { token } = createToken(email);
    const origin = (req.headers['x-forwarded-proto'] || 'https') + '://' + (req.headers['x-forwarded-host'] || req.headers.host || 'minanowa.com');
    const resetUrl = origin + '/?reset=' + encodeURIComponent(token);

    try {
      await sendMail({
        to: email,
        subject: '【みんなのWA】パスワード再設定のご案内',
        text: `${member.name||''} さん\n\nパスワードを再設定するには下記のリンクをクリックしてください（1 時間有効）:\n${resetUrl}\n\n心当たりがない場合は、このメールを破棄してください。`,
        html: `<div style="font-family:'Hiragino Sans',sans-serif;max-width:520px;margin:0 auto;padding:20px"><p>${member.name||''} さん</p><p>パスワードを再設定するには下記のリンクをクリックしてください（1 時間有効）:</p><p style="text-align:center;margin:18px 0"><a href="${resetUrl}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700">パスワードを再設定</a></p><p style="font-size:.85rem;color:#64748b">URL: ${resetUrl}</p><p style="font-size:.78rem;color:#94a3b8">心当たりがない場合は、このメールを破棄してください。</p></div>`,
      });
    } catch (mailErr) {
      // eslint-disable-next-line no-console
      console.error('[reset-request] mail send failed:', mailErr && mailErr.message);
    }

    return ok(res, { success: true, message: 'リセットリンクを生成しました' });
  } catch (e) {
    return handleErr(res, e, 'エラーが発生しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
