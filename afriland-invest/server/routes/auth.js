const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'afriland_secret_2024';

const PAYS_ELIGIBLES = {
  '+237': 'Cameroun',
  '+225': "Côte d'Ivoire",
  '+229': 'Bénin',
  '+226': 'Burkina Faso',
  '+228': 'Togo',
};

router.post('/login', async (req, res) => {
  try {
    const { indicatif, telephone, mot_de_passe } = req.body;

    if (!indicatif || !telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }
    if (!PAYS_ELIGIBLES[indicatif]) {
      return res.status(400).json({ error: 'Code pays non valide' });
    }

    const full_tel = indicatif + telephone.replace(/\D/g, '');

    const { rows } = await query('SELECT * FROM utilisateurs WHERE telephone = $1', [full_tel]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Aucun compte trouvé avec ce numéro' });
    }

    const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, nom: user.nom, telephone: user.telephone, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        telephone: user.telephone,
        pays: user.pays,
        role: user.role || 'user',
        code_parrainage: user.code_parrainage,
        lien_parrainage: user.lien_parrainage,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { nom, indicatif, telephone, pays, mot_de_passe, code_parrain } = req.body;

    if (!nom || !indicatif || !telephone || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }
    if (!PAYS_ELIGIBLES[indicatif]) {
      return res.status(400).json({ error: 'Pays non éligible' });
    }

    const full_tel = indicatif + telephone.replace(/\D/g, '');

    const existing = await query('SELECT id FROM utilisateurs WHERE telephone = $1', [full_tel]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ce numéro est déjà enregistré' });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;

    let parrain_id = null;
    if (code_parrain) {
      const parrainRes = await query('SELECT id FROM utilisateurs WHERE code_parrainage = $1', [code_parrain.toUpperCase()]);
      if (parrainRes.rows.length > 0) parrain_id = parrainRes.rows[0].id;
    }

    const newUser = await withTransaction(async (client) => {
      const insertRes = await client.query(
        `INSERT INTO utilisateurs (nom, telephone, pays, mot_de_passe, solde, revenus_totaux, nombre_filleuls, code_parrainage, parrain_id, lien_parrainage, role)
         VALUES ($1, $2, $3, $4, 0, 0, 0, $5, $6, $7, 'user') RETURNING *`,
        [nom, full_tel, pays || PAYS_ELIGIBLES[indicatif], hashedPassword, code, parrain_id, `${appUrl}/login?p=${code}`]
      );
      const user = insertRes.rows[0];

      await Promise.all([
        client.query('INSERT INTO soldes (user_id, solde) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [user.id]),
        client.query('INSERT INTO vip (user_id, niveau, pourcentage, invitations_requises, invitations_actuelles) VALUES ($1, 0, 0, 3, 0) ON CONFLICT (user_id) DO NOTHING', [user.id]),
        client.query('INSERT INTO filleuls (user_id, gains_totaux) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [user.id]),
        client.query('INSERT INTO roue (user_id, nombre_tours, dernier_gain) VALUES ($1, 0, 0) ON CONFLICT (user_id) DO NOTHING', [user.id]),
      ]);

      if (parrain_id) {
        await client.query('UPDATE utilisateurs SET nombre_filleuls = nombre_filleuls + 1 WHERE id = $1', [parrain_id]);
      }

      return user;
    });

    const token = jwt.sign(
      { id: newUser.id, nom: newUser.nom, telephone: newUser.telephone, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        nom: newUser.nom,
        telephone: newUser.telephone,
        pays: newUser.pays,
        role: 'user',
        code_parrainage: code,
        lien_parrainage: newUser.lien_parrainage,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

module.exports = router;
