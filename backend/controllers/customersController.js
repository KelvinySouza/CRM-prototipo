// controllers/customersController.js
const db = require('../db');

// GET /customers  — lista clientes da empresa
async function getCustomers(req, res) {
  try {
    const { companyId } = req.user;
    const { search } = req.query;

    let query = `
      SELECT c.*,
             COUNT(DISTINCT cv.id) AS conversations_count,
             COUNT(DISTINCT l.id)  AS leads_count,
             COUNT(DISTINCT o.id)  AS orders_count
      FROM customers c
      LEFT JOIN conversations cv ON cv.customer_id = c.id
      LEFT JOIN leads l          ON l.customer_id  = c.id
      LEFT JOIN orders o         ON o.customer_id  = c.id
      WHERE c.company_id = $1
    `;
    const params = [companyId];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const r = await db.query(query, params);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /customers/:id
async function getCustomer(req, res) {
  try {
    const { companyId } = req.user;

    const r = await db.query(
      `SELECT c.*,
              json_agg(DISTINCT jsonb_build_object('id', cv.id, 'status', cv.status, 'channel', cv.channel, 'updated_at', cv.updated_at)) FILTER (WHERE cv.id IS NOT NULL) AS conversations,
              json_agg(DISTINCT jsonb_build_object('id', l.id, 'stage', l.stage, 'value', l.value)) FILTER (WHERE l.id IS NOT NULL) AS leads,
              json_agg(DISTINCT jsonb_build_object('id', o.id, 'total', o.total, 'status', o.status)) FILTER (WHERE o.id IS NOT NULL) AS orders
       FROM customers c
       LEFT JOIN conversations cv ON cv.customer_id = c.id
       LEFT JOIN leads l ON l.customer_id = c.id
       LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.id = $1 AND c.company_id = $2
       GROUP BY c.id`,
      [req.params.id, companyId]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /customers
async function createCustomer(req, res) {
  try {
    const { name, phone, email } = req.body;
    const { companyId } = req.user;

    const r = await db.query(
      `INSERT INTO customers (name, phone, email, company_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone, company_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
       RETURNING *`,
      [name || null, phone || null, email || null, companyId]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /customers/:id
async function updateCustomer(req, res) {
  try {
    const { name, phone, email } = req.body;
    const { companyId } = req.user;

    const r = await db.query(
      `UPDATE customers
       SET name  = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email)
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [name, phone, email, req.params.id, companyId]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer };
