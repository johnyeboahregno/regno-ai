# BullMQ execution workers image (starting point — refine in Phase 5)
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install --no-audit --no-fund
CMD ["npx", "tsx", "apps/execution/src/index.ts"]
