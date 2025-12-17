FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy all source code
COPY apps/auth-svc ./apps/auth-svc
COPY libs ./libs

# Install dependencies
RUN npm ci

# Generate Prisma Client
WORKDIR /app/apps/auth-svc
RUN npx prisma generate

# Build the application
WORKDIR /app
RUN npm run build auth-svc

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist/apps/auth-svc ./dist
COPY --from=builder /app/apps/auth-svc/prisma ./prisma
COPY --from=builder /app/libs/proto ./libs/proto
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Generate Prisma Client in production
RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 50051

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js"]
