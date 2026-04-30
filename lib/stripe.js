// lib/stripe.js
// Stripe クライアントのシングルトン管理。
// server.js の getStripe(data) と同じロジックを Lambda モジュールスコープに移植。
//
// 優先順位:
//   1. data.siteSettings.stripeSecretKey （管理画面で設定された値）
//   2. process.env.STRIPE_SECRET_KEY        （環境変数フォールバック）
//
// 同一 Lambda コンテナ内で key が変わった場合は再生成する。
'use strict';

const Stripe = require('stripe');

let _stripe = null;
let _lastKey = null;

/**
 * getStripe: data.siteSettings or env から secret key を引いて Stripe クライアントを返す
 * @param {object} data - readData() の戻り値
 * @returns {Stripe|null} 未設定なら null
 */
function getStripe(data) {
  const sk =
    (data && data.siteSettings && data.siteSettings.stripeSecretKey) ||
    process.env.STRIPE_SECRET_KEY ||
    '';
  if (!sk) return null;
  if (!_stripe || _lastKey !== sk) {
    _stripe = new Stripe(sk, { apiVersion: '2024-12-18.acacia' });
    _lastKey = sk;
  }
  return _stripe;
}

module.exports = { getStripe };
