/* ==========================================================================
   Beacon Legacy — interactions
   Mobile Navigation · Smooth Navigation · Scroll Reveal · Hero/About 3D
   Interaction · Service Card Interaction · Form Validation
   ========================================================================== */
(function () {
    'use strict';

    // Set this to your form handler (CRM webhook, serverless function, etc.).
    // While empty, a valid submission shows the success state without sending.
    const FORM_ENDPOINT = '';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mobileNavQuery = window.matchMedia('(max-width: 768px)');

    const canTilt = () => finePointer.matches && !reducedMotion.matches;

    /* ---------------------------------------------------------------------
       Mobile Navigation
       --------------------------------------------------------------------- */
    function initMobileNav() {
        const toggle = document.getElementById('nav-toggle');
        const nav = document.getElementById('primary-nav');
        const backdrop = document.getElementById('nav-backdrop');
        const outside = [document.getElementById('main'), document.querySelector('.site-footer')];
        if (!toggle || !nav || !backdrop) return null;

        let isOpen = false;

        function setOpen(open, { returnFocus = false } = {}) {
            if (open === isOpen) return;
            isOpen = open;

            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            nav.classList.toggle('is-open', open);
            document.body.classList.toggle('nav-open', open);
            outside.forEach((el) => { if (el) el.inert = open; });

            if (open) {
                backdrop.hidden = false;
                requestAnimationFrame(() => backdrop.classList.add('is-visible'));
                const firstLink = nav.querySelector('a');
                if (firstLink) firstLink.focus({ preventScroll: true });
            } else {
                backdrop.classList.remove('is-visible');
                window.setTimeout(() => { if (!isOpen) backdrop.hidden = true; }, 280);
                if (returnFocus) toggle.focus();
            }
        }

        toggle.addEventListener('click', () => setOpen(!isOpen));
        backdrop.addEventListener('click', () => setOpen(false));

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isOpen) setOpen(false, { returnFocus: true });
        });

        // Leaving the mobile layout always resets the drawer.
        mobileNavQuery.addEventListener('change', (event) => {
            if (!event.matches) setOpen(false);
        });

        return { close: () => setOpen(false) };
    }

    /* ---------------------------------------------------------------------
       Smooth Navigation (+ active link state)
       --------------------------------------------------------------------- */
    function initSmoothNav(mobileNav) {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href^="#"]');
            if (!link) return;

            const id = link.getAttribute('href').slice(1);
            const target = id ? document.getElementById(id) : null;
            if (!target) return;

            event.preventDefault();
            if (mobileNav) mobileNav.close();

            target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
            history.pushState(null, '', id === 'home' ? location.pathname + location.search : '#' + id);

            // Move focus for keyboard and screen reader users without jumping.
            if (link.classList.contains('skip-link') || !link.closest('.site-header, .site-footer, .hero-actions')) return;
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        });

        const links = Array.from(document.querySelectorAll('.nav-link'));
        const sections = links
            .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
            .filter(Boolean);
        if (!('IntersectionObserver' in window) || !sections.length) return;

        const setActive = (id) => {
            links.forEach((link) => {
                const active = link.getAttribute('href') === '#' + id;
                link.classList.toggle('is-active', active);
                if (active) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        sections.forEach((section) => observer.observe(section));
    }

    /* ---------------------------------------------------------------------
       Scroll Reveal
       --------------------------------------------------------------------- */
    function initScrollReveal() {
        const items = document.querySelectorAll('[data-reveal]');
        if (!items.length || !('IntersectionObserver' in window)) return;

        document.documentElement.classList.add('reveal-ready');

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

        items.forEach((item) => observer.observe(item));
    }

    /* ---------------------------------------------------------------------
       Hero / About 3D Interaction
       Writes normalised pointer values (-1…1) to --px / --py; CSS turns them
       into a few degrees of rotation and a few pixels of parallax.
       --------------------------------------------------------------------- */
    function initTilt(area) {
        const scene = area && area.querySelector('.tilt-scene');
        if (!scene) return;

        const current = { x: 0, y: 0 };
        const goal = { x: 0, y: 0 };
        let rect = null;
        let frame = 0;

        function render() {
            current.x += (goal.x - current.x) * 0.1;
            current.y += (goal.y - current.y) * 0.1;

            const settled = Math.abs(goal.x - current.x) < 0.001 && Math.abs(goal.y - current.y) < 0.001;
            if (settled) {
                current.x = goal.x;
                current.y = goal.y;
            }

            scene.style.setProperty('--px', current.x.toFixed(4));
            scene.style.setProperty('--py', current.y.toFixed(4));
            frame = settled ? 0 : requestAnimationFrame(render);
        }

        const start = () => { if (!frame) frame = requestAnimationFrame(render); };
        const clamp = (value) => Math.max(-1, Math.min(1, value));

        area.addEventListener('pointerenter', () => {
            rect = area.getBoundingClientRect();
        });

        area.addEventListener('pointermove', (event) => {
            if (!canTilt() || event.pointerType !== 'mouse') return;
            if (!rect) rect = area.getBoundingClientRect();
            goal.x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
            goal.y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
            start();
        });

        area.addEventListener('pointerleave', () => {
            rect = null;
            goal.x = 0;
            goal.y = 0;
            start();
        });

        // Bounding box changes on scroll/resize; re-measure on next move.
        window.addEventListener('scroll', () => { rect = null; }, { passive: true });
    }

    /* ---------------------------------------------------------------------
       Service Card Interaction (max 3° tilt, lift handled in CSS)
       --------------------------------------------------------------------- */
    function initServiceCards() {
        const cards = document.querySelectorAll('.service-card');
        const MAX = 3;

        cards.forEach((card) => {
            let frame = 0;
            let point = null;

            function update() {
                frame = 0;
                if (!point) return;
                const rect = card.getBoundingClientRect();
                const x = (point.x - rect.left) / rect.width - 0.5;
                const y = (point.y - rect.top) / rect.height - 0.5;
                card.style.setProperty('--ry', (x * MAX * 2).toFixed(2) + 'deg');
                card.style.setProperty('--rx', (-y * MAX * 2).toFixed(2) + 'deg');
            }

            card.addEventListener('pointermove', (event) => {
                if (!canTilt() || event.pointerType !== 'mouse') return;
                point = { x: event.clientX, y: event.clientY };
                card.classList.add('is-tilting');
                if (!frame) frame = requestAnimationFrame(update);
            });

            card.addEventListener('pointerleave', () => {
                point = null;
                card.classList.remove('is-tilting');
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* ---------------------------------------------------------------------
       Form Validation
       --------------------------------------------------------------------- */
    function initContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        const success = document.getElementById('contact-success');
        const status = document.getElementById('contact-form-status');
        const submit = document.getElementById('contact-submit');
        const submitLabel = submit.querySelector('.form-submit-label');

        const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]*$/;
        const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        const digitsOf = (value) => value.replace(/\D/g, '');
        const phoneDigits = (value) => {
            const digits = digitsOf(value);
            return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
        };

        const rules = {
            'contact-first-name': (field) => {
                const value = field.value.trim();
                if (!value) return 'Please enter your first name.';
                if (!NAME_RE.test(value)) return 'Please use letters only.';
                return '';
            },
            'contact-last-name': (field) => {
                const value = field.value.trim();
                if (!value) return 'Please enter your last name.';
                if (!NAME_RE.test(value)) return 'Please use letters only.';
                return '';
            },
            'contact-phone': (field) => {
                const digits = phoneDigits(field.value);
                if (!digits) return 'Please enter your phone number.';
                if (digits.length !== 10 || /^[01]/.test(digits)) return 'Please enter a valid 10-digit US phone number.';
                return '';
            },
            'contact-email': (field) => {
                const value = field.value.trim();
                if (!value) return 'Please enter your email address.';
                if (!EMAIL_RE.test(value)) return 'Please enter a valid email address.';
                return '';
            },
            'contact-state': (field) => (field.value ? '' : 'Please select your state.'),
            'contact-zip': (field) => {
                const value = field.value.trim();
                if (!value) return 'Please enter your ZIP code.';
                if (!/^\d{5}$/.test(value)) return 'Please enter a valid 5-digit ZIP code.';
                return '';
            },
            'contact-tcpa': (field) => (field.checked ? '' : 'Please check the box to give consent.')
        };

        const fields = Object.keys(rules).map((id) => document.getElementById(id));
        const touched = new Set();

        function validateField(field) {
            const message = rules[field.id](field);
            const wrapper = field.closest('.form-field, .tcpa-wrap');
            const error = document.getElementById(field.id + '-error');

            wrapper.classList.toggle('is-invalid', Boolean(message));
            field.setAttribute('aria-invalid', message ? 'true' : 'false');
            if (error) error.textContent = message;
            return !message;
        }

        function formatPhone(value) {
            const digits = phoneDigits(value).slice(0, 10);
            if (digits.length < 4) return digits;
            if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        // One delegated listener per event type for the whole form.
        form.addEventListener('input', (event) => {
            const field = event.target;
            if (!rules[field.id]) return;

            if (field.id === 'contact-zip') field.value = digitsOf(field.value).slice(0, 5);
            if (field.id === 'contact-phone' && event.inputType !== 'deleteContentBackward') {
                field.value = formatPhone(field.value);
            }
            if (touched.has(field.id)) validateField(field);
            if (status.textContent) status.textContent = '';
        });

        form.addEventListener('change', (event) => {
            const field = event.target;
            if (!rules[field.id]) return;
            touched.add(field.id);
            validateField(field);
        });

        form.addEventListener('focusout', (event) => {
            const field = event.target;
            if (!rules[field.id] || field.type === 'checkbox') return;
            if (field.value.trim() || touched.has(field.id)) {
                touched.add(field.id);
                validateField(field);
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (submit.disabled) return;

            fields.forEach((field) => touched.add(field.id));
            const invalid = fields.filter((field) => !validateField(field));

            if (invalid.length) {
                status.textContent = invalid.length === 1
                    ? 'Please correct the highlighted field.'
                    : `Please correct the ${invalid.length} highlighted fields.`;
                invalid[0].focus();
                return;
            }

            status.textContent = '';
            submit.disabled = true;
            submit.classList.add('is-loading');
            submitLabel.textContent = 'Sending…';

            try {
                if (FORM_ENDPOINT) {
                    const response = await fetch(FORM_ENDPOINT, {
                        method: 'POST',
                        headers: { Accept: 'application/json' },
                        body: new FormData(form)
                    });
                    if (!response.ok) throw new Error('Request failed: ' + response.status);
                } else {
                    await new Promise((resolve) => window.setTimeout(resolve, 600));
                }

                form.hidden = true;
                success.hidden = false;
                success.focus();
            } catch (error) {
                status.textContent = 'Something went wrong. Please try again in a moment.';
            } finally {
                submit.disabled = false;
                submit.classList.remove('is-loading');
                submitLabel.textContent = 'Get a Quote';
            }
        });
    }

    /* ---------------------------------------------------------------------
       Init
       --------------------------------------------------------------------- */
    const mobileNav = initMobileNav();
    initSmoothNav(mobileNav);
    initScrollReveal();
    initTilt(document.getElementById('hero-visual'));
    initTilt(document.getElementById('about-visual'));
    initServiceCards();
    initContactForm();
})();
