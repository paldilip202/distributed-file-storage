const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');

class AuthService {
  async register(email, password) {
    const existing = await authRepository.findUserByEmail(email);
    if (existing) {
      const err = new Error('Email already registered');
      err.status = 409;
      throw err;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await authRepository.createUser(email, passwordHash);
    const token = this.generateToken(user);
    return { user, token };
  }

  async login(email, password) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    const token = this.generateToken(user);
    return { user: { id: user.id, email: user.email }, token };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await authRepository.findUserById(decoded.id);
      if (!user) throw new Error('User not found');
      return user;
    } catch (err) {
      const error = new Error('Invalid or expired token');
      error.status = 401;
      throw error;
    }
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

module.exports = new AuthService();