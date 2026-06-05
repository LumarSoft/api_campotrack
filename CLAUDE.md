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

**Framework:** NestJS v11 with TypeScript (target ES2023, `nodenext` module resolution).

**Database:** PostgreSQL via Prisma v7. The Prisma client is generated to `generated/prisma` (not the default `node_modules/@prisma/client`) — always import from `../../generated/prisma` (or the relative path to that directory).

**Auth stack (packages installed, modules not yet scaffolded):** `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt` — JWT-based authentication is the intended pattern.

**Env vars:** `DATABASE_URL` is required for Prisma (loaded via `dotenv/config` in `prisma.config.ts`). Server port defaults to `3000` (`process.env.PORT`).

**DTO validation:** `class-validator` + `class-transformer` are installed; use `ValidationPipe` globally when adding the first controller that accepts a request body.

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
