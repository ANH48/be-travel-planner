# Validation & Split Features - Testing Guide

## ✅ Implemented Features

### 1. **Date Validation**
- `endDate` must be after `startDate` when creating/updating trips
- Custom decorator: `@IsAfter('startDate')`

**Test:**
```bash
# Should FAIL - endDate before startDate
POST /api/trips
{
  "name": "Invalid Trip",
  "location": "Test",
  "startDate": "2025-12-01T10:00:00Z",
  "endDate": "2025-11-30T10:00:00Z"  // Before start!
}

# Should SUCCEED
POST /api/trips
{
  "name": "Valid Trip",
  "location": "Test",
  "startDate": "2025-12-01T10:00:00Z",
  "endDate": "2025-12-05T10:00:00Z"  // After start
}
```

### 2. **Expense Splits Validation**
- Total split amounts must equal expense amount (within 0.01 tolerance)
- Custom decorator: `@IsValidSplits()`

**Test:**
```bash
# Should FAIL - splits don't match total
POST /api/trips/{tripId}/expenses
{
  "payerId": "member-1",
  "category": "FOOD",
  "amount": 100,
  "description": "Dinner",
  "expenseDate": "2025-11-19T18:00:00Z",
  "splits": [
    { "memberId": "member-1", "amount": 40 },
    { "memberId": "member-2", "amount": 50 }
    // Total: 90, Expected: 100 ❌
  ]
}

# Should SUCCEED
POST /api/trips/{tripId}/expenses
{
  "payerId": "member-1",
  "category": "FOOD",
  "amount": 100,
  "description": "Dinner",
  "expenseDate": "2025-11-19T18:00:00Z",
  "splits": [
    { "memberId": "member-1", "amount": 60 },
    { "memberId": "member-2", "amount": 40 }
    // Total: 100 ✅
  ]
}
```

### 3. **Member Validation**
- Payer must be a member of the trip
- All split members must belong to the trip

**Test:**
```bash
# Should FAIL - invalid payer
POST /api/trips/{tripId}/expenses
{
  "payerId": "non-existent-member",  // Not in trip ❌
  "category": "FOOD",
  "amount": 100,
  ...
}

# Should FAIL - invalid split member
POST /api/trips/{tripId}/expenses
{
  "payerId": "valid-member",
  "amount": 100,
  "splits": [
    { "memberId": "member-from-another-trip", "amount": 100 }  // ❌
  ]
}
```

### 4. **Split Evenly Feature**
- Auto-calculate equal splits for all trip members
- Handles rounding to ensure total matches exactly
- First member gets any remaining cents

**Test:**
```bash
# Automatic even split (NEW FEATURE!)
POST /api/trips/{tripId}/expenses
{
  "payerId": "member-1",
  "category": "FOOD",
  "amount": 100,
  "description": "Shared dinner",
  "expenseDate": "2025-11-19T18:00:00Z",
  "splitEvenly": true  // 🎉 Auto-split!
  // No need to provide "splits" array
}

# If trip has 3 members:
# Member 1: 33.34 (gets extra 0.01)
# Member 2: 33.33
# Member 3: 33.33
# Total: 100.00 ✅
```

### 5. **Auto-Update Trip Status**
- Status automatically calculated based on dates
- `UPCOMING`: current date < startDate
- `ONGOING`: startDate <= current date <= endDate
- `COMPLETED`: current date > endDate
- Updates when fetching trips or on date changes

**Test:**
```bash
# Create trip in the future
POST /api/trips
{
  "name": "Future Trip",
  "startDate": "2025-12-01T10:00:00Z",
  "endDate": "2025-12-05T10:00:00Z"
}
# Status: UPCOMING (auto-set)

# Create trip happening now
POST /api/trips
{
  "name": "Current Trip",
  "startDate": "2025-11-18T10:00:00Z",
  "endDate": "2025-11-25T10:00:00Z"
}
# Status: ONGOING (auto-set)

# Fetch trips - status auto-updates
GET /api/trips
# All trips have current status based on today's date
```

---

## 🧪 Complete Test Scenarios

