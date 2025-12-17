# Microservices Architecture - Quick Reference

> **Full Plan Location:** [`microservices-architecture-plan.md`](./microservices-architecture-plan.md)
> **Implementation Roadmap:** [`implementation-roadmap.md`](./implementation-roadmap.md)

## Overview

Transform the monolithic Travel Expense Planner backend into microservices architecture using **NestJS Monorepo**:
- **Auth Service** - Authentication (login, register, JWT)
- **Permission Service** - Authorization checks (trip access, modify permissions)
- **API Gateway** - Single entry point (REST to gRPC translation)

## Architecture

```
Frontend (HTTP/REST)
    ↓
API Gateway (Port 3000)
    ↓ (gRPC)
    ├── Auth Service (Port 50051) → Auth DB
    ├── Permission Service (Port 50052) → Trip DB (read-only) + Redis
    └── [Future: Trip/Expense/Member Services]
```

## Key Decisions

- ✅ **Communication:** gRPC between services (high performance, type-safe)
- ✅ **Databases:** Separate DB per service (Auth DB, Permission cache, Core Domain DB)
- ✅ **Structure:** NestJS Monorepo within `travel-planner-be/` directory
- ✅ **Apps:** `apps/auth-svc`, `apps/permission-svc`, `apps/api-gateway`
- ✅ **Libs:** `libs/proto`, `libs/common`, `libs/dto`
- ✅ **Caching:** Redis for permission checks (5-minute TTL)
- ✅ **Package Manager:** Single `package.json` with shared dependencies

## Project Structure (NestJS Monorepo)

```
travel-expense-planner/
└── travel-planner-be/            # Monorepo root
    ├── apps/
    │   ├── api-gateway/          # REST endpoints → gRPC
    │   ├── auth-svc/             # User auth (gRPC)
    │   └── permission-svc/       # Authorization (gRPC + Redis)
    ├── libs/
    │   ├── proto/                # Proto definitions
    │   ├── common/               # Shared utilities
    │   └── dto/                  # Shared DTOs
    ├── src/                      # Existing domain services
    ├── nest-cli.json             # Monorepo config
    ├── tsconfig.base.json        # Base TS config
    ├── package.json              # Shared dependencies
    └── docker-compose.yml        # Orchestration
```

## Implementation Phases

1. **Setup NestJS Monorepo** - `nest-cli.json`, `tsconfig.base.json`, proto files
2. **Auth Service** - `nest g app auth-svc`, move auth modules, separate DB
3. **Permission Service** - `nest g app permission-svc`, move helpers, Redis cache
4. **API Gateway** - `nest g app api-gateway`, REST → gRPC translation
5. **Update Domain Services** - Replace helpers in `src/` with gRPC calls
6. **Testing** - Unit, integration, performance tests
7. **Deployment** - Docker Compose → Production (K8s/Docker Swarm)

## Quick Start Commands

```bash
# Generate new microservice apps
nest generate app auth-svc
nest generate app permission-svc
nest generate app api-gateway

# Start all services (development)
npm run start:all

# Run specific service
npm run start:auth        # Auth Service
npm run start:permission  # Permission Service
npm run start:gateway     # API Gateway

# Build services
npm run build:auth
npm run build:permission
npm run build:gateway

# Docker Compose
npm run docker:up         # Start all containers
npm run docker:down       # Stop all containers

# Generate proto types
npm run proto:generate
```

## Database Strategy

- **auth_db** (Port 5433) - users, email_verifications (Auth Service)
- **trip_db** (Port 5432) - trips, members, expenses (existing domain services)
- **Redis** (Port 6379) - Permission cache (Permission Service)

## Proto Files

- `libs/proto/auth.proto` - Auth service contract
- `libs/proto/permissions.proto` - Permission service contract
- `libs/proto/common.proto` - Common types
- `libs/proto/generate.sh` - Proto generation script

## Critical Migrations

### Domain Services (`src/`) → Permission Service

**Before:**
```typescript
const { canAccess } = canAccessTrip(userId, userEmail, trip);
```

**After:**
```typescript
const result = await this.permissionClient.checkTripAccess(userId, userEmail, tripId);
```

### Auth Logic (`src/auth/`) → Auth Service

**Move these modules:**
- `src/auth/` → `apps/auth-svc/src/auth/`
- `src/users/` → `apps/auth-svc/src/users/`
- `src/verification/` → `apps/auth-svc/src/verification/`
- `src/email/` → `apps/auth-svc/src/email/`
- `src/firebase/` → `apps/auth-svc/src/firebase/`

## Configuration Files

### `nest-cli.json` (NEW)
```json
{
  "monorepo": true,
  "root": "apps/api-gateway",
  "projects": {
    "api-gateway": { "root": "apps/api-gateway" },
    "auth-svc": { "root": "apps/auth-svc" },
    "permission-svc": { "root": "apps/permission-svc" }
  }
}
```

### `tsconfig.base.json` (NEW)
```json
{
  "compilerOptions": {
    "paths": {
      "@app/proto": ["libs/proto/src"],
      "@app/common": ["libs/common/src"],
      "@app/dto": ["libs/dto/src"]
    }
  }
}
```

### `package.json` (UPDATE)
```json
{
  "scripts": {
    "start:gateway": "nest start api-gateway --watch",
    "start:auth": "nest start auth-svc --watch",
    "start:permission": "nest start permission-svc --watch",
    "start:all": "concurrently \"npm run start:gateway\" \"npm run start:auth\" \"npm run start:permission\""
  }
}
```

## Performance Targets

- Permission check (cached): ~10ms
- Permission check (uncached): ~60ms
- Auth request: ~15ms (gRPC)

## Next Steps

1. Read full plan: [`microservices-architecture-plan.md`](./microservices-architecture-plan.md)
2. Read implementation roadmap: [`implementation-roadmap.md`](./implementation-roadmap.md)
3. Follow implementation phases sequentially
4. Test each service before moving to next phase

## Troubleshooting

- **gRPC errors:** Check service URLs in docker-compose.yml
- **DB errors:** Run `npx prisma migrate dev` in each app (`apps/auth-svc`, etc.)
- **JWT errors:** Ensure JWT_SECRET matches across Auth Service + API Gateway
- **Permission errors:** Check Redis connection, clear cache if needed
- **Monorepo errors:** Verify `nest-cli.json` and `tsconfig.base.json` are correct

## Documentation

- Full implementation plan with code examples
- NestJS monorepo configuration
- Docker Compose configuration
- Testing strategy
- Production deployment guide
- Migration checklist

---

**Estimated Time:** 3-5 days for experienced developer

**Key Difference from Original Plan:** Instead of separate `services/` folder at root level, everything is within `travel-planner-be/` using NestJS monorepo structure with `apps/` and `libs/` folders.
