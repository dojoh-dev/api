FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock ./
ENV CI=true
ENV LEFTHOOK=0
RUN bun install --frozen-lockfile --ignore-scripts

FROM base AS builder
COPY --from=install /usr/src/app/node_modules node_modules
COPY . .
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate && \
	bun run build

FROM base AS runner
COPY --from=install /usr/src/app/node_modules node_modules
COPY --from=install /usr/src/app/package.json package.json
COPY --from=builder /usr/src/app/dist dist

ENV NODE_ENV=production

USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "dist/index.js" ]
