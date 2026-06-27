"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// server/config.js
var require_config = __commonJS({
  "server/config.js"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    var ROOT = process.cwd();
    var isProd = process.env.NODE_ENV === "production";
    module2.exports = {
      UPLOADS_DIR: path2.join(ROOT, "uploads"),
      CLIENT_DIST: isProd ? path2.join(ROOT, "dist", "public") : path2.join(ROOT, "client", "dist")
    };
  }
});

// server/db.js
var require_db = __commonJS({
  "server/db.js"(exports2, module2) {
    "use strict";
    var { Pool } = require("pg");
    function buildConnectionString() {
      if (process.env.DATABASE_URL) return { url: process.env.DATABASE_URL, source: "DATABASE_URL" };
      if (process.env.SUPABASE_DB_URL) return { url: process.env.SUPABASE_DB_URL, source: "SUPABASE_DB_URL" };
      if (process.env.POSTGRES_URL) return { url: process.env.POSTGRES_URL, source: "POSTGRES_URL" };
      if (process.env.DB_URL) return { url: process.env.DB_URL, source: "DB_URL" };
      if (process.env.POSTGRESQL_URL) return { url: process.env.POSTGRESQL_URL, source: "POSTGRESQL_URL" };
      if (process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
        const raw = process.env.SUPABASE_URL.replace(/\/$/, "");
        const match = raw.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
        if (match) {
          const ref = match[1];
          const pwd = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
          return {
            url: `postgresql://postgres:${pwd}@db.${ref}.supabase.co:5432/postgres`,
            source: "SUPABASE_URL+SUPABASE_DB_PASSWORD (direct)"
          };
        }
      }
      return null;
    }
    var conn = buildConnectionString();
    if (!conn) {
      console.error("\u274C Aucune variable de connexion DB trouv\xE9e.");
      console.error("   \u2192 Ajoutez DATABASE_URL dans Plesk (URL PostgreSQL compl\xE8te)");
      console.error("   \u2192 OU ajoutez SUPABASE_DB_PASSWORD (mot de passe DB Supabase)");
    } else {
      console.log(`\u{1F517} DB source : ${conn.source}`);
    }
    var pool = new Pool({
      connectionString: conn?.url,
      ssl: conn?.url && conn.url.includes("localhost") ? false : { rejectUnauthorized: false }
    });
    pool.on("error", (err) => {
      console.error("\u274C Erreur pool PostgreSQL:", err.message);
    });
    async function query(text, params) {
      const client = await pool.connect();
      try {
        return await client.query(text, params);
      } finally {
        client.release();
      }
    }
    async function withTransaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
    pool.query("SELECT COUNT(*) FROM utilisateurs").then(({ rows }) => {
      console.log(`\u2705 PostgreSQL connect\xE9 \u2014 ${rows[0].count} utilisateur(s) en base`);
    }).catch((err) => {
      console.error("\u274C Connexion DB \xE9chou\xE9e:", err.message);
    });
    module2.exports = { query, withTransaction, pool };
  }
});

