---
name: AFRILAND INVEST standalone app
description: Build/run conventions for the standalone afriland-invest investment platform (not a Replit artifact)
---

# AFRILAND INVEST (brand: GIFETAL PRO)

Standalone Express + React/Vite investment app at `afriland-invest/` — deliberately NOT a Replit artifact (deploys to Plesk via GitHub). User-facing brand name is **GIFETAL PRO** (note the spelling: GIF-E-TAL); the directory and internal cookie names (`giftal_ref`, legacy `afriland_ref`) and JWT fallback strings keep older names intentionally — do not rename internals.

- **Run**: workflow `AFRILAND INVEST` → `cd afriland-invest && node server/index.js`, port 3000.
- **After ANY client/ change**: must `cd afriland-invest/client && npm run build` THEN restart the `AFRILAND INVEST` workflow. `client/dist/` is committed to git (Plesk serves the prebuilt bundle — no build on Plesk; user just Pull → Deploy Now → Restart).
- **Gotcha — committing client/dist**: the monorepo ROOT `.gitignore` ignores `dist` broadly, which silently keeps `afriland-invest/client/dist` untracked. `afriland-invest/.gitignore` re-includes it with `!client/dist/` + `!client/dist/**`. If a build seems missing from a push, verify `git status` shows `client/dist` as tracked/untracked, not ignored.
- **Deploy = user pushes manually, Plesk does NOT build**: user explicitly does NOT want the agent/CI to push to GitHub on his behalf — HE pushes himself. So there is NO GitHub Action and NO auto-push. The agent just keeps `client/dist` rebuilt + committed; user pushes, then Plesk Pull → Deploy Now → Restart. (A `.github/workflows/build-client.yml` was added then removed for this reason.)
- **GitHub OAuth push rejects workflow files**: pushing via Replit's GitHub OAuth (no `workflow` scope) is rejected if ANY pushed commit creates/updates `.github/workflows/*`. Even a later removal commit fails because the earlier add-commit is still in the push range. Fix the user ran: `git reset --soft origin/main && git rm -r --cached .github && rm -rf .github && commit && push` (squashes the offending commit out). Lesson: don't commit `.github/workflows/*` for this repo.
- **Plesk deploy gotchas (host = gifetalpro.site, Passenger, Node 21)**:
  - Repo pushed = whole monorepo, so app lives at `/httpdocs/afriland-invest/`. Plesk **Application Root** must be `/httpdocs/afriland-invest` (not `/httpdocs`), startup file `server/index.js`. Document Root can stay `/httpdocs` (Express serves client/dist itself) or ideally `/httpdocs/afriland-invest/client/dist`. Document Root is edited in Hosting Settings, not the Node.js panel; Application Root is edited by clicking the path text in the Node.js panel.
  - `.env` is gitignored → never reaches Plesk → `server/db.js` does `process.exit(1)` if SUPABASE_URL/SERVICE_KEY missing → app crashes. **Plesk "Custom environment variables" do NOT reliably reach the Node process** (confirmed: running `npm start` still showed the missing-env error even with them set). Fix: create a real `.env` file MANUALLY via Plesk File Manager at app root `/httpdocs/afriland-invest/.env` (one `KEY=value` per line, no quotes/spaces, each long key on one line). Vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, JWT_SECRET, SESSION_SECRET. Do NOT set PORT (Passenger provides it). `.env` at app root is NOT under document root (`client/dist`) so it's not web-exposed.
  - `server/index.js` loads dotenv via `require('dotenv').config({ path: path.join(__dirname, '..', '.env') })` (cwd-independent) so the `.env` is found regardless of how Passenger sets cwd. Safe on Replit (Replit injects secrets as real env vars; dotenv won't override or throw if file absent).
  - **Plesk runs Node 21 (no native global WebSocket; that landed in Node 22)**. `@supabase/supabase-js` realtime throws `Node.js 21 detected without native WebSocket support` at `createClient`. Fix: `ws` is a dependency and `server/db.js` polyfills `globalThis.WebSocket = require('ws')` only when undefined (guarded → no-op on Replit Node 24). After this dep was added, user must run Plesk **NPM install** post-pull so `ws` lands in node_modules.
  - **Plesk "Run Node.js commands" tab auto-prefixes `npm`** → typing `node server/index.js` fails ("Unknown command: node"); type just `start` (→ `npm start`) to test. Success output: `AFRILAND INVEST server running on port 3000` + `✅ Supabase connecté`.
  - **package-lock.json poisoned with Replit registry**: committed `afriland-invest/package-lock.json` `resolved` URLs point to `http://package-firewall.replit.local/npm/...` (Replit's npm proxy) → `npm install` on Plesk fails with `ENOTFOUND package-firewall.replit.local`. Fix: `sed -i 's#http://package-firewall.replit.local/npm/#https://registry.npmjs.org/#g' package-lock.json` (integrity sha512 hashes are content-based, stay valid). Re-running `npm install` inside Replit re-poisons it. Client lockfile doesn't matter (Plesk never builds client).
- **Agent sandbox blocks git internals**: cannot `git config`, nor `rm` anything under `.git/` or `.githooks/` from the main agent (guard blocks it, leaves stale `.git/config.lock` which is harmless — only blocks config writes, not commits). Set git config via the `prepare` script / fresh installs, not directly.
- Cannot screenshot via `app_preview` (not a registered artifact) — verify with `curl localhost:3000`.
- **DB**: Supabase via `@supabase/supabase-js` only (URL + anon + service key), NO pg driver. Client exported from `server/db.js` as `{ supabase, supabasePublic }`. SQL changes are applied by the user manually in Supabase SQL Editor — provide SQL in French.

## Atomic credit RPCs (Supabase plpgsql)
- One-time payout RPCs (`validate_depot`, `validate_cadeau_vip`, etc.) MUST flip the status with a single conditional `UPDATE ... WHERE id=? AND statut='en_attente' RETURNING * INTO row` and bail on `NOT FOUND` — NOT a `SELECT`-then-`UPDATE`. **Why**: two concurrent admin validations both pass a prior SELECT and double-credit. The conditional UPDATE lets only one transaction win.
- Mirror the same guard in the Node reject/update path: add `.eq('statut','en_attente')` + `.select()` and treat empty result as "déjà traité", so a validated payout can't later be flipped to rejete.
- Claim/insert paths with a `UNIQUE(user_id, niveau)` constraint should catch PG error `code === '23505'` and return a friendly 400 instead of a 500 on the parallel-claim race.

## VIP cadeaux system (current model — replaced daily salary)
- VIP is a referral-gift model, NOT a daily salary. Source of truth = `VIP_LEVELS` in `server/routes/investment.js`: VIP1=70→5000, VIP2=100→8000, VIP3=200→10000 FCFA. No VIP4/5.
- "Filleul investisseur" = direct referral (`utilisateurs.parrain_id=userId`) with ≥1 row in `commandes` (any statut). Counted in `countFilleulsInvestisseurs`.
- Flow: user claims (`POST /investment/claim-gift`) → row in `cadeaux_vip` statut `en_attente` → admin confirms (`validate_cadeau_vip` RPC) → credits solde + logs `historique_revenus` type `cadeau_vip`. The legacy `vip` table is vestigial/ignored (auth.js still creates a row at register — harmless).

## Theming
- All colors centralized in `client/src/styles/global.css` `:root`. Variable names are legacy (`--green-primary`, `--blue-primary`) but remapped to the GIFETAL PRO palette: primary dark blue `#1B2A6B`, secondary gold `#F5C518`, cream `#F5F1E8`, white bg, text `#1B2A6B`.
- **Why legacy names kept**: pages use heavy inline styles referencing `var(--green-primary)` etc.; remapping the variable values rebrands without touching every component.
- Real red `#E30613` is kept ONLY for error states. `--success` stays green so "validé/actif" badges don't read as error.
- Logo is a single shared `Logo.jsx` rendering imported PNG at `client/src/assets/logo.png` (+ `client/public/favicon.png`) — swapping those two files propagates everywhere.
