// api/members/[id].js
// GET /api/members/:id   — メンバー詳細（password を除外）
// PUT /api/members/:id   — 自分自身のプロフィール更新（名前×お店重複チェック / Google マップ座標自動取得）
// server.js 402-446 行目から移植
'use strict';

const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData, writeData } = require('../../lib/data-cache');
const { hashPassword } = require('../../lib/auth');

// 名前×お店 重複チェック共通ヘルパ（server.js / register.js と同一）
function _normForDup(s) { return String(s || '').trim().replace(/\s+/g, '').toLowerCase(); }
function findNameShopDuplicate(members, { name, business, profession }) {
  const nName = _normForDup(name);
  const nBiz = _normForDup(business);
  const nProf = _normForDup(profession);
  if (!nName || (!nBiz && !nProf)) return null;
  return members.find((m) => {
    if (_normForDup(m.name) !== nName) return false;
    const sameBiz = nBiz && _normForDup(m.business) === nBiz;
    const sameProf = nProf && _normForDup(m.profession) === nProf;
    return sameBiz || sameProf;
  }) || null;
}
const NAME_SHOP_DUP_MSG = '同じお名前と店舗・事業内容で既に登録されています。お心当たりがある場合はログインまたはパスワード再設定をお試しください。';

// Google Maps URL から座標を抽出して updates に反映
async function _resolveMapCoords(updates) {
  try {
    const https = require('https');
    const http = require('http');
    const mod = updates.googleMapUrl.startsWith('https') ? https : http;
    const r = await new Promise((resolve) => {
      mod.get(updates.googleMapUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          resolve({ resolvedUrl: resp.headers.location });
        } else {
          let b = '';
          resp.on('data', (c) => (b += c));
          resp.on('end', () => resolve({ resolvedUrl: resp.headers.location || updates.googleMapUrl, body: b }));
        }
      }).on('error', () => resolve({}));
    });
    const cm = (r.resolvedUrl || '').match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (cm) {
      updates.mapLat = parseFloat(cm[1]);
      updates.mapLng = parseFloat(cm[2]);
    } else if (r.body) {
      const cm2 = r.body.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (cm2) {
        updates.mapLat = parseFloat(cm2[1]);
        updates.mapLng = parseFloat(cm2[2]);
      }
    }
  } catch (e) {
    /* keep without coords */
  }
}

async function GET(req, res) {
  try {
    const id = req.query.id;
    const data = await readData();
    const m = data.members.find((mm) => mm.id === id);
    if (!m) return fail(res, 404, 'not found');
    const { password, ...safe } = m;
    return ok(res, safe);
  } catch (e) {
    return handleErr(res, e);
  }
}

async function PUT(req, res) {
  try {
    const id = req.query.id;
    const body = await readJson(req);
    const data = await readData();
    const idx = data.members.findIndex((m) => m.id === id);
    if (idx === -1) return fail(res, 404, 'not found');

    const updates = { ...body };
    if (updates.password) updates.password = await hashPassword(updates.password);

    // 名前×お店の重複チェック（自分自身は除外）
    const merged = { ...data.members[idx], ...updates };
    const others = data.members.filter((m) => m.id !== data.members[idx].id);
    if (findNameShopDuplicate(others, { name: merged.name, business: merged.business, profession: merged.profession })) {
      return fail(res, 409, NAME_SHOP_DUP_MSG);
    }

    // Auto-cache map coordinates when googleMapUrl changes
    if (updates.googleMapUrl && updates.googleMapUrl !== data.members[idx].googleMapUrl) {
      await _resolveMapCoords(updates);
    }

    data.members[idx] = { ...data.members[idx], ...updates, id: data.members[idx].id };
    await writeData(data);

    const { password, ...safe } = data.members[idx];
    res.setHeader('Cache-Control', 'no-store');
    return ok(res, { success: true, member: safe });
  } catch (e) {
    return handleErr(res, e);
  }
}

module.exports = withCors(withMethods({ GET, PUT }));
module.exports.config = { runtime: 'nodejs' };
