-- ============================================================
-- AFRILAND INVEST — Schéma complet (idempotent)
-- Coller dans : Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ─────────────────────────────────────────
-- 1. UTILISATEURS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisateurs (
  id               SERIAL PRIMARY KEY,
  nom              VARCHAR(100)  NOT NULL,
  telephone        VARCHAR(25)   NOT NULL UNIQUE,
  pays             VARCHAR(50),
  mot_de_passe     VARCHAR(255)  NOT NULL,
  solde            DECIMAL(15,2) DEFAULT 0,
  revenus_totaux   DECIMAL(15,2) DEFAULT 0,
  nombre_filleuls  INT           DEFAULT 0,
  code_parrainage  VARCHAR(20),
  parrain_id       INT REFERENCES utilisateurs(id),
  lien_parrainage  VARCHAR(255),
  role             VARCHAR(10)   DEFAULT 'user',
  last_spin_time   TIMESTAMP,
  date_inscription TIMESTAMP     DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. SOLDES (portefeuille principal)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soldes (
  id       SERIAL PRIMARY KEY,
  user_id  INT           NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  solde    DECIMAL(15,2) DEFAULT 0,
  date_maj TIMESTAMP     DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. NIVEAUX VIP
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vip (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  niveau                INT DEFAULT 0,
  pourcentage           INT DEFAULT 0,
  invitations_requises  INT DEFAULT 3,
  invitations_actuelles INT DEFAULT 0
);

-- ─────────────────────────────────────────
-- 4. PLANS D'INVESTISSEMENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planinvestissement (
  id                   SERIAL PRIMARY KEY,
  serie                VARCHAR(10)   NOT NULL,
  nom                  VARCHAR(100)  NOT NULL,
  prix                 DECIMAL(10,2) NOT NULL,
  rendement_journalier DECIMAL(5,2)  NOT NULL,
  duree_jours          INT           NOT NULL,
  description          TEXT,
  image_url            VARCHAR(255)
);

-- Données : 10 plans VIP
DELETE FROM planinvestissement;
INSERT INTO planinvestissement (serie, nom, prix, rendement_journalier, duree_jours, description, image_url) VALUES
  ('1',  'VIP 1',    1000,    1.5,  30,  'Plan débutant',   ''),
  ('2',  'VIP 2',    3000,    2.5,  30,  'Plan bronze',     ''),
  ('3',  'VIP 3',    5000,    3.5,  30,  'Plan silver',     ''),
  ('4',  'VIP 4',    10000,   5.0,  45,  'Plan gold',       ''),
  ('5',  'VIP 5',    20000,   7.0,  45,  'Plan platinum',   ''),
  ('6',  'VIP 6',    50000,   9.5,  60,  'Plan diamond',    ''),
  ('7',  'VIP 7',    100000,  12.0, 60,  'Plan elite',      ''),
  ('8',  'VIP 8',    200000,  14.5, 90,  'Plan premium',    ''),
  ('9',  'VIP 9',    500000,  17.0, 90,  'Plan exclusive',  ''),
  ('10', 'VIP 10',   1000000, 19.5, 120, 'Plan prestige',   '');

-- ─────────────────────────────────────────
-- 5. COMMANDES (investissements actifs)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id               SERIAL PRIMARY KEY,
  user_id          INT           NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  plan_id          INT           NOT NULL REFERENCES planinvestissement(id),
  montant          DECIMAL(15,2) NOT NULL,
  revenu_journalier DECIMAL(15,2) NOT NULL,
  date_debut       DATE          DEFAULT CURRENT_DATE,
  date_fin         DATE          NOT NULL,
  statut           VARCHAR(20)   DEFAULT 'actif',
  created_at       TIMESTAMP     DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 6. DÉPÔTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS depots (
  id               SERIAL PRIMARY KEY,
  user_id          INT           NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  montant          DECIMAL(15,2) NOT NULL,
  pays             VARCHAR(100),
  operateur        VARCHAR(100),
  numero_payeur    VARCHAR(50),
  preuve_paiement  VARCHAR(255),
  statut           VARCHAR(20)   DEFAULT 'en_attente',
  date_depot       TIMESTAMP     DEFAULT NOW(),
  date_traitement  TIMESTAMP
);

-- ─────────────────────────────────────────
-- 7. RETRAITS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retraits (
  id               SERIAL PRIMARY KEY,
  user_id          INT           NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  montant          DECIMAL(15,2) NOT NULL,
  methode          VARCHAR(50),
  numero_compte    VARCHAR(100),
  statut           VARCHAR(20)   DEFAULT 'en_attente',
  date_demande     TIMESTAMP     DEFAULT NOW(),
  date_traitement  TIMESTAMP
);

-- ─────────────────────────────────────────
-- 8. PORTEFEUILLES (coordonnées de retrait)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portefeuilles (
  id                SERIAL PRIMARY KEY,
  user_id           INT          NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  nom_portefeuille  VARCHAR(255) NOT NULL,
  pays              VARCHAR(100) NOT NULL,
  methode_paiement  VARCHAR(100) NOT NULL,
  numero_telephone  VARCHAR(25)  NOT NULL,
  date_creation     TIMESTAMP    DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 9. MOT DE PASSE DE TRANSACTION
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_passwords (
  id         SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  password   VARCHAR(4)  NOT NULL,
  created_at TIMESTAMP   DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 10. HISTORIQUE DES REVENUS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historique_revenus (
  id            SERIAL PRIMARY KEY,
  user_id       INT           NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  commande_id   INT,
  montant       DECIMAL(15,2) NOT NULL,
  type          VARCHAR(30)   NOT NULL,  -- parrainage / dividende / bonus / cadeau_vip / credit_admin
  date_paiement TIMESTAMP     DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 11. FILLEULS (statistiques de parrainage)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS filleuls (
  id           SERIAL PRIMARY KEY,
  user_id      INT           NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  gains_totaux DECIMAL(15,2) DEFAULT 0,
  date_maj     TIMESTAMP     DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 12. ROUE DE LA FORTUNE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roue (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE REFERENCES utilisateurs(id) ON DELETE CASCADE,
  nombre_tours INT DEFAULT 0,
  dernier_gain INT DEFAULT 0
);

-- ─────────────────────────────────────────
-- 13. POSTS (fil communautaire)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id             SERIAL PRIMARY KEY,
  user_id        INT       NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  message        TEXT      NOT NULL,
  image          VARCHAR(255) DEFAULT '',
  likes          INT       DEFAULT 0,
  statut         VARCHAR(20)  DEFAULT 'en_attente',
  date_creation  TIMESTAMP    DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 14. PHOTOS DE PROFIL
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos_profil (
  id           SERIAL PRIMARY KEY,
  user_id      INT          NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  nom_fichier  VARCHAR(255) NOT NULL,
  date_upload  TIMESTAMP    DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 15. PARAMÈTRES ADMIN (clé/valeur)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id          SERIAL PRIMARY KEY,
  cle         TEXT UNIQUE NOT NULL,
  valeur      TEXT        NOT NULL,
  description TEXT,
  date_maj    TIMESTAMP   DEFAULT NOW()
);

INSERT INTO settings (cle, valeur, description) VALUES
  ('min_depot',          '500',   'Montant minimum de dépôt en FCFA'),
  ('min_retrait',        '1000',  'Montant minimum de retrait en FCFA'),
  ('commission_niveau1', '10',    'Commission parrainage niveau 1 (%)'),
  ('commission_niveau2', '5',     'Commission parrainage niveau 2 (%)'),
  ('commission_niveau3', '2',     'Commission parrainage niveau 3 (%)')
ON CONFLICT (cle) DO NOTHING;

-- ─────────────────────────────────────────
-- 16. ANNONCES / AFFICHES ADMIN
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS annonces (
  id            SERIAL PRIMARY KEY,
  titre         TEXT      DEFAULT '',
  contenu       TEXT      DEFAULT '',
  image         TEXT,
  couleur       TEXT      DEFAULT '#22c55e',
  actif         BOOLEAN   DEFAULT TRUE,
  date_creation TIMESTAMP DEFAULT NOW(),
  date_maj      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 17. CADEAUX VIP
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cadeaux_vip (
  id              SERIAL PRIMARY KEY,
  user_id         INT           NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  niveau          INT           NOT NULL,
  montant         DECIMAL(15,2) NOT NULL,
  statut          VARCHAR(20)   DEFAULT 'en_attente',  -- en_attente / valide / rejete
  date_demande    TIMESTAMP     DEFAULT NOW(),
  date_traitement TIMESTAMP,
  UNIQUE (user_id, niveau)
);

-- ============================================================
-- FONCTIONS RPC (SECURITY DEFINER — exécutées côté serveur)
-- ============================================================

-- Helper : lecture sécurisée d'un paramètre numérique depuis settings
CREATE OR REPLACE FUNCTION get_setting_decimal(p_cle TEXT, p_default DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  v_raw TEXT;
  v_val DECIMAL;
BEGIN
  BEGIN
    SELECT valeur INTO v_raw FROM settings WHERE cle = p_cle;
  EXCEPTION WHEN undefined_table THEN
    RETURN p_default;
  END;
  IF v_raw IS NULL OR v_raw = '' THEN RETURN p_default; END IF;
  IF v_raw !~ '^[0-9]+(\.[0-9]+)?$' THEN RETURN p_default; END IF;
  v_val := v_raw::DECIMAL;
  IF v_val < 0 OR v_val > 100 THEN RETURN p_default; END IF;
  RETURN v_val;
END;
$$ LANGUAGE plpgsql;


-- RPC 1 : Achat d'un plan d'investissement (atomique)
CREATE OR REPLACE FUNCTION buy_plan(p_user_id INT, p_plan_id INT, p_tx_password TEXT)
RETURNS JSON AS $$
DECLARE
  v_plan    planinvestissement%ROWTYPE;
  v_solde   DECIMAL;
  v_tp      TEXT;
  v_rev_j   DECIMAL;
  v_fin     DATE;
  v_comm    DECIMAL[];
  v_parrain INT;
  v_montant DECIMAL;
  v_visited INT[];
  i         INT;
BEGIN
  SELECT password INTO v_tp FROM transaction_passwords WHERE user_id = p_user_id;
  IF v_tp IS NULL THEN
    RETURN json_build_object('error', 'Veuillez configurer votre mot de passe de transaction');
  END IF;
  IF v_tp != p_tx_password THEN
    RETURN json_build_object('error', 'Mot de passe de transaction incorrect');
  END IF;

  SELECT * INTO v_plan FROM planinvestissement WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Plan introuvable');
  END IF;

  SELECT solde INTO v_solde FROM soldes WHERE user_id = p_user_id;
  IF v_solde IS NULL OR v_solde < v_plan.prix THEN
    RETURN json_build_object('error', 'Solde insuffisant');
  END IF;

  v_rev_j := (v_plan.prix * v_plan.rendement_journalier) / 100;
  v_fin   := CURRENT_DATE + v_plan.duree_jours;

  INSERT INTO commandes (user_id, plan_id, montant, revenu_journalier, date_debut, date_fin, statut)
  VALUES (p_user_id, p_plan_id, v_plan.prix, v_rev_j, CURRENT_DATE, v_fin, 'actif');

  UPDATE soldes SET solde = solde - v_plan.prix, date_maj = NOW() WHERE user_id = p_user_id;

  -- Distribution des commissions de parrainage (3 niveaux)
  v_comm := ARRAY[
    get_setting_decimal('commission_niveau1', 10),
    get_setting_decimal('commission_niveau2', 5),
    get_setting_decimal('commission_niveau3', 2)
  ];

  v_visited := ARRAY[p_user_id];
  SELECT parrain_id INTO v_parrain FROM utilisateurs WHERE id = p_user_id;
  i := 1;
  WHILE i <= 3 AND v_parrain IS NOT NULL LOOP
    EXIT WHEN v_parrain = ANY(v_visited);
    v_montant := (v_plan.prix * v_comm[i]) / 100;
    IF v_montant > 0 THEN
      INSERT INTO soldes (user_id, solde, date_maj)
      VALUES (v_parrain, v_montant, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET solde = soldes.solde + v_montant, date_maj = NOW();
      INSERT INTO historique_revenus (user_id, montant, type)
      VALUES (v_parrain, v_montant, 'parrainage');
    END IF;
    v_visited := array_append(v_visited, v_parrain);
    SELECT parrain_id INTO v_parrain FROM utilisateurs WHERE id = v_parrain;
    i := i + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'message', 'Plan activé avec succès', 'plan_nom', v_plan.nom);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 2 : Roue de la fortune (cooldown 48h)
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id INT)
RETURNS JSON AS $$
DECLARE
  v_last    TIMESTAMP;
  v_elapsed FLOAT;
  v_rand    INT;
  v_gain    INT;
BEGIN
  SELECT last_spin_time INTO v_last FROM utilisateurs WHERE id = p_user_id;
  IF v_last IS NOT NULL THEN
    v_elapsed := EXTRACT(EPOCH FROM (NOW() - v_last));
    IF v_elapsed < 172800 THEN
      RETURN json_build_object(
        'error', 'Vous devez attendre 48h entre chaque spin',
        'remainingSeconds', CEIL(172800 - v_elapsed)
      );
    END IF;
  END IF;

  v_rand := (RANDOM() * 100000)::INT;
  IF    v_rand < 1  THEN v_gain := 500;
  ELSIF v_rand < 11 THEN v_gain := 50;
  ELSIF v_rand < 21 THEN v_gain := 100;
  ELSIF v_rand < 31 THEN v_gain := 200;
  ELSE                   v_gain := 0;
  END IF;

  UPDATE utilisateurs SET last_spin_time = NOW() WHERE id = p_user_id;

  IF v_gain > 0 THEN
    UPDATE soldes SET solde = solde + v_gain, date_maj = NOW() WHERE user_id = p_user_id;
    INSERT INTO historique_revenus (user_id, montant, type) VALUES (p_user_id, v_gain, 'bonus');
  END IF;

  RETURN json_build_object('success', true, 'gain', v_gain);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 3 : Validation d'un dépôt (crédite le solde)
CREATE OR REPLACE FUNCTION validate_depot(p_depot_id INT)
RETURNS JSON AS $$
DECLARE
  v_depot depots%ROWTYPE;
BEGIN
  SELECT * INTO v_depot FROM depots WHERE id = p_depot_id AND statut = 'en_attente';
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Dépôt non trouvé ou déjà traité');
  END IF;

  UPDATE depots SET statut = 'valide', date_traitement = NOW() WHERE id = p_depot_id;

  INSERT INTO soldes (user_id, solde, date_maj)
  VALUES (v_depot.user_id, v_depot.montant, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET solde = soldes.solde + v_depot.montant, date_maj = NOW();

  RETURN json_build_object('success', true, 'message', 'Dépôt validé');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 4 : Demande de retrait (déduit le solde)
CREATE OR REPLACE FUNCTION request_withdrawal(p_user_id INT, p_montant DECIMAL, p_methode TEXT, p_numero TEXT)
RETURNS JSON AS $$
DECLARE
  v_solde DECIMAL;
BEGIN
  SELECT solde INTO v_solde FROM soldes WHERE user_id = p_user_id;
  IF v_solde IS NULL OR v_solde < p_montant THEN
    RETURN json_build_object('error', 'Solde insuffisant');
  END IF;

  INSERT INTO retraits (user_id, montant, methode, numero_compte, statut)
  VALUES (p_user_id, p_montant, p_methode, p_numero, 'en_attente');

  UPDATE soldes SET solde = solde - p_montant, date_maj = NOW() WHERE user_id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Demande de retrait créée');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 5 : Rejet d'un retrait (rembourse le solde)
CREATE OR REPLACE FUNCTION reject_retrait(p_retrait_id INT)
RETURNS JSON AS $$
DECLARE
  v_retrait retraits%ROWTYPE;
BEGIN
  SELECT * INTO v_retrait FROM retraits WHERE id = p_retrait_id AND statut = 'en_attente';
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Retrait non trouvé ou déjà traité');
  END IF;

  UPDATE retraits SET statut = 'rejete', date_traitement = NOW() WHERE id = p_retrait_id;
  UPDATE soldes SET solde = solde + v_retrait.montant, date_maj = NOW() WHERE user_id = v_retrait.user_id;

  RETURN json_build_object('success', true, 'message', 'Retrait rejeté, solde remboursé');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 6 : Crédit manuel (admin)
CREATE OR REPLACE FUNCTION credit_user(p_user_id INT, p_montant DECIMAL)
RETURNS JSON AS $$
BEGIN
  IF p_montant <= 0 THEN
    RETURN json_build_object('error', 'Montant invalide');
  END IF;

  INSERT INTO soldes (user_id, solde, date_maj)
  VALUES (p_user_id, p_montant, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET solde = soldes.solde + p_montant, date_maj = NOW();

  INSERT INTO historique_revenus (user_id, montant, type)
  VALUES (p_user_id, p_montant, 'credit_admin');

  RETURN json_build_object('success', true, 'message', 'Crédit effectué');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 7 : Incrémenter le compteur de filleuls
CREATE OR REPLACE FUNCTION increment_filleuls(p_user_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE utilisateurs SET nombre_filleuls = nombre_filleuls + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC 8 : Validation d'un cadeau VIP (admin)
CREATE OR REPLACE FUNCTION validate_cadeau_vip(p_cadeau_id INT)
RETURNS JSON AS $$
DECLARE
  v_cadeau cadeaux_vip%ROWTYPE;
BEGIN
  UPDATE cadeaux_vip
    SET statut = 'valide', date_traitement = NOW()
    WHERE id = p_cadeau_id AND statut = 'en_attente'
    RETURNING * INTO v_cadeau;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Cadeau non trouvé ou déjà traité');
  END IF;

  INSERT INTO soldes (user_id, solde, date_maj)
  VALUES (v_cadeau.user_id, v_cadeau.montant, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET solde = soldes.solde + v_cadeau.montant, date_maj = NOW();

  INSERT INTO historique_revenus (user_id, montant, type)
  VALUES (v_cadeau.user_id, v_cadeau.montant, 'cadeau_vip');

  RETURN json_build_object('success', true, 'message', 'Cadeau validé');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS nb_colonnes
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
