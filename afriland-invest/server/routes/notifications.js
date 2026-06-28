const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [depotsRes, retraitsRes, revenusRes, commandesRes] = await Promise.all([
      query(`SELECT id, montant, statut, date_depot AS date, 'depot' AS kind FROM depots WHERE user_id = $1 ORDER BY date_depot DESC LIMIT 10`, [userId]),
      query(`SELECT id, montant, statut, date_demande AS date, 'retrait' AS kind FROM retraits WHERE user_id = $1 ORDER BY date_demande DESC LIMIT 10`, [userId]),
      query(`SELECT id, montant, type, date_paiement AS date FROM historique_revenus WHERE user_id = $1 ORDER BY date_paiement DESC LIMIT 10`, [userId]),
      query(`SELECT c.id, c.montant, c.statut, c.date_debut AS date, p.nom AS plan_nom FROM commandes c LEFT JOIN planinvestissement p ON c.plan_id = p.id WHERE c.user_id = $1 ORDER BY c.date_debut DESC LIMIT 5`, [userId]),
    ]);

    const REVENU_LABELS = {
      parrainage: 'Commission parrainage reçue',
      bonus: 'Bonus roue de la fortune',
      credit_admin: 'Crédit administrateur',
      cadeau_vip: 'Cadeau VIP débloqué',
      revenu: 'Revenu investissement versé',
      revenu_journalier: 'Revenu journalier versé 💰',
    };

    const STATUT_LABELS = {
      valide: 'Validé', en_attente: 'En attente', rejete: 'Rejeté',
      actif: 'Actif', termine: 'Terminé', annule: 'Annulé', refuse: 'Refusé',
    };

    const notifs = [
      ...depotsRes.rows.map(r => ({
        id: `depot-${r.id}`,
        kind: 'depot',
        titre: 'Dépôt',
        message: `${new Intl.NumberFormat('fr-FR').format(Math.round(r.montant))} FCFA — ${STATUT_LABELS[r.statut] || r.statut}`,
        statut: r.statut,
        date: r.date,
        icon: 'fa-arrow-down',
        color: '#34C759',
      })),
      ...retraitsRes.rows.map(r => ({
        id: `retrait-${r.id}`,
        kind: 'retrait',
        titre: 'Retrait',
        message: `${new Intl.NumberFormat('fr-FR').format(Math.round(r.montant))} FCFA — ${STATUT_LABELS[r.statut] || r.statut}`,
        statut: r.statut,
        date: r.date,
        icon: 'fa-hand-holding-usd',
        color: '#FF3B30',
      })),
      ...revenusRes.rows.map(r => ({
        id: `revenu-${r.id}`,
        kind: r.type || 'revenu',
        titre: REVENU_LABELS[r.type] || 'Revenu versé',
        message: `+${new Intl.NumberFormat('fr-FR').format(Math.round(r.montant))} FCFA`,
        statut: 'valide',
        date: r.date,
        icon: r.type === 'parrainage' ? 'fa-users' : r.type === 'bonus' ? 'fa-dice' : 'fa-coins',
        color: '#FF9500',
      })),
      ...commandesRes.rows.map(r => ({
        id: `commande-${r.id}`,
        kind: 'investissement',
        titre: `Investissement${r.plan_nom ? ' — ' + r.plan_nom : ''}`,
        message: `${new Intl.NumberFormat('fr-FR').format(Math.round(r.montant))} FCFA — ${STATUT_LABELS[r.statut] || r.statut}`,
        statut: r.statut,
        date: r.date,
        icon: 'fa-chart-line',
        color: '#5856D6',
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

    res.json({ notifications: notifs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
