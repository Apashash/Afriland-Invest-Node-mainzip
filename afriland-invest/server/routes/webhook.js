const express = require('express');
const { query, withTransaction, pool } = require('../db');
const router = express.Router();

router.post('/ashtech', express.json(), async (req, res) => {
  res.status(200).json({ received: true });

  try {
    const { event, transaction_id, reference, amount, total_amount, currency, status } = req.body;
    console.log(`📥 Ashtech webhook: ${event} — ref=${reference} txn=${transaction_id}`);

    if (event === 'payment.completed') {
      const depotRes = await query(
        "SELECT * FROM depots WHERE reference = $1 AND statut = 'en_attente'",
        [reference]
      );
      if (!depotRes.rows[0]) {
        console.warn(`⚠️  Webhook: dépôt introuvable ou déjà traité pour ref=${reference}`);
        return;
      }
      const depot = depotRes.rows[0];
      const montantNet = parseFloat(total_amount || depot.montant);

      await withTransaction(async (client) => {
        await client.query(
          "UPDATE depots SET statut = 'valide', date_traitement = NOW(), ashtech_transaction_id = $1 WHERE id = $2",
          [transaction_id, depot.id]
        );

        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
          [depot.user_id, montantNet]
        );

        await client.query(
          `INSERT INTO notifications (user_id, titre, message, type, date_creation)
           VALUES ($1, $2, $3, 'depot', NOW())`,
          [
            depot.user_id,
            '✅ Dépôt confirmé',
            `Votre dépôt de ${new Intl.NumberFormat('fr-FR').format(montantNet)} FCFA a été validé automatiquement.`,
          ]
        ).catch(() => {});
      });

      console.log(`✅ Dépôt ref=${reference} validé — ${montantNet} crédités à user_id=${depot.user_id}`);
    }

    if (event === 'payment.failed') {
      await query(
        "UPDATE depots SET statut = 'rejete', date_traitement = NOW() WHERE reference = $1 AND statut = 'en_attente'",
        [reference]
      );

      const depotRes = await query("SELECT user_id FROM depots WHERE reference = $1", [reference]);
      if (depotRes.rows[0]) {
        await query(
          `INSERT INTO notifications (user_id, titre, message, type, date_creation)
           VALUES ($1, $2, $3, 'depot', NOW())`,
          [
            depotRes.rows[0].user_id,
            '❌ Dépôt échoué',
            `Votre dépôt (réf: ${reference}) n'a pas pu être traité. Veuillez réessayer.`,
          ]
        ).catch(() => {});
      }

      console.log(`❌ Dépôt ref=${reference} échoué`);
    }
  } catch (err) {
    console.error('❌ Webhook Ashtech error:', err.message);
  }
});

module.exports = router;
