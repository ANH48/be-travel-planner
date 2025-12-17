# Microservices Implementation Roadmap

> **Based on:** `/Users/nhut/.claude/plans/peppy-wandering-metcalfe.md`
> **Project:** Travel Expense Planner - Microservices Architecture
> **Timeline:** 5 days for experienced developer

---

## Implementation Checklist

### ✅ Phase 1: Infrastructure Setup (Day 1)

#### 1.1 Create Directory Structure
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

**Expected Result:** Directory structure created

---

#### 1.2 Install Additional Dependencies
```bash
npm install @grpc/grpc-js @grpc/proto-loader ioredis ts-proto concurrently
```

**Expected Result:** Dependencies added to package.json

---

#### 1.3 Create NestJS Monorepo Configuration

**File:** `nest-cli.json`

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

**Expected Result:** Monorepo configured

---

#### 1.4 Create Base TypeScript Config

**File:** `tsconfig.base.json`

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

**Expected Result:** Base TypeScript config created

---

#### 1.5 Create Proto Files

**File:** `libs/proto/auth.proto`

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

**File:** `libs/proto/permissions.proto`

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
  string role = 2;
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

**File:** `libs/proto/generate.sh`

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

```bash
chmod +x libs/proto/generate.sh
```

**Expected Result:** Proto definitions created

---

#### 1.6 Update package.json Scripts

Add these scripts to root `package.json`:

```json
{
  "scripts": {
    "start:gateway": "nest start api-gateway --watch",
    "start:auth": "nest start auth-svc --watch",
    "start:permission": "nest start permission-svc --watch",
    "start:all": "concurrently \"npm run start:gateway\" \"npm run start:auth\" \"npm run start:permission\"",
    "build:gateway": "nest build api-gateway",
    "build:auth": "nest build auth-svc",
    "build:permission": "nest build permission-svc",
    "proto:generate": "cd libs/proto && ./generate.sh"
  }
}
```

**Expected Result:** NPM scripts added

---

### ✅ Phase 2: Auth Service (Day 2)

#### 2.1 Generate Auth Service App

```bash
nest generate app auth-svc
```

**Expected Result:** Auth service scaffolded in `apps/auth-svc/`

---

#### 2.2 Create Prisma Schema for Auth Service

**File:** `apps/auth-svc/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client-auth"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

**Expected Result:** Auth database schema created

---

#### 2.3 Copy Modules to Auth Service

```bash
# Copy auth-related modules
cp -r src/auth apps/auth-svc/src/
cp -r src/users apps/auth-svc/src/
cp -r src/verification apps/auth-svc/src/
cp -r src/email apps/auth-svc/src/
cp -r src/firebase apps/auth-svc/src/
cp -r src/prisma apps/auth-svc/src/
```

**Expected Result:** Modules copied

---

#### 2.4 Create gRPC Main File

**File:** `apps/auth-svc/src/main.ts`

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
        protoPath: join(__dirname, '../../libs/proto/auth.proto'),
        url: '0.0.0.0:50051',
      },
    },
  );

  await app.listen();
  console.log('🚀 Auth Service (gRPC) is running on port 50051');
}
bootstrap();
```

**Expected Result:** gRPC server configured

---

#### 2.5 Create Auth gRPC Controller

**File:** `apps/auth-svc/src/auth/auth.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @GrpcMethod('AuthService', 'Register')
  async register(data: any) {
    return this.authService.register(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: any) {
    return this.authService.login(data);
  }

  @GrpcMethod('AuthService', 'GetMe')
  async getMe(data: any) {
    const user = await this.authService.getMe(data.user_id);
    return { user };
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(data: any) {
    return this.authService.validateToken(data.token);
  }
}
```

**Expected Result:** gRPC controller created

---

#### 2.6 Create .env for Auth Service

**File:** `apps/auth-svc/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/auth_db"
JWT_SECRET="your-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"

EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM="Travel Planner <noreply@travelplanner.com>"

FIREBASE_SERVICE_ACCOUNT=""
FIREBASE_DATABASE_URL=""
```

**Expected Result:** Environment variables configured

---

#### 2.7 Run Database Migration

```bash
cd apps/auth-svc
npx prisma migrate dev --name init
npx prisma generate
```

**Expected Result:** Auth database created

---

#### 2.8 Test Auth Service

```bash
npm run start:auth
```

