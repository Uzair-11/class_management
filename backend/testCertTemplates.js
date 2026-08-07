const pool = require('./config/db');

(async () => {
  const client = await pool.connect();
  try {
    console.log('--- TEST 1: Certificate Templates Table Verification ---');
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('certificate_templates', 'certificate_template_fields');
    `);
    console.log('✅ Tables present in DB:', tableCheck.rows.map(r => r.table_name));

    console.log('--- TEST 2: Active Template Query Verification ---');
    const activeCheck = await client.query('SELECT * FROM certificate_templates WHERE is_active = true');
    console.log('✅ Active template count:', activeCheck.rows.length);

    console.log('--- TEST 3: Render Endpoint Data Pipeline ---');
    const certCheck = await client.query('SELECT id FROM certificates LIMIT 1');
    if (certCheck.rows.length > 0) {
      const certId = certCheck.rows[0].id;
      const renderRes = await client.query(
        `SELECT c.id, c.certificate_number, s.name AS student_name, co.name AS course_name, b.name AS branch_name
         FROM certificates c
         JOIN students s ON c.student_id = s.id
         JOIN courses co ON s.course_id = co.id
         JOIN branches b ON s.branch_id = b.id
         WHERE c.id = $1`,
        [certId]
      );
      console.log('✅ Certificate data payload fetched:', renderRes.rows[0]);
    } else {
      console.log('ℹ️ No certificate rows present to test render; render endpoint will fall back cleanly.');
    }

  } catch (err) {
    console.error('❌ Template verification failed:', err);
  } finally {
    client.release();
    process.exit();
  }
})();
