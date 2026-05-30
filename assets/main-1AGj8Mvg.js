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

    const submitBtn  = form.querySelector('button[type="submit"]');
    const successBox = $('#formSuccess');
    const honey      = form.querySelector('input[name="_honey"]');
    const btnText    = submitBtn?.querySelector('.btn-text');
    const btnLoading = submitBtn?.querySelector('.btn-loading');

    // UX: prikaži/skrivaj detalje ovisno o vrsti upita
    (function toggleDeviceDetails() {
      const group = $('#device-details-group');
      const type  = $('#inquiry-type');
      if (!group || !type) return;
      const apply = () => { group.style.display = (type.value === 'loan' || type.value === 'estimate') ? 'block' : 'none'; };
      type.addEventListener('change', apply);
      apply();
    })();

    const setLoading = on => {
      if (submitBtn) submitBtn.disabled = !!on;
      if (btnText) btnText.style.display = on ? 'none' : '';
      if (btnLoading) btnLoading.style.display = on ? 'inline-flex' : 'none';
    };

    const toggleSuccess = show => {
      if (successBox) {
        successBox.style.display = show ? 'block' : 'none';
        if (show) successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const buildMailtoFallback = () => {
      const name = $('#name')?.value || '';
      const email = $('#email')?.value || '';
      const phone = $('#phone')?.value || '';
      const type  = $('#inquiry-type')?.value || '';
      const dev   = $('#device-details')?.value || '';
      const msg   = $('#message')?.value || '';

      const suffix = type === 'loan' ? '-zalog' : type === 'estimate' ? '-otkup' : '-opcenito';
      const subject = encodeURIComponent('Web upit ' + suffix);
      const body = encodeURIComponent(
        `Ime i prezime: ${name}\nEmail: ${email}\nTelefon: ${phone}\nVrsta upita: ${type || 'N/A'}\nDetalji uređaja: ${dev}\n\nPoruka:\n${msg}`
      );

      return `mailto:info@zalagaonicazagreb.hr?subject=${subject}&body=${body}`;
    };

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
      const privacy = $('#privacy-policy');
      if (privacy && !privacy.checked) { privacy.focus(); return; }

      const formData = new FormData(form);
      const fallbackHref = buildMailtoFallback();

      try {
        setLoading(true);

        const response = await fetch('/mail.php', { method: 'POST', body: formData });
        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.success) {
          toggleSuccess(true);
          form.reset();
          const group = $('#device-details-group');
          if (group && group.style) group.style.display = 'none';
          return;
        }
        const errorMsg = data?.error || 'Slanje nije uspjelo. Pokušajte ponovno.';
        alert(errorMsg);
        return;
      } catch (err) {
        console.error('Slanje greška:', err);
        alert('Slanje nije uspjelo, otvaram mail klijent.');
        window.location.href = fallbackHref;
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

  // ---------- Premium CTA system ----------
  const CONTACT_PHONE_E164 = '+385919577009';
  const CONTACT_PHONE_DIGITS = '385919577009';
  const DEFAULT_MESSAGE = 'Pozdrav, želim prodati/založiti predmet.\n\nModel: \nStarost (datum na računu): \nTražena cijena: ';
  const WHATSAPP_URL = 'https://wa.me/' + CONTACT_PHONE_DIGITS + '?text=' + encodeURIComponent(DEFAULT_MESSAGE);
  const SMS_URL = 'sms:' + CONTACT_PHONE_E164 + '?body=' + encodeURIComponent(DEFAULT_MESSAGE);
  function fireConversion(sendTo, value) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: sendTo,
          value: value || 0.5,
          currency: 'EUR'
        });
      }
    } catch (err) {}
  }

  function oncePerSession(key, fn) {
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch (err) {}
    fn();
  }

  function initConversionLinks() {
    document.addEventListener('click', function (event) {
      const link = event.target.closest && event.target.closest('a');
      if (!link || !link.href) return;

      if (link.href.indexOf('https://wa.me/') === 0) {
        oncePerSession('conv_whatsapp', function () {
          fireConversion('AW-17523602012/okKuCKily58bENzk86NB');
        });
      }

      if (link.href.indexOf('sms:') === 0) {
        oncePerSession('conv_sms', function () {
          fireConversion('AW-17523602012/okKuCKily58bENzk86NB');
        });
      }
    }, { passive: true });
  }

  function initStickyMobileCta() {
    if (document.querySelector('.mobile-cta-bar')) return;

    const bar = document.createElement('nav');
    bar.className = 'mobile-cta-bar';
    bar.setAttribute('aria-label', 'Brzi kontakt');
    bar.innerHTML =
      '<a class="mobile-cta-bar__item mobile-cta-bar__item--whatsapp" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener" aria-label="Pošalji WhatsApp poruku">WhatsApp</a>' +
      '<a class="mobile-cta-bar__item mobile-cta-bar__item--sms" href="' + SMS_URL + '" aria-label="Pošalji SMS poruku">SMS</a>';

    document.body.appendChild(bar);

    const hero = document.querySelector('.hero');
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const updateVisibility = () => {
      if (!mobileQuery.matches) {
        bar.classList.remove('is-visible');
        return;
      }

      if (!hero) {
        bar.classList.add('is-visible');
        return;
      }
      const rect = hero.getBoundingClientRect();
      const heroVisible = rect.bottom > (window.innerHeight * 0.72) && rect.top < window.innerHeight;
      bar.classList.toggle('is-visible', !heroVisible);
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility, { passive: true });
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', updateVisibility);
    } else {
      mobileQuery.addListener(updateVisibility);
    }
    updateVisibility();
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
    initConversionLinks();
    initStickyMobileCta();
  });
})();
