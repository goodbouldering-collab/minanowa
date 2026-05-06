// lib/mailer.js
// Resend (https://resend.com) でメール送信。
// RESEND_API_KEY が無い環境ではログ出力のみで成功扱いにし、開発を止めない。
'use strict';

const FROM = process.env.MAIL_FROM || 'みんなのWA <noreply@minanowa.com>';

async function sendMail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // 開発環境 / API キー未設定時はコンソールにログ
    // eslint-disable-next-line no-console
    console.log('[mailer] RESEND_API_KEY not set — would have sent:', { to, subject });
    return { success: true, skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || (text ? `<pre style="font-family:inherit">${text}</pre>` : ''),
      text: text || undefined,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error('[mailer] resend error', res.status, json);
    return { success: false, error: json.message || ('http ' + res.status) };
  }
  return { success: true, id: json.id };
}

function buildGuestWelcomeMail({ name, eventTitle, reRegisterUrl }) {
  const subject = `【みんなのWA】${eventTitle ? eventTitle + ' のお申し込み完了' : 'ゲスト参加のお手続き完了'}`;
  const html = `
    <div style="font-family:'Hiragino Sans',sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#1e293b">
      <h2 style="color:#b45309;margin:0 0 12px">${name} さん、お申し込みありがとうございます！</h2>
      <p>${eventTitle ? `<strong>${eventTitle}</strong> のご参加申し込みを受け付けました。当日お会いできるのを楽しみにしています。` : 'みんなのWA へようこそ！ゲスト参加を受け付けました。'}</p>
      <hr style="border:none;border-top:1px solid #fde68a;margin:20px 0">
      <h3 style="color:#b45309;font-size:1rem;margin:0 0 8px">📌 本登録のご案内</h3>
      <p style="margin:0 0 12px">下記のリンクからパスワードを設定すると、メンバー特典・マイページ・掲示板書込みなど全ての機能が使えるようになります。</p>
      <p style="text-align:center;margin:16px 0">
        <a href="${reRegisterUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700">本登録を完了する</a>
      </p>
      <p style="font-size:.85rem;color:#64748b;margin:16px 0 0">URL を直接開く場合: <span style="word-break:break-all">${reRegisterUrl}</span></p>
      <p style="font-size:.78rem;color:#94a3b8;margin-top:24px">このメールは みんなのWA のシステムから自動送信されています。<br>ご返信いただいてもサポートできかねますのでご了承ください。</p>
    </div>
  `;
  const text = `${name} さん、お申し込みありがとうございます！\n\n${eventTitle ? eventTitle + ' のご参加申し込みを受け付けました。\n\n' : ''}本登録 URL:\n${reRegisterUrl}\n\nパスワードを設定するとメンバー機能が使えるようになります。`;
  return { subject, html, text };
}

module.exports = { sendMail, buildGuestWelcomeMail, FROM };
