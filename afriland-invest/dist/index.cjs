"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// server/db.js
var require_db = __commonJS({
  "server/db.js"(exports2, module2) {
    "use strict";
    var { createClient } = require("@supabase/supabase-js");
    if (typeof globalThis.WebSocket === "undefined") {
      globalThis.WebSocket = require("ws");
    }
    var supabaseUrl = process.env.SUPABASE_URL;
    var supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    var supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("\u274C SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis");
      process.exit(1);
    }
    var supabase2 = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    var supabasePublic = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    supabase2.from("utilisateurs").select("id", { count: "exact", head: true }).then(({ count, error }) => {
      if (error) {
        console.error("\u274C Erreur connexion Supabase:", error.message);
        console.error("   V\xE9rifiez SUPABASE_URL et SUPABASE_SERVICE_KEY");
      } else {
        console.log(`\u2705 Supabase connect\xE9 \u2014 ${count ?? 0} utilisateur(s) en base`);
      }
    });
    module2.exports = { supabase: supabase2, supabasePublic };
  }
});

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

// server/routes/auth.js
var require_auth = __commonJS({
  "server/routes/auth.js"(exports2, module2) {
    "use strict";
    var express2 = require("express");
    var bcrypt = require("bcryptjs");
    var jwt = require("jsonwebtoken");
    var { supabase: supabase2 } = require_db();
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
        const { data: user, error } = await supabase2.from("utilisateurs").select("*").eq("telephone", full_tel).single();
        if (error || !user) {
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
        const { data: existing } = await supabase2.from("utilisateurs").select("id").eq("telephone", full_tel).maybeSingle();
        if (existing) {
          return res.status(409).json({ error: "Ce num\xE9ro est d\xE9j\xE0 enregistr\xE9" });
        }
        const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        let parrain_id = null;
        if (code_parrain) {
          const { data: parrain } = await supabase2.from("utilisateurs").select("id").eq("code_parrainage", code_parrain.toUpperCase()).maybeSingle();
          if (parrain) parrain_id = parrain.id;
        }
        const { data: newUser, error: insertError } = await supabase2.from("utilisateurs").insert({
          nom,
          telephone: full_tel,
          pays: pays || PAYS_ELIGIBLES[indicatif],
          mot_de_passe: hashedPassword,
          solde: 0,
          revenus_totaux: 0,
          nombre_filleuls: 0,
          code_parrainage: code,
          parrain_id,
          lien_parrainage: `${appUrl}?p=${code}`,
          role: "user"
        }).select().single();
        if (insertError) throw insertError;
        await Promise.all([
          supabase2.from("soldes").upsert({ user_id: newUser.id, solde: 0 }, { onConflict: "user_id" }),
          supabase2.from("vip").upsert({ user_id: newUser.id, niveau: 0, pourcentage: 0, invitations_requises: 3, invitations_actuelles: 0 }, { onConflict: "user_id" }),
          supabase2.from("filleuls").upsert({ user_id: newUser.id, gains_totaux: 0 }, { onConflict: "user_id" }),
          supabase2.from("roue").upsert({ user_id: newUser.id, nombre_tours: 0 }, { onConflict: "user_id" })
        ]);
        if (parrain_id) {
          await supabase2.rpc("increment_filleuls", { p_user_id: parrain_id });
        }
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
    var { supabase: supabase2 } = require_db();
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
        const [
          { data: user },
          { data: soldeRow },
          { data: vipRow },
          { count: filleulsCount }
        ] = await Promise.all([
          supabase2.from("utilisateurs").select("id,nom,telephone,pays,code_parrainage,lien_parrainage,date_inscription").eq("id", userId).single(),
          supabase2.from("soldes").select("solde").eq("user_id", userId).maybeSingle(),
          supabase2.from("vip").select("niveau,pourcentage,invitations_requises,invitations_actuelles").eq("user_id", userId).maybeSingle(),
          supabase2.from("utilisateurs").select("*", { count: "exact", head: true }).eq("parrain_id", userId)
        ]);
        const { data: revenus } = await supabase2.from("historique_revenus").select("montant").eq("user_id", userId);
        const revenus_totaux = (revenus || []).reduce((sum, r) => sum + parseFloat(r.montant || 0), 0);
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const { data: commandes } = await supabase2.from("commandes").select("*, planinvestissement(nom, rendement_journalier, duree_jours)").eq("user_id", userId).eq("statut", "actif").gte("date_fin", today).order("date_debut", { ascending: false }).limit(3);
        const commandes_actives = (commandes || []).map((c) => ({
          ...c,
          plan_nom: c.planinvestissement?.nom,
          rendement_journalier: c.planinvestissement?.rendement_journalier,
          duree_jours: c.planinvestissement?.duree_jours,
          planinvestissement: void 0
        }));
        res.json({
          user: { ...user, solde: soldeRow?.solde || 0, revenus_totaux, nombre_filleuls: filleulsCount || 0 },
          vip: vipRow || { niveau: 0, pourcentage: 0, invitations_requises: 3, invitations_actuelles: 0 },
          commandes_actives
        });
      } catch (err) {
        console.error("Dashboard error:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/profile", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const [{ data: user }, { data: soldeRow }] = await Promise.all([
          supabase2.from("utilisateurs").select("id,nom,telephone,pays,code_parrainage,lien_parrainage,date_inscription").eq("id", userId).single(),
          supabase2.from("soldes").select("solde").eq("user_id", userId).maybeSingle()
        ]);
        res.json({ user, solde: soldeRow?.solde || 0 });
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
        const { error } = await supabase2.from("transaction_passwords").upsert({ user_id: req.user.id, password }, { onConflict: "user_id" });
        if (error) throw error;
        res.json({ success: true, message: "Mot de passe de transaction mis \xE0 jour" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/wallet", authMiddleware, async (req, res) => {
      try {
        const { data: wallets } = await supabase2.from("portefeuilles").select("*").eq("user_id", req.user.id);
        res.json({ wallets: wallets || [] });
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
        const { error } = await supabase2.from("portefeuilles").upsert({ user_id: req.user.id, nom_portefeuille, pays, methode_paiement, numero_telephone }, { onConflict: "user_id" });
        if (error) throw error;
        res.json({ success: true, message: "Portefeuille enregistr\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/photo", authMiddleware, upload.single("photo"), async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: "Aucune photo fournie" });
        const { error } = await supabase2.from("photos_profil").insert({ user_id: req.user.id, nom_fichier: req.file.filename });
        if (error) throw error;
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
    var { supabase: supabase2 } = require_db();
    var { authMiddleware } = require_auth2();
    var router = express2.Router();
    router.get("/plans", authMiddleware, async (req, res) => {
      try {
        const { data: plans, error } = await supabase2.from("planinvestissement").select("*").order("prix", { ascending: true });
        if (error) throw error;
        const result = (plans || []).map((p) => ({
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
        const { data: orders, error } = await supabase2.from("commandes").select("*, planinvestissement(nom, rendement_journalier, duree_jours, serie)").eq("user_id", req.user.id).order("date_debut", { ascending: false });
        if (error) throw error;
        const result = (orders || []).map((c) => ({
          ...c,
          plan_nom: c.planinvestissement?.nom,
          rendement_journalier: c.planinvestissement?.rendement_journalier,
          duree_jours: c.planinvestissement?.duree_jours,
          serie: c.planinvestissement?.serie,
          planinvestissement: void 0
        }));
        res.json({ orders: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/buy", authMiddleware, async (req, res) => {
      try {
        const { plan_id, transaction_password } = req.body;
        const userId = req.user.id;
        if (!plan_id) return res.status(400).json({ error: "Plan requis" });
        const { data: tp } = await supabase2.from("transaction_passwords").select("password").eq("user_id", userId).maybeSingle();
        if (!tp) return res.status(400).json({ error: "Veuillez configurer votre mot de passe de transaction" });
        if (tp.password !== transaction_password) return res.status(400).json({ error: "Mot de passe de transaction incorrect" });
        const { data: plan } = await supabase2.from("planinvestissement").select("*").eq("id", plan_id).single();
        if (!plan) return res.status(404).json({ error: "Plan introuvable" });
        const { data: soldeRow } = await supabase2.from("soldes").select("solde").eq("user_id", userId).maybeSingle();
        const solde = parseFloat(soldeRow?.solde || 0);
        if (solde < parseFloat(plan.prix)) {
          return res.status(400).json({ error: "Solde insuffisant" });
        }
        const { data: result, error } = await supabase2.rpc("buy_plan", {
          p_user_id: userId,
          p_plan_id: plan_id,
          p_tx_password: transaction_password
        });
        if (error) throw error;
        if (result?.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: `Plan "${plan.nom}" activ\xE9 avec succ\xE8s` });
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
      const { data: filleuls } = await supabase2.from("utilisateurs").select("id").eq("parrain_id", userId);
      const ids = (filleuls || []).map((f) => f.id);
      if (ids.length === 0) return 0;
      const { data: commandes } = await supabase2.from("commandes").select("user_id").in("user_id", ids);
      return new Set((commandes || []).map((c) => c.user_id)).size;
    }
    router.get("/salary", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const count = await countFilleulsInvestisseurs(userId);
        const { data: claims } = await supabase2.from("cadeaux_vip").select("niveau,statut").eq("user_id", userId);
        const claimMap = {};
        (claims || []).forEach((c) => {
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
        const { data: existing } = await supabase2.from("cadeaux_vip").select("id,statut").eq("user_id", userId).eq("niveau", niveau).maybeSingle();
        if (existing && existing.statut === "valide") {
          return res.status(400).json({ error: "Cadeau d\xE9j\xE0 re\xE7u" });
        }
        if (existing && existing.statut === "en_attente") {
          return res.status(400).json({ error: "Cadeau d\xE9j\xE0 r\xE9clam\xE9, en attente de confirmation" });
        }
        if (existing) {
          const { error } = await supabase2.from("cadeaux_vip").update({ statut: "en_attente", montant: level.cadeau, date_demande: (/* @__PURE__ */ new Date()).toISOString(), date_traitement: null }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase2.from("cadeaux_vip").insert({ user_id: userId, niveau, montant: level.cadeau, statut: "en_attente" });
          if (error) {
            if (error.code === "23505") {
              return res.status(400).json({ error: "Cadeau d\xE9j\xE0 r\xE9clam\xE9" });
            }
            throw error;
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
        const { data: history } = await supabase2.from("historique_revenus").select("*").eq("user_id", req.user.id).order("date_paiement", { ascending: false }).limit(50);
        res.json({ history: history || [] });
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
    var { supabase: supabase2 } = require_db();
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
        const { data: depots } = await supabase2.from("depots").select("*").eq("user_id", req.user.id).order("date_depot", { ascending: false }).limit(20);
        res.json({ depots: depots || [] });
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
        const { data, error } = await supabase2.from("depots").insert({
          user_id: userId,
          montant: montantNum,
          pays,
          operateur,
          numero_payeur,
          preuve_paiement: preuve_path,
          statut: "en_attente"
        }).select("id").single();
        if (error) throw error;
        res.json({
          success: true,
          message: "Demande de d\xE9p\xF4t soumise. En attente de validation.",
          depot_id: data.id
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
    var { supabase: supabase2 } = require_db();
    var { authMiddleware } = require_auth2();
    var router = express2.Router();
    router.get("/list", authMiddleware, async (req, res) => {
      try {
        const { data: retraits } = await supabase2.from("retraits").select("*").eq("user_id", req.user.id).order("date_demande", { ascending: false }).limit(20);
        res.json({ retraits: retraits || [] });
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
        const { data: tp } = await supabase2.from("transaction_passwords").select("password").eq("user_id", userId).maybeSingle();
        if (!tp) return res.status(400).json({ error: "Veuillez configurer votre mot de passe de transaction" });
        if (tp.password !== transaction_password) return res.status(400).json({ error: "Mot de passe de transaction incorrect" });
        const { data: wallet } = await supabase2.from("portefeuilles").select("*").eq("user_id", userId).maybeSingle();
        if (!wallet) return res.status(400).json({ error: "Veuillez ajouter un portefeuille de retrait" });
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const { count: activeOrders } = await supabase2.from("commandes").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("statut", "actif").gte("date_fin", today);
        if (!activeOrders || activeOrders === 0) {
          return res.status(400).json({ error: "Vous devez avoir un plan d'investissement actif pour retirer" });
        }
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
        const { count: recentCount } = await supabase2.from("retraits").select("*", { count: "exact", head: true }).eq("user_id", userId).in("statut", ["en_attente", "valide"]).gte("date_demande", yesterday);
        if (recentCount && recentCount > 0) {
          return res.status(400).json({ error: "Un seul retrait par 24h est autoris\xE9" });
        }
        const { data: soldeRow } = await supabase2.from("soldes").select("solde").eq("user_id", userId).maybeSingle();
        const solde = parseFloat(soldeRow?.solde || 0);
        const montantNum = parseFloat(montant);
        if (montantNum < 2e3) return res.status(400).json({ error: "Retrait minimum: 2000" });
        if (montantNum > solde) return res.status(400).json({ error: "Solde insuffisant" });
        const { data: result, error } = await supabase2.rpc("request_withdrawal", {
          p_user_id: userId,
          p_montant: montantNum,
          p_methode: wallet.methode_paiement,
          p_numero: wallet.numero_telephone
        });
        if (error) throw error;
        if (result?.error) return res.status(400).json({ error: result.error });
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
    var { supabase: supabase2 } = require_db();
    var { authMiddleware } = require_auth2();
    var router = express2.Router();
    router.get("/data", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const { data: lvl1 } = await supabase2.from("utilisateurs").select("id,nom,telephone,pays,date_inscription").eq("parrain_id", userId);
        const ids1 = (lvl1 || []).map((u) => u.id);
        let lvl2 = [];
        if (ids1.length > 0) {
          const { data } = await supabase2.from("utilisateurs").select("id,nom,telephone,pays,date_inscription").in("parrain_id", ids1);
          lvl2 = data || [];
        }
        const ids2 = lvl2.map((u) => u.id);
        let lvl3 = [];
        if (ids2.length > 0) {
          const { data } = await supabase2.from("utilisateurs").select("id,nom,telephone,pays,date_inscription").in("parrain_id", ids2);
          lvl3 = data || [];
        }
        const { data: revenus } = await supabase2.from("historique_revenus").select("montant").eq("user_id", userId).eq("type", "parrainage");
        const gains_parrainage = (revenus || []).reduce((sum, r) => sum + parseFloat(r.montant || 0), 0);
        const { data: userInfo } = await supabase2.from("utilisateurs").select("code_parrainage,lien_parrainage").eq("id", userId).single();
        const { data: settingsRows } = await supabase2.from("settings").select("cle,valeur").in("cle", ["commission_niveau1", "commission_niveau2", "commission_niveau3"]);
        const cmap = {};
        (settingsRows || []).forEach((s) => {
          cmap[s.cle] = s.valeur;
        });
        const commissions = {
          niveau1: cmap.commission_niveau1 || "10",
          niveau2: cmap.commission_niveau2 || "5",
          niveau3: cmap.commission_niveau3 || "2"
        };
        res.json({
          niveau1: { count: (lvl1 || []).length, filleuls: lvl1 || [] },
          niveau2: { count: lvl2.length, filleuls: lvl2 },
          niveau3: { count: lvl3.length, filleuls: lvl3 },
          gains_parrainage,
          commissions,
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
    var { supabase: supabase2 } = require_db();
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
        const [
          { count: usersCount },
          { data: depotsValides },
          { data: retraitsValides },
          { count: commandesActifCount },
          { count: depotsAttenteCount },
          { count: retraitsAttenteCount },
          { data: commandesUsersData }
        ] = await Promise.all([
          supabase2.from("utilisateurs").select("*", { count: "exact", head: true }),
          supabase2.from("depots").select("montant").eq("statut", "valide"),
          supabase2.from("retraits").select("montant").eq("statut", "valide"),
          supabase2.from("commandes").select("*", { count: "exact", head: true }).eq("statut", "actif"),
          supabase2.from("depots").select("*", { count: "exact", head: true }).eq("statut", "en_attente"),
          supabase2.from("retraits").select("*", { count: "exact", head: true }).eq("statut", "en_attente"),
          supabase2.from("commandes").select("user_id").eq("statut", "actif").gte("date_fin", today)
        ]);
        const totalDepots = (depotsValides || []).reduce((s, d) => s + parseFloat(d.montant || 0), 0);
        const totalRetraits = (retraitsValides || []).reduce((s, r) => s + parseFloat(r.montant || 0), 0);
        const usersAvecInvestissement = new Set((commandesUsersData || []).map((c) => c.user_id)).size;
        res.json({
          users: { count: usersCount || 0 },
          depots: { total: totalDepots, en_attente: depotsAttenteCount || 0 },
          retraits: { total: totalRetraits, en_attente: retraitsAttenteCount || 0 },
          commandes: { count: commandesActifCount || 0 },
          users_avec_investissement: usersAvecInvestissement
        });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/users", adminMiddleware, async (req, res) => {
      try {
        const { data: users } = await supabase2.from("utilisateurs").select("id,nom,telephone,pays,date_inscription,role, soldes(solde)").order("date_inscription", { ascending: false }).limit(100);
        const result = (users || []).map((u) => ({
          ...u,
          solde: u.soldes?.[0]?.solde || 0,
          soldes: void 0
        }));
        res.json({ users: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/users/:id/credit", adminMiddleware, async (req, res) => {
      try {
        const { montant } = req.body;
        const userId = parseInt(req.params.id);
        if (!montant || isNaN(montant)) return res.status(400).json({ error: "Montant invalide" });
        const { data: result, error } = await supabase2.rpc("credit_user", {
          p_user_id: userId,
          p_montant: parseFloat(montant)
        });
        if (error) throw error;
        if (result?.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "Cr\xE9dit effectu\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/depots", adminMiddleware, async (req, res) => {
      try {
        const { data: depots } = await supabase2.from("depots").select("*, utilisateurs(nom, telephone)").order("date_depot", { ascending: false }).limit(100);
        const result = (depots || []).map((d) => ({
          ...d,
          nom: d.utilisateurs?.nom,
          telephone: d.utilisateurs?.telephone,
          utilisateurs: void 0
        }));
        res.json({ depots: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/depots/:id/validate", adminMiddleware, async (req, res) => {
      try {
        const { data: result, error } = await supabase2.rpc("validate_depot", { p_depot_id: parseInt(req.params.id) });
        if (error) throw error;
        if (result?.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "D\xE9p\xF4t valid\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/depots/:id/reject", adminMiddleware, async (req, res) => {
      try {
        const { error } = await supabase2.from("depots").update({ statut: "rejete", date_traitement: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true, message: "D\xE9p\xF4t rejet\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/retraits", adminMiddleware, async (req, res) => {
      try {
        const { data: retraits } = await supabase2.from("retraits").select("*, utilisateurs(nom, telephone)").order("date_demande", { ascending: false }).limit(100);
        const result = (retraits || []).map((r) => ({
          ...r,
          nom: r.utilisateurs?.nom,
          telephone: r.utilisateurs?.telephone,
          utilisateurs: void 0
        }));
        res.json({ retraits: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/retraits/:id/validate", adminMiddleware, async (req, res) => {
      try {
        const { error } = await supabase2.from("retraits").update({ statut: "valide", date_traitement: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true, message: "Retrait valid\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/retraits/:id/reject", adminMiddleware, async (req, res) => {
      try {
        const { data: result, error } = await supabase2.rpc("reject_retrait", { p_retrait_id: parseInt(req.params.id) });
        if (error) throw error;
        if (result?.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "Retrait rejet\xE9, solde rembours\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/cadeaux", adminMiddleware, async (req, res) => {
      try {
        const { data: cadeaux } = await supabase2.from("cadeaux_vip").select("*, utilisateurs(nom, telephone)").order("date_demande", { ascending: false }).limit(100);
        const result = (cadeaux || []).map((c) => ({
          ...c,
          nom: c.utilisateurs?.nom,
          telephone: c.utilisateurs?.telephone,
          utilisateurs: void 0
        }));
        res.json({ cadeaux: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/cadeaux/:id/validate", adminMiddleware, async (req, res) => {
      try {
        const { data: result, error } = await supabase2.rpc("validate_cadeau_vip", { p_cadeau_id: parseInt(req.params.id) });
        if (error) throw error;
        if (result?.error) return res.status(400).json({ error: result.error });
        res.json({ success: true, message: "Cadeau valid\xE9 et cr\xE9dit\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/cadeaux/:id/reject", adminMiddleware, async (req, res) => {
      try {
        const { data, error } = await supabase2.from("cadeaux_vip").update({ statut: "rejete", date_traitement: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", req.params.id).eq("statut", "en_attente").select("id");
        if (error) throw error;
        if (!data || data.length === 0) {
          return res.status(400).json({ error: "Cadeau non trouv\xE9 ou d\xE9j\xE0 trait\xE9" });
        }
        res.json({ success: true, message: "Cadeau rejet\xE9" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/posts", adminMiddleware, async (req, res) => {
      try {
        const { data: posts } = await supabase2.from("posts").select("*, utilisateurs(nom)").order("date_creation", { ascending: false }).limit(50);
        const result = (posts || []).map((p) => ({
          ...p,
          nom: p.utilisateurs?.nom,
          utilisateurs: void 0
        }));
        res.json({ posts: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/posts/:id/:action", adminMiddleware, async (req, res) => {
      try {
        const statut = req.params.action === "validate" ? "valide" : "refuse";
        const { error } = await supabase2.from("posts").update({ statut }).eq("id", req.params.id);
        if (error) throw error;
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
        const { data, error } = await supabase2.from("settings").select("cle,valeur,description");
        if (error) {
          return res.json({ settings: { ...SETTINGS_DEFAULTS } });
        }
        const map = { ...SETTINGS_DEFAULTS };
        (data || []).forEach((s) => {
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
        const { error } = await supabase2.from("settings").upsert(
          { cle, valeur: String(valeur), date_maj: (/* @__PURE__ */ new Date()).toISOString() },
          { onConflict: "cle" }
        );
        if (error) {
          console.error("Settings upsert error:", JSON.stringify(error));
          return res.status(500).json({ error: `Erreur: ${error.message || error.code || "Table settings manquante"}` });
        }
        res.json({ success: true });
      } catch (err) {
        console.error("Settings catch:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/plans", adminMiddleware, async (req, res) => {
      try {
        const { data: plans } = await supabase2.from("planinvestissement").select("*").order("serie", { ascending: true });
        res.json({ plans: plans || [] });
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
        const { data, error } = await supabase2.from("planinvestissement").insert({ nom, prix: parseFloat(prix), duree_jours: parseInt(duree_jours), rendement_journalier: parseFloat(rendement_journalier) }).select().single();
        if (error) throw error;
        res.json({ success: true, plan: data });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/plans/:id", adminMiddleware, async (req, res) => {
      try {
        const { nom, prix, duree_jours, rendement_journalier } = req.body;
        const { error } = await supabase2.from("planinvestissement").update({ nom, prix: parseFloat(prix), duree_jours: parseInt(duree_jours), rendement_journalier: parseFloat(rendement_journalier) }).eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.delete("/plans/:id", adminMiddleware, async (req, res) => {
      try {
        const { error } = await supabase2.from("planinvestissement").delete().eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/annonces", adminMiddleware, async (req, res) => {
      try {
        const { data: annonces, error } = await supabase2.from("annonces").select("*").order("date_creation", { ascending: false });
        if (error) return res.json({ annonces: [] });
        res.json({ annonces: annonces || [] });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/annonces", adminMiddleware, upload.single("image"), async (req, res) => {
      try {
        const image = req.file ? req.file.filename : null;
        const couleur = req.body.couleur || "#22c55e";
        const actif = req.body.actif !== "false";
        const { data, error } = await supabase2.from("annonces").insert({ titre: "", contenu: "", image, couleur, actif }).select().single();
        if (error) {
          console.error("Annonce insert error:", JSON.stringify(error));
          return res.status(500).json({ error: `Erreur: ${error.message || "Erreur inconnue"}` });
        }
        res.json({ success: true, annonce: data });
      } catch (err) {
        console.error("Annonce catch:", err);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.put("/annonces/:id", adminMiddleware, async (req, res) => {
      try {
        const { actif, couleur } = req.body;
        const updates = { date_maj: (/* @__PURE__ */ new Date()).toISOString() };
        if (actif !== void 0) updates.actif = actif;
        if (couleur !== void 0) updates.couleur = couleur;
        const { error } = await supabase2.from("annonces").update(updates).eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.delete("/annonces/:id", adminMiddleware, async (req, res) => {
      try {
        const { error } = await supabase2.from("annonces").delete().eq("id", req.params.id);
        if (error) throw error;
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
    var { supabase: supabase2 } = require_db();
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
        const { data: posts } = await supabase2.from("posts").select("*, utilisateurs(nom)").eq("statut", "valide").order("date_creation", { ascending: false }).limit(20);
        const result = (posts || []).map((p) => ({
          ...p,
          nom: p.utilisateurs?.nom,
          utilisateurs: void 0
        }));
        res.json({ posts: result });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
      try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Message requis" });
        const image = req.file ? req.file.filename : "";
        const { error } = await supabase2.from("posts").insert({ user_id: req.user.id, message, image, statut: "en_attente" });
        if (error) throw error;
        res.json({ success: true, message: "Post soumis, en attente de validation" });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/spin", authMiddleware, async (req, res) => {
      try {
        const { data: user } = await supabase2.from("utilisateurs").select("last_spin_time").eq("id", req.user.id).single();
        const lastSpin = user?.last_spin_time;
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
        const { data: user } = await supabase2.from("utilisateurs").select("last_spin_time").eq("id", userId).single();
        if (user?.last_spin_time) {
          const elapsed = (Date.now() - new Date(user.last_spin_time).getTime()) / 1e3;
          if (elapsed < 48 * 3600) {
            return res.status(400).json({ error: "Vous devez attendre 48h entre chaque spin" });
          }
        }
        const { data: result, error } = await supabase2.rpc("spin_wheel", { p_user_id: userId });
        if (error) throw error;
        if (result?.error) return res.status(400).json({ error: result.error });
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
    var { supabase: supabase2 } = require_db();
    var router = express2.Router();
    router.get("/", async (req, res) => {
      try {
        const { data: annonces } = await supabase2.from("annonces").select("id,titre,contenu,image,couleur,date_creation").eq("actif", true).order("date_creation", { ascending: false }).limit(10);
        res.json({ annonces: annonces || [] });
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
    var { supabase: supabase2 } = require_db();
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
          plan_nom: c.planinvestissement?.nom || null,
          revenu_journalier: parseFloat(c.revenu_journalier || 0),
          date_fin: c.date_fin
        }
      };
    }
    router.get("/", authMiddleware, async (req, res) => {
      try {
        const userId = req.user.id;
        const [depotsRes, retraitsRes, commandesRes, revenusRes] = await Promise.all([
          supabase2.from("depots").select("*").eq("user_id", userId),
          supabase2.from("retraits").select("*").eq("user_id", userId),
          supabase2.from("commandes").select("*, planinvestissement(nom)").eq("user_id", userId),
          supabase2.from("historique_revenus").select("*").eq("user_id", userId)
        ]);
        const transactions = [
          ...(depotsRes.data || []).map(mapDepot),
          ...(retraitsRes.data || []).map(mapRetrait),
          ...(commandesRes.data || []).map(mapCommande),
          ...(revenusRes.data || []).map(mapRevenu)
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json({ transactions });
      } catch (err) {
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    router.get("/admin", adminMiddleware, async (req, res) => {
      try {
        const [depotsRes, retraitsRes, commandesRes, revenusRes, usersRes] = await Promise.all([
          supabase2.from("depots").select("*"),
          supabase2.from("retraits").select("*"),
          supabase2.from("commandes").select("*, planinvestissement(nom)"),
          supabase2.from("historique_revenus").select("*"),
          supabase2.from("utilisateurs").select("id, nom, telephone")
        ]);
        const userMap = {};
        for (const u of usersRes.data || []) userMap[u.id] = u;
        const attach = (tx, userId) => ({
          ...tx,
          user: userMap[userId] ? { nom: userMap[userId].nom, telephone: userMap[userId].telephone } : null
        });
        const transactions = [
          ...(depotsRes.data || []).map((d) => attach(mapDepot(d), d.user_id)),
          ...(retraitsRes.data || []).map((r) => attach(mapRetrait(r), r.user_id)),
          ...(commandesRes.data || []).map((c) => attach(mapCommande(c), c.user_id)),
          ...(revenusRes.data || []).map((r) => attach(mapRevenu(r), r.user_id))
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
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
var express = require("express");
var cors = require("cors");
var helmet = require("helmet");
var morgan = require("morgan");
var { supabase } = require_db();
var { UPLOADS_DIR, CLIENT_DIST } = require_config();
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
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`AFRILAND INVEST server running on port ${PORT}`);
  try {
    const { count } = await supabase.from("utilisateurs").select("*", { count: "exact", head: true });
    console.log(`\u2705 Supabase connect\xE9 \u2014 ${count || 0} utilisateur(s) en base`);
  } catch (err) {
    console.error("\u274C Erreur v\xE9rification Supabase:", err.message);
  }
});
