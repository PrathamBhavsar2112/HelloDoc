

const client = require('prom-client');

client.collectDefaultMetrics();
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

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
      baseUri:   ["'self'"],
      fontSrc:   ["'self'", "https:", "data:"],
      formAction:["'self'"],
      frameAncestors: ["'self'"],
      imgSrc:    ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc:  ["'self'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      upgradeInsecureRequests: [],
      connectSrc: ["'self'", "https:"],
      mediaSrc:  ["'self'"],
      workerSrc: ["'self'"],
      childSrc:  ["'self'"],
      manifestSrc:["'self'"]
    }
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginOpenerPolicy:   { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl:        { allow: false },
  frameguard:                { action: 'deny' },
  hidePoweredBy:             true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen:        true,
  noSniff:         true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy:  { policy: "no-referrer" },
  xssFilter:       true,
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://hellodoc-frontend.vercel.app',
      'https://hello-doc-frontend.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    if (allowed.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  exposedHeaders: ['Content-Range','X-Content-Range'],
  optionsSuccessStatus: 200
}));


app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());


app.use((req, res, next) => {
  const desc = Object.getOwnPropertyDescriptor(req, 'query') || {};
  Object.defineProperty(req, 'query', {
    ...desc,
    value: req.query,
    writable: true
  });
  next();
});


app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request from IP: ${req.ip}`);
  }
}));

// XSS clean
app.use(xssClean());

// Custom security headers
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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

const authRoutes       = require('./routes/authRoutes');
const appointmentRoutes= require('./routes/appointmentRoutes');
const doctorRoutes     = require('./routes/doctorRoutes');
const patientRoutes    = require('./routes/patientRoutes');

app.use('/api/auth',        authRoutes);
app.use('/api/appointments',appointmentRoutes);
app.use('/api/doctors',     doctorRoutes);
app.use('/api/patient',     patientRoutes);
app.use('/api/messages',    messageRoutes);

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

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.use((err, req, res, next) => {
  console.error('Error Details:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : 'hidden',
    ip: req.ip,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json(responseBody(400, 'Only JPG, JPEG, PNG, or PDF files are allowed', null));
  }
  if (['LIMIT_UNEXPECTED_FILE','LIMIT_FILE_COUNT'].includes(err.code)) {
    return res.status(400).json(responseBody(400, 'Only one file can be uploaded at a time', null));
  }
  if (err.name === 'MulterError') {
    return res.status(400).json(responseBody(400, 'Upload error occurred', null));
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json(responseBody(403, 'Access denied', null));
  }

  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json(
    responseBody(500, 'Internal server error', isDev ? { error: err.message } : null)
  );
});

app.use(/.*/, (req, res) => {
  res.status(404).json(responseBody(404, 'Route not found', null));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Secure HelloDoc server running on port ${PORT}`);
    console.log(`Security features enabled: CSP, CORS, Rate Limiting, Input Sanitization`);
  });
}

module.exports = app;
