// api/health.js
// Vercel Preview / Production の疎通確認用エンドポイント。
// GET /api/health → { ok: true, timestamp, supabase, runtime, region }
'use strict';

const { withCors, withMethods, ok } = require('../lib/vercel-utils');

module.exports = withCors(
  withMethods({
    GET: async (req, res) => {
      ok(res, {
        ok: true,
        timestamp: Date.now(),
        supabase: !!process.env.SUPABASE_URL,
        supabaseSchema: process.env.SUPABASE_SCHEMA || 'legacy_minanowa',
        runtime: 'nodejs',
        region: process.env.VERCEL_REGION || null,
        env: process.env.VERCEL_ENV || 'local',
        commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
      });
    },
  })
);

module.exports.config = { runtime: 'nodejs' };
