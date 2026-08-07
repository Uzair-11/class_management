# JIH Sewing Classes Management System — Production Deployment Guide

This document outlines the infrastructure, environment variables, build procedures, and security verification checklist for deploying the JIH Sewing Classes Management System to production environments.

---

## 🏗️ Architecture Overview & Hosting Recommendations

The application is structured as a decoupled full-stack web application:

- **Backend API**: Node.js & Express application requiring persistent web server hosting (e.g. Render Web Service, Railway, AWS ECS, or DigitalOcean App Platform).
- **Database**: PostgreSQL 14+ database with persistent disk storage (e.g. Render Postgres, Railway Postgres, AWS RDS PostgreSQL, or Supabase).
- **Frontend Single Page App**: Static SPA build generated via Vite, deployed to global CDN edge networks (e.g. Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront).

---

## 🔑 Required Production Environment Variables

### Backend Configuration (`backend/.env`)

| Variable Name | Required | Description / Value Example |
|---|---|---|
| `PORT` | Optional | Port for Express server (default `5000` or assigned automatically by host `$PORT`) |
| `DATABASE_URL` | **Yes** | Full PostgreSQL connection string (`postgres://user:password@db-host:5432/jih_db?sslmode=require`) |
| `JWT_SECRET` | **Yes** | Cryptographically random secret string used to sign short-lived access tokens (~64+ random hex chars) |
| `REFRESH_TOKEN_SECRET` | **Yes** | Cryptographically random secret string used to sign long-lived refresh token cookies |
| `FRONTEND_URL` | **Yes** | Fully qualified production frontend origin URL (e.g. `https://sewing.jamaateislamihind.org` or `https://jih-sewing.vercel.app`) |
| `NODE_ENV` | **Yes** | Must be set strictly to `production` |

### Frontend Build Configuration (`frontend/.env.production`)

| Variable Name | Required | Description / Value Example |
|---|---|---|
| `VITE_API_BASE_URL` | Optional | Production backend base URL if API proxying is not used (e.g. `https://api-sewing.jamaateislamihind.org`) |

---

## 🗄️ Database Initialization & Seed Rules

### 1. Execute Base Relational Schema
Run `backend/schema.sql` against the production PostgreSQL instance to create all required tables, foreign key constraints, indexes, and initial default course catalog:

```bash
psql $DATABASE_URL -f backend/schema.sql
```

### 2. Initial Admin Account Creation (Production Seed)
> ⚠️ **CRITICAL PRODUCTION WARNING**: Do **NOT** run `node backend/tests/seedTestDb.js` in production! That script inserts synthetic test branches, dummy student rows, and default test login accounts.

Instead, execute the initial admin seed script or run a custom SQL insert to create a single initial System Administrator account with a secure password hash:

```sql
-- Production initial admin account creation (Change phone and password_hash before executing)
INSERT INTO users (name, phone, email, password_hash, role, status)
VALUES ('System Admin', '9000000001', 'admin@jamaateislamihind.org', '$2b$10$...YOUR_BCRYPT_HASH...', 'admin', 'active')
ON CONFLICT (phone) DO NOTHING;
```

---

## 🛠️ Build & Deployment Procedure

### Backend Service Build
```bash
# Navigate to backend directory
cd backend

# Install production dependencies only
npm install --only=production

# Start production server
NODE_ENV=production node app.js
```

### Frontend Static Build
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Generate optimized production distribution bundle in dist/
npm run build
```
Upload the generated `frontend/dist/` directory contents to your web hosting CDN provider (Vercel, Netlify, or AWS S3).

---

## 🔒 Production Security Verification Checklist

Before opening the production URL to staff users, complete the following verification steps:

- [ ] **`NODE_ENV=production`**: Verify `NODE_ENV` is set to `production` in backend environment settings. This ensures `SameSite=Strict, Secure` flags are applied to HTTP refresh cookies.
- [ ] **HTTPS Transport Enforcement**: Ensure SSL/TLS certificates are active on frontend and backend domains. Confirm HTTP requests redirect automatically to HTTPS at the proxy/load balancer layer.
- [ ] **CORS Origin Matching**: Confirm `FRONTEND_URL` matches the exact domain hosting the React app. Verify wildcard `*` origins are absent.
- [ ] **Secret Strength**: Confirm `JWT_SECRET` and `REFRESH_TOKEN_SECRET` use strong random 256-bit keys and differ from development secrets.
- [ ] **Rate Limiting Active**: Test calling `/api/auth/login` repeatedly to confirm rate limiters (`429 Too Many Requests`) trigger after consecutive invalid attempts.
- [ ] **File Upload Isolation**: Verify uploaded template files in `backend/uploads/templates/` have execute permissions disabled on the host filesystem.

---

## 🧪 Post-Deployment Smoke Test Checklist

Execute these 4 manual verification steps on the live production URL:

1. **Authentication Smoke Test**: Log in with the initial admin account. Verify successful redirect to `/dashboard` and confirm access token is absent from `localStorage`.
2. **Attendance Marking Smoke Test**: Select a branch, mark 1 student Present, click Save, and refresh the page to verify state persistence.
3. **Fee Payment Smoke Test**: Record a fee payment for a test student and verify the fee cycle badge updates to **PAID**.
4. **Certificate Rendering Smoke Test**: Upload a certificate template background image, position text fields, save positions, and render a preview.
