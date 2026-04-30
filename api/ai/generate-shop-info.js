// api/ai/generate-shop-info.js
// POST /api/ai/generate-shop-info — Google Maps URL から店名/業種/紹介文を OpenAI で生成
// server.js 1619-1740 行目から移植
'use strict';

const path = require('path');
const { withCors, withMethods, readJson, ok, fail, handleErr } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

function resolveRedirect(url) {
  return new Promise((resolve) => {
    let mod;
    try { mod = url.startsWith('https') ? require('https') : require('http'); } catch { return resolve(url); }
    const rq = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        resolve(resp.headers.location);
      } else {
        resolve(url);
      }
    });
    rq.on('error', () => resolve(url));
    rq.setTimeout(8000, () => { try { rq.destroy(); } catch {} resolve(url); });
  });
}

async function POST(req, res) {
  try {
    const body = await readJson(req).catch(() => ({}));
    const { googleMapUrl } = body || {};
    if (!googleMapUrl) return fail(res, 400, 'Google Maps URLが必要です');

    // 1) リダイレクトを最大5段まで追跡して最終URLを得る
    let finalUrl = String(googleMapUrl);
    try {
      for (let i = 0; i < 5; i++) {
        const next = await resolveRedirect(finalUrl);
        if (next === finalUrl) break;
        finalUrl = next;
      }
    } catch { /* keep original */ }

    // 2) URL から place name を抽出
    const decoded = decodeURIComponent(finalUrl);
    let placeName = '';
    const placeMatch = decoded.match(/\/place\/([^/@]+)/);
    if (placeMatch) placeName = placeMatch[1].replace(/\+/g, ' ');
    if (!placeName) {
      const qMatch = decoded.match(/[?&]q=([^&]+)/);
      if (qMatch) placeName = qMatch[1].replace(/\+/g, ' ');
    }

    let rawPlaceName = placeName;
    if (placeName) {
      placeName = placeName
        .replace(/^〒[\d-]+\s*/, '')
        .replace(/^\d{3}-?\d{4}\s*/, '')
        .replace(/^日本[、,\s]+/, '')
        .trim();
      const addrStoreMatch = placeName.match(/[都道府県].+?[市区町村郡].+?[町村丁目条].{0,10}?[\d０-９]+[^\s]*\s+(.+)/);
      if (addrStoreMatch && addrStoreMatch[1]) {
        placeName = addrStoreMatch[1].trim();
      } else if (/^[^\s]{1,4}[都道府県]/.test(placeName)) {
        const numSplit = placeName.match(/[\d０-９]+[−\-号]*\s+(.+)/);
        if (numSplit && numSplit[1]) {
          placeName = numSplit[1].trim();
        } else {
          placeName = '';
        }
      }
    }

    // 3) AI 生成試行
    let aiResult = null;
    try {
      const OpenAI = require('openai');

      // API key の取得優先順位:
      //   1) OPENAI_API_KEY (env)
      //   2) siteSettings.openaiKey (Supabase)
      //   3) ~/.genspark_llm.yaml (ローカル開発用)
      let apiKey = process.env.OPENAI_API_KEY || '';
      let baseURL = process.env.OPENAI_BASE_URL || '';

      if (!apiKey) {
        try {
          const data = await readData();
          const ss = data && data.siteSettings || {};
          if (ss.openaiKey) apiKey = ss.openaiKey;
          if (ss.openaiBaseURL) baseURL = baseURL || ss.openaiBaseURL;
        } catch { /* siteSettings 取得失敗は無視 */ }
      }

      if (!apiKey) {
        try {
          const yaml = require('js-yaml');
          const fs = require('fs');
          const os = require('os');
          const configPath = path.join(os.homedir(), '.genspark_llm.yaml');
          const aiConfig = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
          apiKey = apiKey || (aiConfig.openai && aiConfig.openai.api_key) || '';
          baseURL = baseURL || (aiConfig.openai && aiConfig.openai.base_url) || '';
        } catch { /* file not found / parse error */ }
      }

      if (apiKey) {
        const clientOpts = { apiKey };
        if (baseURL) clientOpts.baseURL = baseURL;
        const client = new OpenAI(clientOpts);
        const prompt = `Google Maps情報(生データ): ${rawPlaceName || '不明'}\n抽出した店名: ${placeName || '不明'}\nGoogle Maps URL: ${googleMapUrl}\n解決URL: ${decoded.substring(0, 300)}\n\n上記のGoogle Maps情報から店舗を特定し、以下のJSON形式で返してください。\n\n【重要ルール】\n- "profession" には店名のみを入れてください。住所・郵便番号・地域名は絶対に含めないでください。例: "○○カフェ" "△△サロン"\n- "business" にはその店が提供する主なサービスや業種を短くまとめてください（例: "カフェ・焙煎豆販売", "美容脱毛・ホワイトニング", "整骨・鍼灸"）\n- "introduction" は店の特徴・魅力・人気メニューやサービスを含めて120文字程度で書いてください\n- 実在する店舗の情報をできる限りリサーチし、正確な内容にしてください\n\n{"profession":"店名のみ","introduction":"120文字程度の紹介文","business":"主なサービス・業種"}`;

        const completion = await client.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [
            { role: 'system', content: 'あなたはGoogleマップの店舗情報を正確にリサーチし、店名・サービス内容・紹介文を生成するプロのアシスタントです。店名には住所や地域名を絶対に含めないでください。提供サービスをできるだけ具体的に調べてください。JSONのみ返してください。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });
        const text = (completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content) || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('[ai] fallback:', e && e.message, e && e.status || '');
    }

    // 4) AI 結果のクレンジング & 返却
    if (aiResult && aiResult.profession) {
      aiResult.profession = (aiResult.profession || '')
        .replace(/^〒[\d-]+\s*/, '')
        .replace(/^[\d-]+\s*/, '')
        .replace(/^日本[、,\s]+/, '')
        .replace(/^[^\s]{1,4}[都道府県][^\s]*[市区町村郡][^\s]*\s*/, '')
        .trim();
      res.setHeader('Cache-Control', 'no-store');
      return ok(res, { success: true, ...aiResult, placeName });
    }

    if (placeName) {
      res.setHeader('Cache-Control', 'no-store');
      return ok(res, {
        success: true,
        profession: placeName,
        business: '',
        introduction: '',
        placeName,
        note: 'マップURLから店名を取得しました。紹介文は手動で入力してください。',
      });
    }

    return fail(res, 400, 'URLから店舗情報を取得できませんでした。正しいGoogle Maps URLを入力してください。');
  } catch (e) {
    console.error('[ai/generate-shop-info] error:', e && e.message);
    return handleErr(res, e, '情報取得に失敗しました');
  }
}

module.exports = withCors(withMethods({ POST }));
module.exports.config = { runtime: 'nodejs' };
