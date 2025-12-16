# Frontend-Backend Connection Guide
## Office of Seniors Application Architecture

---

## 📱 **Overview**

This document explains how the **Android Frontend** (Java/Kotlin) connects to the **Backend API** (Bun/Elysia/TypeScript).

---

## 🏗️ **Architecture Components**

### **Backend (API Server)**
- **Framework**: Elysia.js (Bun runtime)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **Port**: 8000 (configurable via `PORT` env variable)
- **Host**: `0.0.0.0` (accessible from network)

### **Frontend (Android App)**
- **Language**: Java
- **HTTP Client**: Retrofit 2
- **Architecture**: Activities + Adapters
- **Package**: `com.gov.officeseniors`

---

## 🔗 **Connection Configuration**

### **Backend Server Configuration**

**File**: `src/config/environment.ts`
```typescript
static readonly PORT = parseInt(process.env.PORT || '3000');
static readonly ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://10.0.2.2:3000',  // Android emulator
  'https://office-senrior-api.onrender.com'
];
```

**File**: `src/index.ts`
```typescript
.listen({
  port: Environment.PORT,
  hostname: '0.0.0.0'  // Allows external connections
})
```

### **Frontend API Configuration**

**File**: `RetrofitClient.java`
```java
// Local development - Android emulator to localhost
private static final String BASE_URL = "http://10.0.2.2:8000/";

// Production server (commented out by default)
// private static final String BASE_URL = "https://office-senrior-api.onrender.com/";
```

**Important**: `10.0.2.2` is the special IP address that Android emulator uses to access the host machine's `localhost`.

---

## 🔐 **Authentication Flow**

### **1. User Login Request**

#### Frontend (`LoginActivity.java`)
```java
// User enters username and password
LoginRequest loginRequest = new LoginRequest(username, password);

// API call via Retrofit
Call<AuthResponse> call = apiService.login(loginRequest);
call.enqueue(new Callback<AuthResponse>() {
    @Override
    public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
        if (response.isSuccessful() && response.body() != null) {
            AuthResponse authResponse = response.body();
            // Save auth data
            AuthHelper.saveAuthData(LoginActivity.this, authResponse.getData());
            // Navigate to appropriate dashboard
        }
    }
});
```

#### API Endpoint (`src/routes/auth.ts`)
```typescript
.post('/login', async ({ body, set }) => {
  const { username, password } = body as LoginRequest;
  
  // Find user
  const userWithPassword = await AuthService.findUserByUsername(username);
  
  // Verify password
  const isValidPassword = await AuthService.verifyPassword(password, userWithPassword.passwordHash);
  
  // Generate JWT token
  const jwtPayload = await AuthService.generateJWTPayload(user);
  const accessToken = jwt.sign(jwtPayload, Environment.JWT_SECRET);
  
  return {
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60 // 24 hours
    }
  };
})
```

### **2. Token Storage**

#### Frontend (`AuthHelper.java`)
```java
public static void saveAuthData(Context context, AuthData authData) {
    SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    editor.putString(KEY_ACCESS_TOKEN, authData.getAccessToken());
    editor.putString(KEY_REFRESH_TOKEN, authData.getRefreshToken());
    editor.putInt(KEY_USER_ID, authData.getUser().getId());
    editor.putString(KEY_USER_ROLE, authData.getUser().getRole());
    // ... other user data
    editor.apply();
}
```

### **3. Authenticated Requests**

#### Frontend (`AuthInterceptor.java`)
```java
@Override
public Response intercept(Chain chain) throws IOException {
    Request originalRequest = chain.request();
    
    // Get the auth token
    String token = AuthHelper.getAccessToken(context);
    
    // Add Authorization header to all requests
    if (token != null && !token.isEmpty()) {
        Request authenticatedRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer " + token)
            .build();
        return chain.proceed(authenticatedRequest);
    }
    
    return chain.proceed(originalRequest);
}
```

