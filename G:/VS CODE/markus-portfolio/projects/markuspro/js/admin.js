/* ============================================================
   MARKUS PRO — Admin Panel Logic
   Auth: client-side session via sessionStorage.
   Data: Supabase via Netlify Function /api/admin/*
============================================================ */
(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────── */
  var SESSION_KEY = 'mp_admin_session';
  var API_BASE    = '/api/admin';

  var SIZES_BY_CAT = {
    tshirts:  ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    pants:    ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    sneakers: ['38', '39', '40', '41', '42', '43', '44', '45', '46'],
    socks:    ['S (36-39)', 'M (40-43)', 'L (44-46)']
  };

  var CAT_LABELS = {
    tshirts:  'T-Shirts',
    pants:    'Pants',
    sneakers: 'Sneakers',
    socks:    'Socks'
  };

  var STATUS_CSS = {
    pending:   'warning',
    confirmed: 'blue',
    shipped:   'purple',
    delivered: 'success',
    cancelled: 'error'
  };

  /* ── State ─────────────────────────────────────────────── */
  var state = {
    products:  [],
    orders:    [],
    settings:  {},
    log:       [],
    selected:  new Set(),
    section:   'dashboard',
    search:    '',
    filterCat: '',
    sortKey:   'id',
    sortDir:   'asc',
    page:      1,
    perPage:   10,
    editId:    null
  };

  var confirmCallback = null;
  var toastTimer;

  /* ── API helpers ───────────────────────────────────────── */

  function apiSecret() {
    return (window.__MP_CONFIG || {}).adminSecret || 'markuspro2026';
  }

  function api(method, path, body) {
    var opts = {
      method: method,
      headers: {
        'Content-Type':   'application/json',
        'x-admin-secret': apiSecret()
      }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(API_BASE + '/' + path, opts).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
        return data;
      });
    });
  }

  /* ── DB ↔ internal mapping ─────────────────────────────── */

  function fromDB(p) {
    return {
      id:            p.id,
      name:          p.name          || '',
      category:      p.category      || '',
      categoryLabel: CAT_LABELS[p.category] || p.category || '',
      price:         p.price         || 0,
      originalPrice: p.original_price != null ? p.original_price : null,
      tag:           p.tag           || null,
      active:        p.active        !== false,
      featured:      !!p.featured,
      image:         p.image         || ('https://picsum.photos/seed/mp' + p.id + '/600/750'),
      images:        p.image         ? [p.image] : [],
      sku:           p.sku           || '',
      sizes:         p.sizes         || [],
      soldOut:       [],
      stock:         p.stock         || 0,
      description:   p.description   || ''
    };
  }

  function toDB(p) {
    return {
      name:           p.name,
      category:       p.category,
      price:          p.price,
      original_price: p.originalPrice != null && !isNaN(p.originalPrice) ? p.originalPrice : null,
      tag:            p.tag           || null,
      active:         p.active        !== false,
      featured:       !!p.featured,
      image:          p.image         || null,
      sku:            p.sku           || null,
      sizes:          p.sizes         || [],
      stock:          p.stock         || 0,
      description:    p.description   || null
    };
  }

  function orderDate(o) {
    return o.created_at ? new Date(o.created_at).getTime() : (o.date || Date.now());
  }

  function orderCustomer(o) {
    return o.customer_name || o.customer || '—';
  }

  /* ── Utilities ─────────────────────────────────────────── */

  function escHtml(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function setText(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; }

  /* ── Auth ──────────────────────────────────────────────── */

  function isAuthed() { return sessionStorage.getItem(SESSION_KEY) === '1'; }

  function doLogin(pass) {
    if (pass === apiSecret()) { sessionStorage.setItem(SESSION_KEY, '1'); return true; }
    return false;
  }

  function doLogout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }

  /* ── Init ──────────────────────────────────────────────── */

  function init() {
    var dateEl = document.getElementById('topbar-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    bindAuth();
    if (isAuthed()) {
      bootApp();
    } else {
      document.getElementById('auth-gate').style.display = '';
    }
  }

  /* ── Image upload zone ─────────────────────────────────── */

  function setImagePreview(url) {
    var urlInput = document.getElementById('input-image-url');
    var prev     = document.getElementById('img-preview-main');
    var ph       = document.getElementById('img-preview-placeholder');
    var zone     = document.getElementById('upload-zone');
    if (urlInput) urlInput.value = url;
    if (prev) { prev.src = url; prev.style.display = url ? '' : 'none'; }
    if (ph)   ph.style.display  = url ? 'none' : '';
    if (zone) zone.classList.toggle('is-done', !!url);
  }

  function uploadFile(file, pForm) {
    if (!file) return;
    var maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast('Image too large — max 4 MB', 'error'); return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      toast('Unsupported format — use JPG, PNG or WebP', 'error'); return;
    }

    var zone     = document.getElementById('upload-zone');
    var idle     = document.getElementById('upload-zone-idle');
    var progress = document.getElementById('upload-zone-progress');
    var progText = document.getElementById('upload-progress-text');

    if (idle)     idle.style.display     = 'none';
    if (progress) progress.style.display = '';
    if (progText) progText.textContent   = 'Reading file…';

    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl  = e.target.result;             /* data:image/jpeg;base64,.... */
      var base64   = dataUrl.split(',')[1];
      if (progText) progText.textContent = 'Uploading…';

      api('POST', 'upload', {
        filename:    file.name,
        contentType: file.type,
        data:        base64
      })
      .then(function (res) {
        setImagePreview(res.url);
        toast('Photo uploaded successfully', 'success');
        if (idle)     idle.style.display     = '';
        if (progress) progress.style.display = 'none';
      })
      .catch(function (err) {
        toast('Upload failed: ' + err.message, 'error');
        if (idle)     idle.style.display     = '';
        if (progress) progress.style.display = 'none';
      });
    };
    reader.readAsDataURL(file);
  }

  function initUploadZone(pForm) {
    var zone      = document.getElementById('upload-zone');
    var fileInput = document.getElementById('img-file-input');
    var browseBtn = document.getElementById('btn-browse-file');

    if (!zone || !fileInput) return;

    /* Click idle area or browse button */
    browseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      fileInput.click();
    });
    zone.addEventListener('click', function () { fileInput.click(); });

    /* File selected via dialog */
    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) uploadFile(this.files[0], pForm);
      this.value = '';
    });

    /* Drag and drop */
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('is-dragover');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      var file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) uploadFile(file, pForm);
    });
  }

  function bootApp() {
    document.getElementById('auth-gate').style.display = 'none';
    document.getElementById('admin-app').style.display = '';

    showToast('Loading data…', 'info');

    Promise.all([
      api('GET', 'products'),
      api('GET', 'orders'),
      api('GET', 'log')
    ]).then(function (results) {
      state.products = (results[0] || []).map(fromDB);
      state.orders   = results[1] || [];
      state.log = (results[2] || []).map(function (e) {
        return { msg: e.action, ts: new Date(e.created_at).getTime() };
      });

      renderCounts();
      navigateTo('dashboard');
      bindApp();
    }).catch(function (err) {
      showToast('Failed to load: ' + err.message, 'error');
      /* Still bind UI so admin can at least navigate */
      renderCounts();
      navigateTo('dashboard');
      bindApp();
    });
  }

  /* ── Navigation ────────────────────────────────────────── */

  function navigateTo(section) {
    state.section = section;
    state.page    = 1;

    document.querySelectorAll('.admin-nav-item[data-section]').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.section === section);
    });
    document.querySelectorAll('.admin-section').forEach(function (s) {
      s.classList.toggle('is-active', s.id === 'section-' + section);
    });

    var bc = document.getElementById('topbar-section');
    if (bc) bc.textContent = cap(section);

    if (section === 'dashboard')  renderDashboard();
    if (section === 'products')   renderProducts();
    if (section === 'orders')     renderOrders();
    if (section === 'promotions') renderPromotions();
    if (section === 'settings')   renderSettings();

    document.getElementById('admin-sidebar').classList.remove('is-open');
    document.getElementById('sidebar-overlay').classList.remove('is-visible');
  }

  function renderCounts() {
    setText('nav-products-count', state.products.length);
    setText('nav-orders-count',   state.orders.length);
  }

  /* ── Dashboard ─────────────────────────────────────────── */

  function renderDashboard() {
    var total  = state.products.length;
    var active = state.products.filter(function (p) { return p.active !== false; }).length;
    var oos    = state.products.filter(function (p) { return (p.stock || 0) === 0; }).length;

    setText('kpi-total',  total);
    setText('kpi-active', active);
    setText('kpi-low',    oos);
    setText('kpi-orders', state.orders.length);

    var cats = {};
    state.products.forEach(function (p) {
      var k = p.category || 'other';
      cats[k] = (cats[k] || 0) + 1;
    });

    var statsEl = document.getElementById('category-stats');
    if (statsEl) {
      if (!total) {
        statsEl.innerHTML = '<p class="log-empty">No products yet</p>';
      } else {
        statsEl.innerHTML = Object.keys(cats).map(function (k) {
          var pct = Math.round((cats[k] / total) * 100);
          return '<div class="cat-stat">'
            + '<span class="cat-stat-name">' + escHtml(CAT_LABELS[k] || k) + '</span>'
            + '<div class="cat-stat-bar"><div class="cat-stat-fill" style="width:' + pct + '%"></div></div>'
            + '<span class="cat-stat-count">' + cats[k] + '</span>'
            + '</div>';
        }).join('');
      }
    }

    var logEl = document.getElementById('activity-log');
    if (logEl) {
      if (!state.log.length) {
        logEl.innerHTML = '<p class="log-empty">No recent activity</p>';
      } else {
        logEl.innerHTML = state.log.slice(0, 8).map(function (e) {
          return '<div class="log-entry">'
            + '<span class="log-action">' + escHtml(e.msg) + '</span>'
            + '<span class="log-time">'   + escHtml(fmtDate(e.ts)) + '</span>'
            + '</div>';
        }).join('');
      }
    }
  }

  /* ── Products — filter / sort / page ───────────────────── */

  function getFiltered() {
    var list = state.products.slice();
    var q    = state.search.toLowerCase().trim();

    if (q) {
      list = list.filter(function (p) {
        return ((p.name || '') + ' ' + (p.sku || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (state.filterCat) {
      list = list.filter(function (p) { return p.category === state.filterCat; });
    }

    list.sort(function (a, b) {
      var av, bv;
      if (state.sortKey === 'name')       { av = (a.name  || '').toLowerCase(); bv = (b.name  || '').toLowerCase(); }
      else if (state.sortKey === 'price') { av = a.price  || 0;                 bv = b.price  || 0; }
      else                                { av = a.id     || 0;                 bv = b.id     || 0; }
      return av < bv ? (state.sortDir === 'asc' ? -1 : 1)
           : av > bv ? (state.sortDir === 'asc' ?  1 : -1) : 0;
    });
    return list;
  }

  /* ── Products — render table ───────────────────────────── */

  function renderProducts() {
    var list  = getFiltered();
    var pages = Math.max(1, Math.ceil(list.length / state.perPage));
    if (state.page > pages) state.page = 1;
    var slice = list.slice((state.page - 1) * state.perPage, state.page * state.perPage);

    var lbl = document.getElementById('products-count-label');
    if (lbl) lbl.textContent = list.length + ' product' + (list.length !== 1 ? 's' : '');

    var tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="table-empty">No products found</td></tr>';
    } else {
      tbody.innerHTML = slice.map(function (p) {
        var sel  = state.selected.has(p.id) ? ' is-selected' : '';
        var chk  = state.selected.has(p.id) ? ' checked' : '';

        var tagHtml = p.tag
          ? '<span class="admin-tag admin-tag--' + escHtml(p.tag) + '">' + escHtml(p.tag.toUpperCase()) + '</span>'
          : '<span style="color:var(--text-muted)">—</span>';

        var featHtml = p.featured
          ? '<span class="status-dot status-dot--featured" title="Featured">★</span>'
          : '<span class="status-dot status-dot--no" title="Not featured">—</span>';

        var actHtml = p.active !== false
          ? '<span class="status-dot status-dot--active"  title="Active">●</span>'
          : '<span class="status-dot status-dot--inactive" title="Inactive">●</span>';

        var imgHtml = p.image
          ? '<div class="thumb-wrap"><img src="' + escHtml(p.image) + '" alt="" class="thumb-img" loading="lazy"></div>'
          : '<div class="thumb-wrap"></div>';

        return '<tr class="' + sel + '" data-id="' + p.id + '">'
          + '<td class="col-check"><input type="checkbox" class="row-check" data-id="' + p.id + '"' + chk + '></td>'
          + '<td class="col-img">'      + imgHtml + '</td>'
          + '<td class="col-name"><span class="product-name-cell">' + escHtml(p.name) + '</span>'
          +   '<span class="product-sku-cell">' + escHtml(p.sku || '') + '</span></td>'
          + '<td class="col-cat">'      + escHtml(CAT_LABELS[p.category] || p.category || '—') + '</td>'
          + '<td class="col-price"><span class="price-cell' + (p.originalPrice ? ' is-sale' : '') + '">€' + escHtml(p.price) + '</span>'
          + (p.originalPrice ? '<span class="price-cell-old">€' + escHtml(p.originalPrice) + '</span>' : '') + '</td>'
          + '<td class="col-tag">'      + tagHtml  + '</td>'
          + '<td class="col-featured">' + featHtml + '</td>'
          + '<td class="col-active">'   + actHtml  + '</td>'
          + '<td class="col-actions">'
          +   '<button class="action-btn action-btn--edit"   data-action="edit"   data-id="' + p.id + '" title="Edit">✏️</button>'
          +   '<button class="action-btn action-btn--delete" data-action="delete" data-id="' + p.id + '" title="Delete">🗑️</button>'
          + '</td>'
          + '</tr>';
      }).join('');
    }

    renderPagination(pages);
    updateBulkBar();
    syncCheckAll(list);
  }

  function renderPagination(pages) {
    var el = document.getElementById('products-pagination');
    if (!el) return;
    if (pages <= 1) { el.innerHTML = ''; return; }
    var html = '';
    for (var i = 1; i <= pages; i++) {
      html += '<button class="page-btn' + (i === state.page ? ' is-active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    el.innerHTML = html;
  }

  function syncCheckAll(list) {
    var ca = document.getElementById('check-all');
    if (!ca) return;
    var ids = list.slice((state.page - 1) * state.perPage, state.page * state.perPage).map(function (p) { return p.id; });
    var all = ids.length > 0 && ids.every(function (id) { return state.selected.has(id); });
    ca.checked       = all;
    ca.indeterminate = !all && ids.some(function (id) { return state.selected.has(id); });
  }

  function updateBulkBar() {
    var bar = document.getElementById('bulk-bar');
    var cnt = document.getElementById('bulk-count');
    if (!bar) return;
    var n = state.selected.size;
    bar.style.display = n > 0 ? '' : 'none';
    if (cnt) cnt.textContent = n + ' selected';
  }

  /* ── Product Modal ─────────────────────────────────────── */

  function openProductModal(id) {
    state.editId = id || null;
    var form     = document.getElementById('product-form');
    form.reset();

    document.querySelectorAll('.form-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === 'basic');
    });
    document.querySelectorAll('.form-tab-pane').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'tab-basic');
    });

    var prev = document.getElementById('img-preview-main');
    var ph   = document.getElementById('img-preview-placeholder');
    if (prev) { prev.style.display = 'none'; prev.src = ''; }
    if (ph)   ph.style.display = '';
    var uz = document.getElementById('upload-zone');
    if (uz) uz.classList.remove('is-done');
    setText('preview-price', ''); setText('preview-original', ''); setText('preview-badge', '');
    var be = document.getElementById('preview-badge');
    if (be) be.className = 'preview-badge';

    var p = id ? state.products.find(function (x) { return x.id === id; }) : null;
    setText('modal-title', p ? 'Edit Product' : 'Add Product');

    if (p) {
      setF(form, 'name',          p.name          || '');
      setF(form, 'category',      p.category      || '');
      setF(form, 'description',   p.description   || '');
      setF(form, 'details',       p.details       || '');
      setF(form, 'sku',           p.sku           || '');
      setF(form, 'collection',    p.collection    || '');
      setF(form, 'shipping',      p.shipping      || '');
      setF(form, 'returns',       p.returns       || '');
      setF(form, 'price',         p.price         != null ? String(p.price) : '');
      setF(form, 'originalPrice', p.originalPrice != null ? String(p.originalPrice) : '');
      setF(form, 'tag',           p.tag           || '');
      setF(form, 'id',            p.id);
      form.elements['featured'].checked = !!p.featured;
      form.elements['active'].checked   = p.active !== false;
      setF(form, 'image',    p.image    || '');
      setF(form, 'imagesRaw', (p.images  || []).join('\n'));

      if (p.image) {
        if (prev) { prev.src = p.image; prev.style.display = ''; }
        if (ph)   ph.style.display = 'none';
      }
      updatePricePreview(p.price, p.originalPrice, p.tag);
    }

    buildSizesGrid(p ? p.category : '', p ? (p.sizes || []) : [], p ? (p.soldOut || []) : []);
    document.getElementById('product-modal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    document.body.style.overflow = '';
    state.editId = null;
  }

  function setF(form, name, value) {
    var el = form.elements[name];
    if (el) el.value = value != null ? value : '';
  }

  function buildSizesGrid(cat, selected, soldOut) {
    var sizes = SIZES_BY_CAT[cat] || [];
    var sEl   = document.getElementById('sizes-grid');
    var soEl  = document.getElementById('soldout-grid');
    if (!sEl || !soEl) return;

    if (!sizes.length) {
      var msg = '<p style="font-size:.75rem;color:var(--text-muted)">Select a category first</p>';
      sEl.innerHTML = msg; soEl.innerHTML = msg; return;
    }

    var h1 = '', h2 = '';
    sizes.forEach(function (sz) {
      var c1 = selected.indexOf(sz) >= 0 ? ' checked' : '';
      var c2 = soldOut.indexOf(sz)  >= 0 ? ' checked' : '';
      h1 += '<label class="size-chip"><input type="checkbox" class="size-available" value="' + escHtml(sz) + '"' + c1 + '><span>' + escHtml(sz) + '</span></label>';
      h2 += '<label class="size-chip size-chip--soldout"><input type="checkbox" class="size-soldout" value="' + escHtml(sz) + '"' + c2 + '><span>' + escHtml(sz) + '</span></label>';
    });
    sEl.innerHTML  = h1;
    soEl.innerHTML = h2;
  }

  function updatePricePreview(price, orig, tag) {
    var pe = document.getElementById('preview-price');
    var oe = document.getElementById('preview-original');
    var be = document.getElementById('preview-badge');
    if (pe) pe.textContent = (price != null && price !== '') ? '€' + price : '';
    if (oe) oe.textContent = (orig  != null && orig  !== '') ? '€' + orig  : '';
    if (be) {
      be.textContent = tag ? tag.toUpperCase() : '';
      be.className   = tag ? 'preview-badge preview-badge--' + tag : 'preview-badge';
    }
  }

  /* ── Save product ──────────────────────────────────────── */

  function saveProduct() {
    var form  = document.getElementById('product-form');
    var name  = form.elements['name'].value.trim();
    var cat   = form.elements['category'].value;
    var price = parseFloat(form.elements['price'].value);

    if (!name)        { showToast('Product name is required', 'error'); switchTab('basic');   return; }
    if (!cat)         { showToast('Please select a category', 'error'); switchTab('basic');   return; }
    if (isNaN(price)) { showToast('Valid price is required',  'error'); switchTab('pricing'); return; }

    var origRaw  = form.elements['originalPrice'].value.trim();
    var orig     = origRaw ? parseFloat(origRaw) : null;
    var tag      = form.elements['tag'].value      || null;
    var featured = form.elements['featured'].checked;
    var active   = form.elements['active'].checked;
    var imgUrl   = form.elements['image'].value.trim();

    var sizeCbs    = Array.prototype.slice.call(form.querySelectorAll('.size-available:checked'));
    var soldOutCbs = Array.prototype.slice.call(form.querySelectorAll('.size-soldout:checked'));
    var sizes      = sizeCbs.map(function (c) { return c.value; });
    var soldOut    = soldOutCbs.map(function (c) { return c.value; });

    var product = {
      name:          name,
      category:      cat,
      categoryLabel: CAT_LABELS[cat] || cat,
      price:         price,
      originalPrice: (orig != null && !isNaN(orig)) ? orig : null,
      tag:           tag,
      image:         imgUrl || null,
      images:        imgUrl ? [imgUrl] : [],
      sizes:         sizes,
      soldOut:       soldOut,
      featured:      featured,
      active:        active,
      description:   form.elements['description'].value.trim(),
      sku:           form.elements['sku'].value.trim()
    };

    var saveBtn = document.getElementById('modal-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    var req = state.editId
      ? api('PUT',  'products/' + state.editId, toDB(product))
      : api('POST', 'products',                 toDB(product));

    req.then(function (saved) {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product'; }
      var p = fromDB(saved);
      p.soldOut = soldOut;

      if (state.editId) {
        var idx = state.products.findIndex(function (x) { return x.id === state.editId; });
        if (idx >= 0) state.products[idx] = p; else state.products.push(p);
        showToast('Product updated', 'success');
      } else {
        state.products.push(p);
        showToast('Product added', 'success');
      }

      renderCounts();
      closeProductModal();
      renderProducts();
      if (state.section === 'dashboard') renderDashboard();
    }).catch(function (err) {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Product'; }
      showToast('Save failed: ' + err.message, 'error');
    });
  }

  /* ── Delete product ────────────────────────────────────── */

  function deleteProduct(id) {
    var p = state.products.find(function (x) { return x.id === id; });
    if (!p) return;
    showConfirm('Delete Product', 'Delete "' + p.name + '"? This cannot be undone.', function () {
      api('DELETE', 'products/' + id).then(function () {
        state.products = state.products.filter(function (x) { return x.id !== id; });
        state.selected.delete(id);
        renderCounts(); renderProducts();
        showToast('Product deleted', 'success');
      }).catch(function (err) {
        showToast('Delete failed: ' + err.message, 'error');
      });
    });
  }

  /* ── Bulk actions ──────────────────────────────────────── */

  function doBulkAction(action) {
    var ids = [];
    state.selected.forEach(function (id) { ids.push(id); });
    if (!ids.length) return;

    if (action === 'delete') {
      showConfirm('Delete ' + ids.length + ' Products',
        'Permanently delete ' + ids.length + ' selected products?',
        function () {
          Promise.all(ids.map(function (id) { return api('DELETE', 'products/' + id); }))
            .then(function () {
              state.products = state.products.filter(function (p) { return !state.selected.has(p.id); });
              state.selected.clear();
              renderCounts(); renderProducts();
              showToast(ids.length + ' products deleted', 'success');
            }).catch(function (err) {
              showToast('Bulk delete failed: ' + err.message, 'error');
            });
        }
      );
      return;
    }

    var updates = [];
    state.products.forEach(function (p) {
      if (!state.selected.has(p.id)) return;
      var patch = {};
      if (action === 'activate')   { p.active   = true;  patch.active   = true; }
      if (action === 'deactivate') { p.active   = false; patch.active   = false; }
      if (action === 'feature')    { p.featured = true;  patch.featured = true; }
      updates.push(api('PUT', 'products/' + p.id, patch));
    });

    Promise.all(updates).then(function () {
      state.selected.clear();
      renderCounts(); renderProducts();
      showToast(ids.length + ' products updated', 'success');
    }).catch(function (err) {
      showToast('Bulk update failed: ' + err.message, 'error');
    });
  }

  /* ── Orders ────────────────────────────────────────────── */

  function renderOrders() {
    var tbody = document.getElementById('orders-tbody');
    var empty = document.getElementById('orders-empty');
    var wrap  = document.getElementById('orders-table-wrap');

    if (!state.orders.length) {
      if (wrap)  wrap.style.display  = 'none';
      if (empty) empty.style.display = '';
      return;
    }
    if (wrap)  wrap.style.display  = '';
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = state.orders.map(function (o) {
      var css  = STATUS_CSS[o.status] || 'warning';
      var opts = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(function (s) {
        return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + cap(s) + '</option>';
      }).join('');

      return '<tr>'
        + '<td><span class="order-id">#' + escHtml(o.id) + '</span></td>'
        + '<td class="order-date">' + escHtml(fmtDate(orderDate(o))) + '</td>'
        + '<td class="order-customer">' + escHtml(orderCustomer(o)) + '</td>'
        + '<td class="order-items">' + ((o.items && o.items.length) || 0) + ' items</td>'
        + '<td class="order-total">€' + escHtml(o.total) + '</td>'
        + '<td><select class="status-select status-select--' + css + '" data-order-id="' + escHtml(o.id) + '">' + opts + '</select></td>'
        + '<td><button class="action-btn" data-action="view-order" data-order-id="' + escHtml(o.id) + '" title="View details">👁</button></td>'
        + '</tr>';
    }).join('');
  }

  function generateMockOrders() {
    var btn = document.getElementById('btn-gen-orders');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

    api('POST', 'orders/generate', { count: 5 }).then(function (orders) {
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Mock Orders'; }
      if (!Array.isArray(orders)) { showToast('No products in DB yet — add products first', 'error'); return; }
      state.orders = orders.concat(state.orders);
      renderCounts(); renderOrders();
      showToast(orders.length + ' mock orders generated', 'success');
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Mock Orders'; }
      showToast('Generate failed: ' + err.message, 'error');
    });
  }

  function viewOrder(id) {
    var o = state.orders.find(function (x) { return x.id === id; });
    if (!o) return;

    var rows = (o.items || []).map(function (it) {
      return '<div class="order-item-row"><span>' + escHtml(it.name) + '</span><span>€' + escHtml(it.price) + '</span></div>';
    }).join('');

    document.getElementById('order-modal-body').innerHTML =
        '<div class="order-detail">'
      + '<div class="order-detail-row"><span>Order #</span><strong>'   + escHtml(o.id)                           + '</strong></div>'
      + '<div class="order-detail-row"><span>Date</span><strong>'      + escHtml(fmtDate(orderDate(o)))          + '</strong></div>'
      + '<div class="order-detail-row"><span>Customer</span><strong>'  + escHtml(orderCustomer(o))               + '</strong></div>'
      + '<div class="order-detail-row"><span>Email</span><strong>'     + escHtml(o.customer_email || '—')        + '</strong></div>'
      + '<div class="order-detail-row"><span>Status</span><strong>'    + cap(o.status)                           + '</strong></div>'
      + '<hr class="order-hr">'
      + '<div class="order-items-list">' + rows + '</div>'
      + '<div class="order-detail-row order-detail-total"><span>Total</span><strong>€' + escHtml(o.total) + '</strong></div>'
      + '</div>';

    document.getElementById('order-modal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ── Promotions ────────────────────────────────────────── */

  function renderPromotions() { renderFeaturedList(); }

  function renderFeaturedList() {
    var el = document.getElementById('featured-list');
    if (!el) return;

    if (!state.products.length) {
      el.innerHTML = '<p style="font-size:.75rem;color:var(--text-muted)">No products yet.</p>';
      return;
    }

    el.innerHTML = '<div class="featured-list">'
      + state.products.map(function (p) {
          return '<div class="featured-item">'
            + '<input type="checkbox" data-action="toggle-feature" data-id="' + p.id + '"' + (p.featured ? ' checked' : '') + '>'
            + '<span class="featured-item-name">' + escHtml(p.name)                           + '</span>'
            + '<span class="featured-item-cat">'  + escHtml(CAT_LABELS[p.category] || p.category || '') + '</span>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  function applyDiscount() {
    var cat = document.getElementById('promo-cat').value;
    var pct = parseFloat(document.getElementById('promo-discount').value);
    if (isNaN(pct) || pct <= 0 || pct >= 100) { showToast('Enter a valid discount % (1–99)', 'error'); return; }

    var targets = state.products.filter(function (p) { return cat === 'all' || p.category === cat; });
    var updates = targets.map(function (p) {
      if (!p.originalPrice) p.originalPrice = p.price;
      p.price = Math.round(p.originalPrice * (1 - pct / 100));
      p.tag   = 'sale';
      return api('PUT', 'products/' + p.id, { price: p.price, original_price: p.originalPrice, tag: 'sale' });
    });

    Promise.all(updates).then(function () {
      showToast(targets.length + ' products updated with ' + pct + '% discount', 'success');
      if (state.section === 'products') renderProducts();
    }).catch(function (err) { showToast('Error: ' + err.message, 'error'); });
  }

  function removeDiscount() {
    var cat     = document.getElementById('promo-remove-cat').value;
    var targets = state.products.filter(function (p) {
      return (cat === 'all' || p.category === cat) && p.originalPrice;
    });
    var updates = targets.map(function (p) {
      p.price = p.originalPrice; p.originalPrice = null; if (p.tag === 'sale') p.tag = null;
      return api('PUT', 'products/' + p.id, { price: p.price, original_price: null, tag: p.tag || null });
    });

    Promise.all(updates).then(function () {
      showToast('Sale removed from ' + targets.length + ' products', 'success');
      if (state.section === 'products') renderProducts();
    }).catch(function (err) { showToast('Error: ' + err.message, 'error'); });
  }

  function applyBadge() {
    var badge   = document.getElementById('promo-badge').value;
    var cat     = document.getElementById('promo-badge-cat').value;
    var targets = state.products.filter(function (p) { return cat === 'all' || p.category === cat; });
    var updates = targets.map(function (p) {
      p.tag = badge;
      return api('PUT', 'products/' + p.id, { tag: badge });
    });

    Promise.all(updates).then(function () {
      showToast(badge.toUpperCase() + ' applied to ' + targets.length + ' products', 'success');
      if (state.section === 'products') renderProducts();
    }).catch(function (err) { showToast('Error: ' + err.message, 'error'); });
  }

  function clearBadges() {
    var cat     = document.getElementById('promo-badge-cat').value;
    var targets = state.products.filter(function (p) {
      return (cat === 'all' || p.category === cat) && p.tag;
    });
    var updates = targets.map(function (p) {
      p.tag = null;
      return api('PUT', 'products/' + p.id, { tag: null });
    });

    Promise.all(updates).then(function () {
      showToast('Badges cleared from ' + targets.length + ' products', 'success');
      if (state.section === 'products') renderProducts();
    }).catch(function (err) { showToast('Error: ' + err.message, 'error'); });
  }


  /* ── Confirm modal ─────────────────────────────────────── */

  function showConfirm(title, msg, cb) {
    confirmCallback = cb;
    setText('confirm-title',   title);
    setText('confirm-message', msg);
    document.getElementById('confirm-modal').style.display = '';
    document.body.style.overflow = 'hidden';
  }

  function closeConfirm() {
    document.getElementById('confirm-modal').style.display = 'none';
    document.body.style.overflow = '';
    confirmCallback = null;
  }

  /* ── Toast ─────────────────────────────────────────────── */

  function showToast(msg, type) {
    var el = document.getElementById('admin-toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.className   = 'admin-toast admin-toast--' + (type || 'info') + ' is-visible';
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 3500);
  }

  /* ── Tab switching ─────────────────────────────────────── */

  function switchTab(tab) {
    document.querySelectorAll('.form-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.form-tab-pane').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'tab-' + tab);
    });
  }

  /* ── Event bindings ────────────────────────────────────── */

  function bindAuth() {
    var form = document.getElementById('auth-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pass  = document.getElementById('auth-pass').value;
      var errEl = document.getElementById('auth-error');
      if (doLogin(pass)) {
        bootApp();
      } else {
        if (errEl) errEl.style.display = '';
        document.getElementById('auth-pass').value = '';
        document.getElementById('auth-pass').focus();
      }
    });
  }

  /* ── Settings ──────────────────────────────────────────── */

  var SETTINGS_KEY = 'mp_admin_settings';

  var DEFAULT_TICKER = [
    'FREE SHIPPING ON ORDERS OVER € 100',
    'NEW COLLECTION JUST DROPPED',
    'LIMITED STOCK — SHOP NOW',
    'FREE RETURNS WITHIN 30 DAYS',
    'EXCLUSIVE MEMBERS-ONLY DROPS'
  ];

  function loadAdminSettings() {
    return storage.get(SETTINGS_KEY, {
      storeName:    'Markus Pro',
      supportEmail: '',
      phone:        '',
      currency:     '€',
      freeShipping: '100',
      tickerItems:  DEFAULT_TICKER.slice()
    });
  }

  function renderTickerList(items) {
    var list = document.getElementById('ticker-items-list');
    if (!list) return;
    list.innerHTML = '';
    (items || []).forEach(function (text, idx) {
      var row = document.createElement('div');
      row.className = 'ticker-admin-item';
      row.innerHTML =
        '<span class="ticker-admin-item-text">' + escHtml(text) + '</span>'
        + '<button class="ticker-admin-remove" data-idx="' + idx + '" title="Remove">&times;</button>';
      list.appendChild(row);
    });
  }

  function renderSettings() {
    var s = loadAdminSettings();
    function fill(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; }
    fill('set-store-name',    s.storeName);
    fill('set-support-email', s.supportEmail);
    fill('set-phone',         s.phone);
    fill('set-currency',      s.currency);
    fill('set-free-shipping', s.freeShipping);
    var tickerSaved = storage.get('mp_ticker', null);
    renderTickerList(Array.isArray(tickerSaved) && tickerSaved.length ? tickerSaved : DEFAULT_TICKER.slice());
  }

  function bindSettings() {
    var btnStore = document.getElementById('btn-save-store-info');
    if (btnStore) btnStore.addEventListener('click', function () {
      var s = loadAdminSettings();
      s.storeName    = (document.getElementById('set-store-name')    || {}).value || '';
      s.supportEmail = (document.getElementById('set-support-email') || {}).value || '';
      s.phone        = (document.getElementById('set-phone')         || {}).value || '';
      storage.set(SETTINGS_KEY, s);
      showToast('Store info saved', '✓');
    });

    var btnPass = document.getElementById('btn-save-admin-pass');
    if (btnPass) btnPass.addEventListener('click', function () {
      var p1 = (document.getElementById('set-admin-pass')  || {}).value || '';
      var p2 = (document.getElementById('set-admin-pass2') || {}).value || '';
      if (!p1) { showToast('Enter a new password', '⚠'); return; }
      if (p1 !== p2) { showToast('Passwords do not match', '⚠'); return; }
      if (p1.length < 6) { showToast('Password must be at least 6 characters', '⚠'); return; }
      sessionStorage.setItem(SESSION_KEY, p1);
      showToast('Password updated for this session', '✓');
      document.getElementById('set-admin-pass').value  = '';
      document.getElementById('set-admin-pass2').value = '';
    });

    var btnOrder = document.getElementById('btn-save-order-settings');
    if (btnOrder) btnOrder.addEventListener('click', function () {
      var s = loadAdminSettings();
      s.currency     = (document.getElementById('set-currency')     || {}).value || '€';
      s.freeShipping = (document.getElementById('set-free-shipping') || {}).value || '100';
      storage.set(SETTINGS_KEY, s);
      showToast('Order settings saved', '✓');
    });

    var btnExOrd = document.getElementById('btn-export-orders');
    if (btnExOrd) btnExOrd.addEventListener('click', exportOrders);

    /* ── Ticker ── */
    var TICKER_KEY = 'mp_ticker';

    function getTickerItems() {
      var items = storage.get(TICKER_KEY, null);
      return Array.isArray(items) ? items : DEFAULT_TICKER.slice();
    }

    function saveTickerItems(items) {
      storage.set(TICKER_KEY, items);
    }

    var tickerList = document.getElementById('ticker-items-list');
    if (tickerList) {
      tickerList.addEventListener('click', function (e) {
        var btn = e.target.closest('.ticker-admin-remove');
        if (!btn) return;
        var items = getTickerItems();
        items.splice(Number(btn.dataset.idx), 1);
        saveTickerItems(items);
        renderTickerList(items);
      });
    }

    var btnTickerAdd = document.getElementById('btn-ticker-add');
    if (btnTickerAdd) btnTickerAdd.addEventListener('click', function () {
      var input = document.getElementById('ticker-new-item');
      var text = (input ? input.value.trim().toUpperCase() : '');
      if (!text) return;
      var items = getTickerItems();
      items.push(text);
      saveTickerItems(items);
      renderTickerList(items);
      if (input) input.value = '';
      showToast('Added to ticker', '✓');
    });

    /* Enter key support */
    var tickerInput = document.getElementById('ticker-new-item');
    if (tickerInput) tickerInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (btnTickerAdd) btnTickerAdd.click(); }
    });

    var btnSaveTicker = document.getElementById('btn-save-ticker');
    if (btnSaveTicker) btnSaveTicker.addEventListener('click', function () {
      /* Also add pending input text if any */
      var input = document.getElementById('ticker-new-item');
      if (input && input.value.trim()) {
        var text = input.value.trim().toUpperCase();
        var items = getTickerItems();
        items.push(text);
        saveTickerItems(items);
        renderTickerList(items);
        input.value = '';
      }
      showToast('Ticker saved — reload the main page to see changes', '✓');
    });
  }

  function exportOrders() {
    if (!state.orders.length) { showToast('No orders to export', '⚠'); return; }
    var rows = [['Order ID','Date','Customer','Email','Total','Status']];
    state.orders.forEach(function (o) {
      rows.push([
        o.id,
        o.created_at ? new Date(o.created_at).toLocaleDateString() : '',
        o.customer_name  || '',
        o.customer_email || '',
        o.total || '',
        o.status || ''
      ]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function bindApp() {
    var logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);

    var toggle  = document.getElementById('admin-menu-toggle');
    var sidebar = document.getElementById('admin-sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (toggle)  toggle.addEventListener('click',  function () { sidebar.classList.toggle('is-open'); overlay.classList.toggle('is-visible'); });
    if (overlay) overlay.addEventListener('click', function () { sidebar.classList.remove('is-open'); overlay.classList.remove('is-visible'); });

    document.querySelectorAll('.admin-nav-item[data-section]').forEach(function (b) {
      b.addEventListener('click', function () { navigateTo(this.dataset.section); });
    });

    var addBtn = document.getElementById('btn-add-product');
    if (addBtn) addBtn.addEventListener('click', function () { openProductModal(null); });

    var searchEl = document.getElementById('product-search');
    if (searchEl) {
      var dSearch = debounce(function () { state.search = searchEl.value; state.page = 1; renderProducts(); }, 280);
      searchEl.addEventListener('input', dSearch);
    }

    var filterEl = document.getElementById('product-filter-cat');
    if (filterEl) filterEl.addEventListener('change', function () { state.filterCat = this.value; state.page = 1; renderProducts(); });

    var sortEl = document.getElementById('product-sort');
    if (sortEl) sortEl.addEventListener('change', function () {
      var parts = this.value.split('-');
      state.sortKey = parts[0]; state.sortDir = parts[1] || 'asc'; state.page = 1; renderProducts();
    });

    var checkAll = document.getElementById('check-all');
    if (checkAll) {
      checkAll.addEventListener('change', function () {
        var page = getFiltered().slice((state.page - 1) * state.perPage, state.page * state.perPage);
        page.forEach(function (p) { if (checkAll.checked) state.selected.add(p.id); else state.selected.delete(p.id); });
        renderProducts();
      });
    }

    var tbody = document.getElementById('products-tbody');
    if (tbody) {
      tbody.addEventListener('change', function (e) {
        var cb = e.target;
        if (cb.classList.contains('row-check')) {
          var id = parseInt(cb.dataset.id, 10);
          if (cb.checked) state.selected.add(id); else state.selected.delete(id);
          updateBulkBar(); syncCheckAll(getFiltered());
        }
      });
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = parseInt(btn.dataset.id, 10);
        if (btn.dataset.action === 'edit')   openProductModal(id);
        if (btn.dataset.action === 'delete') deleteProduct(id);
      });
    }

    var bulkClear = document.getElementById('bulk-clear');
    if (bulkClear) bulkClear.addEventListener('click', function () { state.selected.clear(); renderProducts(); });
    document.querySelectorAll('[data-bulk]').forEach(function (b) {
      b.addEventListener('click', function () { doBulkAction(this.dataset.bulk); });
    });

    var pag = document.getElementById('products-pagination');
    if (pag) pag.addEventListener('click', function (e) {
      var b = e.target.closest('.page-btn');
      if (b) { state.page = parseInt(b.dataset.page, 10); renderProducts(); }
    });

    var mClose  = document.getElementById('modal-close');
    var mCancel = document.getElementById('modal-cancel');
    var mSave   = document.getElementById('modal-save');
    if (mClose)  mClose.addEventListener('click',  closeProductModal);
    if (mCancel) mCancel.addEventListener('click', closeProductModal);
    if (mSave)   mSave.addEventListener('click',   saveProduct);

    var pModal = document.getElementById('product-modal');
    if (pModal) pModal.addEventListener('click', function (e) { if (e.target === pModal) closeProductModal(); });

    document.querySelectorAll('.form-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(this.dataset.tab); });
    });

    var pForm = document.getElementById('product-form');
    if (pForm) {
      pForm.elements['category'].addEventListener('change', function () {
        var p = state.editId ? state.products.find(function (x) { return x.id === state.editId; }) : null;
        buildSizesGrid(this.value, p ? (p.sizes || []) : [], p ? (p.soldOut || []) : []);
      });

      pForm.elements['image'].addEventListener('input', function () {
        var url  = this.value.trim();
        var prev = document.getElementById('img-preview-main');
        var ph   = document.getElementById('img-preview-placeholder');
        if (url) { if (prev) { prev.src = url; prev.style.display = ''; } if (ph) ph.style.display = 'none'; }
        else     { if (prev) { prev.style.display = 'none'; prev.src = ''; } if (ph) ph.style.display = ''; }
      });

      /* ── Image upload zone ── */
      initUploadZone(pForm);

      var upd = function () {
        updatePricePreview(
          pForm.elements['price'].value         || null,
          pForm.elements['originalPrice'].value || null,
          pForm.elements['tag'].value
        );
      };
      pForm.elements['price'].addEventListener('input',         upd);
      pForm.elements['originalPrice'].addEventListener('input', upd);
      pForm.elements['tag'].addEventListener('change',          upd);
    }

    var cOk  = document.getElementById('confirm-ok');
    var cCan = document.getElementById('confirm-cancel');
    if (cOk)  cOk.addEventListener('click',  function () { if (confirmCallback) confirmCallback(); closeConfirm(); });
    if (cCan) cCan.addEventListener('click', closeConfirm);
    var cModal = document.getElementById('confirm-modal');
    if (cModal) cModal.addEventListener('click', function (e) { if (e.target === cModal) closeConfirm(); });

    var ot = document.getElementById('orders-tbody');
    if (ot) {
      ot.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action="view-order"]');
        if (btn) viewOrder(btn.dataset.orderId);
      });
      ot.addEventListener('change', function (e) {
        var sel = e.target;
        if (sel.classList.contains('status-select')) {
          var newStatus = sel.value;
          var ordId     = sel.dataset.orderId;
          api('PUT', 'orders/' + ordId, { status: newStatus }).then(function () {
            var o = state.orders.find(function (x) { return x.id === ordId; });
            if (o) o.status = newStatus;
            sel.className = 'status-select status-select--' + (STATUS_CSS[newStatus] || 'warning');
            showToast('Order status updated', 'success');
          }).catch(function (err) { showToast('Update failed: ' + err.message, 'error'); });
        }
      });
    }

    var genBtn = document.getElementById('btn-gen-orders');
    if (genBtn) genBtn.addEventListener('click', generateMockOrders);

    var om  = document.getElementById('order-modal');
    var oc1 = document.getElementById('order-modal-close');
    var oc2 = document.getElementById('order-modal-close2');
    if (oc1) oc1.addEventListener('click', closeOrderModal);
    if (oc2) oc2.addEventListener('click', closeOrderModal);
    if (om)  om.addEventListener('click', function (e) { if (e.target === om) closeOrderModal(); });

    var ad = document.getElementById('btn-apply-discount');
    var rd = document.getElementById('btn-remove-discount');
    var ab = document.getElementById('btn-apply-badge');
    var rb = document.getElementById('btn-remove-badge');
    if (ad) ad.addEventListener('click', applyDiscount);
    if (rd) rd.addEventListener('click', removeDiscount);
    if (ab) ab.addEventListener('click', applyBadge);
    if (rb) rb.addEventListener('click', clearBadges);

    var fl = document.getElementById('featured-list');
    if (fl) {
      fl.addEventListener('change', function (e) {
        var cb = e.target;
        if (cb.dataset.action === 'toggle-feature') {
          var id = parseInt(cb.dataset.id, 10);
          var p  = state.products.find(function (x) { return x.id === id; });
          if (p) {
            p.featured = cb.checked;
            api('PUT', 'products/' + id, { featured: p.featured }).then(function () {
              showToast(p.name + (cb.checked ? ' added to featured' : ' removed from featured'), 'success');
            });
          }
        }
      });
    }


    document.querySelectorAll('.quick-btn[data-action], .settings-actions [data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = this.dataset.action;
        if (action === 'add-product')   { navigateTo('products'); openProductModal(null); }
        if (action === 'go-promotions') navigateTo('promotions');
        if (action === 'go-orders')     navigateTo('orders');
        if (action === 'export')        doExport();
      });
    });

    bindSettings();

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (document.getElementById('product-modal').style.display !== 'none') closeProductModal();
      if (document.getElementById('confirm-modal').style.display !== 'none') closeConfirm();
      if (document.getElementById('order-modal').style.display   !== 'none') closeOrderModal();
    });
  }

  /* ── Boot ──────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
