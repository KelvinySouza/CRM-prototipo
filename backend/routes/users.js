// routes/users.js
const router = require('express').Router();
const auth   = require('../middleware/auth');
const c      = require('../controllers/usersController');

router.get('/',               auth('admin'), c.getUsers);
router.post('/',              auth('admin'), c.createUser);
router.patch('/:id/active',   auth('admin'), c.toggleActive);

module.exports = router;
