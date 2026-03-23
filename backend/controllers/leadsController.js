// controllers/leadsController.js
const db   = require('../db');
const auth = require('../middleware/auth');

// GET /leads  — lista leads da empresa (filtrado por role)
async function getLeads(req, res) {
  try {
    const { companyId, userId, role } = req.user;

    // Admin vê todos; funcionário só vê os seus
    const filter = role === 'admin'
      ? `WHERE l.company_id = $1`
      : `WHERE l.company_id = $1 AND l.assigned_to = $2`;

    const params = role === 'admin' ? [companyId] : [companyId, userId];

    const r = await db.query(
      `SELECT l.*, c.name as customer_name, c.phone,
              u.name as assigned_name
       FROM leads l
       JOIN customers c ON c.id = l.customer_id
       LEFT JOIN users u ON u.id = l.assigned_to
       ${filter}
       ORDER BY l.updated_at DESC`,
      params
    );

    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /leads/:id/stage  — move card no kanban
async function updateStage(req, res) {
  try {
    const { stage } = req.body;
    const validStages = ['novo', 'contato', 'proposta', 'fechado', 'perdido'];

    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Stage inválido' });
    }

    // Garante que o lead pertence à empresa do usuário logado
    const check = await db.query(
      `SELECT id FROM leads WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.companyId]
    );

    if (!check.rows.length) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    await db.query(
      `UPDATE leads SET stage = $1, updated_at = NOW() WHERE id = $2`,
      [stage, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /leads  — cria novo lead
async function createLead(req, res) {
  try {
    const { customerId, value, notes, assignedTo } = req.body;
    const { companyId } = req.user;

    const r = await db.query(
      `INSERT INTO leads (customer_id, company_id, value, notes, assigned_to)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customerId, companyId, value || null, notes || null, assignedTo || null]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { getLeads, updateStage, createLead };
