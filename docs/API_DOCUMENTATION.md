# JIH Sewing Classes Management System — API Documentation

This document provides complete technical specifications for all REST API endpoints implemented in the JIH Sewing Classes Management System backend.

---

## 🔐 Authentication & Session Flow

The backend enforces a dual-token authentication model:

1. **Access Token**:
   - **Lifetime**: 15 minutes
   - **Transport**: JSON response body on login/refresh; passed as `Authorization: Bearer <token>` header on protected API calls.
   - **Claims**: `{ id, name, phone, role }`

2. **Refresh Token**:
   - **Lifetime**: 7 days
   - **Transport**: Set as an `httpOnly`, `Secure` (in prod), `SameSite=Strict` cookie (`refresh_token`).
   - **Server-Side Tracking**: Stored as a hashed token in `refresh_tokens` database table with active/revoked flags.

### Refreshing Tokens (`POST /api/auth/refresh`)
Clients call `/api/auth/refresh` without payload; the browser automatically attaches the `refresh_token` cookie. The backend verifies token hash and issue date, revokes old refresh tokens, and issues a new access token + rotated refresh cookie.

---

## 📋 API Endpoints Index

### 1. Authentication (`/api/auth`)

#### `POST /api/auth/login`
- **Auth Required**: No (Rate limited: 5 failed attempts per phone $\rightarrow$ 15-minute lock out)
- **Request Body** (`authLoginSchema`):
  ```json
  {
    "phone": "9000000001",
    "password": "Admin@123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "name": "System Admin",
      "phone": "9000000001",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Validation failure (phone/password missing or format invalid).
  - `401 Unauthorized`: Invalid credentials or account deactivated.
  - `429 Too Many Requests`: Account locked due to 5 consecutive failed login attempts.

#### `POST /api/auth/refresh`
- **Auth Required**: No (Reads `refresh_token` HTTP cookie)
- **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": { "id": 1, "name": "System Admin", "role": "admin" }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing, expired, or revoked refresh token.

#### `POST /api/auth/logout`
- **Auth Required**: Yes (`Bearer <token>`)
- **Success Response (200 OK)**:
  ```json
  { "message": "Logged out successfully" }
  ```
  *(Clears `refresh_token` cookie and revokes token in database).*

---

### 2. Branch Management (`/api/branches`)

#### `GET /api/branches`
- **Auth Required**: Yes (`admin`, `amir`, `supervisor`, `teacher`)
- **Behavior**: Returns branches accessible to the user based on role jurisdiction.
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "Central Branch",
      "address": "123 Main St",
      "teacher_id": 4,
      "teacher_name": "Class Teacher",
      "class_start_time": "09:00",
      "class_end_time": "12:00"
    }
  ]
  ```

#### `POST /api/branches`
- **Auth Required**: Yes (`admin` only)
- **Request Body** (`createBranchSchema`):
  ```json
  {
    "name": "North Branch",
    "address": "456 North St",
    "teacher_id": 5,
    "class_start_time": "10:00",
    "class_end_time": "13:00"
  }
  ```
- **Success Response (201 Created)**: Returns created branch object.
- **Error Responses**:
  - `400 Bad Request`: Validation failure or teacher already assigned to another active branch (**One Teacher, One Branch Rule**).
  - `403 Forbidden`: Non-admin role attempt.

#### `GET /api/branches/:id`
- **Auth Required**: Yes (`admin`, or `supervisor`/`amir`/`teacher` assigned to `:id`)
- **Success Response (200 OK)**: Returns detailed branch object with associated supervisor/amir lists.
- **Error Responses**:
  - `403 Forbidden`: Access attempted outside user's assigned branch jurisdiction.
  - `404 Not Found`: Branch ID does not exist.

#### `PUT /api/branches/:id`
- **Auth Required**: Yes (`admin` only)
- **Request Body**: Partial branch fields (`name`, `address`, `teacher_id`, `class_start_time`, `class_end_time`).
- **Success Response (200 OK)**: Returns updated branch object.

#### `DELETE /api/branches/:id/supervisors/:userId` & `DELETE /api/branches/:id/amirs/:userId`
- **Auth Required**: Yes (`admin` only)
- **Success Response (200 OK / 204 No Content)**: Unassigns supervisor or amir from branch.

---

### 3. User Administration (`/api/users`)

