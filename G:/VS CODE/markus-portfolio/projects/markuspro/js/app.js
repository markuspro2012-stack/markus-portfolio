/* ============================================================
   MARKUS PRO — app.js
   Shared init: cart drawer, nav badge sync, product card builder,
   page-specific content injection (homepage featured/arrivals).
============================================================ */

/* ── Cart state ─────────────────────────────────────────── */

var Cart = (function () {
  var KEY = 'mp_cart';

  function load() { return storage.get(KEY, []); }
  function save(items) { storage.set(KEY, items); }

  function getItems() { return load(); }

  function getTotalQty() {
    return load().reduce(function (sum, i) { return sum + i.qty; }, 0);
  }

  function getSubtotal() {
    return load().reduce(function (sum, i) { return sum + i.price * i.qty; }, 0);
  }

  function addItem(product, size, qty) {
    var items = load();
    var key = product.id + ':' + size;
    var existing = items.find(function (i) { return i.key === key; });
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        key: key,
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: size,
        qty: qty
      });
    }
    save(items);
    syncCartBadge();
    renderCartDrawer();
  }

  function removeItem(key) {
    var items = load().filter(function (i) { return i.key !== key; });
    save(items);
    syncCartBadge();
    renderCartDrawer();
  }

  function updateQty(key, delta) {
    var items = load();
    var item = items.find(function (i) { return i.key === key; });
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    save(items);
    syncCartBadge();
    renderCartDrawer();
  }

  return { getItems, getTotalQty, getSubtotal, addItem, removeItem, updateQty };
})();

/* ── Wishlist state ─────────────────────────────────────── */

var Wishlist = (function () {
  var KEY = 'mp_wishlist';

  function load() { return storage.get(KEY, []); }
  function save(ids) { storage.set(KEY, ids); }

  function getIds() { return load(); }
  function has(id) { return load().indexOf(Number(id)) !== -1; }

  function toggle(id) {
    var ids = load();
    var idx = ids.indexOf(Number(id));
    if (idx === -1) {
      ids.push(Number(id));
    } else {
      ids.splice(idx, 1);
    }
    save(ids);
    syncWishBadge();
    return idx === -1; // true = added
  }

  function count() { return load().length; }

  return { getIds, has, toggle, count };
})();

/* ── Badge sync ─────────────────────────────────────────── */

function syncCartBadge() {
  var qty = Cart.getTotalQty();
  document.querySelectorAll('#cart-count').forEach(function (el) {
    var wasVisible = el.style.opacity === '1';
    el.textContent = formatCount(qty);
    el.style.opacity = qty > 0 ? '1' : '0';
    if (qty > 0 && !wasVisible) {
      el.classList.remove('badge-pop');
      void el.offsetWidth;
      el.classList.add('badge-pop');
    }
  });
}

function syncWishBadge() {
  var n = Wishlist.count();
  document.querySelectorAll('#wish-count').forEach(function (el) {
    var wasVisible = el.style.opacity === '1';
    el.textContent = formatCount(n);
    el.style.opacity = n > 0 ? '1' : '0';
    if (n > 0 && !wasVisible) {
      el.classList.remove('badge-pop');
      void el.offsetWidth;
      el.classList.add('badge-pop');
    }
  });
}

/* ── Scroll-to-top button ───────────────────────────────── */

