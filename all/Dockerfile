# 构建上下文为仓库中的 goutcare---doctor-portal (1) 目录（见 docker-compose.yml）
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 前端 AI 能力在构建期注入（与本地 Vite 行为一致）
ARG GEMINI_API_KEY=
ENV GEMINI_API_KEY=$GEMINI_API_KEY

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx@^4.21.0

COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY server ./server
COPY tsconfig.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npx", "tsx", "server.ts"]
