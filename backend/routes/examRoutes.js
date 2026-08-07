const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getStudentExamDetails,
  createExamAndCertificate,
  updateExam,
  getCertificateById
} = require('../controllers/examController');

router.get('/students/:id/exam', authenticateToken, getStudentExamDetails);
router.post('/students/:id/exam', authenticateToken, createExamAndCertificate);
router.put('/students/:id/exam', authenticateToken, updateExam);
router.get('/certificates/:id', authenticateToken, getCertificateById);

module.exports = router;
