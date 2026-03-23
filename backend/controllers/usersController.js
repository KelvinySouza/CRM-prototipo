// controllers/usersController.js
const bcrypt = require('bcryptjs');
const db     = require('../db');

// GET /users  — lista equipe da empresa (admin only)
async function getUsers(req, res) {
  try {
    const r = await db.query(
      `SELECT id, name, email, role, active, created_at
       FROM users WHERE company_id = $1 ORDER BY name`,
      [req.user.companyId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /users  — cria funcionário (admin only)
async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const { companyId } = req.user;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });
    }

    const allowedRoles = ['admin', 'employee'];
    const userRole = allowedRoles.includes(role) ? role : 'employee';

    const hash = await bcrypt.hash(password, 12);

    const r = await db.query(
      `INSERT INTO users (name, email, password_hash, role, company_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role`,
      [name, email.toLowerCase(), hash, userRole, companyId]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado nesta empresa' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PATCH /users/:id/active  — ativa/desativa usuário
async function toggleActive(req, res) {
  try {
    const { active } = req.body;
    const { companyId } = req.user;

    // Admin não pode se desativar
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Você não pode se desativar' });
    }

    const r = await db.query(
      `UPDATE users SET active = $1
       WHERE id = $2 AND company_id = $3 RETURNING id, name, active`,
      [active, req.params.id, companyId]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { getUsers, createUser, toggleActive };
