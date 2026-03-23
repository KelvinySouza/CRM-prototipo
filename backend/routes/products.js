// routes/products.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/productsController');

router.get('/',              auth(),          c.getProducts);
router.post('/',             auth('admin'),   c.createProduct);
router.put('/:id',           auth('admin'),   c.updateProduct);
router.patch('/:id/stock',   auth('admin'),   c.adjustStock);

module.exports = router;
