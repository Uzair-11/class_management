# JIH Sewing Classes Management System — Test Plan

Covers: Auth, Branches/Users, Students/Courses, Attendance (incl. row locking, date locking, holidays, leave), Fees (monthly cycles), Exams & Certificates (incl. templates), Machines & Maintenance, Expenses/Salaries/Finance, Leave Requests, Reports/Dashboard, and cross-cutting role-based access control.

Format: ID | Description | Steps | Expected Result

---

## 1. Authentication

| ID | Description | Steps | Expected |
|---|---|---|---|
| AUTH-01 | Successful login | POST /api/auth/login with valid phone+password | 200, returns JWT with correct role |
| AUTH-02 | Wrong password | Login with valid phone, wrong password | 401, no token returned |
| AUTH-03 | Non-existent phone | Login with unregistered phone | 401, generic error |
| AUTH-04 | Protected route without token | Call /api/students with no Authorization header | 401 |
| AUTH-05 | Protected route with malformed token | Call with invalid JWT | 401 |
| AUTH-06 | Role middleware blocks wrong role | Teacher calls admin-only endpoint (POST /api/branches) | 403 |
| AUTH-07 | Frontend redirect | Visit protected route while logged out | Redirects to /login |
| AUTH-08 | Register route removed | Visit /register in production build | 404 / route removed |

---

## 2. Branches & Users

| ID | Description | Steps | Expected |
|---|---|---|---|
| BRU-01 | Admin creates branch | POST /api/branches with name, address, timing | 201, branch created |
| BRU-02 | Non-admin cannot create branch | Teacher/supervisor attempts POST /api/branches | 403 |
| BRU-03 | Assign teacher to branch | PUT /api/branches/:id with teacher_id | Branch.teacher_id updated |
| BRU-04 | One teacher, one branch enforced | Assign a teacher already assigned elsewhere | Flag behavior / confirm rule |
| BRU-05 | Assign supervisor to multiple branches | Map supervisor to branch A and branch B | Both mappings exist |
| BRU-06 | Assign amir to multiple branches | Map amir to branch A and branch B | Both mappings exist |
| BRU-07 | Unassign supervisor/amir | Delete mapping | Row removed |
| BRU-08 | Admin creates user | POST /api/users with role=teacher | 201, password stored as hash |
| BRU-09 | Deactivate user | DELETE /api/users/:id | status='inactive', row remains |
| BRU-10 | Inactive user cannot log in | Login attempt with inactive user | 401 |
| BRU-11 | Supervisor sees assigned branches | GET /api/branches as supervisor | Only mapped branches returned |
| BRU-12 | Amir sees assigned branches | GET /api/branches as amir | Only mapped branches returned |

---

## 3. Students & Courses

| ID | Description | Steps | Expected |
|---|---|---|---|
| STU-01 | Courses seeded | GET /api/courses | Returns Basic (₹350) and Designer (₹500) |
| STU-02 | Create student, no relief | POST /api/students with relief_type=none | Full course fee applied |
| STU-03 | Create student, partial relief | POST with relief_type=partial, relief_amount=100 | final_fee = original - 100 |
| STU-04 | Create student, full relief | POST with relief_type=full | final_fee = 0 |
| STU-05 | Relief cannot exceed fee | POST with relief_amount > course fee | 400 validation error |
| STU-06 | Teacher sees own branch students | GET /api/students as teacher | Only own branch students |
| STU-07 | Supervisor/amir see assigned | GET /api/students as supervisor | Only students in mapped branches |
| STU-08 | Admin sees all students | GET /api/students as admin | All students across branches |
| STU-09 | Branch filter works | GET /api/students?branch_id=X | Only students in branch X |
| STU-10 | Edit student details | PUT /api/students/:id | Fields updated |
| STU-11 | Change student status | PUT /api/students/:id/status to 'dropped' | Status updated |
| STU-12 | Student list balance column | GET /api/students | Includes accurate outstanding balance |

---

## 4. Attendance

