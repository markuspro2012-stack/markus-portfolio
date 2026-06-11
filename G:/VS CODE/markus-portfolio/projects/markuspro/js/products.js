/* ============================================================
   MARKUS PRO — Product Catalog
   DEFAULT_PRODUCTS = hardcoded fallback.
   PRODUCTS         = localStorage first, fallback to defaults.
   Admin writes to localStorage 'mp_products'; main site reads PRODUCTS.
============================================================ */

var DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'Core Tech Tee',
    category: 'tshirts',
    categoryLabel: 'T-Shirts',
    price: 29,
    originalPrice: null,
    tag: 'new',
    image: 'https://picsum.photos/seed/mp-t1/600/750',
    images: [
      'https://picsum.photos/seed/mp-t1/800/1000',
      'https://picsum.photos/seed/mp-t1b/800/1000',
      'https://picsum.photos/seed/mp-t1c/800/1000'
    ],
    sizes: ['XS','S','M','L','XL'],
    soldOut: [],
    featured: true,
    active: true,
    description: 'Heavyweight 280gsm organic cotton tee. Dropped shoulders, minimal chest embroidery. Oversized silhouette built for everyday movement.',
    details: '100% Organic Cotton, 280gsm. Garment washed for soft hand feel. Relaxed oversized fit. True to size.',
    shipping: 'Free shipping on orders over €100. Delivery 2–5 working days.',
    returns: 'Free returns within 14 days. Item must be in original condition with tags.',
    sku: 'MP-T-001', collection: 'SS26'
  },
  {
    id: 2,
    name: 'Void Cargo Pants',
    category: 'pants',
    categoryLabel: 'Pants',
    price: 79,
    originalPrice: null,
    tag: 'hot',
    image: 'https://picsum.photos/seed/mp-p1/600/750',
    images: [
      'https://picsum.photos/seed/mp-p1/800/1000',
      'https://picsum.photos/seed/mp-p1b/800/1000'
    ],
    sizes: ['XS','S','M','L','XL'],
    soldOut: ['XS'],
    featured: true,
    active: true,
    description: 'Technical cargo with articulated knees and 8 pockets. Adjustable hem cuffs. Built for urban utility.',
    details: '98% Cotton, 2% Elastane. Ripstop weave. Relaxed tapered fit.',
    shipping: 'Free shipping on orders over €100. Delivery 2–5 working days.',
    returns: 'Free returns within 14 days.',
    sku: 'MP-P-001', collection: 'SS26'
  },
  {
    id: 3,
    name: 'Pulse Runner Low',
    category: 'sneakers',
    categoryLabel: 'Sneakers',
    price: 129,
    originalPrice: null,
    tag: 'new',
    image: 'https://picsum.photos/seed/mp-s1/600/750',
    images: [
      'https://picsum.photos/seed/mp-s1/800/1000',
      'https://picsum.photos/seed/mp-s1b/800/1000',
      'https://picsum.photos/seed/mp-s1c/800/1000'
    ],
    sizes: ['39','40','41','42','43','44','45'],
    soldOut: ['44','45'],
    featured: true,
    active: true,
    description: 'Low-profile runner with EVA foam midsole. Premium mesh upper with suede overlays. Reinforced toe cap.',
    details: 'Upper: Technical mesh + suede. Midsole: EVA foam. Outsole: Rubber. True to size.',
    shipping: 'Free shipping on orders over €100. Delivery 2–5 working days.',
    returns: 'Free returns within 14 days.',
    sku: 'MP-SH-001', collection: 'SS26'
  },
  {
    id: 4,
    name: 'Signal Crew Sock 3-Pack',
    category: 'socks',
    categoryLabel: 'Socks',
    price: 15,
    originalPrice: null,
    tag: null,
    image: 'https://picsum.photos/seed/mp-sk1/600/750',
    images: [
      'https://picsum.photos/seed/mp-sk1/800/1000'
    ],
    sizes: ['S (36-39)','M (40-43)','L (44-46)'],
    soldOut: [],
    featured: true,
    active: true,
    description: 'Ribbed crew socks with contrast branding. Cushioned sole. 3-pack in signature colourway.',
    details: '78% Cotton, 20% Polyamide, 2% Elastane.',
    shipping: 'Free shipping on orders over €100.',
    returns: 'Free returns within 14 days.',
    sku: 'MP-SK-001', collection: 'SS26'
  },
  {
    id: 5,
    name: 'Ghost Oversized Tee',
    category: 'tshirts',
    categoryLabel: 'T-Shirts',
    price: 34,
    originalPrice: 42,
    tag: 'sale',
    image: 'https://picsum.photos/seed/mp-t2/600/750',
    images: [
      'https://picsum.photos/seed/mp-t2/800/1000',
      'https://picsum.photos/seed/mp-t2b/800/1000'
    ],
    sizes: ['XS','S','M','L','XL','2XL'],
    soldOut: [],
    featured: false,
    active: true,
    description: 'Ultra-wide boxy tee with screen-printed back graphic. Extended back hem. Pre-washed finish.',
    details: '100% Cotton, 240gsm. Oversized boxy fit. Wash inside out at 30°.',
    shipping: 'Free shipping on orders over €100.',
    returns: 'Free returns within 14 days.',
    sku: 'MP-T-002', collection: 'FW25'
  },
  {
    id: 6,
    name: 'Urban Taper Pants',
    category: 'pants',
    categoryLabel: 'Pants',
    price: 64,
    originalPrice: null,
    tag: null,
    image: 'https://picsum.photos/seed/mp-p2/600/750',
    images: [
      'https://picsum.photos/seed/mp-p2/800/1000'
    ],
    sizes: ['XS','S','M','L','XL'],
    soldOut: ['XS','S'],
    featured: false,
    active: true,
    description: 'Slim taper with elasticated waistband and zip ankles. Clean front. Versatile everyday pant.',
    details: '95% Cotton, 5% Elastane. Peached finish. Slim tapered fit.',
    shipping: 'Free shipping on orders over €100. Delivery 2–5 working days.',
    returns: 'Free returns within 14 days.',
    sku: 'MP-P-002', collection: 'FW25'
  },
  {
    id: 7,
    name: 'Mach 2 Mid Trainer',
    category: 'sneakers',
    categoryLabel: 'Sneakers',
    price: 149,
    originalPrice: null,
    tag: 'new',
    image: 'https://picsum.photos/seed/mp-s2/600/750',
    images: [
      'https://picsum.photos/seed/mp-s2/800/1000',
      'https://picsum.photos/seed/mp-s2b/800/1000'
    ],
    sizes: ['39','40','41','42','43','44','45'],
    soldOut: ['39'],
    featured: false,
    active: true,
    description: 'Mid-top trainer with neoprene collar and chunky tooling. Debossed side logo. Statement silhouette.',
    details: 'Upper: Tumbled leather + neoprene. Sole: Thermoplastic rubber. Size up half size.',
    shipping: 'Free shipping on orders over €100. Delivery 2–5 working days.',
    returns: 'Free returns within 14 days.',
    sku: 'MP-SH-002', collection: 'SS26'
  },
  {
    id: 8,
    name: 'Archive Logo Tee',
    category: 'tshirts',
    categoryLabel: 'T-Shirts',
    price: 26,
    originalPrice: null,
    tag: null,
    image: 'https://picsum.photos/seed/mp-t3/600/750',
    images: [
      'https://picsum.photos/seed/mp-t3/800/1000'
    ],
    sizes: ['XS','S','M','L','XL'],
    soldOut: [],
    featured: false,
    active: true,
    description: 'Classic fit tee with vintage archive logo at chest. Pre-washed for soft hand feel.',
    details: '100% Cotton, 200gsm. Regular fit. Wash inside out at 30°.',
    shipping: 'Free shipping on orders over €100. Delivery 2–5 working days.',
    returns: 'Free returns within 14 days.',
    sku: 'MP-T-003', collection: 'FW25'
  }
];