function initScrollTop() {
  var btn = document.createElement('button');
  btn.className = 'scroll-top-btn';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10L8 6 4 10"/></svg>';
  document.body.appendChild(btn);

  window.addEventListener('scroll', function() {
    btn.classList.toggle('is-visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ── Product card builder ───────────────────────────────── */

var _cardIndex = 0;

function resetCardIndex() { _cardIndex = 0; }

function buildProductCard(product) {
  var isWished = Wishlist.has(product.id);
  var badgeHTML = '';
  if (product.tag === 'new') badgeHTML = '<span class="badge badge-new">New</span>';
  else if (product.tag === 'hot') badgeHTML = '<span class="badge badge-hot">Hot</span>';
  else if (product.tag === 'sale') badgeHTML = '<span class="badge badge-sale">Sale</span>';

  var priceHTML = product.originalPrice
    ? '<span class="price-current is-sale">' + formatPrice(product.price) + '</span>'
      + '<span class="price-original">' + formatPrice(product.originalPrice) + '</span>'
    : '<span class="price-current">' + formatPrice(product.price) + '</span>';

  var i = _cardIndex++;
  var card = document.createElement('article');
  card.className = 'product-card card-enter';
  card.style.setProperty('--card-i', i);
  card.innerHTML =
    '<a href="' + buildProductURL(product.id) + '" class="product-card-img-wrap">'
      + '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">'
      + (badgeHTML ? '<div class="product-card-overlay">' + badgeHTML + '</div>' : '')
      + '<button class="card-wish-btn' + (isWished ? ' is-active' : '') + '" data-id="' + product.id + '" aria-label="Добавить в избранное">'
        + heartSVG(isWished)
      + '</button>'
    + '</a>'
    + '<div class="product-card-info">'
      + '<div class="product-card-cat">' + product.categoryLabel + '</div>'
      + '<a class="product-card-name" href="' + buildProductURL(product.id) + '">' + product.name + '</a>'
      + '<div class="product-card-price">' + priceHTML + '</div>'
    + '</div>';

  var wishBtn = card.querySelector('.card-wish-btn');
  wishBtn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var added = Wishlist.toggle(product.id);
    wishBtn.classList.toggle('is-active', added);
    wishBtn.innerHTML = heartSVG(added);
    /* Heart pulse micro-animation */
    wishBtn.classList.remove('heart-pulse');
    void wishBtn.offsetWidth; // reflow to restart
    wishBtn.classList.add('heart-pulse');
    showToast(added ? 'Added to wishlist' : 'Removed from wishlist', added ? '&#9825;' : '');
    document.querySelectorAll('.card-wish-btn[data-id="' + product.id + '"]').forEach(function (b) {
      b.classList.toggle('is-active', added);
      b.innerHTML = heartSVG(added);
    });
  });

  return card;
}

function heartSVG(filled) {
  return '<svg width="16" height="16" fill="' + (filled ? '#FF4466' : 'none') + '" stroke="' + (filled ? '#FF4466' : 'currentColor') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M2.5 6.5C2.5 3.97 4.47 2 7 2c1.38 0 2.62.63 3.44 1.61A4.58 4.58 0 0 1 13.97 2C16.5 2 18.5 3.97 18.5 6.5c0 4.17-7 8.5-7 8.5S2.5 10.67 2.5 6.5z" transform="scale(0.7) translate(1.5,1)"/>'
    + '</svg>';
}

/* ── Cart Drawer ────────────────────────────────────────── */

function renderCartDrawer() {
  var items = Cart.getItems();
  var container = document.getElementById('cart-items');
  var subtotalEl = document.getElementById('cart-subtotal');
  var countEl = document.getElementById('cart-drawer-count');
  if (!container) return;

  var qty = Cart.getTotalQty();
  if (countEl) countEl.textContent = qty > 0 ? '(' + qty + ')' : '';

  if (items.length === 0) {
    container.innerHTML =
      '<div class="empty-state" style="padding: var(--sp-12) var(--sp-6);">'
        + '<div class="empty-state-icon">🛍️</div>'
        + '<h3 class="empty-state-title">Your bag is empty</h3>'
        + '<p class="empty-state-text">Add some pieces to get started.</p>'
        + '<a href="catalog.html" class="btn btn-outline" style="margin-top: var(--sp-5);">Browse Catalog</a>'
      + '</div>';
    if (subtotalEl) subtotalEl.textContent = formatPrice(0);
    return;
  }

  container.innerHTML = items.map(function (item) {
    return '<div class="cart-item" data-key="' + item.key + '">'
      + '<a href="' + buildProductURL(item.id) + '" class="cart-item-img">'
        + '<img src="' + item.image + '" alt="' + item.name + '" loading="lazy">'
      + '</a>'
      + '<div class="cart-item-info">'
        + '<p class="cart-item-name">' + item.name + '</p>'
        + '<p class="cart-item-meta">Size: ' + item.size + '</p>'
        + '<div class="cart-item-bottom">'
          + '<div class="qty-control" style="transform: scale(0.9); transform-origin: left;">'
            + '<button class="qty-btn" data-action="minus" data-key="' + item.key + '">−</button>'
            + '<span class="qty-value">' + item.qty + '</span>'
            + '<button class="qty-btn" data-action="plus" data-key="' + item.key + '">+</button>'
          + '</div>'
          + '<span class="cart-item-price">' + formatPrice(item.price * item.qty) + '</span>'
        + '</div>'
        + '<button class="cart-item-remove" data-key="' + item.key + '">Remove</button>'
      + '</div>'
    + '</div>';
  }).join('');

  container.querySelectorAll('.qty-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var delta = btn.dataset.action === 'plus' ? 1 : -1;
      Cart.updateQty(btn.dataset.key, delta);
    });
  });

  container.querySelectorAll('.cart-item-remove').forEach(function (btn) {
    btn.addEventListener('click', function () {
      Cart.removeItem(btn.dataset.key);
    });
  });

  if (subtotalEl) subtotalEl.textContent = formatPrice(Cart.getSubtotal());
}

