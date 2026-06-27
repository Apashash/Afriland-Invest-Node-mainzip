const express = require('express');
const { query } = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const res2 = await query(
      "SELECT id,titre,contenu,image,couleur,date_creation FROM annonces WHERE actif=true ORDER BY date_creation DESC LIMIT 10"
    );
    res.json({ annonces: res2.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
