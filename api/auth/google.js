// api/auth/google.js
// POST /api/auth/google — Google OAuth ログイン (既存ユーザー判定 + 新規プロファイル返却)
// server.js 321-364 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');
const { verifyGoogleIdToken } = require('../../lib/auth');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const { credential } = body;
    if (!credential) return fail(res, 400, 'トークンが必要です');

    const data = await readData();
    const clientId = (data.siteSettings || {}).googleClientId || process.env.GOOGLE_CLIENT_ID || '';
    if (!clientId) return fail(res, 500, 'Google Client IDが設定されていません');

    let verified;
    try {
      verified = await verifyGoogleIdToken(credential, clientId);
    } catch (e) {
      const m = String(e && e.message || '');
      const msg =
        m.includes('Token used too late') ? 'トークンの有効期限が切れました。もう一度お試しください' :
        m.includes('Wrong recipient') ? 'Google Client IDの設定が正しくありません' :
        m.includes('Invalid token') ? 'トークンが無効です' :
        'Google認証に失敗しました: ' + m;
      // eslint-disable-next-line no-console
      console.error('Google auth error:', m, e && e.stack);
      return fail(res, 401, msg);
    }

    const { googleId, email, name, picture } = verified;

    // 1) Find by googleId
    let member = data.members.find((m) => m.googleId === googleId);
    // 2) Find by email
    if (!member) member = data.members.find((m) => m.email === email);

    if (member) {
      // Link googleId if not yet linked
      let mutated = false;
      if (!member.googleId) {
        member.googleId = googleId;
        mutated = true;
      }
      if (!member.avatar && picture) {
        member.avatar = picture;
        mutated = true;
      }
      if (mutated) await writeData(data);
      const { password: _omit, ...safe } = member;
      return ok(res, { success: true, member: safe, isNew: false });
    }

    // 3) New user — return Google profile for registration form prefill
    return ok(res, {
      success: true,
      isNew: true,
      googleProfile: { googleId, email, name, avatar: picture },
    });
  } catch (e) {
    return handleErr(res, e, 'Google認証に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
