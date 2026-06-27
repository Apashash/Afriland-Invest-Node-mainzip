const express = require('express');
const { query, supabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/plans', authMiddleware, async (req, res) => {
  try {
    const res2 = await query('SELECT * FROM planinvestissement ORDER BY prix ASC');
    const result = res2.rows.map((p) => ({
      ...p,
      revenu_journalier: (parseFloat(p.prix) * parseFloat(p.rendement_journalier)) / 100,
      revenu_total: ((parseFloat(p.prix) * parseFloat(p.rendement_journalier)) / 100) * p.duree_jours,
    }));
    res.json({ plans: result });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      `SELECT c.*, p.nom as plan_nom, p.rendement_journalier, p.duree_jours, p.serie
       FROM commandes c JOIN planinvestissement p ON c.plan_id=p.id
       WHERE c.user_id=$1 ORDER BY c.date_debut DESC`,
      [req.user.id]
    );
    res.json({ orders: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { plan_id, transaction_password } = req.body;
    const userId = req.user.id;

    if (!plan_id) return res.status(400).json({ error: 'Plan requis' });

    const tpRes = await query('SELECT password FROM transaction_passwords WHERE user_id=$1', [userId]);
    const tp = tpRes.rows[0];

    if (!tp) return res.status(400).json({ error: 'Veuillez configurer votre mot de passe de transaction' });
    if (tp.password !== transaction_password) return res.status(400).json({ error: 'Mot de passe de transaction incorrect' });

    const planRes = await query('SELECT * FROM planinvestissement WHERE id=$1', [plan_id]);
    const plan = planRes.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan introuvable' });

    const { data: result, error } = await supabase.rpc('buy_plan', {
      p_user_id: userId,
      p_plan_id: plan_id,
      p_tx_password: transaction_password,
    });

    if (error) throw error;
    if (result?.error) return res.status(400).json({ error: result.error });

    res.json({ success: true, message: `Plan "${plan.nom}" activé avec succès` });
  } catch (err) {
    console.error('Buy error:', err);
    res.status(500).json({ error: "Erreur lors de l'achat du plan" });
  }
});

const VIP_LEVELS = [
  { niveau: 1, requis: 70, cadeau: 5000 },
  { niveau: 2, requis: 100, cadeau: 8000 },
  { niveau: 3, requis: 200, cadeau: 10000 },
];

async function countFilleulsInvestisseurs(userId) {
  const filleulsRes = await query('SELECT id FROM utilisateurs WHERE parrain_id=$1', [userId]);
  const ids = filleulsRes.rows.map((f) => f.id);
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const commandesRes = await query(
    `SELECT DISTINCT user_id FROM commandes WHERE user_id IN (${placeholders})`,
    ids
  );
  return commandesRes.rows.length;
}

router.get('/salary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await countFilleulsInvestisseurs(userId);

    const claimsRes = await query('SELECT niveau,statut FROM cadeaux_vip WHERE user_id=$1', [userId]);
    const claimMap = {};
    claimsRes.rows.forEach((c) => { claimMap[c.niveau] = c.statut; });

    let niveauActuel = 0;
    VIP_LEVELS.forEach((l) => { if (count >= l.requis) niveauActuel = l.niveau; });

    const niveaux = VIP_LEVELS.map((l) => ({
      niveau: l.niveau,
      requis: l.requis,
      cadeau: l.cadeau,
      atteint: count >= l.requis,
      statut: claimMap[l.niveau] || 'none',
    }));

    const prochain = VIP_LEVELS.find((l) => count < l.requis);

    res.json({
      filleuls_investisseurs: count,
      niveau: niveauActuel,
      niveaux,
      prochain: prochain
        ? { niveau: prochain.niveau, requis: prochain.requis, restant: Math.max(0, prochain.requis - count) }
        : null,
    });
  } catch (err) {
    console.error('Salary error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/claim-gift', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const niveau = parseInt(req.body.niveau);
    const level = VIP_LEVELS.find((l) => l.niveau === niveau);
    if (!level) return res.status(400).json({ error: 'Niveau VIP invalide' });

    const count = await countFilleulsInvestisseurs(userId);
    if (count < level.requis) {
      return res.status(400).json({ error: `Il faut ${level.requis} filleuls ayant investi pour réclamer ce cadeau` });
    }

    const existingRes = await query('SELECT id,statut FROM cadeaux_vip WHERE user_id=$1 AND niveau=$2', [userId, niveau]);
    const existing = existingRes.rows[0];

    if (existing && existing.statut === 'valide') return res.status(400).json({ error: 'Cadeau déjà reçu' });
    if (existing && existing.statut === 'en_attente') return res.status(400).json({ error: 'Cadeau déjà réclamé, en attente de confirmation' });

    try {
      if (existing) {
        await query(
          `UPDATE cadeaux_vip SET statut='en_attente', montant=$1, date_demande=NOW(), date_traitement=NULL WHERE id=$2`,
          [level.cadeau, existing.id]
        );
      } else {
        await query(
          `INSERT INTO cadeaux_vip (user_id, niveau, montant, statut) VALUES ($1,$2,$3,'en_attente')`,
          [userId, niveau, level.cadeau]
        );
      }
    } catch (err) {
      if (err.code === '23505') return res.status(400).json({ error: 'Cadeau déjà réclamé' });
      throw err;
    }

    res.json({ success: true, message: "Cadeau réclamé ! En attente de confirmation de l'administrateur." });
  } catch (err) {
    console.error('Claim gift error:', err);
    res.status(500).json({ error: 'Erreur lors de la réclamation du cadeau' });
  }
});

router.get('/revenue-history', authMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      'SELECT * FROM historique_revenus WHERE user_id=$1 ORDER BY date_paiement DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ history: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
