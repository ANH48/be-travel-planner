# Travel Expense Planner - Microservices Architecture

This document describes the microservices architecture implementation for the Travel Expense Planner backend.

## Architecture Overview

The system is now split into the following services:

### 1. **Auth Service** (Port 50051)
- Handles user authentication and authorization
- Manages user registration, login, and JWT tokens
- Stores user data in separate `auth_db` database (PostgreSQL on port 5433)
- gRPC microservice

### 2. **Permission Service** (Port 50052)
- Manages trip access permissions
- Validates user permissions for trips, expenses, and itineraries
- Uses Redis caching (5-minute TTL) for performance
- Connects to `trip_db` (PostgreSQL on port 5432) in read-only mode
- gRPC microservice

### 3. **API Gateway** (Port 3000)
- REST API entry point for clients
- Routes requests to appropriate microservices
- Handles JWT authentication
- Exposes HTTP endpoints for frontend

### 4. **Monolith Service** (Port 3001)
- Original application now acting as a domain service
- Handles trips, expenses, members, itineraries, settlements
- Uses gRPC clients to communicate with Auth and Permission services
- Maintains existing REST endpoints

## Directory Structure

```
travel-planner-be/
├── apps/
│   ├── api-gateway/          # API Gateway service
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/         # gRPC clients and controllers
│   │   │   └── common/       # Guards, decorators
│   │   ├── .env
│   │   └── Dockerfile
│   ├── auth-svc/             # Authentication microservice
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── verification/
│   │   │   ├── email/
│   │   │   ├── firebase/
│   │   │   └── prisma/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── .env
│   │   └── Dockerfile
│   └── permission-svc/       # Permission microservice
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── permissions/
│       │   ├── cache/        # Redis cache service
│       │   └── prisma/
│       ├── prisma/
│       │   └── schema.prisma
│       ├── .env
│       └── Dockerfile
├── libs/
│   ├── proto/                # Protocol Buffer definitions
│   │   ├── auth.proto
│   │   ├── permissions.proto
│   │   └── generate.sh
│   ├── common/               # Shared utilities (future)
│   └── dto/                  # Shared DTOs (future)
├── src/                      # Monolith (domain service)
│   ├── grpc-clients/         # gRPC clients for microservices
│   │   ├── auth-grpc.client.ts
│   │   ├── permission-grpc.client.ts
│   │   └── grpc-clients.module.ts
│   ├── trips/
│   ├── expenses/
│   ├── members/
│   ├── itinerary/
│   └── ...
├── docker-compose.yml
└── package.json
```

## Running Locally (Development)

### Prerequisites
- Node.js 20+
- PostgreSQL (2 databases: auth_db on port 5433, trip_db on port 5432)
- Redis (port 6379)
- npm packages installed

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Generate Protocol Buffers:**
```bash
npm run proto:generate
```

3. **Setup databases:**

For Auth Service:
```bash
cd apps/auth-svc
npx prisma generate
npx prisma migrate dev
cd ../..
```

For Permission Service:
```bash
cd apps/permission-svc
npx prisma generate
cd ../..
```

4. **Configure environment variables:**

Create `.env` files for each service (or use the existing ones):
- `apps/auth-svc/.env` - Auth Service configuration
- `apps/permission-svc/.env` - Permission Service configuration
- `apps/api-gateway/.env` - API Gateway configuration
- `.env` - Monolith configuration

5. **Start all services:**

Option 1: Run all services concurrently
```bash
npm run start:all
```

Option 2: Run services individually (in separate terminals)
```bash
# Terminal 1: Auth Service
npm run start:auth

# Terminal 2: Permission Service
npm run start:permission

# Terminal 3: API Gateway
npm run start:gateway

# Terminal 4: Monolith
npm run start:dev
```

### Service Endpoints

- **API Gateway**: http://localhost:3000/api
- **Monolith**: http://localhost:3001/api
- **Auth Service**: gRPC localhost:50051
- **Permission Service**: gRPC localhost:50052

## Running with Docker

### Prerequisites
- Docker
- Docker Compose

### Setup

1. **Copy environment template:**
```bash
cp .env.docker .env
```

2. **Fill in your environment variables in `.env`**

3. **Build and start all services:**
```bash
docker-compose up --build
```

4. **Stop all services:**
```bash
docker-compose down
```

5. **Reset databases (⚠️ DESTRUCTIVE):**
```bash
docker-compose down -v
```

