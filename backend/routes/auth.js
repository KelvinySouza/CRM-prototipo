// routes/auth.js
const router = require('express').Router();
const { login, registerCompany } = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimit');
const { validate, loginSchema, registerCompanySchema } = require('../middleware/validation');

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register', validate(registerCompanySchema), registerCompany);

module.exports = router;
