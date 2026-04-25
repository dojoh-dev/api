FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock ./
ENV CI=true
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=install /usr/src/app/node_modules node_modules
COPY . .
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
	bunx --bun prisma generate && \
	bun run build

FROM base AS runner
COPY --from=install /usr/src/app/node_modules node_modules
COPY --from=builder /usr/src/app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /usr/src/app/dist dist

ENV NODE_ENV=production

USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "dist/index.js" ]
