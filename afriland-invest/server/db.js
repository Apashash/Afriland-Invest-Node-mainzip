const { createClient } = require('@supabase/supabase-js');

// Node < 22 n'a pas de WebSocket natif (ex: Plesk sous Node 21).
// supabase-js (realtime) en a besoin → on fournit "ws" en repli.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis');
  process.exit(1);
}

// Client admin (service role) — utilisé côté serveur uniquement
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Client public (anon) — pour les opérations publiques
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Test de connexion au démarrage
supabase.from('utilisateurs').select('id', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('❌ Erreur connexion Supabase:', error.message);
      console.error('   Vérifiez SUPABASE_URL et SUPABASE_SERVICE_KEY');
    } else {
      console.log(`✅ Supabase connecté — ${count ?? 0} utilisateur(s) en base`);
    }
  });

module.exports = { supabase, supabasePublic };
