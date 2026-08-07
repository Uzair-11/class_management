# Contributing Guidelines

Thank you for contributing to the Jamaat-e-Islami Hind (JIH) Sewing Classes Management System. This private project adheres to strict security, architectural, and data privacy standards.

---

## 🛠️ Local Development Setup

Refer to the main [README.md](file:///c:/Users/Uzair/Documents/JIH/README.md) for detailed prerequisites, PostgreSQL setup, environment configuration, and local dev server commands (`npm start`).

---

## 🌿 Branching & Commit Conventions

We follow a feature-branch workflow with conventional commit messages:

### Branch Naming Format:
- `feature/<short-description>` (e.g. `feature/attendance-bulk-lock`)
- `fix/<short-description>` (e.g. `fix/refresh-token-expiry`)
- `docs/<short-description>` (e.g. `docs/api-update`)

### Commit Message Syntax:
Follow Conventional Commits: `<type>(<scope>): <short description>`
- `feat(auth): add rate limiting on refresh endpoint`
- `fix(attendance): resolve row lock button toggle bug`
- `test(students): add unit test for partial relief calculation`

---

## 🔒 Security & Input Validation Requirements

1. **Schema Validation on All Endpoints**:
   - Every new POST, PUT, or DELETE endpoint added to Express must define an `express-validator` schema in [`backend/middleware/validators.js`](file:///c:/Users/Uzair/Documents/JIH/backend/middleware/validators.js#L1).
   - Endpoints must reject invalid payload formats with `400 Bad Request`.

2. **Branch Authorization & IDOR Protection**:
   - All branch-scoped resource routes must verify authorization using [`verifyBranchAccess(user, branchId)`](file:///c:/Users/Uzair/Documents/JIH/backend/middleware/auth.js#L60) middleware.
   - Never trust client-supplied `branch_id` params without checking token role jurisdiction.

3. **XSS Sanitization & Parameterized Queries**:
   - Apply `sanitizeRequestBody` middleware on free-text routes.
   - Use parameterized SQL queries (`$1, $2`) for all database operations. Never concatenate strings into raw SQL queries.

---

## 🛡️ Privacy & Test Data Standard

> ⚠️ **CRITICAL PRIVACY RULE**: Real personal information (phone numbers, personal emails, residential addresses) must **NEVER** be committed to source control or inserted into test seed files.

### The `90000000XX` Fake Number Convention:
All seed scripts, unit tests, and Playwright E2E fixtures must use the standard non-routable dummy numbers:
- `9000000001`: System Admin
- `9000000002`: Amir Leader
- `9000000003`: Area Supervisor
- `9000000004`: Class Teacher (Branch 1)
- `9000000005`+: Sequential dummy numbers for additional test users / students

Run the automated privacy check before committing code:
```bash
npm run check-privacy
```

---

## 🧪 Testing Guidelines

Before submitting any code changes or opening a pull request, you must ensure both test suites execute cleanly with 100% pass rates:

```bash
# 1. Run privacy scan
npm run check-privacy

# 2. Run backend API unit test suite
npm run test

# 3. Run frontend E2E Playwright suite
npm run test:e2e
```

New features must include accompanying Jest unit test cases in `backend/tests/` and UI integration specs in `e2e/` where applicable.
