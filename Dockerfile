# ============================================================
# Dockerfile - みんなのWA (フルスタック)
# ============================================================
# Node.js Express サーバー + 静的ファイルをまとめてデプロイ
#
# ビルド:   docker build -t minanowa .
# 実行:     docker run -p 3000:3000 minanowa
#
# 対応ホスティング:
#   - Render (render.yaml 参照)
#   - Railway
#   - Fly.io (fly.toml 参照)
#   - Google Cloud Run
#   - AWS App Runner
# ============================================================

FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy application files
COPY server.js ./
COPY index.html ./
COPY admin.html ./
COPY favicon.svg ./

# Create data and upload directories
RUN mkdir -p uploads backups

# Initialize data.json if not mounted
RUN echo '{"members":[],"events":[],"blogs":[],"messages":[],"groupChats":[],"boards":[],"siteSettings":{},"interviews":[],"operatingMembers":[]}' > data.json

# Expose port
ENV PORT=3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
