const pool = require('../config/db');

async function migrateCertTemplates() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
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
    `);

    await client.query('COMMIT');
    console.log('✅ Certificate templates tables migrated successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration error:', err);
  } finally {
    client.release();
  }
}

migrateCertTemplates();
