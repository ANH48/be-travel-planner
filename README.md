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
- PostgreSQL 14+
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

Edit `.env` and configure your database connection:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/travel_planner?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
```

3. Setup database:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
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
