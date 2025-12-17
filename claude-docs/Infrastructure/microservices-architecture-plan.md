# Microservices Architecture Plan: Auth Service + Permission Service

## Overview

Transform the monolithic Travel Expense Planner backend into a microservices architecture by extracting **Auth Service** and **Permission Service** as separate services, with an **API Gateway** as the single entry point.

**Architecture Choice:**
- ✅ **Services**: Auth Service + Permission Service + API Gateway
- ✅ **Database**: Separate databases per service (true microservices)
- ✅ **Communication**: gRPC for inter-service communication
- ✅ **Project Structure**: NestJS Monorepo within `travel-planner-be/` directory
- ✅ **Apps**: `apps/auth-svc`, `apps/permission-svc`, `apps/api-gateway`
- ✅ **Libs**: `libs/proto`, `libs/common`, `libs/dto`
- ✅ **Implementation**: Detailed plan with code examples

---

## Target Architecture

```
┌─────────────┐
│   Frontend  │ (React/Next.js)
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────────────────────────┐
│      API Gateway                │
│  - REST endpoints               │
│  - JWT validation               │
│  - Request routing              │
│  - gRPC client coordination     │
└─────────────┬───────────────────┘
              │ gRPC
      ┌───────┴───────┬──────────────┬──────────────┐
      │               │              │              │
┌─────▼─────┐  ┌─────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
│   Auth    │  │Permission │  │   Trip   │  │ Expense  │
│  Service  │  │  Service  │  │ Service  │  │ Service  │
│  (gRPC)   │  │  (gRPC)   │  │ (gRPC)   │  │ (gRPC)   │
└─────┬─────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘
      │              │              │              │
┌─────▼─────┐  ┌─────▼─────┐  ┌────▼──────────────▼────┐
│  Auth DB  │  │ Perm DB   │  │  Core Domain DB        │
│(PostgreSQL)│ │(PostgreSQL)│ │  (PostgreSQL)          │
│- users    │  │- cached   │  │- trips, expenses, etc  │
│- email_   │  │  trips    │  └────────────────────────┘
│  verif.   │  │- cached   │
└───────────┘  │  members  │
               └───────────┘
```

---

## Communication Flow Diagrams

### Flow 1: User Registration/Login (Auth Only)

```
┌─────────┐                ┌─────────────┐                ┌─────────────┐                ┌──────────┐
│ Client  │                │ API Gateway │                │ Auth Service│                │ Auth DB  │
│(Browser)│                │   (REST)    │                │   (gRPC)    │                │(Postgres)│
└────┬────┘                └──────┬──────┘                └──────┬──────┘                └────┬─────┘
     │                            │                               │                            │
     │ 1. POST /api/auth/login    │                               │                            │
     │ { email, password }        │                               │                            │
     ├───────────────────────────>│                               │                            │
     │                            │                               │                            │
     │                            │ 2. gRPC: Login()              │                            │
     │                            │ { email, password }           │                            │
     │                            ├──────────────────────────────>│                            │
     │                            │                               │                            │
     │                            │                               │ 3. Query user by email     │
     │                            │                               ├───────────────────────────>│
     │                            │                               │                            │
     │                            │                               │ 4. User data               │
     │                            │                               │<───────────────────────────┤
     │                            │                               │                            │
     │                            │                               │ 5. Verify password (bcrypt)│
     │                            │                               │                            │
     │                            │                               │ 6. Generate JWT token      │
     │                            │                               │                            │
     │                            │ 7. { user, token }            │                            │
     │                            │<──────────────────────────────┤                            │
     │                            │                               │                            │
     │ 8. 200 OK                  │                               │                            │
     │ { user, token }            │                               │                            │
     │<───────────────────────────┤                               │                            │
     │                            │                               │                            │
     │ 9. Store token in          │                               │                            │
     │    localStorage/cookies    │                               │                            │
     │                            │                               │                            │
```

### Flow 2: Protected Trip Request (Auth Validation + Permission Check)

```
┌─────────┐       ┌─────────────┐       ┌──────────────┐       ┌──────────┐       ┌──────────┐
│ Client  │       │ API Gateway │       │  Permission  │       │  Redis   │       │  Trip    │
│(Browser)│       │   (REST)    │       │   Service    │       │  Cache   │       │ Service  │
└────┬────┘       └──────┬──────┘       └──────┬───────┘       └────┬─────┘       └────┬─────┘
     │                   │                     │                     │                    │
     │ 1. GET /api/trips/:tripId               │                     │                    │
     │    Authorization: Bearer <JWT>          │                     │                    │
     ├──────────────────>│                     │                     │                    │
     │                   │                     │                     │                    │
     │                   │ 2. Validate JWT     │                     │                    │
     │                   │    (using JWT_SECRET)                     │                    │
     │                   │                     │                     │                    │
     │                   │ 3. Extract user     │                     │                    │
     │                   │    { userId, email }│                     │                    │
     │                   │                     │                     │                    │
     │                   │ 4. gRPC: CheckTripAccess()                │                    │
     │                   │    { user_id, user_email, trip_id }       │                    │
     │                   ├─────────────────────>│                     │                    │
     │                   │                     │                     │                    │
     │                   │                     │ 5. GET trip:{tripId}│                    │
     │                   │                     ├────────────────────>│                    │
     │                   │                     │                     │                    │
     │                   │                     │ 6a. Cache HIT       │                    │
     │                   │                     │     Return trip     │                    │
     │                   │                     │<────────────────────┤                    │
     │                   │                     │                     │                    │
     │                   │                     │ 6b. Cache MISS      │                    │
     │                   │                     │     Query trip_db   │                    │
     │                   │                     │     SET cache (5min)│                    │
     │                   │                     │                     │                    │
     │                   │                     │ 7. Verify access    │                    │
     │                   │                     │    (owner/member)   │                    │
     │                   │                     │                     │                    │
     │                   │ 8. { can_access: true, role: "creator" }  │                    │
     │                   │<─────────────────────┤                     │                    │
     │                   │                     │                     │                    │
     │                   │ 9. gRPC: GetTrip({ trip_id })             │                    │
     │                   ├───────────────────────────────────────────────────────────────>│
     │                   │                     │                     │                    │
     │                   │ 10. Trip details    │                     │                    │
     │                   │<───────────────────────────────────────────────────────────────┤
     │                   │                     │                     │                    │
     │ 11. 200 OK        │                     │                     │                    │
     │     { trip }      │                     │                     │                    │
     │<──────────────────┤                     │                     │                    │
     │                   │                     │                     │                    │
```

### Flow 3: Update Trip Request (Auth + Permission Modify Check)