#### Backend (`src/middleware/auth.ts`)
```typescript
export const authMiddleware = new Elysia()
  .derive(({ headers }) => {
    const authHeader = headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null };
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      return {
        user: {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          seniorId: decoded.seniorId
        }
      };
    } catch (error) {
      return { user: null };
    }
  });
```

---

## 📡 **API Endpoints & Frontend Integration**

### **Example: Fetching User Profile**

#### Frontend API Interface (`ApiService.java`)
```java
@GET("api/profile")
Call<UserProfileResponse> getUserProfile();
```

#### Frontend Activity (`ProfileActivity.java`)
```java
apiService.getUserProfile().enqueue(new Callback<UserProfileResponse>() {
    @Override
    public void onResponse(Call<UserProfileResponse> call, Response<UserProfileResponse> response) {
        if (response.isSuccessful() && response.body() != null) {
            UserProfileResponse profileResponse = response.body();
            // Update UI with profile data
        }
    }
});
```

#### Backend Route (`src/routes/profile.ts`)
```typescript
.get('/', async ({ user, set }) => {
  if (!user) {
    set.status = 401;
    return { success: false, message: 'Unauthorized' };
  }
  
  const profile = await db.select().from(users).where(eq(users.id, user.userId));
  
  return {
    success: true,
    data: profile[0]
  };
}, { beforeHandle: authMiddleware })
```

---

## 📊 **Data Flow Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANDROID FRONTEND                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Activity   │─────▶│  ApiService  │─────▶│ RetrofitClient│  │
│  │ (UI Layer)   │      │ (Interface)  │      │  (HTTP Layer) │  │
│  └──────────────┘      └──────────────┘      └───────┬────────┘  │
│         ▲                                             │           │
│         │                                             ▼           │
│         │                               ┌──────────────────────┐ │
│         │                               │  AuthInterceptor     │ │
│         └───────────────────────────────│  (Adds JWT Token)    │ │
│                                         └──────────┬───────────┘ │
└────────────────────────────────────────────────────┼─────────────┘
                                                     │
                                        HTTP Request │ Bearer Token
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API (Elysia)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │  Middleware  │─────▶│    Routes    │─────▶│   Services   │  │
│  │ (Auth/CORS)  │      │ (Endpoints)  │      │  (Business)  │  │
│  └──────────────┘      └──────────────┘      └───────┬──────┘  │
│         │                                             │           │
│         │ JWT Verify                                  │           │
│         │                                             ▼           │
│         │                               ┌──────────────────────┐ │
│         │                               │  Database (Postgres) │ │
│         └───────────────────────────────│  via Drizzle ORM     │ │
│                                         └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗃️ **Database Schema (PostgreSQL)**

### **Key Tables**

#### `users` Table
```sql
- id (Primary Key)
- username (Unique)
- email
- passwordHash
- role (admin/staff/senior)
- firstName, lastName
- phone, address, dateOfBirth
- isActive
- profileCompleted
- approvalStatus (pending/approved/rejected)
- createdAt, updatedAt
```

#### `seniors` Table
```sql
- id (Primary Key)
- userId (Foreign Key -> users.id)
- notes (Admin notes)
- createdAt, updatedAt
```

#### `health_records` Table
```sql
- id (Primary Key)
- seniorId (Foreign Key -> users.id)
- type (medication/appointment/condition/etc)
- title, description
- dateTime, status
- [Type-specific fields...]
- createdAt
```

#### `assignments` Table
```sql
- id (Primary Key)
- staffId (Foreign Key -> users.id)
- seniorId (Foreign Key -> users.id)
- status (pending/active/completed)
- assignedBy, assignedAt
- completedAt
```

---

## 🔄 **Common Request/Response Patterns**

### **Authentication Response**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "role": "senior",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "approvalStatus": "approved",
      "hasAssignment": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
    "expiresIn": 86400
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

