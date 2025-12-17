# Microservices Architecture Documentation

This directory contains comprehensive documentation for transforming the Travel Expense Planner backend from a monolithic architecture to microservices.

## 📚 Documentation Files

### 1. [Quick Reference Guide](./plan.md)
**File:** `plan.md`
- Quick overview of the architecture
- Key commands and configurations
- Common troubleshooting tips
- **Best for:** Quick lookups and daily development

### 2. [Complete Architecture Plan](./microservices-architecture-plan.md)
**File:** `microservices-architecture-plan.md` (52KB)
- Detailed microservices architecture design
- gRPC protocol definitions
- Database migration strategy
- Complete code examples for all services
- Phase-by-phase implementation guide
- Docker Compose configuration
- Testing strategy
- Security considerations
- **Best for:** Understanding the complete architecture and implementation details

### 3. [Implementation Roadmap](./implementation-roadmap.md)
**File:** `implementation-roadmap.md` (17KB)
- Day-by-day implementation checklist (5 days)
- Step-by-step instructions with commands
- Testing checklist
- Rollback plan
- Success criteria
- **Best for:** Following the implementation process sequentially

## 🎯 Architecture Overview

```
travel-planner-be/            # NestJS Monorepo Root
├── apps/
│   ├── api-gateway/          # REST → gRPC (Port 3000)
│   ├── auth-svc/             # Authentication gRPC (Port 50051)
│   └── permission-svc/       # Authorization gRPC (Port 50052)
├── libs/
│   ├── proto/                # gRPC contracts
│   ├── common/               # Shared utilities
│   └── dto/                  # Shared DTOs
└── src/                      # Existing monolith (domain services)
```

## 🚀 Quick Start

1. **Planning Phase** (Current)
   - ✅ Architecture designed
   - ✅ Documentation created
   - ⏳ Implementation pending user approval

2. **Next Steps** (When ready to implement)
   ```bash
   # Read the implementation roadmap
   cat implementation-roadmap.md

   # Start with Phase 1: Infrastructure Setup
   cd /Users/nhut/Documents/MyProject/Web/travel-expense-planner/travel-planner-be
   mkdir -p apps/api-gateway apps/auth-svc apps/permission-svc
   mkdir -p libs/proto libs/common libs/dto
   ```

## 📋 Key Decisions

- ✅ **Communication:** gRPC between services (high performance, type-safe)
- ✅ **Databases:** Separate DB per service (Auth DB, Permission cache, Core Domain DB)
- ✅ **Structure:** NestJS Monorepo within `travel-planner-be/` directory
- ✅ **Apps:** `apps/auth-svc`, `apps/permission-svc`, `apps/api-gateway`
- ✅ **Libs:** `libs/proto`, `libs/common`, `libs/dto`
- ✅ **Caching:** Redis for permission checks (5-minute TTL)
- ✅ **Package Manager:** Single `package.json` with shared dependencies

## ⏱️ Estimated Timeline

**Total Time:** 3-5 days for experienced developer

- **Day 1:** Infrastructure + Proto files
- **Day 2:** Auth Service
- **Day 3:** Permission Service + API Gateway
- **Day 4:** Update monolith + Testing
- **Day 5:** Docker deployment + Documentation

## 📖 Recommended Reading Order

1. Start with [`plan.md`](./plan.md) for quick overview
2. Read [`microservices-architecture-plan.md`](./microservices-architecture-plan.md) for complete understanding
3. Follow [`implementation-roadmap.md`](./implementation-roadmap.md) when ready to implement

## 🔧 Key Technologies

- **NestJS:** Framework for building microservices
- **gRPC:** High-performance inter-service communication
- **Protocol Buffers:** Service contract definitions
- **PostgreSQL:** Separate databases (auth_db, trip_db)
- **Redis:** Caching layer for permissions
- **Docker Compose:** Local development orchestration
- **Prisma:** ORM for database access

## 📞 Support

Refer to the Troubleshooting sections in each document for common issues and solutions.

---

**Last Updated:** December 16, 2025
**Status:** Planning Complete - Ready for Implementation
