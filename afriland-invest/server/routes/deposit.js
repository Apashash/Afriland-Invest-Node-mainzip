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

const ASHTECH_API_KEY = process.env.ASHTECH_API_KEY;
const ASHTECH_BASE = 'https://ashtechpay.top';

const PAYS_ASHTECH = {
  'Cameroun':       { country_code: 'CM', currency: 'XAF', operators: ['MTN Mobile Money', 'Orange Money'] },
  'Togo':           { country_code: 'TG', currency: 'XOF', operators: ['Flooz (Moov)', 'T-Money'] },
  'Burkina Faso':   { country_code: 'BF', currency: 'XOF', operators: ['Moov Money', 'Orange Money'] },
  "Côte d'Ivoire":  { country_code: 'CI', currency: 'XOF', operators: ['MTN Mobile Money', 'Moov Money', 'Orange Money', 'Wave'] },
  'Bénin':          { country_code: 'BJ', currency: 'XOF', operators: ['MTN Mobile Money', 'Moov Money'] },
};

function getNotifyUrl(req) {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0];
  if (domain) return `https://${domain}/api/webhook/ashtech`;
  const host = req.get('host');
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${host}/api/webhook/ashtech`;
}

async function callAshtech(endpoint, method, body) {
  const res = await fetch(`${ASHTECH_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${ASHTECH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

router.get('/operators', authMiddleware, (req, res) => {
  res.json({ pays_operateurs: PAYS_ASHTECH });
});

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM depots WHERE user_id = $1 ORDER BY date_depot DESC LIMIT 30',
      [req.user.id]
    );
    res.json({ depots: rows });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/initiate', authMiddleware, async (req, res) => {
  try {
    if (!ASHTECH_API_KEY) {
      return res.status(500).json({ error: 'Clé API Ashtech non configurée sur le serveur. Contactez l\'administrateur.' });
    }

    const { montant, pays, operateur, numero_payeur } = req.body;
    const userId = req.user.id;

    if (!montant || !pays || !operateur) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const paysInfo = PAYS_ASHTECH[pays];
    if (!paysInfo) return res.status(400).json({ error: 'Pays non supporté' });

    const montantNum = parseFloat(montant);
    const minDepotRes = await query("SELECT valeur FROM settings WHERE cle = 'min_depot'").catch(() => ({ rows: [] }));
    const minDepot = parseFloat(minDepotRes.rows[0]?.valeur || 500);
    if (montantNum < minDepot) {
      return res.status(400).json({ error: `Le montant minimum est de ${new Intl.NumberFormat('fr-FR').format(minDepot)} FCFA` });
    }

    const rand = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    const reference = `AF${rand}`;

    const { rows } = await query(
      `INSERT INTO depots (user_id, montant, pays, operateur, numero_payeur, statut, reference, type_paiement)
       VALUES ($1, $2, $3, $4, $5, 'en_attente', $6, 'automatique') RETURNING id`,
      [userId, montantNum, pays, operateur, numero_payeur || '', reference]
    );
    const depotId = rows[0].id;

    const notifyUrl = getNotifyUrl(req);
    const payload = {
      amount: montantNum,
      currency: paysInfo.currency,
      phone: numero_payeur || '',
      operator: operateur,
      country_code: paysInfo.country_code,
      reference,
      notify_url: notifyUrl,
    };

    const { status, data } = await callAshtech('/v1/collect', 'POST', payload);

    if (status === 202) {
      await query(
        `UPDATE depots SET ashtech_transaction_id = $1, wave_url = $2 WHERE id = $3`,
        [data.transaction_id, data.wave_url || null, depotId]
      );

      if (data.flow === 'wave') {
        return res.json({ type: 'wave', depot_id: depotId, transaction_id: data.transaction_id, wave_url: data.wave_url, reference });
      }
      return res.json({ type: 'ussd_push', depot_id: depotId, transaction_id: data.transaction_id, reference });
    }

    if (status === 400 && data.error === 'otp_required') {
      await query(`UPDATE depots SET ashtech_transaction_id = $1 WHERE id = $2`, [data.transaction_id || reference, depotId]);
      return res.json({
        type: data.ussd_code ? 'otp_ussd' : 'otp_sms',
        depot_id: depotId,
        reference,
        ussd_code: data.ussd_code || null,
        message: data.message,
      });
    }

    await query(`UPDATE depots SET statut = 'rejete' WHERE id = $1`, [depotId]);
    return res.status(status).json({ error: data.message || 'Erreur de paiement', code: data.error });

  } catch (err) {
    console.error('Ashtech initiate error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'initiation du paiement' });
  }
});

