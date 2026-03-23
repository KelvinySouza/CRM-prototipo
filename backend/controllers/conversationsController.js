// controllers/conversationsController.js
const db = require('../db');

// GET /conversations  — lista conversas da empresa (filtrado por role)
async function getConversations(req, res) {
  try {
    const { companyId, userId, role } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status || 'all';

    let filter = role === 'admin'
      ? `WHERE cv.company_id = $1`
      : `WHERE cv.company_id = $1 AND (cv.assigned_to = $2 OR cv.assigned_to IS NULL)`;

    const params = role === 'admin' ? [companyId] : [companyId, userId];

    if (status !== 'all') {
      filter += ` AND cv.status = $${params.length + 1}`;
      params.push(status);
    }

    if (search) {
      filter += ` AND (c.name ILIKE $${params.length + 1} OR c.phone ILIKE $${params.length + 1} OR cv.id::text = $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    const countParams = params.slice();

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM conversations cv
                        JOIN customers c ON c.id = cv.customer_id
                        LEFT JOIN users u ON u.id = cv.assigned_to
                        ${filter}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const r = await db.query(
      `SELECT cv.*,
              c.name  AS customer_name,
              c.phone AS customer_phone,
              u.name  AS assigned_name,
              (SELECT content FROM messages m
               WHERE m.conversation_id = cv.id
               ORDER BY m.timestamp DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM messages m
               WHERE m.conversation_id = cv.id AND m.read = false AND m.sender = 'client') AS unread_count
       FROM conversations cv
       JOIN customers c ON c.id = cv.customer_id
       LEFT JOIN users u ON u.id = cv.assigned_to
       ${filter}
       ORDER BY cv.updated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      conversations: r.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// GET /conversations/:id/messages
async function getMessages(req, res) {
  try {
    const { companyId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    // Segurança: garante que a conversa pertence à empresa
    const check = await db.query(
      `SELECT id FROM conversations WHERE id = $1 AND company_id = $2`,
      [req.params.id, companyId]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Conversa não encontrada' });

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM messages WHERE conversation_id = $1`,
      [req.params.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const r = await db.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );

    // Marca como lidas (only for current page's messages from client)
    if (r.rows.length > 0) {
      const messageIds = r.rows.filter(m => m.sender === 'client' && !m.read).map(m => m.id);
      if (messageIds.length > 0) {
        await db.query(
          `UPDATE messages SET read = true WHERE id = ANY($1)`,
          [messageIds]
        );
      }
    }

    res.json({
      messages: r.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// POST /conversations/:id/messages  — agente envia mensagem
async function sendMessage(req, res) {
  try {
    const { content } = req.body;
    const { companyId, userId } = req.user;

    if (!content?.trim()) return res.status(400).json({ error: 'Conteúdo vazio' });

    const check = await db.query(
      `SELECT * FROM conversations WHERE id = $1 AND company_id = $2`,
      [req.params.id, companyId]
    );
    const conv = check.rows[0];
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

    const r = await db.query(
      `INSERT INTO messages (conversation_id, sender, content)
       VALUES ($1, 'user', $2) RETURNING *`,
      [conv.id, content.trim()]
    );

    await db.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conv.id]
    );

    // TODO: enviar mensagem de volta via API do WhatsApp/Instagram

    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /conversations/:id/assume  — vendedor assume a conversa
async function assumeConversation(req, res) {
  try {
    const { companyId, userId } = req.user;

    await db.query(
      `UPDATE conversations SET assigned_to = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3`,
      [userId, req.params.id, companyId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// PUT /conversations/:id/close
async function closeConversation(req, res) {
  try {
    const { companyId } = req.user;

    await db.query(
      `UPDATE conversations SET status = 'closed', updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, companyId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { getConversations, getMessages, sendMessage, assumeConversation, closeConversation };
