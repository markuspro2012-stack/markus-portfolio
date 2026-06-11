/* ============================================================
   MARKUS PRO — checkout.js
   Steps: 0 (mode choice) → 1 (delivery) → 2 (payment) → 3 (confirmed)
   Payment: Stripe Payment Element (test mode)
============================================================ */

(function () {
  'use strict';

  var delivery      = {};
  var currentStep   = 0;
  var stripe        = null;
  var stripeElems   = null;

  /* ── Session helper ─────────────────────────────────────── */

  function getSession(cb) {
    if (window.sb) {
      window.sb.auth.getSession().then(function (r) {
        cb(r.data && r.data.session ? r.data.session : null);
      }).catch(function () { cb(null); });
    } else {
      cb(null);
    }
  }

  /* ── Navigation ─────────────────────────────────────────── */

  function goToStep(n) {
    currentStep = n;
    var progress = document.getElementById('checkout-progress');
    if (progress) progress.style.display = (n === 0) ? 'none' : 'flex';

    [0, 1, 2, 3].forEach(function (i) {
      var s = document.getElementById('step-' + i);
      if (s) s.classList.toggle('is-active', i === n);
    });

    [1, 2, 3].forEach(function (i) {
      var p = document.querySelector('.progress-step[data-step="' + i + '"]');
      if (!p) return;
      p.classList.toggle('is-active', i === n);
      p.classList.toggle('is-done',   i < n);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Order summary ──────────────────────────────────────── */

  function renderSummary() {
    var items     = Cart.getItems();
    var container = document.getElementById('order-items');
    if (!container) return;

    container.innerHTML = items.map(function (item) {
      return '<div class="summary-item">'
        + '<img src="' + item.image + '" alt="' + item.name + '" loading="lazy">'
        + '<div class="summary-item-info">'
          + '<span class="summary-item-name">' + item.name + '</span>'
          + '<span class="summary-item-meta">Size ' + item.size + '&nbsp;&nbsp;×&nbsp;&nbsp;' + item.qty + '</span>'
        + '</div>'
        + '<span class="summary-item-price">' + formatPrice(item.price * item.qty) + '</span>'
      + '</div>';
    }).join('');

    var subtotal = Cart.getSubtotal();
    var el;
    el = document.getElementById('summary-subtotal'); if (el) el.textContent = formatPrice(subtotal);
    el = document.getElementById('summary-total');    if (el) el.textContent = formatPrice(subtotal);
  }

  /* ── Delivery recap ─────────────────────────────────────── */

  function renderDeliveryRecap() {
    var el = document.getElementById('delivery-recap');
    if (!el) return;
    el.innerHTML = '<strong>' + delivery.name + '</strong>'
      + (delivery.address ? delivery.address + ', ' : '') + (delivery.city || '') + ' ' + (delivery.zip || '')
      + '<br>' + delivery.email
      + (delivery.phone ? ' · ' + delivery.phone : '');
  }

  /* ── Step 0: mode choice ────────────────────────────────── */

  function initStep0() {
    var guestBtn  = document.getElementById('mode-guest');
    var signinBtn = document.getElementById('mode-signin');

    if (guestBtn) {
      guestBtn.addEventListener('click', function () { goToStep(1); });
    }
    if (signinBtn) {
      signinBtn.addEventListener('click', function () {
        try { sessionStorage.setItem('mp_checkout_return', '1'); } catch(e) {}
        window.location.href = 'login.html?next=checkout.html';
      });
    }
  }

  /* ── Step 1: delivery form ──────────────────────────────── */

  function initStep1() {
    var form = document.getElementById('form-delivery');
    if (!form) return;

    /* Pre-fill for logged-in users */
    getSession(function (session) {
      if (!session) return;
      var u        = session.user;
      var fullName = (u.user_metadata && u.user_metadata.full_name) || '';
      var parts    = fullName.trim().split(/\s+/);
      var fnEl     = form.querySelector('[name="firstname"]');
      var lnEl     = form.querySelector('[name="lastname"]');
      var emEl     = form.querySelector('[name="email"]');
      if (fnEl && !fnEl.value) fnEl.value = parts[0] || '';
      if (lnEl && !lnEl.value) lnEl.value = parts.slice(1).join(' ') || '';
      if (emEl && !emEl.value) {
        emEl.value    = u.email || '';
        emEl.readOnly = true;
      }
    });

    var backBtn = document.getElementById('back-to-mode');
    if (backBtn) backBtn.addEventListener('click', function () { goToStep(0); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      function val(n) {
        var el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : '';
      }

      var firstName = val('firstname');
      var lastName  = val('lastname');
      if (!firstName || !lastName) {
        showToast('Please enter your first and last name.', '✕');
        return;
      }
      if (!val('email')) {
        showToast('Please enter your email address.', '✕');
        return;
      }
      if (!val('address') || !val('city') || !val('zip') || !val('country')) {
        showToast('Please fill in all shipping address fields.', '✕');
        return;
      }
      var consentEl = form.querySelector('[name="consent"]');
      if (consentEl && !consentEl.checked) {
        showToast('Please agree to the Terms of Service.', '✕');
        return;
      }

      delivery = {
        firstName: firstName,
        lastName:  lastName,
        name:      firstName + ' ' + lastName,
        email:     val('email'),
        phone:     val('phone'),
        address:   val('address'),
        city:      val('city'),
        zip:       val('zip'),
        country:   val('country'),
        company:   val('company'),
        vatNumber: val('vat')
      };

      /* Persist delivery + cart items so Stripe redirect can recover them */
      try {
        sessionStorage.setItem('mp_delivery', JSON.stringify(delivery));
        sessionStorage.setItem('mp_checkout_items', JSON.stringify(Cart.getItems()));
      } catch(e) {}

      renderSummary();
      renderDeliveryRecap();
      goToStep(2);
      loadStripePayment();
    });
  }

  /* ── Stripe: load Payment Element ──────────────────────── */

  function loadStripePayment() {
    var cfg = window.__MP_CONFIG || {};
    var key = cfg.stripeKey;

    var container = document.getElementById('payment-element');

    if (!key) {
      if (container) container.innerHTML = '<p class="payment-error-inline">Payment not configured. Contact support.</p>';
      return;
    }

    if (container) container.innerHTML = '<p class="payment-loading">Loading payment form…</p>';

    var total      = Cart.getSubtotal();
    var amountCents = Math.round(total * 100);

    fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountCents, currency: 'eur', email: delivery.email })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error);

      if (!stripe) stripe = window.Stripe(key);

      stripeElems = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary:      '#00bfff',
            fontFamily:        '"DM Sans", "Inter", system-ui, sans-serif',
            borderRadius:      '6px',
            spacingUnit:       '4px'
          }
        }
      });

      if (container) container.innerHTML = '';
      var paymentEl = stripeElems.create('payment');
      paymentEl.mount('#payment-element');

      /* Enable pay button once element is ready */
      paymentEl.on('ready', function () {
        var btn = document.getElementById('btn-pay');
        if (btn) btn.disabled = false;
      });
    })
    .catch(function (err) {
      if (container) container.innerHTML = '<p class="payment-error-inline">Could not load payment: ' + err.message + '</p>';
    });
  }

  /* ── Step 2: payment form ───────────────────────────────── */

  function initStep2() {
    var form    = document.getElementById('form-payment');
    var backBtn = document.getElementById('back-to-delivery');
    var editBtn = document.getElementById('edit-delivery');
    var errEl   = document.getElementById('payment-error');

    if (backBtn) backBtn.addEventListener('click', function () { goToStep(1); });
    if (editBtn) editBtn.addEventListener('click', function () { goToStep(1); });

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!stripe || !stripeElems) {
        showToast('Payment is still loading. Please wait a moment.', '✕');
        return;
      }

      var submitBtn = document.getElementById('btn-pay');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Processing…'; }
      if (errEl) errEl.style.display = 'none';

      stripe.confirmPayment({
        elements: stripeElems,
        confirmParams: {
          return_url: window.location.origin + '/checkout.html'
        }
      })
      .then(function (result) {
        /* Only reached on immediate errors (redirect did not happen) */
        if (result.error) {
          if (errEl) {
            errEl.textContent  = result.error.message;
            errEl.style.display = 'block';
          }
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Pay Now →'; }
        }
      });
    });
  }

  /* ── Handle Stripe redirect return ─────────────────────── */

  function handleStripeReturn(params) {
    var status = params.get('redirect_status');

    /* Restore delivery data */
    try { delivery = JSON.parse(sessionStorage.getItem('mp_delivery') || '{}'); } catch(e) {}
    var items = [];
    try { items = JSON.parse(sessionStorage.getItem('mp_checkout_items') || '[]'); } catch(e) {}

    /* Clean the URL immediately */
    window.history.replaceState({}, '', window.location.pathname);

    initStep0();
    initStep1();
    initStep2();

    if (status !== 'succeeded') {
      renderSummary();
      renderDeliveryRecap();
      goToStep(2);
      loadStripePayment();
      var errEl = document.getElementById('payment-error');
      if (errEl) {
        errEl.textContent  = 'Payment was not completed. Please try again.';
        errEl.style.display = 'block';
      }
      return;
    }

    /* Payment succeeded — create order */
    if (!delivery.email || !items.length) {
      window.location.replace('catalog.html');
      return;
    }

    getSession(function (session) {
      var userId = session ? session.user.id : null;

      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: delivery.firstName,
          lastName:  delivery.lastName,
          name:      delivery.name,
          email:     delivery.email,
          phone:     delivery.phone,
          address:   delivery.address,
          city:      delivery.city,
          zip:       delivery.zip,
          country:   delivery.country,
          company:   delivery.company,
          vatNumber: delivery.vatNumber,
          items:     items,
          userId:    userId
        })
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);

        /* Clear cart + session data */
        storage.remove('mp_cart');
        syncCartBadge();
        try {
          sessionStorage.removeItem('mp_delivery');
          sessionStorage.removeItem('mp_checkout_items');
        } catch(e) {}

        /* Populate confirmation */
        var el;
        el = document.getElementById('conf-order-num'); if (el) el.textContent = data.orderId;
        el = document.getElementById('conf-email');     if (el) el.textContent = delivery.email;
        el = document.getElementById('conf-total');     if (el) el.textContent = formatPrice(data.total);
        el = document.getElementById('conf-account-link');
        if (el) el.style.display = userId ? 'inline' : 'none';

        goToStep(3);
      })
      .catch(function (err) {
        showToast('Order creation failed: ' + err.message, '✕');
        setTimeout(function () { window.location.replace('catalog.html'); }, 3000);
      });
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    /* Check for Stripe redirect return first */
    var params         = new URLSearchParams(window.location.search);
    var redirectStatus = params.get('redirect_status');
    if (redirectStatus) {
      handleStripeReturn(params);
      return;
    }

    /* Empty cart → back to catalog */
    if (Cart.getTotalQty() === 0) {
      window.location.replace('catalog.html');
      return;
    }

    initStep0();
    initStep1();
    initStep2();

    /* Disable pay button until Stripe element is ready */
    var payBtn = document.getElementById('btn-pay');
    if (payBtn) payBtn.disabled = true;

    getSession(function (session) {
      var returning = false;
      try { returning = !!sessionStorage.getItem('mp_checkout_return'); } catch(e) {}
      if (returning) {
        try { sessionStorage.removeItem('mp_checkout_return'); } catch(e) {}
      }

      if (session) {
        goToStep(1);
      } else {
        goToStep(0);
      }
    });
  });

})();