```
┌─────────┐       ┌─────────────┐       ┌──────────────┐       ┌──────────┐       ┌──────────┐
│ Client  │       │ API Gateway │       │  Permission  │       │  Redis   │       │  Trip    │
│(Browser)│       │   (REST)    │       │   Service    │       │  Cache   │       │ Service  │
└────┬────┘       └──────┬──────┘       └──────┬───────┘       └────┬─────┘       └────┬─────┘
     │                   │                     │                     │                    │
     │ 1. PUT /api/trips/:tripId               │                     │                    │
     │    Authorization: Bearer <JWT>          │                     │                    │
     │    Body: { name, destination, ... }     │                     │                    │
     ├──────────────────>│                     │                     │                    │
     │                   │                     │                     │                    │
     │                   │ 2. Validate JWT     │                     │                    │
     │                   │    Extract userId   │                     │                    │
     │                   │                     │                     │                    │
     │                   │ 3. gRPC: CheckTripModify()                │                    │
     │                   │    { user_id, trip_id }                   │                    │
     │                   ├─────────────────────>│                     │                    │
     │                   │                     │                     │                    │
     │                   │                     │ 4. Check cache/DB   │                    │
     │                   │                     │    Verify user      │                    │
     │                   │                     │    is trip owner    │                    │
     │                   │                     │                     │                    │
     │                   │ 5. { can_modify: true }                   │                    │
     │                   │<─────────────────────┤                     │                    │
     │                   │                     │                     │                    │
     │                   │ 6. gRPC: UpdateTrip({ trip_id, updates }) │                    │
     │                   ├───────────────────────────────────────────────────────────────>│
     │                   │                     │                     │                    │
     │                   │                     │                     │                    │ 7. Update DB
     │                   │                     │                     │                    │
     │                   │ 8. Updated trip     │                     │                    │
     │                   │<───────────────────────────────────────────────────────────────┤
     │                   │                     │                     │                    │
     │                   │ 9. Invalidate cache │                     │                    │
     │                   │    DEL trip:{tripId}│                     │                    │
     │                   ├─────────────────────>│                     │                    │
     │                   │                     ├────────────────────>│                    │
     │                   │                     │                     │                    │
     │ 10. 200 OK        │                     │                     │                    │
     │     { trip }      │                     │                     │                    │
     │<──────────────────┤                     │                     │                    │
     │                   │                     │                     │                    │
```

### Flow 4: Create Expense (Multi-Service Coordination)

```
┌─────────┐   ┌─────────────┐   ┌──────────────┐   ┌──────────┐   ┌────────────┐
│ Client  │   │ API Gateway │   │  Permission  │   │ Expense  │   │   Notif    │
│(Browser)│   │   (REST)    │   │   Service    │   │ Service  │   │  Service   │
└────┬────┘   └──────┬──────┘   └──────┬───────┘   └────┬─────┘   └─────┬──────┘
     │               │                 │                │               │
     │ 1. POST /api/trips/:tripId/expenses              │               │
     │    Authorization: Bearer <JWT>                   │               │
     │    Body: { amount, description, paidBy, ... }    │               │
     ├──────────────>│                 │                │               │
     │               │                 │                │               │
     │               │ 2. Validate JWT │                │               │
     │               │                 │                │               │
     │               │ 3. gRPC: CheckTripAccess()       │               │
     │               │    { user_id, user_email, trip_id }              │
     │               ├─────────────────>│                │               │
     │               │                 │                │               │
     │               │ 4. { can_access: true }          │               │
     │               │<─────────────────┤                │               │
     │               │                 │                │               │
     │               │ 5. gRPC: CreateExpense()         │               │
     │               │    { trip_id, amount, ... }      │               │
     │               ├──────────────────────────────────>│               │
     │               │                 │                │               │
     │               │                 │                │ 6. Save to DB │
     │               │                 │                │               │
     │               │ 7. Expense created               │               │
     │               │<──────────────────────────────────┤               │
     │               │                 │                │               │
     │               │ 8. gRPC: NotifyTripMembers()     │               │
     │               │    { trip_id, message, type }    │               │
     │               ├──────────────────────────────────────────────────>│
     │               │                 │                │               │
     │               │                 │                │               │ 9. Send FCM
     │               │                 │                │               │    push notifs
     │               │                 │                │               │
     │ 10. 201 Created                 │                │               │
     │     { expense }                 │                │               │
     │<──────────────┤                 │                │               │
     │               │                 │                │               │
```

### Flow 5: Unauthorized Access (Permission Denied)

```
┌─────────┐       ┌─────────────┐       ┌──────────────┐
│ Client  │       │ API Gateway │       │  Permission  │
│(Browser)│       │   (REST)    │       │   Service    │
└────┬────┘       └──────┬──────┘       └──────┬───────┘
     │                   │                     │
     │ 1. DELETE /api/trips/:tripId (not owner)│
     │    Authorization: Bearer <JWT>          │
     ├──────────────────>│                     │
     │                   │                     │
     │                   │ 2. Validate JWT     │
     │                   │    userId = "user-2"│
     │                   │                     │
     │                   │ 3. gRPC: CheckTripModify()
     │                   │    { user_id: "user-2", trip_id }
     │                   ├─────────────────────>│
     │                   │                     │
     │                   │                     │ 4. Check ownership
     │                   │                     │    trip.ownerId = "user-1"
     │                   │                     │    user-2 ≠ user-1
     │                   │                     │
     │                   │ 5. { can_modify: false }
     │                   │<─────────────────────┤
     │                   │                     │
     │ 6. 403 Forbidden  │                     │
     │    { error: "Only trip creator can..." }│
     │<──────────────────┤                     │
     │                   │                     │
```

---

## Communication Patterns Summary

### 1. **Client → API Gateway (HTTP/REST)**
- **Protocol**: HTTP/REST
- **Port**: 3000
- **Auth**: JWT Bearer token in Authorization header
- **Response**: JSON
- **Endpoints**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `GET /api/trips/:tripId`
  - `PUT /api/trips/:tripId`
  - `POST /api/trips/:tripId/expenses`

### 2. **API Gateway → Auth Service (gRPC)**
- **Protocol**: gRPC
- **Port**: 50051
- **Package**: `auth`
- **Operations**:
  - `Register(email, password, name, code)` → `{ user, token }`
  - `Login(email, password)` → `{ user, token }`
  - `GetMe(user_id)` → `{ user }`
  - `ValidateToken(token)` → `{ valid, user_id, email, name }`
  - `SaveFcmToken(user_id, token)` → `{ success }`
  - `GetFirebaseToken(user_id)` → `{ token }`

### 3. **API Gateway → Permission Service (gRPC)**
- **Protocol**: gRPC
- **Port**: 50052
- **Package**: `permissions`
- **Operations**:
  - `CheckTripAccess(user_id, user_email, trip_id)` → `{ can_access, role }`
  - `CheckTripModify(user_id, trip_id)` → `{ can_modify }`
  - `CheckExpenseModify(user_id, user_email, trip_id, expense_creator_id)` → `{ can_modify }`
  - `CheckItineraryModify(user_id, user_email, trip_id, itinerary_creator_id)` → `{ can_modify }`
  - `GetUserMemberId(user_email, trip_id)` → `{ member_id }`

### 4. **API Gateway → Domain Services (gRPC - Future)**
- **Protocol**: gRPC
- **Ports**: 50053+ (future)
- **Operations**:
  - **Trip Service**: `GetTrip()`, `CreateTrip()`, `UpdateTrip()`, `DeleteTrip()`
  - **Expense Service**: `CreateExpense()`, `UpdateExpense()`, `DeleteExpense()`
  - **Notification Service**: `NotifyTripMembers()`, `SendPushNotification()`

### 5. **Permission Service → Redis (Cache)**
- **Protocol**: Redis protocol
- **Port**: 6379
- **Operations**:
  - `GET trip:{tripId}` - Check cache for trip data
  - `SET trip:{tripId} <data> EX 300` - Cache trip data (5 min TTL)
  - `DEL trip:{tripId}` - Invalidate cache on update
- **Cache Strategy**:
  - TTL: 5 minutes
  - Invalidation: On trip/member updates
  - Hit ratio target: >80%

### 6. **Services → Databases (PostgreSQL)**
- **Protocol**: PostgreSQL wire protocol
- **Ports**:
  - Auth DB: 5433
  - Trip DB: 5432