| ID | Description | Steps | Expected |
|---|---|---|---|
| ATT-01 | Mark present | POST /api/attendance status=present | Row created, status=present |
| ATT-02 | Mark absent | POST /api/attendance status=absent | Row created, status=absent |
| ATT-03 | Duplicate mark same day (upsert) | POST attendance twice for same date | Updates row, no duplicate error |
| ATT-04 | Block marking on branch holiday | POST attendance on scheduled branch holiday | 400 error |
| ATT-05 | Block marking on org holiday | POST attendance on org-wide holiday | 400 error |
| ATT-06 | Frontend row: select Present | Click Present on unmarked row | Absent hides, Present fills, Change appears |
| ATT-07 | Frontend row: select Absent | Click Absent on unmarked row | Present hides, Absent fills, Change appears |
| ATT-08 | Frontend row: Change reverts | Click Change | Both buttons reappear |
| ATT-09 | Save submits all rows | Click Save Attendance | Single POST with array of records |
| ATT-10 | Lock attendance | POST /api/attendance/lock | attendance_locks row created |
| ATT-11 | Duplicate lock rejected | POST /api/attendance/lock twice | 400 error |
| ATT-12 | Locked date blocks saves | POST /api/attendance for locked date | 403 server error |
| ATT-13 | Locked date in GET | GET /api/attendance | locked: true |
| ATT-14 | Locked UI read-only | Load locked date | No buttons, banner shown |
| ATT-15 | Confirmation dialog before lock | Click Save & Lock Attendance | Confirmation modal shown |
| ATT-16 | Attendance history | GET /api/attendance/student/:id | Full history and % score |

---

## 5. Holidays

| ID | Description | Steps | Expected |
|---|---|---|---|
| HOL-01 | Admin creates branch holiday | POST /api/holidays with branch_id | Created for specific branch |
| HOL-02 | Admin creates org holiday | POST /api/holidays with branch_id=null | Created for all branches |
| HOL-03 | Supervisor creates holiday | POST /api/holidays for mapped branch | Allowed |
| HOL-04 | Supervisor blocked unassigned | POST /api/holidays for unmapped branch | 403 error |
| HOL-05 | Teacher/amir read-only | Teacher/amir POST /api/holidays | 403 error |
| HOL-06 | GET holidays includes org + branch | GET /api/holidays?branch_id=X | Returns branch X + org holidays |
| HOL-07 | Delete holiday | DELETE /api/holidays/:id | Removed |

---

## 6. Fees — Monthly Cycles

| ID | Description | Steps | Expected |
|---|---|---|---|
| FEE-01 | No cycle at admission | Create student today | GET fee-cycles empty |
| FEE-02 | Cycle after 1 month | Set admission_date 1 mo ago, run check | Cycle 1 generated |
| FEE-03 | Second cycle after 2 months | Set admission_date 2 mo ago, run check | Cycles 1 & 2 generated |
| FEE-04 | No cycle 0 | Any student | No cycle_number=0 exists |
| FEE-05 | Relief applied per cycle | Student with partial relief, 2+ cycles | Same relief applied to each |
| FEE-06 | Record cycle payment | POST /api/fee-cycles/:id/payments | Amount paid and status updated |
| FEE-07 | Overpayment blocked | Payment > remaining balance | 400 error |
| FEE-08 | No new cycles if dropped | Set status='dropped', advance time | No new cycles generated |
| FEE-09 | Overdue status applied | Unpaid past due_date | status='overdue' |
| FEE-10 | Branch overdue list | GET /api/branches/:id/fee-cycles?status=overdue | Overdue cycles returned |
| FEE-11 | Total outstanding sum | GET student detail | Matches sum of unpaid balances |
| FEE-12 | Students list balance sum | GET /api/students | Matches sum across cycles |

---

## 7. Exams & Certificates

| ID | Description | Steps | Expected |
|---|---|---|---|
| EXM-01 | Record exam result | POST /api/students/:id/exam result=pass | examinations row created |
| EXM-02 | Cert auto-created on pass | Same as EXM-01 | certificates row created |
| EXM-03 | Cert auto-created on fail | POST exam result=fail | certificates row created |
| EXM-04 | Duplicate exam blocked | POST exam twice | Second call rejected |
| EXM-05 | Cert number uniqueness | Create exams for multiple students | Sequence increments |
| EXM-06 | No template fallback | GET /api/certificates/:id/render | has_active_template=false |
| EXM-07 | Upload template (image) | POST /api/certificate-templates | Uploaded, is_active=false |
| EXM-08 | Upload template (PDF) | POST /api/certificate-templates (PDF) | file_type=pdf |
| EXM-09 | Activate template | PUT /api/certificate-templates/:id/activate | is_active=true |
| EXM-10 | Save field positions | PUT /api/certificate-templates/:id/fields | Saved as % |
| EXM-11 | Render merges data | GET /api/certificates/:id/render | Data merged at saved positions |
| EXM-12 | Switch active template | Activate new template | Render uses new template |
| EXM-13 | Print view works | Open cert view, click print | Print styling applies |

