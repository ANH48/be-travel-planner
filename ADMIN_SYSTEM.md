# Admin System - User Management

## 🔐 Admin Account

### Default Admin Credentials
```
Email: admin@travelplanner.com
Password: admin123
```
⚠️ **IMPORTANT**: Change this password after first login!

### Create Admin Account
```bash
npm run seed
```

---

## 📋 Features Implemented

### 1. **User Roles**
- `USER` - Regular user (default)
- `ADMIN` - Administrator with full access

### 2. **Admin Guard**
- Protects admin routes
- Validates JWT token
- Checks user role is ADMIN
- Located: `src/admin/guards/admin.guard.ts`

### 3. **Admin Endpoints**

#### Authentication
```bash
# Admin Login (Web UI)
GET /api/admin/login

# Admin Login (API)
POST /api/admin/login
{
  "email": "admin@travelplanner.com",
  "password": "admin123"
}

# Admin Dashboard
GET /api/admin/dashboard
# Protected by AdminGuard

# Logout
GET /api/admin/logout
```

#### User Management

**Get All Users** (with pagination)
```bash
GET /api/admin/users?page=1&limit=10

Response:
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "avatar": null,
      "role": "USER",
      "createdAt": "2025-11-19T...",
      "_count": {
        "trips": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Get User by ID**
```bash
GET /api/admin/users/:id

Response:
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "avatar": null,
  "role": "USER",
  "createdAt": "2025-11-19T...",
  "updatedAt": "2025-11-19T...",
  "trips": [
    {
      "id": "trip-uuid",
      "name": "Weekend Trip",
      "location": "Da Nang",
      "startDate": "2025-12-01",
      "endDate": "2025-12-05",
      "status": "UPCOMING"
    }
  ]
}
```

**Create User**
```bash
POST /api/admin/users
Content-Type: application/json
Authorization: Bearer {admin-token}

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "USER"  // or "ADMIN"
}

Response:
{
  "id": "uuid",
  "email": "newuser@example.com",
  "name": "New User",
  "avatar": null,
  "role": "USER",
  "createdAt": "2025-11-19T..."
}
```

**Update User**
```bash
PUT /api/admin/users/:id
Content-Type: application/json
Authorization: Bearer {admin-token}

{
  "name": "Updated Name",
  "email": "updated@example.com",
  "password": "newpassword123",  // optional
  "role": "ADMIN"  // optional
}

Response:
{
  "id": "uuid",
  "email": "updated@example.com",
  "name": "Updated Name",
  "avatar": null,
  "role": "ADMIN",
  "createdAt": "2025-11-19T...",
  "updatedAt": "2025-11-19T..."
}
```

**Delete User**
```bash
DELETE /api/admin/users/:id
Authorization: Bearer {admin-token}

Response:
{
  "message": "User deleted successfully"
}
```

#### Statistics

**Get Stats**
```bash
GET /api/admin/stats
Authorization: Bearer {admin-token}

Response:
{
  "totalUsers": 25,
  "totalTrips": 45,
  "totalExpenses": 230,
  "totalAmount": 15432.50,
  "adminCount": 2,
  "userCount": 23
}
```

**Get All Trips**
```bash
GET /api/admin/trips
Authorization: Bearer {admin-token}