### **List Response (e.g., Seniors)**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 5,
      "username": "senior_user",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "555-1234",
      "approvalStatus": "approved",
      "isActive": true
    }
  ]
}
```

---

## 🛠️ **Key Frontend Classes**

### **RetrofitClient.java**
- Singleton pattern for Retrofit instance
- Configures base URL
- Adds logging interceptor
- Adds authentication interceptor
- Sets timeout configurations (60 seconds for slow server startup)

### **ApiService.java**
- Defines all API endpoints as interface methods
- Uses Retrofit annotations (@GET, @POST, @PUT, @DELETE, @PATCH)
- Returns `Call<ResponseType>` for asynchronous execution

### **AuthHelper.java**
- Manages authentication state in SharedPreferences
- Stores/retrieves JWT tokens
- Checks login status and token expiry
- Provides user data (ID, role, email, etc.)

### **AuthInterceptor.java**
- OkHttp interceptor
- Automatically adds `Authorization: Bearer <token>` header to all requests
- Retrieves token from AuthHelper

---

## 🔑 **Key Backend Files**

### **src/index.ts**
- Main server entry point
- Configures Elysia app
- Registers all route modules
- Sets up CORS and security middleware
- Starts server on specified port

### **src/routes/auth.ts**
- `/auth/register` - User registration
- `/auth/login` - User authentication
- `/auth/me` - Get current user info

### **src/middleware/auth.ts**
- JWT token verification
- Extracts user data from token
- Attaches user object to request context
- Returns null user if unauthorized

### **src/services/auth.ts**
- User creation and validation
- Password hashing (bcrypt)
- JWT payload generation
- Refresh token management

### **src/db/schema.ts**
- Defines database tables using Drizzle ORM
- Table relationships and constraints
- Field types and defaults

---

## 🚀 **Running the Application**

### **Backend**

1. **Environment Setup** (`.env` file)
```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
PORT=8000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://10.0.2.2:3000
```

2. **Start Server**
```bash
bun install
bun run dev  # Development with auto-reload
# or
bun run start  # Production
```

3. **Server runs at**: `http://0.0.0.0:8000`

### **Frontend**

1. **Update RetrofitClient.java** (if needed)
```java
private static final String BASE_URL = "http://10.0.2.2:8000/";  // Emulator
// or
private static final String BASE_URL = "http://YOUR_LOCAL_IP:8000/";  // Physical device
```

2. **Build and Run** in Android Studio
- Connect device or start emulator
- Click "Run" or press Shift+F10

---

## 🌐 **Network Configuration**

### **Android Emulator**
- Use `http://10.0.2.2:8000/` to access host's `localhost:8000`

### **Physical Android Device**
- Backend must run on `0.0.0.0` (not `localhost`)
- Use host machine's local IP (e.g., `http://192.168.1.100:8000/`)
- Ensure device and computer are on same network
- Update `BASE_URL` in `RetrofitClient.java`

### **Production**
- Deploy backend to cloud service (e.g., Render.com)
- Update `BASE_URL` to production URL
- Configure CORS to allow production domain

---

## 🔐 **Security Features**

### **Backend**
- JWT-based authentication
- Password hashing with bcrypt (12 rounds)
- CORS protection with allowed origins
- Rate limiting middleware
- Security headers
- SQL injection protection (Drizzle ORM parameterized queries)

### **Frontend**
- Secure token storage (SharedPreferences)
- Token expiry checking
- HTTPS support (production)
- Automatic token attachment to requests
- Input validation

---

## 📝 **API Endpoints Summary**

### **Authentication** (`/auth`)
- POST `/auth/register` - Register new user
- POST `/auth/login` - Login user
- GET `/auth/me` - Get current user

### **Profile** (`/api/profile`)
- GET `/api/profile` - Get user profile
- POST `/api/profile/complete` - Complete profile
- PUT `/api/profile` - Update profile

### **Seniors** (`/api/seniors`)
- GET `/api/seniors` - List all seniors
- GET `/api/seniors/:id` - Get senior details
- PUT `/api/seniors/:id` - Update senior
- POST `/api/seniors/:id/approve` - Approve senior
- POST `/api/seniors/:id/reject` - Reject senior

