const express = require('express');
const { query, withTransaction } = require('../db');
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
    const { rows } = await query(
      `SELECT p.*, u.nom FROM posts p
       JOIN utilisateurs u ON p.user_id = u.id
       WHERE p.statut = 'valide' ORDER BY p.date_creation DESC LIMIT 20`
    );
    res.json({ posts: rows });
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
      "INSERT INTO posts (user_id, message, image, statut) VALUES ($1, $2, $3, 'en_attente')",
      [req.user.id, message, image]
    );
    res.json({ success: true, message: 'Post soumis, en attente de validation' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/spin', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query('SELECT last_spin_time FROM utilisateurs WHERE id = $1', [req.user.id]);
    const lastSpin = rows[0]?.last_spin_time;
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

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query('SELECT last_spin_time FROM utilisateurs WHERE id = $1 FOR UPDATE', [userId]);
      const lastSpin = rows[0]?.last_spin_time;

      if (lastSpin) {
        const elapsed = (Date.now() - new Date(lastSpin).getTime()) / 1000;
        if (elapsed < 48 * 3600) {
          return { error: 'Vous devez attendre 48h entre chaque spin' };
        }
      }

      const rand = Math.floor(Math.random() * 100000);
      let gain = 0;
      if (rand < 1) gain = 500;
      else if (rand < 11) gain = 50;
      else if (rand < 21) gain = 100;
      else if (rand < 31) gain = 200;

      await client.query('UPDATE utilisateurs SET last_spin_time = NOW() WHERE id = $1', [userId]);

      if (gain > 0) {
        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
          [userId, gain]
        );
        await client.query(
          "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'bonus')",
          [userId, gain]
        );
      }

      return { success: true, gain };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, gain: result.gain });
  } catch (err) {
    console.error('Spin error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
