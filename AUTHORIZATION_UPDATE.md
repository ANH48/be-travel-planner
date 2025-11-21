# Authorization Update - Member Access to Trips

## 📋 Tổng Quan

Cập nhật lớn về authorization cho phép **members được add vào trip cũng có thể xem và tham gia quản lý trip** đó, không chỉ riêng user tạo trip.

**Ngày cập nhật:** November 19, 2025

---

## 🎯 Vấn Đề

Trước đây:
- ❌ Chỉ có user tạo trip (creator) mới xem được trip
- ❌ Members được add vào trip không thể access
- ❌ Members không thể thêm expenses, itinerary
- ❌ Không phù hợp với use case thực tế của group travel

---

## ✅ Giải Pháp Mới

### Authorization Matrix

| Operation | Trip Creator | Trip Member |
|-----------|-------------|-------------|
| **View trip details** | ✅ Yes | ✅ Yes |
| **View trip list** | ✅ Yes | ✅ Yes (shows as role: "member") |
| **Update trip info** | ✅ Yes | ❌ No |
| **Delete trip** | ✅ Yes | ❌ No |
| **View members** | ✅ Yes | ✅ Yes |
| **Add members** | ✅ Yes | ❌ No |
| **Update members** | ✅ Yes | ❌ No |
| **Delete members** | ✅ Yes | ❌ No |
| **View expenses** | ✅ Yes | ✅ Yes |
| **Add expenses** | ✅ Yes | ✅ Yes |
| **Update own expense** | ✅ Yes | ✅ Yes (own only) |
| **Update any expense** | ✅ Yes | ❌ No |
| **Delete own expense** | ✅ Yes | ✅ Yes (own only) |
| **Delete any expense** | ✅ Yes | ❌ No |
| **View itinerary** | ✅ Yes | ✅ Yes |
| **Add itinerary** | ✅ Yes | ✅ Yes |
| **Update own itinerary** | ✅ Yes | ✅ Yes (own only) |
| **Update any itinerary** | ✅ Yes | ❌ No |
| **Delete own itinerary** | ✅ Yes | ✅ Yes (own only) |
| **Delete any itinerary** | ✅ Yes | ❌ No |
| **View settlements** | ✅ Yes | ✅ Yes |

---

## 🔧 Backend Implementation Required

### 1. Trip Access Check Function

Backend cần tạo helper function:

```javascript
function canAccessTrip(userId, userEmail, trip) {
  // Check if user is creator
  if (trip.userId === userId) {
    return { canAccess: true, role: 'creator' };
  }
  
  // Check if user is member
  const isMember = trip.members.some(m => m.email === userEmail);
  if (isMember) {
    return { canAccess: true, role: 'member' };
  }
  
  return { canAccess: false, role: null };
}
```

### 2. Update GET /trips Endpoint

Trả về **tất cả trips** mà user có access:

```javascript
// Pseudo code
const trips = await prisma.trip.findMany({
  where: {
    OR: [
      { userId: currentUser.id },  // Trips created by user
      {
        members: {
          some: { email: currentUser.email }  // Trips user is member of
        }
      }
    ]
  },
  include: {
    members: true,
    _count: {
      select: { expenses: true, members: true }
    }
  }
});

// Add role to each trip
const tripsWithRole = trips.map(trip => ({
  ...trip,
  role: trip.userId === currentUser.id ? 'creator' : 'member'
}));
```

### 3. Update GET /trips/:id Endpoint

Check access trước khi trả về:

```javascript
const trip = await prisma.trip.findUnique({
  where: { id: tripId },
  include: { members: true }
});

const { canAccess, role } = canAccessTrip(currentUser.id, currentUser.email, trip);

if (!canAccess) {
  return res.status(403).json({ 
    message: "You don't have access to this trip" 
  });
}

return res.json({ ...trip, role });
```

### 4. Update Authorization Middleware

Tạo middleware cho từng operation:

```javascript
// Check if user can modify trip
async function canModifyTrip(req, res, next) {
  const trip = await getTripWithMembers(req.params.id);
  const { canAccess, role } = canAccessTrip(req.user.id, req.user.email, trip);
  
  if (!canAccess || role !== 'creator') {
    return res.status(403).json({ 
      message: "Only trip creator can modify trip details" 
    });
  }
  
  next();
}

// Check if user can add expenses/itinerary
async function canContributeToTrip(req, res, next) {
  const trip = await getTripWithMembers(req.params.tripId);
  const { canAccess } = canAccessTrip(req.user.id, req.user.email, trip);
  
  if (!canAccess) {
    return res.status(403).json({ 
      message: "You don't have access to this trip" 
    });
  }
  
  req.userRole = canAccess.role;
  next();
}
```

---

## 📊 Database Schema Requirements

### Expenses Table
Cần thêm field để track ai tạo expense:

