# Agent Guidelines

## Commands

### Build & Run
- `bun install` - Install dependencies
- `bun run dev` - Start dev server with watch mode
- `bun run start` - Start production server
- `bun src/index.ts` - Run directly

### Database
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio UI

### Debugging Utilities
- `bun test-reschedule-flow.js` - Test reschedule workflow
- `bun check-data.js` - Inspect database contents
- `bun check-seniors.js` / `check-staff.js` - View specific user types

## Architecture

**Backend**
- Framework: Elysia (TypeScript-first web framework)
- Database: PostgreSQL with Drizzle ORM
- Auth: JWT tokens + refresh tokens, Bun password hashing
- Server Port: 3000 (configurable via PORT env var)

**Frontend** (Android)
- HTTP Client: Retrofit 2 with OkHttpClient
- Auth: JWT stored in SharedPreferences, injected via AuthInterceptor
- Base URL: `http://10.0.2.2:8000/` (emulator) or IP for physical devices
- Response Format: JSON with `{ success, message, data }` pattern

### Backend Structure
- `src/index.ts` - Main server, route registration
- `src/routes/` - API endpoints (auth, users, seniors, appointments, etc.)
- `src/controllers/` - Request handlers
- `src/services/` - Business logic (AuthService, etc.)
- `src/db/schema.ts` - Drizzle table definitions (users, seniors, appointments, benefits, programs, etc.)
- `src/db/index.ts` - Database connection
- `src/middleware/` - Security, CORS, rate limiting
- `src/types/` - TypeScript interfaces
- `src/config/` - Environment validation

### Frontend Structure (Android)
- `remote/RetrofitClient.java` - HTTP client singleton with interceptors
- `remote/ApiService.java` - Retrofit service interface defining all API endpoints
- `utils/AuthInterceptor.java` - Automatically injects JWT `Authorization: Bearer {token}` header
- `utils/AuthHelper.java` - SharedPreferences management for JWT tokens and user data
- `models/` - Data classes for API requests/responses (LoginRequest, AuthResponse, etc.)

## Code Style

**Imports**: ES modules, group by external/internal, path-based (no aliases)  
**Naming**: camelCase for variables/functions, PascalCase for classes/types  
**Types**: Full strict mode enabled in tsconfig. Interfaces for contracts, types for unions.  
**Error Handling**: Try-catch in services, return `{ success, message, data }` JSON responses  
**Console**: Use emoji prefixes for logs (📡, 🚀, ❌, 👤, 🔒, etc.)  
**DB Queries**: Use Drizzle ORM with destructuring: `[result] = await db.insert(...).returning()`  
**Classes**: Static methods in service classes (AuthService, etc.)
