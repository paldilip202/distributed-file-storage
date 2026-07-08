const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class AuthRepository {
  async createUser(email, passwordHash) {
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at`,
      [uuidv4(), email, passwordHash]
    );
    return result.rows[0];
  }

  async findUserByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async findUserById(id) {
    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = new AuthRepository();