### **Staff** (`/api/staff`)
- GET `/api/staff` - List all staff
- POST `/api/staff` - Create staff member
- GET `/api/staff/:id` - Get staff details
- PUT `/api/staff/:id` - Update staff

### **Assignments** (`/api/assignments`)
- GET `/api/assignments` - List assignments
- POST `/api/assignments` - Create assignment
- GET `/api/assignments/my-seniors` - Get staff's assigned seniors
- PATCH `/api/assignments/:id/status` - Update assignment status

### **Health Records** (`/api/health-records`)
- GET `/api/health-records` - List health records
- POST `/api/health-records` - Create health record
- GET `/api/health-records/:id` - Get health record
- PUT `/api/health-records/:id` - Update health record
- DELETE `/api/health-records/:id` - Delete health record

### **Programs** (`/api/programs`)
- GET `/api/programs` - List programs
- POST `/api/programs` - Create program
- GET `/api/programs/with-status` - Programs with enrollment status

### **Benefits** (`/api/benefits`)
- GET `/api/benefits` - List benefits
- POST `/api/benefits` - Create benefit
- GET `/api/core-benefits` - Core benefits catalog

### **Appointments** (`/api/appointments`)
- GET `/api/appointments` - List appointments
- POST `/api/appointments` - Create appointment
- PATCH `/api/appointments/:id/status` - Update appointment status

### **Reports** (`/api/reports`)
- GET `/api/reports` - Generate reports

---

## 🧪 **Testing the Connection**

### **1. Check Backend Health**
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **2. Test Authentication**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user","password":"password123"}'
```

### **3. Test Authenticated Endpoint**
```bash
curl http://localhost:8000/api/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### **4. Frontend Test**
- Run the app
- Try to login
- Check Logcat for network requests/responses
- Look for `RetrofitClient`, `AuthInterceptor`, and `LoginActivity` logs

---

## 🐛 **Common Issues & Solutions**

### **Issue: "Unable to connect to server"**
**Solutions**:
- ✅ Ensure backend is running (`bun run dev`)
- ✅ Check `BASE_URL` is correct (`10.0.2.2` for emulator)
- ✅ Backend must listen on `0.0.0.0`, not `localhost`
- ✅ Check firewall settings
- ✅ For physical device, use local IP address

### **Issue: "CORS error"**
**Solutions**:
- ✅ Add Android device/emulator origin to `ALLOWED_ORIGINS` in `.env`
- ✅ Check CORS middleware is properly configured

### **Issue: "401 Unauthorized"**
**Solutions**:
- ✅ Check token is being sent in Authorization header
- ✅ Verify JWT_SECRET matches between frontend and backend
- ✅ Check token hasn't expired
- ✅ Ensure AuthInterceptor is properly configured

### **Issue: "Slow response or timeout"**
**Solutions**:
- ✅ Increase timeout in RetrofitClient (currently 60 seconds)
- ✅ Check database connection
- ✅ Optimize database queries
- ✅ For Render.com free tier, expect cold start delays

---

## 📚 **Additional Resources**

- **Elysia.js Docs**: https://elysiajs.com/
- **Retrofit Docs**: https://square.github.io/retrofit/
- **Drizzle ORM Docs**: https://orm.drizzle.team/
- **JWT.io**: https://jwt.io/ (for debugging tokens)

---

## 🎯 **Key Takeaways**

1. **Backend** runs on port 8000, accessible at `http://0.0.0.0:8000`
2. **Frontend** uses Retrofit with base URL `http://10.0.2.2:8000/` (emulator)
3. **Authentication** uses JWT tokens stored in SharedPreferences
4. **All authenticated requests** automatically include `Authorization: Bearer <token>` header
5. **AuthInterceptor** handles token attachment transparently
6. **Database** is PostgreSQL accessed via Drizzle ORM
7. **CORS** is configured to allow Android emulator/device origins

---

*Last Updated: 2024*
