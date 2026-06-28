const { pool } = require('./db');

const MIGRATION_SQL = [
  // Colonnes manquantes dans utilisateurs
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS solde DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS revenus_totaux DECIMAL(15,2) DEFAULT 0`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS nombre_filleuls INT DEFAULT 0`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS code_parrainage VARCHAR(20)`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS parrain_id INT`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS lien_parrainage VARCHAR(255)`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS role VARCHAR(10) DEFAULT 'user'`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS last_spin_time TIMESTAMP`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS banni BOOLEAN DEFAULT false`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS retrait_bloque BOOLEAN DEFAULT false`,
  `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS retrait_bloque_vip INT DEFAULT 0`,

  // Table annonces
  `CREATE TABLE IF NOT EXISTS annonces (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) DEFAULT '',
    contenu TEXT DEFAULT '',
    image VARCHAR(255),
    couleur VARCHAR(20) DEFAULT '#22c55e',
    actif BOOLEAN DEFAULT true,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_maj TIMESTAMP DEFAULT NOW()
  )`,

  // Table settings
  `CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) NOT NULL UNIQUE,
    valeur TEXT NOT NULL,
    description TEXT,
    date_maj TIMESTAMP DEFAULT NOW()
  )`,

  // Table cadeaux_vip
  `CREATE TABLE IF NOT EXISTS cadeaux_vip (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    statut VARCHAR(20) DEFAULT 'en_attente',
    date_demande TIMESTAMP DEFAULT NOW(),
    date_traitement TIMESTAMP
  )`,

  // Colonnes Ashtech Pay dans depots
  `ALTER TABLE depots ADD COLUMN IF NOT EXISTS ashtech_transaction_id VARCHAR(100)`,
  `ALTER TABLE depots ADD COLUMN IF NOT EXISTS type_paiement VARCHAR(20) DEFAULT 'manuel'`,
  `ALTER TABLE depots ADD COLUMN IF NOT EXISTS wave_url TEXT`,

  // Table soldes
  `CREATE TABLE IF NOT EXISTS soldes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    solde DECIMAL(15,2) DEFAULT 0,
    date_maj TIMESTAMP DEFAULT NOW()
  )`,

  // Table vip
  `CREATE TABLE IF NOT EXISTS vip (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    niveau INT DEFAULT 0,
    pourcentage INT DEFAULT 0,
    invitations_requises INT DEFAULT 3,
    invitations_actuelles INT DEFAULT 0
  )`,

  // Table planinvestissement
  `CREATE TABLE IF NOT EXISTS planinvestissement (
    id SERIAL PRIMARY KEY,
    serie VARCHAR(1) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    rendement_journalier DECIMAL(5,2) NOT NULL,
    duree_jours INT NOT NULL,
    description TEXT,
    image_url VARCHAR(255)
  )`,

  // Table commandes
  `CREATE TABLE IF NOT EXISTS commandes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    revenu_journalier DECIMAL(15,2) NOT NULL,
    date_debut DATE DEFAULT CURRENT_DATE,
    date_fin DATE NOT NULL,
    statut VARCHAR(20) DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // Table depots
  `CREATE TABLE IF NOT EXISTS depots (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    pays VARCHAR(100),
    operateur VARCHAR(100),
    numero_payeur VARCHAR(50),
    preuve_paiement VARCHAR(255),
    statut VARCHAR(20) DEFAULT 'en_attente',
    date_depot TIMESTAMP DEFAULT NOW(),
    date_traitement TIMESTAMP
  )`,

  // Table retraits
  `CREATE TABLE IF NOT EXISTS retraits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    methode VARCHAR(50),
    numero_compte VARCHAR(100),
    statut VARCHAR(20) DEFAULT 'en_attente',
    date_demande TIMESTAMP DEFAULT NOW(),
    date_traitement TIMESTAMP
  )`,

  // Table portefeuilles
  `CREATE TABLE IF NOT EXISTS portefeuilles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    nom_portefeuille VARCHAR(255) NOT NULL,
    pays VARCHAR(100) NOT NULL,
    methode_paiement VARCHAR(100) NOT NULL,
    numero_telephone VARCHAR(25) NOT NULL,
    date_creation TIMESTAMP DEFAULT NOW()
  )`,

  // Table transaction_passwords
  `CREATE TABLE IF NOT EXISTS transaction_passwords (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    password VARCHAR(4) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // Table historique_revenus
  `CREATE TABLE IF NOT EXISTS historique_revenus (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    commande_id INT,
    montant DECIMAL(15,2) NOT NULL,
    type VARCHAR(30) NOT NULL,
    date_paiement TIMESTAMP DEFAULT NOW()
  )`,

  // Table filleuls
  `CREATE TABLE IF NOT EXISTS filleuls (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    gains_totaux DECIMAL(15,2) DEFAULT 0,
    date_maj TIMESTAMP DEFAULT NOW()
  )`,

  // Table roue
  `CREATE TABLE IF NOT EXISTS roue (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    nombre_tours INT DEFAULT 0,
    dernier_gain INT DEFAULT 0
  )`,

  // Table posts
  `CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    image VARCHAR(255) DEFAULT '',
    likes INT DEFAULT 0,
    statut VARCHAR(20) DEFAULT 'en_attente',
    date_creation TIMESTAMP DEFAULT NOW()
  )`,

  // Table photos_profil
  `CREATE TABLE IF NOT EXISTS photos_profil (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    nom_fichier VARCHAR(255) NOT NULL,
    date_upload TIMESTAMP DEFAULT NOW()
  )`,

  // Colonnes référence pour dépôts et retraits
  `ALTER TABLE depots ADD COLUMN IF NOT EXISTS reference VARCHAR(50)`,
  `ALTER TABLE retraits ADD COLUMN IF NOT EXISTS reference VARCHAR(50)`,

  // Colonne niveau dans cadeaux_vip (si manquante)
  `ALTER TABLE cadeaux_vip ADD COLUMN IF NOT EXISTS niveau INT DEFAULT 1`,

  // Table vip_salaires (niveaux configurables par l'admin)
  `CREATE TABLE IF NOT EXISTS vip_salaires (
    id SERIAL PRIMARY KEY,
    niveau INT NOT NULL UNIQUE,
    label VARCHAR(100) DEFAULT '',
    requis INT NOT NULL DEFAULT 70,
    cadeau DECIMAL(15,2) NOT NULL DEFAULT 5000,
    date_maj TIMESTAMP DEFAULT NOW()
  )`,
];

const DEFAULT_SETTINGS = [
  ['min_depot', '500', 'Montant minimum de dépôt'],
  ['min_retrait', '2000', 'Montant minimum de retrait'],
  ['commission_niveau1', '10', 'Commission parrainage niveau 1 (%)'],
  ['commission_niveau2', '5', 'Commission parrainage niveau 2 (%)'],
  ['commission_niveau3', '2', 'Commission parrainage niveau 3 (%)'],
];

const DEFAULT_SALAIRES = [
  [1, 'VIP 1', 70,  5000],
  [2, 'VIP 2', 100, 8000],
  [3, 'VIP 3', 200, 10000],
];

const DEFAULT_PLANS = [
  ['X', 'Action VIP 1',  3000,   10.50, 125],
  ['X', 'Action VIP 2',  7000,   11.00, 125],
  ['X', 'Action VIP 3',  15000,  12.00, 125],
  ['X', 'Action VIP 4',  25000,  12.50, 125],
  ['X', 'Action VIP 5',  45000,  13.00, 125],
  ['X', 'Action VIP 6',  70000,  13.50, 125],
  ['X', 'Action VIP 7',  115000, 14.00, 125],
  ['X', 'Action VIP 8',  170000, 14.50, 125],
  ['X', 'Action VIP 9',  250000, 19.50, 125],
  ['X', 'Action VIP 10', 400000, 19.50, 125],
  ['X', 'Action VIP 11', 600000, 19.50, 125],
];

async function runMigrations() {
  console.log('🔄 Démarrage des migrations DB...');
  let ok = 0, fail = 0;

  for (const sql of MIGRATION_SQL) {
    try {
      await pool.query(sql);
      ok++;
    } catch (err) {
      // Ignorer les erreurs "déjà existe" qui peuvent survenir selon le driver
      if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate'))) {
        ok++;
      } else {
        console.warn('⚠️  Migration warning:', err.message.split('\n')[0]);
        fail++;
      }
    }
  }

  // Insérer les settings par défaut
  try {
    for (const [cle, valeur, description] of DEFAULT_SETTINGS) {
      await pool.query(
        `INSERT INTO settings (cle, valeur, description) VALUES ($1, $2, $3) ON CONFLICT (cle) DO NOTHING`,
        [cle, valeur, description]
      );
    }
  } catch (err) {
    console.warn('⚠️  Settings par défaut:', err.message.split('\n')[0]);
  }

  // Insérer les salaires VIP par défaut seulement si la table est vide
  try {
    const { rows: sv } = await pool.query('SELECT COUNT(*) FROM vip_salaires');
    if (parseInt(sv[0].count) === 0) {
      for (const [niveau, label, requis, cadeau] of DEFAULT_SALAIRES) {
        await pool.query(
          `INSERT INTO vip_salaires (niveau, label, requis, cadeau) VALUES ($1, $2, $3, $4) ON CONFLICT (niveau) DO NOTHING`,
          [niveau, label, requis, cadeau]
        );
      }
      console.log('✅ Salaires VIP insérés par défaut');
    }
  } catch (err) {
    console.warn('⚠️  Salaires VIP par défaut:', err.message.split('\n')[0]);
  }

  // Insérer les plans par défaut seulement si la table est vide
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM planinvestissement');
    if (parseInt(rows[0].count) === 0) {
      for (const [serie, nom, prix, rendement, duree] of DEFAULT_PLANS) {
        await pool.query(
          `INSERT INTO planinvestissement (serie, nom, prix, rendement_journalier, duree_jours, description, image_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [serie, nom, prix, rendement, duree, 'Plan d\'investissement premium', '']
        );
      }
      console.log('✅ Plans d\'investissement insérés par défaut');
    }
  } catch (err) {
    console.warn('⚠️  Plans par défaut:', err.message.split('\n')[0]);
  }

  console.log(`✅ Migrations terminées — ${ok} OK, ${fail} avertissements`);
}

module.exports = { runMigrations };
