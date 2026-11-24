FROM node:26.7.0-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/root/.npm \
    npm install --global --no-audit --no-fund pnpm@11.5.0

FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN export CI=true NODE_ENV=production \
    TURSO_DATABASE_URL=file:/tmp/blog-build.db \
    BETTER_AUTH_URL=http://localhost:4400 \
    BETTER_AUTH_SECRET=docker-build-only-better-auth-secret-0123456789 \
    && pnpm db:migrate \
    && pnpm build \
    && rm -rf .next/cache

FROM base AS runtime

ENV NODE_ENV=production HOST=0.0.0.0 PORT=4400
RUN install -d -o node -g node /app/data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY . .

USER node
EXPOSE 4400
CMD ["node", "--import", "tsx", "server.ts"]
