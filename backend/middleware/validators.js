const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');

// Generic error responder for validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Invalid request data provided',
      errors: errors.array().map(e => ({ field: e.path, msg: e.msg }))
    });
  }
  next();
};

// HTML Sanitizer helper for free-text fields
const sanitizeText = (val) => {
  if (typeof val === 'string') {
    return xss(val.trim());
  }
  return val;
};

// Custom sanitizer middleware to strip HTML from req.body text fields
const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeText(req.body[key]);
      }
    }
  }
  next();
};

// Validation Schemas
const authLoginSchema = [
  body('phone').trim().notEmpty().withMessage('Phone is required').isLength({ min: 8, max: 15 }).withMessage('Phone length invalid'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6, max: 100 }).withMessage('Password length invalid'),
  validate
];

const createStudentSchema = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 chars'),
  body('branch_id').isInt({ min: 1 }).withMessage('Valid branch_id required'),
  body('course_id').isInt({ min: 1 }).withMessage('Valid course_id required'),
  body('phone').optional({ nullable: true }).trim().isLength({ min: 8, max: 15 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('admission_date').optional({ nullable: true }).isISO8601().withMessage('Valid date format required (YYYY-MM-DD)'),
  body('relief_type').optional().isIn(['none', 'partial', 'full']).withMessage('Invalid relief_type'),
  body('relief_amount').optional().isFloat({ min: 0 }).withMessage('Relief amount must be positive number'),
  validate
];

const updateStudentSchema = [
  param('id').isInt({ min: 1 }).withMessage('Valid student ID required'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('phone').optional({ nullable: true }).trim().isLength({ min: 8, max: 15 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('branch_id').optional().isInt({ min: 1 }),
  body('course_id').optional().isInt({ min: 1 }),
  body('admission_date').optional({ nullable: true }).isISO8601(),
  validate
];

const createBranchSchema = [
  body('name').trim().notEmpty().withMessage('Branch name is required').isLength({ min: 2, max: 100 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('teacher_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('class_start_time').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Valid start time required (HH:MM)'),
  body('class_end_time').optional().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/).withMessage('Valid end time required (HH:MM)'),
  validate
];

const createUserSchema = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('phone').trim().notEmpty().isLength({ min: 8, max: 15 }),
  body('email').optional({ nullable: true }).trim().isEmail().withMessage('Valid email required'),
  body('password').notEmpty().isLength({ min: 6, max: 100 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'amir', 'supervisor', 'teacher']).withMessage('Invalid user role'),
  validate
];

const postAttendanceSchema = [
  body('branch_id').isInt({ min: 1 }),
  body('date').isISO8601().withMessage('Valid date format required'),
  body('records').isArray().withMessage('Records array required'),
  body('records.*.student_id').isInt({ min: 1 }),
  body('records.*.status').isIn(['present', 'absent', 'leave']),
  validate
];

const createExpenseSchema = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid positive amount required'),
  body('description').optional().trim().isLength({ min: 1, max: 255 }),
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('date').optional().isISO8601(),
  body('category').optional().trim().isLength({ max: 50 }),
  validate
];

const createSalarySchema = [
  body('user_id').optional().isInt({ min: 1 }),
  body('staff_name').optional().trim().isLength({ min: 1, max: 100 }),
  body('amount').isFloat({ min: 0.01 }),
  body('month').optional().matches(/^\d{4}-\d{2}$/),
  body('month_year').optional().matches(/^\d{4}-\d{2}$/),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 255 }),
  validate
];

const createHolidaySchema = [
  body('date').isISO8601().withMessage('Valid date required'),
  body('reason').trim().notEmpty().isLength({ min: 2, max: 255 }),
  body('branch_id').optional({ nullable: true }).isInt({ min: 1 }),
  validate
];

const createLeaveSchema = [
  body('student_id').isInt({ min: 1 }),
  body('date_from').isISO8601(),
  body('date_to').isISO8601(),
  body('reason').trim().notEmpty().isLength({ min: 2, max: 255 }),
  validate
];

const createMachineSchema = [
  body('branch_id').isInt({ min: 1 }),
  body('serial_number').optional().trim().isLength({ min: 1, max: 100 }),
  body('machine_number').optional().trim().isLength({ min: 1, max: 100 }),
  body('type').optional().trim().isLength({ min: 1, max: 100 }),
  body('model').optional().trim().isLength({ max: 100 }),
  body('purchase_date').optional({ nullable: true }).isISO8601(),
  body('status').optional().isIn(['working', 'needs_maintenance', 'under_repair', 'scrapped']),
  validate
];

module.exports = {
  validate,
  sanitizeText,
  sanitizeRequestBody,
  authLoginSchema,
  createStudentSchema,
  updateStudentSchema,
  createBranchSchema,
  createUserSchema,
  postAttendanceSchema,
  createExpenseSchema,
  createSalarySchema,
  createHolidaySchema,
  createLeaveSchema,
  createMachineSchema
};