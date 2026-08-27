# 🏢 Office of Senior Citizens — Backend API

A RESTful backend API for the **Office of Senior Citizens Management System**, built to handle senior citizen records, health data, staff assignments, appointments, benefits, financial assistance, and more.

---

## 🚀 Live Production

> **API Base URL:** [`https://office-seniors-api.onrender.com`](https://office-seniors-api.onrender.com)
> **Swagger Docs:** [`https://office-seniors-api.onrender.com/swagger`](https://office-seniors-api.onrender.com/swagger)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh/) |
| Framework | [Elysia.js](https://elysiajs.com/) |
| Database | [PostgreSQL](https://www.postgresql.org/) via [Neon](https://neon.tech/) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| API Docs | Swagger (via @elysiajs/swagger) |

---

## 📦 Features / API Routes

| Module | Description |
|---|---|
| `auth` | Login, register, token refresh |
| `users` | User management (admin, staff, senior roles) |
| `seniors` | Senior citizen profiles and records |
| `staff` | Staff management and assignment |
| `assignments` | Staff-to-senior assignments |
| `staff-dashboard` | Staff-facing dashboard data |
| `pending-tasks` | Task tracking for staff |
| `reactivation-requests` | Senior account reactivation flow |
| `staff-coverage` | Coverage scheduling |
| `admin-approvals` | Admin approval workflows |
| `health` | Health records management |
| `programs` | Senior programs/services |
| `enrollments` | Program enrollment |
| `program-applications` | Program application submissions |
| `core-benefits` | Core benefits tracking |
| `notifications` | In-app notification system |
| `profile` | User profile management |
| `appointments` | Appointment scheduling |
| `reschedule-requests` | Appointment rescheduling workflow |
| `reports` | Reports and analytics |
| `financial-assistance` | Financial assistance records |
| `contacts` | Contact management |

---

## 💻 Local Development

### Prerequisites
- [Bun](https://bun.sh/) v1.x
- PostgreSQL database (or [Neon](https://neon.tech/) free tier)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Justine01231/office-senior-api.git
cd office-senior-api

# 2. Install dependencies
bun install

# 3. Copy environment variables
cp .env.example .env
# Fill in your values in .env

# 4. Push database schema
bun run db:push

# 5. Start development server
bun run dev
```

Server runs at: `http://localhost:3000`
Swagger docs at: `http://localhost:3000/swagger`

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# JWT
JWT_SECRET=your-secret-key-at-least-32-characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# Server
PORT=3000
NODE_ENV=development

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://10.0.2.2:3000
```

> ⚠️ Never commit your `.env` file. It is already in `.gitignore`.

---

## 🗄️ Database Scripts

```bash
bun run db:generate   # Generate Drizzle migration files
bun run db:push       # Push schema changes to DB
bun run db:studio     # Open Drizzle Studio (visual DB browser)
```

---

## 🐳 Docker

A `Dockerfile` is included for containerized deployments:

```bash
docker build -t office-senior-api .
docker run -p 3000:3000 --env-file .env office-senior-api
```

---

## 👥 User Roles

| Role | Description |
|---|---|
| `admin` | Full access — manages staff, seniors, approvals |
| `staff` | Manages assigned seniors, health records, appointments |
| `senior` | Views own profile, appointments, benefits, programs |

---

## 📁 Project Structure

```
src/
├── config/         # Environment config
├── db/             # Drizzle schema & DB connection
├── middleware/     # Security, CORS, rate limiting
├── routes/         # All API route handlers (22 modules)
├── services/       # Business logic layer
├── types/          # TypeScript types
└── utils/          # Utility helpers
```

---

## 📝 License

This project is private and intended for use by the Office of Senior Citizens.
