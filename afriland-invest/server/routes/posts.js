const express = require('express');
const { query, supabase } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const res2 = await query(
      `SELECT p.*, u.nom FROM posts p JOIN utilisateurs u ON u.id=p.user_id
       WHERE p.statut='valide' ORDER BY p.date_creation DESC LIMIT 20`
    );
    res.json({ posts: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    const image = req.file ? req.file.filename : '';
    await query(
      "INSERT INTO posts (user_id, message, image, statut) VALUES ($1,$2,$3,'en_attente')",
      [req.user.id, message, image]
    );
    res.json({ success: true, message: 'Post soumis, en attente de validation' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/spin', authMiddleware, async (req, res) => {
  try {
    const res2 = await query('SELECT last_spin_time FROM utilisateurs WHERE id=$1', [req.user.id]);
    const lastSpin = res2.rows[0]?.last_spin_time;
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
    const res2 = await query('SELECT last_spin_time FROM utilisateurs WHERE id=$1', [userId]);
    const lastSpin = res2.rows[0]?.last_spin_time;
    if (lastSpin) {
      const elapsed = (Date.now() - new Date(lastSpin).getTime()) / 1000;
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
