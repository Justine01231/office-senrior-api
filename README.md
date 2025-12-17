# Office Seniors API 🏢

Backend API for the Office of Senior Citizens Management System.

## 🚀 Production
Deployed at: `https://office-seniors-api.onrender.com`

## 🛠️ Tech Stack
- **Runtime**: Bun
- **Framework**: Elysia.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle

## 💻 Local Development
```bash
bun install
bun run dev
```

## 🔐 Environment Variables
Set in Render.com dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing key
- `NODE_ENV=production`
- `PORT=8000`
