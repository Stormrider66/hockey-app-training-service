require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const moment = require('moment-timezone');

// Sätt standardtidszon
moment.tz.setDefault(process.env.TIMEZONE || 'Europe/Stockholm');

// Skapa Express-app
const app = express();
const port = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Databasanslutning
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hockey_app',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Testa databasanslutning
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

// Authentication middleware
const authMiddleware = require('./middleware/auth');

// Role check middleware
const { isAdmin, isAdminOrTeamAdmin, isTeamStaff } = require('./middleware/roleCheck');

// Routes
const exerciseRoutes = require('./routes/exerciseRoutes');
const testRoutes = require('./routes/testRoutes');
const testResultRoutes = require('./routes/testResultRoutes');
const programRoutes = require('./routes/programRoutes');

// Hälsokontroll-endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Training service is running',
    timestamp: new Date()
  });
});

// Använd routes
app.use('/api/exercises', authMiddleware, exerciseRoutes);
app.use('/api/tests', authMiddleware, testRoutes);
app.use('/api/test-results', authMiddleware, testResultRoutes);
app.use('/api/programs', authMiddleware, programRoutes);

// 404-hantering
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Resursen hittades inte'
  });
});

// Felhantering
app.use((err, req, res, next) => {
  console.error(err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ett fel inträffade';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(err.details ? { details: err.details } : {})
  });
});

// Starta servern
app.listen(port, () => {
  console.log(`Training service running on port ${port}`);
});

module.exports = { app, pool };