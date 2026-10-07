const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const settingsRouter = require('./routes/settings');
const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');
const staffRouter = require('./routes/staff');
const billsRouter = require('./routes/bills');
const reportsRouter = require('./routes/reports');
const syncRouter = require('./routes/sync');

const app = express();

// Security and CORS middleware: allow requests from LAN and desktop client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body parsers (supports JSON and Base64 images for logos/QR)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve assets folder (for logo images)
const assetsPath = path.join(__dirname, '..', 'assets');
app.use('/assets', express.static(assetsPath));

// API routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/bills', billsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sync', syncRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Server Uncaught Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

module.exports = app;
