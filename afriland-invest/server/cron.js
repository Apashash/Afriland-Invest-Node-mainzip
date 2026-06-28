const { pool } = require('./db');

let dernierPaiement = null;
let enCours = false;

// ── Persistance en base ───────────────────────────────────────────

async function lireDernierVersementDB() {
  try {
    const { rows } = await pool.query(
      `SELECT valeur FROM settings WHERE cle = 'last_revenu_date'`
    );
    return rows[0]?.valeur || null;
  } catch {
    return null;
  }
}

async function sauvegarderVersementDB(dateISO) {
  try {
    await pool.query(
      `INSERT INTO settings (cle, valeur, description)
       VALUES ('last_revenu_date', $1, 'Dernière date de versement des revenus journaliers')
       ON CONFLICT (cle) DO UPDATE SET valeur = $1, date_maj = NOW()`,
      [dateISO]
    );
  } catch (err) {
    console.error('⚠️  Impossible de sauvegarder last_revenu_date:', err.message);
  }
}

// ── Versement principal ───────────────────────────────────────────

async function payerRevenusJournaliers({ force = false } = {}) {
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

    // Vérifier si le versement du jour a déjà été fait (sauf si force=true)
    if (!force) {
      const derniere = await lireDernierVersementDB();
      if (derniere && derniere.startsWith(today)) {
        console.log(`✅ Versement du ${today} déjà effectué — ignoré.`);
        dernierPaiement = derniere;
        enCours = false;
        return { skipped: true, reason: 'already_paid_today', date: derniere };
      }
    }

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

        await client.query(
          `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
          [cmd.user_id, revenu]
        );

        await client.query(
          `UPDATE utilisateurs SET revenus_totaux = COALESCE(revenus_totaux, 0) + $1 WHERE id = $2`,
          [revenu, cmd.user_id]
        );

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
    await sauvegarderVersementDB(dernierPaiement);

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

// ── Scheduler journalier ─────────────────────────────────────────

function msJusquaHeure(heure = 2) {
  const maintenant = new Date();
  const prochaine = new Date();
  prochaine.setUTCHours(heure, 0, 0, 0);
  if (prochaine <= maintenant) {
    prochaine.setUTCDate(prochaine.getUTCDate() + 1);
  }
  return prochaine - maintenant;
}

async function demarrerCronJournalier() {
  const heureCible = 2; // 02h00 UTC

  // ── Au démarrage : rattrapage si le versement du jour n'a pas été fait ──
  const derniere = await lireDernierVersementDB();
  dernierPaiement = derniere;

  const today = new Date().toISOString().split('T')[0];
  const heureUTC = new Date().getUTCHours();
  const dejaPaye = derniere && derniere.startsWith(today);

  if (!dejaPaye && heureUTC >= heureCible) {
    console.log(`🔄 Redémarrage détecté — versement du ${today} manqué, exécution immédiate...`);
    await payerRevenusJournaliers().catch(err =>
      console.error('❌ Erreur rattrapage au démarrage:', err.message)
    );
  }

  // ── Planification quotidienne ────────────────────────────────────
  function planifierProchain() {
    const delai = msJusquaHeure(heureCible);
    const heures = Math.floor(delai / 3600000);
    const minutes = Math.floor((delai % 3600000) / 60000);
    console.log(`⏰ Prochain versement automatique dans ${heures}h${minutes}m (02:00 UTC)`);

    setTimeout(async () => {
      await payerRevenusJournaliers().catch(err =>
        console.error('❌ Erreur cron journalier:', err.message)
      );
      planifierProchain();
    }, delai);
  }

  planifierProchain();
}

module.exports = { payerRevenusJournaliers, demarrerCronJournalier, getDernierPaiement, isEnCours };
