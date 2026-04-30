// api/ssr/sitemap.js
// GET /sitemap.xml — sitemap protocol XML
// server.js 1301-1349 行目から移植
'use strict';

const { withCors, withMethods } = require('../../lib/vercel-utils');
const { readData } = require('../../lib/data-cache');

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pickBaseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`.replace(/\/$/, '');
}

async function GET(req, res) {
  try {
    const baseUrl = pickBaseUrl(req);
    const data = await readData();
    const now = new Date().toISOString();
    const urls = [];
    urls.push({ loc: `${baseUrl}/`, lastmod: now, changefreq: 'weekly', priority: '1.0' });
    ['#about', '#events', '#blogs', '#members', '#board', '#faq', '#contact'].forEach((h) => {
      urls.push({ loc: `${baseUrl}/${h}`, lastmod: now, changefreq: 'weekly', priority: '0.8' });
    });
    (data.blogs || []).forEach((b) => {
      if (b && b.id) {
        urls.push({
          loc: `${baseUrl}/blog/${encodeURIComponent(b.id)}`,
          lastmod: b.date || now,
          changefreq: 'monthly',
          priority: '0.7',
        });
      }
    });
    (data.interviews || []).forEach((iv) => {
      if (iv && iv.id) {
        urls.push({
          loc: `${baseUrl}/blog/${encodeURIComponent(iv.id)}`,
          lastmod: iv.date || now,
          changefreq: 'monthly',
          priority: '0.7',
        });
      }
    });
    (data.events || []).forEach((ev) => {
      if (ev && ev.id) {
        urls.push({
          loc: `${baseUrl}/event/${encodeURIComponent(ev.id)}`,
          lastmod: ev.updatedAt || ev.date || now,
          changefreq: 'weekly',
          priority: '0.7',
        });
      }
    });
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls
        .map(
          (u) =>
            `  <url><loc>${escXml(u.loc)}</loc><lastmod>${escXml(u.lastmod)}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
        )
        .join('\n') +
      '\n</urlset>\n';

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(xml);
  } catch (e) {
    console.error('sitemap error', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('sitemap error');
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