- **Access Patterns**:
  - **Auth Service**: Read/Write to `auth_db` (users, email_verifications)
  - **Permission Service**: Read-only to `trip_db` (trips, trip_members)
  - **Domain Services**: Read/Write to `trip_db` (all domain tables)

---

## Request Flow Examples

### Example 1: New User Registration Flow

```
Step-by-step:
1. Client sends POST /api/auth/register
   { email: "user@example.com", password: "pass123", name: "John", code: "123456" }

2. API Gateway receives request at port 3000

3. Gateway calls Auth Service gRPC Register() on port 50051

4. Auth Service:
   - Validates email verification code from email_verifications table
   - Hashes password with bcrypt (10 rounds)
   - Creates user in auth_db.users table
   - Generates JWT token (expires in 7 days)
   - Returns { user: { id, email, name, ... }, token: "eyJhbGc..." }

5. Auth Service returns response via gRPC

6. Gateway forwards JSON response to client

7. Client stores token in localStorage

Total time: ~150ms
```

### Example 2: View Trip Details Flow

```
Step-by-step:
1. Client sends GET /api/trips/trip-123
   Headers: { Authorization: "Bearer eyJhbGc..." }

2. API Gateway validates JWT locally (no service call needed)
   - Decodes JWT using JWT_SECRET
   - Extracts userId = "user-456", email = "user@example.com"

3. Gateway calls Permission Service CheckTripAccess()
   gRPC request: { user_id: "user-456", user_email: "user@example.com", trip_id: "trip-123" }

4. Permission Service checks Redis cache:
   - Key: "trip:trip-123"
   - Cache HIT (5ms) or MISS (50ms if DB query needed)

5. Permission Service validates:
   - Check if userId matches trip.ownerId → role = "creator"
   - OR check if user in trip.members → role = "member"
   - Returns { can_access: true, role: "creator" }

6. Gateway calls Trip Service GetTrip()
   gRPC request: { trip_id: "trip-123" }

7. Trip Service queries trip_db and returns trip details

8. Gateway forwards trip JSON to client

Total time (cached): ~25ms
Total time (uncached): ~75ms
```

### Example 3: Update Expense with Permission Check

```
Step-by-step:
1. Client sends PUT /api/trips/trip-123/expenses/exp-789
   Headers: { Authorization: "Bearer eyJhbGc..." }
   Body: { amount: 150, description: "Updated dinner cost" }

2. Gateway validates JWT → userId = "user-456"

3. Gateway calls Permission Service CheckExpenseModify()
   gRPC: { user_id: "user-456", user_email: "user@example.com",
          trip_id: "trip-123", expense_creator_id: "user-456" }

4. Permission Service checks:
   - Is user trip owner? → canModifyExpense = true
   - OR is user expense creator? → canModifyExpense = true
   - Returns { can_modify: true }

5. Gateway calls Expense Service UpdateExpense()

6. Expense Service updates trip_db.expenses table

7. Gateway tells Permission Service to invalidate cache
   Redis DEL trip:trip-123

8. Gateway returns updated expense to client

Total time: ~35ms
```

---

## Project Structure

```
travel-expense-planner/
└── travel-planner-be/            # Monorepo root
    ├── apps/
    │   ├── api-gateway/          # NEW - REST to gRPC gateway
    │   │   ├── src/
    │   │   │   ├── auth/
    │   │   │   │   ├── auth.controller.ts
    │   │   │   │   └── auth-grpc.client.ts
    │   │   │   ├── trips/
    │   │   │   │   └── trips.controller.ts
    │   │   │   ├── expenses/
    │   │   │   ├── common/
    │   │   │   │   ├── guards/
    │   │   │   │   │   └── jwt-auth.guard.ts
    │   │   │   │   └── interceptors/
    │   │   │   │       └── correlation-id.interceptor.ts
    │   │   │   ├── app.module.ts
    │   │   │   └── main.ts
    │   │   ├── prisma/
    │   │   │   └── schema.prisma        # Empty (no DB access)
    │   │   ├── project.json
    │   │   ├── tsconfig.json
    │   │   └── Dockerfile
    │   │
    │   ├── auth-svc/             # NEW - Authentication microservice
    │   │   ├── src/
    │   │   │   ├── auth/
    │   │   │   │   ├── auth.controller.ts  (gRPC)
    │   │   │   │   ├── auth.service.ts
    │   │   │   │   └── dto/
    │   │   │   ├── users/
    │   │   │   │   ├── users.controller.ts (gRPC)
    │   │   │   │   └── users.service.ts
    │   │   │   ├── verification/
    │   │   │   │   ├── verification.controller.ts (gRPC)
    │   │   │   │   └── verification.service.ts
    │   │   │   ├── email/
    │   │   │   │   └── email.service.ts
    │   │   │   ├── firebase/
    │   │   │   │   └── firebase.service.ts
    │   │   │   ├── prisma/
    │   │   │   │   ├── prisma.service.ts
    │   │   │   │   └── schema.prisma     # users, email_verifications only
    │   │   │   ├── app.module.ts
    │   │   │   └── main.ts
    │   │   ├── project.json
    │   │   ├── tsconfig.json
    │   │   ├── Dockerfile
    │   │   └── .env.example
    │   │
    │   ├── permission-svc/       # NEW - Authorization microservice
    │   │   ├── src/
    │   │   │   ├── permissions/
    │   │   │   │   ├── permissions.controller.ts (gRPC)
    │   │   │   │   ├── permissions.service.ts
    │   │   │   │   └── dto/
    │   │   │   ├── cache/
    │   │   │   │   └── redis-cache.service.ts
    │   │   │   ├── common/
    │   │   │   │   └── helpers/
    │   │   │   │       └── trip-access.helper.ts  # MOVED FROM src/
    │   │   │   ├── prisma/
    │   │   │   │   ├── prisma.service.ts
    │   │   │   │   └── schema.prisma     # Read-only: trips, trip_members
    │   │   │   ├── app.module.ts
    │   │   │   └── main.ts
    │   │   ├── project.json
    │   │   ├── tsconfig.json
    │   │   ├── Dockerfile
    │   │   └── .env.example
    │   │
    │   └── trip-svc/             # FUTURE - Trip domain service (currently in src/)
    │       └── ...
    │
    ├── libs/                     # Shared libraries
    │   ├── proto/                # Proto definitions
    │   │   ├── auth.proto
    │   │   ├── permissions.proto
    │   │   ├── common.proto
    │   │   └── generate.sh
    │   ├── common/               # Shared utilities
    │   │   ├── decorators/
    │   │   ├── interfaces/
    │   │   └── utils/
    │   └── dto/                  # Shared DTOs
    │
    ├── src/                      # EXISTING MONOLITH (domain services)
    │   ├── trips/
    │   ├── expenses/
    │   ├── members/
    │   ├── itinerary/
    │   ├── settlements/
    │   ├── notifications/
    │   ├── admin/
    │   ├── prisma/
    │   ├── app.module.ts
    │   └── main.ts
    │
    ├── docker-compose.yml        # Orchestrates all services
    ├── package.json              # Workspace root
    ├── nest-cli.json             # NestJS monorepo config
    ├── tsconfig.base.json        # Base TypeScript config
    └── README.md
```

---

## Database Strategy

### 1. Auth Database (`auth_db`)

**Tables:**
- `users` - User accounts, passwords, roles
- `email_verifications` - Email OTP codes

