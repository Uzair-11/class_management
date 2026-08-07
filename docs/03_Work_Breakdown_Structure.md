# Work Breakdown Structure (WBS)
## JIH Sewing Classes Management System

---

## 1.0 Project Initiation
- 1.1 Gather requirements from stakeholder (JIH)
- 1.2 Define problem statement and scope
- 1.3 Select technology stack (PostgreSQL, Node/Express, React, JWT)

## 2.0 System Design
- 2.1 Entity-relationship design (16+ entities)
- 2.2 Database schema (`schema.sql`) — tables, enums, constraints, views
- 2.3 System design & architecture document
- 2.4 Role/access model definition (Admin, Amir-e-Muqami, Supervisor, Teacher)

## 3.0 Backend Development
- 3.1 Authentication
  - 3.1.1 Login endpoint, JWT issuance
  - 3.1.2 Access token + refresh token architecture
  - 3.1.3 Role-based route middleware
- 3.2 Branches & Users module
  - 3.2.1 Branch CRUD
  - 3.2.2 Teacher/supervisor/amir assignment mapping
  - 3.2.3 User CRUD (admin-only)
- 3.3 Students & Courses module
  - 3.3.1 Course seed data
  - 3.3.2 Student CRUD, relief calculation
- 3.4 Attendance module
  - 3.4.1 Daily attendance marking, upsert logic
  - 3.4.2 Holiday-based blocking
  - 3.4.3 Date-level locking (server-enforced)
  - 3.4.4 Leave-driven attendance override
- 3.5 Holidays module
  - 3.5.1 Branch-specific and org-wide holiday CRUD
- 3.6 Fees module
  - 3.6.1 Monthly fee cycle generation logic
  - 3.6.2 Payment recording, balance/status calculation
  - 3.6.3 Overdue detection
- 3.7 Examinations & Certificates module
  - 3.7.1 Exam result recording
  - 3.7.2 Certificate auto-generation
  - 3.7.3 Certificate template upload, field positioning, render engine
- 3.8 Machines module
  - 3.8.1 Machine inventory CRUD
  - 3.8.2 Maintenance logging with auto-linked expense creation
- 3.9 Finance module
  - 3.9.1 Expense and salary CRUD
  - 3.9.2 JIH support/surplus accounting entries
  - 3.9.3 Branch finance summary view
- 3.10 Leave Requests module
  - 3.10.1 Submission, approval/rejection workflow
  - 3.10.2 Attendance integration on approval
- 3.11 Reports module
  - 3.11.1 Attendance reports
  - 3.11.2 Fee collection reports
  - 3.11.3 Role-scoped overview endpoint

## 4.0 Frontend Development
- 4.1 Auth pages (Login, temporary Register)
- 4.2 Role-aware navigation and dashboard
- 4.3 Branch/User management pages
- 4.4 Student directory and profile pages
- 4.5 Attendance sheet UI (row-level selection states, lock/read-only states)
- 4.6 Holiday management UI
- 4.7 Fee cycle UI, payment recording
- 4.8 Examination and certificate UI, certificate template editor
- 4.9 Machine and maintenance UI
- 4.10 Finance dashboard UI
- 4.11 Leave request UI (submission + approval)
- 4.12 Reports UI
- 4.13 UI/branding pass (JIH color palette, typography, layout)

## 5.0 Quality Assurance
- 5.1 Test plan authoring (~100 test cases, 12 functional areas)
- 5.2 Backend automated testing (Jest + Supertest)
  - 5.2.1 Test environment/seed setup
  - 5.2.2 Implementation of all test cases
  - 5.2.3 Bug triage and fixes from failures
- 5.3 Frontend automated testing (Playwright)
  - 5.3.1 E2E spec authoring per feature
  - 5.3.2 Bug triage and fixes from failures
- 5.4 Manual verification / spot-checks

## 6.0 Security Hardening
- 6.1 Input validation & sanitization
- 6.2 Access control / IDOR audit
- 6.3 Rate limiting & brute-force protection
- 6.4 Secure headers, CORS, HTTPS considerations
- 6.5 File upload security
- 6.6 Secrets & error-handling audit
- 6.7 Password/token hygiene review
- 6.8 Personal-data / privacy audit of the repository

## 7.0 Documentation
- 7.1 Problem statement
- 7.2 Agile plan
- 7.3 Work breakdown structure (this document)
- 7.4 Test plan (completed in 5.1)
- 7.5 README
- 7.6 API documentation
- 7.7 User manual (non-technical, for JIH staff)
- 7.8 Deployment guide
- 7.9 CONTRIBUTING.md + LICENSE

## 8.0 Deployment
- 8.1 Database hosting setup
- 8.2 Backend hosting setup
- 8.3 Frontend hosting setup
- 8.4 Environment configuration & secrets management
- 8.5 HTTPS enforcement
- 8.6 Post-deployment smoke test

## 9.0 Project Closure
- 9.1 Final review against problem statement objectives
- 9.2 Handover documentation to JIH (if applicable)
- 9.3 Backlog review for future phases (inventory, notifications)
