const express = require('express');
const { query, withTransaction } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM retraits WHERE user_id = $1 ORDER BY date_demande DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ retraits: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { montant, transaction_password } = req.body;
    const userId = req.user.id;

    if (!montant || !transaction_password) {
      return res.status(400).json({ error: 'Montant et mot de passe requis' });
    }

    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();
    if (day === 0 || hour < 9 || hour >= 19) {
      return res.status(400).json({ error: 'Les retraits sont disponibles du lundi au samedi de 9h à 19h GMT' });
    }

    const userCheck = await query('SELECT banni, retrait_bloque, retrait_bloque_vip FROM utilisateurs WHERE id = $1', [userId]);
    const u = userCheck.rows[0];
    if (u?.banni) return res.status(403).json({ error: 'Votre compte est banni. Contactez le support.' });

    if (u?.retrait_bloque) {
      let unblocked = false;
      const vipRes = await query('SELECT niveau FROM vip WHERE user_id = $1', [userId]);
      const currentVip = vipRes.rows[0]?.niveau || 0;
      if (currentVip > (u.retrait_bloque_vip || 0)) {
        await query('UPDATE utilisateurs SET retrait_bloque = false, retrait_bloque_vip = 0 WHERE id = $1', [userId]);
        unblocked = true;
      }
      if (!unblocked) {
        const fRes = await query('SELECT id FROM utilisateurs WHERE parrain_id = $1', [userId]);
        const fIds = fRes.rows.map(r => r.id);
        if (fIds.length > 0) {
          const eligibleRes = await query(
            `SELECT COUNT(DISTINCT c.user_id) FROM commandes c
             JOIN depots d ON d.user_id = c.user_id
             WHERE c.user_id = ANY($1) AND d.statut = 'valide'`,
            [fIds]
          );
          if (parseInt(eligibleRes.rows[0].count) >= 1) {
            await query('UPDATE utilisateurs SET retrait_bloque = false, retrait_bloque_vip = 0 WHERE id = $1', [userId]);
            unblocked = true;
          }
        }
      }
      if (!unblocked) {
        return res.status(403).json({ error: 'Votre retrait est bloqué. Pour le débloquer, invitez au moins une personne à recharger et souscrire à un plan, ou passez à un niveau VIP supérieur.' });
      }
    }

    const tpRes = await query('SELECT password FROM transaction_passwords WHERE user_id = $1', [userId]);
    if (!tpRes.rows[0]) return res.status(400).json({ error: 'Veuillez configurer votre mot de passe de transaction' });
    if (tpRes.rows[0].password !== transaction_password) return res.status(400).json({ error: 'Mot de passe de transaction incorrect' });

    const walletRes = await query('SELECT * FROM portefeuilles WHERE user_id = $1', [userId]);
    if (!walletRes.rows[0]) return res.status(400).json({ error: 'Veuillez ajouter un portefeuille de retrait' });
    const wallet = walletRes.rows[0];

    const today = new Date().toISOString().split('T')[0];
    const activeRes = await query(
      "SELECT COUNT(*) FROM commandes WHERE user_id = $1 AND statut = 'actif' AND date_fin >= $2",
      [userId, today]
    );
    if (parseInt(activeRes.rows[0].count) === 0) {
      return res.status(400).json({ error: "Vous devez avoir un plan d'investissement actif pour retirer" });
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentRes = await query(
      "SELECT COUNT(*) FROM retraits WHERE user_id = $1 AND statut IN ('en_attente','valide') AND date_demande >= $2",
      [userId, yesterday]
    );
    if (parseInt(recentRes.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Un seul retrait par 24h est autorisé' });
    }

    const soldeRes = await query('SELECT solde FROM soldes WHERE user_id = $1', [userId]);
    const solde = parseFloat(soldeRes.rows[0]?.solde || 0);
    const montantNum = parseFloat(montant);

    if (montantNum < 2000) return res.status(400).json({ error: 'Retrait minimum: 2000' });
    if (montantNum > solde) return res.status(400).json({ error: 'Solde insuffisant' });

    const result = await withTransaction(async (client) => {
      const checkSolde = await client.query('SELECT solde FROM soldes WHERE user_id = $1 FOR UPDATE', [userId]);
      const currentSolde = parseFloat(checkSolde.rows[0]?.solde || 0);
      if (currentSolde < montantNum) return { error: 'Solde insuffisant' };

      await client.query(
        "INSERT INTO retraits (user_id, montant, methode, numero_compte, statut) VALUES ($1, $2, $3, $4, 'en_attente')",
        [userId, montantNum, wallet.methode_paiement, wallet.numero_telephone]
      );
      await client.query('UPDATE soldes SET solde = solde - $1, date_maj = NOW() WHERE user_id = $2', [montantNum, userId]);
      return { success: true };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, message: 'Demande de retrait soumise avec succès' });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Erreur lors du retrait' });
  }
});

module.exports = router;
