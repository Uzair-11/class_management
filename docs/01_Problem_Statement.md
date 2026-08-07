# Problem Statement
## JIH Sewing Classes Management System

---

### 1. Background

Jamaat-e-Islami Hind (JIH) operates sewing training classes across
multiple branches as part of its community welfare and skill-development
work. Each branch runs under a shared three-tier oversight structure
(Amir-e-Muqami, Supervisor, Teacher) and independently manages student
admissions, attendance, fee collection, examinations, equipment, and
day-to-day operating expenses.

### 2. Current State

All of the above is currently managed manually — through registers,
paper records, and informal tracking. This creates several operational
gaps:

- **No centralized visibility.** Supervisors and Amir-e-Muqami overseeing
  multiple branches have no consolidated way to see attendance, fee
  collection, or financial health across their branches without visiting
  each one or requesting reports individually.
- **Manual fee tracking is error-prone.** With fee relief (partial/full
  waivers) applied inconsistently by branch, and now a recurring monthly
  fee cycle, tracking who has paid, who is overdue, and what relief was
  granted is difficult to do reliably by hand.
- **Attendance and leave have no audit trail.** Paper attendance can be
  altered after the fact with no record of who marked it or when, and
  there's no formal process for a student's leave to be requested,
  approved, and reflected consistently in attendance history.
- **No linkage between operational events and finances.** A machine
  repair, for instance, is recorded separately from the branch's expense
  ledger, so the true cost of running a branch is hard to calculate
  accurately or quickly.
- **Certificates are manually prepared** for every student regardless of
  pass/fail outcome, with no standardized, reusable process tied to
  actual student and exam records.

### 3. Problem Statement

> Jamaat-e-Islami Hind needs a centralized, role-based digital system to
> manage its multi-branch sewing training program — covering student
> admissions, monthly fee collection with relief handling, daily
> attendance with an approvable leave process, examinations and
> certificate issuance, machine inventory and maintenance, and full
> branch-level financial tracking — replacing fragmented manual record-
> keeping with a single, auditable, secure platform accessible from any
> browser.

### 4. Objectives

1. Provide role-scoped access (Admin, Amir-e-Muqami, Supervisor, Teacher)
   so each user sees and manages exactly the branches/data relevant to
   their role.
2. Automate monthly fee cycle generation and tracking, including relief
   handling, without manual recalculation.
3. Digitize daily attendance with a tamper-resistant locking mechanism
   and a formal student leave request/approval workflow.
4. Automatically link operational costs (e.g. machine maintenance) to
   branch financial records to keep expense tracking accurate without
   duplicate manual entry.
5. Standardize examination result recording and certificate issuance
   using JIH's actual certificate format.
6. Give supervisory roles (Amir-e-Muqami, Supervisor, Admin) a
   consolidated, real-time view of branch performance — attendance,
   finances, and machine status — across all branches under their
   purview.
7. Secure the system to a professional standard (authentication,
   authorization, input validation, and standard web security
   practices) given it will handle personal and financial data.

### 5. Scope

**In scope:** Everything described in the original functional
specification — organization hierarchy, branch management, courses,
students, monthly fees with relief, attendance with holidays and leave,
examinations and certificates (using JIH's certificate template),
machine and maintenance tracking, branch expenses/salaries/JIH
financial-support accounting, and role-based reporting/dashboards.

**Out of scope (for this version):** Inventory management beyond sewing
machines, SMS/WhatsApp notifications, and any public-facing
enrollment/registration portal — noted as possible future extensions in
the original spec, not built in this phase.

### 6. Stakeholders

| Stakeholder | Interest |
|---|---|
| Jamaat-e-Islami Hind (organization) | Accurate, centralized oversight of branch operations and finances |
| Amir-e-Muqami | Oversight and performance review across assigned branches |
| Supervisor | Day-to-day monitoring of teachers, attendance, fees, and maintenance |
| Teacher | Simple daily tools for attendance, student records, and classroom management |
| Students | Accurate fee/attendance records, fair leave process, timely certificates |

### 7. Success Criteria

- All core workflows (admission → attendance → fee collection → exam →
  certificate) can be completed entirely within the system, with no
  parallel manual record-keeping required.
- Every role sees only the data they are authorized to see, verified
  through automated role-based access control testing.
- Branch financial summaries are always accurate and derived
  automatically from logged transactions, with no manual reconciliation
  step required.
- The system passes a full automated test suite (functional and
  security) before being considered production-ready.
