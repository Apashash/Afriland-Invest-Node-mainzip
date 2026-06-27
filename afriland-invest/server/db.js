const { Pool } = require('pg');

function buildConnectionConfig() {
  const url = process.env.SUPABASE_DB_URL ||
               process.env.DATABASE_URL ||
               process.env.POSTGRES_URL ||
               process.env.DB_URL ||
               process.env.POSTGRESQL_URL;

  if (url) {
    const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
    const isReplitLocal = url.includes('pg.replit') || url.includes('neon.tech') || (!url.includes('supabase') && process.env.PGHOST);
    const ssl = (isLocalhost || isReplitLocal) ? false : { rejectUnauthorized: false };
    const source = process.env.SUPABASE_DB_URL ? 'SUPABASE_DB_URL' : 'DATABASE_URL';
    console.log(`🔗 DB source : ${source}`);
    return { connectionString: url, ssl };
  }

  if (process.env.PGHOST) {
    console.log(`🔗 DB source : PG* env vars`);
    return {
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: false,
    };
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
    const raw = process.env.SUPABASE_URL.replace(/\/$/, '');
    const match = raw.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
    if (match) {
      const ref = match[1];
      const pwd = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
      console.log(`🔗 DB source : SUPABASE_URL+SUPABASE_DB_PASSWORD (direct)`);
      return {
        connectionString: `postgresql://postgres:${pwd}@db.${ref}.supabase.co:5432/postgres`,
        ssl: { rejectUnauthorized: false },
      };
    }
  }

  console.error('❌ Aucune variable de connexion DB trouvée.');
  return {};
}

const config = buildConnectionConfig();

const pool = new Pool(config);

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
