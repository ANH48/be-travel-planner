#!/bin/bash
# Build script optimized for low memory environments

echo "🔧 Setting memory limit..."
export NODE_OPTIONS="--max-old-space-size=460"

echo "📦 Installing dependencies..."
npm ci --only=production

echo "🔨 Generating Prisma Client..."
npx prisma generate --no-engine

echo "🏗️  Building application with TypeScript..."
npx tsc -p tsconfig.build.json

echo "✅ Build complete!"
