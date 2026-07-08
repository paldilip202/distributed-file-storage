const rateLimit = require('express-rate-limit');

// ─── General limiter — all routes ──────────────────────────
const generalLimiter = rateLimit({
  windowMs : 15 * 60 * 1000, // 15 minutes
  max      : 100,
  standardHeaders: true,
  legacyHeaders  : false,
  message  : {
    success: false,
    error  : 'Too many requests. Please try again after 15 minutes.',
  },
  skip: (req) => req.path === '/health',
});

// ─── Auth limiter — stricter (prevent brute force) ─────────
const authLimiter = rateLimit({
  windowMs : 15 * 60 * 1000,
  max      : 10,             // only 10 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders  : false,
  message  : {
    success: false,
    error  : 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// ─── Upload limiter — prevent large upload spam ─────────────
const uploadLimiter = rateLimit({
  windowMs : 60 * 1000,     // 1 minute
  max      : 10,             // 10 uploads per minute
  standardHeaders: true,
  legacyHeaders  : false,
  message  : {
    success: false,
    error  : 'Too many upload requests. Please wait 1 minute.',
  },
});

// ─── Download limiter ───────────────────────────────────────
const downloadLimiter = rateLimit({
  windowMs : 60 * 1000,
  max      : 30,
  standardHeaders: true,
  legacyHeaders  : false,
  message  : {
    success: false,
    error  : 'Too many download requests. Please wait 1 minute.',
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  downloadLimiter,
};