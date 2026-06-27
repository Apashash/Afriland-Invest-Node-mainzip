const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { supabase } = require('./db');
const { UPLOADS_DIR, CLIENT_DIST } = require('./config');

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
  console.log(`AFRILAND INVEST server running on port ${PORT}`);
  try {
    const { count } = await supabase.from('utilisateurs').select('*', { count: 'exact', head: true });
    console.log(`✅ Supabase connecté — ${count || 0} utilisateur(s) en base`);
  } catch (err) {
    console.error('❌ Erreur vérification Supabase:', err.message);
  }
});
