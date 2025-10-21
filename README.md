# 🚗 RentalX API

A robust REST API built with Node.js/TypeScript that simulates a complete car rental system, following SOLID principles and implementing TDD (Test-Driven Development).

## ✨ Features

- **👤 User Management**: Registration, JWT authentication, user profiles, and password recovery via email
- **🚙 Car Management**: Full CRUD for vehicles, categories, specifications, and image uploads
- **📋 Rental System**: Complete car rental and return process with validations
- **🔐 Secure Authentication**: JWT with refresh tokens and rate limiting
- **📧 Email System**: Email sending with HTML templates
- **☁️ Storage**: Local and AWS S3 storage support
- **📖 Documentation**: Integrated Swagger/OpenAPI documentation

## 🛠 Tech Stack

- **Backend**: Node.js, TypeScript, Express 4.21.2 (stable)
- **Database**: PostgreSQL with TypeORM 0.3+
- **Cache**: Redis for sessions and rate limiting
- **Testing**: Jest with code coverage
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Class-transformer and class-validator
- **Email**: Nodemailer with Handlebars templates
- **Storage**: AWS S3 v3 + local storage with Multer
- **Containerization**: Docker and Docker Compose
- **Code Quality**: ESLint 9, Prettier

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 12+
- Redis 6+
- Docker and Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/luizcurti/nodejs-rentalx.git
cd nodejs-rentalx

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configurations

# Start services (Docker)
docker-compose up -d database redis

# Run migrations
npm run migration:run

# Create admin user (optional)
npm run seed:admin

# Start development server
npm run dev
```

The API will be available at `http://localhost:3333`

## 📊 Available Scripts

```bash
# Development
npm run dev           # Start development server
npm run build         # Build for production

# Database
npm run migration:run      # Run migrations
npm run migration:revert   # Revert migration
npm run migration:generate # Generate new migration

# Testing
npm test              # Run all tests
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint          # Check code issues
npm run lint:fix      # Fix code issues
npm run format        # Format code with Prettier

# Utilities
npm run seed:admin    # Create admin user
```

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# Only database and redis
docker-compose up -d database redis

# View logs
docker-compose logs -f app
```

## 📋 API Documentation

Visit `http://localhost:3333/api-docs` to see the complete Swagger documentation.

### 🔐 Authentication

The API uses **JWT (JSON Web Tokens)** for authentication. Include the token in the header:

```
Authorization: Bearer <your_jwt_token>
```

### Main Endpoints

#### Authentication
- `POST /sessions` - User login
- `POST /refresh-token` - Refresh token
- `POST /password/forgot` - Password recovery
- `POST /password/reset` - Reset password

#### Users
- `POST /users` - Create user
- `GET /users/profile` - User profile
- `PATCH /users/avatar` - Upload avatar

#### Cars
- `POST /cars` - Create car (admin only)
- `GET /cars/available` - List available cars
- `POST /cars/images/{id}` - Upload car images (admin only)

#### Categories
- `POST /categories` - Create category (admin only)
- `GET /categories` - List categories
- `POST /categories/import` - Import categories from CSV (admin only)

#### Rentals
- `POST /rentals` - Create rental
- `POST /rentals/devolution/{id}` - Return car
- `GET /rentals/user` - User's rentals

### Example Usage

#### Login
```bash
curl -X POST http://localhost:3333/sessions \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

#### List Available Cars
```bash
curl -X GET http://localhost:3333/cars/available \
  -H "Authorization: Bearer <your_token>"
```

#### Create Rental
```bash
curl -X POST http://localhost:3333/rentals \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"car_id": "uuid", "expected_return_date": "2025-01-10T00:00:00.000Z"}'
```

### Error Responses

All error responses follow this pattern:

```json
{
  "status": "error",
  "message": "Error description"
}
```

### Rate Limiting

- **Limit**: 5 requests per 15 seconds per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific tests
npm test -- --testPathPattern=AuthenticateUser
```

Current test coverage: **100%** (126 tests passing, 99.61% branches)

## 🔧 Environment Configuration

### Required Environment Variables (.env)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=docker
DB_PASSWORD=ignite
DB_DATABASE=rentx

# JWT
JWT_SECRET_TOKEN=your_secret_token
JWT_EXPIRES_IN_TOKEN=15m
JWT_SECRET_REFRESH_TOKEN=your_refresh_secret
JWT_EXPIRES_IN_REFRESH_TOKEN=30d

# AWS (optional)
AWS_BUCKET=your_bucket
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
NODE_ENV=development
PORT=3333
```

## 🏗 Architecture

The project follows SOLID principles and Clean Architecture:

```
src/
├── modules/           # Application modules
│   ├── accounts/      # Users and authentication
│   ├── cars/          # Car management
│   └── rentals/       # Rental system
├── shared/            # Shared code
│   ├── container/     # Dependency injection
│   ├── infra/         # Infrastructure (HTTP, DB)
│   └── errors/        # Error handling
└── utils/             # Utilities
```

### Design Patterns Used
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Using TSyringe
- **Use Case Pattern**: Business logic encapsulation
- **Factory Pattern**: For creating instances
- **Strategy Pattern**: For different storage providers

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/nodejs-rentalx.git
cd nodejs-rentalx

# 3. Add upstream remote
git remote add upstream https://github.com/luizcurti/nodejs-rentalx.git

# 4. Install dependencies
npm install

# 5. Create a feature branch
git checkout -b feature/amazing-feature

# 6. Make your changes and commit
git commit -m "feat: add amazing feature"

# 7. Push to your fork and create a Pull Request
git push origin feature/amazing-feature
```

### Coding Standards

- **Naming**: PascalCase for classes, camelCase for variables/functions
- **Interfaces**: Prefix with `I` (e.g., `IUsersRepository`)
- **Files**: camelCase (e.g., `createUserUseCase.ts`)
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

### Pull Request Process

1. Ensure tests pass: `npm test`
2. Lint your code: `npm run lint`
3. Format your code: `npm run format`
4. Update documentation if needed
5. Create a Pull Request with a clear description