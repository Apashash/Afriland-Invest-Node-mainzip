const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRes, soldeRes, vipRes, filleulsRes, revenusRes, commandesRes] = await Promise.all([
      query('SELECT id,nom,telephone,pays,code_parrainage,lien_parrainage,date_inscription FROM utilisateurs WHERE id=$1', [userId]),
      query('SELECT solde FROM soldes WHERE user_id=$1', [userId]),
      query('SELECT niveau,pourcentage,invitations_requises,invitations_actuelles FROM vip WHERE user_id=$1', [userId]),
      query('SELECT COUNT(*) FROM utilisateurs WHERE parrain_id=$1', [userId]),
      query('SELECT montant FROM historique_revenus WHERE user_id=$1', [userId]),
      query(`SELECT c.*, p.nom as plan_nom, p.rendement_journalier, p.duree_jours
             FROM commandes c JOIN planinvestissement p ON c.plan_id=p.id
             WHERE c.user_id=$1 AND c.statut='actif' AND c.date_fin >= CURRENT_DATE
             ORDER BY c.date_debut DESC LIMIT 3`, [userId]),
    ]);

    const user = userRes.rows[0];
    const solde = soldeRes.rows[0]?.solde || 0;
    const vip = vipRes.rows[0] || { niveau: 0, pourcentage: 0, invitations_requises: 3, invitations_actuelles: 0 };
    const filleulsCount = parseInt(filleulsRes.rows[0]?.count || 0);
    const revenus_totaux = revenusRes.rows.reduce((sum, r) => sum + parseFloat(r.montant || 0), 0);

    res.json({
      user: { ...user, solde, revenus_totaux, nombre_filleuls: filleulsCount },
      vip,
      commandes_actives: commandesRes.rows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [userRes, soldeRes] = await Promise.all([
      query('SELECT id,nom,telephone,pays,code_parrainage,lien_parrainage,date_inscription FROM utilisateurs WHERE id=$1', [userId]),
      query('SELECT solde FROM soldes WHERE user_id=$1', [userId]),
    ]);
    res.json({ user: userRes.rows[0], solde: soldeRes.rows[0]?.solde || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/transaction-password', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || !/^\d{4}$/.test(password)) {
      return res.status(400).json({ error: 'Le mot de passe doit être composé de 4 chiffres' });
    }
    await query(
      'INSERT INTO transaction_passwords (user_id, password) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET password=$2',
      [req.user.id, password]
    );
    res.json({ success: true, message: 'Mot de passe de transaction mis à jour' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/wallet', authMiddleware, async (req, res) => {
  try {
    const res2 = await query('SELECT * FROM portefeuilles WHERE user_id=$1', [req.user.id]);
    res.json({ wallets: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/wallet', authMiddleware, async (req, res) => {
  try {
    const { nom_portefeuille, pays, methode_paiement, numero_telephone } = req.body;
    if (!nom_portefeuille || !pays || !methode_paiement || !numero_telephone) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }
    await query(
      `INSERT INTO portefeuilles (user_id, nom_portefeuille, pays, methode_paiement, numero_telephone)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET nom_portefeuille=$2, pays=$3, methode_paiement=$4, numero_telephone=$5`,
      [req.user.id, nom_portefeuille, pays, methode_paiement, numero_telephone]
    );
    res.json({ success: true, message: 'Portefeuille enregistré' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucune photo fournie' });
    await query('INSERT INTO photos_profil (user_id, nom_fichier) VALUES ($1,$2)', [req.user.id, req.file.filename]);
    res.json({ success: true, filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
