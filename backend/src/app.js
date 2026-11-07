const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');

const app = express();

app.get('/healthz', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Nova Salud API',
    status: 'healthy'
  });
});

app.disable('x-powered-by');
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

app.use(express.json({ limit: '100kb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false
}));

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

module.exports = app;