// controllers/productsController.js
const db = require('../db');

// GET /products
async function getProducts(req, res) {
  try {
    const r = await db.query(
      `SELECT * FROM products WHERE company_id = $1 AND active = true ORDER BY name`,
      [req.user.companyId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /products  (admin only)
async function createProduct(req, res) {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: 'Nome e preço obrigatórios' });
    }

    const r = await db.query(
      `INSERT INTO products (name, description, price, stock, company_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || '', price, stock || 0, req.user.companyId]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /products/:id  (admin only)
async function updateProduct(req, res) {
  try {
    const { name, description, price, stock, active } = req.body;
    const { companyId } = req.user;

    const check = await db.query(
      `SELECT id FROM products WHERE id = $1 AND company_id = $2`,
      [req.params.id, companyId]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Produto não encontrado' });

    const r = await db.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           active = COALESCE($5, active)
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [name, description, price, stock, active, req.params.id, companyId]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PATCH /products/:id/stock  — ajuste manual de estoque
async function adjustStock(req, res) {
  try {
    const { delta } = req.body; // positivo = entrada, negativo = saída
    if (delta == null) return res.status(400).json({ error: 'delta obrigatório' });

    const r = await db.query(
      `UPDATE products
       SET stock = GREATEST(0, stock + $1)
       WHERE id = $2 AND company_id = $3
       RETURNING id, name, stock`,
      [delta, req.params.id, req.user.companyId]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Produto não encontrado' });

    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { getProducts, createProduct, updateProduct, adjustStock };
