(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function initHeaderScroll() {
    const header = $('#header');
    if (!header) return;
    const handler = () => {
      if ((window.pageYOffset || document.documentElement.scrollTop) > 6) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
  }

  function initNavToggle() {
    const toggle = $('.nav-toggle');
    const list = $('.nav__list');
    if (!toggle || !list) return;
    toggle.addEventListener('click', () => list.classList.toggle('nav__list--open'));
    $$('a', list).forEach(link => link.addEventListener('click', () => list.classList.remove('nav__list--open')));
  }

  function initBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    const toggle = () => { btn.style.display = (window.scrollY > 420) ? 'block' : 'none'; };
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

  function initMapEmbed() {
    const map = $('#map');
    if (!map) return;
    const lat = 45.77176284790039, lng = 15.944704055786133, zoom = 15;
    const src = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng) + '&z=' + zoom + '&output=embed';
    map.innerHTML = '<iframe title="Lokacija - Google mapa" src="' + src + '" width="100%" height="420" style="border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
  }

  function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;

    const submitBtn  = form.querySelector('button[type="submit"]');
    const successBox = $('#formSuccess');
    const honey      = form.querySelector('input[name="_honey"]');
    const btnText    = submitBtn?.querySelector('.btn-text');
    const btnLoading = submitBtn?.querySelector('.btn-loading');

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
      if (honey && honey.value) return;

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

  function initAccordion() {
    const items = $$('.faq-item');
    if (!items.length) return;
    items.forEach(item => {
      const btn = $('.faq-button', item);
      const content = $('.faq-content', item);
      if (!btn || !content) return;
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        items.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
        if (!isOpen) content.style.maxHeight = content.scrollHeight + 'px';
        else content.style.maxHeight = null;
      });
      content.style.maxHeight = item.classList.contains('open') ? content.scrollHeight + 'px' : null;
    });
  }

  function initReveal() {
    const items = $$('.reveal');
    if (!items.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    items.forEach(item => io.observe(item));
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeaderScroll();
    initNavToggle();
    initBackToTop();
    initSmoothAnchors();
    initMapEmbed();
    initContactForm();
    initAccordion();
    initReveal();
  });
})();
