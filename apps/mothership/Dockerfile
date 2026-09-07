# Regno Mothership — control-plane SvelteKit app + API.
# Mirrors apps/web/Dockerfile but builds @regno/mothership.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY docs ./docs
COPY scripts ./scripts
COPY profile ./profile
COPY standards ./standards
RUN npm install --no-audit --no-fund
RUN npm run build -w @regno/mothership

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# kubectl — drives the per-Architect cluster console (/app/architects/<slug>/console).
# Pinned to a stable release for reproducibility; k3s is broadly compatible with any recent client.
RUN apk add --no-cache curl ca-certificates \
 && curl -fsSL -o /usr/local/bin/kubectl https://dl.k8s.io/release/v1.30.2/bin/linux/amd64/kubectl \
 && chmod +x /usr/local/bin/kubectl
COPY --from=build /app/apps/mothership/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/docs ./docs
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/profile ./profile
COPY --from=build /app/standards ./standards
EXPOSE 3000
CMD ["node", "build"]
