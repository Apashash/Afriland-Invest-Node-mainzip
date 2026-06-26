const express = require('express');
const { supabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { data: retraits } = await supabase
      .from('retraits')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date_demande', { ascending: false })
      .limit(20);
    res.json({ retraits: retraits || [] });
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

    // Vérifier mot de passe de transaction
    const { data: tp } = await supabase
      .from('transaction_passwords')
      .select('password')
      .eq('user_id', userId)
      .maybeSingle();

    if (!tp) return res.status(400).json({ error: 'Veuillez configurer votre mot de passe de transaction' });
    if (tp.password !== transaction_password) return res.status(400).json({ error: 'Mot de passe de transaction incorrect' });

    // Vérifier portefeuille
    const { data: wallet } = await supabase
      .from('portefeuilles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!wallet) return res.status(400).json({ error: 'Veuillez ajouter un portefeuille de retrait' });

    // Vérifier plan actif
    const today = new Date().toISOString().split('T')[0];
    const { count: activeOrders } = await supabase
      .from('commandes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('statut', 'actif')
      .gte('date_fin', today);

    if (!activeOrders || activeOrders === 0) {
      return res.status(400).json({ error: "Vous devez avoir un plan d'investissement actif pour retirer" });
    }

    // Vérifier retrait récent (24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('retraits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('statut', ['en_attente', 'valide'])
      .gte('date_demande', yesterday);

    if (recentCount && recentCount > 0) {
      return res.status(400).json({ error: 'Un seul retrait par 24h est autorisé' });
    }

    // Vérifier solde
    const { data: soldeRow } = await supabase
      .from('soldes')
      .select('solde')
      .eq('user_id', userId)
      .maybeSingle();
    const solde = parseFloat(soldeRow?.solde || 0);
    const montantNum = parseFloat(montant);

    if (montantNum < 2000) return res.status(400).json({ error: 'Retrait minimum: 2000' });
    if (montantNum > solde) return res.status(400).json({ error: 'Solde insuffisant' });

    // Appel RPC atomique
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
