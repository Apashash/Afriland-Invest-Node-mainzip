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
const notificationsRoutes = require('./routes/notifications');

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
app.use('/api/notifications', notificationsRoutes);

// ── Setup admin (one-time, sécurisé par secret) ─────────────────
app.get('/api/setup-admin', async (req, res) => {
  const { pool } = require('./db');
  const secret = req.query.secret;
  const tel = req.query.tel;
  const SETUP_SECRET = process.env.SETUP_SECRET || 'afriland_setup_2024';

  if (!secret || secret !== SETUP_SECRET) {
    return res.status(403).json({ error: 'Secret invalide' });
  }
  if (!tel) {
    return res.status(400).json({ error: 'Paramètre tel manquant' });
  }

  try {
    // Ajouter colonne role si elle n'existe pas encore
    await pool.query(`ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'user'`).catch(() => {});

    const { rows } = await pool.query(
      `UPDATE utilisateurs SET role = 'admin' WHERE telephone = $1 RETURNING id, nom, telephone, role`,
      [tel]
    );

    if (rows.length === 0) {
      // Chercher sans indicatif pour aider au debug
      const all = await pool.query('SELECT id, nom, telephone, role FROM utilisateurs LIMIT 20');
      return res.json({ error: 'Numéro non trouvé', comptes_existants: all.rows });
    }

    res.json({
      success: true,
      message: `✅ Compte promu en ADMIN. Reconnectez-vous pour que le changement prenne effet.`,
      user: rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Paramètres publics (min dépôt / min retrait / horaires retrait) ────────────────
app.get('/api/settings/public', async (req, res) => {
  const { pool } = require('./db');
  const DEFAULTS = {
    min_depot: '500',
    min_retrait: '2000',
    retrait_max_par_jour: '1',
    retrait_jours: '1,2,3,4,5,6',
    retrait_heure_debut: '9',
    retrait_heure_fin: '19',
    retrait_off: '0',
    lien_whatsapp: '',
    lien_telegram: '',
    lien_whatsapp_groupe: '',
  };
  try {
    const { rows } = await pool.query(
      "SELECT cle, valeur FROM settings WHERE cle IN ('min_depot','min_retrait','retrait_max_par_jour','retrait_jours','retrait_heure_debut','retrait_heure_fin','retrait_off','lien_whatsapp','lien_telegram','lien_whatsapp_groupe')"
    );
    const map = { ...DEFAULTS };
    rows.forEach(r => { map[r.cle] = r.valeur; });
    res.json(map);
  } catch {
    res.json({ ...DEFAULTS });
  }
});

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
