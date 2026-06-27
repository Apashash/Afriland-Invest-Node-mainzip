const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  process.env.DB_URL ||
  process.env.POSTGRESQL_URL;

if (!connectionString) {
  console.error('❌ AUCUNE variable de connexion DB trouvée (DATABASE_URL, SUPABASE_DB_URL, POSTGRES_URL, DB_URL)');
  console.error('Variables disponibles:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('PASSWORD') && !k.includes('KEY')).join(', '));
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
    console.error('Vérifiez DATABASE_URL dans vos variables d\'environnement Plesk');
  });

module.exports = { query, withTransaction, pool };
