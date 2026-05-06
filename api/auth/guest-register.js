// api/auth/guest-register.js
// POST /api/auth/guest-register — 未登録者の最低限入力でイベント参加可能にする
// 入力: name, email, referrerId(任意), eventId(任意)
// 動作:
//  1. email 重複時はログイン誘導
//  2. 新規 member を role='guest', is_public=false で作成
//  3. password_resets に再登録用トークンを発行（member_id 紐付け）
//  4. eventId が来ていれば、その場で event registrations にも追加
//  5. 戻り値で memberId / token / reRegisterUrl を返す
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');
const { createTokenForMember } = require('../../lib/db-tokens');
const { sendMail, buildGuestWelcomeMail } = require('../../lib/mailer');

function isValidEmail(s){return typeof s==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)}

async function POST(req, res) {
  try {
    const body = await readJson(req);
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const referrerId = (body.referrerId || '').trim() || null;
    const eventId = (body.eventId || '').trim() || null;

    if (!name) return fail(res, 400, 'お名前を入力してください');
    if (!email) return fail(res, 400, 'メールアドレスを入力してください');
    if (!isValidEmail(email)) return fail(res, 400, 'メールアドレスの形式が不正です');

    const data = await readData();
    if (!data.members) data.members = [];

    // 既存 email チェック
    const exist = data.members.find(m => (m.email || '').toLowerCase() === email);
    if (exist) {
      return fail(res, 409, 'このメールアドレスは既に登録されています。ログインしてご利用ください。');
    }

    // ゲスト member 作成
    const id = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const newMember = {
      id,
      name,
      email,
      role: 'guest',
      isGuest: true,
      isPublic: false,
      createdAt: new Date().toISOString(),
    };
    data.members.push(newMember);

    // イベント参加処理
    let eventRegistered = false;
    if (eventId) {
      const ev = (data.events || []).find(e => e.id === eventId);
      if (ev) {
        if (!ev.registrations) ev.registrations = [];
        if (!ev.regDetails) ev.regDetails = {};
        if (!ev.referrals) ev.referrals = {};
        const cap = parseInt(ev.participants, 10) || 0;
        if (!(cap > 0 && ev.registrations.length >= cap) && !ev.registrations.includes(id)) {
          ev.registrations.push(id);
          ev.regDetails[id] = {
            paymentMethod: 'onsite',
            paymentStatus: 'onsite',
            registeredAt: new Date().toISOString(),
            isGuest: true,
          };
          if (referrerId && referrerId !== id) {
            ev.referrals[id] = { referrerId, discount: 500, createdAt: new Date().toISOString() };
            if (ev.regDetails[referrerId]) {
              ev.regDetails[referrerId].referralDiscount = (ev.regDetails[referrerId].referralDiscount || 0) + 500;
              ev.regDetails[referrerId].referredBy = ev.regDetails[referrerId].referredBy || [];
              ev.regDetails[referrerId].referredBy.push(id);
            }
          }
          eventRegistered = true;
        }
      }
    }

    await writeData(data);

    // 再登録トークン (DB 永続化・7 日有効)
    const { token } = await createTokenForMember({
      memberId: id,
      ttlMs: 7 * 24 * 60 * 60 * 1000,
      kind: 'complete-signup',
    });

    const origin = (req.headers['x-forwarded-proto'] || 'https') + '://' + (req.headers['x-forwarded-host'] || req.headers.host || 'minanowa.com');
    const reRegisterUrl = origin + '/?complete=' + encodeURIComponent(token);

    // メール送信 (best-effort: 失敗しても登録自体は成功扱い)
    let mailSent = false;
    let mailError = null;
    try {
      const eventTitle = eventId
        ? ((data.events || []).find(e => e.id === eventId) || {}).title || ''
        : '';
      const { subject, html, text } = buildGuestWelcomeMail({ name, eventTitle, reRegisterUrl });
      const mailRes = await sendMail({ to: email, subject, html, text });
      mailSent = !!mailRes.success;
      if (!mailRes.success) mailError = mailRes.error || 'mail_failed';
    } catch (e) {
      mailError = e && e.message;
    }

    res.setHeader('Cache-Control', 'no-store');
    return ok(res, {
      success: true,
      memberId: id,
      member: { id, name, email, role: 'guest', isGuest: true },
      token,
      reRegisterUrl,
      eventRegistered,
      mailSent,
      mailError,
      message: 'ゲスト参加を受け付けました',
    });
  } catch (e) {
    return handleErr(res, e, 'ゲスト登録に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
