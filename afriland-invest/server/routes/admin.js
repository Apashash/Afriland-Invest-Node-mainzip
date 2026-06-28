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

const safeQ = async (sql, params = [], fallback = { rows: [] }) => {
  try { return await query(sql, params); }
  catch (e) { console.error('[admin] query error:', e.message); return fallback; }
};

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [usersRes, depotsValidesRes, retraitsValidesRes, commandesActifRes, depotsAttenteRes, retraitsAttenteRes, commandesUsersRes] = await Promise.all([
      safeQ('SELECT COUNT(*) FROM utilisateurs', [], { rows: [{ count: '0' }] }),
      safeQ("SELECT montant FROM depots WHERE statut = 'valide'"),
      safeQ("SELECT montant FROM retraits WHERE statut = 'valide'"),
      safeQ("SELECT COUNT(*) FROM commandes WHERE statut = 'actif'", [], { rows: [{ count: '0' }] }),
      safeQ("SELECT COUNT(*) FROM depots WHERE statut = 'en_attente'", [], { rows: [{ count: '0' }] }),
      safeQ("SELECT COUNT(*) FROM retraits WHERE statut = 'en_attente'", [], { rows: [{ count: '0' }] }),
      safeQ("SELECT DISTINCT user_id FROM commandes WHERE statut = 'actif' AND date_fin >= $1", [today]),
    ]);

    const totalDepots = depotsValidesRes.rows.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
    const totalRetraits = retraitsValidesRes.rows.reduce((s, r) => s + parseFloat(r.montant || 0), 0);

    res.json({
      users: { count: parseInt(usersRes.rows[0]?.count || 0) },
      depots: { total: totalDepots, en_attente: parseInt(depotsAttenteRes.rows[0]?.count || 0) },
      retraits: { total: totalRetraits, en_attente: parseInt(retraitsAttenteRes.rows[0]?.count || 0) },
      commandes: { count: parseInt(commandesActifRes.rows[0]?.count || 0) },
      users_avec_investissement: commandesUsersRes.rows.length,
    });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const usersRes = await safeQ(
      `SELECT u.*, COALESCE(s.solde, u.solde, 0) AS solde_actuel
       FROM utilisateurs u LEFT JOIN soldes s ON s.user_id = u.id
       ORDER BY u.date_inscription DESC LIMIT 200`,
      [], { rows: [] }
    );
    const users = usersRes.rows.map(u => ({
      ...u,
      solde: u.solde_actuel ?? u.solde ?? 0,
      banni: u.banni ?? false,
      retrait_bloque: u.retrait_bloque ?? false,
      retrait_bloque_vip: u.retrait_bloque_vip ?? 0,
    }));
    res.json({ users });
  } catch (err) {
    console.error('[admin/users]', err.message);
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

router.put('/users/:id/balance', adminMiddleware, async (req, res) => {
  try {
    const { mode, montant } = req.body;
    const userId = parseInt(req.params.id);
    if (!montant || isNaN(montant)) return res.status(400).json({ error: 'Montant invalide' });
    const montantNum = parseFloat(montant);
    if (!['add', 'subtract', 'set'].includes(mode)) return res.status(400).json({ error: 'Mode invalide' });

    await withTransaction(async (client) => {
      if (mode === 'set') {
        if (montantNum < 0) throw new Error('Montant invalide');
        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = $2, date_maj = NOW()`,
          [userId, montantNum]
        );
        await client.query(
          "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'credit_admin')",
          [userId, montantNum]
        );
      } else if (mode === 'add') {
        if (montantNum <= 0) throw new Error('Montant invalide');
        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
          [userId, montantNum]
        );
        await client.query(
          "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'credit_admin')",
          [userId, montantNum]
        );
      } else {
        if (montantNum <= 0) throw new Error('Montant invalide');
        const soldeRes = await client.query('SELECT solde FROM soldes WHERE user_id = $1', [userId]);
        const current = parseFloat(soldeRes.rows[0]?.solde || 0);
        const newSolde = Math.max(0, current - montantNum);
        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = $2, date_maj = NOW()`,
          [userId, newSolde]
        );
      }
    });

    res.json({ success: true, message: 'Solde modifié' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

router.put('/users/:id/info', adminMiddleware, async (req, res) => {
  try {
    const { nom, telephone, pays } = req.body;
    const userId = parseInt(req.params.id);
    const updates = [];
    const vals = [];
    let idx = 1;
    if (nom) { updates.push(`nom = $${idx++}`); vals.push(nom.trim()); }
    if (telephone) { updates.push(`telephone = $${idx++}`); vals.push(telephone.trim()); }
    if (pays) { updates.push(`pays = $${idx++}`); vals.push(pays.trim()); }
    if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnée à modifier' });
    vals.push(userId);
    await query(`UPDATE utilisateurs SET ${updates.join(', ')} WHERE id = $${idx}`, vals);
    res.json({ success: true, message: 'Informations mises à jour' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ce numéro est déjà utilisé' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id/password', adminMiddleware, async (req, res) => {
  try {
    const { new_password } = req.body;
    const userId = parseInt(req.params.id);
    if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(new_password, 10);
    await query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hashed, userId]);
    res.json({ success: true, message: 'Mot de passe réinitialisé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/users/:id/transaction-password', adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await query('DELETE FROM transaction_passwords WHERE user_id = $1', [userId]);
    res.json({ success: true, message: 'Mot de passe de transaction réinitialisé' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id/ban', adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { rows } = await query('SELECT * FROM utilisateurs WHERE id = $1', [userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const newBan = !(rows[0].banni ?? false);
    try {
      await query('UPDATE utilisateurs SET banni = $1 WHERE id = $2', [newBan, userId]);
    } catch {
      await query('ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS banni BOOLEAN DEFAULT false');
      await query('UPDATE utilisateurs SET banni = $1 WHERE id = $2', [newBan, userId]);
    }
    res.json({ success: true, banni: newBan, message: newBan ? 'Utilisateur banni' : 'Utilisateur débanni' });
  } catch (err) {
    console.error('[admin/ban]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/users/:id/block-withdrawal', adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { rows } = await query('SELECT * FROM utilisateurs WHERE id = $1', [userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const newBlock = !(rows[0].retrait_bloque ?? false);
    let vipNiveau = 0;
    if (newBlock) {
      const vipRes = await safeQ('SELECT niveau FROM vip WHERE user_id = $1', [userId]);
      vipNiveau = vipRes.rows[0]?.niveau || 0;
    }
    try {
      await query(
        'UPDATE utilisateurs SET retrait_bloque = $1, retrait_bloque_vip = $2 WHERE id = $3',
        [newBlock, newBlock ? vipNiveau : 0, userId]
      );
    } catch {
      await query('ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS retrait_bloque BOOLEAN DEFAULT false');
      await query('ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS retrait_bloque_vip INT DEFAULT 0');
      await query(
        'UPDATE utilisateurs SET retrait_bloque = $1, retrait_bloque_vip = $2 WHERE id = $3',
        [newBlock, newBlock ? vipNiveau : 0, userId]
      );
    }
    res.json({ success: true, retrait_bloque: newBlock, message: newBlock ? 'Retrait bloqué' : 'Retrait débloqué' });
  } catch (err) {
    console.error('[admin/block-withdrawal]', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await query('DELETE FROM utilisateurs WHERE id = $1', [userId]);
    res.json({ success: true, message: 'Utilisateur supprimé' });
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
  min_retrait: '2000',
  commission_niveau1: '10',
  commission_niveau2: '5',
  commission_niveau3: '2',
  retrait_max_par_jour: '1',
  retrait_jours: '1,2,3,4,5,6',
  retrait_heure_debut: '9',
  retrait_heure_fin: '19',
  retrait_off: '0',
  lien_whatsapp: '',
  lien_telegram: '',
  lien_whatsapp_groupe: '',
  message_bienvenue: 'Bienvenue sur AFRILAND INVEST ! Rejoignez notre communauté pour ne rien manquer.',
  popup_actif: '1',
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

// ── SALAIRES VIP ─────────────────────────────────────────────────
router.get('/salaires', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM vip_salaires ORDER BY niveau ASC');
    res.json({ salaires: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/salaires/:niveau', adminMiddleware, async (req, res) => {
  try {
    const niveau = parseInt(req.params.niveau);
    const { label, requis, cadeau } = req.body;
    if (!requis || cadeau === undefined) return res.status(400).json({ error: 'Données invalides' });
    await query(
      `UPDATE vip_salaires SET label=$1, requis=$2, cadeau=$3, date_maj=NOW() WHERE niveau=$4`,
      [label || `VIP ${niveau}`, parseInt(requis), parseFloat(cadeau), niveau]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/salaires', adminMiddleware, async (req, res) => {
  try {
    const { niveau, label, requis, cadeau } = req.body;
    if (!niveau || !requis || cadeau === undefined) return res.status(400).json({ error: 'Données invalides' });
    await query(
      `INSERT INTO vip_salaires (niveau, label, requis, cadeau) VALUES ($1, $2, $3, $4)`,
      [parseInt(niveau), label || `VIP ${niveau}`, parseInt(requis), parseFloat(cadeau)]
    );
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ce niveau existe déjà' });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/salaires/:niveau', adminMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM vip_salaires WHERE niveau=$1', [parseInt(req.params.niveau)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Versement manuel des revenus journaliers ─────────────────────
router.post('/payer-revenus', adminMiddleware, async (req, res) => {
  const { payerRevenusJournaliers, getDernierPaiement, isEnCours } = require('../cron');
  if (isEnCours()) {
    return res.status(409).json({ error: 'Un versement est déjà en cours, veuillez patienter.' });
  }
  try {
    const result = await payerRevenusJournaliers();
    if (result.skipped) {
      const date = result.date ? new Date(result.date) : null;
      const dateStr = date
        ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      const heureStr = date
        ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '';
      return res.json({
        success: false,
        skipped: true,
        message: `Le versement du jour a déjà été effectué le ${dateStr} à ${heureStr}.`,
      });
    }
    res.json({
      success: true,
      message: `✅ ${result.creditees} investisseur(s) crédité(s), ${result.terminees} plan(s) terminé(s). Total versé : ${(result.totalVerse || 0).toFixed(0)} FCFA.`,
      details: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur lors du versement' });
  }
});

router.get('/payer-revenus/statut', adminMiddleware, async (req, res) => {
  const { getDernierPaiement, isEnCours } = require('../cron');
  res.json({
    en_cours: isEnCours(),
    dernier_paiement: getDernierPaiement(),
  });
});

module.exports = router;
