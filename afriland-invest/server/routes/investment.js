const express = require('express');
const { query, withTransaction } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/plans', authMiddleware, async (req, res) => {
  try {
    const { rows: plans } = await query('SELECT * FROM planinvestissement ORDER BY prix ASC');
    const result = plans.map((p) => ({
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
    const { rows } = await query(
      `SELECT c.*, p.nom AS plan_nom, p.rendement_journalier, p.duree_jours, p.serie
       FROM commandes c JOIN planinvestissement p ON c.plan_id = p.id
       WHERE c.user_id = $1 ORDER BY c.date_debut DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

async function getSettingDecimal(client, key, defaultVal) {
  try {
    const { rows } = await client.query('SELECT valeur FROM settings WHERE cle = $1', [key]);
    if (!rows[0]) return defaultVal;
    const val = parseFloat(rows[0].valeur);
    if (isNaN(val) || val < 0 || val > 100) return defaultVal;
    return val;
  } catch {
    return defaultVal;
  }
}

router.post('/buy', authMiddleware, async (req, res) => {
  try {
    const { plan_id, transaction_password } = req.body;
    const userId = req.user.id;

    if (!plan_id) return res.status(400).json({ error: 'Plan requis' });

    const result = await withTransaction(async (client) => {
      const tpRes = await client.query('SELECT password FROM transaction_passwords WHERE user_id = $1', [userId]);
      if (!tpRes.rows[0]) return { error: 'Veuillez configurer votre mot de passe de transaction' };
      if (tpRes.rows[0].password !== transaction_password) return { error: 'Mot de passe de transaction incorrect' };

      const planRes = await client.query('SELECT * FROM planinvestissement WHERE id = $1', [plan_id]);
      if (!planRes.rows[0]) return { error: 'Plan introuvable' };
      const plan = planRes.rows[0];

      const soldeRes = await client.query('SELECT solde FROM soldes WHERE user_id = $1', [userId]);
      const solde = parseFloat(soldeRes.rows[0]?.solde || 0);
      if (solde < parseFloat(plan.prix)) return { error: 'Solde insuffisant' };

      const rev_j = (parseFloat(plan.prix) * parseFloat(plan.rendement_journalier)) / 100;
      const date_fin = new Date();
      date_fin.setDate(date_fin.getDate() + plan.duree_jours);
      const date_fin_str = date_fin.toISOString().split('T')[0];

      await client.query(
        `INSERT INTO commandes (user_id, plan_id, montant, revenu_journalier, date_debut, date_fin, statut)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'actif')`,
        [userId, plan_id, plan.prix, rev_j, date_fin_str]
      );

      await client.query('UPDATE soldes SET solde = solde - $1, date_maj = NOW() WHERE user_id = $2', [plan.prix, userId]);

      const comm1 = await getSettingDecimal(client, 'commission_niveau1', 10);
      const comm2 = await getSettingDecimal(client, 'commission_niveau2', 5);
      const comm3 = await getSettingDecimal(client, 'commission_niveau3', 2);
      const commissions = [comm1, comm2, comm3];

      let parrainRes = await client.query('SELECT parrain_id FROM utilisateurs WHERE id = $1', [userId]);
      let parrain_id = parrainRes.rows[0]?.parrain_id;
      const visited = new Set([userId]);

      for (let i = 0; i < 3 && parrain_id; i++) {
        if (visited.has(parrain_id)) break;
        visited.add(parrain_id);
        const montant = (parseFloat(plan.prix) * commissions[i]) / 100;
        if (montant > 0) {
          await client.query(
            `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
             ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
            [parrain_id, montant]
          );
          await client.query(
            'INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, $3)',
            [parrain_id, montant, 'parrainage']
          );
        }
        const nextRes = await client.query('SELECT parrain_id FROM utilisateurs WHERE id = $1', [parrain_id]);
        parrain_id = nextRes.rows[0]?.parrain_id;
      }

      return { success: true, plan_nom: plan.nom };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: `Plan "${result.plan_nom}" activé avec succès` });
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
  const { rows: filleuls } = await query('SELECT id FROM utilisateurs WHERE parrain_id = $1', [userId]);
  const ids = filleuls.map((f) => f.id);
  if (ids.length === 0) return 0;
  const { rows: commandes } = await query(
    'SELECT DISTINCT user_id FROM commandes WHERE user_id = ANY($1)',
    [ids]
  );
  return commandes.length;
}

router.get('/salary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await countFilleulsInvestisseurs(userId);

    const { rows: claims } = await query('SELECT niveau,statut FROM cadeaux_vip WHERE user_id = $1', [userId]);
    const claimMap = {};
    claims.forEach((c) => { claimMap[c.niveau] = c.statut; });

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

    const { rows: existing } = await query('SELECT id,statut FROM cadeaux_vip WHERE user_id = $1 AND niveau = $2', [userId, niveau]);
    const ex = existing[0];

    if (ex && ex.statut === 'valide') return res.status(400).json({ error: 'Cadeau déjà reçu' });
    if (ex && ex.statut === 'en_attente') return res.status(400).json({ error: 'Cadeau déjà réclamé, en attente de confirmation' });

    if (ex) {
      await query(
        "UPDATE cadeaux_vip SET statut='en_attente', montant=$1, date_demande=NOW(), date_traitement=NULL WHERE id=$2",
        [level.cadeau, ex.id]
      );
    } else {
      try {
        await query(
          "INSERT INTO cadeaux_vip (user_id, niveau, montant, statut) VALUES ($1, $2, $3, 'en_attente')",
          [userId, niveau, level.cadeau]
        );
      } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Cadeau déjà réclamé' });
        throw err;
      }
    }

    res.json({ success: true, message: "Cadeau réclamé ! En attente de confirmation de l'administrateur." });
  } catch (err) {
    console.error('Claim gift error:', err);
    res.status(500).json({ error: 'Erreur lors de la réclamation du cadeau' });
  }
});

router.get('/revenue-history', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM historique_revenus WHERE user_id = $1 ORDER BY date_paiement DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ history: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