Response:
{
  "trips": [
    {
      "id": "uuid",
      "name": "Trip Name",
      "location": "Location",
      "startDate": "2025-12-01",
      "endDate": "2025-12-05",
      "status": "UPCOMING",
      "owner": {
        "name": "Owner Name",
        "email": "owner@example.com"
      },
      "_count": {
        "members": 4,
        "expenses": 12
      }
    }
  ]
}
```

---

## 🔒 Security

### AdminGuard Implementation
```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
```

The `AdminGuard`:
1. Extracts JWT token from Authorization header or cookie
2. Verifies the token
3. Queries database to check user's role
4. Allows access only if role is 'ADMIN'
5. Throws `ForbiddenException` if unauthorized

### Token Storage
- Web UI: Cookie (httpOnly)
- API: Authorization header (Bearer token)

---

## 📱 Using the Admin Panel

### 1. Access Admin Login
```
http://localhost:3001/api/admin/login
```

### 2. Login with Admin Credentials
```
Email: admin@travelplanner.com
Password: admin123
```

### 3. View Dashboard
After login, you'll be redirected to:
```
http://localhost:3001/api/admin/dashboard
```

Dashboard shows:
- Total Users
- Total Trips
- Total Expenses
- Total Amount

### 4. Navigate
- Click "Users" to view all users
- Click "Trips" to view all trips
- Click "Logout" to sign out

---

## 🛠️ API Testing with cURL

### Login as Admin
```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@travelplanner.com",
    "password": "admin123"
  }' \
  -c cookies.txt

# Token saved in cookies.txt
```

### Get All Users
```bash
curl -X GET http://localhost:3001/api/admin/users?page=1&limit=10 \
  -b cookies.txt
```

### Create New User
```bash
curl -X POST http://localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "email": "testuser@example.com",
    "password": "test123",
    "name": "Test User",
    "role": "USER"
  }'
```

### Promote User to Admin
```bash
curl -X PUT http://localhost:3001/api/admin/users/{user-id} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "role": "ADMIN"
  }'
```

### Delete User
```bash
curl -X DELETE http://localhost:3001/api/admin/users/{user-id} \
  -b cookies.txt
```

---

## 🎯 Testing with Postman

### 1. Login
```
POST http://localhost:3001/api/admin/login
Body (JSON):
{
  "email": "admin@travelplanner.com",
  "password": "admin123"
}

Save the "token" from response
```

### 2. Set Authorization
In Postman:
- Go to Authorization tab
- Type: Bearer Token
- Token: {paste token from login}

### 3. Make Requests
Now you can call any admin endpoint:
- GET /api/admin/stats
- GET /api/admin/users
- POST /api/admin/users
- etc.

---

## 📂 File Structure

```
src/
├── admin/
│   ├── admin.controller.ts      # Admin endpoints + web UI
│   ├── admin.service.ts         # User management logic
│   ├── admin.module.ts
│   └── guards/
│       └── admin.guard.ts       # Role-based access control
├── auth/
│   ├── auth.service.ts          # Updated with role handling
│   └── ...
└── prisma/
    └── schema.prisma            # Updated with UserRole enum

prisma/
├── seed.ts                      # Create admin account
└── migrations/
    └── 20251119071233_add_user_role/  # Migration for roles
```

---

## ⚙️ Environment Variables

Add to `.env`:
```env
# Admin Settings (optional)
ADMIN_EMAIL=admin@travelplanner.com
ADMIN_PASSWORD=admin123

# JWT Settings
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
```

---

## 🚀 Quick Start

1. **Run migrations**
   ```bash
   npm run prisma:migrate
   ```

2. **Create admin account**
   ```bash
   npm run seed
   ```

3. **Start server**
   ```bash
   npm run start:dev
   ```

4. **Access admin panel**
   ```
   http://localhost:3001/api/admin/login
   ```

5. **Login**
   ```
   Email: admin@travelplanner.com
   Password: admin123
   ```

---

## 📝 Notes

- Admin accounts can manage all users
- Regular users cannot access admin routes
- Deleting a user will cascade delete their trips
- All admin endpoints require authentication
- Passwords are hashed with bcrypt (10 rounds)
- Tokens expire after 7 days (configurable)

---

## 🔐 Security Best Practices

1. ✅ Change default admin password immediately
2. ✅ Use strong passwords (min 8 characters, mixed case, numbers)
3. ✅ Rotate JWT secrets regularly
4. ✅ Use HTTPS in production
5. ✅ Implement rate limiting for admin endpoints
6. ✅ Log all admin actions
7. ✅ Enable 2FA for admin accounts (future enhancement)

---

**Last Updated:** November 19, 2025
