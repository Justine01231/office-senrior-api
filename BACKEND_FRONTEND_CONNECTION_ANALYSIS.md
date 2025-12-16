# Backend-Frontend Connection Analysis

## Overview
The Office of Seniors system uses a client-server architecture with:
- **Backend**: Elysia (TypeScript-based HTTP framework) running on port 3000 (configured via PORT env var)
- **Frontend**: Android native app (Java/Kotlin) using Retrofit 2 for HTTP communication
- **Connection**: HTTP REST API with JWT authentication

---

## Frontend HTTP Client Setup (Android)

### 1. **RetrofitClient.java** - HTTP Client Configuration
**Location**: `com.gov.officeseniors.remote.RetrofitClient`

**Key Configuration**:
```
Base URL: http://10.0.2.2:8000/  (Android emulator -> localhost)
          Production: https://office-senrior-api.onrender.com/
```

**OkHttpClient Configuration**:
- **Interceptor Chain**:
  1. **AuthInterceptor** (added FIRST) - Injects JWT tokens into all requests
  2. **HttpLoggingInterceptor** (added SECOND) - Logs request/response bodies for debugging
- **Timeouts**: 60 seconds for all operations (connect, read, write)
  - Increased timeout because Render.com free tier can be slow
- **JSON Serialization**: Gson with default settings (excludes null values)

**Retrofit Instance**:
```java
- Singleton pattern with synchronized getInstance(Context)
- Uses GsonConverterFactory for automatic JSON serialization/deserialization
- Can create service instances dynamically via create(Class<T>)
```

### 2. **AuthInterceptor.java** - Authentication
**Location**: `com.gov.officeseniors.utils.AuthInterceptor`

**How It Works**:
```
1. Intercepts all HTTP requests before sending
2. Gets access token from SharedPreferences via AuthHelper.getAccessToken()
3. If token exists, adds header: Authorization: Bearer {token}
4. If no token, proceeds with original request (for public endpoints)
```

**Request Flow**:
```
Original Request → Check for Token → Add Auth Header → Proceed
```

### 3. **ApiService.java** - API Endpoint Definitions
**Location**: `com.gov.officeseniors.remote.ApiService`

**Architecture**:
- Retrofit service interface defining all API endpoints
- Method annotations map to HTTP verbs: @GET, @POST, @PUT, @DELETE, @PATCH
- Automatic request body serialization and response deserialization

**Endpoint Categories** (658 lines total):

| Category | Count | Examples |
|----------|-------|----------|
| **Authentication** | 3 | POST /auth/login, /auth/register, GET /auth/me |
| **Profile** | 4 | GET/PUT /api/profile, POST /api/profile/complete |
| **Staff** | 6 | POST /staff/create, GET /staff/list, /api/staff/dashboard |
| **Health Records** | 5 | POST/GET/PUT/DELETE /api/health |
| **Admin** | 7 | GET /api/admin/seniors, POST /api/admin/approve-senior/{id} |
| **Assignments** | 4 | POST /api/assignments/assign, GET /api/assignments/list |
| **Appointments** | 5 | GET/POST /api/appointments, PUT /api/appointments/{id}/status |
| **Reports** | 1 | GET /api/reports |
| **Programs** | 4 | GET /api/programs, POST /api/program-applications |
| **Reschedule** | 3 | POST /api/reschedule-requests, /approve, /reject |
| **Notifications** | 5 | GET/PUT/DELETE /api/notifications |
| **Financial** | 7 | GET/POST /api/financial-assistance, /claim, /stats |

---

## Backend API Structure (Elysia)

### 1. **Main Server** (`src/index.ts`)
**Key Features**:
```typescript
- CORS enabled for all origins (configurable)
- Security middleware for headers and request validation
- Rate limiting middleware (general + auth-specific)
- Swagger documentation at /swagger
- Route logging: 📡 {METHOD} {PATH}
```

**Middleware Stack** (in order):
1. CORS middleware
2. Security middleware (headers, content-type validation)
3. General rate limiting
4. Request logging
5. Swagger documentation
6. Route handlers

**Response Format**:
```json
{
  "success": boolean,
  "message": string,
  "data": object (optional),
  "expiresIn": number (optional, for auth)
}
```

### 2. **Security Middleware** (`src/middleware/security.ts`)
**Security Headers**:
```
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- HSTS (production only)
```

**Validation**:
- Max request size: 10MB
- Content-Type enforcement for POST/PUT/PATCH
- Security header injection

### 3. **Authentication Flow** (`src/routes/auth.ts`)

**Registration**:
```
POST /auth/register
Body: { username, email, password, firstName, lastName, role }
Response: {
  success: true,
  data: {
    user: {...},
    accessToken: JWT,
    refreshToken: UUID,
    expiresIn: 86400 (24 hours in seconds)
  }
}
```

**Login**:
```
POST /auth/login
Body: { username, password }
Response: Same as registration
```

**JWT Structure**:
- Payload includes: userId, username, email, role
- Secret: Environment.JWT_SECRET
- Expiration: 24 hours

**Token Storage (Android)**:
- Stored in SharedPreferences via AuthHelper
- Automatically injected by AuthInterceptor
- Refresh token stored separately for token refresh

### 4. **Route Organization**
```
/auth              → Authentication (login, register, token refresh)
/api/profile       → User profile management
/staff             → Staff CRUD operations
/api/staff/*       → Staff-specific features (dashboard, tasks)
/api/seniors/*     → Senior management
/api/assignments/* → Staff-senior assignments
/api/appointments/* → Appointment scheduling
/api/health/*      → Health records
/api/programs/*    → Programs and applications
/api/notifications/* → Notification system
/api/financial-assistance/* → Financial assistance tracking
/api/reschedule-requests/* → Appointment rescheduling
/api/reports       → Analytics and reporting
```

---

## Request-Response Flow

### 1. **Authenticated Request** (Frontend → Backend)
```
1. Android App wants to make authenticated request
2. ApiService method called (e.g., getHealthRecords())
3. RetrofitClient creates Retrofit service instance
4. AuthInterceptor intercepts request
   - Gets token from SharedPreferences
   - Adds: Authorization: Bearer {token}
5. Retrofit serializes request body to JSON
6. OkHttpClient sends with 60-second timeout
7. Backend receives request with Authorization header
8. Security middleware validates Content-Type
9. Route handler processes request
10. Backend returns: { success, message, data }
11. Retrofit deserializes JSON to response object
12. Android app receives typed response object
```

### 2. **Error Handling**

**Frontend** (Android):
- Retrofit wraps responses in Call objects
- Success callbacks receive parsed response
- Failure callbacks handle network errors
- HTTP error codes trigger failure callbacks

**Backend** (Elysia):
- Try-catch in route handlers
- Returns { success: false, message: "..." }
- HTTP status codes: 400, 401, 403, 409, 413, 415, 500
- Logging with emoji prefixes (🔐, 📡, ❌, 🚀)

---

## Authentication Flow Details

### Token Lifecycle

**Generation**:
```
User registers/logs in
→ Backend validates credentials
→ JWT created (24-hour expiration)
→ Refresh token generated (7-day expiration)
→ Both sent to frontend
```

**Storage (Android)**:
```
SharedPreferences {
  "access_token": "{JWT}",
  "refresh_token": "{UUID}",
  "token_expiry": timestamp,
  "user_role": "senior|staff|admin",
  "user_id": number
}
```

**Usage**:
```
Every API request
→ AuthInterceptor checks token existence
→ If exists: Authorization: Bearer {token}
→ If expired: Refresh token logic (if implemented)
→ If none: Request proceeds unauthenticated
```

**Validation (Backend)**:
```
Protected routes verify JWT signature
- Secret must match: Environment.JWT_SECRET
- Expiration checked
- Payload contains user role for authorization
```

---

## Data Models & Types

### Response Objects (Android)
All API responses follow pattern:
```java
public class ApiResponse<T> {
    public boolean success;
    public String message;
    public T data;
}
```

### Key Models
- **AuthResponse**: User data + tokens
- **UserProfileResponse**: Profile information
- **SeniorsResponse**: List of seniors
- **AppointmentsResponse**: List of appointments
- **HealthRecordsResponse**: Health records
- **ProgramsWithStatusResponse**: Programs with application status
- **NotificationsResponse**: User notifications
- **FinancialDistributionResponse**: Financial assistance data

---

## Communication Best Practices

### Frontend (Android)
1. Always use `RetrofitClient.getInstance(context)` (requires Context)
2. AuthInterceptor automatically handles token injection
3. Never manually add Authorization headers
4. Handle both success and failure callbacks
5. Deserialize responses into typed objects

### Backend (Elysia)
1. Return consistent `{ success, message, data }` format
2. Use appropriate HTTP status codes
3. Log requests with emoji prefixes
4. Validate JWT in protected routes
5. Implement role-based authorization

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired token | Re-login to get new token |
| 415 Unsupported Media Type | Wrong Content-Type | Backend enforces application/json |
| Connection timeout | Network issue or slow server | Check BASE_URL, server status |
| Null data in response | Model mismatch | Check field names and types match API |
| Token not sent | AuthInterceptor issue | Verify token in SharedPreferences |

---

## Production Configuration

### Current Settings
- **Base URL**: http://10.0.2.2:8000/ (emulator testing)
- **Production Comment**: https://office-senrior-api.onrender.com/
- **Timeout**: 60 seconds (Render.com free tier optimization)

### Required Changes for Production
1. Change BASE_URL to production domain
2. Update SecurityInterceptor for HTTPS only
3. Reduce timeout if production server is faster
4. Enable stricter CORS
5. Implement token refresh logic
6. Add certificate pinning for security

---

## Summary

The backend and frontend communicate via:
1. **HTTP REST** with JSON payloads
2. **JWT authentication** via Authorization header
3. **Consistent response format** with success/message/data
4. **Automatic token injection** via AuthInterceptor
5. **Automatic serialization** via Retrofit/Gson
6. **Error handling** with HTTP status codes

The AuthInterceptor on the frontend and JWT verification on the backend together create a secure, stateless authentication system suitable for mobile applications.
