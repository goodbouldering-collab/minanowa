// api/ssr/feed.js
// GET /feed (and /rss → /feed) — RSS 2.0 XML
// server.js 1352-1420 行目から移植
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
    const data = await readData();
    const allPosts = (data.blogs || []).slice();
    (data.interviews || []).forEach((iv) => {
      if (!allPosts.some((b) => b.id === iv.id)) {
        allPosts.push({
          id: iv.id,
          title: iv.title || '',
          date: iv.date || '',
          category: '活動ムービー',
          excerpt: iv.description || '',
          content: iv.description || '',
          author: iv.speaker || '運営事務局',
          imageUrl: iv.youtubeId ? `https://img.youtube.com/vi/${iv.youtubeId}/hqdefault.jpg` : '',
          youtubeId: iv.youtubeId || '',
          youtubeUrl: iv.youtubeUrl || '',
        });
      }
    });
    const blogs = allPosts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const baseUrl = pickBaseUrl(req);
    const lastBuild = blogs.length
      ? new Date(blogs[0].date + 'T00:00:00+09:00').toUTCString()
      : new Date().toUTCString();

    let items = '';
    for (const b of blogs) {
      const link = `${baseUrl}/blog/${b.id}`;
      const pubDate = new Date(b.date + 'T00:00:00+09:00').toUTCString();
      const img = b.imageUrl ? (b.imageUrl.startsWith('http') ? b.imageUrl : `${baseUrl}${b.imageUrl}`) : '';
      const desc = b.excerpt || b.content || '';
      items += `
    <item>
      <title>${escXml(b.title)}</title>
      <link>${escXml(link)}</link>
      <guid isPermaLink="true">${escXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escXml(desc)}</description>
      <category>${escXml(b.category || 'お知らせ')}</category>
      <dc:creator>${escXml(b.author || '運営事務局')}</dc:creator>${
        img
          ? `
      <enclosure url="${escXml(img)}" type="image/jpeg" length="0"/>
      <media:content url="${escXml(img)}" medium="image"/>`
          : ''
      }
    </item>`;
    }

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>みんなのWA - お知らせ・活動レポート</title>
    <link>${baseUrl}</link>
    <description>彦根発 異業種交流コミュニティ「みんなのWA」のお知らせ・活動レポート</description>
    <language>ja</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/favicon.svg</url>
      <title>みんなのWA</title>
      <link>${baseUrl}</link>
    </image>${items}
  </channel>
</rss>`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(rss);
  } catch (e) {
    console.error('RSS feed error:', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('RSS generation error');
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
