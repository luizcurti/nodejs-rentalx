# 🚗 RentalX API

A robust REST API built with **Node.js / TypeScript** that simulates a complete car-rental platform, designed around SOLID principles, Clean Architecture, and a full test suite (unit + E2E).

---

## ✨ Features

| Area | Capabilities |
|---|---|
| 👤 **Users** | Registration, JWT authentication, profile, avatar upload, password recovery |
| 🚙 **Cars** | Create / list vehicles, categories, specifications, image upload |
| 📋 **Rentals** | Rent and return cars with business rule validations |
| 🔐 **Security** | JWT access + refresh tokens, rate limiting, admin guard |
| 📧 **Email** | Forgot-password flow with Handlebars HTML templates |
| ☁️ **Storage** | Local disk or AWS S3 (configurable at startup) |
| 📖 **Docs** | Swagger / OpenAPI at `/api-docs` |

---

## 🛠 Tech Stack

- **Runtime**: Node.js 18 LTS, TypeScript
- **Framework**: Express 4
- **Database**: PostgreSQL + TypeORM 0.3
- **Cache**: Redis (rate limiter)
- **Auth**: JWT (`jsonwebtoken`), bcrypt
- **DI Container**: TSyringe
- **Testing**: Jest 29 + Supertest (unit + E2E)
- **Email**: Nodemailer + Handlebars
- **Storage**: Multer + `@aws-sdk/client-s3`
- **Containers**: Docker + Docker Compose
- **Code Quality**: ESLint 9, Prettier

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Docker** + **Docker Compose** (or local PostgreSQL 12+ and Redis 6+)

### 1 — Clone & install

```bash
git clone https://github.com/luizcurti/nodejs-rentalx.git
cd nodejs-rentalx
npm install
```

### 2 — Environment

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)
```

### 3 — Start services

```bash
docker compose up -d          # starts postgres (database_ignite) + redis
```

### 4 — Run migrations & seed

```bash
npm run migration:run          # apply all migrations to the default database
npm run seed:admin             # optional: creates the default admin user
```

### 5 — Start the API

```bash
npm run dev                    # ts-node-dev with hot reload on port 3333
```

The API will be available at `http://localhost:3333`.  
Swagger UI: `http://localhost:3333/api-docs`.

---

## 📊 NPM Scripts

```bash
# Development
npm run dev               # Start dev server with hot reload
npm run build             # Compile TypeScript to dist/

# Database
npm run migration:run     # Run pending migrations
npm run migration:revert  # Revert last migration
npm run migration:generate # Generate a new migration

# Testing
npm test                  # Run all tests (unit + E2E) — requires Docker running
npm run test:coverage     # Same with lcov/text coverage report

# Code quality
npm run lint              # ESLint check
npm run lint:fix          # ESLint auto-fix
npm run format            # Prettier format

# Utilities
npm run seed:admin        # Insert default admin user into the database
```

---

## 🐳 Docker

```bash
# Start only the required services (recommended for local dev)
docker compose up -d database redis

# Start everything (when the app container is enabled in docker-compose.yml)
docker compose up -d

# Tail logs
docker compose logs -f database

# Stop and remove containers
docker compose down
```

---

## 🧪 Testing

The project ships with **two test layers**:

### Unit tests (37 suites — 129 tests)

Controller and UseCase tests that run entirely **in-memory** — no database required.

```bash
NODE_ENV=test npx jest --runInBand --testPathIgnorePatterns='e2e.spec.ts' --config jest.config.ts
```

### E2E / Integration tests (1 suite — 73 tests)

HTTP-level tests using **Supertest** against a real PostgreSQL database (`rentx_test`).

```bash
# Make sure Docker is running, then:
docker exec database_ignite psql -U docker -d postgres -c "CREATE DATABASE rentx_test;"  # first time only
NODE_ENV=test npx jest --runInBand --testPathPattern="e2e.spec.ts" --config jest.config.ts
```

### Run everything

```bash
npm test
```

**Current results:**

```
Test Suites : 38 passed
Tests       : 202 passed (129 unit + 73 E2E)
Coverage    : 99.79% statements · 96.77% branches · 100% functions
ESLint      : 0 errors · 0 warnings
```

### E2E routes covered

| Route | Methods tested |
|---|---|
| `/sessions` | valid login, wrong password, missing fields (×6) |
| `/refresh-token` | body token, header token, invalid token, missing (×4) |
| `/users` | create, duplicate email, incomplete data (×3) |
| `/users/profile` | authenticated, no token, malformed token, empty header (×4) |
| `/users/avatar` | upload file, no file, no token (×3) |
| `/categories` | create (admin/user/no-auth), list, import CSV (×9) |
| `/specifications` | create (admin/user/no-auth), list (×6) |
| `/cars` | create (admin/user/no-auth/duplicate), list available, filters, pagination (×10) |
| `/cars/specifications/:id` | add spec, bad car id, no-auth (×4) |
| `/cars/images/:id` | upload image, no-auth (×3) |
| `/rentals` | create, validations, conflicts, list, devolution (×11) |
| `/password/forgot` + `/password/reset` | full reset flow, expired/missing token (×7) |