/* ── Supabase row → internal product format ───────────────── */

var CAT_LABEL = { tshirts: 'T-Shirts', pants: 'Pants', sneakers: 'Sneakers', socks: 'Socks' };

function normalizeProduct(row) {
  return {
    id:            Number(row.id),
    name:          row.name,
    category:      row.category,
    categoryLabel: CAT_LABEL[row.category] || row.category,
    price:         Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : null,
    tag:           row.tag || null,
    image:         row.image || ('https://picsum.photos/seed/' + row.id + '/600/750'),
    images:        [row.image || ('https://picsum.photos/seed/' + row.id + '/800/1000')],
    sizes:         Array.isArray(row.sizes) ? row.sizes : [],
    soldOut:       [],
    featured:      !!row.featured,
    active:        row.active !== false,
    description:   row.description || '',
    details:       row.details    || '',
    shipping:      'Free shipping on orders over €100. Delivery 2–5 working days.',
    returns:       'Free returns within 14 days.',
    sku:           row.sku || '',
    collection:    'SS26'
  };
}

/* ── Runtime product list ─────────────────────────────────
   Priority: Supabase (async, cached) → localStorage → DEFAULT_PRODUCTS
──────────────────────────────────────────────────────────── */

var PRODUCTS = (function () {
  /* 1. Fresh Supabase cache (max 5 min old) */
  try {
    var cacheRaw  = localStorage.getItem('mp_products_cache');
    var cacheTime = parseInt(localStorage.getItem('mp_products_cache_ts') || '0', 10);
    if (cacheRaw && (Date.now() - cacheTime) < 5 * 60 * 1000) {
      var cached = JSON.parse(cacheRaw);
      if (Array.isArray(cached) && cached.length) return cached;
    }
  } catch (e) { /* ignore */ }

  /* 2. Admin localStorage (no expiry — admin explicitly set these) */
  try {
    var adminRaw = localStorage.getItem('mp_products');
    if (adminRaw) {
      var adminParsed = JSON.parse(adminRaw);
      if (Array.isArray(adminParsed) && adminParsed.length) {
        return adminParsed.filter(function (p) { return p.active !== false; });
      }
    }
  } catch (e) { /* ignore */ }

  /* 3. Hardcoded defaults */
  return DEFAULT_PRODUCTS.slice();
}());

