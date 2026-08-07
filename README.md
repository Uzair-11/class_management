# Jamaat-e-Islami Hind (JIH) Sewing Classes Management System

> A full-stack web application designed for Jamaat-e-Islami Hind (JIH) to manage branch operations, staff, student admissions, attendance, monthly fee cycles, examinations, custom certificate issuance, sewing machines, maintenance, expenses, salaries, and role-based analytics.

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green) ![React](https://img.shields.io/badge/React-v18-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v14%2B-blue) ![Express](https://img.shields.io/badge/Express-v4.19-lightgrey) ![License](https://img.shields.io/badge/License-Proprietary-red)

---

## 📌 Problem Statement

Jamaat-e-Islami Hind (JIH) operates multiple vocational sewing centers across urban and rural branches to empower women through skill development. Managing attendance, fee collection, relief discounts, machine maintenance, certificate issuance, and branch finance across disparate spreadsheets created operational bottlenecks, data inconsistencies, and delayed reporting.

This system provides a unified, secure platform with role-based access control (RBAC), row-locked daily attendance, dynamic certificate visual field positioning, monthly fee cycle tracking, and organization-wide financial oversight.

*For full background and architectural objectives, read [docs/01_Problem_Statement.md](file:///c:/Users/Uzair/Documents/JIH/docs/01_Problem_Statement.md).*

---

## ✨ Key Features List

### 🔐 Authentication & Session Management
- **Short-Lived Access Tokens**: Signed JWTs with 15-minute validity stored securely in memory.
- **HTTP-Only Refresh Cookies**: Long-lived 7-day refresh tokens set in `SameSite=Strict`, `httpOnly` cookies with server-side revocation tracking in PostgreSQL.
- **Account Lockout Protection**: In-memory rate limiting locks accounts for 15 minutes after 5 consecutive failed login attempts.

### 🏢 Branch & User Administration
- **Branch Management**: Create, edit, and assign teachers, supervisors, and amirs to single or multiple branches.
- **One Teacher, One Branch Rule**: Enforces that a teacher cannot be assigned to multiple active branches simultaneously.
- **User Roles & Hierarchy**: Roles include `admin`, `amir`, `supervisor`, and `teacher` with strict resource-level permission boundaries.

### 👩‍🎓 Student Admissions & Fee Cycles
- **Student Registration**: Admissions with fee relief management (`none`, `partial`, `full`).
- **Live Fee Calculation**: Dynamic real-time calculation of final payable fee based on course base fee minus relief discount.
- **Monthly Fee Cycle Automation**: Automatic generation of monthly fee cycles upon student admission and automated tracking of due vs. paid cycles.

### 📅 Attendance & Leave Requests
- **Row-Level UI Lock-In**: Interactive Present/Absent toggles per student row that lock upon selection and display a secondary "Change" button before final submission.
- **Historical Attendance Locking**: System automatically locks historical attendance dates to prevent non-admin tampering.
- **Student Leave Requests**: Student leave submission and approval workflow. Approved leaves automatically create `leave` status attendance records and exclude the dates from attendance percentage denominators.

### 📜 Exam Results & Custom Certificate Visual Positioning
- **Exam Recording**: Track exam scores, pass/fail status, and issue dates.
- **Visual Certificate Field Positioning**: Admins can upload background templates (PNG/JPG/PDF) and drag/position dynamic fields (Student Name, Course, Branch, Certificate No, Exam Result, Date) directly on a visual canvas editor without code changes.

### ⚙️ Sewing Machines & Maintenance Tracking
- **Machine Registry**: Register sewing machines by serial number, machine number, model, purchase date, and branch allocation.
- **Maintenance Lifecycle**: Track status transitions (`working`, `needs_maintenance`, `under_repair`, `scrapped`) and maintain service logs.

### 💰 Finance, Salaries & Expenses
- **Branch Balance Calculation**: Computes real-time branch financial standing (Total Fee Payments Received − Branch Expenses − Staff Salaries).
- **Shortfall Disclaimer Banner**: Renders explicit JIH accounting disclaimer banners and shortfall styling for branches operating at negative balances covered by headquarters.

### 📊 Dashboard & Analytics
- **Role-Tailored Analytics**:
  - **Teachers**: Single-branch student counts, daily attendance view, and fee status summaries.
  - **Supervisors & Amirs**: Multi-branch oversight dashboard comparing performance across assigned branches.
  - **Admins**: Organization-wide aggregates, revenue totals, user management, and system configuration.

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology / Package | Purpose |
|---|---|---|
| **Database** | PostgreSQL 14+ / `pg` pool | Relational storage, relational integrity, parameterized SQL |
| **Backend API** | Node.js, Express v4.19 | REST API web server architecture |
| **Security Tooling** | `helmet`, `express-rate-limit`, `xss`, `express-validator`, `bcryptjs` | Request rate limiting, HTTP security headers, XSS sanitization, schema validation, password hashing |
| **Authentication** | `jsonwebtoken`, `cookie-parser` | Access JWT tokens & HTTP-Only refresh cookies |
| **File Storage** | `multer`, `crypto.randomUUID()` | Template file upload handling with strict MIME filtering |
| **Frontend UI** | React 18, Vite | Component-driven Single Page Application |
| **Routing & Client** | `react-router-dom`, Custom fetch wrapper | Client routing, automatic silent refresh interceptors |
| **Testing** | Jest, Supertest, Playwright | Unit/API tests (Jest) & End-to-End browser tests (Playwright) |

---

## 📸 Screenshots

<!-- NOTE: Real production screenshots to be added manually to assets/ directory -->

| Page | Preview | Caption |
|---|---|---|
| **Login Page** | ![Login Mockup](file:///c:/Users/Uzair/Documents/JIH/assets/login_preview.png) | *Secure portal login with phone number authentication and show/hide password toggle.* |
| **Dashboard** | ![Dashboard Mockup](file:///c:/Users/Uzair/Documents/JIH/assets/dashboard_preview.png) | *Role-tailored analytics overview displaying branch performance, attendance metrics, and financial standing.* |
| **Student Directory** | ![Students Directory](file:///c:/Users/Uzair/Documents/JIH/assets/students_preview.png) | *Student list displaying fee relief badges, course details, and real-time balance status.* |
| **Attendance Sheet** | ![Attendance Sheet](file:///c:/Users/Uzair/Documents/JIH/assets/attendance_preview.png) | *Daily attendance interface with row-level Present/Absent locking and Change action.* |
| **Branch Finance** | ![Finance View](file:///c:/Users/Uzair/Documents/JIH/assets/finance_preview.png) | *Branch income, salary/expense log, and JIH shortfall accounting disclaimer banner.* |
| **Certificate Editor** | ![Certificate Editor](file:///c:/Users/Uzair/Documents/JIH/assets/certificate_editor_preview.png) | *Drag-and-drop visual canvas editor for positioning certificate text fields over uploaded templates.* |

---

## 🏗️ Architecture & Security Model

```
                    +---------------------------------------+
                    |             React SPA                 |
                    |       (React Router + Vite)           |
                    +---------------------------------------+
                                   |         ^
                Bearer Access Token|         | httpOnly Cookie
                (In-Memory Header) |         | (Refresh Token)
                                   v         |
                    +---------------------------------------+
                    |            Express API                |
                    |  - Helmet Security Headers            |
                    |  - Rate Limiters (Auth & API)         |
                    |  - Input Validation & XSS Sanitize    |
                    |  - Branch-Level IDOR Authorization    |
                    +---------------------------------------+
                                       |
                                       v
                    +---------------------------------------+
                    |        PostgreSQL Database            |
                    |  - Users, Branches, Students          |
                    |  - Attendance, Fees, Exams            |
                    |  - Refresh Tokens, Cert Templates     |
                    +---------------------------------------+
```

### Role-Based Access Hierarchy
- **Admin**: Complete access across all organization branches, users, templates, and finances.
- **Amir**: Multi-branch read-only performance oversight for assigned branches.
- **Supervisor**: Multi-branch operational management, leave request approval, and holiday declaration.
- **Teacher**: Single-branch operational execution (daily attendance, student profile view, exam score entry).

*For database ERD details and test specs, refer to [docs/04_Test_Plan.md](file:///c:/Users/Uzair/Documents/JIH/docs/04_Test_Plan.md).*

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14.0` or higher

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/axiom-technologies/jih-sewing-system.git
cd JIH

# Install root & backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Variables Configuration
Create a `.env` file inside the `backend/` directory. Refer to `.env.example` for variable names:

```ini
PORT=5000
DATABASE_URL=postgres://postgres:password@localhost:5432/jih_db
JWT_SECRET=your_super_secret_access_jwt_key
REFRESH_TOKEN_SECRET=your_super_secret_refresh_jwt_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Database Initialization
```bash
# Create local PostgreSQL database
createdb -U postgres jih_db

# Run relational database schema migrations
psql -U postgres -d jih_db -f backend/schema.sql

# Seed test database users and initial branches
node backend/tests/seedTestDb.js
```

### 4. Running the Application Locally
```bash
# Start both Backend API (Port 5000) and Frontend Dev Server (Port 5173) concurrently
npm start

# Alternatively, run backend or frontend individually:
npm run server    # Backend Express API server
npm run client    # Frontend Vite React server
```

---

## 🧪 Testing & Quality Assurance

The application features a 100% automated unit, API integration, and Playwright end-to-end test suite.

```bash
# Run privacy & personal data check (verifies fake test numbers 9000000XXX)
npm run check-privacy

# Run backend API unit & integration test suite (Jest + Supertest)
npm run test

# Run frontend end-to-end browser test suite (Playwright)
npm run test:e2e
```

### Verified Test Suite Status:
- **Jest Backend API Suite**: **12/12 Suites Passed** (97/97 tests passing)
- **Playwright Frontend E2E Suite**: **17/17 Specs Passed** (100% passing)

*Note: All test data uses non-routable dummy numbers (`9000000001` - `9000000005`).*

---

## 🔒 Security Hardening

- **Access Token & Cookie Refresh Pattern**: Access tokens expire in 15 minutes; refresh tokens are stored in `httpOnly`, `SameSite=Strict` cookies and hashed on the server.
- **Resource-Level IDOR Protection**: `verifyBranchAccess` middleware restricts teachers and supervisors to authorized branch resource IDs.
- **Schema Validation & XSS Filtering**: `express-validator` checks types/lengths on every POST/PUT route; `xss` sanitizes free-text strings.
- **Rate Limiting & Account Lockout**: Auth routes limited to 5 attempts before a 15-minute lock out; general API routes rate-limited.
- **Parameterized SQL Queries**: 100% of database interactions use `$1, $2` parameters via `pg`.

*For production security configuration, read [docs/DEPLOYMENT_GUIDE.md](file:///c:/Users/Uzair/Documents/JIH/docs/DEPLOYMENT_GUIDE.md).*

---

## 📜 License & Copyright

Proprietary Software — All Rights Reserved. Copyright (c) 2026 Uzer Shaikh, Axiom Technologies.  
*Read the full license terms in [LICENSE](file:///c:/Users/Uzair/Documents/JIH/LICENSE).*

---

## 🤝 Contributing

Contributions to this private repository are governed by internal development standards.  
*Read developer guidelines and test standards in [CONTRIBUTING.md](file:///c:/Users/Uzair/Documents/JIH/CONTRIBUTING.md).*
