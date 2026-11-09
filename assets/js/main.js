/* ==========================================================================
   Cook Events — animations (GSAP + ScrollTrigger + Lenis)
   Le contenu reste lisible si les scripts ne se chargent pas.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---------- Petits utilitaires indépendants de GSAP ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Libellés de boutons « qui roulent »
  $$('.btn__label').forEach((label) => {
    const text = label.textContent.trim();
    label.textContent = '';
    const roll = document.createElement('span');
    roll.className = 'btn__roll';
    roll.dataset.text = text;
    roll.textContent = text;
    label.appendChild(roll);
  });

  // Découpage du texte en mots / lettres
  const splitChars = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.className = 'word';
            [...part].forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'char';
              c.textContent = ch;
              word.appendChild(c);
            });
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    return $$('.char', el);
  };

  const splitWords = (el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w) => `<span class="word" aria-hidden="true">${w}</span>`).join(' ');
    return $$('.word', el);
  };

  // Découpe en lignes visuelles (masques) pour les titres de section
  const splitLines = (el) => {
    const words = splitWords(el);
    const lines = [];
    let top = null;
    words.forEach((w) => {
      const t = w.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w);
    });
    el.innerHTML = '';
    return lines.map((ws) => {
      const line = document.createElement('span');
      line.className = 'split-line';
      const inner = document.createElement('span');
      inner.className = 'split-line__inner';
      inner.setAttribute('aria-hidden', 'true');
      inner.innerHTML = ws.map((w) => w.textContent).join(' ');
      line.appendChild(inner);
      el.appendChild(line);
      return inner;
    });
  };

  /* ---------- Formulaire : ouvre la messagerie avec la demande ---------- */
  const form = $('[data-form]');
  if (form) {
    const range = $('#f-guests', form);
    const out = $('[data-guests-out]', form);
    const sync = () => { out.textContent = range.value + (range.value === range.max ? '+' : ''); };
    range.addEventListener('input', sync);
    sync();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      ['#f-name', '#f-email'].forEach((sel) => {
        const input = $(sel, form);
        const valid = input.value.trim() && input.checkValidity();
        input.closest('.field').classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
      });
      const note = $('[data-form-note]', form);
      if (!ok) { note.textContent = 'Merci de renseigner vos prénoms et un e-mail valide.'; return; }
      const d = Object.fromEntries(new FormData(form));
      const body = [
        `Prénoms : ${d.name}`,
        `E-mail : ${d.email}`,
        `Date : ${d.date || 'à définir'}`,
        `Lieu : ${d.place || 'à définir'}`,
        `Invités : ${out.textContent}`,
        '',
        d.message || '',
      ].join('\n');
      window.location.href = `mailto:contact@cookevents.fr?subject=${encodeURIComponent('Demande de devis — ' + d.name)}&body=${encodeURIComponent(body)}`;
      note.textContent = 'Merci ! Votre messagerie s’ouvre avec votre demande pré-remplie.';
    });
  }

  /* ---------- Témoignages ---------- */
  const quotes = $('[data-quotes]');
  if (quotes) {
    const items = $$('.quote', quotes);
    const dots = $$('.quotes__nav button', quotes);
    const duration = 7000;
    quotes.style.setProperty('--quote-duration', duration + 'ms');
    items.forEach((q) => splitWords($('.quote__text', q)).forEach((w, i) => { w.style.transitionDelay = `${i * 25}ms`; }));
    let index = 0;
    let timer;
    const show = (i) => {
      index = (i + items.length) % items.length;
      items.forEach((q, k) => q.classList.toggle('is-active', k === index));
      dots.forEach((d, k) => {
        d.classList.remove('is-active');
        d.classList.toggle('is-done', k < index);
        d.setAttribute('aria-selected', k === index);
      });
      void dots[index].offsetWidth; // relance l'animation de la barre
      dots[index].classList.add('is-active');
      clearTimeout(timer);
      if (!reduced) timer = setTimeout(() => show(index + 1), duration);
    };
    dots.forEach((d, i) => d.addEventListener('click', () => show(i)));
    show(0);
  }

  /* ---------- Menu mobile ---------- */
  const burger = $('.nav__burger');
  const menu = $('#menu');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Lieux : liste <-> carte ---------- */
  const setPlace = (key, on) => {
    $$(`[data-place="${key}"], [data-pin="${key}"]`).forEach((el) => el.classList.toggle('is-active', on));
  };
  $$('[data-place], [data-pin]').forEach((el) => {
    const key = el.dataset.place || el.dataset.pin;
    el.addEventListener('mouseenter', () => setPlace(key, true));
    el.addEventListener('mouseleave', () => setPlace(key, false));
  });

  /* ---------- Sans GSAP ou mouvement réduit : version statique ---------- */
  if (!hasGsap || reduced) {
    root.classList.add('reduced-motion');
    $('.loader')?.remove();
    $$('[data-words]').forEach((el) => splitWords(el).forEach((w) => w.classList.add('is-lit')));
    $$('[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
    initNavFallback();
    return;
  }

  /* ==========================================================================
     GSAP
     ========================================================================== */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'expo.out', duration: 1.2 });

  /* ---------- Défilement doux ---------- */
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Préparation des textes ---------- */
  const heroChars = splitChars($('[data-split]'));
  const wordsManifesto = $$('[data-words]').map((el) => ({ el, words: splitWords(el) }));
  const footerChars = splitChars($('[data-footer-word]'));

  gsap.set(heroChars, { yPercent: 110, rotate: 8, opacity: 0 });
  gsap.set('[data-hero-fade]', { y: 30, opacity: 0 });
  gsap.set('.cloche', { y: 120, opacity: 0, scale: .9 });
  gsap.set('.nav__inner', { y: -40, opacity: 0 });

  /* ---------- Préchargeur ---------- */
  const loader = $('.loader');
  document.body.classList.add('is-loading');
  lenis?.stop();
  const counter = { v: 0 };
  const loaderTl = gsap.timeline({
    onComplete: () => {
      loader.remove();
      document.body.classList.remove('is-loading');
      lenis?.start();
      ScrollTrigger.refresh();
    },
  });
  loaderTl
    .from('.loader__brand span', { yPercent: 110, stagger: .12, duration: 1 })
    .to(counter, {
      v: 100, duration: 1.6, ease: 'power2.inOut',
      onUpdate: () => { $('.loader__num').textContent = Math.round(counter.v); },
    }, 0.2)
    .to('.loader__bar span', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0.2)
    .to('.loader__inner', { yPercent: -60, opacity: 0, duration: .8, ease: 'power3.in' })
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.3')
    .add(heroIntro(), '-=.6');

  function heroIntro() {
    return gsap.timeline()
      .to(heroChars, { yPercent: 0, rotate: 0, opacity: 1, stagger: .022, duration: 1.3 })
      .to('[data-hero-fade]', { y: 0, opacity: 1, stagger: .12 }, '-=1')
      .to('.cloche', { y: 0, opacity: 1, scale: 1, duration: 1.8 }, '-=1.2')
      .to('.nav__inner', { y: 0, opacity: 1, duration: 1, clearProps: 'transform' }, '-=1.4');
  }

  /* ---------- Barre de progression ---------- */
  gsap.to('.progress span', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: .3 },
  });

  /* ---------- Navigation : thème + masquage ---------- */
  const nav = $('[data-nav]');
  const darkSections = $$('[data-nav-dark]');
  const updateNavTheme = () => {
    const y = 36;
    const dark = darkSections.some((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    });
    nav.classList.toggle('is-dark', dark);
    nav.classList.toggle('is-top', window.scrollY < 40);
  };
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      updateNavTheme();
      const y = self.scroll();
      const goingDown = y > lastY;
      if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', goingDown && y > 400);
      lastY = y;
    },
  });
  updateNavTheme();

  // Lien actif dans la navigation
  $$('.nav__link[href^="#"]').forEach((link) => {
    const section = $(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => link.classList.toggle('is-active', self.isActive),
    });
  });

  /* ---------- Hero : la cloche se soulève au scroll ---------- */
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
    defaults: { ease: 'none', duration: 1 },
  });
  heroTl
    .to('.cloche__dome', { yPercent: -95, rotate: -7, xPercent: 6 }, 0)
    .to('.cloche__treasure', { y: -40, scale: 1.25 }, 0)
    .to('.cloche .flare', { scale: 1.8 }, 0)
    .to('.cloche .flare__core', { opacity: 1 }, 0)
    .to('.hero__copy', { yPercent: -40, opacity: 0 }, 0)
    .to('.hero__dust', { opacity: .3 }, 0);

  // Parallaxe à la souris dans le hero
  if (finePointer) {
    const hero = $('.hero');
    const rotY = gsap.quickTo('.cloche', 'rotationY', { duration: 1.2, ease: 'power3' });
    const rotX = gsap.quickTo('.cloche', 'rotationX', { duration: 1.2, ease: 'power3' });
    const tx = gsap.quickTo('.hero__copy', 'x', { duration: 1.6, ease: 'power3' });
    hero.addEventListener('mousemove', (e) => {
      const nx = e.clientX / window.innerWidth - .5;
      const ny = e.clientY / window.innerHeight - .5;
      rotY(nx * 16); rotX(-ny * 8); tx(nx * -24);
    });
    hero.addEventListener('mouseleave', () => { rotY(0); rotX(0); tx(0); });
  }

  /* ---------- Poussière dorée (canvas) ---------- */
  initDust($('.hero__dust'));

  /* ---------- Marquee réactif à la vitesse de scroll ---------- */
  const track = $('[data-marquee]');
  if (track) {
    let x = 0;
    let dir = 1;
    let boost = 0;
    let groupWidth = track.firstElementChild.offsetWidth;
    const measure = () => { groupWidth = track.firstElementChild.offsetWidth; };
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(track.firstElementChild);
    const wrapAt = () => groupWidth;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => { dir = self.direction; boost = Math.min(Math.abs(self.getVelocity()) / 120, 18); },
    });
    gsap.ticker.add((time, delta) => {
      const w = wrapAt();
      boost *= 0.92;
      x -= (0.6 + boost) * dir * (delta / 16.7);
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* ---------- Titres : révélation ligne par ligne (après chargement des polices) ---------- */
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const lineTargets = $$('[data-split-lines]');
  gsap.set(lineTargets, { opacity: 0 });
  fontsReady.then(() => {
    lineTargets.forEach((el) => {
      const lines = splitLines(el);
      gsap.set(el, { opacity: 1 });
      gsap.from(lines, {
        yPercent: 110, rotate: 3, stagger: .1, duration: 1.4,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    ScrollTrigger.refresh();
  });

  /* ---------- Révélations génériques ---------- */
  gsap.set('[data-reveal]', { opacity: 0 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    onEnter: (batch) => gsap.fromTo(batch, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, overwrite: true }),
  });

  /* ---------- Compteurs ---------- */
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }),
    });
  });

  /* ---------- Parallaxe des sculptures ---------- */
  $$('[data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed);
    gsap.to(el, {
      y: () => speed * -400, ease: 'none',
      scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  });
  gsap.from('.constellation > .orb', {
    scale: 0, stagger: .12, duration: 1.6, ease: 'elastic.out(1, .6)',
    scrollTrigger: { trigger: '.constellation', start: 'top 75%' },
  });

  /* ---------- Cartes : entrée + inclinaison 3D ---------- */
  gsap.from('.card', {
    y: 120, opacity: 0, rotateX: -12, transformOrigin: '50% 0%', stagger: .12, duration: 1.4,
    scrollTrigger: { trigger: '.cards', start: 'top 80%' },
  });
  gsap.from('.card__art', {
    scale: .6, opacity: 0, rotate: -20, stagger: .12, duration: 1.8,
    scrollTrigger: { trigger: '.cards', start: 'top 70%' },
  });

  if (finePointer) {
    $$('[data-tilt]').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: .8, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: .8, ease: 'power3' });
      const depth = $('[data-depth]', card);
      const dx = depth && gsap.quickTo(depth, 'x', { duration: 1, ease: 'power3' });
      const dy = depth && gsap.quickTo(depth, 'y', { duration: 1, ease: 'power3' });
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        rx(-py * 6); ry(px * 8);
        if (depth) { dx(px * 40); dy(py * 30); }
      });
      card.addEventListener('mouseleave', () => { rx(0); ry(0); if (depth) { dx(0); dy(0); } });
    });
  }

  /* ---------- Déroulé : scroll horizontal épinglé ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const stepsTrack = $('.steps__track');
    const distance = () => stepsTrack.scrollWidth - window.innerWidth;
    const tween = gsap.to(stepsTrack, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '.steps', start: 'top top', end: () => '+=' + distance(),
        pin: '.steps__pin', scrub: 1, invalidateOnRefresh: true,
      },
    });
    gsap.to('.steps__progress span', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.steps', start: 'top top', end: () => '+=' + distance(), scrub: true, invalidateOnRefresh: true },
    });
    $$('.step__orb').forEach((orb) => {
      const step = orb.closest('.step');
      gsap.from(orb, {
        rotate: -90, scale: .3, ease: 'none',
        scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 100%', end: 'left 40%', scrub: true },
      });
    });
  });
  mm.add('(max-width: 900px)', () => {
    gsap.from('.step', {
      y: 60, opacity: 0, stagger: .1,
      scrollTrigger: { trigger: '.steps__track', start: 'top 80%' },
    });
  });

  /* ---------- Manifeste : les mots s'allument ---------- */
  wordsManifesto.forEach(({ el, words }) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: true,
      onUpdate: (self) => {
        const lit = Math.round(self.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      },
    });
  });

  /* ---------- La carte : sculpture qui suit le curseur ---------- */
  const float = $('.menu-float');
  const list = $('[data-menu-list]');
  if (float && list && finePointer) {
    const orb = $('.orb', float);
    const fx = gsap.quickTo(float, 'x', { duration: .7, ease: 'power3' });
    const fy = gsap.quickTo(float, 'y', { duration: .7, ease: 'power3' });
    gsap.set(float, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    list.addEventListener('mousemove', (e) => { fx(e.clientX + 140); fy(e.clientY); });
    list.addEventListener('mouseenter', () => float.classList.add('is-visible'));
    list.addEventListener('mouseleave', () => float.classList.remove('is-visible'));
    $$('.menu-item', list).forEach((item) => {
      item.addEventListener('mouseenter', () => { orb.style.setProperty('--hue', item.dataset.hue + 'deg'); });
    });
  }
  gsap.from('.menu-item', {
    x: -60, opacity: 0, stagger: .08,
    scrollTrigger: { trigger: '.menu-list', start: 'top 80%' },
  });

  /* ---------- Lieux : la côte se dessine ---------- */
  $$('.map__coast, .map__river, .map__route').forEach((path) => {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: path.classList.contains('map__river') ? '4 6' : len, strokeDashoffset: len });
    gsap.to(path, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '.map', start: 'top 80%', end: 'center 45%', scrub: 1 },
    });
  });
  gsap.from('.pin__dot', {
    scale: 0, transformOrigin: '50% 50%', stagger: .1, duration: 1.2, ease: 'back.out(3)',
    scrollTrigger: { trigger: '.map', start: 'top 60%' },
  });
  gsap.from('.pin text', {
    opacity: 0, y: 10, stagger: .1, duration: 1,
    scrollTrigger: { trigger: '.map', start: 'top 60%' },
  });

  /* ---------- Footer : le grand mot se lève ---------- */
  gsap.from(footerChars, {
    yPercent: 100, stagger: .04, duration: 1.4,
    scrollTrigger: { trigger: '.footer__word', start: 'top 95%' },
  });

  /* ---------- Boutons magnétiques ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' });
      const my = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .3);
        my((e.clientY - r.top - r.height / 2) * .4);
      });
      el.addEventListener('mouseleave', () => { mx(0); my(0); });
    });
  }

  /* ---------- Curseur personnalisé ---------- */
  if (finePointer) initCursor();

  window.addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  /* ========================================================================== */

  function initCursor() {
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    const pos = { x: innerWidth / 2, y: innerHeight / 2 };
    const ringPos = { ...pos };
    window.addEventListener('mousemove', (e) => { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      ringPos.x += (pos.x - ringPos.x) * .16;
      ringPos.y += (pos.y - ringPos.y) * .16;
      dot.style.transform = `translate3d(${pos.x}px,${pos.y}px,0)`;
      ring.style.transform = `translate3d(${ringPos.x}px,${ringPos.y}px,0)`;
    });
    document.addEventListener('mouseover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, input, textarea, label, .places li, .pin');
      const onButton = e.target.closest('a, button');
      cursor.classList.toggle('is-label', !!labelled && !onButton);
      cursor.classList.toggle('is-hover', !!interactive);
      if (labelled) label.textContent = labelled.dataset.cursor;
    });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = 0; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = 1; });
  }

  function initDust(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w; let h; let particles = [];
    let running = true;
    const mouse = { x: -999, y: -999 };
    const resize = () => {
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(110, (w * h) / 14000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.6 + .3,
        vy: -(Math.random() * .25 + .05), vx: (Math.random() - .5) * .15,
        a: Math.random() * .6 + .2, t: Math.random() * Math.PI * 2,
        hue: Math.random() < .7 ? 40 : 260,
      }));
    };
    resize();
    window.addEventListener('resize', resize);
    canvas.parentElement.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    ScrollTrigger.create({ trigger: canvas.parentElement, start: 'top bottom', end: 'bottom top', onToggle: (s) => { running = s.isActive; } });
    gsap.ticker.add(() => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.t += .02;
        const dx = p.x - mouse.x; const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 120) { p.x += (dx / dist) * 1.4; p.y += (dy / dist) * 1.4; }
        p.x += p.vx + Math.sin(p.t) * .1;
        p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 82%, ${p.a * (.6 + Math.sin(p.t) * .4)})`;
        ctx.fill();
      });
    });
  }

  function initNavFallback() {
    const nav = $('[data-nav]');
    const darks = $$('[data-nav-dark]');
    const update = () => {
      nav.classList.toggle('is-dark', darks.some((s) => { const r = s.getBoundingClientRect(); return r.top <= 36 && r.bottom >= 36; }));
      nav.classList.toggle('is-top', window.scrollY < 40);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
