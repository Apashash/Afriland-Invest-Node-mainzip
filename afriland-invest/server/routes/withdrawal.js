const express = require('express');
const { query, supabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const res2 = await query(
      'SELECT * FROM retraits WHERE user_id=$1 ORDER BY date_demande DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ retraits: res2.rows });
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

    const tpRes = await query('SELECT password FROM transaction_passwords WHERE user_id=$1', [userId]);
    const tp = tpRes.rows[0];
    if (!tp) return res.status(400).json({ error: 'Veuillez configurer votre mot de passe de transaction' });
    if (tp.password !== transaction_password) return res.status(400).json({ error: 'Mot de passe de transaction incorrect' });

    const walletRes = await query('SELECT * FROM portefeuilles WHERE user_id=$1', [userId]);
    const wallet = walletRes.rows[0];
    if (!wallet) return res.status(400).json({ error: 'Veuillez ajouter un portefeuille de retrait' });

    const today = new Date().toISOString().split('T')[0];
    const activeRes = await query(
      "SELECT COUNT(*) FROM commandes WHERE user_id=$1 AND statut='actif' AND date_fin >= $2",
      [userId, today]
    );
    const activeOrders = parseInt(activeRes.rows[0].count);
    if (!activeOrders || activeOrders === 0) {
      return res.status(400).json({ error: "Vous devez avoir un plan d'investissement actif pour retirer" });
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentRes = await query(
      "SELECT COUNT(*) FROM retraits WHERE user_id=$1 AND statut IN ('en_attente','valide') AND date_demande >= $2",
      [userId, yesterday]
    );
    const recentCount = parseInt(recentRes.rows[0].count);
    if (recentCount > 0) {
      return res.status(400).json({ error: 'Un seul retrait par 24h est autorisé' });
    }

    const soldeRes = await query('SELECT solde FROM soldes WHERE user_id=$1', [userId]);
    const solde = parseFloat(soldeRes.rows[0]?.solde || 0);
    const montantNum = parseFloat(montant);

    if (montantNum < 2000) return res.status(400).json({ error: 'Retrait minimum: 2000' });
    if (montantNum > solde) return res.status(400).json({ error: 'Solde insuffisant' });

    const { data: result, error } = await supabase.rpc('request_withdrawal', {
      p_user_id: userId,
      p_montant: montantNum,
      p_methode: wallet.methode_paiement,
      p_numero: wallet.numero_telephone,
    });

    if (error) throw error;
    if (result?.error) return res.status(400).json({ error: result.error });

    res.json({ success: true, message: 'Demande de retrait soumise avec succès' });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Erreur lors du retrait' });
  }
});

module.exports = router;
