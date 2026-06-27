const { Pool } = require('pg');

function buildConnectionString() {
  if (process.env.DATABASE_URL)     return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_URL)  return process.env.SUPABASE_DB_URL;
  if (process.env.POSTGRES_URL)     return process.env.POSTGRES_URL;
  if (process.env.DB_URL)           return process.env.DB_URL;
  if (process.env.POSTGRESQL_URL)   return process.env.POSTGRESQL_URL;

  if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
    const url = process.env.SUPABASE_URL.replace(/\/$/, '');
    const match = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
    if (match) {
      const ref = match[1];
      const pwd = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
      const built = `postgresql://postgres.${ref}:${pwd}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
      console.log(`🔧 DATABASE_URL construite depuis SUPABASE_URL (ref: ${ref})`);
      return built;
    }
  }

  return null;
}

const connectionString = buildConnectionString();

if (!connectionString) {
  console.error('❌ AUCUNE variable de connexion DB trouvée.');
  console.error('   → Ajoutez DATABASE_URL dans Plesk');
  console.error('   → OU ajoutez SUPABASE_DB_PASSWORD (mot de passe de votre projet Supabase)');
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
    console.error('   → Vérifiez SUPABASE_DB_PASSWORD ou DATABASE_URL dans Plesk');
  });

module.exports = { query, withTransaction, pool };
