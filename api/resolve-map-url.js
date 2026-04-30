// api/resolve-map-url.js
// POST /api/resolve-map-url — 短縮 URL → 解決 → 座標抽出（フォールバックで Nominatim ジオコーディング）
// server.js 449-537 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, handleErr } = require('../lib/vercel-utils');

function geocodeAddress(address) {
  const https = require('https');
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(address);
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`;
    https.get(geoUrl, { headers: { 'User-Agent': 'MinnanoWA/1.0' } }, (resp) => {
      let body = '';
      resp.on('data', (c) => { body += c; });
      resp.on('end', () => {
        try {
          const results = JSON.parse(body);
          if (Array.isArray(results) && results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function followRedirects(initialUrl) {
  const https = require('https');
  const http = require('http');
  return new Promise((resolve) => {
    const follow = (url, depth) => {
      if (depth > 8) return resolve({ resolvedUrl: url });
      let mod;
      try { mod = url.startsWith('https') ? https : http; } catch { return resolve({ resolvedUrl: url }); }
      const rq = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinnanoWA/1.0)' } }, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          follow(resp.headers.location, depth + 1);
        } else {
          let body = '';
          resp.on('data', (c) => { body += c; });
          resp.on('end', () => resolve({ resolvedUrl: resp.headers.location || url, body }));
        }
      });
      rq.on('error', () => resolve({ resolvedUrl: url }));
      rq.setTimeout(10000, () => { try { rq.destroy(); } catch {} resolve({ resolvedUrl: url }); });
    };
    follow(initialUrl, 0);
  });
}

async function POST(req, res) {
  try {
    const body = await readJson(req).catch(() => ({}));
    const { url } = body || {};
    if (!url) return ok(res, {});

    const r = await followRedirects(String(url));

    // 1) resolved URL から @lat,lng を直接抽出
    const m = (r.resolvedUrl || '').match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (m) return ok(res, { lat: parseFloat(m[1]), lng: parseFloat(m[2]), resolvedUrl: r.resolvedUrl });

    // 2) HTML body 内の座標
    if (r.body) {
      const m2 = r.body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (m2) return ok(res, { lat: parseFloat(m2[1]), lng: parseFloat(m2[2]) });
    }

    // 3) ?q= から住所抽出 → ジオコード（段階的フォールバック）
    const resolvedUrl = r.resolvedUrl || url;
    try {
      const urlObj = new URL(resolvedUrl);
      const qParam = urlObj.searchParams.get('q');
      if (qParam) {
        let address = qParam
          .replace(/\+/g, ' ')
          .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
          .replace(/[−－]/g, '-')
          .replace(/〒?\d{3}-?\d{4}\s*/g, '')
          .trim();

        let coords = await geocodeAddress(address);
        if (!coords) {
          const fullMatch = address.match(/(.*?[都道府県].*?[市区町村郡].*?[町村][\d-]*)/);
          if (fullMatch) coords = await geocodeAddress(fullMatch[1].trim());
        }
        if (!coords) {
          const townMatch = address.match(/(.*?[都道府県].*?[市区町村郡].*?[町村])/);
          if (townMatch) coords = await geocodeAddress(townMatch[1].trim());
        }
        if (!coords) {
          const prefCity = address.match(/(.*?[市区町村郡])/);
          if (prefCity) coords = await geocodeAddress(prefCity[1].trim());
        }
        if (coords) return ok(res, { ...coords, resolvedUrl });
      }
    } catch { /* URL parsing failed */ }

    return ok(res, { resolvedUrl });
  } catch (e) {
    // 既存挙動: 失敗時は空オブジェクトを返す
    return ok(res, {});
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
