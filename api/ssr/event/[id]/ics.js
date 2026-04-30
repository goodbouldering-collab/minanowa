// api/ssr/event/[id]/ics.js
// GET /event/:id/ics — iCalendar 形式 (RFC 5545)
// server.js 1507-1556 行目から移植
'use strict';

const { withCors, withMethods } = require('../../../../lib/vercel-utils');
const { readData } = require('../../../../lib/data-cache');

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
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('event not found');
      return;
    }
    const pad = (n) => String(n).padStart(2, '0');
    const toUtc = (iso) => {
      const d = new Date(iso);
      return (
        d.getUTCFullYear() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        'Z'
      );
    };
    const timeRaw = (ev.time || '19:00').replace(/[^0-9:]/g, '').slice(0, 5) || '19:00';
    const startJst = `${ev.date}T${timeRaw}:00+09:00`;
    const startDt = new Date(startJst);
    const endDt = new Date(startDt.getTime() + 2 * 60 * 60 * 1000);
    const dtstart = toUtc(startDt);
    const dtend = toUtc(endDt);
    const dtstamp = toUtc(new Date());
    const esc = (s) => String(s || '').replace(/[\\,;]/g, (m) => '\\' + m).replace(/\r?\n/g, '\\n');
    const baseUrl = pickBaseUrl(req);
    const url = `${baseUrl}/event/${ev.id}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//minanowa//event//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${ev.id}@minanowa`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${esc(ev.title || 'みんなのWA イベント')}`,
      `DESCRIPTION:${esc((ev.description || '') + '\n参加申込: ' + url)}`,
      `LOCATION:${esc(ev.location || '彦根市内')}`,
      `URL:${url}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="event-${encodeURIComponent(ev.id)}.ics"`);
    res.end(ics);
  } catch (e) {
    console.error('ics error', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('ics generation error');
  }
}

module.exports = withCors(withMethods({ GET }));
module.exports.config = { runtime: 'nodejs' };