// server/routes/auth.js
var require_auth = __commonJS({
  "server/routes/auth.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var bcrypt = require("bcryptjs");
    var jwt = require("jsonwebtoken");
    var { query, withTransaction } = require_db();
    var router = express2.Router();
    var JWT_SECRET = process.env.JWT_SECRET || "afriland_secret_2024";
    var PAYS_ELIGIBLES = {
      "+229": "B\xE9nin",
      "+226": "Burkina Faso",
      "+237": "Cameroun",
      "+221": "S\xE9n\xE9gal",
      "+225": "C\xF4te d'Ivoire",
      "+223": "Mali",
      "+228": "Togo"
    };
    router.post("/login", async (req, res) => {
      try {
        const { indicatif, telephone, mot_de_passe } = req.body;
        if (!indicatif || !telephone || !mot_de_passe) {
          return res.status(400).json({ error: "Tous les champs sont obligatoires" });
        }
        if (!PAYS_ELIGIBLES[indicatif]) {
          return res.status(400).json({ error: "Code pays non valide" });
        }
        const full_tel = indicatif + telephone.replace(/\D/g, "");
        const { rows } = await query("SELECT * FROM utilisateurs WHERE telephone = $1", [full_tel]);
        const user = rows[0];
        if (!user) {
          return res.status(401).json({ error: "Aucun compte trouv\xE9 avec ce num\xE9ro" });
        }
        const validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
        if (!validPassword) {
          return res.status(401).json({ error: "Mot de passe incorrect" });
        }
        const token = jwt.sign(
          { id: user.id, nom: user.nom, telephone: user.telephone, role: user.role || "user" },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        res.json({
          token,
          user: {
            id: user.id,
            nom: user.nom,
            telephone: user.telephone,
            pays: user.pays,
            role: user.role || "user",
            code_parrainage: user.code_parrainage,
            lien_parrainage: user.lien_parrainage
          }
        });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/register", async (req, res) => {
      try {
        const { nom, indicatif, telephone, pays, mot_de_passe, code_parrain } = req.body;
        if (!nom || !indicatif || !telephone || !mot_de_passe) {
          return res.status(400).json({ error: "Tous les champs obligatoires doivent \xEAtre remplis" });
        }
        if (!PAYS_ELIGIBLES[indicatif]) {
          return res.status(400).json({ error: "Pays non \xE9ligible" });
        }
        const full_tel = indicatif + telephone.replace(/\D/g, "");
        const existing = await query("SELECT id FROM utilisateurs WHERE telephone = $1", [full_tel]);
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: "Ce num\xE9ro est d\xE9j\xE0 enregistr\xE9" });
        }
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || "localhost:5000"}`;
        let parrain_id = null;
        if (code_parrain) {
          const parrainRes = await query("SELECT id FROM utilisateurs WHERE code_parrainage = $1", [code_parrain.toUpperCase()]);
          if (parrainRes.rows.length > 0) parrain_id = parrainRes.rows[0].id;
        }
        const newUser = await withTransaction(async (client) => {
          const insertRes = await client.query(
            `INSERT INTO utilisateurs (nom, telephone, pays, mot_de_passe, solde, revenus_totaux, nombre_filleuls, code_parrainage, parrain_id, lien_parrainage, role)
         VALUES ($1, $2, $3, $4, 0, 0, 0, $5, $6, $7, 'user') RETURNING *`,
            [nom, full_tel, pays || PAYS_ELIGIBLES[indicatif], hashedPassword, code, parrain_id, `${appUrl}?p=${code}`]
          );
          const user = insertRes.rows[0];
          await Promise.all([
            client.query("INSERT INTO soldes (user_id, solde) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING", [user.id]),
            client.query("INSERT INTO vip (user_id, niveau, pourcentage, invitations_requises, invitations_actuelles) VALUES ($1, 0, 0, 3, 0) ON CONFLICT (user_id) DO NOTHING", [user.id]),
            client.query("INSERT INTO filleuls (user_id, gains_totaux) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING", [user.id]),
            client.query("INSERT INTO roue (user_id, nombre_tours, dernier_gain) VALUES ($1, 0, 0) ON CONFLICT (user_id) DO NOTHING", [user.id])
          ]);
          if (parrain_id) {
            await client.query("UPDATE utilisateurs SET nombre_filleuls = nombre_filleuls + 1 WHERE id = $1", [parrain_id]);
          }
          return user;
        });
        const token = jwt.sign(
          { id: newUser.id, nom: newUser.nom, telephone: newUser.telephone, role: "user" },
          JWT_SECRET,
          { expiresIn: "7d" }
        );
        res.status(201).json({
          token,
          user: {
            id: newUser.id,
            nom: newUser.nom,
            telephone: newUser.telephone,
            pays: newUser.pays,
            role: "user",
            code_parrainage: code,
            lien_parrainage: newUser.lien_parrainage
          }
        });
      } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Erreur lors de la cr\xE9ation du compte" });
      }
    });
    module2.exports = router;
  }
});

// server/middleware/auth.js
var require_auth2 = __commonJS({
  "server/middleware/auth.js"(exports2, module2) {
    "use strict";
    var jwt = require("jsonwebtoken");
    var authMiddleware = (req, res, next) => {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "Token manquant" });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "afriland_secret_2024");
        req.user = decoded;
        next();
      } catch (err) {
        return res.status(403).json({ error: "Token invalide ou expir\xE9" });
      }
    };
    var adminMiddleware = (req, res, next) => {
      authMiddleware(req, res, () => {
        if (req.user.role !== "admin") {
          return res.status(403).json({ error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs" });
        }
        next();
      });
    };
    module2.exports = { authMiddleware, adminMiddleware };
  }
});

// server/routes/user.js
var require_user = __commonJS({
  "server/routes/user.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query } = require_db();
    var { authMiddleware } = require_auth2();
    var multer = require("multer");
    var path2 = require("path");
    var { UPLOADS_DIR: UPLOADS_DIR2 } = require_config();
    var router = express2.Router();
    var storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOADS_DIR2),
      filename: (req, file, cb) => cb(null, Date.now() + path2.extname(file.originalname))
    });
    var upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
    router.get("/dashboard", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const safeQuery = async (sql, params, fallback) => {
          try {
            return await query(sql, params);
          } catch (e) {
            console.error(`[dashboard] query failed: ${e.message}
SQL: ${sql}`);
            return fallback;
          }
        };
        const [userRes, soldeRes, vipRes, filleulsRes, revenusRes] = await Promise.all([
          safeQuery("SELECT * FROM utilisateurs WHERE id = $1", [userId], { rows: [] }),
          safeQuery("SELECT solde FROM soldes WHERE user_id = $1", [userId], { rows: [] }),
          safeQuery("SELECT niveau,pourcentage,invitations_requises,invitations_actuelles FROM vip WHERE user_id = $1", [userId], { rows: [] }),
          safeQuery("SELECT COUNT(*) FROM utilisateurs WHERE parrain_id = $1", [userId], { rows: [{ count: "0" }] }),
          safeQuery("SELECT montant FROM historique_revenus WHERE user_id = $1", [userId], { rows: [] })
        ]);
        const user = userRes.rows[0];
        if (!user) {
          return res.status(404).json({ error: "Utilisateur introuvable" });
        }
        const solde = soldeRes.rows[0]?.solde ?? user.solde ?? 0;
        const vip = vipRes.rows[0] || { niveau: 0, pourcentage: 0, invitations_requises: 3, invitations_actuelles: 0 };
        const filleulsCount = parseInt(filleulsRes.rows[0]?.count || user.nombre_filleuls || 0);
        const revenus_totaux = revenusRes.rows.length > 0 ? revenusRes.rows.reduce((sum, r) => sum + parseFloat(r.montant || 0), 0) : parseFloat(user.revenus_totaux || 0);
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const commandesRes = await safeQuery(
          `SELECT c.*, p.nom AS plan_nom, p.rendement_journalier, p.duree_jours
       FROM commandes c JOIN planinvestissement p ON c.plan_id = p.id
       WHERE c.user_id = $1 AND c.statut = 'actif' AND c.date_fin >= $2
       ORDER BY c.date_debut DESC LIMIT 3`,
          [userId, today],
          { rows: [] }
        );
        res.json({
          user: { ...user, solde, revenus_totaux, nombre_filleuls: filleulsCount },
          vip,
          commandes_actives: commandesRes.rows
        });
      } catch (err) {
        console.error("[dashboard] fatal error:", err.message, err.stack);
        res.status(500).json({ error: "Erreur serveur", detail: err.message });
      }
    });
    router.get("/profile", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const [userRes, soldeRes] = await Promise.all([
          query("SELECT id,nom,telephone,pays,code_parrainage,lien_parrainage,date_inscription FROM utilisateurs WHERE id = $1", [userId]),
          query("SELECT solde FROM soldes WHERE user_id = $1", [userId])
        ]);
        res.json({ user: userRes.rows[0], solde: soldeRes.rows[0]?.solde || 0 });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/transaction-password", authMiddleware, async (req, res) => {
      try {
        const { password } = req.body;
        if (!password || !/^\d{4}$/.test(password)) {
          return res.status(400).json({ error: "Le mot de passe doit \xEAtre compos\xE9 de 4 chiffres" });
        }
        await query(
          "INSERT INTO transaction_passwords (user_id, password) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET password = $2",
          [req.user.id, password]
        );
        res.json({ success: true, message: "Mot de passe de transaction mis \xE0 jour" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/wallet", authMiddleware, async (req, res) => {
      try {
        const { rows } = await query("SELECT * FROM portefeuilles WHERE user_id = $1", [req.user.id]);
        res.json({ wallets: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/wallet", authMiddleware, async (req, res) => {
      try {
        const { nom_portefeuille, pays, methode_paiement, numero_telephone } = req.body;
        if (!nom_portefeuille || !pays || !methode_paiement || !numero_telephone) {
          return res.status(400).json({ error: "Tous les champs sont obligatoires" });
        }
        await query(
          `INSERT INTO portefeuilles (user_id, nom_portefeuille, pays, methode_paiement, numero_telephone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET nom_portefeuille=$2, pays=$3, methode_paiement=$4, numero_telephone=$5`,
          [req.user.id, nom_portefeuille, pays, methode_paiement, numero_telephone]
        );
        res.json({ success: true, message: "Portefeuille enregistr\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/photo", authMiddleware, upload.single("photo"), async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: "Aucune photo fournie" });
        await query("INSERT INTO photos_profil (user_id, nom_fichier) VALUES ($1, $2)", [req.user.id, req.file.filename]);
        res.json({ success: true, filename: req.file.filename });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/investment.js
var require_investment = __commonJS({
  "server/routes/investment.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query, withTransaction } = require_db();
    var { authMiddleware } = require_auth2();
    var router = express2.Router();
    router.get("/plans", authMiddleware, async (req, res) => {
      try {
        const { rows: plans } = await query("SELECT * FROM planinvestissement ORDER BY prix ASC");
        const result = plans.map((p) => ({
          ...p,
          revenu_journalier: parseFloat(p.prix) * parseFloat(p.rendement_journalier) / 100,
          revenu_total: parseFloat(p.prix) * parseFloat(p.rendement_journalier) / 100 * p.duree_jours
        }));
        res.json({ plans: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/my-orders", authMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          `SELECT c.*, p.nom AS plan_nom, p.rendement_journalier, p.duree_jours, p.serie
       FROM commandes c JOIN planinvestissement p ON c.plan_id = p.id
       WHERE c.user_id = $1 ORDER BY c.date_debut DESC`,
          [req.user.id]
        );
        res.json({ orders: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    async function getSettingDecimal(client, key, defaultVal) {
      try {
        const { rows } = await client.query("SELECT valeur FROM settings WHERE cle = $1", [key]);
        if (!rows[0]) return defaultVal;
        const val = parseFloat(rows[0].valeur);
        if (isNaN(val) || val < 0 || val > 100) return defaultVal;
        return val;
      } catch {
        return defaultVal;
      }
    }
    router.post("/buy", authMiddleware, async (req, res) => {
      try {
        const { plan_id, transaction_password } = req.body;
        const userId = req.user.id;
        if (!plan_id) return res.status(400).json({ error: "Plan requis" });
        const result = await withTransaction(async (client) => {
          const tpRes = await client.query("SELECT password FROM transaction_passwords WHERE user_id = $1", [userId]);
          if (!tpRes.rows[0]) return { error: "Veuillez configurer votre mot de passe de transaction" };
          if (tpRes.rows[0].password !== transaction_password) return { error: "Mot de passe de transaction incorrect" };
          const planRes = await client.query("SELECT * FROM planinvestissement WHERE id = $1", [plan_id]);
          if (!planRes.rows[0]) return { error: "Plan introuvable" };
          const plan = planRes.rows[0];
          const soldeRes = await client.query("SELECT solde FROM soldes WHERE user_id = $1", [userId]);
          const solde = parseFloat(soldeRes.rows[0]?.solde || 0);
          if (solde < parseFloat(plan.prix)) return { error: "Solde insuffisant" };
          const rev_j = parseFloat(plan.prix) * parseFloat(plan.rendement_journalier) / 100;
          const date_fin = /* @__PURE__ */ new Date();
          date_fin.setDate(date_fin.getDate() + plan.duree_jours);
          const date_fin_str = date_fin.toISOString().split("T")[0];
          await client.query(
            `INSERT INTO commandes (user_id, plan_id, montant, revenu_journalier, date_debut, date_fin, statut)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'actif')`,
            [userId, plan_id, plan.prix, rev_j, date_fin_str]
          );
          await client.query("UPDATE soldes SET solde = solde - $1, date_maj = NOW() WHERE user_id = $2", [plan.prix, userId]);
          const comm1 = await getSettingDecimal(client, "commission_niveau1", 10);
          const comm2 = await getSettingDecimal(client, "commission_niveau2", 5);
          const comm3 = await getSettingDecimal(client, "commission_niveau3", 2);
          const commissions = [comm1, comm2, comm3];
          let parrainRes = await client.query("SELECT parrain_id FROM utilisateurs WHERE id = $1", [userId]);
          let parrain_id = parrainRes.rows[0]?.parrain_id;
          const visited = /* @__PURE__ */ new Set([userId]);
          for (let i = 0; i < 3 && parrain_id; i++) {
            if (visited.has(parrain_id)) break;
            visited.add(parrain_id);
            const montant = parseFloat(plan.prix) * commissions[i] / 100;
            if (montant > 0) {
              await client.query(
                `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
             ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
                [parrain_id, montant]
              );
              await client.query(
                "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, $3)",
                [parrain_id, montant, "parrainage"]
              );
            }
            const nextRes = await client.query("SELECT parrain_id FROM utilisateurs WHERE id = $1", [parrain_id]);
            parrain_id = nextRes.rows[0]?.parrain_id;
          }
          return { success: true, plan_nom: plan.nom };
        });
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: `Plan "${result.plan_nom}" activ\xE9 avec succ\xE8s` });
      } catch (err) {
        console.error("Buy error:", err);
        res.status(500).json({ error: "Erreur lors de l'achat du plan" });
      }
    });
    var VIP_LEVELS = [
      { niveau: 1, requis: 70, cadeau: 5e3 },
      { niveau: 2, requis: 100, cadeau: 8e3 },
      { niveau: 3, requis: 200, cadeau: 1e4 }
    ];
    async function countFilleulsInvestisseurs(userId) {
      const { rows: filleuls } = await query("SELECT id FROM utilisateurs WHERE parrain_id = $1", [userId]);
      const ids = filleuls.map((f) => f.id);
      if (ids.length === 0) return 0;
      const { rows: commandes } = await query(
        "SELECT DISTINCT user_id FROM commandes WHERE user_id = ANY($1)",
        [ids]
      );
      return commandes.length;
    }
    router.get("/salary", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const count = await countFilleulsInvestisseurs(userId);
        const { rows: claims } = await query("SELECT niveau,statut FROM cadeaux_vip WHERE user_id = $1", [userId]);
        const claimMap = {};
        claims.forEach((c) => {
          claimMap[c.niveau] = c.statut;
        });
        let niveauActuel = 0;
        VIP_LEVELS.forEach((l) => {
          if (count >= l.requis) niveauActuel = l.niveau;
        });
        const niveaux = VIP_LEVELS.map((l) => ({
          niveau: l.niveau,
          requis: l.requis,
          cadeau: l.cadeau,
          atteint: count >= l.requis,
          statut: claimMap[l.niveau] || "none"
        }));
        const prochain = VIP_LEVELS.find((l) => count < l.requis);
        res.json({
          filleuls_investisseurs: count,
          niveau: niveauActuel,
          niveaux,
          prochain: prochain ? { niveau: prochain.niveau, requis: prochain.requis, restant: Math.max(0, prochain.requis - count) } : null
        });
      } catch (err) {
        console.error("Salary error:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/claim-gift", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const niveau = parseInt(req.body.niveau);
        const level = VIP_LEVELS.find((l) => l.niveau === niveau);
        if (!level) return res.status(400).json({ error: "Niveau VIP invalide" });
        const count = await countFilleulsInvestisseurs(userId);
        if (count < level.requis) {
          return res.status(400).json({ error: `Il faut ${level.requis} filleuls ayant investi pour r\xE9clamer ce cadeau` });
        }
        const { rows: existing } = await query("SELECT id,statut FROM cadeaux_vip WHERE user_id = $1 AND niveau = $2", [userId, niveau]);
        const ex = existing[0];
        if (ex && ex.statut === "valide") return res.status(400).json({ error: "Cadeau d\xE9j\xE0 re\xE7u" });
        if (ex && ex.statut === "en_attente") return res.status(400).json({ error: "Cadeau d\xE9j\xE0 r\xE9clam\xE9, en attente de confirmation" });
        if (ex) {
          await query(
            "UPDATE cadeaux_vip SET statut='en_attente', montant=$1, date_demande=NOW(), date_traitement=NULL WHERE id=$2",
            [level.cadeau, ex.id]
          );
        } else {
          try {
            await query(
              "INSERT INTO cadeaux_vip (user_id, niveau, montant, statut) VALUES ($1, $2, $3, 'en_attente')",
              [userId, niveau, level.cadeau]
            );
          } catch (err) {
            if (err.code === "23505") return res.status(400).json({ error: "Cadeau d\xE9j\xE0 r\xE9clam\xE9" });
            throw err;
          }
        }
        res.json({ success: true, message: "Cadeau r\xE9clam\xE9 ! En attente de confirmation de l'administrateur." });
      } catch (err) {
        console.error("Claim gift error:", err);
        res.status(500).json({ error: "Erreur lors de la r\xE9clamation du cadeau" });
      }
    });
    router.get("/revenue-history", authMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          "SELECT * FROM historique_revenus WHERE user_id = $1 ORDER BY date_paiement DESC LIMIT 50",
          [req.user.id]
        );
        res.json({ history: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/deposit.js
var require_deposit = __commonJS({
  "server/routes/deposit.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query } = require_db();
    var { authMiddleware } = require_auth2();
    var multer = require("multer");
    var path2 = require("path");
    var { UPLOADS_DIR: UPLOADS_DIR2 } = require_config();
    var router = express2.Router();
    var storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOADS_DIR2),
      filename: (req, file, cb) => cb(null, Date.now() + path2.extname(file.originalname))
    });
    var upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
    var PAYS_OPERATEURS = {
      "B\xE9nin": { country_code: "BJ", currency: "XOF", operators: { "35": "MTN Money", "36": "Moov Money" } },
      "Burkina Faso": { country_code: "BF", currency: "XOF", operators: { "33": "Moov Money", "34": "Orange Money" } },
      "Cameroun": { country_code: "CM", currency: "XAF", operators: { "1": "MTN Mobile Money", "2": "Orange Money" } },
      "C\xF4te d'Ivoire": { country_code: "CI", currency: "XOF", operators: { "30": "MTN Money", "32": "Wave", "31": "Moov Money", "29": "Orange Money" } },
      "Mali": { country_code: "ML", currency: "XOF", operators: { "39": "Orange Money", "40": "Moov Money" } },
      "Togo": { country_code: "TG", currency: "XOF", operators: { "38": "Moov Money", "37": "T-Money" } },
      "S\xE9n\xE9gal": { country_code: "SN", currency: "XOF", operators: { "26": "Free Money", "25": "Wave", "24": "Orange Money" } }
    };
    router.get("/operators", authMiddleware, (req, res) => {
      res.json({ pays_operateurs: PAYS_OPERATEURS });
    });
    router.get("/list", authMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          "SELECT * FROM depots WHERE user_id = $1 ORDER BY date_depot DESC LIMIT 20",
          [req.user.id]
        );
        res.json({ depots: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/request", authMiddleware, upload.single("preuve"), async (req, res) => {
      try {
        const { montant, pays, operateur, numero_payeur } = req.body;
        const userId = req.user.id;
        if (!montant || !pays || !operateur || !numero_payeur) {
          return res.status(400).json({ error: "Tous les champs sont obligatoires" });
        }
        const montantNum = parseFloat(montant);
        if (montantNum < 500) {
          return res.status(400).json({ error: "Le montant minimum de d\xE9p\xF4t est de 500" });
        }
        const preuve_path = req.file ? req.file.filename : null;
        const { rows } = await query(
          `INSERT INTO depots (user_id, montant, pays, operateur, numero_payeur, preuve_paiement, statut)
       VALUES ($1, $2, $3, $4, $5, $6, 'en_attente') RETURNING id`,
          [userId, montantNum, pays, operateur, numero_payeur, preuve_path]
        );
        res.json({
          success: true,
          message: "Demande de d\xE9p\xF4t soumise. En attente de validation.",
          depot_id: rows[0].id
        });
      } catch (err) {
        console.error("Deposit error:", err);
        res.status(500).json({ error: "Erreur lors de la soumission du d\xE9p\xF4t" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/withdrawal.js
var require_withdrawal = __commonJS({
  "server/routes/withdrawal.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query, withTransaction } = require_db();
    var { authMiddleware } = require_auth2();
    var router = express2.Router();
    router.get("/list", authMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          "SELECT * FROM retraits WHERE user_id = $1 ORDER BY date_demande DESC LIMIT 20",
          [req.user.id]
        );
        res.json({ retraits: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/request", authMiddleware, async (req, res) => {
      try {
        const { montant, transaction_password } = req.body;
        const userId = req.user.id;
        if (!montant || !transaction_password) {
          return res.status(400).json({ error: "Montant et mot de passe requis" });
        }
        const now = /* @__PURE__ */ new Date();
        const hour = now.getUTCHours();
        const day = now.getUTCDay();
        if (day === 0 || hour < 9 || hour >= 19) {
          return res.status(400).json({ error: "Les retraits sont disponibles du lundi au samedi de 9h \xE0 19h GMT" });
        }
        const userCheck = await query("SELECT banni, retrait_bloque, retrait_bloque_vip FROM utilisateurs WHERE id = $1", [userId]);
        const u = userCheck.rows[0];
        if (u?.banni) return res.status(403).json({ error: "Votre compte est banni. Contactez le support." });
        if (u?.retrait_bloque) {
          let unblocked = false;
          const vipRes = await query("SELECT niveau FROM vip WHERE user_id = $1", [userId]);
          const currentVip = vipRes.rows[0]?.niveau || 0;
          if (currentVip > (u.retrait_bloque_vip || 0)) {
            await query("UPDATE utilisateurs SET retrait_bloque = false, retrait_bloque_vip = 0 WHERE id = $1", [userId]);
            unblocked = true;
          }
          if (!unblocked) {
            const fRes = await query("SELECT id FROM utilisateurs WHERE parrain_id = $1", [userId]);
            const fIds = fRes.rows.map((r) => r.id);
            if (fIds.length > 0) {
              const eligibleRes = await query(
                `SELECT COUNT(DISTINCT c.user_id) FROM commandes c
             JOIN depots d ON d.user_id = c.user_id
             WHERE c.user_id = ANY($1) AND d.statut = 'valide'`,
                [fIds]
              );
              if (parseInt(eligibleRes.rows[0].count) >= 1) {
                await query("UPDATE utilisateurs SET retrait_bloque = false, retrait_bloque_vip = 0 WHERE id = $1", [userId]);
                unblocked = true;
              }
            }
          }
          if (!unblocked) {
            return res.status(403).json({ error: "Votre retrait est bloqu\xE9. Pour le d\xE9bloquer, invitez au moins une personne \xE0 recharger et souscrire \xE0 un plan, ou passez \xE0 un niveau VIP sup\xE9rieur." });
          }
        }
        const tpRes = await query("SELECT password FROM transaction_passwords WHERE user_id = $1", [userId]);
        if (!tpRes.rows[0]) return res.status(400).json({ error: "Veuillez configurer votre mot de passe de transaction" });
        if (tpRes.rows[0].password !== transaction_password) return res.status(400).json({ error: "Mot de passe de transaction incorrect" });
        const walletRes = await query("SELECT * FROM portefeuilles WHERE user_id = $1", [userId]);
        if (!walletRes.rows[0]) return res.status(400).json({ error: "Veuillez ajouter un portefeuille de retrait" });
        const wallet = walletRes.rows[0];
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const activeRes = await query(
          "SELECT COUNT(*) FROM commandes WHERE user_id = $1 AND statut = 'actif' AND date_fin >= $2",
          [userId, today]
        );
        if (parseInt(activeRes.rows[0].count) === 0) {
          return res.status(400).json({ error: "Vous devez avoir un plan d'investissement actif pour retirer" });
        }
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
        const recentRes = await query(
          "SELECT COUNT(*) FROM retraits WHERE user_id = $1 AND statut IN ('en_attente','valide') AND date_demande >= $2",
          [userId, yesterday]
        );
        if (parseInt(recentRes.rows[0].count) > 0) {
          return res.status(400).json({ error: "Un seul retrait par 24h est autoris\xE9" });
        }
        const soldeRes = await query("SELECT solde FROM soldes WHERE user_id = $1", [userId]);
        const solde = parseFloat(soldeRes.rows[0]?.solde || 0);
        const montantNum = parseFloat(montant);
        if (montantNum < 2e3) return res.status(400).json({ error: "Retrait minimum: 2000" });
        if (montantNum > solde) return res.status(400).json({ error: "Solde insuffisant" });
        const result = await withTransaction(async (client) => {
          const checkSolde = await client.query("SELECT solde FROM soldes WHERE user_id = $1 FOR UPDATE", [userId]);
          const currentSolde = parseFloat(checkSolde.rows[0]?.solde || 0);
          if (currentSolde < montantNum) return { error: "Solde insuffisant" };
          await client.query(
            "INSERT INTO retraits (user_id, montant, methode, numero_compte, statut) VALUES ($1, $2, $3, $4, 'en_attente')",
            [userId, montantNum, wallet.methode_paiement, wallet.numero_telephone]
          );
          await client.query("UPDATE soldes SET solde = solde - $1, date_maj = NOW() WHERE user_id = $2", [montantNum, userId]);
          return { success: true };
        });
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "Demande de retrait soumise avec succ\xE8s" });
      } catch (err) {
        console.error("Withdrawal error:", err);
        res.status(500).json({ error: "Erreur lors du retrait" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/referral.js
var require_referral = __commonJS({
  "server/routes/referral.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query } = require_db();
    var { authMiddleware } = require_auth2();
    var router = express2.Router();
    router.get("/data", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const lvl1Res = await query(
          "SELECT id,nom,telephone,pays,date_inscription FROM utilisateurs WHERE parrain_id = $1",
          [userId]
        );
        const lvl1 = lvl1Res.rows;
        const ids1 = lvl1.map((u) => u.id);
        let lvl2 = [];
        if (ids1.length > 0) {
          const lvl2Res = await query(
            "SELECT id,nom,telephone,pays,date_inscription FROM utilisateurs WHERE parrain_id = ANY($1)",
            [ids1]
          );
          lvl2 = lvl2Res.rows;
        }
        const ids2 = lvl2.map((u) => u.id);
        let lvl3 = [];
        if (ids2.length > 0) {
          const lvl3Res = await query(
            "SELECT id,nom,telephone,pays,date_inscription FROM utilisateurs WHERE parrain_id = ANY($1)",
            [ids2]
          );
          lvl3 = lvl3Res.rows;
        }
        const [revenusRes, userRes, settingsRes] = await Promise.all([
          query("SELECT montant FROM historique_revenus WHERE user_id = $1 AND type = 'parrainage'", [userId]),
          query("SELECT code_parrainage,lien_parrainage FROM utilisateurs WHERE id = $1", [userId]),
          query("SELECT cle,valeur FROM settings WHERE cle IN ('commission_niveau1','commission_niveau2','commission_niveau3')")
        ]);
        const gains_parrainage = revenusRes.rows.reduce((sum, r) => sum + parseFloat(r.montant || 0), 0);
        const userInfo = userRes.rows[0];
        const cmap = {};
        settingsRes.rows.forEach((s) => {
          cmap[s.cle] = s.valeur;
        });
        res.json({
          niveau1: { count: lvl1.length, filleuls: lvl1 },
          niveau2: { count: lvl2.length, filleuls: lvl2 },
          niveau3: { count: lvl3.length, filleuls: lvl3 },
          gains_parrainage,
          commissions: {
            niveau1: cmap.commission_niveau1 || "10",
            niveau2: cmap.commission_niveau2 || "5",
            niveau3: cmap.commission_niveau3 || "2"
          },
          code_parrainage: userInfo?.code_parrainage,
          lien_parrainage: userInfo?.lien_parrainage
        });
      } catch (err) {
        console.error("Referral error:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/admin.js
var require_admin = __commonJS({
  "server/routes/admin.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query, withTransaction } = require_db();
    var { adminMiddleware } = require_auth2();
    var multer = require("multer");
    var path2 = require("path");
    var { UPLOADS_DIR: UPLOADS_DIR2 } = require_config();
    var router = express2.Router();
    var storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOADS_DIR2),
      filename: (req, file, cb) => cb(null, "annonce_" + Date.now() + path2.extname(file.originalname))
    });
    var upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
    router.get("/stats", adminMiddleware, async (req, res) => {
      try {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const [usersRes, depotsValidesRes, retraitsValidesRes, commandesActifRes, depotsAttenteRes, retraitsAttenteRes, commandesUsersRes] = await Promise.all([
          query("SELECT COUNT(*) FROM utilisateurs"),
          query("SELECT montant FROM depots WHERE statut = 'valide'"),
          query("SELECT montant FROM retraits WHERE statut = 'valide'"),
          query("SELECT COUNT(*) FROM commandes WHERE statut = 'actif'"),
          query("SELECT COUNT(*) FROM depots WHERE statut = 'en_attente'"),
          query("SELECT COUNT(*) FROM retraits WHERE statut = 'en_attente'"),
          query("SELECT DISTINCT user_id FROM commandes WHERE statut = 'actif' AND date_fin >= $1", [today])
        ]);
        const totalDepots = depotsValidesRes.rows.reduce((s, d) => s + parseFloat(d.montant || 0), 0);
        const totalRetraits = retraitsValidesRes.rows.reduce((s, r) => s + parseFloat(r.montant || 0), 0);
        res.json({
          users: { count: parseInt(usersRes.rows[0].count) },
          depots: { total: totalDepots, en_attente: parseInt(depotsAttenteRes.rows[0].count) },
          retraits: { total: totalRetraits, en_attente: parseInt(retraitsAttenteRes.rows[0].count) },
          commandes: { count: parseInt(commandesActifRes.rows[0].count) },
          users_avec_investissement: commandesUsersRes.rows.length
        });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/users", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          `SELECT u.id, u.nom, u.telephone, u.pays, u.date_inscription, u.role,
              u.banni, u.retrait_bloque, u.retrait_bloque_vip,
              COALESCE(s.solde, 0) AS solde
       FROM utilisateurs u LEFT JOIN soldes s ON s.user_id = u.id
       ORDER BY u.date_inscription DESC LIMIT 200`
        );
        res.json({ users: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/users/:id/credit", adminMiddleware, async (req, res) => {
      try {
        const { montant } = req.body;
        const userId = parseInt(req.params.id);
        if (!montant || isNaN(montant)) return res.status(400).json({ error: "Montant invalide" });
        const montantNum = parseFloat(montant);
        if (montantNum <= 0) return res.status(400).json({ error: "Montant invalide" });
        await withTransaction(async (client) => {
          await client.query(
            `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
            [userId, montantNum]
          );
          await client.query(
            "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'credit_admin')",
            [userId, montantNum]
          );
        });
        res.json({ success: true, message: "Cr\xE9dit effectu\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/users/:id/balance", adminMiddleware, async (req, res) => {
      try {
        const { mode, montant } = req.body;
        const userId = parseInt(req.params.id);
        if (!montant || isNaN(montant)) return res.status(400).json({ error: "Montant invalide" });
        const montantNum = parseFloat(montant);
        if (!["add", "subtract", "set"].includes(mode)) return res.status(400).json({ error: "Mode invalide" });
        await withTransaction(async (client) => {
          if (mode === "set") {
            if (montantNum < 0) throw new Error("Montant invalide");
            await client.query(
              `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = $2, date_maj = NOW()`,
              [userId, montantNum]
            );
            await client.query(
              "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'credit_admin')",
              [userId, montantNum]
            );
          } else if (mode === "add") {
            if (montantNum <= 0) throw new Error("Montant invalide");
            await client.query(
              `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
              [userId, montantNum]
            );
            await client.query(
              "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'credit_admin')",
              [userId, montantNum]
            );
          } else {
            if (montantNum <= 0) throw new Error("Montant invalide");
            const soldeRes = await client.query("SELECT solde FROM soldes WHERE user_id = $1", [userId]);
            const current = parseFloat(soldeRes.rows[0]?.solde || 0);
            const newSolde = Math.max(0, current - montantNum);
            await client.query(
              `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = $2, date_maj = NOW()`,
              [userId, newSolde]
            );
          }
        });
        res.json({ success: true, message: "Solde modifi\xE9" });
      } catch (err) {
        res.status(500).json({ error: err.message || "Erreur serveur" });
      }
    });
    router.put("/users/:id/info", adminMiddleware, async (req, res) => {
      try {
        const { nom, telephone, pays } = req.body;
        const userId = parseInt(req.params.id);
        const updates = [];
        const vals = [];
        let idx = 1;
        if (nom) {
          updates.push(`nom = $${idx++}`);
          vals.push(nom.trim());
        }
        if (telephone) {
          updates.push(`telephone = $${idx++}`);
          vals.push(telephone.trim());
        }
        if (pays) {
          updates.push(`pays = $${idx++}`);
          vals.push(pays.trim());
        }
        if (updates.length === 0) return res.status(400).json({ error: "Aucune donn\xE9e \xE0 modifier" });
        vals.push(userId);
        await query(`UPDATE utilisateurs SET ${updates.join(", ")} WHERE id = $${idx}`, vals);
        res.json({ success: true, message: "Informations mises \xE0 jour" });
      } catch (err) {
        if (err.code === "23505") return res.status(400).json({ error: "Ce num\xE9ro est d\xE9j\xE0 utilis\xE9" });
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/users/:id/password", adminMiddleware, async (req, res) => {
      try {
        const { new_password } = req.body;
        const userId = parseInt(req.params.id);
        if (!new_password || new_password.length < 4) return res.status(400).json({ error: "Mot de passe trop court (min 4 caract\xE8res)" });
        const bcrypt = require("bcryptjs");
        const hashed = await bcrypt.hash(new_password, 10);
        await query("UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2", [hashed, userId]);
        res.json({ success: true, message: "Mot de passe r\xE9initialis\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.delete("/users/:id/transaction-password", adminMiddleware, async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        await query("DELETE FROM transaction_passwords WHERE user_id = $1", [userId]);
        res.json({ success: true, message: "Mot de passe de transaction r\xE9initialis\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/users/:id/ban", adminMiddleware, async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { rows } = await query("SELECT banni FROM utilisateurs WHERE id = $1", [userId]);
        if (!rows[0]) return res.status(404).json({ error: "Utilisateur introuvable" });
        const newBan = !rows[0].banni;
        await query("UPDATE utilisateurs SET banni = $1 WHERE id = $2", [newBan, userId]);
        res.json({ success: true, banni: newBan, message: newBan ? "Utilisateur banni" : "Utilisateur d\xE9banni" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/users/:id/block-withdrawal", adminMiddleware, async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { rows } = await query("SELECT retrait_bloque FROM utilisateurs WHERE id = $1", [userId]);
        if (!rows[0]) return res.status(404).json({ error: "Utilisateur introuvable" });
        const newBlock = !rows[0].retrait_bloque;
        let vipNiveau = 0;
        if (newBlock) {
          const vipRes = await query("SELECT niveau FROM vip WHERE user_id = $1", [userId]);
          vipNiveau = vipRes.rows[0]?.niveau || 0;
        }
        await query(
          "UPDATE utilisateurs SET retrait_bloque = $1, retrait_bloque_vip = $2 WHERE id = $3",
          [newBlock, newBlock ? vipNiveau : 0, userId]
        );
        res.json({ success: true, retrait_bloque: newBlock, message: newBlock ? "Retrait bloqu\xE9" : "Retrait d\xE9bloqu\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.delete("/users/:id", adminMiddleware, async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        await query("DELETE FROM utilisateurs WHERE id = $1", [userId]);
        res.json({ success: true, message: "Utilisateur supprim\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/depots", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          `SELECT d.*, u.nom, u.telephone FROM depots d JOIN utilisateurs u ON d.user_id = u.id
       ORDER BY d.date_depot DESC LIMIT 100`
        );
        res.json({ depots: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/depots/:id/validate", adminMiddleware, async (req, res) => {
      try {
        const depotId = parseInt(req.params.id);
        const result = await withTransaction(async (client) => {
          const depotRes = await client.query("SELECT * FROM depots WHERE id = $1 AND statut = 'en_attente'", [depotId]);
          if (!depotRes.rows[0]) return { error: "D\xE9p\xF4t non trouv\xE9 ou d\xE9j\xE0 trait\xE9" };
          const depot = depotRes.rows[0];
          await client.query("UPDATE depots SET statut = 'valide', date_traitement = NOW() WHERE id = $1", [depotId]);
          await client.query(
            `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
            [depot.user_id, depot.montant]
          );
          return { success: true };
        });
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "D\xE9p\xF4t valid\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/depots/:id/reject", adminMiddleware, async (req, res) => {
      try {
        await query("UPDATE depots SET statut = 'rejete', date_traitement = NOW() WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "D\xE9p\xF4t rejet\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/retraits", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          `SELECT r.*, u.nom, u.telephone FROM retraits r JOIN utilisateurs u ON r.user_id = u.id
       ORDER BY r.date_demande DESC LIMIT 100`
        );
        res.json({ retraits: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/retraits/:id/validate", adminMiddleware, async (req, res) => {
      try {
        await query("UPDATE retraits SET statut = 'valide', date_traitement = NOW() WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "Retrait valid\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/retraits/:id/reject", adminMiddleware, async (req, res) => {
      try {
        const retraitId = parseInt(req.params.id);
        const result = await withTransaction(async (client) => {
          const retraitRes = await client.query("SELECT * FROM retraits WHERE id = $1 AND statut = 'en_attente'", [retraitId]);
          if (!retraitRes.rows[0]) return { error: "Retrait non trouv\xE9 ou d\xE9j\xE0 trait\xE9" };
          const retrait = retraitRes.rows[0];
          await client.query("UPDATE retraits SET statut = 'rejete', date_traitement = NOW() WHERE id = $1", [retraitId]);
          await client.query("UPDATE soldes SET solde = solde + $1, date_maj = NOW() WHERE user_id = $2", [retrait.montant, retrait.user_id]);
          return { success: true };
        });
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "Retrait rejet\xE9, solde rembours\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/cadeaux", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          `SELECT c.*, u.nom, u.telephone FROM cadeaux_vip c JOIN utilisateurs u ON c.user_id = u.id
       ORDER BY c.date_demande DESC LIMIT 100`
        );
        res.json({ cadeaux: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/cadeaux/:id/validate", adminMiddleware, async (req, res) => {
      try {
        const cadeauId = parseInt(req.params.id);
        const result = await withTransaction(async (client) => {
          const res2 = await client.query(
            "UPDATE cadeaux_vip SET statut = 'valide', date_traitement = NOW() WHERE id = $1 AND statut = 'en_attente' RETURNING *",
            [cadeauId]
          );
          if (!res2.rows[0]) return { error: "Cadeau non trouv\xE9 ou d\xE9j\xE0 trait\xE9" };
          const cadeau = res2.rows[0];
          await client.query(
            `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
            [cadeau.user_id, cadeau.montant]
          );
          await client.query(
            "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'cadeau_vip')",
            [cadeau.user_id, cadeau.montant]
          );
          return { success: true };
        });
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "Cadeau valid\xE9 et cr\xE9dit\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/cadeaux/:id/reject", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          "UPDATE cadeaux_vip SET statut = 'rejete', date_traitement = NOW() WHERE id = $1 AND statut = 'en_attente' RETURNING id",
          [req.params.id]
        );
        if (rows.length === 0) return res.status(400).json({ error: "Cadeau non trouv\xE9 ou d\xE9j\xE0 trait\xE9" });
        res.json({ success: true, message: "Cadeau rejet\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/posts", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query(
          `SELECT p.*, u.nom FROM posts p JOIN utilisateurs u ON p.user_id = u.id
       ORDER BY p.date_creation DESC LIMIT 50`
        );
        res.json({ posts: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/posts/:id/:action", adminMiddleware, async (req, res) => {
      try {
        const statut = req.params.action === "validate" ? "valide" : "refuse";
        await query("UPDATE posts SET statut = $1 WHERE id = $2", [statut, req.params.id]);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    var SETTINGS_DEFAULTS = {
      min_depot: "500",
      commission_niveau1: "10",
      commission_niveau2: "5",
      commission_niveau3: "2"
    };
    router.get("/settings", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query("SELECT cle,valeur,description FROM settings");
        const map = { ...SETTINGS_DEFAULTS };
        rows.forEach((s) => {
          map[s.cle] = s.valeur;
        });
        res.json({ settings: map });
      } catch (err) {
        res.json({ settings: { ...SETTINGS_DEFAULTS } });
      }
    });
    router.put("/settings", adminMiddleware, async (req, res) => {
      try {
        const { cle, valeur } = req.body;
        if (!cle || valeur === void 0) return res.status(400).json({ error: "Donn\xE9es invalides" });
        if (["commission_niveau1", "commission_niveau2", "commission_niveau3"].includes(cle)) {
          const num = Number(valeur);
          if (!Number.isFinite(num) || num < 0 || num > 100) {
            return res.status(400).json({ error: "Le pourcentage doit \xEAtre un nombre entre 0 et 100" });
          }
        }
        await query(
          `INSERT INTO settings (cle, valeur, date_maj) VALUES ($1, $2, NOW())
       ON CONFLICT (cle) DO UPDATE SET valeur = $2, date_maj = NOW()`,
          [cle, String(valeur)]
        );
        res.json({ success: true });
      } catch (err) {
        console.error("Settings catch:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/plans", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query("SELECT * FROM planinvestissement ORDER BY serie ASC");
        res.json({ plans: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/plans", adminMiddleware, async (req, res) => {
      try {
        const { nom, prix, duree_jours, rendement_journalier } = req.body;
        if (!nom || !prix || !duree_jours || !rendement_journalier) {
          return res.status(400).json({ error: "Tous les champs sont requis" });
        }
        const { rows } = await query(
          "INSERT INTO planinvestissement (nom, prix, duree_jours, rendement_journalier, serie) VALUES ($1, $2, $3, $4, $5) RETURNING *",
          [nom, parseFloat(prix), parseInt(duree_jours), parseFloat(rendement_journalier), "X"]
        );
        res.json({ success: true, plan: rows[0] });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/plans/:id", adminMiddleware, async (req, res) => {
      try {
        const { nom, prix, duree_jours, rendement_journalier } = req.body;
        await query(
          "UPDATE planinvestissement SET nom=$1, prix=$2, duree_jours=$3, rendement_journalier=$4 WHERE id=$5",
          [nom, parseFloat(prix), parseInt(duree_jours), parseFloat(rendement_journalier), req.params.id]
        );
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.delete("/plans/:id", adminMiddleware, async (req, res) => {
      try {
        await query("DELETE FROM planinvestissement WHERE id = $1", [req.params.id]);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/annonces", adminMiddleware, async (req, res) => {
      try {
        const { rows } = await query("SELECT * FROM annonces ORDER BY date_creation DESC");
        res.json({ annonces: rows });
      } catch (err) {
        res.json({ annonces: [] });
      }
    });
    router.post("/annonces", adminMiddleware, upload.single("image"), async (req, res) => {
      try {
        const image = req.file ? req.file.filename : null;
        const couleur = req.body.couleur || "#22c55e";
        const actif = req.body.actif !== "false";
        const { rows } = await query(
          "INSERT INTO annonces (titre, contenu, image, couleur, actif) VALUES ('', '', $1, $2, $3) RETURNING *",
          [image, couleur, actif]
        );
        res.json({ success: true, annonce: rows[0] });
      } catch (err) {
        console.error("Annonce catch:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/annonces/:id", adminMiddleware, async (req, res) => {
      try {
        const { actif, couleur } = req.body;
        const updates = [];
        const vals = [];
        let idx = 1;
        if (actif !== void 0) {
          updates.push(`actif = $${idx++}`);
          vals.push(actif);
        }
        if (couleur !== void 0) {
          updates.push(`couleur = $${idx++}`);
          vals.push(couleur);
        }
        updates.push(`date_maj = NOW()`);
        vals.push(req.params.id);
        await query(`UPDATE annonces SET ${updates.join(", ")} WHERE id = $${idx}`, vals);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.delete("/annonces/:id", adminMiddleware, async (req, res) => {
      try {
        await query("DELETE FROM annonces WHERE id = $1", [req.params.id]);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/posts.js
var require_posts = __commonJS({
  "server/routes/posts.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query, withTransaction } = require_db();
    var { authMiddleware } = require_auth2();
    var multer = require("multer");
    var path2 = require("path");
    var { UPLOADS_DIR: UPLOADS_DIR2 } = require_config();
    var router = express2.Router();
    var storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOADS_DIR2),
      filename: (req, file, cb) => cb(null, Date.now() + path2.extname(file.originalname))
    });
    var upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
    router.get("/", async (req, res) => {
      try {
        const { rows } = await query(
          `SELECT p.*, u.nom FROM posts p
       JOIN utilisateurs u ON p.user_id = u.id
       WHERE p.statut = 'valide' ORDER BY p.date_creation DESC LIMIT 20`
        );
        res.json({ posts: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
      try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Message requis" });
        const image = req.file ? req.file.filename : "";
        await query(
          "INSERT INTO posts (user_id, message, image, statut) VALUES ($1, $2, $3, 'en_attente')",
          [req.user.id, message, image]
        );
        res.json({ success: true, message: "Post soumis, en attente de validation" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/spin", authMiddleware, async (req, res) => {
      try {
        const { rows } = await query("SELECT last_spin_time FROM utilisateurs WHERE id = $1", [req.user.id]);
        const lastSpin = rows[0]?.last_spin_time;
        let canSpin = true;
        let remainingSeconds = 0;
        if (lastSpin) {
          const elapsed = (Date.now() - new Date(lastSpin).getTime()) / 1e3;
          if (elapsed < 48 * 3600) {
            canSpin = false;
            remainingSeconds = Math.ceil(48 * 3600 - elapsed);
          }
        }
        res.json({ canSpin, remainingSeconds });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/spin", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const result = await withTransaction(async (client) => {
          const { rows } = await client.query("SELECT last_spin_time FROM utilisateurs WHERE id = $1 FOR UPDATE", [userId]);
          const lastSpin = rows[0]?.last_spin_time;
          if (lastSpin) {
            const elapsed = (Date.now() - new Date(lastSpin).getTime()) / 1e3;
            if (elapsed < 48 * 3600) {
              return { error: "Vous devez attendre 48h entre chaque spin" };
            }
          }
          const rand = Math.floor(Math.random() * 1e5);
          let gain = 0;
          if (rand < 1) gain = 500;
          else if (rand < 11) gain = 50;
          else if (rand < 21) gain = 100;
          else if (rand < 31) gain = 200;
          await client.query("UPDATE utilisateurs SET last_spin_time = NOW() WHERE id = $1", [userId]);
          if (gain > 0) {
            await client.query(
              `INSERT INTO soldes (user_id, solde, date_maj) VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET solde = soldes.solde + $2, date_maj = NOW()`,
              [userId, gain]
            );
            await client.query(
              "INSERT INTO historique_revenus (user_id, montant, type) VALUES ($1, $2, 'bonus')",
              [userId, gain]
            );
          }
          return { success: true, gain };
        });
        if (result.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, gain: result.gain });
      } catch (err) {
        console.error("Spin error:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/annonces.js
var require_annonces = __commonJS({
  "server/routes/annonces.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query } = require_db();
    var router = express2.Router();
    router.get("/", async (req, res) => {
      try {
        const { rows } = await query(
          "SELECT id,titre,contenu,image,couleur,date_creation FROM annonces WHERE actif = true ORDER BY date_creation DESC LIMIT 10"
        );
        res.json({ annonces: rows });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    module2.exports = router;
  }
});

// server/routes/transactions.js
var require_transactions = __commonJS({
  "server/routes/transactions.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var { query } = require_db();
    var { authMiddleware, adminMiddleware } = require_auth2();
    var router = express2.Router();
    var REVENU_MAP = {
      parrainage: { kind: "parrainage", label: "Commission parrainage" },
      bonus: { kind: "bonus", label: "Bonus roue de la fortune" },
      credit_admin: { kind: "credit_admin", label: "Cr\xE9dit administrateur" },
      cadeau_vip: { kind: "cadeau_vip", label: "Cadeau VIP" },
      revenu: { kind: "revenu", label: "Revenu investissement" }
    };
    function mapRevenu(r) {
      const m = REVENU_MAP[r.type] || { kind: "revenu", label: "Revenu investissement" };
      return {
        id: `revenu-${r.id}`,
        kind: m.kind,
        label: m.label,
        montant: parseFloat(r.montant || 0),
        sens: "+",
        statut: "valide",
        date: r.date_paiement,
        details: { type_revenu: r.type, commande_id: r.commande_id || null }
      };
    }
    function mapDepot(d) {
      return {
        id: `depot-${d.id}`,
        kind: "depot",
        label: "D\xE9p\xF4t",
        montant: parseFloat(d.montant || 0),
        sens: "+",
        statut: d.statut,
        date: d.date_depot,
        details: { pays: d.pays, operateur: d.operateur, numero_payeur: d.numero_payeur }
      };
    }
    function mapRetrait(r) {
      return {
        id: `retrait-${r.id}`,
        kind: "retrait",
        label: "Retrait",
        montant: parseFloat(r.montant || 0),
        sens: "-",
        statut: r.statut,
        date: r.date_demande,
        details: { methode: r.methode, numero_compte: r.numero_compte }
      };
    }
    function mapCommande(c) {
      return {
        id: `commande-${c.id}`,
        kind: "investissement",
        label: "Investissement",
        montant: parseFloat(c.montant || 0),
        sens: "-",
        statut: c.statut,
        date: c.date_debut,
        details: {
          plan_nom: c.plan_nom || null,
          revenu_journalier: parseFloat(c.revenu_journalier || 0),
          date_fin: c.date_fin
        }
      };
    }
    router.get("/", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const [depotsRes, retraitsRes, commandesRes, revenusRes] = await Promise.all([
          query("SELECT * FROM depots WHERE user_id = $1", [userId]),
          query("SELECT * FROM retraits WHERE user_id = $1", [userId]),
          query("SELECT c.*, p.nom AS plan_nom FROM commandes c LEFT JOIN planinvestissement p ON c.plan_id = p.id WHERE c.user_id = $1", [userId]),
          query("SELECT * FROM historique_revenus WHERE user_id = $1", [userId])
        ]);
        const transactions = [
          ...depotsRes.rows.map(mapDepot),
          ...retraitsRes.rows.map(mapRetrait),
          ...commandesRes.rows.map(mapCommande),
          ...revenusRes.rows.map(mapRevenu)
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ transactions });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/admin", adminMiddleware, async (req, res) => {
      try {
        const [depotsRes, retraitsRes, commandesRes, revenusRes, usersRes] = await Promise.all([
          query("SELECT * FROM depots"),
          query("SELECT * FROM retraits"),
          query("SELECT c.*, p.nom AS plan_nom FROM commandes c LEFT JOIN planinvestissement p ON c.plan_id = p.id"),
          query("SELECT * FROM historique_revenus"),
          query("SELECT id, nom, telephone FROM utilisateurs")
        ]);
        const userMap = {};
        for (const u of usersRes.rows) userMap[u.id] = u;
        const attach = (tx, userId) => ({
          ...tx,
          user: userMap[userId] ? { nom: userMap[userId].nom, telephone: userMap[userId].telephone } : null
        });
        const transactions = [
          ...depotsRes.rows.map((d) => attach(mapDepot(d), d.user_id)),
          ...retraitsRes.rows.map((r) => attach(mapRetrait(r), r.user_id)),
          ...commandesRes.rows.map((c) => attach(mapCommande(c), c.user_id)),
          ...revenusRes.rows.map((r) => attach(mapRevenu(r), r.user_id))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ transactions });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    module2.exports = router;
  }
});

// server/index.js
var path = require("path");
var express = require("express");
var cors = require("cors");
var helmet = require("helmet");
var morgan = require("morgan");
var { execSync } = require("child_process");
var { CLIENT_DIST, UPLOADS_DIR } = require_config();
var authRoutes = require_auth();
var userRoutes = require_user();
var investmentRoutes = require_investment();
var depositRoutes = require_deposit();
var withdrawalRoutes = require_withdrawal();
var referralRoutes = require_referral();
var adminRoutes = require_admin();
var postRoutes = require_posts();
var annoncesRoutes = require_annonces();
var transactionsRoutes = require_transactions();
var app = express();
var PORT = process.env.PORT || 5e3;
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/investment", investmentRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/annonces", annoncesRoutes);
app.use("/api/transactions", transactionsRoutes);
app.get("/api/health", async (req, res) => {
  const { pool } = require_db();
  const version = "v2.1";
  const tables = ["utilisateurs", "soldes", "vip", "commandes", "planinvestissement", "depots", "retraits"];
  const result = { status: "ok", version, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  result.database_url_set = !!process.env.DATABASE_URL;
  try {
    await pool.query("SELECT 1");
    result.db_connection = "\u2705 connect\xE9e";
  } catch (e) {
    result.db_connection = `\u274C \xE9chec: ${e.message}`;
    return res.json(result);
  }
  const tableStatus = {};
  for (const t of tables) {
    try {
      const r = await pool.query(`SELECT COUNT(*) FROM ${t}`);
      tableStatus[t] = `\u2705 (${r.rows[0].count} lignes)`;
    } catch (e) {
      tableStatus[t] = `\u274C manquante`;
    }
  }
  result.tables = tableStatus;
  res.json(result);
});
app.get("/api/deploy", (req, res) => {
  const secret = process.env.DEPLOY_SECRET || "afriland2024";
  if (req.query.secret !== secret) {
    return res.status(401).send("\u274C Secret invalide");
  }
  try {
    const dir = path.join(__dirname, "..");
    const out = execSync(`cd ${dir} && git pull origin main 2>&1`, { timeout: 3e4 }).toString();
    res.send(`<pre style="font-family:monospace;padding:20px">\u2705 D\xE9ploiement r\xE9ussi !

${out}

Red\xE9marrage dans 3 secondes...</pre>`);
    setTimeout(() => process.exit(0), 3e3);
  } catch (e) {
    res.status(500).send(`<pre>\u274C Erreur:
${e.message}</pre>`);
  }
});
app.use(express.static(CLIENT_DIST, { etag: false, lastModified: false }));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Route non trouv\xE9e" });
  }
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur serveur interne" });
});
process.on("uncaughtException", (err) => {
  console.error("\u274C Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("\u274C Unhandled Rejection:", reason);
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\u2705 AFRILAND INVEST server running on port ${PORT}`);
});
