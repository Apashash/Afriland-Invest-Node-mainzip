const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL non définie — ajoutez-la dans vos variables d\'environnement Plesk');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('❌ Erreur pool PostgreSQL:', err.message);
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
  .catch((err) => {
    console.error('❌ Connexion DB échouée:', err.message);
  });

module.exports = { query, withTransaction, pool };