---

## 8. Machines & Maintenance

| ID | Description | Steps | Expected |
|---|---|---|---|
| MCH-01 | Add machine | POST /api/machines | Created with status 'working' |
| MCH-02 | Update machine status | PUT /api/machines/:id status=under_repair | Status updated |
| MCH-03 | Add maintenance record | POST /api/machines/:id/maintenance | Maintenance row created |
| MCH-04 | Auto-creates expense | Same as MCH-03 | Matching expense row created |
| MCH-05 | Teacher scoped own branch | Teacher attempts access outside branch | 403 or empty result |
| MCH-06 | Supervisor/amir read-only | Supervisor attempts POST /api/machines | 403 error |

---

## 9. Expenses, Salaries, Branch Finance

| ID | Description | Steps | Expected |
|---|---|---|---|
| FIN-01 | Add expense | POST /api/branches/:id/expenses | Created |
| FIN-02 | Add salary record | POST /api/branches/:id/salaries | Created with status 'pending' |
| FIN-03 | Mark salary paid | PUT /api/salaries/:id status='paid' | Status updated |
| FIN-04 | Add JIH transaction | POST /api/branches/:id/transactions | Accounting entry created |
| FIN-05 | Summary view accuracy | GET /api/branches/:id/finance | Income, expenses, balance accurate |
| FIN-06 | Negative balance flag | Expenses > income | Balance is negative |
| FIN-07 | Maintenance expense in summary | Check finance summary after MCH-04 | Included in total_expenses |
| FIN-08 | Teacher cannot add salary | Teacher attempts POST salaries | 403 error |
| FIN-09 | Amir read-only | Amir attempts POST expenses/salaries | 403 error |

---

## 10. Leave Requests

| ID | Description | Steps | Expected |
|---|---|---|---|
| LVE-01 | Submit leave request | POST /api/leave-requests | Created with status='pending' |
| LVE-02 | List pending requests | GET /api/leave-requests?status=pending | Filtered list returned |
| LVE-03 | Teacher approves request | PUT /api/leave-requests/:id/approve as teacher | Approved |
| LVE-04 | Supervisor approves request | Approve as supervisor for branch | Approved |
| LVE-05 | Unrelated teacher blocked | Teacher of another branch approves | 403 error |
| LVE-06 | Approval creates attendance='leave' | GET attendance for range | Status='leave' on each date |
| LVE-07 | Approval skips holidays | Range includes holiday | No attendance on holiday |
| LVE-08 | Approval overrides lock | Approve leave on locked date | Attendance updates to 'leave' |
| LVE-09 | Reject request | PUT /api/leave-requests/:id/reject | Status='rejected' |
| LVE-10 | Leave excluded from % | Calculate attendance % | Denominator excludes leave days |
| LVE-11 | Frontend: Leave badge | Load attendance for leave date | Leave badge rendered, no buttons |

---

## 11. Reports & Dashboard

| ID | Description | Steps | Expected |
|---|---|---|---|
| REP-01 | Attendance report accuracy | GET /api/reports/attendance | % score accurate |
| REP-02 | Fee collection report | GET /api/reports/fees | Sums match fee_cycles |
| REP-03 | Overview scoped by role | GET /api/reports/overview per role | Data scoped to accessible branches |
| REP-04 | Dashboard role rendering | Load /dashboard per role | Correct view and cards rendered |

---

## 12. RBAC Matrix

| ID | Description | Expected |
|---|---|---|
| RBAC-01 | Admin full access | No 403s on valid admin endpoints |
| RBAC-02 | Amir read-only access | 403 on write endpoints |
| RBAC-03 | Supervisor scope | Write access for expenses/salaries/holidays/leaves for assigned branches; 403 otherwise |
| RBAC-04 | Teacher scope | Write access for attendance/students/machines/exams for assigned branch; 403 otherwise |
| RBAC-05 | ID spoofing protection | Accessing unauthorized resource ID returns 403/404 |
