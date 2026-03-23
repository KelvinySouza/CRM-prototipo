// db/index.js  — wrapper do node-postgres
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://user:password@localhost:5432/saas_crm',
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
