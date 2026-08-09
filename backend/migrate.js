const pool = require('./config/db');

async function migrate() {
  console.log('🔄 Starting Database Schema Migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop old dependent view first
    await client.query('DROP VIEW IF EXISTS branch_finance_summary CASCADE;');

    // 1. Enum Types
    await client.query(`
      DO $$ BEGIN
          CREATE TYPE fee_cycle_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          ALTER TYPE attendance_status ADD VALUE 'leave';
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Add relief columns to students if missing & must_change_password to users
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS relief_type relief_type NOT NULL DEFAULT 'none';
      ALTER TABLE students ADD COLUMN IF NOT EXISTS relief_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
    `);

    // Migrate relief data from existing student_fees to students table if student_fees exists
    const sfTableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'student_fees';
    `);

    if (sfTableCheck.rows.length > 0) {
      await client.query(`
        UPDATE students s
        SET relief_type = sf.relief_type,
            relief_amount = sf.relief_amount
        FROM student_fees sf
        WHERE sf.student_id = s.id;
      `);
    }

    // 3. Create fee_cycles table
    await client.query(`
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
    `);

    // 4. Update fee_payments table to reference fee_cycle_id
    const fpCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'fee_payments' AND column_name = 'fee_cycle_id';
    `);

    if (fpCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE fee_payments ADD COLUMN fee_cycle_id INTEGER REFERENCES fee_cycles(id);
      `);

      if (sfTableCheck.rows.length > 0) {
        // Migrate existing student_fees records to cycle 1 fee_cycles
        await client.query(`
          INSERT INTO fee_cycles (student_id, branch_id, cycle_number, due_date, original_amount, relief_amount, amount_paid, status)
          SELECT 
            sf.student_id,
            s.branch_id,
            1 AS cycle_number,
            (s.admission_date + INTERVAL '1 month')::date AS due_date,
            sf.original_fee,
            sf.relief_amount,
            sf.amount_paid,
            CASE 
              WHEN sf.amount_paid >= sf.final_fee THEN 'paid'::fee_cycle_status
              WHEN sf.amount_paid > 0 THEN 'partial'::fee_cycle_status
              WHEN (s.admission_date + INTERVAL '1 month')::date < CURRENT_DATE THEN 'overdue'::fee_cycle_status
              ELSE 'pending'::fee_cycle_status
            END
          FROM student_fees sf
          JOIN students s ON sf.student_id = s.id
          ON CONFLICT (student_id, cycle_number) DO NOTHING;
        `);

        // Link fee_payments to fee_cycles
        await client.query(`
          UPDATE fee_payments fp
          SET fee_cycle_id = fc.id
          FROM student_fees sf
          JOIN fee_cycles fc ON sf.student_id = fc.student_id AND fc.cycle_number = 1
          WHERE fp.student_fee_id = sf.id;
        `);
      }

      await client.query(`
        ALTER TABLE fee_payments DROP COLUMN IF EXISTS student_fee_id;
      `);
    }

    // 5. Create attendance_locks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance_locks (
          id            SERIAL PRIMARY KEY,
          branch_id     INTEGER NOT NULL REFERENCES branches(id),
          date          DATE NOT NULL,
          locked_by     INTEGER REFERENCES users(id),
          locked_at     TIMESTAMP NOT NULL DEFAULT now(),
          UNIQUE (branch_id, date)
      );
    `);

    // Migrate existing attendance lock flags if column exists
    const attLockColCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'attendance' AND column_name = 'is_locked';
    `);

    if (attLockColCheck.rows.length > 0) {
      await client.query(`
        INSERT INTO attendance_locks (branch_id, date, locked_by)
        SELECT DISTINCT branch_id, date, marked_by
        FROM attendance
        WHERE is_locked = TRUE
        ON CONFLICT (branch_id, date) DO NOTHING;
      `);

      await client.query(`
        ALTER TABLE attendance DROP COLUMN IF EXISTS is_locked;
      `);
    }

    // 6. Create leave_requests table
    await client.query(`
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
    `);

    // 7. Re-create branch_finance_summary view with fee_cycles
    await client.query(`
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
    `);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
