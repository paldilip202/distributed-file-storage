require('dotenv').config();
const express = require('express');
const bcrypt  = require('bcryptjs');
const pool    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes   = require('./routes/auth.routes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));
app.use(errorHandler);

// ─── Auto-create demo user on startup ──────────────────────
async function createDemoUser() {
  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['demo@dfs.com']
    );

    if (existing.rows.length === 0) {
      const { v4: uuidv4 } = require('uuid');
      const hash = await bcrypt.hash('demo1234', 12);
      await pool.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, $2, $3)`,
        [uuidv4(), 'demo@dfs.com', hash]
      );
      console.log('✅ Demo user created: demo@dfs.com / demo1234');
    } else {
      console.log('✅ Demo user already exists');
    }
  } catch (err) {
    console.error('Demo user creation failed:', err.message);
  }
}

const PORT = process.env.PORT || 4002;
app.listen(PORT, async () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
  // Wait 3 seconds for DB to be ready then create demo user
  setTimeout(createDemoUser, 3000);
});

module.exports = app;