#### `GET /api/users`
- **Auth Required**: Yes (`admin`, `supervisor`)
- **Query Params**: `?role=teacher` (optional)
- **Success Response (200 OK)**: Array of user objects (`id`, `name`, `phone`, `email`, `role`, `status`).

#### `POST /api/users`
- **Auth Required**: Yes (`admin` only)
- **Request Body** (`createUserSchema`):
  ```json
  {
    "name": "New Teacher",
    "phone": "9000000005",
    "email": "teacher2@example.com",
    "password": "Password123",
    "role": "teacher"
  }
  ```
- **Success Response (201 Created)**: Returns created user object (excluding `password_hash`).
- **Error Responses**:
  - `400 Bad Request`: Phone number collision or validation failure.

#### `DELETE /api/users/:id`
- **Auth Required**: Yes (`admin` only)
- **Success Response (200 OK)**: Soft-deactivates user (`status = 'inactive'`).

---

### 4. Student Management (`/api/students`)

#### `GET /api/students`
- **Auth Required**: Yes (`admin`, `amir`, `supervisor`, `teacher`)
- **Query Params**: `?branch_id=1` (optional filter)
- **Success Response (200 OK)**: Array of student objects with calculated `balance` property.

#### `POST /api/students`
- **Auth Required**: Yes (`admin`, `supervisor`, `teacher` for own branch)
- **Request Body** (`createStudentSchema`):
  ```json
  {
    "name": "Fatima Zahra",
    "phone": "9111111111",
    "branch_id": 1,
    "course_id": 1,
    "relief_type": "partial",
    "relief_amount": 100,
    "admission_date": "2026-08-01"
  }
  ```
- **Success Response (201 Created)**: Returns created student object and automatically generates initial monthly fee cycle.
- **Error Responses**:
  - `400 Bad Request`: `relief_amount` exceeds course base fee.

#### `GET /api/students/:id`
- **Auth Required**: Yes (`admin`, or branch-authorized role)
- **Success Response (200 OK)**: Returns full student profile, course details, relief status, and monthly fee cycles log.

#### `PUT /api/students/:id` & `PUT /api/students/:id/status`
- **Auth Required**: Yes (`admin`, `supervisor`, branch `teacher`)
- **Success Response (200 OK)**: Updates student details or status (`active`, `completed`, `dropped`).

---

### 5. Daily Attendance (`/api/attendance`)

#### `GET /api/attendance`
- **Auth Required**: Yes (`admin`, `amir`, `supervisor`, `teacher`)
- **Query Params**: `?branch_id=1&date=2026-08-05`
- **Success Response (200 OK)**:
  ```json
  {
    "date": "2026-08-05",
    "branch_id": 1,
    "is_locked": false,
    "is_holiday": false,
    "students": [
      { "student_id": 1, "student_name": "Fatima Zahra", "status": "present" }
    ]
  }
  ```

#### `POST /api/attendance`
- **Auth Required**: Yes (`admin`, `teacher`, `supervisor`)
- **Request Body** (`postAttendanceSchema`):
  ```json
  {
    "branch_id": 1,
    "date": "2026-08-05",
    "records": [
      { "student_id": 1, "status": "present" },
      { "student_id": 2, "status": "absent" }
    ]
  }
  ```
- **Success Response (200 OK)**: Saves or updates daily attendance records.
- **Error Responses**:
  - `400 Bad Request`: Target date is locked or declared a holiday.

#### `GET /api/attendance/student/:studentId`
- **Auth Required**: Yes (Branch authorized)
- **Success Response (200 OK)**: Returns student attendance log and calculated percentage (`present / (present + absent) * 100`).

---

### 6. Student Leave Requests (`/api/leave-requests`)

#### `GET /api/leave-requests`
- **Auth Required**: Yes (`admin`, `supervisor`, `teacher`)
- **Query Params**: `?branch_id=1&status=pending`
- **Success Response (200 OK)**: Returns array of leave requests.

#### `POST /api/leave-requests`
- **Auth Required**: Yes (`admin`, `teacher`)
- **Request Body** (`createLeaveSchema`):
  ```json
  {
    "student_id": 1,
    "date_from": "2026-08-10",
    "date_to": "2026-08-12",
    "reason": "Family Function"
  }
  ```
- **Success Response (201 Created)**: Returns created leave request in `pending` status.

