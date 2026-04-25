const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ─── Security ────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────
app.use(cors({
  origin: config.cors.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate limiting ───────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { success: false, message: 'Demasiadas solicitudes, intentá de nuevo más tarde' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de autenticación' },
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// ─── Parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── Compression ─────────────────────────────────────────
app.use(compression());

// ─── Logging ─────────────────────────────────────────────
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Routes ──────────────────────────────────────────────
app.use('/api', routes);

// ─── 404 ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Error Handler ───────────────────────────────────────
app.use(errorHandler);

module.exports = app;
