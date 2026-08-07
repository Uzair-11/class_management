const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const imageSizeModule = require('image-size');
const imageSize = imageSizeModule.imageSize || imageSizeModule.default || imageSizeModule;
const { PDFDocument, rgb } = require('pdf-lib');

// Upload directory for certificate templates
const uploadDir = path.join(__dirname, '../uploads/templates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// POST /api/certificate-templates — Admin uploads a new template file
const uploadTemplate = async (req, res) => {
  const user = req.user;
  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can upload certificate templates' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Please upload an image or PDF template file' });
  }

  const { name } = req.body;
  const templateName = name || req.file.originalname;
  const mimeType = req.file.mimetype;

  let fileType = 'image';
  if (mimeType === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
    fileType = 'pdf';
  }

  let width = 800;
  let height = 600;

  try {
    if (fileType === 'image') {
      try {
        const dimensions = imageSize(req.file.path);
        width = dimensions.width || 800;
        height = dimensions.height || 600;
      } catch (imgErr) {
        width = 800;
        height = 600;
      }
    } else if (fileType === 'pdf') {
      const pdfBytes = fs.readFileSync(req.file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const page = pdfDoc.getPage(0);
      width = Math.round(page.getWidth());
      height = Math.round(page.getHeight());
    }

    const relativePath = `/uploads/templates/${req.file.filename}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO certificate_templates (name, file_path, file_type, background_width, background_height, is_active)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [templateName, relativePath, fileType, width, height]
      );

      const template = result.rows[0];

      // Default field placements (% based)
      const defaultFields = [
        { field_key: 'student_name', x_position: 50, y_position: 40, font_size: 24, font_weight: 'bold', text_align: 'center', color: '#000000' },
        { field_key: 'course_name', x_position: 50, y_position: 52, font_size: 18, font_weight: 'bold', text_align: 'center', color: '#0B6E4F' },
        { field_key: 'branch_name', x_position: 50, y_position: 60, font_size: 16, font_weight: 'normal', text_align: 'center', color: '#333333' },
        { field_key: 'result', x_position: 25, y_position: 80, font_size: 14, font_weight: 'bold', text_align: 'left', color: '#000000' },
        { field_key: 'certificate_number', x_position: 25, y_position: 75, font_size: 14, font_weight: 'normal', text_align: 'left', color: '#333333' },
        { field_key: 'issue_date', x_position: 75, y_position: 75, font_size: 14, font_weight: 'normal', text_align: 'right', color: '#333333' }
      ];

      for (const f of defaultFields) {
        await client.query(
          `INSERT INTO certificate_template_fields (template_id, field_key, x_position, y_position, font_size, font_weight, text_align, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [template.id, f.field_key, f.x_position, f.y_position, f.font_size, f.font_weight, f.text_align, f.color]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Certificate template uploaded successfully',
        template
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('uploadTemplate error:', err);
    res.status(500).json({ message: 'Error processing template file', error: err.message });
  }
};

// GET /api/certificate-templates — List all uploaded templates + their fields
const getTemplates = async (req, res) => {
  try {
    const templatesRes = await pool.query(
      'SELECT * FROM certificate_templates ORDER BY uploaded_at DESC'
    );

    const templates = await Promise.all(
      templatesRes.rows.map(async (t) => {
        const fieldsRes = await pool.query(
          'SELECT * FROM certificate_template_fields WHERE template_id = $1 ORDER BY id ASC',
          [t.id]
        );
        return {
          ...t,
          fields: fieldsRes.rows
        };
      })
    );

    res.json(templates);
  } catch (err) {
    console.error('getTemplates error:', err);
    res.status(500).json({ message: 'Error fetching certificate templates', error: err.message });
  }
};

// PUT /api/certificate-templates/:id/activate — Set template active and deactivate others
const activateTemplate = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can activate templates' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('UPDATE certificate_templates SET is_active = false');
    const result = await client.query(
      'UPDATE certificate_templates SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Template not found' });
    }

    await client.query('COMMIT');
    res.json({
      message: 'Certificate template activated successfully',
      template: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error activating template', error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/certificate-templates/:id/fields — Save drag-and-drop field positions & styles
const updateTemplateFields = async (req, res) => {
  const { id } = req.params;
  const { fields } = req.body; // Array of field objects
  const user = req.user;

  if (user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can update field positions' });
  }

  if (!Array.isArray(fields)) {
    return res.status(400).json({ message: 'fields must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const f of fields) {
      await client.query(
        `INSERT INTO certificate_template_fields (
           template_id, field_key, x_position, y_position, font_size, font_weight, text_align, color
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (template_id, field_key)
         DO UPDATE SET
           x_position = EXCLUDED.x_position,
           y_position = EXCLUDED.y_position,
           font_size = EXCLUDED.font_size,
           font_weight = EXCLUDED.font_weight,
           text_align = EXCLUDED.text_align,
           color = EXCLUDED.color`,
        [
          id,
          f.field_key,
          parseFloat(f.x_position),
          parseFloat(f.y_position),
          parseInt(f.font_size || 16),
          f.font_weight || 'bold',
          f.text_align || 'center',
          f.color || '#000000'
        ]
      );
    }

    await client.query('COMMIT');

    const updatedFieldsRes = await pool.query(
      'SELECT * FROM certificate_template_fields WHERE template_id = $1',
      [id]
    );

    res.json({
      message: 'Field positions and styling saved successfully',
      fields: updatedFieldsRes.rows
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateTemplateFields error:', err);
    res.status(500).json({ message: 'Error saving field positions', error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/certificates/:id/render — Render certificate data merged with active template
const renderCertificate = async (req, res) => {
  const { id } = req.params; // certificate_id

  try {
    // 1. Fetch certificate details
    const certRes = await pool.query(
      `SELECT 
         c.id AS certificate_id,
         c.certificate_number,
         c.issue_date,
         s.id AS student_id,
         s.name AS student_name,
         co.name AS course_name,
         co.duration_months,
         b.name AS branch_name,
         ex.result AS exam_result,
         ex.marks AS exam_marks
       FROM certificates c
       JOIN students s ON c.student_id = s.id
       JOIN courses co ON s.course_id = co.id
       JOIN branches b ON s.branch_id = b.id
       LEFT JOIN examinations ex ON s.id = ex.student_id
       WHERE c.id = $1`,
      [id]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).json({ message: 'Certificate record not found' });
    }

    const cert = certRes.rows[0];

    // 2. Fetch active template
    const templateRes = await pool.query(
      'SELECT * FROM certificate_templates WHERE is_active = true LIMIT 1'
    );

    if (templateRes.rows.length === 0) {
      // Fall back to default plain layout
      return res.json({
        has_active_template: false,
        certificate: cert
      });
    }

    const template = templateRes.rows[0];
    const fieldsRes = await pool.query(
      'SELECT * FROM certificate_template_fields WHERE template_id = $1',
      [template.id]
    );

    res.json({
      has_active_template: true,
      template,
      fields: fieldsRes.rows,
      certificate: cert
    });
  } catch (err) {
    console.error('renderCertificate error:', err);
    res.status(500).json({ message: 'Error rendering certificate', error: err.message });
  }
};

module.exports = {
  uploadTemplate,
  getTemplates,
  activateTemplate,
  updateTemplateFields,
  renderCertificate
};