#### `PUT /api/leave-requests/:id/approve` & `PUT /api/leave-requests/:id/reject`
- **Auth Required**: Yes (`admin`, `supervisor`, branch `teacher`)
- **Success Response (200 OK)**: Updates status to `approved` or `rejected`. Approvals automatically populate `attendance` records with `status = 'leave'` for non-holiday dates.

---

### 7. Holidays (`/api/holidays`)

#### `GET /api/holidays`
- **Auth Required**: Yes (`admin`, `amir`, `supervisor`, `teacher`)
- **Success Response (200 OK)**: Array of declared holiday objects.

#### `POST /api/holidays`
- **Auth Required**: Yes (`admin`, `supervisor`)
- **Request Body** (`createHolidaySchema`):
  ```json
  {
    "date": "2026-12-25",
    "reason": "Winter Holiday",
    "branch_id": 1
  }
  ```
- **Success Response (201 Created)**: Declares branch or organization-wide holiday.

---

### 8. Fees & Payments (`/api/fees` & `/api/payments`)

#### `GET /api/fees/student/:studentId`
- **Auth Required**: Yes (Branch authorized)
- **Success Response (200 OK)**: List of generated monthly fee cycles and payment history.

#### `POST /api/payments`
- **Auth Required**: Yes (`admin`, `supervisor`, branch `teacher`)
- **Request Body**:
  ```json
  {
    "fee_cycle_id": 1,
    "amount_paid": 250,
    "payment_date": "2026-08-05",
    "payment_mode": "cash"
  }
  ```
- **Success Response (201 Created)**: Records payment and updates fee cycle status to `paid` or `partially_paid`.

---

### 9. Exams & Certificates (`/api/exams`)

#### `POST /api/exams`
- **Auth Required**: Yes (`admin`, `teacher`)
- **Request Body**: `{ "student_id": 1, "marks_obtained": 85, "total_marks": 100, "exam_date": "2026-08-01" }`
- **Success Response (201 Created)**: Records exam score and issues certificate number if passed.

#### `GET /api/exams/certificate/:certificateNo`
- **Auth Required**: Yes (Authenticated user)
- **Success Response (200 OK)**: Returns certificate payload formatted for template rendering.

---

### 10. Certificate Templates (`/api/certificate-templates`)

#### `GET /api/certificate-templates`
- **Auth Required**: Yes (`admin`, `supervisor`, `teacher`)
- **Success Response (200 OK)**: List of uploaded certificate background templates.

#### `POST /api/certificate-templates`
- **Auth Required**: Yes (`admin` only)
- **Content-Type**: `multipart/form-data`
- **Payload**: `name` string + `template` file (JPG/PNG/PDF, max 5MB).
- **Success Response (201 Created)**: Saves template with unique UUID storage name.

#### `PUT /api/certificate-templates/:id/positions`
- **Auth Required**: Yes (`admin` only)
- **Request Body**: Position coordinates JSON map for dynamic fields.
- **Success Response (200 OK)**: Updates field coordinates.

---

### 11. Machines & Maintenance (`/api/machines`)

#### `GET /api/machines`
- **Auth Required**: Yes (Branch authorized)
- **Success Response (200 OK)**: List of registered sewing machines and statuses.

#### `POST /api/machines`
- **Auth Required**: Yes (`admin`, `supervisor`)
- **Request Body** (`createMachineSchema`): `{ "branch_id": 1, "machine_number": "M-101", "type": "Single Needle", "status": "working" }`
- **Success Response (201 Created)**: Registers new sewing machine.

---

### 12. Branch Finance & Reports (`/api/finance` & `/api/reports`)

#### `GET /api/finance/branch/:branchId`
- **Auth Required**: Yes (`admin`, `supervisor`, branch `amir`)
- **Success Response (200 OK)**: Financial breakdown (Total Payments Received − Expenses − Salaries = Net Balance).

#### `POST /api/finance/expenses` & `POST /api/finance/salaries`
- **Auth Required**: Yes (`admin`, `supervisor`)
- **Request Body** (`createExpenseSchema` / `createSalarySchema`): Registers operational expense or staff salary disbursement.

#### `GET /api/reports/overview`
- **Auth Required**: Yes (`admin`, `amir`, `supervisor`, `teacher`)
- **Success Response (200 OK)**: Role-scoped aggregate dashboard metrics.
