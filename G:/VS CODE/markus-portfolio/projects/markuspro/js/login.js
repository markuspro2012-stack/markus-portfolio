/* ============================================================
   MARKUS PRO — login.js
   Auth: Supabase Auth (primary) with localStorage fallback.
   Requires: utils.js (storage, showToast)
============================================================ */

(function () {
  'use strict';

  var SOCIAL_PROVIDERS = {
    google: { name: 'Google', label: 'Google Account' },
    apple:  { name: 'Apple',  label: 'Apple ID' }
  };

  /* ── Helpers ─────────────────────────────────────────────── */

  var useSupabase = function () { return !!(window.sb); };

  function setUser(user) {
    storage.set('mp_user', user);
  }

  function redirectHome() {
    var next = new URLSearchParams(window.location.search).get('next');
    var dest = (next && /^[a-z0-9\-]+\.html$/i.test(next)) ? next : 'index.html';
    setTimeout(function () { window.location.replace(dest); }, 900);
  }

  /* ── Already logged in ───────────────────────────────────── */

  function checkLoggedIn() {
    if (useSupabase()) {
      window.sb.auth.getSession().then(function (result) {
        if (result.data && result.data.session) {
          window.location.replace('index.html');
        }
      });
      return;
    }
    var user = storage.get('mp_user', null);
    if (user) window.location.replace('index.html');
  }

  /* ── Tab switching ───────────────────────────────────────── */

  function showPanel(panelId) {
    ['panel-login', 'panel-register'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = (id === panelId ? 'block' : 'none');
    });
    ['tab-login', 'tab-register'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var active = (id === 'tab-login' && panelId === 'panel-login')
                || (id === 'tab-register' && panelId === 'panel-register');
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-selected', String(active));
    });
  }

  /* ── Password toggle ─────────────────────────────────────── */

  function initPasswordToggle(inputId, btnId) {
    var input = document.getElementById(inputId);
    var btn   = document.getElementById(btnId);
    if (!input || !btn) return;
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /* ── Password strength ───────────────────────────────────── */

  function initStrengthMeter() {
    var input = document.getElementById('reg-password');
    var bars  = [1, 2, 3].map(function (i) { return document.getElementById('strength-bar-' + i); });
    if (!input || bars.some(function (b) { return !b; })) return;

    input.addEventListener('input', function () {
      var v = input.value, score = 0;
      if (v.length >= 8) score++;
      if (/[A-Z]/.test(v) && /[0-9]/.test(v)) score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      var cls = ['', 'active-weak', 'active-medium', 'active-strong'];
      bars.forEach(function (bar, i) {
        bar.className = 'strength-bar';
        if (score > 0 && i < score) bar.classList.add(cls[score]);
      });
    });
  }

  /* ── Social auth ─────────────────────────────────────────── */

  function socialLogin(provider) {
    var cfg = SOCIAL_PROVIDERS[provider];
    if (!cfg) return;

    var allBtns = document.querySelectorAll('.btn-social');
    allBtns.forEach(function (b) {
      b.disabled = true;
      if (b.dataset.provider === provider) {
        b.dataset.origText = b.textContent.trim();
        b.textContent = 'Connecting…';
      }
    });

    if (useSupabase()) {
      window.sb.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin + '/account.html' }
      }).then(function (result) {
        if (result.error) {
          showToast('Sign-in failed: ' + result.error.message, '✕');
          allBtns.forEach(function (b) {
            b.disabled = false;
            if (b.dataset.origText) b.textContent = b.dataset.origText;
          });
        }
        /* On success, Supabase redirects the browser automatically */
      });
      return;
    }

    /* localStorage fallback */
    setTimeout(function () {
      var username  = 'User_' + Math.floor(Math.random() * 9000 + 1000);
      var mockEmail = username.toLowerCase() + '@' + (provider === 'google' ? 'gmail.com' : 'icloud.com');
      setUser({ name: username, email: mockEmail, provider: cfg.name });
      showToast('Signed in via ' + cfg.label, '✓');
      redirectHome();
    }, 1100);
  }

  function initSocialButtons() {
    document.querySelectorAll('.btn-social').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = btn.dataset.provider;
        if (p) socialLogin(p);
      });
    });
  }

  /* ── Login form ──────────────────────────────────────────── */

  function initLoginForm() {
    var form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email    = (document.getElementById('login-email')    || {}).value || '';
      var password = (document.getElementById('login-password') || {}).value || '';

      if (!email || !password) { showToast('Please fill in all fields', '⚠'); return; }

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in…'; }

      if (useSupabase()) {
        window.sb.auth.signInWithPassword({ email: email, password: password })
          .then(function (result) {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
            if (result.error) { showToast(result.error.message, '✕'); return; }
            var u = result.data.user;
            setUser({ name: u.user_metadata.full_name || email.split('@')[0], email: u.email });
            showToast('Welcome back!', '✓');
            redirectHome();
          });
        return;
      }

      /* localStorage fallback */
      var users = storage.get('mp_users', []);
      var user  = users.find(function (u) { return u.email === email; });
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
      if (!user || user.password !== password) { showToast('Invalid email or password', '✕'); return; }
      setUser({ name: user.name, email: user.email });
      showToast('Welcome back, ' + user.name + '!', '✓');
      redirectHome();
    });
  }

  /* ── Register form ───────────────────────────────────────── */

  function initRegisterForm() {
    var form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name     = (document.getElementById('reg-name')     || {}).value || '';
      var email    = (document.getElementById('reg-email')    || {}).value || '';
      var password = (document.getElementById('reg-password') || {}).value || '';
      var terms    = document.getElementById('terms-check');

      if (!name || !email || !password) { showToast('Please fill in all fields', '⚠'); return; }
      if (password.length < 8) { showToast('Password must be at least 8 characters', '⚠'); return; }
      if (terms && !terms.checked) { showToast('Please accept the Terms of Service', '⚠'); return; }

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating…'; }

      if (useSupabase()) {
        window.sb.auth.signUp({
          email: email,
          password: password,
          options: { data: { full_name: name } }
        }).then(function (result) {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account'; }
          if (result.error) { showToast(result.error.message, '✕'); return; }
          if (result.data.user && !result.data.session) {
            /* Email confirmation required */
            showToast('Check your email to confirm your account', '✓');
            return;
          }
          setUser({ name: name, email: email });
          showToast('Welcome, ' + name + '!', '✓');
          redirectHome();
        });
        return;
      }

      /* localStorage fallback */
      var users = storage.get('mp_users', []);
      if (users.find(function (u) { return u.email === email; })) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account'; }
        showToast('An account with this email already exists', '⚠');
        return;
      }
      users.push({ name: name, email: email, password: password });
      storage.set('mp_users', users);
      setUser({ name: name, email: email });
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account'; }
      showToast('Welcome, ' + name + '!', '✓');
      redirectHome();
    });
  }

  /* ── Forgot password ─────────────────────────────────────── */

  function initForgotPassword() {
    var btn = document.getElementById('forgot-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var email = (document.getElementById('login-email') || {}).value || '';
      if (!email) { showToast('Enter your email first', '⚠'); return; }
      if (useSupabase()) {
        window.sb.auth.resetPasswordForEmail(email).then(function () {
          showToast('Reset link sent to ' + email, '✓');
        });
        return;
      }
      showToast('Reset link sent to ' + email, '✓');
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    var tabLogin    = document.getElementById('tab-login');
    var tabRegister = document.getElementById('tab-register');
    var toRegister  = document.getElementById('switch-to-register');
    var toLogin     = document.getElementById('switch-to-login');

    if (tabLogin)    tabLogin.addEventListener('click', function () { showPanel('panel-login'); });
    if (tabRegister) tabRegister.addEventListener('click', function () { showPanel('panel-register'); });
    if (toRegister)  toRegister.addEventListener('click', function (e) { e.preventDefault(); showPanel('panel-register'); });
    if (toLogin)     toLogin.addEventListener('click', function (e) { e.preventDefault(); showPanel('panel-login'); });

    initPasswordToggle('login-password', 'login-pw-toggle');
    initPasswordToggle('reg-password', 'reg-pw-toggle');
    initStrengthMeter();
    initLoginForm();
    initRegisterForm();
    initSocialButtons();
    initForgotPassword();
    checkLoggedIn();
  });

})();
