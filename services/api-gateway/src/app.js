require('dotenv').config();
const express = require('express');
const axios   = require('axios');

const {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  downloadLimiter,
} = require('./middleware/rateLimiter');

const requestLogger = require('./middleware/requestLogger');
const logger        = require('./config/logger');

const app = express();

const AUTH_URL     = process.env.AUTH_SERVICE_URL     || 'http://auth-service:4002';
const METADATA_URL = process.env.METADATA_SERVICE_URL || 'http://metadata-service:4001';

// ─── CORS ──────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',  '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ─── Body Parser ───────────────────────────────────────────
app.use(express.json());

// ─── Request Logger ────────────────────────────────────────
app.use(requestLogger);

// ─── General Rate Limit ────────────────────────────────────
app.use(generalLimiter);

// ─── Health ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// ─── Auth Middleware ───────────────────────────────────────
async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const response = await axios.get(`${AUTH_URL}/auth/verify`, {
      headers: { authorization: authHeader },
      timeout: 5000,
    });
    req.userId = response.data.data.id;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// ─── Forward Helper ────────────────────────────────────────
async function forward(req, res, baseUrl) {
  try {
    const url = `${baseUrl}${req.path}`;
    logger.info({ type: 'FORWARD', method: req.method, url });

    const response = await axios({
      method        : req.method,
      url           : url,
      data          : req.body,
      headers       : {
        'content-type': 'application/json',
        'x-user-id'   : req.userId || '',
      },
      timeout       : 10000,
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    logger.error({ type: 'FORWARD_ERROR', error: err.message });
    res.status(502).json({ success: false, error: 'Service unavailable' });
  }
}

// ─── Public Routes ─────────────────────────────────────────
app.post('/auth/register', authLimiter,    (req, res) => forward(req, res, AUTH_URL));
app.post('/auth/login',    authLimiter,    (req, res) => forward(req, res, AUTH_URL));
app.get ('/auth/verify',                   (req, res) => forward(req, res, AUTH_URL));

// ─── Protected Routes ──────────────────────────────────────
app.get   ('/api/files',                        authenticate,                  (req, res) => forward(req, res, METADATA_URL));
app.post  ('/api/files/initiate',               authenticate, uploadLimiter,   (req, res) => forward(req, res, METADATA_URL));
app.post  ('/api/files/:fileId/confirm',        authenticate, uploadLimiter,   (req, res) => forward(req, res, METADATA_URL));
app.get   ('/api/files/:fileId/download-plan',  authenticate, downloadLimiter, (req, res) => forward(req, res, METADATA_URL));
app.delete('/api/files/:fileId',                authenticate,                  (req, res) => forward(req, res, METADATA_URL));

app.get ('/api/nodes',                    authenticate, (req, res) => forward(req, res, METADATA_URL));
app.post('/api/nodes/register',                         (req, res) => forward(req, res, METADATA_URL));
app.post('/api/nodes/:nodeId/heartbeat',                (req, res) => forward(req, res, METADATA_URL));

// ─── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.path}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Auth     → ${AUTH_URL}`);
  logger.info(`Metadata → ${METADATA_URL}`);
});