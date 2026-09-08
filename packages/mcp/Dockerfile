FROM node:24.20.0-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/mcp/package.json apps/mcp/
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @wellworn/mcp...
COPY apps/mcp ./apps/mcp
RUN pnpm --filter @wellworn/mcp build \
 && pnpm --filter @wellworn/mcp --prod deploy --legacy /out

FROM node:24.20.0-alpine AS run
RUN addgroup -S app && adduser -S app -G app && apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=production PORT=3001
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
COPY --from=build --chown=app:app /out ./
USER app
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD curl -fsS http://127.0.0.1:3001/health || exit 1
CMD ["node", "dist/main.js"]
