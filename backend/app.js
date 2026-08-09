const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const roleRoutes = require('./routes/roleRoutes');
const branchRoutes = require('./routes/branchRoutes');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const examRoutes = require('./routes/examRoutes');
const machineRoutes = require('./routes/machineRoutes');
const financeRoutes = require('./routes/financeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const certificateTemplateRoutes = require('./routes/certificateTemplateRoutes');

const path = require('path');

const app = express();

// Secure Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const corsOrigin =
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? null : 'http://localhost:5173');

console.log(`[CORS] Allowed origin: ${corsOrigin}`);

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Reasonable limit for test execution while preventing brute-force flooding
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: 'Too many requests, please try again later' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/', generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', roleRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api', studentRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', holidayRoutes);
app.use('/api', paymentRoutes);
app.use('/api', examRoutes);
app.use('/api', machineRoutes);
app.use('/api', financeRoutes);
app.use('/api', reportRoutes);
app.use('/api', leaveRoutes);
app.use('/api', certificateTemplateRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'JIH API Server Running smoothly', timestamp: new Date() });
});

// Global Centralized Error Handling Middleware (prevents leaking internal stack traces / SQL errors)
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ message: 'Invalid file format. Only JPG, PNG, and PDF files are allowed.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File exceeds maximum size limit of 5MB.' });
  }
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    message: statusCode === 500 ? 'An internal server error occurred' : err.message
  });
});

module.exports = app;
