# syntax=docker/dockerfile:1

FROM oven/bun:1.1.13 as build

WORKDIR /app

# Copy package and lock files
COPY package.json tsconfig.json ./
RUN bun install

# Copy source code
COPY ./src ./src

# Build TypeScript
RUN bun run build

FROM oven/bun:1.1.13 as runtime

WORKDIR /app

COPY package.json ./
COPY --from=build /app/build ./build

# Railway sets env vars, .env is optional
ENV NODE_ENV=production

# Railway expects a PORT, but this server uses stdio, so we just set a dummy port
ENV PORT=8080

# Railway expects a start command
CMD ["bun", "run", "build/index.js"]
