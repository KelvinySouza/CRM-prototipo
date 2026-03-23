// db/seed.js  — popula banco com dados de teste
// Executar: node db/seed.js
require('dotenv').config();
const { Pool }  = require('pg');
const bcrypt    = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/saas_crm',
});

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Iniciando seed...');
    await client.query('BEGIN');

    // ---- Empresa 1 ----
    const companyRes = await client.query(`
      INSERT INTO companies (name, domain, primary_color)
      VALUES ('Loja Demo', 'loja-demo', '#6366f1')
      ON CONFLICT (domain) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const companyId = companyRes.rows[0].id;
    console.log('✅ Empresa criada:', companyId);

    // ---- Admin ----
    const adminHash = await bcrypt.hash('admin123', 12);
    const adminRes  = await client.query(`
      INSERT INTO users (name, email, password_hash, role, company_id)
      VALUES ('Admin Demo', 'admin@demo.com', $1, 'admin', $2)
      ON CONFLICT (email, company_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id
    `, [adminHash, companyId]);
    const adminId = adminRes.rows[0].id;
    console.log('✅ Admin criado: admin@demo.com / admin123');

    // ---- Funcionário ----
    const empHash = await bcrypt.hash('func123', 12);
    const empRes  = await client.query(`
      INSERT INTO users (name, email, password_hash, role, company_id)
      VALUES ('João Vendedor', 'joao@demo.com', $1, 'employee', $2)
      ON CONFLICT (email, company_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id
    `, [empHash, companyId]);
    const empId = empRes.rows[0].id;
    console.log('✅ Funcionário criado: joao@demo.com / func123');

    // ---- Settings ----
    await client.query(`
      INSERT INTO settings (company_id, whatsapp_number)
      VALUES ($1, '+5511999999999')
      ON CONFLICT (company_id) DO NOTHING
    `, [companyId]);

    // ---- Produtos ----
    const produtos = [
      { name: 'Camiseta Básica',   description: 'Algodão 100%',        price: 59.90,  stock: 50 },
      { name: 'Calça Jeans',       description: 'Slim fit',             price: 149.90, stock: 30 },
      { name: 'Tênis Casual',      description: 'Couro sintético',      price: 199.90, stock: 20 },
      { name: 'Boné Aba Curva',    description: 'Snapback ajustável',   price: 49.90,  stock: 8  },
      { name: 'Mochila Urbana',    description: '20L, resistente',      price: 129.90, stock: 3  }, // low stock
      { name: 'Meias Kit 3 pares', description: 'Cano médio',           price: 29.90,  stock: 100 },
    ];

    const prodIds = [];
    for (const p of produtos) {
      const r = await client.query(`
        INSERT INTO products (name, description, price, stock, company_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [p.name, p.description, p.price, p.stock, companyId]);
      if (r.rows[0]) prodIds.push(r.rows[0].id);
    }
    console.log(`✅ ${prodIds.length} produtos criados`);

    // ---- Clientes ----
    const clientes = [
      { name: 'Maria Silva',    phone: '11987654321', email: 'maria@exemplo.com' },
      { name: 'Carlos Pereira', phone: '11976543210', email: 'carlos@exemplo.com' },
      { name: 'Ana Souza',      phone: '11965432109', email: null },
      { name: 'Bruno Lima',     phone: '11954321098', email: 'bruno@exemplo.com' },
    ];

    const custIds = [];
    for (const c of clientes) {
      const r = await client.query(`
        INSERT INTO customers (name, phone, email, company_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (phone, company_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [c.name, c.phone, c.email, companyId]);
      custIds.push(r.rows[0].id);
    }
    console.log(`✅ ${custIds.length} clientes criados`);

    // ---- Conversas + mensagens ----
    const convData = [
      { custIdx: 0, assignedTo: empId,   msgs: [
        { sender: 'client', content: 'Oi, vocês têm tênis número 42?' },
        { sender: 'user',   content: 'Olá Maria! Temos sim, em qual cor você prefere?' },
        { sender: 'client', content: 'Preto, por favor' },
      ]},
      { custIdx: 1, assignedTo: empId,   msgs: [
        { sender: 'client', content: 'Qual o prazo de entrega?' },
        { sender: 'user',   content: 'Entregamos em até 5 dias úteis para todo Brasil!' },
      ]},
      { custIdx: 2, assignedTo: null, msgs: [
        { sender: 'client', content: 'Quero saber sobre a calça jeans' },
      ]},
    ];

    for (const cv of convData) {
      const cvRes = await client.query(`
        INSERT INTO conversations (customer_id, company_id, assigned_to, channel)
        VALUES ($1, $2, $3, 'whatsapp') RETURNING id
      `, [custIds[cv.custIdx], companyId, cv.assignedTo]);
      const cvId = cvRes.rows[0].id;

      for (const msg of cv.msgs) {
        await client.query(`
          INSERT INTO messages (conversation_id, sender, content) VALUES ($1, $2, $3)
        `, [cvId, msg.sender, msg.content]);
      }
    }
    console.log('✅ Conversas e mensagens criadas');

    // ---- Leads ----
    const stages = ['novo', 'contato', 'proposta', 'fechado'];
    for (let i = 0; i < custIds.length; i++) {
      await client.query(`
        INSERT INTO leads (customer_id, company_id, assigned_to, stage, value)
        VALUES ($1, $2, $3, $4, $5)
      `, [custIds[i], companyId, i < 2 ? empId : null, stages[i], (i + 1) * 350]);
    }
    console.log('✅ Leads criados');

    // ---- Pedidos ----
    if (prodIds.length >= 2) {
      const orderRes = await client.query(`
        INSERT INTO orders (customer_id, company_id, total, status)
        VALUES ($1, $2, 259.80, 'paid') RETURNING id
      `, [custIds[0], companyId]);
      const orderId = orderRes.rows[0].id;

      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES ($1, $2, 1, 199.90), ($1, $3, 2, 29.95)
      `, [orderId, prodIds[0], prodIds[5] || prodIds[1]]);
    }
    console.log('✅ Pedidos criados');

    await client.query('COMMIT');
    console.log('\n🎉 Seed concluído!\n');
    console.log('Credenciais para testar:');
    console.log('  Admin:       admin@demo.com / admin123');
    console.log('  Funcionário: joao@demo.com  / func123\n');
    console.log('Loja pública: http://localhost:3000/loja/loja-demo');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
