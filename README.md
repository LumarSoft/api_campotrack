# CampoTrack API

REST API built with NestJS, Prisma v7, and MySQL.

## Prerequisites

- Node.js
- pnpm
- MySQL server running locally

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your values:

```
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/nombre_db"
JWT_SECRET="cualquier_string_largo_y_random"
JWT_EXPIRES_IN="7d"
```

> The database (`nombre_db`) must exist in MySQL before running migrations:
> ```sql
> CREATE DATABASE nombre_db;
> ```

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Run migrations

```bash
npx prisma migrate dev
```

### 5. Start the server

```bash
pnpm run start:dev
```

The API will be available at `http://localhost:3000`.

---

## Daily development

```bash
pnpm run start:dev
```

## After modifying `prisma/schema.prisma`

```bash
npx prisma migrate dev --name describe-what-changed
```

> `migrate dev` runs `generate` internally. If you only change types without a migration, run `npx prisma generate` manually.

---

## Available commands

```bash
# Development
pnpm run start:dev       # watch mode
pnpm run build           # compile to dist/
pnpm run start:prod      # run compiled output

# Testing
pnpm run test            # unit tests
pnpm run test:watch      # watch mode
pnpm run test:cov        # coverage report
pnpm run test:e2e        # e2e tests

# Code quality
pnpm run lint            # eslint with auto-fix
pnpm run format          # prettier

# Prisma
npx prisma migrate dev   # create and apply migration
npx prisma generate      # regenerate client after schema changes
npx prisma studio        # visual DB browser
```
