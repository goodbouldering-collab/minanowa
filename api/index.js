// Vercel Serverless Function エントリポイント
// Express app を server.js からインポートして Vercel に渡す
const app = require('../server');

module.exports = app;
