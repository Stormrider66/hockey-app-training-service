require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Sätt upp databaspool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hockey_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Exportera pool för användning i andra moduler
module.exports = {
  pool
};

// Kontrollera databasanslutning
pool.connect((err, client, release) => {
  if (err) {
    console.error('Fel vid anslutning till databasen:', err);
    return;
  }
  console.log('Ansluten till PostgreSQL-databas');
  release();
});

// Importera routes
const iceSessionRoutes = require('./routes/iceSessionRoutes');
const physicalTrainingRoutes = require('./routes/physicalTrainingRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const testResultRoutes = require('./routes/testResultRoutes');

// Basic route för health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'training-service',
    timestamp: new Date()
  });
});

// Använd routes
app.use('/api/ice-sessions', iceSessionRoutes);
app.use('/api/physical-training', physicalTrainingRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/test-results', testResultRoutes);

// Hantera 404
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint hittades inte'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: true,
    message: 'Ett internt serverfel inträffade',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Starta servern
app.listen(port, () => {
  console.log(`Training service lyssnar på port ${port}`);
});