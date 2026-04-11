# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# Production stage
FROM oven/bun:latest

WORKDIR /app

RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist

EXPOSE 5002

ENTRYPOINT ["dumb-init", "--"]

CMD ["bun", "run", "dist/server.js"]
