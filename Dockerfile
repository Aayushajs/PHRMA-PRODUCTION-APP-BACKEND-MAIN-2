# Build stage
FROM node:22.22.0-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:22.22.0-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package.json package-lock.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 5002

USER node

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/server.js"]
