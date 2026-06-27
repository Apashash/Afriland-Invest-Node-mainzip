const { Pool } = require('pg');

function buildConnectionString() {
  // Priorité 1 : URL directe
  if (process.env.DATABASE_URL)    return { url: process.env.DATABASE_URL,   source: 'DATABASE_URL' };
  if (process.env.SUPABASE_DB_URL) return { url: process.env.SUPABASE_DB_URL, source: 'SUPABASE_DB_URL' };
  if (process.env.POSTGRES_URL)    return { url: process.env.POSTGRES_URL,    source: 'POSTGRES_URL' };
  if (process.env.DB_URL)          return { url: process.env.DB_URL,          source: 'DB_URL' };
  if (process.env.POSTGRESQL_URL)  return { url: process.env.POSTGRESQL_URL,  source: 'POSTGRESQL_URL' };

  // Priorité 2 : construire depuis SUPABASE_URL + SUPABASE_DB_PASSWORD
  // Utilise la connexion directe PostgreSQL (db.[ref].supabase.co:5432)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
    const raw = process.env.SUPABASE_URL.replace(/\/$/, '');
    const match = raw.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
    if (match) {
      const ref = match[1];
      const pwd = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
      return {
        url: `postgresql://postgres:${pwd}@db.${ref}.supabase.co:5432/postgres`,
        source: 'SUPABASE_URL+SUPABASE_DB_PASSWORD (direct)',
      };
    }
  }

  return null;
}

const conn = buildConnectionString();

if (!conn) {
  console.error('❌ Aucune variable de connexion DB trouvée.');
  console.error('   → Ajoutez DATABASE_URL dans Plesk (URL PostgreSQL complète)');
  console.error('   → OU ajoutez SUPABASE_DB_PASSWORD (mot de passe DB Supabase)');
} else {
  console.log(`🔗 DB source : ${conn.source}`);
}

const pool = new Pool({
  connectionString: conn?.url,
  ssl: conn?.url && conn.url.includes('localhost') ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('❌ Erreur pool PostgreSQL:', err.message);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
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
