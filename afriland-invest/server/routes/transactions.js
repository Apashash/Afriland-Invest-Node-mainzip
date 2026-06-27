const express = require('express');
const { query } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const router = express.Router();

const REVENU_MAP = {
  parrainage: { kind: 'parrainage', label: 'Commission parrainage' },
  bonus: { kind: 'bonus', label: 'Bonus roue de la fortune' },
  credit_admin: { kind: 'credit_admin', label: 'Crédit administrateur' },
  cadeau_vip: { kind: 'cadeau_vip', label: 'Cadeau VIP' },
  revenu: { kind: 'revenu', label: 'Revenu investissement' },
};

function mapRevenu(r) {
  const m = REVENU_MAP[r.type] || { kind: 'revenu', label: 'Revenu investissement' };
  return {
    id: `revenu-${r.id}`,
    kind: m.kind,
    label: m.label,
    montant: parseFloat(r.montant || 0),
    sens: '+',
    statut: 'valide',
    date: r.date_paiement,
    details: { type_revenu: r.type, commande_id: r.commande_id || null },
  };
}

function mapDepot(d) {
  return {
    id: `depot-${d.id}`,
    kind: 'depot',
    label: 'Dépôt',
    montant: parseFloat(d.montant || 0),
    sens: '+',
    statut: d.statut,
    date: d.date_depot,
    reference: d.reference || null,
    details: { pays: d.pays, operateur: d.operateur, numero_payeur: d.numero_payeur },
  };
}

function mapRetrait(r) {
  return {
    id: `retrait-${r.id}`,
    kind: 'retrait',
    label: 'Retrait',
    montant: parseFloat(r.montant || 0),
    sens: '-',
    statut: r.statut,
    date: r.date_demande,
    reference: r.reference || null,
    details: { methode: r.methode, numero_compte: r.numero_compte },
  };
}

function mapCommande(c) {
  return {
    id: `commande-${c.id}`,
    kind: 'investissement',
    label: 'Investissement',
    montant: parseFloat(c.montant || 0),
    sens: '-',
    statut: c.statut,
    date: c.date_debut,
    details: {
      plan_nom: c.plan_nom || null,
      revenu_journalier: parseFloat(c.revenu_journalier || 0),
      date_fin: c.date_fin,
    },
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [depotsRes, retraitsRes, commandesRes, revenusRes] = await Promise.all([
      query('SELECT * FROM depots WHERE user_id = $1', [userId]),
      query('SELECT * FROM retraits WHERE user_id = $1', [userId]),
      query('SELECT c.*, p.nom AS plan_nom FROM commandes c LEFT JOIN planinvestissement p ON c.plan_id = p.id WHERE c.user_id = $1', [userId]),
      query('SELECT * FROM historique_revenus WHERE user_id = $1', [userId]),
    ]);

    const transactions = [
      ...depotsRes.rows.map(mapDepot),
      ...retraitsRes.rows.map(mapRetrait),
      ...commandesRes.rows.map(mapCommande),
      ...revenusRes.rows.map(mapRevenu),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    const [depotsRes, retraitsRes, commandesRes, revenusRes, usersRes] = await Promise.all([
      query('SELECT * FROM depots'),
      query('SELECT * FROM retraits'),
      query('SELECT c.*, p.nom AS plan_nom FROM commandes c LEFT JOIN planinvestissement p ON c.plan_id = p.id'),
      query('SELECT * FROM historique_revenus'),
      query('SELECT id, nom, telephone FROM utilisateurs'),
    ]);

    const userMap = {};
    for (const u of usersRes.rows) userMap[u.id] = u;

    const attach = (tx, userId) => ({
      ...tx,
      user: userMap[userId] ? { nom: userMap[userId].nom, telephone: userMap[userId].telephone } : null,
    });

    const transactions = [
      ...depotsRes.rows.map((d) => attach(mapDepot(d), d.user_id)),
      ...retraitsRes.rows.map((r) => attach(mapRetrait(r), r.user_id)),
      ...commandesRes.rows.map((c) => attach(mapCommande(c), c.user_id)),
      ...revenusRes.rows.map((r) => attach(mapRevenu(r), r.user_id)),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
