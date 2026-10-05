# Works on Railway (auto-detected), any VPS (docker compose), Fly, Koyeb, etc.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY . .
# /data holds the JSON database when you are NOT using Postgres - mount a volume here
RUN mkdir -p /data && chown -R node:node /app /data
ENV DATA_DIR=/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1
CMD ["node", "server.js"]
