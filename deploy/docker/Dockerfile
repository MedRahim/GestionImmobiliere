# Build: docker compose build (depuis deploy/docker)
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
RUN mkdir -p uploads && chown -R node:node /app

USER node
EXPOSE 5000

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

CMD ["node", "src/app.js"]
