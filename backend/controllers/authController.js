// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../db'); // wrapper do pg
const logger = require('../utils/logger');

const SECRET = process.env.JWT_SECRET || 'troque-em-producao';

// Password validation function
function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&*)';
  }
  return null; // valid
}

// POST /auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await db.query(
      `SELECT u.*, c.name as company_name, c.domain, c.primary_color
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1 AND u.active = true`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        userId:    user.id,
        companyId: user.company_id,
        role:      user.role,
      },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        companyId:    user.company_id,
        companyName:  user.company_name,
        domain:       user.domain,
        primaryColor: user.primary_color,
      },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message, email: req.body.email });
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /auth/register-company   (criação de nova empresa + admin)
async function registerCompany(req, res) {
  const client = await db.pool.connect();
  try {
    const { companyName, domain, adminName, adminEmail, adminPassword } = req.body;

    // Validate password
    const passwordError = validatePassword(adminPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    await client.query('BEGIN');

    // 1. Cria empresa
    const companyRes = await client.query(
      `INSERT INTO companies (name, domain) VALUES ($1, $2) RETURNING id`,
      [companyName, domain.toLowerCase()]
    );
    const companyId = companyRes.rows[0].id;

    // 2. Hash da senha
    const hash = await bcrypt.hash(adminPassword, 12);

    // 3. Cria usuário admin
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, company_id)
       VALUES ($1, $2, $3, 'admin', $4) RETURNING id`,
      [adminName, adminEmail.toLowerCase(), hash, companyId]
    );

    // 4. Settings padrão
    await client.query(
      `INSERT INTO settings (company_id) VALUES ($1)`,
      [companyId]
    );

    await client.query('COMMIT');

    res.status(201).json({ companyId, userId: userRes.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Domínio ou email já cadastrado' });
    }
    logger.error('Registration error', { error: err.message, domain: req.body.domain, email: req.body.adminEmail });
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
}

module.exports = { login, registerCompany };
