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

const PAYS_OPERATEURS = {
  'Bénin': { country_code: 'BJ', currency: 'XOF', operators: { '35': 'MTN Money', '36': 'Moov Money' } },
  'Burkina Faso': { country_code: 'BF', currency: 'XOF', operators: { '33': 'Moov Money', '34': 'Orange Money' } },
  'Cameroun': { country_code: 'CM', currency: 'XAF', operators: { '1': 'MTN Mobile Money', '2': 'Orange Money' } },
  "Côte d'Ivoire": { country_code: 'CI', currency: 'XOF', operators: { '30': 'MTN Money', '32': 'Wave', '31': 'Moov Money', '29': 'Orange Money' } },
  'Mali': { country_code: 'ML', currency: 'XOF', operators: { '39': 'Orange Money', '40': 'Moov Money' } },
  'Togo': { country_code: 'TG', currency: 'XOF', operators: { '38': 'Moov Money', '37': 'T-Money' } },
  'Sénégal': { country_code: 'SN', currency: 'XOF', operators: { '26': 'Free Money', '25': 'Wave', '24': 'Orange Money' } },
};

router.get('/operators', authMiddleware, (req, res) => {
  res.json({ pays_operateurs: PAYS_OPERATEURS });
});

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { data: depots } = await supabase
      .from('depots')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date_depot', { ascending: false })
      .limit(20);
    res.json({ depots: depots || [] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/request', authMiddleware, upload.single('preuve'), async (req, res) => {
  try {
    const { montant, pays, operateur, numero_payeur } = req.body;
    const userId = req.user.id;

    if (!montant || !pays || !operateur || !numero_payeur) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });
    }

    const montantNum = parseFloat(montant);
    if (montantNum < 500) {
      return res.status(400).json({ error: 'Le montant minimum de dépôt est de 500' });
    }

    const preuve_path = req.file ? req.file.filename : null;

    const { data, error } = await supabase
      .from('depots')
      .insert({
        user_id: userId,
        montant: montantNum,
        pays,
        operateur,
        numero_payeur,
        preuve_paiement: preuve_path,
        statut: 'en_attente',
      })
      .select('id')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Demande de dépôt soumise. En attente de validation.',
      depot_id: data.id,
    });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Erreur lors de la soumission du dépôt' });
  }
});

module.exports = router;
