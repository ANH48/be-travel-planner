# Travel Expense Planner - API Requirements for Backend

## Overview
This document outlines all API endpoints required by the Frontend application. All endpoints should return JSON responses and use JWT authentication where specified.

**Base URL:** `http://localhost:3001/api`

---

## 📋 Table of Contents
1. [Authentication APIs](#authentication-apis)
2. [Trips APIs](#trips-apis)
3. [Members APIs](#members-apis)
   - Search Member by Email
4. [Expenses APIs](#expenses-apis)
5. [Itinerary APIs](#itinerary-apis)
6. [Settlements APIs](#settlements-apis)
7. [Common Response Formats](#common-response-formats)

---

## 🔐 Authentication APIs

### 1. Register User
**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-11-19T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

**Error Response (400):**
```json
{
  "message": "Email already exists"
}
```

---

### 2. Login User
**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
```

**Error Response (401):**
```json
{
  "message": "Invalid credentials"
}
```

---

### 3. Get Current User
**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2025-11-19T00:00:00.000Z"
}
```

---

## 🗺️ Trips APIs

### 1. Get All Trips
**Endpoint:** `GET /trips`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters (Optional):**
- `status` - Filter by status (UPCOMING, ONGOING, COMPLETED)

**Description:**
Returns all trips where the user is either:
- The creator (trip.userId === user.id)
- A member (member.email === user.email)

**Success Response (200):**
```json
[
  {
    "id": "trip_id",
    "name": "Summer Vacation in Bali",
    "location": "Bali, Indonesia",
    "startDate": "2025-12-01T00:00:00.000Z",
    "endDate": "2025-12-10T00:00:00.000Z",
    "description": "Family trip to Bali",
    "status": "UPCOMING",
    "userId": "user_id",
    "role": "creator",
    "createdAt": "2025-11-19T00:00:00.000Z",
    "updatedAt": "2025-11-19T00:00:00.000Z",
    "_count": {
      "members": 4,
      "expenses": 12
    }
  },
  {
    "id": "trip_id_2",
    "name": "Team Building Da Nang",
    "location": "Da Nang, Vietnam",
    "startDate": "2025-11-25T00:00:00.000Z",
    "endDate": "2025-11-28T00:00:00.000Z",
    "description": "Company team building",
    "status": "UPCOMING",
    "userId": "other_user_id",
    "role": "member",
    "createdAt": "2025-11-15T00:00:00.000Z",
    "updatedAt": "2025-11-15T00:00:00.000Z",
    "_count": {
      "members": 10,
      "expenses": 5
    }
  }
]
```

**Note:** 
- `role` field indicates user's role: `"creator"` or `"member"`
- Backend should query both:
  1. Trips created by user: `WHERE userId = currentUser.id`
  2. Trips where user is member: `JOIN members ON trips.id = members.tripId WHERE members.email = currentUser.email`

---

### 2. Get Single Trip
**Endpoint:** `GET /trips/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
User must be either the trip creator OR a member with matching email.

**Success Response (200):**
```json
{
  "id": "trip_id",
  "name": "Summer Vacation in Bali",
  "location": "Bali, Indonesia",
  "startDate": "2025-12-01T00:00:00.000Z",
  "endDate": "2025-12-10T00:00:00.000Z",
  "description": "Family trip to Bali",
  "status": "UPCOMING",
  "userId": "user_id",
  "role": "creator",
  "createdAt": "2025-11-19T00:00:00.000Z",
  "updatedAt": "2025-11-19T00:00:00.000Z",
  "_count": {
    "members": 4,
    "expenses": 12
  }
}
```

**Error Response (403):**
```json
{
  "message": "You don't have access to this trip"
}
```

**Error Response (404):**
```json
{
  "message": "Trip not found"
}
```

---

### 3. Create Trip
**Endpoint:** `POST /trips`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Summer Vacation in Bali",
  "location": "Bali, Indonesia",
  "startDate": "2025-12-01",
  "endDate": "2025-12-10",
  "description": "Family trip to Bali (optional)"
}
```

**Success Response (201):**
```json
{
  "id": "trip_id",
  "name": "Summer Vacation in Bali",
  "location": "Bali, Indonesia",
  "startDate": "2025-12-01T00:00:00.000Z",
  "endDate": "2025-12-10T00:00:00.000Z",
  "description": "Family trip to Bali",
  "status": "UPCOMING",
  "userId": "user_id",
  "createdAt": "2025-11-19T00:00:00.000Z",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

**⚠️ IMPORTANT Backend Implementation:**
When creating a trip, the backend MUST automatically:
1. Create the trip record with userId = current logged-in user
2. **Automatically create a member record** with:
   - name = current user's name
   - email = current user's email
   - tripId = newly created trip ID

This ensures the trip creator is also a member and can be included in expense splits.

---

### 4. Update Trip
**Endpoint:** `PUT /trips/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only the trip creator (userId === user.id) can update trip details.
Members cannot update trip information.

**Request Body:**
```json
{
  "name": "Updated Trip Name",
  "location": "New Location",
  "startDate": "2025-12-01",
  "endDate": "2025-12-10",
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "id": "trip_id",
  "name": "Updated Trip Name",
  "location": "New Location",
  "startDate": "2025-12-01T00:00:00.000Z",
  "endDate": "2025-12-10T00:00:00.000Z",
  "description": "Updated description",
  "status": "UPCOMING",
  "userId": "user_id",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

**Error Response (403):**
```json
{
  "message": "Only trip creator can update trip details"
}
```

---

### 5. Delete Trip
**Endpoint:** `DELETE /trips/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only the trip creator (userId === user.id) can delete the trip.
Members cannot delete trips.

**Success Response (200):**
```json
{
  "message": "Trip deleted successfully"
}
```

**Error Response (403):**
```json
{
  "message": "Only trip creator can delete the trip"
}
```

---

## 👥 Members APIs

### 1. Get All Members for a Trip
**Endpoint:** `GET /trips/:tripId/members`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Trip creator OR trip members can view member list.

**Success Response (200):**
```json
[
  {
    "id": "member_id",
    "name": "Alice Smith",
    "email": "alice@example.com",
    "tripId": "trip_id",
    "createdAt": "2025-11-19T00:00:00.000Z",
    "updatedAt": "2025-11-19T00:00:00.000Z"
  }
]
```

---

### 2. Search Member by Email
**Endpoint:** `GET /members/search?email={email}`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "id": "member_id",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "trips": [
    {
      "id": "trip_id",
      "name": "Summer Vacation 2025",
      "location": "Da Nang",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-06-07T00:00:00.000Z",
      "memberCount": 4,
      "totalPaid": "5000000",
      "totalOwed": "3750000"
    }
  ]
}
```

**Note:** Returns member info and all trips they've participated in with financial summary.

---

### 3. Create Member
**Endpoint:** `POST /trips/:tripId/members`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only trip creator can add members. Trip members cannot add new members.

**Request Body:**
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com"
}
```

**Success Response (201):**
```json
{
  "id": "member_id",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "tripId": "trip_id",
  "createdAt": "2025-11-19T00:00:00.000Z",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "message": "Member with this email already exists in this trip"
}
```

**Error Response (403):**
```json
{
  "message": "Only trip creator can add members"
}
```

---

### 3. Update Member
**Endpoint:** `PUT /trips/:tripId/members/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only trip creator can update members.

**Request Body:**
```json
{
  "name": "Alice Johnson",
  "email": "alice.j@example.com"
}
```

**Success Response (200):**
```json
{
  "id": "member_id",
  "name": "Alice Johnson",
  "email": "alice.j@example.com",
  "tripId": "trip_id",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

**Error Response (403):**
```json
{
  "message": "Only trip creator can update members"
}
```

---

### 4. Delete Member
**Endpoint:** `DELETE /trips/:tripId/members/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only trip creator can delete members.

**Success Response (200):**
```json
{
  "message": "Member deleted successfully"
}
```

**Error Response (403):**
```json
{
  "message": "Only trip creator can delete members"
}
```
```

---

## 💰 Expenses APIs

### 1. Get All Expenses for a Trip
**Endpoint:** `GET /trips/:tripId/expenses`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Trip creator OR trip members can view expenses.

**Success Response (200):**
```json
[
  {
    "id": "expense_id",
    "description": "Hotel Booking",
    "amount": "6250000",
    "date": "2025-12-01T00:00:00.000Z",
    "category": "Accommodation",
    "paidById": "member_id",
    "tripId": "trip_id",
    "createdAt": "2025-11-19T00:00:00.000Z",
    "updatedAt": "2025-11-19T00:00:00.000Z",
    "paidBy": {
      "id": "member_id",
      "name": "Alice Smith",
      "email": "alice@example.com"
    }
  }
]
```

---

### 2. Get Single Expense
**Endpoint:** `GET /expenses/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "id": "expense_id",
  "description": "Hotel Booking",
  "amount": "6250000",
  "date": "2025-12-01T00:00:00.000Z",
  "category": "Accommodation",
  "paidById": "member_id",
  "tripId": "trip_id",
  "createdAt": "2025-11-19T00:00:00.000Z",
  "paidBy": {
    "id": "member_id",
    "name": "Alice Smith",
    "email": "alice@example.com"
  },
  "splits": [
    {
      "id": "split_id",
      "memberId": "member_id",
      "amount": "1562500",
      "member": {
        "name": "Alice Smith"
      }
    }
  ]
}
```

---

### 3. Create Expense
**Endpoint:** `POST /trips/:tripId/expenses`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Trip creator AND trip members can add expenses.

**Request Body (Equal Split):**
```json
{
  "description": "Hotel Booking",
  "amount": 6250000,
  "date": "2025-12-01",
  "category": "Accommodation",
  "paidById": "member_id",
  "splitType": "equal"
}
```

**Request Body (Custom Split):**
```json
{
  "description": "Taxi Ride",
  "amount": 500000,
  "date": "2025-12-01",
  "category": "Transportation",
  "paidById": "member_id_1",
  "splitType": "custom",
  "splits": [
    {
      "memberId": "member_id_1",
      "amount": 250000
    },
    {
      "memberId": "member_id_2",
      "amount": 250000
    },
    {
      "memberId": "member_id_3",
      "amount": 0
    }
  ]
}
```

**Success Response (201):**
```json
{
  "id": "expense_id",
  "description": "Hotel Booking",
  "amount": "6250000",
  "date": "2025-12-01T00:00:00.000Z",
  "category": "Accommodation",
  "paidById": "member_id",
  "tripId": "trip_id",
  "splitType": "equal",
  "createdAt": "2025-11-19T00:00:00.000Z"
}
```

**Validation Rules:**
- `splitType`: "equal" or "custom" (default: "equal")
- If `splitType` is "equal": Backend creates splits automatically with `amount / memberCount` for each member
- If `splitType` is "custom": `splits` array is required
  - Sum of all split amounts must equal total expense amount
  - All trip members must be included in splits array (can be 0 for members not using the service)
  - Example: Taxi 500k, A uses (250k), B uses (250k), C doesn't use (0k)

**Note:** Custom split allows flexibility when some members don't use a service.

---

### 4. Update Expense
**Endpoint:** `PUT /expenses/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only trip creator can update any expense OR the member who created the expense can update their own.

**Request Body:**
```json
{
  "description": "Updated Hotel Booking",
  "amount": 7500000,
  "date": "2025-12-01",
  "category": "Accommodation",
  "paidById": "member_id"
}
```

**Success Response (200):**
```json
{
  "id": "expense_id",
  "description": "Updated Hotel Booking",
  "amount": "7500000",
  "date": "2025-12-01T00:00:00.000Z",
  "category": "Accommodation",
  "paidById": "member_id",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

**Error Response (403):**
```json
{
  "message": "You can only update expenses you created or if you are the trip creator"
}
```

---

### 5. Delete Expense
**Endpoint:** `DELETE /expenses/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only trip creator can delete any expense OR the member who created the expense can delete their own.

**Success Response (200):**
```json
{
  "message": "Expense deleted successfully"
}
```

**Error Response (403):**
```json
{
  "message": "You can only delete expenses you created or if you are the trip creator"
}
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "message": "Expense deleted successfully"
}
```

---

## �️ Itinerary APIs

### 1. Get All Itinerary Items for a Trip
**Endpoint:** `GET /trips/:tripId/itinerary`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Trip creator OR trip members can view itinerary.

**Success Response (200):**
```json
[
  {
    "id": "itinerary_id",
    "tripId": "trip_id",
    "date": "2025-12-01T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "12:00",
    "activity": "Morning City Tour",
    "location": "Downtown Area",
    "category": "Sightseeing",
    "description": "Explore the historic downtown area and visit major landmarks.",
    "createdAt": "2025-11-19T00:00:00.000Z",
    "updatedAt": "2025-11-19T00:00:00.000Z"
  }
]
```

**Note:** Return items sorted by date and startTime (chronological order)

---

### 2. Get Single Itinerary Item
**Endpoint:** `GET /itinerary/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "id": "itinerary_id",
  "tripId": "trip_id",
  "date": "2025-12-01T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "12:00",
  "activity": "Morning City Tour",
  "location": "Downtown Area",
  "category": "Sightseeing",
  "description": "Explore the historic downtown area and visit major landmarks.",
  "createdAt": "2025-11-19T00:00:00.000Z",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

---

### 3. Create Itinerary Item
**Endpoint:** `POST /trips/:tripId/itinerary`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Trip creator AND trip members can add itinerary items.

**Request Body:**
```json
{
  "date": "2025-12-01",
  "startTime": "09:00",
  "endTime": "12:00",
  "activity": "Morning City Tour",
  "location": "Downtown Area",
  "category": "Sightseeing",
  "description": "Explore the historic downtown area and visit major landmarks."
}
```

**Success Response (201):**
```json
{
  "id": "itinerary_id",
  "tripId": "trip_id",
  "date": "2025-12-01T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "12:00",
  "activity": "Morning City Tour",
  "location": "Downtown Area",
  "category": "Sightseeing",
  "description": "Explore the historic downtown area and visit major landmarks.",
  "createdAt": "2025-11-19T00:00:00.000Z",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

**Validation:**
- Date must be within trip start and end dates
- StartTime must be before endTime
- Activity is required

---

### 4. Update Itinerary Item
**Endpoint:** `PUT /itinerary/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only trip creator can update any itinerary item OR the member who created it can update their own.

**Request Body:**
```json
{
  "date": "2025-12-01",
  "startTime": "10:00",
  "endTime": "13:00",
  "activity": "Updated City Tour",
  "location": "Historic District",
  "category": "Sightseeing",
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "id": "itinerary_id",
  "tripId": "trip_id",
  "date": "2025-12-01T00:00:00.000Z",
  "startTime": "10:00",
  "endTime": "13:00",
  "activity": "Updated City Tour",
  "location": "Historic District",
  "category": "Sightseeing",
  "description": "Updated description",
  "updatedAt": "2025-11-19T00:00:00.000Z"
}
```

**Error Response (403):**
```json
{
  "message": "You can only update itinerary items you created or if you are the trip creator"
}
```

---

### 5. Delete Itinerary Item
**Endpoint:** `DELETE /itinerary/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Only trip creator can delete any itinerary item OR the member who created it can delete their own.

**Success Response (200):**
```json
{
  "message": "Itinerary item deleted successfully"
}
```

**Error Response (403):**
```json
{
  "message": "You can only delete itinerary items you created or if you are the trip creator"
}
```

**Success Response (200):**
```json
{
  "message": "Itinerary item deleted successfully"
}
```

---

## �📊 Settlements APIs

### 1. Calculate Settlements
**Endpoint:** `GET /trips/:tripId/settlements`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Trip creator OR trip members can view settlements.

**Success Response (200):**
```json
[
  {
    "from": "Bob Johnson",
    "to": "Alice Smith",
    "amount": "125.25"
  },
  {
    "from": "Charlie Brown",
    "to": "Alice Smith",
    "amount": "75.50"
  }
]
```

**Description:**
- Calculate who owes whom based on all expenses
- Use debt simplification algorithm (minimize number of transactions)
- Return array of payment instructions

---

### 2. Get Settlement Report
**Endpoint:** `GET /trips/:tripId/settlements/report`

**Headers:**
```
Authorization: Bearer {token}
```

**Authorization:**
Trip creator OR trip members can view settlement report.

**Success Response (200):**
```json
{
  "totalExpenses": "31250000",
  "memberBalances": [
    {
      "memberId": "member_id_1",
      "name": "Alice Smith",
      "totalPaid": "12500000",
      "totalOwed": "7812500",
      "balance": "4687500"
    },
    {
      "memberId": "member_id_2",
      "name": "Bob Johnson",
      "totalPaid": "5000000",
      "totalOwed": "7812500",
      "balance": "-2812500"
    }
  ],
  "settlements": [
    {
      "from": "Bob Johnson",
      "to": "Alice Smith",
      "amount": "2812500"
    }
  ]
}
```

---

## 🔄 Common Response Formats

### Success Response Structure
All successful responses should follow this general structure:
```json
{
  "data": {},  // or []
  "message": "Optional success message"
}
```

### Error Response Structure
All error responses should follow this structure:
```json
{
  "message": "Human-readable error message",
  "errors": [  // Optional - for validation errors
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 🔒 Authentication & Authorization

### JWT Token
- All protected endpoints require JWT token in Authorization header
- Format: `Authorization: Bearer {token}`
- Token should include user ID and email
- Token expiration: 7 days (recommended)

### Authorization Rules

**IMPORTANT UPDATES:**

#### Trip Access Authorization
1. **View Access**: Users can access trips if:
   - They created the trip (trip.userId === user.id), OR
   - They are a member of the trip (member.email === user.email)
   
2. **Modify Access**: Users can modify trips only if:
   - They created the trip (trip.userId === user.id)
   
3. **Member Operations**: 
   - Trip creator can add/update/delete members
   - Trip members can view member list but cannot modify
   
4. **Expense Operations**:
   - Trip creator and members can add expenses
   - Users can only modify/delete expenses they created
   
5. **Itinerary Operations**:
   - Trip creator and members can add itinerary items
   - Users can only modify/delete itinerary items they created
   
6. **Settlement Access**:
   - Trip creator and all members can view settlements

#### Implementation Notes
- Backend must check if logged-in user's email matches any member email in the trip
- Use a helper function to verify trip access: `canAccessTrip(userId, userEmail, trip)`
- Response should include user's role in trip: `creator` or `member`

---

## 📝 Data Validation Requirements

### Trip
- `name`: Required, min 3 characters
- `location`: Required, min 2 characters
- `startDate`: Required, valid date
- `endDate`: Required, valid date, must be >= startDate
- `description`: Optional, max 500 characters

### Member
- `name`: Required, min 2 characters
- `email`: Required, valid email format
- Unique email per trip (same email can exist in different trips)

### Expense
- `description`: Required, min 3 characters
- `amount`: Required, positive integer (VNĐ), no decimal places
- `date`: Required, valid date
- `paidById`: Required, must be valid member ID from the trip
- `category`: Optional, string

---

## 🎯 Trip Status Logic

Trip status should be automatically calculated based on dates:
- **UPCOMING**: Current date < startDate
- **ONGOING**: startDate <= Current date <= endDate
- **COMPLETED**: Current date > endDate

---

## 💡 Settlement Calculation Algorithm

The settlement calculation should:
1. Calculate total amount each member paid
2. Calculate total amount each member owes (sum of their splits from all expenses)
3. Calculate balance for each member (paid - owed)
4. Use debt simplification algorithm to minimize number of transactions
5. Return simplified payment instructions

**Example 1: Equal Split**
Trip with 3 members, expenses split equally:
- Alice paid 12,500,000 VNĐ, owes 6,250,000 VNĐ → Balance: +6,250,000 VNĐ
- Bob paid 2,500,000 VNĐ, owes 6,250,000 VNĐ → Balance: -3,750,000 VNĐ
- Charlie paid 3,750,000 VNĐ, owes 6,250,000 VNĐ → Balance: -2,500,000 VNĐ

Result:
- Bob pays Alice 3,750,000 VNĐ
- Charlie pays Alice 2,500,000 VNĐ

**Example 2: Custom Split**
Trip with 3 members, mixed split types:

Expense 1 - Taxi 500,000 VNĐ (Custom split):
- Alice paid 500,000 VNĐ, uses 250,000 VNĐ
- Bob uses 250,000 VNĐ
- Charlie uses 0 VNĐ (didn't take taxi)

Expense 2 - Dinner 3,000,000 VNĐ (Equal split):
- Bob paid 3,000,000 VNĐ, each owes 1,000,000 VNĐ

Member balances:
- Alice: Paid 500,000, Owes (250,000 + 1,000,000) = 1,250,000 → Balance: -750,000 VNĐ
- Bob: Paid 3,000,000, Owes (250,000 + 1,000,000) = 1,250,000 → Balance: +1,750,000 VNĐ
- Charlie: Paid 0, Owes (0 + 1,000,000) = 1,000,000 → Balance: -1,000,000 VNĐ

Result:
- Alice pays Bob 750,000 VNĐ
- Charlie pays Bob 1,000,000 VNĐ

---

## 🚀 API Performance Requirements

- Response time: < 500ms for most endpoints
- Settlement calculation: < 2s for trips with up to 50 members
- Database queries should be optimized with proper indexes
- Use pagination for list endpoints if needed (future enhancement)

---

## 📦 Additional Notes

### CORS Configuration
Backend should allow requests from:
- `http://localhost:3000` (development)
- Production frontend URL (when deployed)

### Date Format
- Accept: ISO 8601 format (`YYYY-MM-DD` or full ISO string)
- Return: ISO 8601 format with timezone (`2025-11-19T00:00:00.000Z`)

### Decimal Precision
- All monetary amounts should be stored as integers (VNĐ, no decimal places)
- Return as strings to avoid floating-point precision issues
- Currency: Vietnamese Dong (VNĐ)

### Error Codes
- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

---

## 📞 Contact & Support

For questions or clarifications about these API requirements, please contact the Frontend team.

**Last Updated:** November 19, 2025
