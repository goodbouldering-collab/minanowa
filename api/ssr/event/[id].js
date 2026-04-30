// api/ssr/event/[id].js
// GET /event/:id — イベント詳細の OG タグ + Event JSON-LD を埋め込んだ SSR HTML
// server.js 1559-1610 行目から移植
'use strict';

const path = require('path');
const fs = require('fs').promises;
const { withCors, withMethods } = require('../../../lib/vercel-utils');
const { readData } = require('../../../lib/data-cache');

function pickBaseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`.replace(/\/$/, '');
}

async function GET(req, res) {
  try {
    const id = req.query.id;
    const data = await readData();
    const ev = (data.events || []).find((e) => e.id === id);
    if (!ev) {
      res.statusCode = 302;
      res.setHeader('Location', '/?event_not_found=1');
      res.end();
      return;
    }

    const htmlPath = path.join(process.cwd(), 'public', 'index.html');
    let html = await fs.readFile(htmlPath, 'utf8');

    const baseUrl = pickBaseUrl(req);
    const shareUrl = `${baseUrl}/event/${ev.id}`;
    const title = `${ev.title} - みんなのWA`;
    const desc = `📅 ${ev.date} ${ev.time || ''} 📍 ${ev.location} | 💰 ${ev.fee || '未設定'} | ${ev.description || 'みんなのWA イベント'}`;
    const image = ev.imageUrl
      ? (ev.imageUrl.startsWith('http') ? ev.imageUrl : `${baseUrl}${ev.imageUrl}`)
      : `${baseUrl}/icon-512.png`;
    const isoStart = ev.date
      ? `${ev.date}T${(ev.time || '19:00').replace(/[^0-9:]/g, '').slice(0, 5) || '19:00'}:00+09:00`
      : new Date().toISOString();

    const evJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: ev.title,
      startDate: isoStart,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: ev.location || '彦根市内',
        address: {
          '@type': 'PostalAddress',
          addressLocality: '彦根市',
          addressRegion: '滋賀県',
          addressCountry: 'JP',
        },
      },
      image: [image],
      description: ev.description || 'みんなのWA 異業種交流会',
      organizer: { '@type': 'Organization', name: 'みんなのWA', url: baseUrl },
      url: shareUrl,
      inLanguage: 'ja-JP',
      isAccessibleForFree: !ev.fee || /無料|free/i.test(ev.fee || ''),
      offers: ev.fee
        ? {
            '@type': 'Offer',
            price: String(ev.fee).replace(/[^0-9]/g, '') || '0',
            priceCurrency: 'JPY',
            availability: 'https://schema.org/InStock',
            url: shareUrl,
          }
        : undefined,
    };

    const ogTags = `
    <meta property="og:type" content="website">
    <meta property="og:url" content="${shareUrl}">
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="みんなのWA">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
    <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta name="twitter:image" content="${image}">
    <script type="application/ld+json">${JSON.stringify(evJsonLd)}</script>`;

    html = html.replace('</head>', `${ogTags}\n</head>`);
    html = html.replace('</body>', `<script>window._autoOpenEventId="${ev.id}";</script>\n</body>`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.end(html);
  } catch (e) {
    console.error('Event share page error:', e);
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
