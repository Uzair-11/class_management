-- ============================================================
-- Jamaat-e-Islami Hind — Sewing Classes Management System
-- PostgreSQL Schema (Updated: Monthly Fee Cycles, Attendance Locks, Leave Requests)
-- ============================================================

-- ---------- ENUM TYPES ----------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'amir', 'supervisor', 'teacher');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE branch_status AS ENUM ('active', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE student_status AS ENUM ('active', 'completed', 'dropped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE relief_type AS ENUM ('none', 'partial', 'full');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fee_cycle_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode AS ENUM ('cash', 'online', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exam_result AS ENUM ('pass', 'fail');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE machine_status AS ENUM ('working', 'under_repair', 'needs_maintenance', 'replaced', 'out_of_service');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_type AS ENUM ('machine_repair', 'machine_maintenance', 'machine_replacement', 'electricity', 'building_repair', 'cleaning', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE salary_status AS ENUM ('pending', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE branch_txn_type AS ENUM ('received_from_jih', 'returned_to_jih');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------- USERS ----------
-- Schema Migration Note: Added must_change_password column for initial admin password reset enforcement
CREATE TABLE IF NOT EXISTS users (
    id                    SERIAL PRIMARY KEY,
    name                  TEXT NOT NULL,
    phone                 TEXT UNIQUE NOT NULL,
    email                 TEXT UNIQUE,
    password_hash         TEXT NOT NULL,
    role                  user_role NOT NULL,
    status                user_status NOT NULL DEFAULT 'active',
    must_change_password  BOOLEAN NOT NULL DEFAULT false,
    created_at            TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------- REFRESH TOKENS ----------
-- Note: A periodic background cleanup job (e.g. pg_cron or node schedule) should delete expired rows (WHERE expires_at < now() OR revoked = true) in production.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash    TEXT NOT NULL,
    expires_at    TIMESTAMP NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    revoked       BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ---------- BRANCHES ----------
CREATE TABLE IF NOT EXISTS branches (
    id                SERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    address           TEXT,
    teacher_id        INTEGER REFERENCES users(id),
    class_start_time  TIME NOT NULL DEFAULT '15:00',
    class_end_time    TIME NOT NULL DEFAULT '17:00',
    status            branch_status NOT NULL DEFAULT 'active'
);

-- ---------- AMIR / SUPERVISOR <-> BRANCH MAPPING ----------
CREATE TABLE IF NOT EXISTS amir_branch_map (
    user_id     INTEGER NOT NULL REFERENCES users(id),
    branch_id   INTEGER NOT NULL REFERENCES branches(id),
    PRIMARY KEY (user_id, branch_id)
);

CREATE TABLE IF NOT EXISTS supervisor_branch_map (
    user_id     INTEGER NOT NULL REFERENCES users(id),
    branch_id   INTEGER NOT NULL REFERENCES branches(id),
    PRIMARY KEY (user_id, branch_id)
);

-- ---------- COURSES ----------
CREATE TABLE IF NOT EXISTS courses (
    id                SERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    fee               NUMERIC(10,2) NOT NULL,
    duration_months   INTEGER NOT NULL DEFAULT 3
);

-- ---------- STUDENTS ----------
CREATE TABLE IF NOT EXISTS students (
    id                SERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    phone             TEXT,
    address           TEXT,
    branch_id         INTEGER NOT NULL REFERENCES branches(id),
    course_id         INTEGER NOT NULL REFERENCES courses(id),
    admission_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    status            student_status NOT NULL DEFAULT 'active',
    relief_type       relief_type NOT NULL DEFAULT 'none',
    relief_amount     NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ---------- MONTHLY FEE CYCLES ----------
CREATE TABLE IF NOT EXISTS fee_cycles (
    id                  SERIAL PRIMARY KEY,
    student_id          INTEGER NOT NULL REFERENCES students(id),
    branch_id           INTEGER NOT NULL REFERENCES branches(id),
    cycle_number        INTEGER NOT NULL,
    due_date            DATE NOT NULL,
    original_amount     NUMERIC(10,2) NOT NULL,
    relief_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
    final_amount        NUMERIC(10,2) GENERATED ALWAYS AS (original_amount - relief_amount) STORED,
    amount_paid         NUMERIC(10,2) NOT NULL DEFAULT 0,
    status              fee_cycle_status NOT NULL DEFAULT 'pending',
    UNIQUE (student_id, cycle_number)
);

-- ---------- FEE PAYMENTS ----------
CREATE TABLE IF NOT EXISTS fee_payments (
    id                SERIAL PRIMARY KEY,
    fee_cycle_id      INTEGER NOT NULL REFERENCES fee_cycles(id),
    amount            NUMERIC(10,2) NOT NULL,
    payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode      payment_mode NOT NULL DEFAULT 'cash',
    received_by       INTEGER REFERENCES users(id)
);

-- ---------- ATTENDANCE LOCKS ----------
CREATE TABLE IF NOT EXISTS attendance_locks (
    id            SERIAL PRIMARY KEY,
    branch_id     INTEGER NOT NULL REFERENCES branches(id),
    date          DATE NOT NULL,
    locked_by     INTEGER REFERENCES users(id),
    locked_at     TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (branch_id, date)
);

-- ---------- ATTENDANCE ----------
CREATE TABLE IF NOT EXISTS attendance (
    id            SERIAL PRIMARY KEY,
    student_id    INTEGER NOT NULL REFERENCES students(id),
    branch_id     INTEGER NOT NULL REFERENCES branches(id),
    date          DATE NOT NULL,
    status        attendance_status NOT NULL,
    marked_by     INTEGER REFERENCES users(id),
    UNIQUE (student_id, date)
);

-- ---------- STUDENT LEAVE REQUESTS ----------
CREATE TABLE IF NOT EXISTS leave_requests (
    id            SERIAL PRIMARY KEY,
    student_id    INTEGER NOT NULL REFERENCES students(id),
    branch_id     INTEGER NOT NULL REFERENCES branches(id),
    date_from     DATE NOT NULL,
    date_to       DATE NOT NULL,
    reason        TEXT NOT NULL,
    status        leave_status NOT NULL DEFAULT 'pending',
    requested_at  TIMESTAMP NOT NULL DEFAULT now(),
    reviewed_by   INTEGER REFERENCES users(id),
    reviewed_at   TIMESTAMP
);

-- ---------- EXAMINATIONS ----------
CREATE TABLE IF NOT EXISTS examinations (
    id            SERIAL PRIMARY KEY,
    student_id    INTEGER NOT NULL REFERENCES students(id),
    exam_date     DATE NOT NULL,
    marks         NUMERIC(5,2),
    result        exam_result NOT NULL
);

-- ---------- CERTIFICATES ----------
CREATE TABLE IF NOT EXISTS certificates (
    id                    SERIAL PRIMARY KEY,
    student_id            INTEGER NOT NULL REFERENCES students(id),
    certificate_number    TEXT UNIQUE NOT NULL,
    issue_date            DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ---------- HOLIDAYS ----------
CREATE TABLE IF NOT EXISTS holidays (
    id            SERIAL PRIMARY KEY,
    branch_id     INTEGER REFERENCES branches(id), -- NULL = all branches
    date          DATE NOT NULL,
    reason        TEXT
);

-- ---------- MACHINES ----------
CREATE TABLE IF NOT EXISTS machines (
    id                SERIAL PRIMARY KEY,
    branch_id         INTEGER NOT NULL REFERENCES branches(id),
    machine_number    TEXT NOT NULL,
    purchase_date     DATE,
    status            machine_status NOT NULL DEFAULT 'working'
);

-- ---------- MACHINE MAINTENANCE ----------
CREATE TABLE IF NOT EXISTS machine_maintenance (
    id            SERIAL PRIMARY KEY,
    machine_id    INTEGER NOT NULL REFERENCES machines(id),
    date          DATE NOT NULL,
    description   TEXT,
    cost          NUMERIC(10,2) NOT NULL DEFAULT 0,
    remarks       TEXT
);

-- ---------- EXPENSES ----------
CREATE TABLE IF NOT EXISTS expenses (
    id              SERIAL PRIMARY KEY,
    branch_id       INTEGER NOT NULL REFERENCES branches(id),
    date            DATE NOT NULL,
    expense_type    expense_type NOT NULL,
    description     TEXT,
    amount          NUMERIC(10,2) NOT NULL
);

-- ---------- SALARIES ----------
CREATE TABLE IF NOT EXISTS salaries (
    id                SERIAL PRIMARY KEY,
    employee_id       INTEGER NOT NULL REFERENCES users(id),
    branch_id         INTEGER NOT NULL REFERENCES branches(id),
    month             DATE NOT NULL, -- store as first-of-month
    amount            NUMERIC(10,2) NOT NULL,
    payment_status    salary_status NOT NULL DEFAULT 'pending',
    payment_date      DATE
);

-- ---------- BRANCH TRANSACTIONS (JIH support / surplus return) ----------
CREATE TABLE IF NOT EXISTS branch_transactions (
    id            SERIAL PRIMARY KEY,
    branch_id     INTEGER NOT NULL REFERENCES branches(id),
    type          branch_txn_type NOT NULL,
    amount        NUMERIC(10,2) NOT NULL,
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    reason        TEXT
);

-- ============================================================
-- USEFUL INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_fee_cycles_student ON fee_cycles(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON attendance(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_branch ON leave_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_salaries_branch_month ON salaries(branch_id, month);

-- ============================================================
-- BRANCH FINANCE SUMMARY VIEW (Updated for Monthly Fee Cycles)
-- ============================================================
CREATE OR REPLACE VIEW branch_finance_summary AS
SELECT
    b.id AS branch_id,
    b.name AS branch_name,
    COALESCE(income.total_income, 0) AS total_income,
    COALESCE(exp.total_expenses, 0) + COALESCE(sal.total_salaries, 0) AS total_expenses,
    COALESCE(income.total_income, 0) - (COALESCE(exp.total_expenses, 0) + COALESCE(sal.total_salaries, 0)) AS balance
FROM branches b
LEFT JOIN (
    SELECT fc.branch_id, SUM(fp.amount) AS total_income
    FROM fee_payments fp
    JOIN fee_cycles fc ON fp.fee_cycle_id = fc.id
    GROUP BY fc.branch_id
) income ON income.branch_id = b.id
LEFT JOIN (
    SELECT branch_id, SUM(amount) AS total_expenses
    FROM expenses
    GROUP BY branch_id
) exp ON exp.branch_id = b.id
LEFT JOIN (
    SELECT branch_id, SUM(amount) AS total_salaries
    FROM salaries
    WHERE payment_status = 'paid'
    GROUP BY branch_id
) sal ON sal.branch_id = b.id;

-- ============================================================
-- SEED DATA: Courses & Initial System Users
-- ============================================================
INSERT INTO courses (name, fee, duration_months) VALUES
    ('Basic Course', 350, 3),
    ('Designer Course', 500, 3)
ON CONFLICT DO NOTHING;

-- Admin user seeding is handled by seedProductionDb.js at deploy time.
-- Do NOT add hardcoded users with default passwords here.

-- ============================================================
-- CERTIFICATE TEMPLATES
-- ============================================================
DO $$ BEGIN
    CREATE TYPE template_file_type AS ENUM ('image', 'pdf');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE template_field_key AS ENUM ('student_name', 'course_name', 'branch_name', 'result', 'certificate_number', 'issue_date');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS certificate_templates (
    id                SERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    file_path         TEXT NOT NULL,
    file_type         template_file_type NOT NULL,
    background_width  INTEGER NOT NULL DEFAULT 800,
    background_height INTEGER NOT NULL DEFAULT 600,
    is_active         BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificate_template_fields (
    id            SERIAL PRIMARY KEY,
    template_id   INTEGER NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
    field_key     template_field_key NOT NULL,
    x_position    NUMERIC(6,3) NOT NULL DEFAULT 10,
    y_position    NUMERIC(6,3) NOT NULL DEFAULT 10,
    font_size     INTEGER NOT NULL DEFAULT 16,
    font_weight   TEXT NOT NULL DEFAULT 'bold',
    text_align    TEXT NOT NULL DEFAULT 'center',
    color         TEXT NOT NULL DEFAULT '#000000',
    UNIQUE (template_id, field_key)
);
