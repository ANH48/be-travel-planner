# Travel Expense Planner - Backend

Backend API for Travel Expense Planner built with NestJS, Prisma, and PostgreSQL.

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Passport
- **Language**: TypeScript

## Features

- ✅ User authentication (Register/Login)
- ✅ Trip management (CRUD)
- ✅ Member management
- ✅ Expense tracking with splits
- ✅ Settlement calculation algorithm
- ✅ Reports and analytics

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use Prisma Accelerate)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your variables:
```env
DATABASE_URL="your-database-url"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Travel Expense Planner <your-email@gmail.com>

# Firebase (Optional - for push notifications)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

3. Setup database:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (if using direct database)
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### Running the app

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3001/api`

## Deployment

### 🚀 Quick Start: Railway.app (RECOMMENDED)

**The easiest and most reliable way to deploy this backend is Railway.app.**

👉 **[Complete step-by-step guide: RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** 👈

**Why Railway?**
- ✅ **8GB build RAM** - no memory issues!
- ✅ **$5 free trial credit**
- ✅ **Auto-deploy from GitHub**
- ✅ **~$5-10/month** after trial
- ✅ **10-minute setup**

**Quick Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Deploy from GitHub repo: `ANH48/be-travel-planner`
3. Add environment variables
4. Done! 🎉

---

### ⚠️ Platform Compatibility

| Platform | Free Tier RAM | Build RAM | Status |
|----------|---------------|-----------|--------|
| **Railway.app** | Trial ($5) | **8GB** | ⭐ **RECOMMENDED** |
| **Fly.io** | 256MB | Sufficient | ✅ Works well |
| **Koyeb** | 2GB | 2GB | ✅ Works well |
| **Render.com** | 512MB | **512MB** | ❌ **TOO LOW - WILL FAIL** |

**This NestJS app requires >512MB RAM to build.** Render's free tier is incompatible despite all optimizations.

---

### Alternative Deployment Options

#### Option 1: Use the build.sh script (For 1GB+ RAM platforms)

In your deployment platform, set:
- **Build Command**: `bash build.sh`
- **Start Command**: `npm run start:prod`

This will:
- Skip Firebase installation (unless you need push notifications)
- Set optimal memory limits
- Use lightweight build process

### Option 2: Manual Build Commands

If bash scripts aren't supported:
- **Build**: `NODE_OPTIONS="--max-old-space-size=380" npm ci --only=production --no-optional && npx prisma generate --no-engine && npx tsc -p tsconfig.build.json`
- **Start**: `npm run start:prod`

### Option 3: Docker Deployment

Use the included `Dockerfile` for deployment on platforms that support Docker:

```bash
docker build -t travel-planner-api .
docker run -p 3001:3001 --env-file .env travel-planner-api
```

### Option 4: Enable Firebase (if needed)

If you need push notifications, install Firebase manually after build:
```bash
npm install firebase-admin --save --production
```

Then set `FIREBASE_SERVICE_ACCOUNT` environment variable with your credentials.

### Environment Variables Required

**Required:**

- `DATABASE_URL` - Prisma Accelerate connection string or direct PostgreSQL URL
- `JWT_SECRET` - Strong secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration (e.g., "7d")
- `FRONTEND_URL` - Your frontend URL for CORS
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` - Email service config

**Optional (for push notifications):**
- `FIREBASE_SERVICE_ACCOUNT` - Firebase credentials as JSON string (only if you installed firebase-admin)
- `FIREBASE_DATABASE_URL` - Firebase Realtime Database URL

### Memory Usage Breakdown

- **Without Firebase**: ~180MB RAM during build, ~60MB runtime
- **With Firebase**: ~350MB RAM during build, ~90MB runtime

By making Firebase optional, the app can now build successfully on 512MB free-tier hosting.

### Troubleshooting Memory Issues

If you still encounter "JavaScript heap out of memory" errors:

1. **Use Docker deployment** (recommended) - The Dockerfile is optimized for low memory environments
2. **Try Railway or Fly.io** - They handle Node.js builds better than Render on free tier
3. **Use build:tsc instead of build** - Direct TypeScript compilation uses less memory
4. **Upgrade to a paid plan** - Free tiers usually have 512MB RAM which is tight for NestJS builds

### Build Commands Comparison

- **Standard**: `npm run build` - Uses NestJS CLI (more memory)
- **Optimized**: `npm run build:tsc` - Uses TypeScript directly (less memory)
- **With Webpack**: `npm run build -- --webpack` - Can be faster but uses more memory initially

**Note**: The app will automatically run `prisma generate` during `npm install` via the `postinstall` script.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Trips
- `GET /api/trips` - Get all trips
- `GET /api/trips/:id` - Get trip details
- `POST /api/trips` - Create trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Members
- `GET /api/trips/:tripId/members` - Get trip members
- `POST /api/trips/:tripId/members` - Add member
- `PUT /api/trips/:tripId/members/:id` - Update member
- `DELETE /api/trips/:tripId/members/:id` - Remove member

### Expenses
- `GET /api/trips/:tripId/expenses` - Get trip expenses
- `POST /api/trips/:tripId/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Settlements
- `GET /api/trips/:tripId/settlements` - Calculate settlements
- `GET /api/trips/:tripId/settlements/report` - Get detailed report

## Project Structure

```
travel-planner-be/
├── src/
│   ├── auth/              # Authentication module
│   ├── users/             # Users module
│   ├── trips/             # Trips module
│   ├── members/           # Members module
│   ├── expenses/          # Expenses module
│   ├── settlements/       # Settlements module
│   ├── prisma/            # Prisma service
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma      # Database schema
├── .env
└── package.json
```

## Database Schema

See `prisma/schema.prisma` for the complete database schema including:
- Users
- Trips
- TripMembers
- Expenses
- ExpenseSplits
- Settlements

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## License

MIT
