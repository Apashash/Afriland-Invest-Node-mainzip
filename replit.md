# Afriland Invest

A French-language investment platform where users can register, make deposits, purchase investment plans, earn returns, refer friends, and request withdrawals. Admins manage users, plans, announcements, and settings.

## Run & Operate

- `cd afriland-invest && node server/index.js` — start the server (port 5000, serves both API and built frontend)
- `cd afriland-invest && npm run build:client` — rebuild the React frontend into `afriland-invest/dist/public`
- `cd afriland-invest && npm run build` — build both client and server bundle

## Stack

- **Backend**: Node.js + Express 4, PostgreSQL (`pg` driver), JWT auth, bcryptjs
- **Frontend**: React 18 + Vite 5, served as static files from `afriland-invest/dist/public`
- **Database**: Replit built-in PostgreSQL (via `PGHOST`/`PGUSER`/`PGDATABASE` env vars)
- **Uploads**: Local disk storage via multer (`afriland-invest/uploads/`)

## Where things live

- Server entry: `afriland-invest/server/index.js`
- Routes: `afriland-invest/server/routes/` (auth, user, investment, deposit, withdrawal, referral, admin, posts, annonces, transactions, notifications)
- DB connection: `afriland-invest/server/db.js` — supports Replit PG env vars natively
- DB migrations: `afriland-invest/server/migrate.js` — runs automatically on server start
- Frontend: `afriland-invest/client/src/`
- Built frontend: `afriland-invest/dist/public/`
- Uploads: `afriland-invest/uploads/`

## Architecture decisions

- The server serves the built React app as static files — no separate dev server in production
- Migrations run automatically on every server start (idempotent via `IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
- Auth is custom JWT-based (not Replit Auth) — users log in with phone number + password
- No external API integrations — payments are manual (users upload proof of payment, admins approve)
- The `db.js` connection logic auto-detects Replit's `PGHOST` env vars

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing client code, you must run `npm run build:client` from `afriland-invest/` and restart the workflow
- JWT_SECRET is set in `.replit` under `[userenv.shared]` — do not remove it
- The `dist/public` directory must exist before the server starts; it's pre-built and committed
