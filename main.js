/* === PROJECT OVERLAY === */

const overlay      = document.getElementById('projOverlay');
const overlayBack  = document.getElementById('overlayBack');
const overlayTitle = document.getElementById('overlayTitle');
const overlayExt   = document.getElementById('overlayExt');
const overlayFrame = document.getElementById('overlayFrame');
const overlayLoader= document.getElementById('overlayLoader');

const projectMeta = {
    fatcal:    { title: 'FatCalories Bot',          src: 'projects/fatcal/',    ext: null,                                   phone: true },
    fatbot:    { title: 'FatBot Mini App',          src: 'projects/fatbot/',    ext: 'https://fatbot-0xxn.onrender.com',     phone: true },
    markuspro: { title: 'Markus Pro Shop',          src: 'projects/markuspro/', ext: null,                                   phone: false },
    ordersys:  { title: 'Order Management System',  src: 'projects/ordersys/',  ext: null,                                   phone: false },
};

const overlayBody = overlay.querySelector('.overlay-body');

document.querySelectorAll('.proj-item[data-project]').forEach(item => {
    item.querySelector('.proj-card').addEventListener('click', () => {
        openProject(item.dataset.project);
    });
    item.querySelector('.proj-title').style.cursor = 'pointer';
    item.querySelector('.proj-title').addEventListener('click', () => {
        openProject(item.dataset.project);
    });
    const exploreLink = item.querySelector('.proj-link');
    if (exploreLink) {
        exploreLink.addEventListener('click', e => {
            e.preventDefault();
            openProject(item.dataset.project);
        });
    }
});

function openProject(id) {
    const data = projectMeta[id];
    if (!data) return;

    overlayTitle.textContent = data.title;
    overlayLoader.classList.remove('fade-out');
    overlayFrame.classList.remove('loaded');
    overlayFrame.src = '';

    if (data.ext) {
        overlayExt.href = data.ext;
        overlayExt.classList.remove('hide');
    } else {
        overlayExt.classList.add('hide');
    }

    overlayBody.classList.toggle('phone-mode', !!data.phone);

    overlay.classList.add('opening');
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    });

    setTimeout(() => { overlayFrame.src = data.src; }, 200);
}

function closeProject() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
        overlay.classList.remove('opening');
        overlayBody.classList.remove('phone-mode');
        overlayFrame.src = '';
        overlayFrame.classList.remove('loaded');
        overlayLoader.classList.remove('fade-out');
    }, 600);
}

overlayFrame.addEventListener('load', () => {
    overlayLoader.classList.add('fade-out');
    overlayFrame.classList.add('loaded');
});

overlayBack.addEventListener('click', closeProject);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeProject();
});

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
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
    });
}, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* === CONTACT FORM === */

const form      = document.getElementById('contactForm');
const toast     = document.getElementById('toast');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) return;
    const orig = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    try {
        const res = await fetch('https://formsubmit.co/ajax/markuspro2012@gmail.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                name:    form.querySelector('#name').value,
                email:   form.querySelector('#email').value,
                service: form.querySelector('#service').value,
                message: form.querySelector('#message').value,
            })
        });
        const json = await res.json();
        if (json.success === 'true' || json.success === true) {
            form.reset();
            clearErrors();
            showToast();
        } else {
            throw new Error('send failed');
        }
    } catch {
        alert('Could not send the message. Please contact me directly:\nTelegram: @markus_dev1\nEmail: markuspro2012@gmail.com');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = orig;
    }
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
    el.style.borderColor = '#ef4444';
    const e = document.createElement('span');
    e.className = 'field-err';
    e.textContent = msg;
    e.style.cssText = 'display:block;color:#ef4444;font-size:0.75rem;margin-top:5px;font-weight:500;';
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
