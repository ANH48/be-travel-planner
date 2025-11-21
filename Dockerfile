# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with production flag
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source files
COPY . .

# Generate Prisma client
RUN npx prisma generate --no-engine

# Build the application
RUN npm run build:tsc

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]
