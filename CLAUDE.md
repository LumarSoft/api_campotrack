# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm run start:dev       # watch mode (preferred for development)
pnpm run build           # compile to dist/
pnpm run start:prod      # run compiled output

# Testing
pnpm run test            # unit tests (jest, rootDir: src, pattern: *.spec.ts)
pnpm run test:watch      # watch mode
pnpm run test:cov        # coverage report
pnpm run test:e2e        # e2e tests (test/jest-e2e.json config)

# Single test file
pnpm run test -- --testPathPattern=app.controller

# Code quality
pnpm run lint            # eslint with auto-fix
pnpm run format          # prettier write

# Prisma
npx prisma migrate dev   # create and apply migration
npx prisma generate      # regenerate client after schema changes
npx prisma studio        # visual DB browser
```

## Architecture

**Framework:** NestJS v11 with TypeScript (target ES2022, `CommonJS` module / `node` resolution).

**Database:** MySQL via Prisma v7 (using `@prisma/adapter-mariadb`). The Prisma client is generated to `generated/prisma` (gitignored — run `npx prisma generate` after cloning). Always import from `'generated/prisma/client'` (resolved via `baseUrl: "./"` in tsconfig).

**Auth stack (packages installed, modules not yet scaffolded):** `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt` — JWT-based authentication is the intended pattern.

**Env vars:** `DATABASE_URL` is required for Prisma (loaded via `dotenv/config` in `main.ts`). Server port defaults to `3000` (`process.env.PORT`). Copy `.env.example` → `.env` and fill in the values.

**DTO validation:** `ValidationPipe` is configured globally in `main.ts` with `whitelist`, `forbidNonWhitelisted`, and `transform`. Use `class-validator` decorators on all DTOs.

**Module structure:** Standard NestJS feature modules — each domain gets its own directory under `src/` with `module`, `controller`, `service`, and `dto/` files. Register new modules in `AppModule`.

**Code style:** Single quotes, trailing commas (enforced by Prettier). `noImplicitAny` is off; `strictNullChecks` is on.

## Rules

See @docs/rules/architecture.md for module structure rules.
See @docs/rules/database.md for Prisma and MySQL rules.
See @docs/rules/validation.md for DTO and validation rules.
See @docs/rules/error-handling.md for error handling rules.
See @docs/rules/security.md for security rules.
See @docs/rules/naming.md for naming conventions.
See @docs/rules/commits.md for commit conventions.
See @docs/rules/documentation.md for endpoint documentation rules.
