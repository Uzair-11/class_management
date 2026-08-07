# Agile Project Plan
## JIH Sewing Classes Management System

Methodology: Scrum-inspired, single-developer execution with AI-assisted
implementation. Each sprint below corresponds to a cohesive, independently
testable increment — matching how the project was actually built.

---

## 1. Epics

| Epic ID | Epic | Description |
|---|---|---|
| E1 | Foundation | Schema, architecture, auth |
| E2 | Core Operations | Branches, users, students, courses |
| E3 | Attendance & Leave | Daily attendance, holidays, locking, leave workflow |
| E4 | Finance | Fees, payments, expenses, salaries, branch finance |
| E5 | Academics | Examinations, certificates, certificate templates |
| E6 | Assets | Machines and maintenance |
| E7 | Insights | Reports and role-based dashboards |
| E8 | Experience | UI/branding, UX refinement |
| E9 | Quality | Automated testing (backend + frontend) |
| E10 | Security | Hardening across CIA triad |
| E11 | Delivery | Documentation, deployment |

---

## 2. Sprint Breakdown

### Sprint 0 — Discovery & Design
- Gather functional specification from stakeholder (JIH)
- Design database schema (16+ entities) and system design document
- Select tech stack: PostgreSQL, Node.js/Express, React, JWT
- **Deliverables:** `schema.sql`, System Design Document
- **Epic:** E1

### Sprint 1 — Authentication Foundation
- Login page, temporary Register page (for dev seeding)
- JWT issuance, password hashing, protected route middleware
- **Deliverables:** Working login flow
- **Epic:** E1

### Sprint 2 — Branches & Users
- Branch CRUD, teacher/supervisor/amir assignment mapping
- User management (admin-only)
- **Epic:** E2

### Sprint 3 — Students & Courses
- Course seed data, student CRUD, fee-at-enrollment + relief handling
- **Epic:** E2

### Sprint 4 — Attendance (v1)
- Daily attendance sheet, present/absent marking, per-student history
- **Epic:** E3

### Sprint 5 — Holidays
- Branch-specific and org-wide holiday declarations
- Integration: attendance blocked on holiday dates
- **Epic:** E3

### Sprint 6 — Fees & Payments (v1: one-time)
- Fee payment recording against enrollment fee, balance tracking
- **Epic:** E4

### Sprint 7 — Examinations & Certificates (v1)
- Exam result recording, auto-certificate generation (pass or fail)
- **Epic:** E5

### Sprint 8 — Machines & Maintenance
- Machine inventory, maintenance logs, auto-linked branch expense
- **Epic:** E6

### Sprint 9 — Finance
- Expenses, salaries, JIH support/surplus accounting entries
- Branch finance summary view
- **Epic:** E4

### Sprint 10 — Reports & Dashboard
- Role-aware dashboard (teacher/supervisor/amir/admin)
- Attendance % and fee collection reports
- **Epic:** E7

### Sprint 11 — UI/Branding Pass
- Redesign to match JIH's brand identity (colors from official logo,
  typography, layout)
- UX review and fixes: navigation grouping, status-color consistency,
  attendance selection states
- **Epic:** E8

### Sprint 12 — Feature Expansion
- **Monthly recurring fee cycles** (replacing one-time fee model)
- **Attendance locking fix** (server-enforced, row-level selection UX)
- **Student leave request workflow** (submit → approve/reject → reflected
  in attendance, excluded from attendance % calculation)
- **Epic:** E3, E4

### Sprint 13 — Certificate Templates
- Admin-uploadable certificate template (image/PDF)
- Draggable field positioning, dynamic data overlay at render time
- **Epic:** E5

### Sprint 14 — Automated Testing
- Test plan authored (~100 test cases across 12 functional areas)
- Backend suite: Jest + Supertest (97 tests)
- Frontend suite: Playwright (17 tests)
- Bug fixes surfaced directly by test failures (salary date parsing,
  attendance lock response, fee cycle boundary bug, certificate
  template routing, etc.)
- **Epic:** E9

### Sprint 15 — Security Hardening
- Input validation & sanitization (express-validator, XSS protection)
- IDOR/access-control audit and fix (branch-scoped authorization helper)
- Rate limiting & brute-force lockout
- Secure headers, CORS policy, centralized error handling
- File upload hardening
- Refresh-token authentication architecture (access + httpOnly refresh
  token, replacing an interim localStorage approach)
- **Epic:** E10

### Sprint 16 — Privacy Audit
- Full-repository scan for accidentally-committed personal data
- Test data convention established (fake phone number series)
- **Epic:** E10

### Sprint 17 — Documentation *(current)*
- Problem statement, Agile plan, WBS
- README, API documentation, User Manual, Deployment Guide,
  CONTRIBUTING + LICENSE
- **Epic:** E11

### Sprint 18 — Deployment *(planned)*
- Database, backend, and frontend hosting setup
- Environment configuration, HTTPS enforcement
- **Epic:** E11

---

## 3. Product Backlog (Not Yet Scheduled)

| Item | Priority | Notes |
|---|---|---|
| Inventory management (beyond machines) | Low | Noted as future scope in original spec |
| SMS/WhatsApp notifications | Low | Noted as future scope in original spec |
| Class timing history log | Medium | Flagged during schema design |
| Refresh token rotation | Medium | Partial implementation; rotation on each refresh not yet confirmed |
| Redis-backed rate limiting/lockout | Low | Current implementation is in-memory, single-instance only |

---

## 4. Definition of Done (applied per sprint)

A sprint's work is considered done when:
1. Feature implemented per the agreed prompt/spec for that sprint
2. Manually verified in the running application
3. Covered by at least one automated test where applicable (from
   Sprint 14 onward)
4. No regression in previously passing automated tests
5. No known security gap introduced (from Sprint 15 onward, verified
   against the CIA checklist)