---

## 📋 API Reference

### Authentication

All protected routes require:

```
Authorization: Bearer <access_token>
```

Admin-only routes additionally require `isAdmin = true` on the authenticated user.

### Endpoints

#### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sessions` | — | Login — returns `token` + `refresh_token` |
| POST | `/refresh-token` | — | Exchange refresh token for a new pair |
| POST | `/password/forgot` | — | Send password-reset email |
| POST | `/password/reset` | — | Reset password using the emailed token |

#### Users
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users` | — | Create account |
| GET | `/users/profile` | ✅ | Authenticated user profile |
| PATCH | `/users/avatar` | ✅ | Upload avatar image (multipart) |

#### Categories
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/categories` | ✅ Admin | Create category |
| GET | `/categories` | — | List all categories |
| POST | `/categories/import` | ✅ Admin | Import categories from CSV |

#### Specifications
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/specifications` | ✅ Admin | Create specification |
| GET | `/specifications` | — | List all specifications |

#### Cars
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/cars` | ✅ Admin | Create car |
| GET | `/cars/available` | — | List available cars (supports `?brand`, `?name`, `?category_id`, `?page`, `?limit`) |
| POST | `/cars/specifications/:id` | ✅ Admin | Attach specifications to a car |
| POST | `/cars/images/:id` | ✅ Admin | Upload car images (multipart, multiple files) |

#### Rentals
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/rentals` | ✅ | Create rental — requires `car_id` and `expected_return_date` (≥ 24 h) |
| PATCH | `/rentals/devolution/:id` | ✅ | Return car — calculates `total` with fine if late |
| GET | `/rentals/user` | ✅ | List authenticated user's rentals |

### Business Rules

- A car can only be rented when `available = true`.
- Minimum rental period is **24 hours**.
- A user may only have **one open rental** at a time.
- Late returns incur a fine: `fine_amount × overdue_days` added to the daily total.
- Password-reset tokens expire after **3 hours** and are single-use.

### Error Format

```json
{ "message": "Human-readable error description" }
```

HTTP status codes: `400` (business error), `401` (unauthenticated), `403` (forbidden), `429` (rate limit), `500` (unexpected).

### Rate Limiting

100 requests per 5 seconds per IP (in-memory, configurable in `rateLimiter.ts`).

---

## 🔧 Environment Variables

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=docker
DB_PASSWORD=ignite
DB_DATABASE=rentx

# JWT
JWT_SECRET_TOKEN=change_me_in_production
JWT_EXPIRES_IN_TOKEN=15m
JWT_SECRET_REFRESH_TOKEN=change_me_in_production
JWT_EXPIRES_IN_REFRESH_TOKEN=30d
JWT_EXPIRES_REFRESH_TOKEN_DAYS=30

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
NODE_ENV=development
PORT=3333
APP_API_URL=http://localhost:3333
APP_CORS_ORIGIN=*

# Storage: "local" or "s3"
disk=local

# AWS (required when disk=s3)
AWS_BUCKET=your-bucket-name
AWS_BUCKET_REGION=us-east-1
AWS_BUCKET_URL=https://your-bucket-name.s3.us-east-1.amazonaws.com
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Email: "ethereal" (dev) or "ses" (prod)
MAIL_PROVIDER=ethereal
FORGOT_MAIL_URL=http://localhost:3333/password/reset?token=
```

---

## 🏗 Project Architecture

```
src/
├── config/                    # TypeORM datasource, JWT config, upload config
├── modules/
│   ├── accounts/              # Users, auth, tokens, email
│   │   ├── dtos/
│   │   ├── infra/typeorm/     # Entities + repositories (TypeORM)
│   │   ├── mapper/            # UserMap (class-transformer)
│   │   ├── repositories/      # Interfaces + in-memory implementations
│   │   └── useCases/          # One folder per use case (Controller + UseCase + tests)
│   ├── cars/                  # Cars, categories, specifications, images
│   └── rentals/               # Rental lifecycle
├── shared/
│   ├── container/             # TSyringe registrations + providers (Date, Mail, Storage)
│   ├── errors/                # AppError
│   └── infra/
│       ├── http/              # app.ts, server.ts, routes, middlewares, e2e.spec.ts
│       └── typeorm/           # migrations, seed
└── utils/                     # File helpers
```

### Design Patterns

| Pattern | Usage |
|---|---|
| **Repository** | `IUsersRepository`, `ICarsRepository`, … — swappable between TypeORM and in-memory |
| **Use Case** | Each business action is an isolated injectable class |
| **Dependency Injection** | TSyringe `@injectable` / `@inject` decorators |
| **Mapper / DTO** | `UserMap.toDTO()` with `class-transformer` `instanceToInstance` |
| **Strategy** | Storage provider (`local` vs `s3`) resolved at startup |

---

## 🤝 Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`
2. Follow the coding standards (PascalCase for classes, `I` prefix for interfaces)
3. Write or update tests — keep coverage above 95 %
4. Lint and format: `npm run lint:fix && npm run format`
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `test:`, `chore:`
6. Open a Pull Request with a clear description of your changes

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

