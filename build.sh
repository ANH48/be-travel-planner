#!/bin/bash
# Ultra-minimal build for <512MB environments

echo "🔧 Setting strict memory limit..."
export NODE_OPTIONS="--max-old-space-size=300 --gc-global --optimize-for-size"

echo "🧹 Cleaning..."
rm -rf node_modules/.cache dist

echo "📦 Installing minimal dependencies..."
# Install only what we absolutely need
npm install --production --no-optional --prefer-offline --no-audit --no-fund

echo "🔨 Generating Prisma..."
npx prisma generate --no-engine --no-hints

echo "🏗️ Compiling (using tsc directly)..."
# Use plain tsc to avoid NestJS CLI overhead
npx tsc -p tsconfig.build.json --diagnostics

echo "✅ Done!"