### Scenario 1: Create Trip with Validation
```bash
# Invalid - endDate before startDate
curl -X POST http://localhost:3001/api/trips \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekend Getaway",
    "location": "Da Nang",
    "startDate": "2025-12-01",
    "endDate": "2025-11-30"
  }'
# Expected: 400 Bad Request - "End date must be after start date"

# Valid
curl -X POST http://localhost:3001/api/trips \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekend Getaway",
    "location": "Da Nang",
    "startDate": "2025-12-01",
    "endDate": "2025-12-05"
  }'
# Expected: 201 Created with status: UPCOMING
```

### Scenario 2: Add Expense with Split Evenly
```bash
# Step 1: Create trip
trip_id="..."

# Step 2: Add members
curl -X POST http://localhost:3001/api/trips/$trip_id/members \
  -d '{"name": "Alice", "email": "alice@example.com"}'

curl -X POST http://localhost:3001/api/trips/$trip_id/members \
  -d '{"name": "Bob", "email": "bob@example.com"}'

curl -X POST http://localhost:3001/api/trips/$trip_id/members \
  -d '{"name": "Charlie", "email": "charlie@example.com"}'

# Step 3: Add expense with auto-split
curl -X POST http://localhost:3001/api/trips/$trip_id/expenses \
  -d '{
    "payerId": "alice-member-id",
    "category": "FOOD",
    "amount": 150.50,
    "description": "Group dinner",
    "expenseDate": "2025-11-19T18:00:00Z",
    "splitEvenly": true
  }'

# Result:
# Alice: 50.18 (50.16 + 0.02 remainder)
# Bob: 50.16
# Charlie: 50.16
# Total: 150.50 ✅
```

### Scenario 3: Custom Splits with Validation
```bash
# Invalid - splits don't sum to total
curl -X POST http://localhost:3001/api/trips/$trip_id/expenses \
  -d '{
    "payerId": "alice-id",
    "category": "TRANSPORT",
    "amount": 100,
    "description": "Taxi",
    "expenseDate": "2025-11-19",
    "splits": [
      {"memberId": "alice-id", "amount": 50},
      {"memberId": "bob-id", "amount": 30}
    ]
  }'
# Expected: 400 - "Total split amounts must equal the expense amount"

# Valid - splits sum correctly
curl -X POST http://localhost:3001/api/trips/$trip_id/expenses \
  -d '{
    "payerId": "alice-id",
    "category": "TRANSPORT",
    "amount": 100,
    "description": "Taxi",
    "expenseDate": "2025-11-19",
    "splits": [
      {"memberId": "alice-id", "amount": 60},
      {"memberId": "bob-id", "amount": 40}
    ]
  }'
# Expected: 201 Created
```

---

## 📦 Utility Functions

### Split Calculator (`src/common/utils/split-calculator.ts`)

```typescript
import { calculateEvenSplits, calculatePercentageSplits } from './common/utils/split-calculator';

// Even splits
const members = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' }
];

const evenSplits = calculateEvenSplits(members, 100);
// [
//   { memberId: '1', amount: 33.34, percentage: 33.34 },
//   { memberId: '2', amount: 33.33, percentage: 33.33 },
//   { memberId: '3', amount: 33.33, percentage: 33.33 }
// ]

// Percentage splits
const percentageSplits = calculatePercentageSplits([
  { memberId: '1', percentage: 50 },
  { memberId: '2', percentage: 30 },
  { memberId: '3', percentage: 20 }
], 100);
```

---

## 🎯 Summary

### What's Fixed:

1. ✅ **Date Validation** - endDate must be after startDate
2. ✅ **Split Sum Validation** - splits must equal expense amount
3. ✅ **Member Validation** - payer and split members must belong to trip
4. ✅ **Auto Trip Status** - status updates based on current date
5. ✅ **Split Evenly** - automatic equal distribution
6. ✅ **Split Calculator Utility** - reusable split functions
7. ✅ **Global Validation Pipe** - already configured in main.ts

### API Changes:

**New Optional Field:**
```typescript
CreateExpenseDto {
  splitEvenly?: boolean  // NEW! Auto-split among all members
  splits?: ExpenseSplitDto[]  // Now optional if splitEvenly=true
}
```

### Business Logic:
- Trip status auto-calculates on create
- Trip status auto-updates when fetching or updating
- Splits validation on create/update
- Member ownership validation before expense operations
