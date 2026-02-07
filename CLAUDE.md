# CLAUDE.md

## Project Overview

Trade Inquiry Order System (A2Y) -- a B/S architecture application for trade inquiry and order management between Arroz (Japan, buyer) and Yunjie (China, supplier). The system handles user management, inquiries, quotations, orders, real-time chat, file attachments, and notifications with Chinese/Japanese bilingual support.

## Repository Structure

```
A2Y/                          # Monorepo root
├── backend/                   # Node.js + Express + TypeScript API server
│   └── src/
│       ├── config/            # Database (PostgreSQL, Redis) configuration
│       ├── controllers/       # Route handlers (Auth, Chat, Dashboard, File, Inquiry, Notification, Order, Quotation, User)
│       ├── middleware/        # auth, errorHandler, language, performance, rateLimiter, roleMiddleware, security, validation
│       ├── models/            # Data models (ChatMessage, FileAttachment, Inquiry, Notification, Order, Quotation, User)
│       ├── routes/            # Express route definitions
│       ├── services/          # Business logic (FileStorage, I18n, Initialization, Notification, Socket, Translation)
│       ├── utils/             # logger, migrationRunner, permissionUtils, socketUtils
│       ├── migrations/        # Numbered SQL migration files (001-008)
│       ├── tests/             # Jest tests (controllers/, services/, middleware/, security/, utils/, integration/, models/)
│       ├── scripts/           # Security audit and vulnerability scanning scripts
│       ├── types/             # TypeScript type definitions
│       └── server.ts          # Application entry point
├── frontend/                  # Vue.js 3 + TypeScript SPA
│   └── src/
│       ├── components/        # Vue components (AppHeader, Chat*, *Dialog, LanguageSwitcher, NotificationDropdown)
│       ├── views/             # Page views (Dashboard, Inquiries, Login, Orders, Quotations, Users)
│       ├── router/            # Vue Router configuration
│       ├── services/          # API service layer (api, chat, dashboard, inquiry, notification, order, quotation, socket, user)
│       ├── stores/            # Pinia state management (auth)
│       ├── locales/           # i18n translation files (Chinese, Japanese)
│       ├── composables/       # Vue composables
│       ├── types/             # TypeScript type definitions
│       ├── tests/             # Vitest unit tests (components/, services/, stores/, views/, router/, integration/)
│       ├── App.vue            # Root component
│       └── main.ts            # Entry point
│   └── cypress/               # E2E tests (specs, support, fixtures, scripts)
├── .kiro/specs/               # Feature specs and design docs
├── setup-database.sql         # Database initialization script
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Vue.js 3.4, TypeScript 5.3 |
| UI library | Element Plus 2.4 |
| State management | Pinia 2.1 |
| Routing | Vue Router 4.2 |
| i18n | Vue I18n 9.8 (Chinese/Japanese) |
| Bundler | Vite 5.0 |
| Backend framework | Express.js 4.18, TypeScript 5.3 |
| Runtime | Node.js 18+ |
| Database | PostgreSQL 13+ |
| Cache/Sessions | Redis 6+ |
| Real-time | Socket.IO 4.7 |
| Auth | JWT (jsonwebtoken) |
| File uploads | Multer |
| Security | Helmet, bcryptjs, express-rate-limit |
| Logging | Winston, Morgan |

## Development Commands

### Backend (`cd backend`)

```bash
npm run dev          # Start dev server with hot reload (tsx watch)
npm run build        # Compile TypeScript (tsc -> dist/)
npm start            # Run production build (node dist/server.js)
npm test             # Run all Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:security # Run security-specific tests
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

### Frontend (`cd frontend`)

