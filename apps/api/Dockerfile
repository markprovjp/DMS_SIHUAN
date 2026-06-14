# Multi-stage Dockerfile for NestJS API (production)
# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# Copy workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/rule-engine/package.json ./packages/rule-engine/
COPY packages/ai-prompts/package.json ./packages/ai-prompts/
COPY packages/mobiwork-client/package.json ./packages/mobiwork-client/

RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: build
FROM deps AS build
COPY prisma ./prisma
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma client
RUN pnpm --filter @dms-admin/api exec prisma generate

# Build api
RUN pnpm --filter @dms-admin/api build

# Stage 3: runtime
FROM node:20-alpine AS runtime
WORKDIR /app

# Run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy only what we need
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

USER nestjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check — gọi /api/health
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

WORKDIR /app/apps/api
CMD ["node", "dist/main.js"]
