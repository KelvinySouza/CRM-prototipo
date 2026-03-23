// routes/conversations.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/conversationsController');

router.get('/',                    auth(), c.getConversations);
router.get('/:id/messages',        auth(), c.getMessages);
router.post('/:id/messages',       auth(), c.sendMessage);
router.put('/:id/assume',          auth(), c.assumeConversation);
router.put('/:id/close',           auth(), c.closeConversation);

module.exports = router;
