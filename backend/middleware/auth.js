// middleware/auth.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'troque-em-producao';

/**
 * Verifica o token JWT e injeta req.user.
 * Uso: router.get('/rota', auth(), handler)
 *      router.get('/admin', auth('admin'), handler)
 */
function auth(requiredRole = null) {
  return (req, res, next) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token ausente' });
    }

    const token = header.split(' ')[1];

    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = decoded; // { userId, companyId, role }

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  };
}

module.exports = auth;
