# SSE realtime server image (starting point — refine in Phase 5)
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install --no-audit --no-fund
CMD ["npx", "tsx", "apps/realtime/src/index.ts"]
