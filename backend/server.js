const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { responseBody } = require('./config/responseBody');
const messageRoutes = require('./routes/messageRoutes');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const app = express();

connectDB();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      upgradeInsecureRequests: [],
      connectSrc: ["'self'", "https:"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'"],
      childSrc: ["'self'"],
      manifestSrc: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true,
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://hellodoc-frontend.vercel.app',
      'https://hello-doc-frontend.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  const descriptor = Object.getOwnPropertyDescriptor(req, 'query') || {};
  Object.defineProperty(req, 'query', {
    ...descriptor,
    value: req.query,
    writable: true
  });
  next();
});

app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request from IP: ${req.ip}`);
  },
}));

app.use(xssClean());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
  next();
});

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const appointmentRoutes = require('./routes/appointmentRoutes');
app.use('/api/appointments', appointmentRoutes);

const doctorRoutes = require('./routes/doctorRoutes');
app.use('/api/doctors', doctorRoutes);

const patientRoutes = require('./routes/patientRoutes');
app.use('/api/patient', patientRoutes);

app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'HelloDoc Backend API - Secured',
    version: '1.0.0',
    status: 'healthy',
    security: {
      cors: 'strict',
      csp: 'enabled',
      headers: 'secured'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Secure HelloDoc server running on port ${PORT}`);
    console.log(`Security features enabled: CSP, CORS, Rate Limiting, Input Sanitization`);
  });
}

app.use((err, req, res, next) => {
  console.error('Error Details:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : 'Hidden in production',
    ip: req.ip,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json(responseBody(400, 'Only JPG, JPEG, PNG, or PDF files are allowed', null));
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json(responseBody(400, 'Only one file can be uploaded at a time', null));
  }

  if (err.name === 'MulterError') {
    return res.status(400).json(responseBody(400, 'Upload error occurred', null));
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json(responseBody(403, 'Access denied', null));
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  return res.status(500).json(responseBody(500, 'Internal server error', isDevelopment ? { error: err.message } : null));
});

app.use(/(.*)/, (req, res) => {
  res.status(404).json(responseBody(404, 'Route not found', null));
});

module.exports = app;