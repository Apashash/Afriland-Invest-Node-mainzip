const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { execSync } = require('child_process');

const { CLIENT_DIST, UPLOADS_DIR } = require('./config');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const investmentRoutes = require('./routes/investment');
const depositRoutes = require('./routes/deposit');
const withdrawalRoutes = require('./routes/withdrawal');
const referralRoutes = require('./routes/referral');
const adminRoutes = require('./routes/admin');
const postRoutes = require('./routes/posts');
const annoncesRoutes = require('./routes/annonces');
const transactionsRoutes = require('./routes/transactions');

const { runMigrations } = require('./migrate');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/withdrawal', withdrawalRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/annonces', annoncesRoutes);
app.use('/api/transactions', transactionsRoutes);

// ── Health check & diagnostic ────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const { pool } = require('./db');
  const version = 'v2.1';
  const tables = ['utilisateurs', 'soldes', 'vip', 'commandes', 'planinvestissement', 'depots', 'retraits'];
  const result = { status: 'ok', version, timestamp: new Date().toISOString() };

  result.database_url_set = !!process.env.DATABASE_URL;

  try {
    await pool.query('SELECT 1');
    result.db_connection = '✅ connectée';
  } catch (e) {
    result.db_connection = `❌ échec: ${e.message}`;
    return res.json(result);
  }

  const tableStatus = {};
  for (const t of tables) {
    try {
      const r = await pool.query(`SELECT COUNT(*) FROM ${t}`);
      tableStatus[t] = `✅ (${r.rows[0].count} lignes)`;
    } catch (e) {
      tableStatus[t] = `❌ manquante`;
    }
  }
  result.tables = tableStatus;

  res.json(result);
});

// ── Auto-deploy webhook ──────────────────────────────────────────
app.get('/api/deploy', (req, res) => {
  const secret = process.env.DEPLOY_SECRET || 'afriland2024';
  if (req.query.secret !== secret) {
    return res.status(401).send('❌ Secret invalide');
  }
  try {
    const dir = path.join(__dirname, '..');
    const out = execSync(`cd ${dir} && git pull origin main 2>&1`, { timeout: 30000 }).toString();
    res.send(`<pre style="font-family:monospace;padding:20px">✅ Déploiement réussi !\n\n${out}\n\nRedémarrage dans 3 secondes...</pre>`);
    setTimeout(() => process.exit(0), 3000);
  } catch (e) {
    res.status(500).send(`<pre>❌ Erreur:\n${e.message}</pre>`);
  }
});

// ── Fichiers statiques client ────────────────────────────────────
app.use(express.static(CLIENT_DIST, { etag: false, lastModified: false }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route non trouvée' });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ AFRILAND INVEST server running on port ${PORT}`);
  try {
    await runMigrations();
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  }
});