### Docker Services

The docker-compose setup includes:
- `auth-db` - PostgreSQL for Auth Service (port 5433)
- `trip-db` - PostgreSQL for domain data (port 5432)
- `redis` - Redis cache (port 6379)
- `auth-service` - Auth microservice (port 50051)
- `permission-service` - Permission microservice (port 50052)
- `api-gateway` - API Gateway (port 3001 → mapped to 3000)

## API Usage

### Using API Gateway (Recommended for new clients)

The API Gateway exposes REST endpoints that proxy to microservices:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get current user (requires JWT token)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Using Monolith (Existing clients)

Existing endpoints continue to work on the monolith:

```bash
# Create trip
curl -X POST http://localhost:3001/api/trips \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Summer Vacation","location":"Hawaii","startDate":"2025-06-01","endDate":"2025-06-15"}'
```

## Architecture Benefits

### 1. **Separation of Concerns**
- Authentication logic isolated in Auth Service
- Permission checking centralized in Permission Service
- Domain logic remains in monolith/domain services

### 2. **Independent Scaling**
- Scale Auth Service independently during high registration periods
- Scale Permission Service for read-heavy permission checks
- Scale domain services based on business logic needs

### 3. **Database Isolation**
- User/auth data separated from business data
- Permission Service uses read-only access to trip database
- Easier to secure and audit authentication data

### 4. **Caching**
- Permission Service uses Redis for 5-minute cache
- Reduces database load for frequently accessed trips
- Cache invalidation patterns ready for future enhancements

### 5. **Performance**
- gRPC for fast inter-service communication
- Binary protocol reduces payload size
- HTTP/2 multiplexing for concurrent requests

## Migration Path

The current implementation allows for gradual migration:

1. **Phase 1** ✅ - Infrastructure and microservices created
2. **Phase 2** ✅ - Auth Service handles authentication
3. **Phase 3** ✅ - Permission Service handles authorization
4. **Phase 4** ✅ - API Gateway provides unified REST interface
5. **Phase 5** ✅ - Docker Compose for easy deployment
6. **Phase 6** ✅ - Monolith updated to use microservices

### Next Steps (Optional):
- Migrate more endpoints to API Gateway
- Add API versioning (v1, v2)
- Implement service discovery (Consul, Eureka)
- Add distributed tracing (Jaeger, Zipkin)
- Implement circuit breakers (Hystrix pattern)
- Add API rate limiting
- Implement event-driven architecture (message queues)

## Monitoring and Health Checks

Each service should expose health check endpoints:

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Check Monolith health
curl http://localhost:3001/health
```

Docker Compose includes health checks for databases and Redis.

## Troubleshooting

### Service won't start
- Check if ports are already in use (3000, 3001, 50051, 50052, 5432, 5433, 6379)
- Ensure databases are running and accessible
- Check `.env` files for correct configuration

### gRPC connection errors
- Verify microservices are running: `AUTH_SERVICE_URL` and `PERMISSION_SERVICE_URL`
- Check proto files are generated: `npm run proto:generate`
- Ensure firewall allows connections to gRPC ports

### Permission denied errors
- Verify JWT token is valid and not expired
- Check Permission Service logs for cache/database issues
- Ensure user is a member or owner of the trip

### Database connection errors
- Check PostgreSQL is running on correct ports (5432, 5433)
- Verify database credentials in `.env` files
- Run Prisma migrations: `npx prisma migrate dev`

## Security Considerations

1. **JWT Secret**: Change `JWT_SECRET` in production
2. **Database Passwords**: Use strong passwords in production
3. **CORS**: Configure `FRONTEND_URL` appropriately
4. **gRPC Security**: Add TLS for gRPC in production
5. **Rate Limiting**: Implement rate limiting on API Gateway
6. **Input Validation**: All DTOs should use class-validator

## Performance Optimization

1. **Redis Cache**: Permission Service caches trip data for 5 minutes
2. **Connection Pooling**: Prisma uses connection pooling by default
3. **gRPC Keepalive**: Configure keepalive for long-lived connections
4. **Database Indexes**: Ensure proper indexes on frequently queried fields
5. **Batch Operations**: Use Prisma transactions for batch updates

## Support

For issues or questions:
- Check logs: `docker-compose logs -f <service-name>`
- Review Prisma schema: `apps/*/prisma/schema.prisma`
- Review proto definitions: `libs/proto/*.proto`
- Check NestJS module imports and providers
