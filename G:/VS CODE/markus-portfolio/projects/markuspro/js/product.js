/* ============================================================
   MARKUS PRO — product.js
   Product detail page: gallery, size selector, quantity, cart,
   wishlist, accordion, related products.
============================================================ */

(function () {
  var selectedSize = null;
  var qty = 1;
  var product = null;

  /* ── Load product from URL param ──────────────────────── */

  function init() {
    var id = Number(getParam('id'));
    product = getProductById(id);

    if (!product) {
      document.getElementById('product-name').textContent = 'Product not found';
      return;
    }

    document.title = product.name + ' — Markus Pro';
    renderBreadcrumb();
    renderGallery();
    renderInfo();
    renderSizes();
    renderAccordion();
    renderRelated();
    syncWishBtn();
  }

  /* ── Breadcrumb ────────────────────────────────────────── */

  function renderBreadcrumb() {
    var catLink = document.getElementById('breadcrumb-cat');
    var nameEl = document.getElementById('breadcrumb-name');
    if (catLink) {
      catLink.href = buildCatalogURL(product.category);
      catLink.textContent = product.categoryLabel;
    }
    if (nameEl) nameEl.textContent = product.name;
  }

  /* ── Gallery ───────────────────────────────────────────── */

  function renderGallery() {
    var mainImg = document.getElementById('main-img');
    var thumbsEl = document.getElementById('product-thumbs');
    if (!mainImg) return;

    mainImg.src = product.images[0];
    mainImg.alt = product.name;

    if (thumbsEl && product.images.length > 1) {
      product.images.forEach(function (src, i) {
        var thumb = document.createElement('button');
        thumb.className = 'product-thumb' + (i === 0 ? ' is-active' : '');
        thumb.setAttribute('aria-label', 'View image ' + (i + 1));
        thumb.innerHTML = '<img src="' + src + '" alt="" loading="lazy">';
        thumb.addEventListener('click', function () {
          mainImg.src = src;
          thumbsEl.querySelectorAll('.product-thumb').forEach(function (t) {
            t.classList.remove('is-active');
          });
          thumb.classList.add('is-active');
        });
        thumbsEl.appendChild(thumb);
      });
    } else if (thumbsEl) {
      thumbsEl.style.display = 'none';
    }
  }

  /* ── Info ──────────────────────────────────────────────── */

  function renderInfo() {
    var catTag = document.getElementById('product-category-tag');
    var nameEl = document.getElementById('product-name');
    var priceMain = document.getElementById('product-price-main');
    var priceOld = document.getElementById('product-price-old');
    var descEl = document.getElementById('product-desc');

    if (catTag) catTag.textContent = product.categoryLabel;
    if (nameEl) nameEl.textContent = product.name;
    if (descEl) descEl.textContent = product.description;

    if (priceMain) {
      priceMain.textContent = formatPrice(product.price);
      if (product.originalPrice) priceMain.classList.add('is-sale');
    }
    if (priceOld && product.originalPrice) {
      priceOld.textContent = formatPrice(product.originalPrice);
      priceOld.style.display = 'inline';
    }
  }

  /* ── Sizes ─────────────────────────────────────────────── */

  function renderSizes() {
    var container = document.getElementById('size-options');
    if (!container) return;

    container.innerHTML = '';
    product.sizes.forEach(function (size) {
      var unavailable = product.soldOut.indexOf(size) !== -1;
      var btn = document.createElement('button');
      btn.className = 'size-btn' + (unavailable ? ' is-unavailable' : '');
      btn.textContent = size;
      btn.disabled = unavailable;
      if (!unavailable) {
        btn.addEventListener('click', function () {
          container.querySelectorAll('.size-btn').forEach(function (b) {
            b.classList.remove('is-selected');
          });
          btn.classList.add('is-selected');
          selectedSize = size;
        });
      }
      container.appendChild(btn);
    });

    /* Auto-select first available */
    var first = container.querySelector('.size-btn:not(.is-unavailable)');
    if (first) {
      first.classList.add('is-selected');
      selectedSize = first.textContent;
    }
  }

  /* ── Quantity stepper ──────────────────────────────────── */

  function initQty() {
    var minus = document.getElementById('qty-minus');
    var plus = document.getElementById('qty-plus');
    var display = document.getElementById('qty-value');

    if (!minus || !plus || !display) return;

    minus.addEventListener('click', function () {
      if (qty > 1) {
        qty--;
        display.textContent = qty;
      }
    });
    plus.addEventListener('click', function () {
      if (qty < 10) {
        qty++;
        display.textContent = qty;
      }
    });
  }

  /* ── Add to Cart ───────────────────────────────────────── */

  function initAddToCart() {
    var btn = document.getElementById('add-to-cart-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!selectedSize) {
        showToast('Please select a size', '⚠');
        return;
      }
      Cart.addItem(product, selectedSize, qty);
      showToast(product.name + ' added to bag', '✓');
      openCartDrawer();
    });
  }

  /* ── Wishlist ──────────────────────────────────────────── */

  function syncWishBtn() {
    var btn = document.getElementById('wish-btn');
    if (!btn || !product) return;
    var wished = Wishlist.has(product.id);
    btn.classList.toggle('is-wishlisted', wished);
    btn.innerHTML = wishHeartSVG(wished);
  }

  function wishHeartSVG(active) {
    return '<svg width="20" height="20" fill="' + (active ? '#FF4466' : 'none') + '" stroke="' + (active ? '#FF4466' : 'currentColor') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M3.5 8C3.5 4.96 5.96 2.5 9 2.5c1.66 0 3.14.75 4.13 1.93A5.5 5.5 0 0 1 17.5 8c0 5-8.5 10-8.5 10S.5 13 .5 8z" transform="translate(1 1)"/>'
      + '</svg>';
  }

  function initWishBtn() {
    var btn = document.getElementById('wish-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var added = Wishlist.toggle(product.id);
      btn.classList.toggle('is-wishlisted', added);
      btn.innerHTML = wishHeartSVG(added);
      showToast(added ? '♡ Added to wishlist' : 'Removed from wishlist', added ? '♡' : '');
    });
  }

  /* ── Accordion ─────────────────────────────────────────── */

  function renderAccordion() {
    var container = document.getElementById('product-details-section');
    if (!container) return;

    var items = [
      { title: 'Product Details', body: product.details },
      { title: 'Shipping', body: product.shipping },
      { title: 'Returns', body: product.returns }
    ];

    items.forEach(function (item, i) {
      var el = document.createElement('div');
      el.className = 'accordion-item';
      el.innerHTML =
        '<button class="accordion-trigger" aria-expanded="false" aria-controls="acc-body-' + i + '">'
          + '<span>' + item.title + '</span>'
          + '<span class="accordion-icon">+</span>'
        + '</button>'
        + '<div class="accordion-body" id="acc-body-' + i + '" role="region">'
          + '<p style="font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.7;">' + item.body + '</p>'
        + '</div>';

      var trigger = el.querySelector('.accordion-trigger');
      var body = el.querySelector('.accordion-body');
      trigger.addEventListener('click', function () {
        var open = body.classList.contains('is-open');
        body.classList.toggle('is-open', !open);
        trigger.setAttribute('aria-expanded', String(!open));
        trigger.querySelector('.accordion-icon').textContent = open ? '+' : '×';
      });

      container.appendChild(el);
    });
  }

  /* ── Related Products ──────────────────────────────────── */

  function renderRelated() {
    var grid = document.getElementById('related-grid');
    if (!grid) return;
    getRelatedProducts(product.id, 4).forEach(function (p) {
      grid.appendChild(buildProductCard(p));
    });
  }

  /* ── Size Guide modal (simple) ─────────────────────────── */

  function initSizeGuide() {
    var btn = document.getElementById('size-guide-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      showToast('Size Guide: XS=44, S=46, M=48, L=50, XL=52', '📏');
    });
  }

  /* ── Bootstrap ─────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    init();
    initQty();
    initAddToCart();
    initWishBtn();
    initSizeGuide();
  });
})();
