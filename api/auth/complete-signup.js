// api/auth/complete-signup.js
// POST /api/auth/complete-signup — ゲスト → 本登録への昇格
// 入力: token, password, (任意で furigana / phone / business 等)
// 動作: token を passwordResets から照合 → 該当 member の password_hash 設定
//       → role を 'member' に、is_public を true に更新
'use strict';

const bcrypt = require('bcryptjs');
const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const token = (body.token || '').trim();
    const password = (body.password || '').trim();
    if (!token) return fail(res, 400, 'トークンが必要です');
    if (!password || password.length < 6) return fail(res, 400, 'パスワードは 6 文字以上で入力してください');

    const data = await readData();
    const tokens = data.passwordResets || [];
    const t = tokens.find(x => x.token === token && !x.used);
    if (!t) return fail(res, 400, 'トークンが無効か既に使用済みです');
    if (new Date(t.expiresAt) < new Date()) return fail(res, 400, 'トークンの有効期限が切れています');

    const member = (data.members || []).find(m => m.id === t.memberId);
    if (!member) return fail(res, 404, 'アカウントが見つかりません');

    const passwordHash = await bcrypt.hash(password, 10);
    member.passwordHash = passwordHash;
    member.role = 'member';
    member.isGuest = false;
    member.isPublic = true;
    member.updatedAt = new Date().toISOString();
    if (body.furigana) member.furigana = body.furigana;
    if (body.phone) member.phone = body.phone;
    if (body.business) member.business = body.business;
    if (body.businessCategory) member.businessCategory = body.businessCategory;
    if (body.profession) member.profession = body.profession;
    if (body.introduction) member.introduction = body.introduction;
    if (body.location) member.location = body.location;
    if (body.website) member.website = body.website;
    if (body.instagram) member.instagram = body.instagram;
    if (body.googleMapUrl) member.googleMapUrl = body.googleMapUrl;
    if (body.avatar) member.avatar = body.avatar;

    t.used = true;
    t.usedAt = new Date().toISOString();

    await writeData(data);
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, {
      success: true,
      member: { ...member, passwordHash: undefined },
      message: '本登録が完了しました',
    });
  } catch (e) {
    return handleErr(res, e, '本登録処理に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