/* Refresh products from Supabase in the background.
   Pass callback(products) if you need fresh data immediately. */
function loadProductsAsync(callback) {
  if (!window.sb) {
    if (callback) callback(PRODUCTS);
    return;
  }
  window.sb.from('products')
    .select('*')
    .eq('active', true)
    .order('id')
    .then(function (result) {
      if (result.error || !result.data || !result.data.length) {
        if (callback) callback(PRODUCTS);
        return;
      }
      var fresh = result.data.map(normalizeProduct);
      PRODUCTS = fresh;
      try {
        localStorage.setItem('mp_products_cache',    JSON.stringify(fresh));
        localStorage.setItem('mp_products_cache_ts', String(Date.now()));
      } catch (e) { /* storage full */ }
      if (callback) callback(PRODUCTS);
    });
}

/* Background refresh (fire-and-forget) after page is interactive */
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () { loadProductsAsync(null); }, 200);
});

/* ── Helpers ──────────────────────────────────────────────── */

function getProductById(id) {
  return PRODUCTS.find(function (p) { return p.id === parseInt(id, 10); }) || null;
}

function getProductsByCategory(category) {
  if (!category || category === 'all') return PRODUCTS;
  return PRODUCTS.filter(function (p) { return p.category === category; });
}

function getFeaturedProducts() {
  return PRODUCTS.filter(function (p) { return p.featured; });
}

function getRelatedProducts(id, limit) {
  limit = limit || 4;
  var product = getProductById(id);
  if (!product) return [];
  var same  = PRODUCTS.filter(function (p) { return p.id !== parseInt(id, 10) && p.category === product.category; });
  var other = PRODUCTS.filter(function (p) { return p.id !== parseInt(id, 10) && p.category !== product.category; });
  return same.concat(other).slice(0, limit);
}