function openCartDrawer() {
  var drawer = document.getElementById('cart-drawer');
  var overlay = document.getElementById('cart-overlay');
  if (!drawer) return;
  renderCartDrawer();
  drawer.classList.add('is-open');
  if (overlay) overlay.classList.add('is-visible');
  lockScroll();
}

function closeCartDrawer() {
  var drawer = document.getElementById('cart-drawer');
  var overlay = document.getElementById('cart-overlay');
  if (!drawer) return;
  drawer.classList.remove('is-open');
  if (overlay) overlay.classList.remove('is-visible');
  unlockScroll();
}

/* ── Homepage content injection ─────────────────────────── */

function initHomepage() {
  var featuredEl = document.getElementById('featured-products');
  var arrivalsEl = document.getElementById('arrivals-strip');

  if (featuredEl) {
    getFeaturedProducts().forEach(function (p) {
      featuredEl.appendChild(buildProductCard(p));
    });
  }

  if (arrivalsEl) {
    PRODUCTS.filter(function (p) { return p.tag === 'new'; }).forEach(function (p) {
      arrivalsEl.appendChild(buildProductCard(p));
    });
  }

  var newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = newsletterForm.querySelector('input');
      if (input && input.value) {
        showToast('You\'re on the list!', '✓');
        input.value = '';
      }
    });
  }
}

/* ── DOMContentLoaded ───────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {
  syncCartBadge();
  syncWishBadge();
  resetCardIndex();
  initScrollTop();

  var cartToggle = document.getElementById('cart-toggle');
  var cartClose = document.getElementById('cart-close');
  var cartOverlay = document.getElementById('cart-overlay');

  if (cartToggle) cartToggle.addEventListener('click', openCartDrawer);
  if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCartDrawer();
  });

  /* Search button — placeholder */
  var searchBtn = document.getElementById('nav-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      showToast('Search coming soon', '&#128269;');
    });
  }

  /* Checkout button */
  var checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (Cart.getTotalQty() === 0) {
        showToast('Your bag is empty', '&#128717;');
        return;
      }
      window.location.href = 'checkout.html';
    });
  }

  if (document.getElementById('featured-products') || document.getElementById('arrivals-strip')) {
    initHomepage();
  }
});
