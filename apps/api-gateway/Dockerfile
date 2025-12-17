FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy all source code
COPY apps/api-gateway ./apps/api-gateway
COPY libs ./libs

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build api-gateway

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist/apps/api-gateway ./dist
COPY --from=builder /app/libs/proto ./libs/proto

EXPOSE 3000

CMD ["node", "dist/main.js"]
