const express = require('express');
const { query, supabase } = require('../db');
const { adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, 'annonce_' + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [usersRes, depotsRes, retraitsRes, commandesRes] = await Promise.all([
      query("SELECT COUNT(*) FROM utilisateurs"),
      query("SELECT montant FROM depots WHERE statut='valide'"),
      query("SELECT montant FROM retraits WHERE statut='valide'"),
      query("SELECT COUNT(*) FROM commandes WHERE statut='actif'"),
    ]);
    const totalDepots = depotsRes.rows.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
    const totalRetraits = retraitsRes.rows.reduce((s, r) => s + parseFloat(r.montant || 0), 0);
    res.json({
      users: { count: parseInt(usersRes.rows[0].count) },
      depots: { count: 0, total: totalDepots },
      retraits: { count: 0, total: totalRetraits },
      commandes: { count: parseInt(commandesRes.rows[0].count) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      `SELECT u.id, u.nom, u.telephone, u.pays, u.date_inscription, u.role,
              COALESCE(s.solde, 0) as solde
       FROM utilisateurs u LEFT JOIN soldes s ON s.user_id=u.id
       ORDER BY u.date_inscription DESC LIMIT 100`
    );
    res.json({ users: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id/credit', adminMiddleware, async (req, res) => {
  try {
    const { montant } = req.body;
    const userId = parseInt(req.params.id);
    if (!montant || isNaN(montant)) return res.status(400).json({ error: 'Montant invalide' });
    const { data: result, error } = await supabase.rpc('credit_user', {
      p_user_id: userId, p_montant: parseFloat(montant),
    });
    if (error) throw error;
    if (result?.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Crédit effectué' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/depots', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      `SELECT d.*, u.nom, u.telephone
       FROM depots d JOIN utilisateurs u ON u.id=d.user_id
       ORDER BY d.date_depot DESC LIMIT 100`
    );
    res.json({ depots: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/depots/:id/validate', adminMiddleware, async (req, res) => {
  try {
    const { data: result, error } = await supabase.rpc('validate_depot', { p_depot_id: parseInt(req.params.id) });
    if (error) throw error;
    if (result?.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Dépôt validé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/depots/:id/reject', adminMiddleware, async (req, res) => {
  try {
    await query("UPDATE depots SET statut='rejete', date_traitement=NOW() WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: 'Dépôt rejeté' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/retraits', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      `SELECT r.*, u.nom, u.telephone
       FROM retraits r JOIN utilisateurs u ON u.id=r.user_id
       ORDER BY r.date_demande DESC LIMIT 100`
    );
    res.json({ retraits: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/retraits/:id/validate', adminMiddleware, async (req, res) => {
  try {
    await query("UPDATE retraits SET statut='valide', date_traitement=NOW() WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: 'Retrait validé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/retraits/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const { data: result, error } = await supabase.rpc('reject_retrait', { p_retrait_id: parseInt(req.params.id) });
    if (error) throw error;
    if (result?.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Retrait rejeté, solde remboursé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/cadeaux', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      `SELECT c.*, u.nom, u.telephone
       FROM cadeaux_vip c JOIN utilisateurs u ON u.id=c.user_id
       ORDER BY c.date_demande DESC LIMIT 100`
    );
    res.json({ cadeaux: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/cadeaux/:id/validate', adminMiddleware, async (req, res) => {
  try {
    const { data: result, error } = await supabase.rpc('validate_cadeau_vip', { p_cadeau_id: parseInt(req.params.id) });
    if (error) throw error;
    if (result?.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Cadeau validé et crédité' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/cadeaux/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      "UPDATE cadeaux_vip SET statut='rejete', date_traitement=NOW() WHERE id=$1 AND statut='en_attente' RETURNING id",
      [req.params.id]
    );
    if (res2.rows.length === 0) return res.status(400).json({ error: 'Cadeau non trouvé ou déjà traité' });
    res.json({ success: true, message: 'Cadeau rejeté' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/posts', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      `SELECT p.*, u.nom FROM posts p JOIN utilisateurs u ON u.id=p.user_id
       ORDER BY p.date_creation DESC LIMIT 50`
    );
    res.json({ posts: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/posts/:id/:action', adminMiddleware, async (req, res) => {
  try {
    const statut = req.params.action === 'validate' ? 'valide' : 'refuse';
    await query('UPDATE posts SET statut=$1 WHERE id=$2', [statut, req.params.id]);
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
    const res2 = await query('SELECT cle,valeur,description FROM settings');
    const map = { ...SETTINGS_DEFAULTS };
    res2.rows.forEach(s => { map[s.cle] = s.valeur; });
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
      'INSERT INTO settings (cle, valeur, date_maj) VALUES ($1,$2,NOW()) ON CONFLICT (cle) DO UPDATE SET valeur=$2, date_maj=NOW()',
      [cle, String(valeur)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/plans', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query('SELECT * FROM planinvestissement ORDER BY serie ASC');
    res.json({ plans: res2.rows });
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
    const res2 = await query(
      'INSERT INTO planinvestissement (nom, prix, duree_jours, rendement_journalier, serie) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nom, parseFloat(prix), parseInt(duree_jours), parseFloat(rendement_journalier), '1']
    );
    res.json({ success: true, plan: res2.rows[0] });
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
    await query('DELETE FROM planinvestissement WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/annonces', adminMiddleware, async (req, res) => {
  try {
    const res2 = await query('SELECT * FROM annonces ORDER BY date_creation DESC');
    res.json({ annonces: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/annonces', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const image = req.file ? req.file.filename : null;
    const couleur = req.body.couleur || '#22c55e';
    const actif = req.body.actif !== 'false';
    const res2 = await query(
      "INSERT INTO annonces (titre, contenu, image, couleur, actif) VALUES ('','', $1, $2, $3) RETURNING *",
      [image, couleur, actif]
    );
    res.json({ success: true, annonce: res2.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/annonces/:id', adminMiddleware, async (req, res) => {
  try {
    const { actif, couleur } = req.body;
    const sets = ['date_maj=NOW()'];
    const params = [];
    if (actif !== undefined) { params.push(actif); sets.push(`actif=$${params.length}`); }
    if (couleur !== undefined) { params.push(couleur); sets.push(`couleur=$${params.length}`); }
    params.push(req.params.id);
    await query(`UPDATE annonces SET ${sets.join(',')} WHERE id=$${params.length}`, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/annonces/:id', adminMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM annonces WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
