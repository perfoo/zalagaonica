/* main-1AGj8Mvg.js — final (no calc, CSP-friendly, EmailJS + graceful fallback) */
(function () {
  'use strict';

  // ---------- Utils ----------
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // ---------- UI: header/nav/back-to-top/anchors ----------
  function initHeaderScroll() {
    const header = $('#header');
    if (!header) return;
    const onScroll = () => ((window.pageYOffset || document.documentElement.scrollTop) > 0)
      ? header.classList.add('scrolled')
      : header.classList.remove('scrolled');
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initNavToggle() {
    const btn = $('.nav-toggle');
    const nav = $('.nav__list');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('nav__list--open'));
  }

  function initBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    const toggle = () => { btn.style.display = (window.scrollY > 400) ? 'block' : 'none'; };
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function initSmoothAnchors() {
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id && id.length > 1) {
          const target = $(id);
          if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
      });
    });
  }

  // ---------- Map (iframe embed) ----------
  function initMapEmbed() {
    const map = $('#map');
    if (!map) return;
    const lat = 45.77176284790039, lng = 15.944704055786133, zoom = 15;
    const src = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng) + '&z=' + zoom + '&output=embed';
    map.innerHTML =
      '<iframe title="Lokacija - Google mapa" src="' + src +
      '" width="100%" height="420" style="border:0" loading="lazy" ' +
      'referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
  }

  // ---------- Kontakt forma ----------
  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;

    // Init EmailJS (CSP-friendly, bez inline ovisnosti)
    if (window.emailjs && typeof emailjs.init === 'function') {
      try { emailjs.init('83NbuRhmZxR_bc18Z'); } catch (e) {}
    }

    // Nabavi SERVICE/TEMPLATE ID iz više mogućih izvora (bez mijenjanja HTML-a):
    const hiddenService  = form.querySelector('input[name="service_id"]')?.value || '';
    const hiddenTemplate = form.querySelector('input[name="template_id"]')?.value || '';
    const SERVICE_ID  = form.dataset.service || window.EMAILJS_SERVICE_ID  || hiddenService  || '';
    const TEMPLATE_ID = form.dataset.template || window.EMAILJS_TEMPLATE_ID || hiddenTemplate || '';

    const submitBtn  = form.querySelector('button[type="submit"]');
    const successBox = $('#formSuccess');
    const honey      = form.querySelector('input[name="_honey"]');

    // UX: prikaži/skrivaj detalje ovisno o vrsti upita
    (function toggleDeviceDetails() {
      const group = $('#device-details-group');
      const type  = $('#inquiry-type');
      if (!group || !type) return;
      const apply = () => { group.style.display = (type.value === 'loan' || type.value === 'estimate') ? 'block' : 'none'; };
      type.addEventListener('change', apply);
      apply();
    })();

    const setLoading = on => { if (submitBtn) submitBtn.disabled = !!on; };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // honeypot
      if (honey && honey.value) return;

      // brza validacija
      const req = ['name','email','message','inquiry-type'];
      for (let i=0;i<req.length;i++) {
        const el = document.getElementById(req[i]);
        if (!el || !el.value || !el.value.trim()) { el && el.focus(); return; }
      }
      const t = $('#inquiry-type'), d = $('#device-details');
      if ((t && (t.value === 'loan' || t.value === 'estimate')) && (!d || !d.value.trim())) { d && d.focus(); return; }

      // Ako imamo EmailJS + ID-eve → šalji preko EmailJS
      const canSendViaEmailJS = window.emailjs && typeof emailjs.sendForm === 'function' && SERVICE_ID && TEMPLATE_ID;

      try {
        setLoading(true);

        if (canSendViaEmailJS) {
          await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form);
          successBox && (successBox.style.display = 'block');
          form.reset();
        } else {
          // Fallback: mailto (ne traži izmjene HTML-a)
          const to = 'info@zalagaonicazagreb.hr';
          const name = $('#name')?.value || '';
          const email = $('#email')?.value || '';
          const phone = $('#phone')?.value || '';
          const type  = $('#inquiry-type')?.value || '';
          const dev   = $('#device-details')?.value || '';
          const msg   = $('#message')?.value || '';

          const subject = encodeURIComponent('Upit s weba - ' + (type || 'Kontakt'));
          const body = encodeURIComponent(
            `Ime i prezime: ${name}\nEmail: ${email}\nTelefon: ${phone}\nVrsta upita: ${type}\nDetalji uređaja: ${dev}\n\nPoruka:\n${msg}`
          );
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
        }
      } catch (err) {
        console.error('Slanje greška:', err);
        alert('Greška pri slanju. Pokušajte ponovno ili nas nazovite.');
      } finally {
        setLoading(false);
      }
    });
  }

  // ---------- FAQ accordion ----------
  function initAccordion() {
    const accordions = $$('.accordion');
    if (!accordions.length) return;

    accordions.forEach(accordion => {
      const headers = $$('.accordion-header', accordion);
      headers.forEach(header => {
        header.addEventListener('click', () => {
          const isExpanded = header.getAttribute('aria-expanded') === 'true';

          headers.forEach(h => h.setAttribute('aria-expanded', 'false'));
          header.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        });
      });
    });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function () {
    initHeaderScroll();
    initNavToggle();
    initBackToTop();
    initSmoothAnchors();
    initMapEmbed();     // samo ako postoji #map
    initContactForm();  // samo ako postoji #contactForm
    initAccordion();    // samo ako postoji .accordion
  });
})();
