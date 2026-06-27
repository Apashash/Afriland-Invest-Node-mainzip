const express = require('express');
const { query, withTransaction } = require('../db');
const { adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { UPLOADS_DIR } = require('../config');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, 'annonce_' + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [usersRes, depotsValidesRes, retraitsValidesRes, commandesActifRes, depotsAttenteRes, retraitsAttenteRes, commandesUsersRes] = await Promise.all([
      query('SELECT COUNT(*) FROM utilisateurs'),
      query("SELECT montant FROM depots WHERE statut = 'valide'"),
      query("SELECT montant FROM retraits WHERE statut = 'valide'"),
      query("SELECT COUNT(*) FROM commandes WHERE statut = 'actif'"),
      query("SELECT COUNT(*) FROM depots WHERE statut = 'en_attente'"),
      query("SELECT COUNT(*) FROM retraits WHERE statut = 'en_attente'"),
      query("SELECT DISTINCT user_id FROM commandes WHERE statut = 'actif' AND date_fin >= $1", [today]),
    ]);

    const totalDepots = depotsValidesRes.rows.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
    const totalRetraits = retraitsValidesRes.rows.reduce((s, r) => s + parseFloat(r.montant || 0), 0);

    res.json({
      users: { count: parseInt(usersRes.rows[0].count) },
      depots: { total: totalDepots, en_attente: parseInt(depotsAttenteRes.rows[0].count) },
      retraits: { total: totalRetraits, en_attente: parseInt(retraitsAttenteRes.rows[0].count) },
      commandes: { count: parseInt(commandesActifRes.rows[0].count) },
      users_avec_investissement: commandesUsersRes.rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.nom, u.telephone, u.pays, u.date_inscription, u.role, s.solde
       FROM utilisateurs u LEFT JOIN soldes s ON s.user_id = u.id
       ORDER BY u.date_inscription DESC LIMIT 100`
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id/credit', adminMiddleware, async (req, res) => {
  try {
    const { montant } = req.body;
    const userId = parseInt(req.params.id);
    if (!montant || isNaN(montant)) return res.status(400).json({ error: 'Montant invalide' });
    const montantNum = parseFloat(montant);
    if (montantNum <= 0) return res.status(400).json({ error: 'Montant invalide' });

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
        [userId, montantNum]
      );
      await client.query(
        "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'credit_admin')",
        [userId, montantNum]
      );
    });

    res.json({ success: true, message: 'Crédit effectué' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/depots', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT d.*, u.nom, u.telephone FROM depots d JOIN utilisateurs u ON d.user_id = u.id
       ORDER BY d.date_depot DESC LIMIT 100`
    );
    res.json({ depots: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/depots/:id/validate', adminMiddleware, async (req, res) => {
  try {
    const depotId = parseInt(req.params.id);
    const result = await withTransaction(async (client) => {
      const depotRes = await client.query("SELECT * FROM depots WHERE id = $1 AND statut = 'en_attente'", [depotId]);
      if (!depotRes.rows[0]) return { error: 'Dépôt non trouvé ou déjà traité' };
      const depot = depotRes.rows[0];

      await client.query("UPDATE depots SET statut = 'valide', date_traitement = NOW() WHERE id = $1", [depotId]);
      await client.query(
        `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
        [depot.user_id, depot.montant]
      );
      return { success: true };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Dépôt validé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/depots/:id/reject', adminMiddleware, async (req, res) => {
  try {
    await query("UPDATE depots SET statut = 'rejete', date_traitement = NOW() WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: 'Dépôt rejeté' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/retraits', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT r.*, u.nom, u.telephone FROM retraits r JOIN utilisateurs u ON r.user_id = u.id
       ORDER BY r.date_demande DESC LIMIT 100`
    );
    res.json({ retraits: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/retraits/:id/validate', adminMiddleware, async (req, res) => {
  try {
    await query("UPDATE retraits SET statut = 'valide', date_traitement = NOW() WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: 'Retrait validé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/retraits/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const retraitId = parseInt(req.params.id);
    const result = await withTransaction(async (client) => {
      const retraitRes = await client.query("SELECT * FROM retraits WHERE id = $1 AND statut = 'en_attente'", [retraitId]);
      if (!retraitRes.rows[0]) return { error: 'Retrait non trouvé ou déjà traité' };
      const retrait = retraitRes.rows[0];

      await client.query("UPDATE retraits SET statut = 'rejete', date_traitement = NOW() WHERE id = $1", [retraitId]);
      await client.query('UPDATE soldes SET solde = solde + $1, date_maj = NOW() WHERE user_id = $2', [retrait.montant, retrait.user_id]);
      return { success: true };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Retrait rejeté, solde remboursé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/cadeaux', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.nom, u.telephone FROM cadeaux_vip c JOIN utilisateurs u ON c.user_id = u.id
       ORDER BY c.date_demande DESC LIMIT 100`
    );
    res.json({ cadeaux: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/cadeaux/:id/validate', adminMiddleware, async (req, res) => {
  try {
    const cadeauId = parseInt(req.params.id);
    const result = await withTransaction(async (client) => {
      const res = await client.query(
        "UPDATE cadeaux_vip SET statut = 'valide', date_traitement = NOW() WHERE id = $1 AND statut = 'en_attente' RETURNING *",
        [cadeauId]
      );
      if (!res.rows[0]) return { error: 'Cadeau non trouvé ou déjà traité' };
      const cadeau = res.rows[0];

      await client.query(
        `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
        [cadeau.user_id, cadeau.montant]
      );
      await client.query(
        "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'cadeau_vip')",
        [cadeau.user_id, cadeau.montant]
      );
      return { success: true };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Cadeau validé et crédité' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/cadeaux/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      "UPDATE cadeaux_vip SET statut = 'rejete', date_traitement = NOW() WHERE id = $1 AND statut = 'en_attente' RETURNING id",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Cadeau non trouvé ou déjà traité' });
    res.json({ success: true, message: 'Cadeau rejeté' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/posts', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.nom FROM posts p JOIN utilisateurs u ON p.user_id = u.id
       ORDER BY p.date_creation DESC LIMIT 50`
    );
    res.json({ posts: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/posts/:id/:action', adminMiddleware, async (req, res) => {
  try {
    const statut = req.params.action === 'validate' ? 'valide' : 'refuse';
    await query('UPDATE posts SET statut = $1 WHERE id = $2', [statut, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const SETTINGS_DEFAULTS = {
  min_depot: '500',
  commission_niveau1: '10',
  commission_niveau2: '5',
  commission_niveau3: '2',
};

router.get('/settings', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query('SELECT cle,valeur,description FROM settings');
    const map = { ...SETTINGS_DEFAULTS };
    rows.forEach((s) => { map[s.cle] = s.valeur; });
    res.json({ settings: map });
  } catch (err) {
    res.json({ settings: { ...SETTINGS_DEFAULTS } });
  }
});

router.put('/settings', adminMiddleware, async (req, res) => {
  try {
    const { cle, valeur } = req.body;
    if (!cle || valeur === undefined) return res.status(400).json({ error: 'Données invalides' });

    if (['commission_niveau1', 'commission_niveau2', 'commission_niveau3'].includes(cle)) {
      const num = Number(valeur);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        return res.status(400).json({ error: 'Le pourcentage doit être un nombre entre 0 et 100' });
      }
    }

    await query(
      `INSERT INTO settings (cle, valeur, date_maj) VALUES ($1, $2, NOW())
       ON CONFLICT (cle) DO UPDATE SET valeur = $2, date_maj = NOW()`,
      [cle, String(valeur)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Settings catch:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/plans', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM planinvestissement ORDER BY serie ASC');
    res.json({ plans: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/plans', adminMiddleware, async (req, res) => {
  try {
    const { nom, prix, duree_jours, rendement_journalier } = req.body;
    if (!nom || !prix || !duree_jours || !rendement_journalier) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    const { rows } = await query(
      'INSERT INTO planinvestissement (nom, prix, duree_jours, rendement_journalier, serie) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nom, parseFloat(prix), parseInt(duree_jours), parseFloat(rendement_journalier), 'X']
    );
    res.json({ success: true, plan: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/plans/:id', adminMiddleware, async (req, res) => {
  try {
    const { nom, prix, duree_jours, rendement_journalier } = req.body;
    await query(
      'UPDATE planinvestissement SET nom=$1, prix=$2, duree_jours=$3, rendement_journalier=$4 WHERE id=$5',
      [nom, parseFloat(prix), parseInt(duree_jours), parseFloat(rendement_journalier), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/plans/:id', adminMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM planinvestissement WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/annonces', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM annonces ORDER BY date_creation DESC');
    res.json({ annonces: rows });
  } catch (err) {
    res.json({ annonces: [] });
  }
});

router.post('/annonces', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const image = req.file ? req.file.filename : null;
    const couleur = req.body.couleur || '#22c55e';
    const actif = req.body.actif !== 'false';

    const { rows } = await query(
      "INSERT INTO annonces (titre, contenu, image, couleur, actif) VALUES ('', '', $1, $2, $3) RETURNING *",
      [image, couleur, actif]
    );
    res.json({ success: true, annonce: rows[0] });
  } catch (err) {
    console.error('Annonce catch:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/annonces/:id', adminMiddleware, async (req, res) => {
  try {
    const { actif, couleur } = req.body;
    const updates = [];
    const vals = [];
    let idx = 1;
    if (actif !== undefined) { updates.push(`actif = $${idx++}`); vals.push(actif); }
    if (couleur !== undefined) { updates.push(`couleur = $${idx++}`); vals.push(couleur); }
    updates.push(`date_maj = NOW()`);
    vals.push(req.params.id);
    await query(`UPDATE annonces SET ${updates.join(', ')} WHERE id = $${idx}`, vals);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/annonces/:id', adminMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM annonces WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