router.post('/otp', authMiddleware, async (req, res) => {
  try {
    const { depot_id, otp, montant, pays, operateur, numero_payeur, reference } = req.body;
    const userId = req.user.id;

    if (!otp || !depot_id) return res.status(400).json({ error: 'OTP et depot_id requis' });

    const depotRes = await query('SELECT * FROM depots WHERE id = $1 AND user_id = $2', [depot_id, userId]);
    if (!depotRes.rows[0]) return res.status(404).json({ error: 'Dépôt introuvable' });
    const depot = depotRes.rows[0];

    const paysInfo = PAYS_ASHTECH[depot.pays];
    if (!paysInfo) return res.status(400).json({ error: 'Pays non supporté' });

    const notifyUrl = getNotifyUrl(req);
    const payload = {
      amount: parseFloat(depot.montant),
      currency: paysInfo.currency,
      phone: depot.numero_payeur || '',
      operator: depot.operateur,
      country_code: paysInfo.country_code,
      reference: depot.reference,
      otp,
      notify_url: notifyUrl,
    };

    const { status, data } = await callAshtech('/v1/collect', 'POST', payload);

    if (status === 202) {
      await query(
        `UPDATE depots SET ashtech_transaction_id = $1 WHERE id = $2`,
        [data.transaction_id, depot_id]
      );
      return res.json({ type: 'ussd_push', depot_id, transaction_id: data.transaction_id, reference: depot.reference });
    }

    return res.status(status).json({ error: data.message || 'OTP invalide ou expiré', code: data.error });

  } catch (err) {
    console.error('Ashtech OTP error:', err);
    res.status(500).json({ error: 'Erreur lors de la validation OTP' });
  }
});

router.get('/status/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, data } = await callAshtech(`/v1/transaction/${transactionId}`, 'GET');

    if (data.status === 'success') {
      const depotRes = await query(
        "SELECT * FROM depots WHERE ashtech_transaction_id = $1 AND statut = 'en_attente'",
        [transactionId]
      );
      if (depotRes.rows[0]) {
        const depot = depotRes.rows[0];
        await withTransaction(async (client) => {
          await client.query(
            "UPDATE depots SET statut = 'valide', date_traitement = NOW() WHERE id = $1",
            [depot.id]
          );
          await client.query(
            `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
             ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
            [depot.user_id, depot.montant]
          );
        });
        console.log(`✅ Auto-crédit via polling: ${depot.montant} FCFA → user_id=${depot.user_id}`);
      }
    }

    if (data.status === 'failed') {
      await query(
        "UPDATE depots SET statut = 'rejete', date_traitement = NOW() WHERE ashtech_transaction_id = $1 AND statut = 'en_attente'",
        [transactionId]
      );
    }

    res.json({ status: data.status, data });
  } catch (err) {
    console.error('Status check error:', err.message);
    res.status(500).json({ error: 'Erreur vérification statut' });
  }
});

router.get('/check/:depotId', authMiddleware, async (req, res) => {
  try {
    const depotRes = await query(
      "SELECT * FROM depots WHERE id = $1 AND user_id = $2 AND type_paiement = 'automatique'",
      [req.params.depotId, req.user.id]
    );
    const depot = depotRes.rows[0];
    if (!depot) return res.status(404).json({ error: 'Dépôt introuvable' });
    if (depot.statut !== 'en_attente') return res.json({ status: depot.statut, already_processed: true });
    if (!depot.ashtech_transaction_id) return res.status(400).json({ error: 'Pas de transaction Ashtech associée' });

    const { data } = await callAshtech(`/v1/transaction/${depot.ashtech_transaction_id}`, 'GET');

    if (data.status === 'success') {
      await withTransaction(async (client) => {
        await client.query(
          "UPDATE depots SET statut = 'valide', date_traitement = NOW() WHERE id = $1 AND statut = 'en_attente'",
          [depot.id]
        );
        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
          [depot.user_id, depot.montant]
        );
      });
      return res.json({ status: 'success', credited: true, montant: depot.montant });
    }

    if (data.status === 'failed') {
      await query(
        "UPDATE depots SET statut = 'rejete', date_traitement = NOW() WHERE id = $1 AND statut = 'en_attente'",
        [depot.id]
      );
      return res.json({ status: 'failed', credited: false });
    }

    res.json({ status: data.status, credited: false });
  } catch (err) {
    console.error('Check depot error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
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
    const minDepotRes = await query("SELECT valeur FROM settings WHERE cle = 'min_depot'").catch(() => ({ rows: [] }));
    const minDepot = parseFloat(minDepotRes.rows[0]?.valeur || 500);
    if (montantNum < minDepot) {
      return res.status(400).json({ error: `Le montant minimum de dépôt est de ${new Intl.NumberFormat('fr-FR').format(minDepot)} FCFA` });
    }

    const preuve_path = req.file ? req.file.filename : null;
    const rand = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
    const reference = `payfast${rand}`;

    const { rows } = await query(
      `INSERT INTO depots (user_id, montant, pays, operateur, numero_payeur, preuve_paiement, statut, reference, type_paiement)
       VALUES ($1, $2, $3, $4, $5, $6, 'en_attente', $7, 'manuel') RETURNING id`,
      [userId, montantNum, pays, operateur, numero_payeur, preuve_path, reference]
    );

    res.json({
      success: true,
      message: 'Demande de dépôt soumise. En attente de validation.',
      depot_id: rows[0].id,
      reference,
    });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Erreur lors de la soumission du dépôt' });
  }
});

module.exports = router;
