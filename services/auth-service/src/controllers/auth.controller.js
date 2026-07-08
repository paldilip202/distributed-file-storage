const authService = require('../services/auth.service');
const asyncHandler = require('../middleware/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: 'Email and password required' });
  if (password.length < 8)
    return res.status(400).json({ success: false, error: 'Password min 8 characters' });
  const result = await authService.register(email, password);
  res.status(201).json({ success: true, data: result });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: 'Email and password required' });
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
});

const verify = asyncHandler(async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token)
    return res.status(401).json({ success: false, error: 'No token provided' });
  const user = await authService.verifyToken(token);
  res.json({ success: true, data: user });
});

module.exports = { register, login, verify };