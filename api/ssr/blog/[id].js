// api/ssr/blog/[id].js
// GET /blog/:id — ブログ記事の OG タグ + JSON-LD を埋め込んだ SSR HTML
// server.js 1423-1504 行目から移植
'use strict';

const path = require('path');
const fs = require('fs').promises;
const { withCors, withMethods, handleErr } = require('../../../lib/vercel-utils');
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
    // Search blogs first, then interviews
    let blog = (data.blogs || []).find((b) => b.id === id);
    if (!blog) {
      const iv = (data.interviews || []).find((i) => i.id === id);
      if (iv) {
        blog = {
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
        };
      }
    }
    if (!blog) {
      res.statusCode = 302;
      res.setHeader('Location', '/?blog_not_found=1');
      res.end();
      return;
    }

    // Vercel: public/index.html を使う（process.cwd() がプロジェクトルート）
    const htmlPath = path.join(process.cwd(), 'public', 'index.html');
    let html = await fs.readFile(htmlPath, 'utf8');

    const baseUrl = pickBaseUrl(req);
    const blogUrl = `${baseUrl}/blog/${blog.id}`;
    const title = `${blog.title} - みんなのWA`;
    const desc = (blog.excerpt || blog.content || 'みんなのWA お知らせ・活動レポート').substring(0, 200);
    const image = blog.imageUrl
      ? (blog.imageUrl.startsWith('http') ? blog.imageUrl : `${baseUrl}${blog.imageUrl}`)
      : `${baseUrl}/icon-512.png`;
    const dateISO = blog.date ? `${blog.date}T00:00:00+09:00` : new Date().toISOString();

    const ogTags = `
    <meta property="og:type" content="article">
    <meta property="og:url" content="${blogUrl}">
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="みんなのWA">
    <meta property="article:published_time" content="${dateISO}">
    <meta property="article:author" content="${(blog.author || '運営事務局').replace(/"/g, '&quot;')}">
    <meta property="article:section" content="${(blog.category || 'お知らせ').replace(/"/g, '&quot;')}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
    <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">
    <meta name="twitter:image" content="${image}">`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      mainEntityOfPage: { '@type': 'WebPage', '@id': blogUrl },
      headline: blog.title,
      description: desc,
      image: image,
      datePublished: dateISO,
      dateModified: dateISO,
      author: { '@type': 'Person', name: blog.author || '運営事務局' },
      publisher: {
        '@type': 'Organization',
        name: 'みんなのWA',
        logo: { '@type': 'ImageObject', url: `${baseUrl}/icon-512.png`, width: 512, height: 512 },
      },
      articleSection: blog.category || 'お知らせ',
      url: blogUrl,
      inLanguage: 'ja',
    };
    const jsonLdScript = `\n    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

    html = html.replace('</head>', `${ogTags}${jsonLdScript}\n</head>`);
    html = html.replace('</body>', `<script>window._autoOpenBlogId="${blog.id}";</script>\n</body>`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.end(html);
  } catch (e) {
    console.error('Blog page error:', e);
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
