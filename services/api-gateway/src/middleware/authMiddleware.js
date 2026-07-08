const axios = require('axios');

const authMiddleware = async (req, res, next) => {
  // Token header se lo
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    // Auth service se verify karo
    const response = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/verify`,
      {
        headers: { authorization: `Bearer ${token}` },
        timeout: 5000,
      }
    );

    // User ID ko header mein inject karo
    req.headers['x-user-id'] = response.data.data.id;
    next();

  } catch (err) {
    const status = err.response?.status || 401;
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

module.exports = authMiddleware;