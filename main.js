/* ============================================================
   MARKUS PORTFOLIO — NEOBRUTALISM — main.js
   ============================================================ */

/* === NAV === */

const nav    = document.getElementById('nav');
const burger = document.getElementById('burger');
const drawer = document.getElementById('navDrawer');

window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

burger.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav-drawer a').forEach(a => {
    a.addEventListener('click', () => {
        drawer.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
    });
});

document.addEventListener('click', e => {
    if (drawer.classList.contains('open') && !nav.contains(e.target)) {
        drawer.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
    }
});

/* === SCROLL REVEAL === */

const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('visible');
        if (el.classList.contains('skill-card')) {
            setTimeout(() => el.classList.add('bar-animate'), 300);
        }
        revealObs.unobserve(el);
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* === CONTACT FORM === */

const form      = document.getElementById('contactForm');
const toast     = document.getElementById('toast');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;

    const orig = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'SENDING...';

    setTimeout(() => {
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = orig;
        clearErrors();
        showToast();
    }, 1300);
});

function validate() {
    clearErrors();
    let ok = true;

    const name    = form.querySelector('#name');
    const email   = form.querySelector('#email');
    const message = form.querySelector('#message');

    if (!name.value.trim())
        { markError(name, 'Name required'); ok = false; }

    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
        { markError(email, 'Valid email required'); ok = false; }

    if (message.value.trim().length < 10)
        { markError(message, 'Min 10 characters'); ok = false; }

    return ok;
}

function markError(el, msg) {
    el.style.borderColor = '#FF3B3B';
    const e = document.createElement('span');
    e.className = 'field-err';
    e.textContent = msg;
    e.style.cssText = 'display:block;color:#FF3B3B;font-size:0.65rem;letter-spacing:0.08em;margin-top:5px;font-weight:700;';
    el.parentNode.appendChild(e);
}

function clearErrors() {
    form.querySelectorAll('.field-err').forEach(el => el.remove());
    form.querySelectorAll('input,textarea').forEach(el => el.style.borderColor = '');
}

form.querySelectorAll('input,textarea').forEach(el => {
    el.addEventListener('input', () => {
        el.style.borderColor = '';
        el.parentNode.querySelector('.field-err')?.remove();
    });
});

let toastTimer;

function showToast() {
    clearTimeout(toastTimer);
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
}

toast.addEventListener('click', () => {
    clearTimeout(toastTimer);
    toast.classList.remove('show');
});
