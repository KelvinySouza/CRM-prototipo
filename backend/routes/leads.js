// routes/leads.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/leadsController');

router.get('/',            auth(),        c.getLeads);
router.post('/',           auth(),        c.createLead);
router.put('/:id/stage',   auth(),        c.updateStage);

module.exports = router;
