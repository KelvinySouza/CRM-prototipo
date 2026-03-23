// routes/companies.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const db     = require('../db');

// GET /companies/me — dados da própria empresa
router.get('/me', auth(), async (req, res) => {
  try {
    const r = await db.query(
      `SELECT c.*, s.whatsapp_number, s.auto_reply_enabled, s.auto_reply_message
       FROM companies c
       LEFT JOIN settings s ON s.company_id = c.id
       WHERE c.id = $1`,
      [req.user.companyId]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /companies/me/settings — atualiza configurações
router.put('/me/settings', auth('admin'), async (req, res) => {
  try {
    const { whatsappNumber, whatsappToken, autoReplyEnabled, autoReplyMessage } = req.body;

    await db.query(
      `UPDATE settings SET
         whatsapp_number = COALESCE($1, whatsapp_number),
         whatsapp_token  = COALESCE($2, whatsapp_token),
         auto_reply_enabled  = COALESCE($3, auto_reply_enabled),
         auto_reply_message  = COALESCE($4, auto_reply_message),
         updated_at = NOW()
       WHERE company_id = $5`,
      [whatsappNumber, whatsappToken, autoReplyEnabled, autoReplyMessage, req.user.companyId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