**Schema Location:** `services/auth-service/prisma/schema.prisma`

```prisma
model User {
  id            String              @id @default(uuid())
  email         String              @unique
  password      String
  name          String
  avatar        String?
  role          UserRole            @default(USER)
  fcmToken      String?             @map("fcm_token")
  emailVerified Boolean             @default(false) @map("email_verified")
  verifiedAt    DateTime?           @map("verified_at")
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  @@map("users")
}

model EmailVerification {
  id        String   @id @default(uuid())
  email     String
  code      String
  expiresAt DateTime @map("expires_at")
  verified  Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([email])
  @@index([code])
  @@map("email_verifications")
}

enum UserRole {
  USER
  ADMIN
}
```

### 2. Permission Database (`permission_db`)

**Purpose:** Cached read-only data for permission checks

**Tables:**
- `cached_trips` - Trip ownership data (synced from core DB)
- `cached_members` - Trip membership data (synced from core DB)

**Schema Location:** `services/permission-service/prisma/schema.prisma`

**Note:** Initially, Permission Service will connect to **Core Domain DB** in read-only mode. Eventually, can implement event-driven cache synchronization.

```prisma
// Read-only models pointing to core domain DB
model Trip {
  id          String             @id
  ownerId     String             @map("owner_id")
  name        String
  members     TripMember[]

  @@map("trips")
}

model TripMember {
  id                String         @id
  tripId            String         @map("trip_id")
  trip              Trip           @relation(fields: [tripId], references: [id])
  userId            String?        @map("user_id")
  email             String?

  @@index([tripId])
  @@map("trip_members")
}
```

### 3. Core Domain Database (`trip_db`)

**Tables:** trips, trip_members, expenses, settlements, itinerary_items, member_invitations, notifications

**Owned by:** Trip Service, Expense Service, Member Service, etc. (existing monolith for now)

---

## gRPC Protocol Definitions

### `/libs/proto/auth.proto`

```protobuf
syntax = "proto3";

package auth;

service AuthService {
  rpc Register(RegisterRequest) returns (RegisterResponse);
  rpc Login(LoginRequest) returns (LoginResponse);
  rpc GetMe(GetMeRequest) returns (GetMeResponse);
  rpc SaveFcmToken(SaveFcmTokenRequest) returns (SaveFcmTokenResponse);
  rpc GetFirebaseToken(GetFirebaseTokenRequest) returns (GetFirebaseTokenResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
}

message RegisterRequest {
  string email = 1;
  string password = 2;
  string name = 3;
  string code = 4;
}

message RegisterResponse {
  User user = 1;
  string token = 2;
}

message LoginRequest {
  string email = 1;
  string password = 2;
}

message LoginResponse {
  User user = 1;
  string token = 2;
}

message GetMeRequest {
  string user_id = 1;
}

message GetMeResponse {
  User user = 1;
}

message SaveFcmTokenRequest {
  string user_id = 1;
  string token = 2;
}

message SaveFcmTokenResponse {
  bool success = 1;
  string message = 2;
}

message GetFirebaseTokenRequest {
  string user_id = 1;
}

message GetFirebaseTokenResponse {
  string token = 1;
}

message ValidateTokenRequest {
  string token = 1;
}

message ValidateTokenResponse {
  bool valid = 1;
  string user_id = 2;
  string email = 3;
  string name = 4;
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
  string avatar = 4;
  string role = 5;
  bool email_verified = 6;
}
```

### `/libs/proto/permissions.proto`

```protobuf
syntax = "proto3";

package permissions;

service PermissionService {
  rpc CheckTripAccess(CheckTripAccessRequest) returns (CheckTripAccessResponse);
  rpc CheckTripModify(CheckTripModifyRequest) returns (CheckTripModifyResponse);
  rpc CheckExpenseModify(CheckExpenseModifyRequest) returns (CheckExpenseModifyResponse);
  rpc CheckItineraryModify(CheckItineraryModifyRequest) returns (CheckItineraryModifyResponse);
  rpc GetUserMemberId(GetUserMemberIdRequest) returns (GetUserMemberIdResponse);
}

message CheckTripAccessRequest {
  string user_id = 1;
  string user_email = 2;
  string trip_id = 3;
}

message CheckTripAccessResponse {
  bool can_access = 1;
  string role = 2;  // "creator" | "member" | ""
}

message CheckTripModifyRequest {
  string user_id = 1;
  string trip_id = 2;
}

message CheckTripModifyResponse {
  bool can_modify = 1;
}

message CheckExpenseModifyRequest {
  string user_id = 1;
  string user_email = 2;
  string trip_id = 3;
  string expense_creator_id = 4;
}

message CheckExpenseModifyResponse {
  bool can_modify = 1;
}

message CheckItineraryModifyRequest {
  string user_id = 1;
  string user_email = 2;
  string trip_id = 3;
  string itinerary_creator_id = 4;
}

message CheckItineraryModifyResponse {
  bool can_modify = 1;
}

message GetUserMemberIdRequest {
  string user_email = 1;
  string trip_id = 2;
}

message GetUserMemberIdResponse {
  string member_id = 1;
}
```

---

## Implementation Steps

### Phase 1: Setup Monorepo Structure (NestJS Style)

**1.1 Create Directory Structure**

```bash
cd /Users/nhut/Documents/MyProject/Web/travel-expense-planner/travel-planner-be

# Create apps and libs directories
mkdir -p apps/api-gateway
mkdir -p apps/auth-svc
mkdir -p apps/permission-svc
mkdir -p libs/proto
mkdir -p libs/common
mkdir -p libs/dto
```

**1.2 Update Root `package.json`**

Add workspace configuration to existing `package.json`:

```json
{
  "name": "travel-planner-be",
  "version": "1.0.0",
  "description": "Travel Expense Planner Backend - Microservices",
  "private": true,
  "scripts": {
    "build": "nest build",
    "build:gateway": "nest build api-gateway",
    "build:auth": "nest build auth-svc",
    "build:permission": "nest build permission-svc",
    "start": "nest start",
    "start:gateway": "nest start api-gateway --watch",
    "start:auth": "nest start auth-svc --watch",
    "start:permission": "nest start permission-svc --watch",
    "start:all": "concurrently \"npm run start:gateway\" \"npm run start:auth\" \"npm run start:permission\"",
    "proto:generate": "cd libs/proto && ./generate.sh",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/microservices": "^10.0.0",
    "@nestjs/schedule": "^6.0.1",
    "@prisma/client": "^6.19.0",
    "@grpc/grpc-js": "^1.9.0",
    "@grpc/proto-loader": "^0.7.10",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "cookie-parser": "^1.4.7",
    "nodemailer": "^7.0.10",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "firebase-admin": "^13.6.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^4.0.0",
    "@types/passport-local": "^1.0.38",
    "@types/supertest": "^2.0.12",
    "@types/cookie-parser": "^1.4.10",
    "@types/nodemailer": "^7.0.4",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "concurrently": "^8.2.2",
    "eslint": "^8.42.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.5.0",
    "prettier": "^3.0.0",
    "prisma": "^6.19.0",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "ts-proto": "^1.165.0",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  }
}
```

**1.3 Create NestJS Monorepo Configuration**

`nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "monorepo": true,
  "root": "apps/api-gateway",
  "compilerOptions": {
    "webpack": true,
    "tsConfigPath": "apps/api-gateway/tsconfig.app.json"
  },
  "projects": {
    "api-gateway": {
      "type": "application",
      "root": "apps/api-gateway",
      "entryFile": "main",
      "sourceRoot": "apps/api-gateway/src",
      "compilerOptions": {
        "tsConfigPath": "apps/api-gateway/tsconfig.app.json"
      }
    },
    "auth-svc": {
      "type": "application",
      "root": "apps/auth-svc",
      "entryFile": "main",
      "sourceRoot": "apps/auth-svc/src",
      "compilerOptions": {
        "tsConfigPath": "apps/auth-svc/tsconfig.app.json"
      }
    },
    "permission-svc": {
      "type": "application",
      "root": "apps/permission-svc",
      "entryFile": "main",
      "sourceRoot": "apps/permission-svc/src",
      "compilerOptions": {
        "tsConfigPath": "apps/permission-svc/tsconfig.app.json"
      }
    }
  }
}
```

**1.4 Create Base TypeScript Config**

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@app/proto": ["libs/proto/src"],
      "@app/common": ["libs/common/src"],
      "@app/dto": ["libs/dto/src"]
    }
  }
}
```

**1.5 Create Proto Generation Script**

`libs/proto/generate.sh`:

```bash
#!/bin/bash

# Generate TypeScript types from proto files
protoc --plugin=protoc-gen-ts_proto=../../node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=./src/generated \
  --ts_proto_opt=nestJs=true \
  --ts_proto_opt=addGrpcMetadata=true \
  --ts_proto_opt=addNestjsRestParameter=true \
  *.proto

echo "✅ Proto files generated successfully"
```

---

### Phase 2: Create Auth Service

**2.1 Generate Auth Service with NestJS CLI**

```bash
cd /Users/nhut/Documents/MyProject/Web/travel-expense-planner/travel-planner-be

# Generate new microservice application
nest generate app auth-svc
```

**2.2 Create Project Configuration**

`apps/auth-svc/project.json`:

```json
{
  "name": "auth-svc",
  "type": "application",
  "root": "apps/auth-svc",
  "entryFile": "main",
  "sourceRoot": "apps/auth-svc/src",
  "compilerOptions": {
    "tsConfigPath": "apps/auth-svc/tsconfig.app.json"
  }
}
```

**2.3 Create TypeScript Config**

`apps/auth-svc/tsconfig.app.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/auth-svc"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

**2.4 Create `main.ts` (gRPC Server)**

`apps/auth-svc/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: join(__dirname, '../proto/auth.proto'),
        url: '0.0.0.0:50051',
      },
    },
  );

  await app.listen();
  console.log('🚀 Auth Service (gRPC) is running on port 50051');
}
bootstrap();
```

**2.5 Create Auth Controller (gRPC)**

`apps/auth-svc/src/auth/auth.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  GetMeRequest,
  GetMeResponse,
  ValidateTokenRequest,
  ValidateTokenResponse,
} from '../proto/auth.pb';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'GetMe')
  async getMe(data: GetMeRequest): Promise<GetMeResponse> {
    const user = await this.authService.getMe(data.user_id);
    return { user };
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(data: ValidateTokenRequest): Promise<ValidateTokenResponse> {
    return this.authService.validateToken(data.token);
  }
}
```

**2.6 Copy Auth Service Logic**

Copy/move the following from `src/` to `apps/auth-svc/src/`:
- `src/auth/` → `apps/auth-svc/src/auth/` (update auth.service.ts to use gRPC DTOs)
- `src/users/` → `apps/auth-svc/src/users/`
- `src/verification/` → `apps/auth-svc/src/verification/`
- `src/email/` → `apps/auth-svc/src/email/`
- `src/firebase/` → `apps/auth-svc/src/firebase/`
- `src/prisma/` → `apps/auth-svc/src/prisma/`

**2.7 Create Prisma Schema**

`apps/auth-svc/prisma/schema.prisma`:

Copy User and EmailVerification models from root `prisma/schema.prisma` (see Database Strategy section above).

**2.8 Create `.env.example`**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/auth_db"
JWT_SECRET="your-jwt-secret-here"
JWT_EXPIRES_IN="7d"

# Email Configuration
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="Travel Planner <noreply@travelplanner.com>"

# Firebase (optional)
FIREBASE_SERVICE_ACCOUNT='{...}'
FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"
```

---

### Phase 3: Create Permission Service

**3.1 Generate Permission Service with NestJS CLI**

```bash
cd /Users/nhut/Documents/MyProject/Web/travel-expense-planner/travel-planner-be

# Generate new microservice application
nest generate app permission-svc
```

**3.2 Create Project Configuration**

`apps/permission-svc/project.json`:

```json
{
  "name": "permission-svc",
  "type": "application",
  "root": "apps/permission-svc",
  "entryFile": "main",
  "sourceRoot": "apps/permission-svc/src",
  "compilerOptions": {
    "tsConfigPath": "apps/permission-svc/tsconfig.app.json"
  }
}
```

**3.3 Create TypeScript Config**

`apps/permission-svc/tsconfig.app.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/permission-svc"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

**3.4 Create `main.ts` (gRPC Server)**

`apps/permission-svc/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'permissions',
        protoPath: join(__dirname, '../proto/permissions.proto'),
        url: '0.0.0.0:50052',
      },
    },
  );

  await app.listen();
  console.log('🚀 Permission Service (gRPC) is running on port 50052');
}
bootstrap();
```

**3.5 Create Permission Controller (gRPC)**

`apps/permission-svc/src/permissions/permissions.controller.ts`:

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PermissionsService } from './permissions.service';
import {
  CheckTripAccessRequest,
  CheckTripAccessResponse,
  CheckTripModifyRequest,
  CheckTripModifyResponse,
  CheckExpenseModifyRequest,
  CheckExpenseModifyResponse,
  CheckItineraryModifyRequest,
  CheckItineraryModifyResponse,
  GetUserMemberIdRequest,
  GetUserMemberIdResponse,
} from '../proto/permissions.pb';

@Controller()
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @GrpcMethod('PermissionService', 'CheckTripAccess')
  async checkTripAccess(
    data: CheckTripAccessRequest,
  ): Promise<CheckTripAccessResponse> {
    return this.permissionsService.checkTripAccess(
      data.user_id,
      data.user_email,
      data.trip_id,
    );
  }

  @GrpcMethod('PermissionService', 'CheckTripModify')
  async checkTripModify(
    data: CheckTripModifyRequest,
  ): Promise<CheckTripModifyResponse> {
    const canModify = await this.permissionsService.checkTripModify(
      data.user_id,
      data.trip_id,
    );
    return { can_modify: canModify };
  }

  @GrpcMethod('PermissionService', 'CheckExpenseModify')
  async checkExpenseModify(
    data: CheckExpenseModifyRequest,
  ): Promise<CheckExpenseModifyResponse> {
    const canModify = await this.permissionsService.checkExpenseModify(
      data.user_id,
      data.user_email,
      data.trip_id,
      data.expense_creator_id,
    );
    return { can_modify: canModify };
  }

  @GrpcMethod('PermissionService', 'CheckItineraryModify')
  async checkItineraryModify(
    data: CheckItineraryModifyRequest,
  ): Promise<CheckItineraryModifyResponse> {
    const canModify = await this.permissionsService.checkItineraryModify(
      data.user_id,
      data.user_email,
      data.trip_id,
      data.itinerary_creator_id,
    );
    return { can_modify: canModify };
  }

  @GrpcMethod('PermissionService', 'GetUserMemberId')
  async getUserMemberId(
    data: GetUserMemberIdRequest,
  ): Promise<GetUserMemberIdResponse> {
    const memberId = await this.permissionsService.getUserMemberId(
      data.user_email,
      data.trip_id,
    );
    return { member_id: memberId || '' };
  }
}
```

**3.6 Create Permission Service**

`apps/permission-svc/src/permissions/permissions.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import {
  canAccessTrip,
  canModifyTrip,
  canModifyExpense,
  canModifyItinerary,
  getUserMemberId,
} from '../common/helpers/trip-access.helper';