```bash
npm run dev          # Vite dev server (port 5173, proxies /api to localhost:3000)
npm run build        # Type-check (vue-tsc) then build (vite build)
npm run preview      # Preview production build
npm test             # Vitest unit tests
npm run test:run     # Run tests once (no watch)
npm run test:coverage # Generate coverage report
npm run cypress:open # Cypress E2E GUI
npm run cypress:run  # Cypress E2E headless
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

## Architecture

**Request flow:** Routes -> Middleware -> Controllers -> Services -> Models -> PostgreSQL

**Key patterns:**
- Layered backend: routes define endpoints, controllers handle request/response, services contain business logic, models interact with the database
- Frontend service layer: Vue components call service modules which wrap Axios API calls
- RBAC with 3 roles: `admin`, `buyer` (Arroz/Japan), `supplier` (Yunjie/China)
- JWT authentication with token in Authorization header
- Socket.IO for real-time chat and notifications
- Migration-based database schema management (numbered SQL files in `backend/src/migrations/`)

**API response format:**
```json
{ "success": true, "data": {}, "timestamp": "..." }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "...", "details": {} }, "timestamp": "..." }
```

## Code Conventions

### TypeScript / General
- ES modules (`"type": "module"` in both package.json files)
- Target: ES2020
- Strict mode enabled
- Path alias: `@/*` maps to `src/*` in both frontend and backend
- Unused variables prefixed with `_` are allowed (`argsIgnorePattern: '^_'`)
- `no-explicit-any` is a warning (not error) in backend

### Naming
- Controllers: `{Entity}Controller.ts` (PascalCase class)
- Services: `{Entity}Service.ts` (PascalCase class)
- Models: `{Entity}.ts` (PascalCase)
- Routes: `{entity}.ts` (lowercase)
- Vue components: `PascalCase.vue`
- Stores: lowercase `{name}.ts`

### Formatting (Prettier)
- Semicolons: yes
- Single quotes: yes
- Trailing commas: ES5
- Line width: 80
- Indent: 2 spaces (no tabs)

### ESLint
- Backend: `eslint:recommended` + `@typescript-eslint/recommended`
- Frontend: `plugin:vue/vue3-essential` + `eslint:recommended` + `@vue/eslint-config-typescript` + `@vue/eslint-config-prettier`
- `console` statements warn in production, allowed in development

## Testing

### Backend (Jest + ts-jest)
- Test files: `**/__tests__/**/*.ts` or `**/?(*.)+(spec|test).ts` under `src/`
- Uses ESM preset (`ts-jest/presets/default-esm`)
- HTTP testing with Supertest
- Coverage output: `coverage/` (text, lcov, html)

### Frontend (Vitest + Vue Test Utils)
- Environment: jsdom
- Global test APIs enabled (`globals: true`)
- Setup file: `src/tests/setup.ts`

### E2E (Cypress)
- Base URL: `http://localhost:5173`
- Viewport: 1280x720
- Spec pattern: `cypress/e2e/**/*.cy.{js,jsx,ts,tsx}`
- Requires both backend and frontend running

## Environment Setup

### Required Services
- PostgreSQL 13+ on port 5432
- Redis 6+ on port 6379
- Node.js 18+

### Backend Environment Variables (`backend/.env`, copy from `.env.example`)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` -- PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` -- Redis connection
- `JWT_SECRET`, `JWT_EXPIRES_IN` -- Authentication
- `PORT` -- Server port (default 3000)
- `NODE_ENV` -- `development` or `production`
- `UPLOAD_DIR`, `MAX_FILE_SIZE` -- File upload config
- `TRANSLATION_API_KEY`, `TRANSLATION_SERVICE` -- Translation service

### Default Admin Credentials (dev only)
- Username: `admin` / Password: `admin123`

### Ports
- Backend API: 3000
- Frontend dev server: 5173 (proxies `/api` and `/socket.io` to backend)

## Database

- PostgreSQL with migration-based schema management
- Migrations in `backend/src/migrations/` (001-008), run automatically on startup by `InitializationService`
- Schema initialization script: `setup-database.sql` (root)
- UUID primary keys, PostgreSQL enums for status/role types
- Connection pooling via `pg.Pool`

## Monitoring Endpoints

- `GET /health` -- Health check
- `GET /metrics` -- Performance metrics (admin rate-limited)
- `GET /api/monitoring/health` -- Detailed health status
- `GET /api/monitoring/metrics` -- Detailed metrics
- `GET /api/monitoring/database` -- Database health

## Important Notes for AI Assistants

- This is a monorepo with separate `node_modules` per package. Always run `npm install` in the correct subdirectory (`backend/` or `frontend/`).
- The backend uses ESM (`"type": "module"`). Import paths must include `.js` extensions in compiled output. The `tsx` dev runner handles this transparently.
- Never commit `.env` files. Use `.env.example` as reference.
- The frontend Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3000`. No CORS issues in dev.
- Database migrations run automatically on server startup -- no manual migration step needed.
- The `compression` middleware import exists in `server.ts` but is commented out (`//app.use(compression())`).
- Socket.IO service is initialized in `server.ts` and stored on `global` for cross-module access.
- Security middleware stack is applied before route handlers: security headers, request size limits, suspicious activity detection, input sanitization, SQL injection prevention.
- Rate limiters are applied per-route category: auth, upload, chat, translation, admin, general.
