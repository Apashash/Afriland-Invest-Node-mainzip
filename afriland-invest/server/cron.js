const { pool } = require('./db');

let dernierPaiement = null;
let enCours = false;

async function payerRevenusJournaliers() {
  if (enCours) {
    console.log('⏳ Paiement déjà en cours, ignoré.');
    return { skipped: true };
  }
  enCours = true;
  console.log('💰 Démarrage du versement des revenus journaliers...');

  const client = await pool.connect();
  let creditees = 0;
  let terminees = 0;
  let totalVerse = 0;
  const errors = [];

  try {
    const today = new Date().toISOString().split('T')[0];

    // Récupérer toutes les commandes actives
    const { rows: commandes } = await client.query(
      `SELECT id, user_id, revenu_journalier, date_fin, montant
       FROM commandes
       WHERE statut = 'actif'`
    );

    console.log(`📋 ${commandes.length} commande(s) active(s) trouvée(s)`);

    for (const cmd of commandes) {
      try {
        const dateFin = new Date(cmd.date_fin);
        const maintenant = new Date(today);

        if (maintenant > dateFin) {
          // Commande expirée → la marquer terminée
          await client.query(
            `UPDATE commandes SET statut = 'termine' WHERE id = $1`,
            [cmd.id]
          );
          terminees++;
          continue;
        }

        const revenu = parseFloat(cmd.revenu_journalier);
        if (!revenu || revenu <= 0) continue;

        await client.query('BEGIN');

        // Créditer le solde
        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
          [cmd.user_id, revenu]
        );

        // Mettre à jour revenus_totaux dans utilisateurs
        await client.query(
          `UPDATE utilisateurs SET revenus_totaux = COALESCE(revenus_totaux, 0) + $1 WHERE id = $2`,
          [revenu, cmd.user_id]
        );

        // Enregistrer dans l'historique
        await client.query(
          `INSERT INTO historique_revenus (user_id, commande_id, montant, type, date_paiement)
           VALUES ($1, $2, $3, 'revenu_journalier', NOW())`,
          [cmd.user_id, cmd.id, revenu]
        );

        await client.query('COMMIT');

        creditees++;
        totalVerse += revenu;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        errors.push(`commande #${cmd.id}: ${err.message}`);
        console.error(`❌ Erreur commande #${cmd.id}:`, err.message);
      }
    }

    dernierPaiement = new Date().toISOString();
    console.log(`✅ Versement terminé — ${creditees} crédités, ${terminees} terminées, ${totalVerse.toFixed(0)} FCFA versés`);
    if (errors.length) console.warn(`⚠️  ${errors.length} erreur(s):`, errors);

    return { creditees, terminees, totalVerse, errors, date: dernierPaiement };
  } finally {
    client.release();
    enCours = false;
  }
}

function getDernierPaiement() {
  return dernierPaiement;
}

function isEnCours() {
  return enCours;
}

// Calcule le délai jusqu'à la prochaine heure H:00
function msJusquaHeure(heure = 2) {
  const maintenant = new Date();
  const prochaine = new Date();
  prochaine.setHours(heure, 0, 0, 0);
  if (prochaine <= maintenant) {
    prochaine.setDate(prochaine.getDate() + 1);
  }
  return prochaine - maintenant;
}

// Démarre le cron automatique chaque jour à 02:00 UTC
function demarrerCronJournalier() {
  const heureCible = 2; // 02h00 UTC

  function planifierProchain() {
    const delai = msJusquaHeure(heureCible);
    const heures = Math.floor(delai / 3600000);
    const minutes = Math.floor((delai % 3600000) / 60000);
    console.log(`⏰ Prochain versement automatique dans ${heures}h${minutes}m (02:00 UTC)`);

    setTimeout(async () => {
      await payerRevenusJournaliers().catch(err =>
        console.error('❌ Erreur cron journalier:', err.message)
      );
      planifierProchain(); // replanifier pour le lendemain
    }, delai);
  }

  planifierProchain();
}

module.exports = { payerRevenusJournaliers, demarrerCronJournalier, getDernierPaiement, isEnCours };
