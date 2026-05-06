// api/password-reset/request.js
// POST /api/password-reset/request — リセットトークン発行（password_resets DB に永続化）
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { createTokenForEmail } = require('../../lib/db-tokens');
const { sendMail } = require('../../lib/mailer');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const { email } = body;
    if (!email) return fail(res, 400, 'メールアドレスを入力してください');

    const result = await createTokenForEmail(email, { kind: 'reset' });
    if (!result) {
      // アカウントの存在を漏らさないため、常に成功扱い
      return ok(res, { success: true, message: 'リセットリンクを生成しました' });
    }
    const { token } = result;
    // 送信先 member 情報を取得 (本文用)
    const { readData } = require('../../lib/data-cache');
    const data = await readData();
    const member = data.members.find((m) => (m.email || '').toLowerCase() === email.toLowerCase());
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
