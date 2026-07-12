# Mobile Shop POS

A complete, production-ready Point of Sale web application for mobile phone shops. Handles sales, inventory, customers, suppliers, purchases, expenses, and reports in one professional system.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/pos run dev` — run the POS frontend (port 24730)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Default Credentials

- **Admin**: `admin` / `admin123`
- **Cashier**: `cashier` / `cashier123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, Wouter, Recharts, next-themes, react-hook-form
- Backend: Express 5, Node.js built-in `node:sqlite` (no native compilation needed)
- Auth: JWT (jsonwebtoken) + bcryptjs
- Database file: `pos-data.db` at workspace root (auto-created on first run)
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)

## Where things live

- `artifacts/pos/src/` — React frontend
  - `contexts/AuthContext.tsx` — JWT auth context
  - `pages/` — all app pages (dashboard, pos, sales, products, customers, etc.)
  - `components/ThermalReceipt.tsx` — thermal print component
- `artifacts/api-server/src/` — Express backend
  - `lib/database.ts` — SQLite setup, schema, seeding, transaction helper
  - `middleware/auth.ts` — JWT verify middleware
  - `routes/` — all REST routes
- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks

## Features

1. **Dashboard** — today/monthly sales, profit, product/customer counts, low-stock alerts, recent sales, charts
2. **POS Screen** — barcode scanner support, product search/grid, cart management, discount/tax/payment, thermal receipt printing
3. **Products** — full CRUD with barcode, IMEI, image upload (base64), barcode generator/printer
4. **Categories** — CRUD for product categories (8 defaults seeded)
5. **Customers & Suppliers** — CRUD with purchase history drawer, balance tracking
6. **Purchases** — purchase orders that auto-update stock and purchase price
7. **Expenses** — track shop rent, electricity, internet, salary, misc
8. **Sales History** — search by invoice/customer, date filter, print receipt, return/void
9. **Reports** — daily/weekly/monthly/yearly sales, profit/loss, expense, stock, best-selling (with charts)
10. **Settings** — store info, logo, receipt size (58mm/80mm), user management (admin only)
11. **Backup** — export full database as JSON, import from JSON
12. **Dark/Light mode** — full dark mode support with next-themes

## Architecture decisions

- **node:sqlite instead of better-sqlite3** — Node.js v24's built-in SQLite module requires no native compilation and has an identical synchronous API. This makes the app work without Python or build tools.
- **SQLite over PostgreSQL** — as specified; the database lives at `pos-data.db` in the workspace root. The `lib/db` package (Drizzle/Postgres) is present but unused by this app.
- **JWT in localStorage** — POS apps are typically single-device/single-session; localStorage JWT is appropriate here.
- **Base64 image storage** — product images and store logo are stored as base64 in the database to avoid needing an object storage integration.
- **Thermal receipt via window.print()** — opens a minimal print window with the receipt HTML; supports 58mm and 80mm paper widths via CSS.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any change to `lib/api-spec/openapi.yaml`, run codegen before using updated types.
- The `node:sqlite` module shows an "ExperimentalWarning" in Node < 24; this is expected and harmless on Node 24.
- The `pos-data.db` file is gitignored by default. Back it up using the app's backup export feature.
