const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const {
  uploadTemplate,
  getTemplates,
  activateTemplate,
  updateTemplateFields,
  renderCertificate
} = require('../controllers/certificateTemplateController');

const crypto = require('crypto');

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/templates');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `template-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB strict limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  }
});

router.post('/certificate-templates', authenticateToken, upload.single('template_file'), uploadTemplate);
router.get('/certificate-templates', authenticateToken, getTemplates);
router.put('/certificate-templates/:id/activate', authenticateToken, activateTemplate);
router.put('/certificate-templates/:id/fields', authenticateToken, updateTemplateFields);
router.get('/certificates/:id/render', authenticateToken, renderCertificate);

module.exports = router;
