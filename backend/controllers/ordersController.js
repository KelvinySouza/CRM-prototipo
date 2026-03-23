// controllers/ordersController.js
const db = require('../db');

// POST /orders  — cria pedido e baixa estoque (transação atômica)
async function createOrder(req, res) {
  const client = await db.pool.connect();
  try {
    const { customerId, items } = req.body;
    // items: [{ productId, quantity }]
    const { companyId } = req.user;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Itens obrigatórios' });
    }

    await client.query('BEGIN');

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      // Bloqueia a linha para evitar race condition (SELECT FOR UPDATE)
      const prodResult = await client.query(
        `SELECT * FROM products
         WHERE id = $1 AND company_id = $2 AND active = true
         FOR UPDATE`,
        [item.productId, companyId]
      );

      const product = prodResult.rows[0];

      if (!product) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produto ${item.productId} não encontrado` });
      }

      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Estoque insuficiente para "${product.name}"`,
          available: product.stock,
        });
      }

      // Baixa estoque
      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, product.id]
      );

      total += parseFloat(product.price) * item.quantity;
      orderItems.push({ productId: product.id, quantity: item.quantity, unitPrice: product.price });
    }

    // Cria pedido
    const orderRes = await client.query(
      `INSERT INTO orders (customer_id, company_id, total)
       VALUES ($1, $2, $3) RETURNING id`,
      [customerId, companyId, total.toFixed(2)]
    );
    const orderId = orderRes.rows[0].id;

    // Insere itens
    for (const oi of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, oi.productId, oi.quantity, oi.unitPrice]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ orderId, total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  } finally {
    client.release();
  }
}

// GET /orders  — lista pedidos da empresa
async function getOrders(req, res) {
  try {
    const r = await db.query(
      `SELECT o.*, c.name as customer_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.company_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.companyId]
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { createOrder, getOrders };
