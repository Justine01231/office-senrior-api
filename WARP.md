# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview
Office Seniors API is a senior citizen management system built with Bun, ElysiaJS, Drizzle ORM, and PostgreSQL. It manages seniors, staff, health records, benefits, programs, appointments, and assignments with role-based access control (admin/staff/senior).

## Essential Commands

### Development
```bash
# Install dependencies
bun install

# Run development server with hot reload
bun run dev

# Run production server
bun run start
```

### Database
```bash
# Generate database migrations
bun run db:generate

# Push schema changes to database
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio

# Seed admin user
bun src/scripts/seed-admin.ts
```

### Testing
No test framework is currently configured in this project.

## Architecture

### Tech Stack
- **Runtime**: Bun (v1.2.22+)
- **Web Framework**: ElysiaJS (v1.4.9) - Fast TypeScript framework
- **ORM**: Drizzle ORM (v0.44.5) with postgres.js client
- **Database**: PostgreSQL (hosted on Neon.tech)
- **Auth**: JWT tokens with bcrypt password hashing

### Database Schema Design
The system uses a **centralized user model** in `src/db/schema.ts`:
- **`users` table**: Single source of truth for all user types (admin, staff, senior). Contains authentication credentials, basic profile, and role-specific fields.
- **`seniors` table**: Lightweight table linking to users.id, stores only admin notes and relationships (not profile data).
- **Other tables**: `healthRecords`, `benefits`, `programs`, `enrollments`, `contacts`, `staffAssignments`, `appointments`, `benefitApplications`, `documents`, `reactivationRequests`, `refreshTokens`, `userAuditLog`.

**Key relationship**: Most tables reference `users.id` for seniors (not `seniors.id`), except legacy tables like `benefits`, `enrollments`, and `contacts` which still reference `seniors.id`.

### Authentication & Authorization
- **JWT-based auth**: Access tokens (24h) + refresh tokens (7d)
- **Role hierarchy**: admin > staff > senior
- **Middleware**: `authMiddleware` extracts JWT payload, `moduleAccessMiddleware` enforces staff position-based module access
- **Staff positions** control senior data access (e.g., "Senior Care Coordinator" accesses health records, "Benefits Coordinator" accesses benefits)

### Security
- **Rate limiting**: 100 req/15min (general), 20 req/15min (auth endpoints)
- **Security headers**: Implemented in `src/middleware/security.ts`
- **Environment validation**: `src/config/environment.ts` validates required env vars on startup
- **Password hashing**: Uses Bun's built-in password hashing (`Bun.password.hash/verify`)

### Code Organization
```
src/
├── index.ts              # Main entry point, Elysia app setup
├── config/
│   └── environment.ts    # Environment variable validation
├── db/
│   ├── index.ts          # Database connection
│   └── schema.ts         # Drizzle schema definitions
├── middleware/
│   ├── auth.ts           # JWT authentication
│   ├── module-access.ts  # Position-based access control for seniors
│   ├── rateLimiter.ts    # Rate limiting logic
│   └── security.ts       # Security headers and CORS
├── routes/               # Route handlers (one file per resource)
├── services/
│   ├── auth.ts           # Auth business logic
│   └── jwt.ts            # JWT utilities
├── scripts/
│   └── seed-admin.ts     # Database seeding
├── types/
│   └── auth.ts           # TypeScript types for auth
└── utils/
    └── validation.ts     # Input validation utilities
```

### Module Access System
Seniors can only access modules if assigned to a staff member with appropriate position:
- **Health records**: Senior Care Coordinator, Doctor, Nurse, Medical Assistant
- **Benefits**: Senior Care Coordinator, Social Worker, Benefits Coordinator, Case Manager
- **Programs**: Program Coordinator, Activity Director, Community Outreach
- **Contacts**: Senior Care Coordinator, Social Worker, Case Manager, Family Liaison
- **Profile**: Always accessible to all seniors

Position-based access is enforced in `src/middleware/module-access.ts`.

## Development Workflows

### Adding a New Route
1. Create route file in `src/routes/[resource].ts`
2. Use Elysia prefix for API versioning: `new Elysia({ prefix: '/api/[resource]' })`
3. Apply appropriate middleware (authMiddleware for protected routes)
4. Import and use in `src/index.ts` via `.use([resource]Routes)`

### Database Schema Changes
1. Modify `src/db/schema.ts`
2. Run `bun run db:generate` to create migration
3. Run `bun run db:push` to apply to database
4. Update TypeScript types in `src/types/` if needed

### Authentication Flow
1. User registers/logs in via `POST /auth/register` or `POST /auth/login`
2. Server returns JWT access token + refresh token
3. Client sends `Authorization: Bearer <token>` header
4. Middleware in `src/middleware/auth.ts` validates JWT and attaches user to context
5. Routes can access `user` object from context: `{ user, set, body }`

### Senior Approval Workflow
1. Senior registers → `approvalStatus: 'pending'`, `isActive: false`
2. Admin approves via `POST /api/admin-approvals/:id/approve`
3. Senior can now log in and access assigned modules
4. Staff assignment required before senior can access specific modules

## Environment Setup
Copy `.env.example` to `.env` and configure:
```bash
JWT_SECRET=<at least 32 characters>
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
PORT=3000
NODE_ENV=development
```

**Required**: `JWT_SECRET` (32+ chars), `DATABASE_URL`

## Important Patterns

### Error Handling
ElysiaJS uses throw statements and status codes:
```typescript
if (!user) {
  set.status = 401;
  return { success: false, message: 'Unauthorized' };
}
```

### Database Queries
Use Drizzle ORM with explicit selects (avoid `select()`):
```typescript
const users = await db.select({
  id: users.id,
  username: users.username,
  // ... explicit fields
}).from(users).where(eq(users.role, 'staff'));
```

### JWT Payload Structure
```typescript
{
  userId: number,
  username: string,
  role: 'admin' | 'staff' | 'senior',
  seniorId?: number,  // Only for senior users
  iat: number,
  exp: number
}
```

### Response Format
Consistent API responses:
```typescript
{
  success: boolean,
  message?: string,
  data?: any,
  error?: string
}
```

## Key Files to Reference
- `src/db/schema.ts`: Complete database schema
- `src/middleware/auth.ts`: Authentication logic
- `src/middleware/module-access.ts`: Access control rules
- `src/services/auth.ts`: User creation and password handling
- `src/config/environment.ts`: Configuration validation

## Common Pitfalls
- **User vs Senior IDs**: Most tables reference `users.id` (not `seniors.id`). Check foreign key relationships carefully.
- **Staff positions**: Staff position strings must match exact patterns in `module-access.ts` for access control.
- **Environment validation**: Missing/invalid environment variables will crash on startup (see `environment.ts`).
- **Password hashing**: Use `Bun.password.hash()` and `Bun.password.verify()`, not bcrypt directly in new code (bcrypt exists for legacy seed script).
- **Rate limiting**: Auth endpoints have stricter limits (20 req/15min vs 100 req/15min).
