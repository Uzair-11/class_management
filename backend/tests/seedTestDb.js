const path = require('path');
const pool = require('../config/db');

/**
 * Resets database and seeds full test suite environment
 */
async function seedTestDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean tables in reverse dependency order
    await client.query(`
      TRUNCATE 
        certificate_template_fields,
        certificate_templates,
        certificates,
        examinations,
        leave_requests,
        attendance_locks,
        attendance,
        fee_payments,
        fee_cycles,
        branch_transactions,
        expenses,
        salaries,
        machine_maintenance,
        machines,
        holidays,
        students,
        courses,
        supervisor_branch_map,
        amir_branch_map,
        refresh_tokens,
        branches,
        users
      RESTART IDENTITY CASCADE;
    `);

    // 1. Seed Users (All passwords 'Admin@123')
    const passHash = '$2b$10$r50vB/ge88ouwsEpF.gnouBhjT5tTzVE6CsSmzpoakJVL9ns6c9Wa';

    const usersRes = await client.query(`
      INSERT INTO users (name, phone, email, password_hash, role, status) VALUES
        ('Test Admin', '9000000001', 'admin@test.com', '${passHash}', 'admin', 'active'),
        ('Test Amir', '9000000002', 'amir@test.com', '${passHash}', 'amir', 'active'),
        ('Test Supervisor', '9000000003', 'supervisor@test.com', '${passHash}', 'supervisor', 'active'),
        ('Teacher Central', '9000000004', 'teacher1@test.com', '${passHash}', 'teacher', 'active'),
        ('Teacher North', '9825920189', 'teacher2@test.com', '${passHash}', 'teacher', 'active')
      RETURNING id, role;
    `);

    const adminId = usersRes.rows.find(u => u.role === 'admin').id;
    const amirId = usersRes.rows.find(u => u.role === 'amir').id;
    const supervisorId = usersRes.rows.find(u => u.role === 'supervisor').id;
    const teacher1Id = usersRes.rows.find(u => u.role === 'teacher').id;
    const teacher2Id = usersRes.rows.filter(u => u.role === 'teacher')[1].id;

    // 2. Seed Branches
    const branchRes = await client.query(`
      INSERT INTO branches (name, address, teacher_id, status) VALUES
        ('Central Branch', '123 Main St', ${teacher1Id}, 'active'),
        ('North Branch', '456 North St', NULL, 'active')
      RETURNING id;
    `);

    const branch1Id = branchRes.rows[0].id;
    const branch2Id = branchRes.rows[1].id;

    // 3. Mappings
    await client.query(`
      INSERT INTO amir_branch_map (user_id, branch_id) VALUES
        (${amirId}, ${branch1Id}),
        (${amirId}, ${branch2Id});

      INSERT INTO supervisor_branch_map (user_id, branch_id) VALUES
        (${supervisorId}, ${branch1Id}),
        (${supervisorId}, ${branch2Id});
    `);

    // 4. Courses
    const courseRes = await client.query(`
      INSERT INTO courses (name, fee, duration_months) VALUES
        ('Basic Course', 350.00, 3),
        ('Designer Course', 500.00, 3)
      RETURNING id;
    `);

    const course1Id = courseRes.rows[0].id;
    const course2Id = courseRes.rows[1].id;

    // 5. Students
    await client.query(`
      INSERT INTO students (name, phone, address, branch_id, course_id, admission_date, status, relief_type, relief_amount) VALUES
        ('Student NoRelief', '9000000001', 'Address 1', ${branch1Id}, ${course1Id}, CURRENT_DATE, 'active', 'none', 0.00),
        ('Student PartialRelief', '9000000002', 'Address 2', ${branch1Id}, ${course1Id}, CURRENT_DATE, 'active', 'partial', 50.00),
        ('Student FullRelief', '9000000003', 'Address 3', ${branch1Id}, ${course2Id}, CURRENT_DATE, 'active', 'full', 500.00),
        ('Student Branch2', '9000000004', 'Address 4', ${branch2Id}, ${course1Id}, CURRENT_DATE, 'active', 'none', 0.00);
    `);

    // 6. Holidays
    await client.query(`
      INSERT INTO holidays (branch_id, date, reason) VALUES
        (${branch1Id}, '2026-12-25', 'Branch Christmas Holiday'),
        (NULL, '2026-01-26', 'National Republic Day');
    `);

    // 7. Attendance Lock
    await client.query(`
      INSERT INTO attendance_locks (branch_id, date, locked_by) VALUES
        (${branch1Id}, '2026-08-01', ${teacher1Id});
    `);

    await client.query('COMMIT');
    console.log('✅ Test database seeded successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Test database seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedTestDatabase };

if (require.main === module) {
  seedTestDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
