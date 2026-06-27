const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.get('/data', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const lvl1Res = await query(
      'SELECT id,nom,telephone,pays,date_inscription FROM utilisateurs WHERE parrain_id=$1',
      [userId]
    );
    const lvl1 = lvl1Res.rows;
    const ids1 = lvl1.map(u => u.id);

    let lvl2 = [];
    if (ids1.length > 0) {
      const placeholders = ids1.map((_, i) => `$${i + 1}`).join(',');
      const lvl2Res = await query(
        `SELECT id,nom,telephone,pays,date_inscription FROM utilisateurs WHERE parrain_id IN (${placeholders})`,
        ids1
      );
      lvl2 = lvl2Res.rows;
    }

    const ids2 = lvl2.map(u => u.id);
    let lvl3 = [];
    if (ids2.length > 0) {
      const placeholders = ids2.map((_, i) => `$${i + 1}`).join(',');
      const lvl3Res = await query(
        `SELECT id,nom,telephone,pays,date_inscription FROM utilisateurs WHERE parrain_id IN (${placeholders})`,
        ids2
      );
      lvl3 = lvl3Res.rows;
    }

    const revenusRes = await query(
      "SELECT montant FROM historique_revenus WHERE user_id=$1 AND type='parrainage'",
      [userId]
    );
    const gains_parrainage = revenusRes.rows.reduce((sum, r) => sum + parseFloat(r.montant || 0), 0);

    const userInfoRes = await query(
      'SELECT code_parrainage, lien_parrainage FROM utilisateurs WHERE id=$1',
      [userId]
    );
    const userInfo = userInfoRes.rows[0];

    const settingsRes = await query(
      "SELECT cle,valeur FROM settings WHERE cle IN ('commission_niveau1','commission_niveau2','commission_niveau3')"
    );
    const cmap = {};
    settingsRes.rows.forEach(s => { cmap[s.cle] = s.valeur; });
    const commissions = {
      niveau1: cmap.commission_niveau1 || '10',
      niveau2: cmap.commission_niveau2 || '5',
      niveau3: cmap.commission_niveau3 || '2',
    };

    res.json({
      niveau1: { count: lvl1.length, filleuls: lvl1 },
      niveau2: { count: lvl2.length, filleuls: lvl2 },
      niveau3: { count: lvl3.length, filleuls: lvl3 },
      gains_parrainage,
      commissions,
      code_parrainage: userInfo?.code_parrainage,
      lien_parrainage: userInfo?.lien_parrainage,
    });
  } catch (err) {
    console.error('Referral error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
