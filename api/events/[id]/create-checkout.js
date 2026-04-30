// api/events/[id]/create-checkout.js
// POST /api/events/:id/create-checkout — Stripe Checkout Session 作成
// server.js 683-718 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../../lib/vercel-utils');
const { readData } = require('../../../lib/data-cache');
const { getStripe } = require('../../../lib/stripe');

async function POST(req, res) {
  try {
    const id = req.query.id;
    const body = await readJson(req);
    const { memberId } = body;

    const data = await readData();
    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) return fail(res, 404, 'イベントが見つかりません');

    const s = getStripe(data);
    if (!s) {
      return fail(res, 400, 'Stripe未設定です。管理画面でAPIキーを設定してください。');
    }
    if (!memberId) return fail(res, 400, 'memberId is required');

    // Parse fee (e.g. "3,000円" => 3000)
    const feeNum = parseInt(String(ev.fee || '0').replace(/[^0-9]/g, ''), 10) || 0;
    if (feeNum <= 0) return fail(res, 400, '参加費が設定されていません');

    const host = req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;

    const session = await s.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: ev.title,
              description: `${ev.date} ${ev.time || ''} @ ${ev.location}`,
            },
            unit_amount: feeNum,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?stripe_success=1&event=${ev.id}&member=${memberId}`,
      cancel_url: `${baseUrl}/?stripe_cancel=1&event=${ev.id}`,
      metadata: { eventId: ev.id, memberId },
    });

    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, url: session.url, sessionId: session.id });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Stripe error:', e && e.message);
    return fail(res, 500, 'Stripe決済エラー: ' + (e && e.message ? e.message : 'unknown'));
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
