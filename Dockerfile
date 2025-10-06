# syntax=docker/dockerfile:1

FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY ./src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine as runtime

WORKDIR /app

# Copy package.json and install only production dependencies
COPY package.json ./
RUN npm install --production

# Copy built files from build stage
COPY --from=build /app/build ./build

# Set environment
ENV NODE_ENV=production

# Railway will provide PORT automatically
EXPOSE ${PORT:-3000}

# Start the server
CMD ["node", "build/index.js"]