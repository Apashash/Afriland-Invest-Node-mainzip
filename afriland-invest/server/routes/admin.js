const express = require('express');
const { supabase } = require('../db');
const { adminMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, 'annonce_' + Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── STATS ───────────────────────────────────────────────────────────────────

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [
      { count: usersCount },
      { data: depotsData },
      { data: retraitsData },
      { count: commandesCount },
    ] = await Promise.all([
      supabase.from('utilisateurs').select('*', { count: 'exact', head: true }),
      supabase.from('depots').select('montant').eq('statut', 'valide'),
      supabase.from('retraits').select('montant').eq('statut', 'valide'),
      supabase.from('commandes').select('*', { count: 'exact', head: true }).eq('statut', 'actif'),
    ]);
    const totalDepots = (depotsData || []).reduce((s, d) => s + parseFloat(d.montant || 0), 0);
    const totalRetraits = (retraitsData || []).reduce((s, r) => s + parseFloat(r.montant || 0), 0);
    res.json({
      users: { count: usersCount || 0 },
      depots: { count: 0, total: totalDepots },
      retraits: { count: 0, total: totalRetraits },
      commandes: { count: commandesCount || 0 },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── UTILISATEURS ─────────────────────────────────────────────────────────────

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const { data: users } = await supabase
      .from('utilisateurs')
      .select('id,nom,telephone,pays,date_inscription,role, soldes(solde)')
      .order('date_inscription', { ascending: false })
      .limit(100);
    const result = (users || []).map(u => ({
      ...u, solde: u.soldes?.[0]?.solde || 0, soldes: undefined,
    }));
    res.json({ users: result });
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

// ─── DÉPÔTS ───────────────────────────────────────────────────────────────────

router.get('/depots', adminMiddleware, async (req, res) => {
  try {
    const { data: depots } = await supabase
      .from('depots')
      .select('*, utilisateurs(nom, telephone)')
      .order('date_depot', { ascending: false })
      .limit(100);
    const result = (depots || []).map(d => ({
      ...d, nom: d.utilisateurs?.nom, telephone: d.utilisateurs?.telephone, utilisateurs: undefined,
    }));
    res.json({ depots: result });
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
    const { error } = await supabase
      .from('depots')
      .update({ statut: 'rejete', date_traitement: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Dépôt rejeté' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── RETRAITS ────────────────────────────────────────────────────────────────

router.get('/retraits', adminMiddleware, async (req, res) => {
  try {
    const { data: retraits } = await supabase
      .from('retraits')
      .select('*, utilisateurs(nom, telephone)')
      .order('date_demande', { ascending: false })
      .limit(100);
    const result = (retraits || []).map(r => ({
      ...r, nom: r.utilisateurs?.nom, telephone: r.utilisateurs?.telephone, utilisateurs: undefined,
    }));
    res.json({ retraits: result });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/retraits/:id/validate', adminMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('retraits')
      .update({ statut: 'valide', date_traitement: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw error;
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

// ─── CADEAUX VIP ──────────────────────────────────────────────────────────────

router.get('/cadeaux', adminMiddleware, async (req, res) => {
  try {
    const { data: cadeaux } = await supabase
      .from('cadeaux_vip')
      .select('*, utilisateurs(nom, telephone)')
      .order('date_demande', { ascending: false })
      .limit(100);
    const result = (cadeaux || []).map(c => ({
      ...c, nom: c.utilisateurs?.nom, telephone: c.utilisateurs?.telephone, utilisateurs: undefined,
    }));
    res.json({ cadeaux: result });
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
    const { data, error } = await supabase
      .from('cadeaux_vip')
      .update({ statut: 'rejete', date_traitement: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('statut', 'en_attente')
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Cadeau non trouvé ou déjà traité' });
    }
    res.json({ success: true, message: 'Cadeau rejeté' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POSTS ────────────────────────────────────────────────────────────────────

router.get('/posts', adminMiddleware, async (req, res) => {
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('*, utilisateurs(nom)')
      .order('date_creation', { ascending: false })
      .limit(50);
    const result = (posts || []).map(p => ({
      ...p, nom: p.utilisateurs?.nom, utilisateurs: undefined,
    }));
    res.json({ posts: result });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/posts/:id/:action', adminMiddleware, async (req, res) => {
  try {
    const statut = req.params.action === 'validate' ? 'valide' : 'refuse';
    const { error } = await supabase.from('posts').update({ statut }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PARAMÈTRES ───────────────────────────────────────────────────────────────

const SETTINGS_DEFAULTS = {
  min_depot: '500',
  commission_niveau1: '10',
  commission_niveau2: '5',
  commission_niveau3: '2',
};

router.get('/settings', adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('cle,valeur,description');
    if (error) {
      return res.json({ settings: { ...SETTINGS_DEFAULTS } });
    }
    const map = { ...SETTINGS_DEFAULTS };
    (data || []).forEach(s => { map[s.cle] = s.valeur; });
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

    const { error } = await supabase
      .from('settings')
      .upsert(
        { cle, valeur: String(valeur), date_maj: new Date().toISOString() },
        { onConflict: 'cle' }
      );

    if (error) {
      console.error('Settings upsert error:', JSON.stringify(error));
      return res.status(500).json({ error: `Erreur: ${error.message || error.code || 'Table settings manquante'}` });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Settings catch:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── PLANS D'INVESTISSEMENT ───────────────────────────────────────────────────

router.get('/plans', adminMiddleware, async (req, res) => {
  try {
    const { data: plans } = await supabase
      .from('planinvestissement')
      .select('*')
      .order('serie', { ascending: true });
    res.json({ plans: plans || [] });
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
    const { data, error } = await supabase
      .from('planinvestissement')
      .insert({ nom, prix: parseFloat(prix), duree_jours: parseInt(duree_jours), rendement_journalier: parseFloat(rendement_journalier) })
      .select().single();
    if (error) throw error;
    res.json({ success: true, plan: data });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/plans/:id', adminMiddleware, async (req, res) => {
  try {
    const { nom, prix, duree_jours, rendement_journalier } = req.body;
    const { error } = await supabase
      .from('planinvestissement')
      .update({ nom, prix: parseFloat(prix), duree_jours: parseInt(duree_jours), rendement_journalier: parseFloat(rendement_journalier) })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/plans/:id', adminMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('planinvestissement').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── ANNONCES ────────────────────────────────────────────────────────────────

router.get('/annonces', adminMiddleware, async (req, res) => {
  try {
    const { data: annonces, error } = await supabase
      .from('annonces')
      .select('*')
      .order('date_creation', { ascending: false });
    if (error) return res.json({ annonces: [] });
    res.json({ annonces: annonces || [] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/annonces', adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const image = req.file ? req.file.filename : null;
    const couleur = req.body.couleur || '#22c55e';
    const actif = req.body.actif !== 'false';

    const { data, error } = await supabase
      .from('annonces')
      .insert({ titre: '', contenu: '', image, couleur, actif })
      .select().single();

    if (error) {
      console.error('Annonce insert error:', JSON.stringify(error));
      return res.status(500).json({ error: `Erreur: ${error.message || 'Erreur inconnue'}` });
    }
    res.json({ success: true, annonce: data });
  } catch (err) {
    console.error('Annonce catch:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/annonces/:id', adminMiddleware, async (req, res) => {
  try {
    const { actif, couleur } = req.body;
    const updates = { date_maj: new Date().toISOString() };
    if (actif !== undefined) updates.actif = actif;
    if (couleur !== undefined) updates.couleur = couleur;
    const { error } = await supabase.from('annonces').update(updates).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/annonces/:id', adminMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('annonces').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
