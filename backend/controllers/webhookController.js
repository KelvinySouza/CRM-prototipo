// controllers/webhookController.js
// Recebe mensagens do WhatsApp e as processa no inbox
const db = require('../db');
const crypto = require('crypto');

// POST /webhook/whatsapp
async function receiveWhatsApp(req, res) {
  try {
    // Verify webhook signature if provided
    const signature = req.headers['x-hub-signature-256'] || req.headers['signature'];
    const timestamp = req.headers['x-hub-timestamp'] || Date.now().toString();
    const secret = process.env.WEBHOOK_SECRET || 'default-webhook-secret';

    if (signature) {
      const expected = crypto.createHmac('sha256', secret)
        .update(`${timestamp}.${JSON.stringify(req.body)}`)
        .digest('hex');
      if (signature !== `sha256=${expected}`) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // O payload varia por provedor (Meta, Z-API, etc.)
    // Aqui normalizamos para o formato interno
    const { phone, message, companyDomain } = normalizePayload(req.body);

    if (!phone || !message) {
      return res.sendStatus(200); // ignora pings de verificação
    }

    // 1. Identifica empresa pelo domínio ou token do webhook
    const company = await findCompanyByDomain(companyDomain);
    if (!company) return res.sendStatus(404);

    // 2. Encontra ou cria cliente
    let customer = await findCustomerByPhone(phone, company.id);
    if (!customer) {
      customer = await createCustomer(phone, company.id);
    }

    // 3. Encontra ou cria conversa aberta
    let conversation = await findOpenConversation(customer.id, company.id);
    if (!conversation) {
      conversation = await createConversation(customer.id, company.id);
    }

    // 4. Salva mensagem
    await saveMessage(conversation.id, 'client', message);

    // 5. Atualiza timestamp da conversa
    await db.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversation.id]
    );

    // Emit WebSocket event for real-time updates
    if (req.io) {
      req.io.to(`company:${company.id}`).emit('new_message', {
        conversationId: conversation.id,
        message: { sender: 'client', content: message, timestamp: new Date() },
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
}

// ---- helpers ----

function normalizePayload(body) {
  // Adapte aqui conforme o provedor WhatsApp que você usar
  // Exemplo para Z-API:
  if (body.phone && body.text?.message) {
    return {
      phone:         body.phone.replace(/\D/g, ''),
      message:       body.text.message,
      companyDomain: body.instanceId, // configure no provedor
    };
  }
  // Fallback genérico
  return {
    phone:         (body.phone || '').replace(/\D/g, ''),
    message:       body.message || '',
    companyDomain: body.domain || '',
  };
}

async function findCompanyByDomain(domain) {
  const r = await db.query(
    `SELECT * FROM companies WHERE domain = $1 AND active = true`,
    [domain]
  );
  return r.rows[0] || null;
}

async function findCustomerByPhone(phone, companyId) {
  const r = await db.query(
    `SELECT * FROM customers WHERE phone = $1 AND company_id = $2`,
    [phone, companyId]
  );
  return r.rows[0] || null;
}

async function createCustomer(phone, companyId) {
  const r = await db.query(
    `INSERT INTO customers (phone, company_id) VALUES ($1, $2) RETURNING *`,
    [phone, companyId]
  );
  return r.rows[0];
}

async function findOpenConversation(customerId, companyId) {
  const r = await db.query(
    `SELECT * FROM conversations
     WHERE customer_id = $1 AND company_id = $2 AND status = 'open'
     ORDER BY updated_at DESC LIMIT 1`,
    [customerId, companyId]
  );
  return r.rows[0] || null;
}

async function createConversation(customerId, companyId) {
  const r = await db.query(
    `INSERT INTO conversations (customer_id, company_id, channel)
     VALUES ($1, $2, 'whatsapp') RETURNING *`,
    [customerId, companyId]
  );
  return r.rows[0];
}

async function saveMessage(conversationId, sender, content) {
  return db.query(
    `INSERT INTO messages (conversation_id, sender, content) VALUES ($1, $2, $3)`,
    [conversationId, sender, content]
  );
}

module.exports = { receiveWhatsApp };
