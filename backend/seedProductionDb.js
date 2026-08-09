const pool = require('./config/db');
const bcrypt = require('bcryptjs');

/**
 * Production Initial Seed Script
 * Seeds ONLY one initial System Admin user if no admin user exists.
 * Does NOT truncate data or create synthetic test users/students/branches.
 */
async function seedProductionDatabase() {
  const client = await pool.connect();
  try {
    const adminPhone = process.env.INITIAL_ADMIN_PHONE || '9000000001';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.INITIAL_ADMIN_NAME || 'System Admin';
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@jamaateislamihind.org';

    const passHash = await bcrypt.hash(adminPassword, 10);

    const res = await client.query(
      `INSERT INTO users (name, phone, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'admin', 'active')
       ON CONFLICT (phone) DO NOTHING
       RETURNING id, name, phone;`,
      [adminName, adminPhone, adminEmail, passHash]
    );

    if (res.rows.length > 0) {
      console.log('✅ Initial production System Admin account created successfully:');
      console.log(`   Phone: ${res.rows[0].phone}`);
      console.log(`   Name: ${res.rows[0].name}`);
    } else {
      console.log(`ℹ️ Admin user with phone ${adminPhone} already exists. No new user created.`);
    }
  } catch (err) {
    console.error('❌ Production seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedProductionDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedProductionDatabase };
