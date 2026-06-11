/* ============================================================
   MARKUS PRO — Supabase client
   Injects the Supabase JS SDK and exposes window.sb
   Loaded before all other JS files that need the DB.
============================================================ */

(function () {
  /* Values injected by Netlify at build time via env vars,
     or read from window.__MP_CONFIG set in a <script> tag.  */
  var cfg = window.__MP_CONFIG || {};
  var URL  = cfg.supabaseUrl  || '';
  var KEY  = cfg.supabaseKey  || '';

  if (!URL || !KEY) {
    console.warn('[MP] Supabase config missing — running in localStorage mode.');
    window.sb = null;
    return;
  }

  /* Supabase CDN is loaded via <script> in HTML head.
     supabase.createClient is the global from the CDN bundle. */
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('[MP] Supabase SDK not loaded.');
    window.sb = null;
    return;
  }

  window.sb = supabase.createClient(URL, KEY);
})();
