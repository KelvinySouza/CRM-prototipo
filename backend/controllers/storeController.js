// controllers/storeController.js
const db = require('../db');

// GET /:domain  — loja pública da empresa
async function renderStore(req, res) {
  try {
    const { domain } = req.params;

    // Ignora rotas internas (api, auth, etc.)
    const reserved = ['auth', 'companies', 'users', 'customers', 'conversations',
                      'messages', 'leads', 'products', 'orders', 'webhook', 'favicon.ico'];
    if (reserved.includes(domain)) return res.sendStatus(404);

    const companyResult = await db.query(
      `SELECT * FROM companies WHERE domain = $1 AND active = true`,
      [domain]
    );
    const company = companyResult.rows[0];
    if (!company) return res.status(404).json({ error: 'Loja não encontrada' });

    const productsResult = await db.query(
      `SELECT id, name, description, price, stock
       FROM products
       WHERE company_id = $1 AND active = true AND stock > 0
       ORDER BY name`,
      [company.id]
    );

    // Retorna JSON (frontend Next.js consome via getServerSideProps)
    // Se quiser SSR clássico, substituir por res.render('store', {...})
    res.json({
      company: {
        id:           company.id,
        name:         company.name,
        domain:       company.domain,
        logoUrl:      company.logo_url,
        primaryColor: company.primary_color,
      },
      products: productsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
}

module.exports = { renderStore };
