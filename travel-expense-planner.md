# Travel Expense Planner - Project Plan

## 1. Project Overview

### 1.1 Description
Web application để lên lịch trình du lịch với khả năng:
- Quản lý lịch trình (ngày đi, ngày về, thời gian cụ thể)
- Quản lý thành viên tham gia
- Ghi chú chi phí theo từng thành viên
- Tự động chia tiền dựa trên chi tiêu

### 1.2 Tech Stack
- **Frontend**: Next.js 14+ (React Framework)
- **Backend**: NestJS (Node.js Framework)
- **Database**: PostgreSQL 14+ (Primary choice)
- **ORM**: Prisma
- **Authentication**: JWT + Passport
- **File Storage**: Cloudinary / AWS S3 (for receipts)
- **Deployment**: Vercel (FE) + Railway/Render (BE)

---

## 2. Core Features

### 2.1 Trip Management
- **Tạo chuyến đi mới**
  - Tên chuyến đi
  - Ngày bắt đầu (date + time)
  - Ngày kết thúc (date + time)
  - Địa điểm
  - Mô tả

- **Xem danh sách chuyến đi**
  - Lọc theo trạng thái: Upcoming, Ongoing, Completed
  - Tìm kiếm theo tên

### 2.2 Member Management
- **Thêm thành viên vào chuyến đi**
  - Tên thành viên
  - Email (optional)
  - Số điện thoại (optional)
  
- **Quản lý thành viên**
  - Xem danh sách thành viên
  - Xóa/Chỉnh sửa thông tin thành viên
  - Đánh dấu thành viên đã thanh toán

### 2.3 Expense Tracking
- **Ghi chú chi phí**
  - Loại chi phí: Ăn uống, Di chuyển, Lưu trú, Giải trí, Khác
  - Số tiền
  - Người trả tiền
  - Người liên quan (có thể nhiều người)
  - Ngày giờ chi tiêu
  - Mô tả/Ghi chú
  - Hình ảnh hóa đơn (optional)

- **Phân chia chi phí**
  - Chia đều cho tất cả thành viên
  - Chia theo số tiền cụ thể
  - Chia theo phần trăm
  - Chia cho một số thành viên cụ thể

### 2.4 Settlement & Reports
- **Tính toán tự động**
  - Tổng chi phí chuyến đi
  - Chi phí từng thành viên
  - Người nợ, người được trả
  - Gợi ý thanh toán tối ưu

- **Báo cáo**
  - Tổng quan chi phí theo loại
  - Chi phí theo thành viên
  - Timeline chi tiêu
  - Export PDF/Excel

---

## 3. Database Schema

### 3.1 Database Choice: PostgreSQL

**Why PostgreSQL?**
- ✅ Relational integrity cho cấu trúc dữ liệu phức tạp
- ✅ NUMERIC type cho độ chính xác tuyệt đối với tiền
- ✅ Foreign keys, constraints đảm bảo data consistency
- ✅ Powerful aggregations cho báo cáo, tính toán
- ✅ Transaction support (ACID) cho thanh toán chính xác
- ✅ Prisma ORM hỗ trợ tốt, type-safe
- ✅ Dễ scale với indexing, partitioning