**Expected Result:** Auth service running on port 50051

---

### ✅ Phase 3: Permission Service (Day 3 Morning)

#### 3.1 Generate Permission Service App

```bash
nest generate app permission-svc
```

**Expected Result:** Permission service scaffolded

---

#### 3.2 Create Prisma Schema for Permission Service

**File:** `apps/permission-svc/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client-permission"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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

**Expected Result:** Permission schema created

---

#### 3.3 Move Permission Helper

```bash
mkdir -p apps/permission-svc/src/common/helpers
cp src/common/helpers/trip-access.helper.ts apps/permission-svc/src/common/helpers/
```

**Expected Result:** Helper moved

---

#### 3.4 Create Redis Cache Service

**File:** `apps/permission-svc/src/cache/redis-cache.service.ts`

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
}
```

**Expected Result:** Redis cache service created

---

#### 3.5 Test Permission Service

```bash
npm run start:permission
```

**Expected Result:** Permission service running on port 50052

---

### ✅ Phase 4: API Gateway (Day 3 Afternoon)

#### 4.1 Generate API Gateway App

```bash
nest generate app api-gateway
```

**Expected Result:** API Gateway scaffolded

---

#### 4.2 Create gRPC Clients

**File:** `apps/api-gateway/src/auth/auth-grpc.client.ts`

```typescript
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private authService: any;

  constructor(@Inject('AUTH_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService('AuthService');
  }

  async register(data: any) {
    return firstValueFrom(this.authService.register(data));
  }

  async login(data: any) {
    return firstValueFrom(this.authService.login(data));
  }

  async getMe(userId: string) {
    return firstValueFrom(this.authService.getMe({ user_id: userId }));
  }
}
```

**Expected Result:** gRPC clients created

---

#### 4.3 Configure App Module

**File:** `apps/api-gateway/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: join(__dirname, '../../libs/proto/auth.proto'),
          url: process.env.AUTH_SERVICE_URL || 'localhost:50051',
        },
      },
      {
        name: 'PERMISSION_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'permissions',
          protoPath: join(__dirname, '../../libs/proto/permissions.proto'),
          url: process.env.PERMISSION_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
  ],
})
export class AppModule {}
```

**Expected Result:** gRPC clients configured

---

#### 4.4 Test API Gateway

```bash
npm run start:gateway
```

**Expected Result:** API Gateway running on port 3000

---

### ✅ Phase 5: Docker Setup (Day 4)

#### 5.1 Create Docker Compose

**File:** `docker-compose.yml` (at root of travel-planner-be)

See full plan for complete docker-compose.yml

---

#### 5.2 Test with Docker

```bash
docker-compose up -d
docker-compose logs -f
```

**Expected Result:** All services running in Docker

---

### ✅ Phase 6: Update Monolith (Day 5)

#### 6.1 Create Permission Client in Monolith

**File:** `src/clients/permission.client.ts`

#### 6.2 Replace Helper Calls

Update all services in `src/` to use gRPC clients instead of helpers

---

## Testing Checklist

- [ ] Auth Service: Register user via gRPC
- [ ] Auth Service: Login user via gRPC
- [ ] Auth Service: Get user profile via gRPC
- [ ] Permission Service: Check trip access
- [ ] Permission Service: Check modify permissions
- [ ] Permission Service: Redis caching works
- [ ] API Gateway: REST → gRPC translation
- [ ] API Gateway: JWT validation
- [ ] Monolith: Calls Permission Service successfully
- [ ] Docker: All services start correctly
- [ ] Docker: Services can communicate
- [ ] End-to-end: User can login via gateway
- [ ] End-to-end: Trip permissions work

---

## Rollback Plan

If issues occur:

1. **Revert to monolith**: Comment out gRPC calls, use original helpers
2. **Database**: Restore from backups
3. **Code**: Git revert to previous commit
4. **Docker**: `docker-compose down && docker-compose up`

---

## Success Criteria

✅ All 3 services running independently
✅ gRPC communication working
✅ API Gateway routing correctly
✅ Redis caching functional
✅ Existing tests passing
✅ Performance acceptable (<100ms latency)
✅ Docker containers healthy

---

**Next Steps After Completion:**

1. Extract Trip Service
2. Extract Expense Service
3. Add monitoring (Prometheus + Grafana)
4. Add distributed tracing (Jaeger)
5. Production deployment (Kubernetes)
