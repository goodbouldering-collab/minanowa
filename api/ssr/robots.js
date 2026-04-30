// api/ssr/robots.js
// GET /robots.txt — robots exclusion
// server.js 1286-1299 行目から移植
'use strict';

const { withCors, withMethods } = require('../../lib/vercel-utils');

function pickBaseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`.replace(/\/$/, '');
}

async function GET(req, res) {
  const baseUrl = pickBaseUrl(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin.html',
    'Disallow: /api/',
    'Disallow: /uploads/_private/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.end(body);
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
