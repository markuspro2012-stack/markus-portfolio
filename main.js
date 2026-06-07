/* ============================================================
   MARKUS PORTFOLIO — main.js
   ============================================================ */

/* === NAV: scroll class + mobile menu === */

const nav      = document.getElementById('nav');
const burger   = document.getElementById('navBurger');
const mobileMenu = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

burger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav-mobile a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
    });
});

/* Close mobile menu on outside click */
document.addEventListener('click', (e) => {
    if (mobileMenu.classList.contains('open') &&
        !nav.contains(e.target)) {
        mobileMenu.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
    }
});

/* Nav logo → scroll to top */
document.querySelector('.nav-logo').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.querySelector('.nav-logo').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

/* === REVEAL on scroll === */

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        el.classList.add('visible');

        if (el.classList.contains('skill-card')) {
            /* Delay the bar animation slightly after card appears */
            setTimeout(() => el.classList.add('bar-animate'), 280);
        }

        revealObserver.unobserve(el);
    });
}, {
    threshold: 0.12,
    rootMargin: '0px 0px -48px 0px'
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* === CONTACT FORM === */

const form      = document.getElementById('contactForm');
const toast     = document.getElementById('toast');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    /* Loading state */
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style="animation: spin 0.8s linear infinite">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Sending...
    `;

    /* Simulate async send */
    setTimeout(() => {
        form.reset();
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;
        clearErrors();
        showToast();
    }, 1300);
});

function validateForm() {
    clearErrors();
    let valid = true;

    const name    = form.querySelector('#name');
    const email   = form.querySelector('#email');
    const message = form.querySelector('#message');

    if (!name.value.trim()) {
        showError(name, 'Please enter your name');
        valid = false;
    }

    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        showError(email, 'Please enter a valid email');
        valid = false;
    }

    if (!message.value.trim() || message.value.trim().length < 10) {
        showError(message, 'Please describe your project (min 10 chars)');
        valid = false;
    }

    return valid;
}

function showError(input, msg) {
    input.style.borderColor = '#f87171';

    const err = document.createElement('span');
    err.className = 'field-error';
    err.textContent = msg;
    err.style.cssText = 'display:block;color:#f87171;font-size:0.78rem;margin-top:5px;';
    input.parentNode.appendChild(err);
}

function clearErrors() {
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('input, textarea').forEach(el => {
        el.style.borderColor = '';
    });
}

/* Re-clear error on input */
form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
        el.style.borderColor = '';
        const err = el.parentNode.querySelector('.field-error');
        if (err) err.remove();
    });
});

let toastTimer;

function showToast() {
    clearTimeout(toastTimer);
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
}

/* Dismiss toast on click */
toast.addEventListener('click', () => {
    clearTimeout(toastTimer);
    toast.classList.remove('show');
});

/* === CSS spin keyframe (injected once) === */
const spinStyle = document.createElement('style');
spinStyle.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(spinStyle);
