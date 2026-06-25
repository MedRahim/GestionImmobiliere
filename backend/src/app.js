require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { errorHandler } = require('./utils/errorHandler');
const { initializePool } = require('./models/database');

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get(API_PREFIX, (req, res) => {
  res.status(200).json({
    name: 'Gestion Immobiliere API',
    version: '1.0.0',
    endpoints: { auth: `${API_PREFIX}/auth` },
  });
});

app.use(`${API_PREFIX}/auth`, require('./routes/auth.routes'));
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));
app.use((err, req, res, next) => errorHandler(err, req, res, next));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, async () => {
  console.log(`API demarree sur http://localhost:${PORT}${API_PREFIX}`);
  try {
    await initializePool();
    console.log('Connexion SQL Server OK');
  } catch (err) {
    console.error('Connexion SQL Server echouee:', err.message);
  }
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
module.exports = app;
