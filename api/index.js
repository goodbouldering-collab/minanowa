// Vercel Serverless Function エントリポイント
// Express app を serverless-http でラップして Vercel に渡す
const serverless = require('serverless-http');
const app = require('../server');

module.exports = serverless(app);
