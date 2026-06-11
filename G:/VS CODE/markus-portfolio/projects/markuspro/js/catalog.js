/* ============================================================
   MARKUS PRO — catalog.js
   Filtering, sorting, and rendering the product grid.
============================================================ */

(function () {
  var activeCategory = '';
  var activeTag = '';
  var activePriceRange = null;
  var activeSort = 'default';

  function getFilteredProducts() {
    var results = PRODUCTS.slice();

    /* URL category param (initial load from nav links) */
    var urlCat = getParam('category');
    if (urlCat && !activeCategory) {
      if (urlCat === 'new') {
        activeTag = 'new';
        syncTagPills();
      } else if (urlCat === 'sale') {
        activeTag = 'sale';
        syncTagPills();
      } else {
        activeCategory = urlCat;
        syncCategoryPills();
      }
    }

    if (activeCategory) {
      results = results.filter(function (p) { return p.category === activeCategory; });
    }
    if (activeTag) {
      results = results.filter(function (p) { return p.tag === activeTag; });
    }
    if (activePriceRange) {
      results = results.filter(function (p) {
        return p.price >= activePriceRange[0] && p.price <= activePriceRange[1];
      });
    }

    if (activeSort === 'price-asc') {
      results.sort(function (a, b) { return a.price - b.price; });
    } else if (activeSort === 'price-desc') {
      results.sort(function (a, b) { return b.price - a.price; });
    } else if (activeSort === 'new') {
      results = results.filter(function (p) { return p.tag === 'new' || p.tag === 'hot'; }).concat(
        results.filter(function (p) { return p.tag !== 'new' && p.tag !== 'hot'; })
      );
    }

    return results;
  }

  function render() {
    var grid = document.getElementById('catalog-grid');
    var countEl = document.getElementById('catalog-count');
    if (!grid) return;

    var products = getFilteredProducts();
    grid.innerHTML = '';
    if (typeof resetCardIndex === 'function') resetCardIndex();

    if (products.length === 0) {
      grid.innerHTML = '<div class="catalog-empty"><div class="empty-state">'
        + '<div class="empty-state-icon">🔍</div>'
        + '<h3 class="empty-state-title">No products found</h3>'
        + '<p class="empty-state-text">Try adjusting your filters.</p>'
        + '<button class="btn btn-outline" onclick="clearAllFilters()" style="margin-top: var(--sp-5);">Clear Filters</button>'
        + '</div></div>';
    } else {
      products.forEach(function (p) {
        var card = buildProductCard(p);
        card.classList.add('reveal');
        grid.appendChild(card);
      });
      initReveal();
    }

    if (countEl) countEl.textContent = products.length + ' product' + (products.length !== 1 ? 's' : '');
    updateHeading();
  }

  function updateHeading() {
    var heading = document.getElementById('catalog-heading');
    if (!heading) return;
    if (activeCategory === 'tshirts') heading.textContent = 'T-Shirts';
    else if (activeCategory === 'pants') heading.textContent = 'Pants';
    else if (activeCategory === 'sneakers') heading.textContent = 'Sneakers';
    else if (activeCategory === 'socks') heading.textContent = 'Socks';
    else if (activeTag === 'new') heading.textContent = 'New In';
    else if (activeTag === 'sale') heading.textContent = 'Sale';
    else heading.textContent = 'All Products';
  }

  function syncCategoryPills() {
    document.querySelectorAll('.filter-pill[data-category]').forEach(function (pill) {
      pill.classList.toggle('is-active', pill.dataset.category === activeCategory);
    });
  }

  function syncTagPills() {
    document.querySelectorAll('.filter-pill[data-tag]').forEach(function (pill) {
      pill.classList.toggle('is-active', pill.dataset.tag === activeTag);
    });
  }

  window.clearAllFilters = function () {
    activeCategory = '';
    activeTag = '';
    activePriceRange = null;
    activeSort = 'default';
    syncCategoryPills();
    syncTagPills();
    document.querySelectorAll('.filter-pill input[type=checkbox]').forEach(function (cb) {
      cb.checked = false;
      cb.closest('.filter-pill').classList.remove('is-active');
    });
    var sortEl = document.getElementById('sort-select');
    if (sortEl) sortEl.value = 'default';
    render();
  };

  document.addEventListener('DOMContentLoaded', function () {
    /* Category pills */
    document.querySelectorAll('.filter-pill[data-category]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        activeCategory = pill.dataset.category;
        activeTag = '';
        syncCategoryPills();
        syncTagPills();
        render();
      });
    });

    /* Tag pills */
    document.querySelectorAll('.filter-pill[data-tag]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        activeTag = pill.dataset.tag === activeTag ? '' : pill.dataset.tag;
        pill.classList.toggle('is-active');
        render();
      });
    });

    /* Price checkboxes */
    document.querySelectorAll('.filter-pill input[data-price]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        cb.closest('.filter-pill').classList.toggle('is-active', cb.checked);
        if (cb.checked) {
          var parts = cb.dataset.price.split('-');
          activePriceRange = [Number(parts[0]), Number(parts[1])];
        } else {
          activePriceRange = null;
        }
        render();
      });
    });

    /* Sort */
    var sortEl = document.getElementById('sort-select');
    if (sortEl) {
      sortEl.addEventListener('change', function () {
        activeSort = sortEl.value;
        render();
      });
    }

    /* Clear */
    var clearBtn = document.getElementById('clear-filters');
    if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);

    render();
  });
})();
