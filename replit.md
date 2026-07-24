# E-Diwan Staff Portal

Staff management portal for Sharbazher Education Directorate (بەڕێوەبەرایەتی پەروەردەی شارباژێر).

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (port 5000) |
| Backend | Express 5 + Socket.IO (port 8080) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Session-based (express-session) |

## Running the project

Both services are managed by Replit workflows and start automatically.

| Workflow | Command |
|----------|---------|
| `artifacts/api-server: API Server` | `PORT=8080 pnpm --filter @workspace/api-server run dev` |
| `artifacts/staff-portal: web` | `PORT=5000 pnpm --filter @workspace/staff-portal run dev` |

## Database setup (one-time)

Replit's built-in PostgreSQL is used. `DATABASE_URL` is injected automatically.

```bash
# Push schema
pnpm --filter @workspace/db run push

# Seed default admin user (Ahmad / Plan123)
pnpm --filter @workspace/scripts run seed
```

## Default login

| Field | Value |
|-------|-------|
| Username | `Ahmad` |
| Password | `Plan123` |

## Creating additional users

```bash
pnpm --filter @workspace/scripts run create-user <username> <password> [full_name]
```

## Project structure

```
artifacts/
  api-server/     # Express 5 backend (port 8080)
  staff-portal/   # React + Vite frontend (port 5000)
lib/
  db/             # Drizzle ORM schema + migrations
  api-spec/       # OpenAPI spec + orval codegen
  api-client-react/  # Generated React query hooks
  api-zod/        # Zod validators from OpenAPI
scripts/
  src/
    seed.ts       # Seed departments, roles, admin user
    create-user.ts
```

## User preferences

- Use Replit's built-in PostgreSQL database.