@Injectable()
export class PermissionsService {
  constructor(
    private prisma: PrismaService,
    private cache: RedisCacheService,
  ) {}

  async checkTripAccess(
    userId: string,
    userEmail: string,
    tripId: string,
  ) {
    // Try cache first
    const cacheKey = `trip:${tripId}`;
    let trip = await this.cache.get(cacheKey);

    if (!trip) {
      // Fetch from database
      trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: { members: true },
      });

      if (trip) {
        // Cache for 5 minutes
        await this.cache.set(cacheKey, trip, 300);
      }
    }

    if (!trip) {
      return { can_access: false, role: '' };
    }

    const result = canAccessTrip(userId, userEmail, trip);
    return {
      can_access: result.canAccess,
      role: result.role || '',
    };
  }

  async checkTripModify(userId: string, tripId: string): Promise<boolean> {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) return false;
    return canModifyTrip(userId, trip);
  }

  async checkExpenseModify(
    userId: string,
    userEmail: string,
    tripId: string,
    expenseCreatorId?: string,
  ): Promise<boolean> {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) return false;
    return canModifyExpense(userId, userEmail, trip, expenseCreatorId);
  }

  async checkItineraryModify(
    userId: string,
    userEmail: string,
    tripId: string,
    itineraryCreatorId?: string,
  ): Promise<boolean> {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) return false;
    return canModifyItinerary(userId, userEmail, trip, itineraryCreatorId);
  }

  async getUserMemberId(
    userEmail: string,
    tripId: string,
  ): Promise<string | null> {
    const trip = await this.getTripFromCacheOrDb(tripId);
    if (!trip) return null;
    return getUserMemberId(userEmail, trip.members);
  }

  private async getTripFromCacheOrDb(tripId: string) {
    const cacheKey = `trip:${tripId}`;
    let trip = await this.cache.get(cacheKey);

    if (!trip) {
      trip = await this.prisma.trip.findUnique({
        where: { id: tripId },
        include: { members: true },
      });

      if (trip) {
        await this.cache.set(cacheKey, trip, 300);
      }
    }

    return trip;
  }
}
```

**3.7 Copy Permission Helper**

Move `src/common/helpers/trip-access.helper.ts` to:
`apps/permission-svc/src/common/helpers/trip-access.helper.ts`

**3.8 Create Redis Cache Service**

`apps/permission-svc/src/cache/redis-cache.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private redis: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    console.log('✅ Redis cache connected');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

**3.9 Create Prisma Schema**

`apps/permission-svc/prisma/schema.prisma`:

Copy Trip and TripMember models from root `prisma/schema.prisma` (read-only access).

**3.10 Create `.env.example`**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/trip_db"
REDIS_URL="redis://localhost:6379"
```

---

### Phase 4: Create API Gateway

**4.1 Generate API Gateway with NestJS CLI**

```bash
cd /Users/nhut/Documents/MyProject/Web/travel-expense-planner/travel-planner-be

# Generate new application (default/root app)
nest generate app api-gateway
```

**4.2 Create Project Configuration**

`apps/api-gateway/project.json`:

```json
{
  "name": "api-gateway",
  "type": "application",
  "root": "apps/api-gateway",
  "entryFile": "main",
  "sourceRoot": "apps/api-gateway/src",
  "compilerOptions": {
    "tsConfigPath": "apps/api-gateway/tsconfig.app.json"
  }
}
```

**4.3 Create TypeScript Config**

`apps/api-gateway/tsconfig.app.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/api-gateway"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

**4.4 Create `main.ts` (HTTP Server)**

`apps/api-gateway/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Cookie parser
  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API Gateway is running on port ${port}`);
}
bootstrap();
```

**4.5 Create Auth Controller (REST → gRPC)**

`apps/api-gateway/src/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthGrpcClient } from './auth-grpc.client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authGrpcClient: AuthGrpcClient) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authGrpcClient.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authGrpcClient.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() userId: string) {
    return this.authGrpcClient.getMe(userId);
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  async saveFcmToken(
    @CurrentUser() userId: string,
    @Body('token') token: string,
  ) {
    return this.authGrpcClient.saveFcmToken(userId, token);
  }

  @Get('firebase-token')
  @UseGuards(JwtAuthGuard)
  async getFirebaseToken(@CurrentUser() userId: string) {
    return this.authGrpcClient.getFirebaseToken(userId);
  }
}
```

**4.6 Create gRPC Client for Auth Service**

`apps/api-gateway/src/auth/auth-grpc.client.ts`:

```typescript
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  AuthServiceClient,
  RegisterRequest,
  LoginRequest,
  GetMeRequest,
  SaveFcmTokenRequest,
  GetFirebaseTokenRequest,
} from '../proto/auth.pb';

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private authService: AuthServiceClient;

  constructor(@Inject('AUTH_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService<AuthServiceClient>('AuthService');
  }

  async register(data: RegisterRequest) {
    return firstValueFrom(this.authService.register(data));
  }

  async login(data: LoginRequest) {
    return firstValueFrom(this.authService.login(data));
  }

  async getMe(userId: string) {
    return firstValueFrom(this.authService.getMe({ user_id: userId }));
  }

  async saveFcmToken(userId: string, token: string) {
    return firstValueFrom(
      this.authService.saveFcmToken({ user_id: userId, token }),
    );
  }

  async getFirebaseToken(userId: string) {
    return firstValueFrom(
      this.authService.getFirebaseToken({ user_id: userId }),
    );
  }

  async validateToken(token: string) {
    return firstValueFrom(this.authService.validateToken({ token }));
  }
}
```

**4.7 Create JWT Auth Guard (validates JWT locally)**

`apps/api-gateway/src/common/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

**4.8 Create JWT Strategy**

`apps/api-gateway/src/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }
}
```

**4.9 Configure gRPC Clients in App Module**

`apps/api-gateway/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';
import { AuthController } from './auth/auth.controller';
import { AuthGrpcClient } from './auth/auth-grpc.client';
import { JwtStrategy } from './auth/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '7d' },
      }),
    }),

    // Auth Service gRPC Client
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(__dirname, '../proto/auth.proto'),
          url: process.env.AUTH_SERVICE_URL || 'localhost:50051',
        },
      },
      {
        name: 'PERMISSION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'permissions',
          protoPath: join(__dirname, '../proto/permissions.proto'),
          url: process.env.PERMISSION_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthGrpcClient, JwtStrategy],
})
export class AppModule {}
```

**4.10 Create `.env.example`**

```env
PORT=3000
FRONTEND_URL="http://localhost:3000"

# JWT (shared with Auth Service)
JWT_SECRET="your-jwt-secret-here"
JWT_EXPIRES_IN="7d"

# Microservices URLs
AUTH_SERVICE_URL="localhost:50051"
PERMISSION_SERVICE_URL="localhost:50052"
```

---

### Phase 5: Docker Compose Configuration

