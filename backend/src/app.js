// =====================================================
// Main Express Application Setup
// =====================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { errorHandler } = require('./utils/errorHandler');
const { initializePool } = require('./models/database');
const { ensureGoogleAuthSchema } = require('./utils/ensureGoogleAuthSchema');
const { ensureUsersSchema } = require('./utils/ensureUsersSchema');

// Initialize Express app
const app = express();

// =====================================================
// MIDDLEWARE SETUP
// =====================================================

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined'));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // disable `X-RateLimit-*` headers
});

app.use(limiter);

// =====================================================
// STATIC FILES
// =====================================================

app.use('/uploads', express.static('uploads'));

// =====================================================
// API ROUTES
// =====================================================

const API_PREFIX = process.env.API_PREFIX || '/api';

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Info endpoint
app.get(`${API_PREFIX}`, (req, res) => {
  res.status(200).json({
    name: process.env.APP_NAME || 'Real Estate Management API',
    version: process.env.APP_VERSION || '1.0.0',
    description: 'Professional Real Estate Management Backend API',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      properties: `${API_PREFIX}/properties`,
      inquiries: `${API_PREFIX}/inquiries`,
      messages: `${API_PREFIX}/messages`,
      notifications: `${API_PREFIX}/notifications`,
      upload: `${API_PREFIX}/upload`,
      favorites: `${API_PREFIX}/favorites`,
      ai: `${API_PREFIX}/ai`,
    },
  });
});

// =====================================================
// IMPORT ROUTES
// =====================================================

app.use(`${API_PREFIX}/auth`, require('./routes/auth.routes'));
app.use(`${API_PREFIX}/properties`, require('./routes/properties.routes'));
app.use(`${API_PREFIX}/inquiries`, require('./routes/inquiries.routes'));
app.use(`${API_PREFIX}/messages`, require('./routes/messages.routes'));
app.use(`${API_PREFIX}/upload`, require('./routes/upload.routes'));
app.use(`${API_PREFIX}/notifications`, require('./routes/notifications.routes'));
app.use(`${API_PREFIX}/favorites`, require('./routes/favorites.routes'));
app.use(`${API_PREFIX}/ai`, require('./routes/ai.routes'));

// =====================================================
// 404 HANDLER
// =====================================================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================

app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

// =====================================================
// SERVER STARTUP
// =====================================================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, async () => {
  console.log(`
    ╔════════════════════════════════════════════════════════╗
    ║     Real Estate Management API Server Started         ║
    ║─────────────────────────────────────────────────────────║
    ║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(41)} ║
    ║  Port: ${PORT.toString().padEnd(47)} ║
    ║  API URL: http://localhost:${PORT}${API_PREFIX} ${' '.repeat(25)} ║
    ║  Wi-Fi:   http://<ton-ip>:${PORT}${API_PREFIX} ${' '.repeat(22)} ║
    ║  Health Check: http://localhost:${PORT}/health ${' '.repeat(18)} ║
    ╚════════════════════════════════════════════════════════╝
  `);

  try {
    await initializePool();
    await ensureGoogleAuthSchema();
    await ensureUsersSchema();
    console.log('📦 Database connection: Connected');
  } catch (err) {
    console.error('📦 Database connection: Failed —', err.message);
  }
  console.log('✅ All middleware initialized');

  const aiProvider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  if (aiProvider === 'groq') {
    const groq = require('./services/groqService');
    console.log(groq.hasKey()
      ? `🤖 Guide IA : Groq (${process.env.GROQ_MODEL || groq.GROQ_MODEL})`
      : '🤖 Guide IA : mode données (clé Groq manquante)');
  }
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

const gracefulShutdown = () => {
  console.log('\n\nGraceful shutdown initiated...');

  server.close(() => {
    console.log('HTTP server closed');
    // Close database connection if needed
    // dbConnection.close();
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// =====================================================
// UNHANDLED PROMISE REJECTION
// =====================================================

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
