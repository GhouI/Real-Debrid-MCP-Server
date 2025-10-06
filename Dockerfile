# syntax=docker/dockerfile:1

# Build stage - compile TypeScript
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm install

# Copy source code
COPY ./src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage - run the app
FROM node:20-alpine

WORKDIR /app

# Copy package.json
COPY package.json ./

# Install ONLY production dependencies (no TypeScript, no @types)
RUN npm install --omit=dev

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/build ./build

# Set production environment
ENV NODE_ENV=production

# Railway provides PORT - expose it for documentation
EXPOSE 3000

# Start the server
CMD ["node", "build/index.js"]