**Root `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  # PostgreSQL - Auth Database
  auth-db:
    image: postgres:14-alpine
    container_name: auth-db
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - auth-db-data:/var/lib/postgresql/data
    networks:
      - microservices

  # PostgreSQL - Core Domain Database
  trip-db:
    image: postgres:14-alpine
    container_name: trip-db
    environment:
      POSTGRES_DB: trip_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - trip-db-data:/var/lib/postgresql/data
    networks:
      - microservices

  # Redis - Caching
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    networks:
      - microservices

  # Auth Service
  auth-service:
    build:
      context: .
      dockerfile: apps/auth-svc/Dockerfile
    container_name: auth-service
    environment:
      DATABASE_URL: "postgresql://postgres:postgres@auth-db:5432/auth_db"
      JWT_SECRET: "your-super-secret-jwt-key-change-in-production"
      JWT_EXPIRES_IN: "7d"
      EMAIL_HOST: "smtp.gmail.com"
      EMAIL_PORT: "587"
      EMAIL_USER: "${EMAIL_USER}"
      EMAIL_PASS: "${EMAIL_PASS}"
      EMAIL_FROM: "Travel Planner <noreply@travelplanner.com>"
    ports:
      - "50051:50051"
    depends_on:
      - auth-db
    networks:
      - microservices
    restart: unless-stopped

  # Permission Service
  permission-service:
    build:
      context: .
      dockerfile: apps/permission-svc/Dockerfile
    container_name: permission-service
    environment:
      DATABASE_URL: "postgresql://postgres:postgres@trip-db:5432/trip_db"
      REDIS_URL: "redis://redis:6379"
    ports:
      - "50052:50052"
    depends_on:
      - trip-db
      - redis
    networks:
      - microservices
    restart: unless-stopped

  # API Gateway
  api-gateway:
    build:
      context: .
      dockerfile: apps/api-gateway/Dockerfile
    container_name: api-gateway
    environment:
      PORT: "3000"
      FRONTEND_URL: "http://localhost:3000"
      JWT_SECRET: "your-super-secret-jwt-key-change-in-production"
      JWT_EXPIRES_IN: "7d"
      AUTH_SERVICE_URL: "auth-service:50051"
      PERMISSION_SERVICE_URL: "permission-service:50052"
    ports:
      - "3000:3000"
    depends_on:
      - auth-service
      - permission-service
    networks:
      - microservices
    restart: unless-stopped

volumes:
  auth-db-data:
  trip-db-data:

networks:
  microservices:
    driver: bridge
```

---

### Phase 6: Database Migration

**6.1 Export User Data from Monolith**

```bash
cd travel-planner-be
npx prisma db execute --file=export-users.sql
```

Create `export-users.sql`:
```sql
COPY (SELECT * FROM users) TO '/tmp/users.csv' CSV HEADER;
COPY (SELECT * FROM email_verifications) TO '/tmp/email_verifications.csv' CSV HEADER;
```

**6.2 Import into Auth DB**

```bash
cd apps/auth-svc
npx prisma migrate dev --name init
```

Import data:
```sql
COPY users FROM '/tmp/users.csv' CSV HEADER;
COPY email_verifications FROM '/tmp/email_verifications.csv' CSV HEADER;
```

**6.3 Update Monolith to Call Auth Service**

In `travel-planner-be`, replace direct user queries with gRPC calls to auth-service.

---

### Phase 7: Update Monolith to Use Permission Service

**7.1 Update Existing Domain Services (in `src/`)**

The existing domain services in `src/` will now call the new microservices via gRPC.

**7.2 Create Permission Client**

`src/clients/permission.client.ts`:

```typescript
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PermissionServiceClient } from './proto/permissions.pb';

@Injectable()
export class PermissionClient implements OnModuleInit {
  private permissionService: PermissionServiceClient;

  constructor(@Inject('PERMISSION_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.permissionService =
      this.client.getService<PermissionServiceClient>('PermissionService');
  }

  async checkTripAccess(userId: string, userEmail: string, tripId: string) {
    return firstValueFrom(
      this.permissionService.checkTripAccess({ user_id: userId, user_email: userEmail, trip_id: tripId }),
    );
  }

  async checkTripModify(userId: string, tripId: string) {
    const result = await firstValueFrom(
      this.permissionService.checkTripModify({ user_id: userId, trip_id: tripId }),
    );
    return result.can_modify;
  }

  async checkExpenseModify(
    userId: string,
    userEmail: string,
    tripId: string,
    expenseCreatorId?: string,
  ) {
    const result = await firstValueFrom(
      this.permissionService.checkExpenseModify({
        user_id: userId,
        user_email: userEmail,
        trip_id: tripId,
        expense_creator_id: expenseCreatorId || '',
      }),
    );
    return result.can_modify;
  }
}
```

**7.3 Replace Helper Calls in Services**

**Before (trips.service.ts line 182-186):**
```typescript
const { canAccess, role } = canAccessTrip(userId, userEmail, trip);
if (!canAccess) {
  throw new ForbiddenException('You do not have access to this trip');
}
```

**After:**
```typescript
const result = await this.permissionClient.checkTripAccess(userId, userEmail, tripId);
if (!result.can_access) {
  throw new ForbiddenException('You do not have access to this trip');
}
```

**Before (trips.service.ts line 211-213):**
```typescript
if (!canModifyTrip(userId, trip)) {
  throw new ForbiddenException('Only trip creator can update trip details');
}
```

**After:**
```typescript
const canModify = await this.permissionClient.checkTripModify(userId, tripId);
if (!canModify) {
  throw new ForbiddenException('Only trip creator can update trip details');
}
```

---

## Testing Strategy

### 1. Unit Tests

**Auth Service:**
```typescript
// auth-service/src/auth/auth.service.spec.ts
describe('AuthService', () => {
  it('should register user with valid code', async () => {
    const dto = { email: 'test@test.com', password: '123456', name: 'Test', code: '123456' };
    const result = await service.register(dto);
    expect(result.user.email).toBe('test@test.com');
    expect(result.token).toBeDefined();
  });
});
```

**Permission Service:**
```typescript
// permission-service/src/permissions/permissions.service.spec.ts
describe('PermissionsService', () => {
  it('should allow trip creator to access trip', async () => {
    const result = await service.checkTripAccess(creatorId, 'creator@test.com', tripId);
    expect(result.can_access).toBe(true);
    expect(result.role).toBe('creator');
  });
});
```

### 2. Integration Tests

**API Gateway → Auth Service:**
```typescript
// api-gateway/test/auth.e2e-spec.ts
describe('Auth E2E', () => {
  it('/api/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '123456', name: 'Test', code: '123456' })
      .expect(201)
      .expect((res) => {
        expect(res.body.token).toBeDefined();
      });
  });
});
```

### 3. Performance Tests

**Permission Service Caching:**
- First call: ~50ms (DB query)
- Cached call: ~5ms (Redis)
- Cache invalidation on trip update

---

## Migration Checklist

### Pre-Migration
- [ ] Backup all databases
- [ ] Document current API endpoints
- [ ] Set up monitoring/logging infrastructure
- [ ] Create rollback plan

### Phase 1: Infrastructure
- [ ] Set up monorepo structure
- [ ] Create proto files
- [ ] Set up Docker Compose
- [ ] Start databases (auth-db, trip-db, redis)

### Phase 2: Auth Service
- [ ] Create auth-service project
- [ ] Implement gRPC controllers
- [ ] Migrate user data to auth_db
- [ ] Test auth endpoints via gRPC
- [ ] Deploy auth-service