### 3.2 Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  avatar    String?
  trips     Trip[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Trip {
  id          String       @id @default(uuid())
  ownerId     String       @map("owner_id")
  owner       User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  name        String
  description String?
  location    String
  startDate   DateTime     @map("start_date")
  endDate     DateTime     @map("end_date")
  status      TripStatus   @default(UPCOMING)
  members     TripMember[]
  expenses    Expense[]
  settlements Settlement[]
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  @@index([ownerId])
  @@map("trips")
}

model TripMember {
  id              String         @id @default(uuid())
  tripId          String         @map("trip_id")
  trip            Trip           @relation(fields: [tripId], references: [id], onDelete: Cascade)
  userId          String?        @map("user_id") // null if guest member
  name            String
  email           String?
  phone           String?
  isPaid          Boolean        @default(false) @map("is_paid")
  paidExpenses    Expense[]      @relation("Payer")
  expenseSplits   ExpenseSplit[]
  settlementsFrom Settlement[]   @relation("FromMember")
  settlementsTo   Settlement[]   @relation("ToMember")
  createdAt       DateTime       @default(now()) @map("created_at")

  @@index([tripId])
  @@map("trip_members")
}

model Expense {
  id           String            @id @default(uuid())
  tripId       String            @map("trip_id")
  trip         Trip              @relation(fields: [tripId], references: [id], onDelete: Cascade)
  payerId      String            @map("payer_id")
  payer        TripMember        @relation("Payer", fields: [payerId], references: [id])
  category     ExpenseCategory
  amount       Decimal           @db.Decimal(12, 2)
  description  String
  expenseDate  DateTime          @map("expense_date")
  receiptImage String?           @map("receipt_image")
  splits       ExpenseSplit[]
  createdAt    DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime          @updatedAt @map("updated_at")

  @@index([tripId])
  @@index([payerId])
  @@map("expenses")
}

model ExpenseSplit {
  id         String     @id @default(uuid())
  expenseId  String     @map("expense_id")
  expense    Expense    @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  memberId   String     @map("member_id")
  member     TripMember @relation(fields: [memberId], references: [id])
  amount     Decimal    @db.Decimal(12, 2)
  percentage Decimal?   @db.Decimal(5, 2) // 0-100
  createdAt  DateTime   @default(now()) @map("created_at")

  @@index([expenseId])
  @@index([memberId])
  @@map("expense_splits")
}

model Settlement {
  id           String           @id @default(uuid())
  tripId       String           @map("trip_id")
  trip         Trip             @relation(fields: [tripId], references: [id], onDelete: Cascade)
  fromMemberId String           @map("from_member_id")
  fromMember   TripMember       @relation("FromMember", fields: [fromMemberId], references: [id])
  toMemberId   String           @map("to_member_id")
  toMember     TripMember       @relation("ToMember", fields: [toMemberId], references: [id])
  amount       Decimal          @db.Decimal(12, 2)
  status       SettlementStatus @default(PENDING)
  settledAt    DateTime?        @map("settled_at")
  createdAt    DateTime         @default(now()) @map("created_at")

  @@index([tripId])
  @@map("settlements")
}

enum TripStatus {
  UPCOMING
  ONGOING
  COMPLETED
}

enum ExpenseCategory {
  FOOD
  TRANSPORT
  ACCOMMODATION
  ENTERTAINMENT
  OTHER
}

enum SettlementStatus {
  PENDING
  COMPLETED
}
```

### 3.3 Tables (Legacy Reference)

#### Users
```typescript
{
  id: string
  email: string
  password: string (hashed)
  name: string
  avatar?: string
  created_at: datetime
  updated_at: datetime
}
```

#### Trips
```typescript
{
  id: string
  owner_id: string (ref: Users)
  name: string
  description?: string
  location: string
  start_date: datetime
  end_date: datetime
  status: enum ['upcoming', 'ongoing', 'completed']
  created_at: datetime
  updated_at: datetime
}
```

#### Trip_Members
```typescript
{
  id: string
  trip_id: string (ref: Trips)
  user_id?: string (ref: Users) // null nếu không có account
  name: string
  email?: string
  phone?: string
  is_paid: boolean
  created_at: datetime
}
```

#### Expenses
```typescript
{
  id: string
  trip_id: string (ref: Trips)
  payer_id: string (ref: Trip_Members)
  category: enum ['food', 'transport', 'accommodation', 'entertainment', 'other']
  amount: decimal
  description: string
  expense_date: datetime
  receipt_image?: string
  created_at: datetime
  updated_at: datetime
}
```

#### Expense_Splits
```typescript
{
  id: string
  expense_id: string (ref: Expenses)
  member_id: string (ref: Trip_Members)
  amount: decimal
  percentage?: decimal
  created_at: datetime
}
```

#### Settlements
```typescript
{
  id: string
  trip_id: string (ref: Trips)
  from_member_id: string (ref: Trip_Members)
  to_member_id: string (ref: Trip_Members)
  amount: decimal
  status: enum ['pending', 'completed']
  settled_at?: datetime
  created_at: datetime
}
```

---

## 4. API Endpoints

### 4.1 Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### 4.2 Trips
- `GET /api/trips` - Lấy danh sách chuyến đi
- `GET /api/trips/:id` - Lấy chi tiết chuyến đi
- `POST /api/trips` - Tạo chuyến đi mới
- `PUT /api/trips/:id` - Cập nhật chuyến đi
- `DELETE /api/trips/:id` - Xóa chuyến đi

### 4.3 Members
- `GET /api/trips/:tripId/members` - Lấy danh sách thành viên
- `POST /api/trips/:tripId/members` - Thêm thành viên
- `PUT /api/trips/:tripId/members/:id` - Cập nhật thành viên
- `DELETE /api/trips/:tripId/members/:id` - Xóa thành viên

### 4.4 Expenses
- `GET /api/trips/:tripId/expenses` - Lấy danh sách chi phí
- `GET /api/expenses/:id` - Lấy chi tiết chi phí
- `POST /api/trips/:tripId/expenses` - Thêm chi phí mới
- `PUT /api/expenses/:id` - Cập nhật chi phí
- `DELETE /api/expenses/:id` - Xóa chi phí

### 4.5 Settlements
- `GET /api/trips/:tripId/settlements` - Tính toán thanh toán
- `POST /api/trips/:tripId/settlements/:id/mark-paid` - Đánh dấu đã thanh toán
- `GET /api/trips/:tripId/report` - Lấy báo cáo tổng hợp

---

## 5. Frontend Pages & Components

### 5.1 Pages
- `/` - Landing page
- `/login` - Đăng nhập
- `/register` - Đăng ký
- `/dashboard` - Danh sách chuyến đi
- `/trips/new` - Tạo chuyến đi mới
- `/trips/[id]` - Chi tiết chuyến đi
- `/trips/[id]/expenses` - Quản lý chi phí
- `/trips/[id]/members` - Quản lý thành viên
- `/trips/[id]/report` - Báo cáo & thanh toán

### 5.2 Key Components
- `TripCard` - Card hiển thị chuyến đi
- `MemberList` - Danh sách thành viên
- `ExpenseForm` - Form thêm/sửa chi phí
- `ExpenseItem` - Hiển thị một chi phí
- `SplitCalculator` - Component chia tiền
- `SettlementSummary` - Tổng kết thanh toán
- `DateRangePicker` - Chọn ngày đi/về
- `CategoryIcon` - Icon theo loại chi phí

---

## 6. Development Phases

### Phase 1: MVP (2-3 weeks)
- [ ] Setup project (Next.js + NestJS)
- [ ] Authentication (Register, Login)
- [ ] Trip CRUD
- [ ] Member management
- [ ] Basic expense tracking
- [ ] Simple split calculation (chia đều)

### Phase 2: Enhanced Features (2 weeks)
- [ ] Advanced split options (custom amount, percentage)
- [ ] Settlement calculation & suggestions
- [ ] Expense categories & filtering
- [ ] Image upload for receipts
- [ ] Responsive design

### Phase 3: Polish & Reports (1-2 weeks)
- [ ] Dashboard with statistics
- [ ] Report generation
- [ ] Export functionality
- [ ] Email notifications
- [ ] UI/UX improvements

### Phase 4: Advanced (Optional)
- [ ] Multi-currency support
- [ ] Real-time collaboration (Socket.io)
- [ ] Mobile app (React Native)
- [ ] Social sharing
- [ ] Integration with payment apps

---

## 7. Technical Implementation Details

### 7.1 Frontend (Next.js)
```
travel-planner-fe/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   ├── trips/
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   ├── expenses/
│   │   │   ├── members/
│   │   │   └── report/
│   │   └── new/
│   └── layout.tsx
├── components/
│   ├── ui/
│   ├── trips/
│   ├── expenses/
│   └── members/
├── lib/
│   ├── api.ts
│   ├── utils.ts
│   └── hooks/
├── types/
└── styles/
```

**Key Libraries:**
- `shadcn/ui` or `Ant Design` - UI components
- `react-hook-form` + `zod` - Form validation
- `tanstack/react-query` - Data fetching
- `zustand` or `jotai` - State management
- `date-fns` - Date manipulation
- `recharts` - Charts for reports
- `react-dropzone` - File upload

### 7.2 Backend (NestJS)
```
travel-planner-be/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── guards/
│   ├── users/
│   ├── trips/
│   │   ├── trips.controller.ts
│   │   ├── trips.service.ts
│   │   └── trips.module.ts
│   ├── members/
│   ├── expenses/
│   │   ├── expenses.controller.ts
│   │   ├── expenses.service.ts
│   │   └── dto/
│   ├── settlements/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   └── pipes/
│   └── main.ts
├── prisma/
│   └── schema.prisma
└── test/
```

**Key Libraries:**
- `@nestjs/passport` + `@nestjs/jwt` - Authentication
- `prisma` or `typeorm` - ORM
- `class-validator` + `class-transformer` - Validation
- `@nestjs/config` - Configuration
- `bcrypt` - Password hashing
- `cloudinary` or `AWS S3` - Image storage

---

## 8. Settlement Algorithm

### 8.1 Calculate Balances
```typescript
// Pseudo code
function calculateBalances(tripId: string) {
  const members = getMembers(tripId)
  const expenses = getExpenses(tripId)
  
  const balances = new Map<string, number>()
  
  // Initialize balances
  members.forEach(m => balances.set(m.id, 0))
  
  // Calculate who paid and who owes
  expenses.forEach(expense => {
    const splits = getExpenseSplits(expense.id)
    
    // Payer gets positive balance
    balances.set(
      expense.payer_id, 
      balances.get(expense.payer_id) + expense.amount
    )
    
    // Debtors get negative balance
    splits.forEach(split => {
      balances.set(
        split.member_id,
        balances.get(split.member_id) - split.amount
      )
    })
  })
  
  return balances
}
```

### 8.2 Optimize Settlements
```typescript
function optimizeSettlements(balances: Map<string, number>) {
  const creditors = [] // people who should receive money
  const debtors = [] // people who owe money
  
  balances.forEach((balance, memberId) => {
    if (balance > 0) creditors.push({ memberId, amount: balance })
    if (balance < 0) debtors.push({ memberId, amount: Math.abs(balance) })
  })
  
  const settlements = []
  
  // Greedy algorithm to minimize transactions
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0]
    const debtor = debtors[0]
    
    const settleAmount = Math.min(creditor.amount, debtor.amount)
    
    settlements.push({
      from: debtor.memberId,
      to: creditor.memberId,
      amount: settleAmount
    })
    
    creditor.amount -= settleAmount
    debtor.amount -= settleAmount
    
    if (creditor.amount === 0) creditors.shift()
    if (debtor.amount === 0) debtors.shift()
  }
  
  return settlements
}
```

---

## 9. Security Considerations

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use ORM)
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] JWT expiration & refresh tokens
- [ ] HTTPS only in production
- [ ] Environment variables for secrets
- [ ] Role-based access control (trip owner permissions)

---

## 10. Testing Strategy

### 10.1 Backend
- Unit tests for services (Jest)
- Integration tests for APIs
- E2E tests for critical flows

### 10.2 Frontend
- Component tests (React Testing Library)
- Integration tests (Playwright/Cypress)
- Visual regression tests (optional)

---

## 11. Deployment

### 11.1 Frontend (Vercel)
- Connect GitHub repository
- Auto-deploy on push to main
- Environment variables in Vercel dashboard

### 11.2 Backend (Railway/Render)
- Docker container
- PostgreSQL database
- Environment variables configuration
- CI/CD with GitHub Actions

---

## 12. Future Enhancements

- [ ] Mobile app (React Native/Flutter)
- [ ] Offline mode (PWA)
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Trip templates
- [ ] Budget limits & alerts
- [ ] Integration with Google Maps
- [ ] Calendar sync (Google Calendar, Apple Calendar)
- [ ] Split by QR code scan
- [ ] AI expense categorization
- [ ] Collaborative editing (real-time)

---

## 13. Getting Started

### 13.1 Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git
- VS Code (recommended)

### 13.2 Initial Setup

**Backend:**
```bash
npx @nestjs/cli new travel-planner-be
cd travel-planner-be
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install prisma @prisma/client
npx prisma init
```

**Frontend:**
```bash
npx create-next-app@latest travel-planner-fe --typescript --tailwind --app
cd travel-planner-fe
npm install @tanstack/react-query axios zustand react-hook-form zod
```

---

## 14. Success Metrics

- User can create a trip in < 2 minutes
- Add expense in < 30 seconds
- Accurate settlement calculation
- Mobile responsive (100% usability)
- Page load time < 2 seconds

---

**Last Updated:** November 19, 2025
