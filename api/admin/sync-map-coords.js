// api/admin/sync-map-coords.js
// POST /api/admin/sync-map-coords
//   現在の各 member について googleMapUrl から座標を resolve して保存する。
//
// 旧 server.js 1743-1761 では SEED_DATA_FILE (data.json) から座標をコピーしていたが、
// Vercel ではローカル data.json は存在しないため、Google Maps URL から動的に解決する方式に変更。
'use strict';

const { withCors, withMethods, requireAdmin, ok, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');

function resolveCoords(googleMapUrl) {
  return new Promise((resolve) => {
    let mod;
    try { mod = googleMapUrl.startsWith('https') ? require('https') : require('http'); } catch { return resolve(null); }
    let finalUrl = googleMapUrl;
    let body = '';

    const follow = (url, depth) => {
      if (depth > 5) {
        return finish();
      }
      const m = url.startsWith('https') ? require('https') : require('http');
      const rq = m.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          finalUrl = resp.headers.location;
          follow(resp.headers.location, depth + 1);
        } else {
          resp.on('data', (c) => { body += c; });
          resp.on('end', finish);
          resp.on('error', finish);
        }
      });
      rq.on('error', finish);
      rq.setTimeout(8000, () => { try { rq.destroy(); } catch {} finish(); });
    };

    function finish() {
      const cm = (finalUrl || '').match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (cm) return resolve({ mapLat: parseFloat(cm[1]), mapLng: parseFloat(cm[2]) });
      if (body) {
        const cm2 = body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (cm2) return resolve({ mapLat: parseFloat(cm2[1]), mapLng: parseFloat(cm2[2]) });
      }
      resolve(null);
    }

    follow(googleMapUrl, 0);
  });
}

async function POST(req, res) {
  try {
    const data = await readData();
    await requireAdmin(req, data);

    let count = 0;
    for (const m of data.members || []) {
      if (m.mapLat && m.mapLng) continue;
      if (!m.googleMapUrl) continue;
      const coords = await resolveCoords(m.googleMapUrl).catch(() => null);
      if (coords && coords.mapLat && coords.mapLng) {
        m.mapLat = coords.mapLat;
        m.mapLng = coords.mapLng;
        count++;
      }
    }
    if (count > 0) await writeData(data);

    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, synced: count });
  } catch (e) {
    return handleErr(res, e, 'sync-map-coords に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
