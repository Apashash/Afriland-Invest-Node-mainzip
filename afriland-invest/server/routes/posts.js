const express = require('express');
const { supabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { UPLOADS_DIR } = require('../config');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('*, utilisateurs(nom)')
      .eq('statut', 'valide')
      .order('date_creation', { ascending: false })
      .limit(20);
    const result = (posts || []).map(p => ({
      ...p,
      nom: p.utilisateurs?.nom,
      utilisateurs: undefined,
    }));
    res.json({ posts: result });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    const image = req.file ? req.file.filename : '';
    const { error } = await supabase
      .from('posts')
      .insert({ user_id: req.user.id, message, image, statut: 'en_attente' });
    if (error) throw error;
    res.json({ success: true, message: 'Post soumis, en attente de validation' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/spin', authMiddleware, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('utilisateurs')
      .select('last_spin_time')
      .eq('id', req.user.id)
      .single();
    const lastSpin = user?.last_spin_time;
    let canSpin = true;
    let remainingSeconds = 0;
    if (lastSpin) {
      const elapsed = (Date.now() - new Date(lastSpin).getTime()) / 1000;
      if (elapsed < 48 * 3600) {
        canSpin = false;
        remainingSeconds = Math.ceil(48 * 3600 - elapsed);
      }
    }
    res.json({ canSpin, remainingSeconds });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/spin', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user } = await supabase
      .from('utilisateurs')
      .select('last_spin_time')
      .eq('id', userId)
      .single();

    if (user?.last_spin_time) {
      const elapsed = (Date.now() - new Date(user.last_spin_time).getTime()) / 1000;
      if (elapsed < 48 * 3600) {
        return res.status(400).json({ error: 'Vous devez attendre 48h entre chaque spin' });
      }
    }

    const { data: result, error } = await supabase.rpc('spin_wheel', { p_user_id: userId });
    if (error) throw error;
    if (result?.error) return res.status(400).json({ error: result.error });

    res.json({ success: true, gain: result.gain });
  } catch (err) {
    console.error('Spin error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
