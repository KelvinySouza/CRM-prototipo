// routes/webhook.js
const router = require('express').Router();
const { receiveWhatsApp } = require('../controllers/webhookController');

// Verificação de token (Meta / WhatsApp Business API)
router.get('/whatsapp', (req, res) => {
  const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'meu-token-secreto';
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/whatsapp', receiveWhatsApp);

module.exports = router;
