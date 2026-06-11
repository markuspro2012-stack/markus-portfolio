/* ============================================================
   MARKUS PRO — wishlist.js
   Renders saved products from localStorage wishlist.
============================================================ */

(function () {
  function render() {
    var grid = document.getElementById('wishlist-grid');
    var emptyEl = document.getElementById('wishlist-empty');
    var countEl = document.getElementById('wishlist-count');
    var authBar = document.getElementById('wishlist-auth-bar');
    if (!grid) return;

    var ids = Wishlist.getIds();
    var products = ids.map(function (id) { return getProductById(id); }).filter(Boolean);

    if (countEl) countEl.textContent = products.length + ' item' + (products.length !== 1 ? 's' : '');
    if (authBar) {
      var user = storage.get('mp_user', null);
      if (!user) authBar.style.display = 'flex';
    }

    if (products.length === 0) {
      grid.style.display = 'none';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    grid.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    grid.innerHTML = '';
    products.forEach(function (p) {
      var card = buildProductCard(p);
      /* Re-render grid on wishlist change */
      var wishBtn = card.querySelector('.card-wish-btn');
      if (wishBtn) {
        var original = wishBtn.onclick;
        wishBtn.addEventListener('click', function () {
          setTimeout(render, 50);
        });
      }
      grid.appendChild(card);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
  });
})();
