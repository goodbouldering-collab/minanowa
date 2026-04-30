// api/og-image.js
// GET /api/og-image?url=... — 指定 URL の HTML を fetch して og:image を抽出
// server.js 1090-1107 行目から移植
'use strict';

const { withCors, withMethods, ok, handleErr } = require('../lib/vercel-utils');

function fetchHtml(targetUrl) {
  return new Promise((resolve) => {
    let mod;
    try {
      mod = targetUrl.startsWith('https') ? require('https') : require('http');
    } catch (e) {
      return resolve('');
    }
    try {
      const rq = mod.get(targetUrl, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinnanoWA/1.0)' } }, (resp) => {
        let html = '';
        resp.on('data', (c) => { html += c; });
        resp.on('end', () => resolve(html));
        resp.on('error', () => resolve(''));
      });
      rq.on('error', () => resolve(''));
      rq.setTimeout(5000, () => { try { rq.destroy(); } catch {} resolve(''); });
    } catch {
      resolve('');
    }
  });
}

async function GET(req, res) {
  try {
    const url = req.query && req.query.url;
    if (!url) return ok(res, { image: '' });
    const html = await fetchHtml(String(url));
    const ogMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    return ok(res, { image: ogMatch ? ogMatch[1] : '' });
  } catch (e) {
    // 失敗時も 200 で空文字を返す（既存挙動を踏襲）
    return ok(res, { image: '' });
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
