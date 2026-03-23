// routes/customers.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/customersController');

router.get('/',      auth(), c.getCustomers);
router.get('/:id',   auth(), c.getCustomer);
router.post('/',     auth(), c.createCustomer);
router.put('/:id',   auth(), c.updateCustomer);

module.exports = router;