```prisma
model Expense {
  id          String   @id @default(uuid())
  description String
  amount      Decimal
  date        DateTime
  category    String?
  paidById    String
  tripId      String
  createdById String?  // NEW: Track who created this expense
  createdBy   Member?  @relation("ExpenseCreatedBy", fields: [createdById], references: [id])
  paidBy      Member   @relation("ExpensePaidBy", fields: [paidById], references: [id])
  trip        Trip     @relation(fields: [tripId], references: [id])
  splits      ExpenseSplit[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Itinerary Table
Tương tự cho itinerary:

```prisma
model Itinerary {
  id          String   @id @default(uuid())
  tripId      String
  date        DateTime
  startTime   String
  endTime     String
  activity    String
  location    String?
  category    String?
  description String?
  createdById String?  // NEW: Track who created this item
  createdBy   Member?  @relation(fields: [createdById], references: [id])
  trip        Trip     @relation(fields: [tripId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 🔄 API Response Changes

### GET /trips Response

```json
[
  {
    "id": "trip_id",
    "name": "Summer Vacation",
    "location": "Bali",
    "userId": "creator_user_id",
    "role": "creator",  // NEW FIELD
    // ... other fields
  },
  {
    "id": "trip_id_2",
    "name": "Team Building",
    "location": "Da Nang",
    "userId": "other_user_id",
    "role": "member",  // NEW FIELD
    // ... other fields
  }
]
```

### Error Responses

Tất cả protected endpoints trả về 403 khi không có quyền:

```json
{
  "message": "Only trip creator can update trip details"
}
```

hoặc

```json
{
  "message": "You can only update expenses you created or if you are the trip creator"
}
```

---

## 🎨 Frontend Updates Needed

### 1. Update Dashboard Display

```typescript
// Show all trips with role indicator
{trips.map((trip: any) => (
  <div key={trip.id} className="trip-card">
    <h3>{trip.name}</h3>
    {trip.role === 'member' && (
      <Badge variant="secondary">Member</Badge>
    )}
    {trip.role === 'creator' && (
      <Badge variant="primary">Creator</Badge>
    )}
  </div>
))}
```

### 2. Conditional UI Based on Role

```typescript
// On trip detail page
const { data: trip } = useQuery(['trip', tripId], ...);
const isCreator = trip?.role === 'creator';

return (
  <div>
    {/* Always show */}
    <ViewExpenses />
    <ViewItinerary />
    
    {/* Creator only */}
    {isCreator && (
      <>
        <EditTripButton />
        <DeleteTripButton />
        <ManageMembersButton />
      </>
    )}
    
    {/* Both can do */}
    <AddExpenseButton />
    <AddItineraryButton />
  </div>
);
```

### 3. Update API Error Handling

```typescript
try {
  await expensesApi.update(id, data);
} catch (error) {
  if (error.response?.status === 403) {
    toast.error("You don't have permission to update this expense");
  }
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Member Access
1. User A creates trip "Bali 2025"
2. User A adds User B (user.b@email.com) as member
3. User B logs in
4. ✅ User B sees "Bali 2025" in dashboard with badge "Member"
5. ✅ User B can view trip details
6. ✅ User B can add expenses
7. ✅ User B can add itinerary
8. ❌ User B cannot edit trip name/location
9. ❌ User B cannot delete trip
10. ❌ User B cannot add new members

### Scenario 2: Creator Privileges
1. User A is trip creator
2. ✅ User A can do everything User B can do
3. ✅ User A can edit trip info
4. ✅ User A can delete trip
5. ✅ User A can add/edit/delete any member
6. ✅ User A can edit/delete any expense
7. ✅ User A can edit/delete any itinerary

### Scenario 3: Own Content Management
1. User B (member) adds expense "Taxi - 500k"
2. ✅ User B can edit their own expense
3. ✅ User B can delete their own expense
4. User C (member) tries to edit User B's expense
5. ❌ User C gets 403 error
6. User A (creator) tries to edit User B's expense
7. ✅ User A can edit it (creator privilege)

---

## 📝 Migration Steps

1. **Update Backend Schema**
   - Add `createdById` to Expense model
   - Add `createdById` to Itinerary model
   - Run migration

2. **Update Backend Authorization**
   - Implement `canAccessTrip()` helper
   - Update GET /trips to include member trips
   - Update GET /trips/:id with access check
   - Add role-based middleware
   - Add `role` field to responses

3. **Update Frontend**
   - Display role badges
   - Conditional UI based on role
   - Handle 403 errors gracefully
   - Update documentation

4. **Testing**
   - Test all scenarios above
   - Test edge cases
   - Load testing with many members

---

## 🚨 Important Notes

1. **Email Matching**: Backend MUST match `member.email === user.email` (case-insensitive)
2. **Role Field**: Always include `role` in trip responses for frontend logic
3. **Cascade Delete**: When trip is deleted, all related data should be deleted
4. **Member Removal**: Check if member has expenses/itinerary before allowing removal
5. **Performance**: Index `members.email` for faster queries

---

## 🔗 Related Files

- `API_REQUIREMENTS.md` - Full API specification with new auth rules
- Frontend pages will need updates based on role
- Backend controllers need authorization middleware

---

**Summary**: Members can now fully participate in trips they're added to, but only creators can modify trip structure and manage members. This creates a collaborative yet controlled environment for group travel planning.
