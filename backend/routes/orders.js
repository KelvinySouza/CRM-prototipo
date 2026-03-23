// routes/orders.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/ordersController');

router.get('/',   auth(),         c.getOrders);
router.post('/',  auth(),         c.createOrder);

module.exports = router;