### Phase 3: Permission Service
- [ ] Create permission-service project
- [ ] Copy trip-access.helper.ts
- [ ] Implement gRPC controllers with caching
- [ ] Test permission checks via gRPC
- [ ] Deploy permission-service

### Phase 4: API Gateway
- [ ] Create api-gateway project
- [ ] Implement REST controllers
- [ ] Configure gRPC clients
- [ ] Test REST → gRPC translation
- [ ] Deploy api-gateway

### Phase 5: Update Monolith
- [ ] Install gRPC clients in monolith
- [ ] Replace trip-access helper calls with Permission Service calls
- [ ] Replace user queries with Auth Service calls
- [ ] Test all existing functionality
- [ ] Performance test (compare with baseline)

### Phase 6: Frontend Update
- [ ] Update frontend to call API Gateway (http://localhost:3000/api)
- [ ] Test login/register flows
- [ ] Test permission-protected endpoints
- [ ] Monitor error rates

### Phase 7: Production Deployment
- [ ] Set up Kubernetes/Docker Swarm
- [ ] Configure service discovery
- [ ] Set up load balancers
- [ ] Enable distributed tracing (Jaeger)
- [ ] Set up centralized logging (ELK)
- [ ] Configure monitoring (Prometheus + Grafana)
- [ ] Deploy to production
- [ ] Monitor metrics

---

## Critical Files Reference

### Files to Create (New Services)

1. **Auth Service (15+ files)**
   - `apps/auth-svc/src/main.ts`
   - `apps/auth-svc/src/app.module.ts`
   - `apps/auth-svc/src/auth/auth.controller.ts`
   - `apps/auth-svc/src/auth/auth.service.ts`
   - `apps/auth-svc/prisma/schema.prisma`
   - `apps/auth-svc/project.json`
   - `apps/auth-svc/tsconfig.app.json`
   - `apps/auth-svc/Dockerfile`

2. **Permission Service (12+ files)**
   - `apps/permission-svc/src/main.ts`
   - `apps/permission-svc/src/permissions/permissions.controller.ts`
   - `apps/permission-svc/src/permissions/permissions.service.ts`
   - `apps/permission-svc/src/cache/redis-cache.service.ts`
   - `apps/permission-svc/src/common/helpers/trip-access.helper.ts` (moved from src/)
   - `apps/permission-svc/prisma/schema.prisma`
   - `apps/permission-svc/project.json`
   - `apps/permission-svc/tsconfig.app.json`
   - `apps/permission-svc/Dockerfile`

3. **API Gateway (10+ files)**
   - `apps/api-gateway/src/main.ts`
   - `apps/api-gateway/src/auth/auth.controller.ts`
   - `apps/api-gateway/src/auth/auth-grpc.client.ts`
   - `apps/api-gateway/src/common/guards/jwt-auth.guard.ts`
   - `apps/api-gateway/project.json`
   - `apps/api-gateway/tsconfig.app.json`
   - `apps/api-gateway/Dockerfile`

4. **Shared Libraries**
   - `libs/proto/auth.proto`
   - `libs/proto/permissions.proto`
   - `libs/proto/common.proto`
   - `libs/proto/generate.sh`
   - `libs/common/` (shared utilities)
   - `libs/dto/` (shared DTOs)

5. **Infrastructure & Configuration**
   - `nest-cli.json` (monorepo configuration)
   - `tsconfig.base.json` (base TypeScript config)
   - `docker-compose.yml` (update paths)
   - `package.json` (update scripts)

### Files to Modify (Existing Domain Services in `src/`)

1. **TripsService** - `src/trips/trips.service.ts`
   - Lines 5, 182-186, 211-213, 259 - Replace helper calls with gRPC

2. **ExpensesService** - `src/expenses/expenses.service.ts`
   - Lines 5, 36-49 - Replace helper calls with gRPC

3. **MembersService** - `src/members/members.service.ts`
   - Lines 5, 54-58 - Replace helper calls with gRPC

4. **ItineraryService** - `src/itinerary/itinerary.service.ts`
   - Replace helper calls with gRPC

5. **AppModule** - `src/app.module.ts`
   - Add gRPC client modules for Permission Service

---

## Performance Considerations

### Expected Performance

**Before (Monolith):**
- Permission check: ~2ms (in-memory helper function)
- Auth request: ~50ms (single DB query)

**After (Microservices):**
- Permission check: ~10ms (gRPC + Redis cache) / ~60ms (cache miss)
- Auth request: ~15ms (gRPC call)

### Optimization Strategies

1. **Redis Caching** - Cache trip data for 5 minutes
2. **gRPC Connection Pooling** - Reuse gRPC channels
3. **API Gateway Response Caching** - Cache public endpoints
4. **Database Indexes** - Ensure indexes on tripId, ownerId, email
5. **Horizontal Scaling** - Run multiple Permission Service instances

---

## Security Considerations

1. **Inter-Service Authentication**
   - gRPC services not exposed publicly (only gateway has public port)
   - Optional: Add service-to-service mTLS

2. **JWT Secret Sharing**
   - Auth Service generates tokens
   - API Gateway validates tokens (shared JWT_SECRET)
   - Never expose JWT_SECRET

3. **Database Access**
   - Auth Service: Read/Write to auth_db
   - Permission Service: Read-only to trip_db
   - Use least-privilege DB users in production

4. **Rate Limiting**
   - Implement at API Gateway level
   - Protect auth endpoints (login, register)

---

## Next Steps After Implementation

### Phase 8: Extract Domain Services
- Extract Trip Service
- Extract Expense Service
- Extract Member Service
- Extract Notification Service

### Phase 9: Event-Driven Architecture
- Add RabbitMQ/NATS
- Implement event sourcing for notifications
- Async settlement calculations

### Phase 10: Advanced Features
- Service mesh (Istio)
- API versioning
- GraphQL gateway (Apollo Federation)
- CQRS pattern for read-heavy operations

---

## Support & Troubleshooting

### Common Issues

**1. gRPC connection refused**
- Check service URLs in docker-compose
- Verify services are running: `docker-compose ps`
- Check logs: `docker-compose logs auth-service`

**2. Database connection error**
- Run migrations: `cd apps/auth-svc && npx prisma migrate dev`
- Check DATABASE_URL in .env

**3. JWT validation fails**
- Ensure JWT_SECRET matches in auth-service and api-gateway
- Check token expiration

**4. Permission checks fail**
- Verify Permission Service has access to trip_db
- Check Redis connection
- Clear cache: `docker-compose exec redis redis-cli FLUSHALL`

---

## Summary

This plan provides a **complete, production-ready microservices architecture** for your Travel Expense Planner application. The implementation follows industry best practices:

✅ **Separation of Concerns** - Auth, Permission, and Domain services
✅ **High Performance** - gRPC + Redis caching
✅ **Scalability** - Independent service deployment
✅ **Security** - JWT tokens, DB isolation, service boundaries
✅ **Developer Experience** - Monorepo, Docker Compose, clear structure
✅ **Production Ready** - Monitoring, logging, error handling

**Estimated Implementation Time:** 3-5 days for experienced developer

**Recommended Order:**
1. Day 1: Infrastructure + Proto files
2. Day 2: Auth Service
3. Day 3: Permission Service + API Gateway
4. Day 4: Update monolith + Testing
5. Day 5: Docker deployment + Documentation

---

**Key Difference from Original Plan:** Instead of separate `services/` folder at root level, everything is within `travel-planner-be/` using NestJS monorepo structure with `apps/` and `libs/` folders.
