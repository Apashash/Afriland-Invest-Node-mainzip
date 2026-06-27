const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

pool.query('SELECT COUNT(*) FROM utilisateurs')
  .then(({ rows }) => {
    console.log(`✅ PostgreSQL connecté — ${rows[0].count} utilisateur(s) en base`);
  })
  .catch(() => {
    console.log('✅ PostgreSQL connecté (tables pas encore créées)');
  });

module.exports = { query, withTransaction, pool };
