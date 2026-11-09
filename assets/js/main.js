/* ==========================================================================
   Cook Events — animations et interactions (GSAP + ScrollTrigger + Lenis)
   Un seul script pour toutes les pages : chaque bloc vérifie que ses éléments
   existent. Le contenu reste lisible si les scripts ne se chargent pas.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const euro = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const session = {
    get(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
  };

  const LABELS = {
    wd: { casa: 'Casa', braise: 'Braise', alfresco: 'Al Fresco' },
    jj: { flamme: 'Flamme & Élégance', signature: 'Signature gastronomique du domaine' },
    opt: { entree: 'Entrée signature', plat: 'Plat signature', dessert: 'Dessert signature' },
  };

  /* ---------- Chaque page s'ouvre en haut ---------- */
  // Le navigateur ne restaure plus l'ancienne position de défilement.
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  let userScrolled = false;
  ['wheel', 'touchmove', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { userScrolled = true; }, { once: true, passive: true }));
  const toTop = () => {
    if (userScrolled) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
  };
  toTop();
  window.addEventListener('DOMContentLoaded', toTop);
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', toTop);
  // Dans un cadre intégré (aperçu), on ramène aussi le cadre en haut de l'écran.
  if (window.self !== window.top) {
    try { document.documentElement.scrollIntoView({ block: 'start' }); } catch (e) { /* ignoré */ }
  }

  /* ---------- Utilitaires sans GSAP ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  $$('.btn__label').forEach((label) => {
    const text = label.textContent.trim();
    label.textContent = '';
    const roll = document.createElement('span');
    roll.className = 'btn__roll';
    roll.dataset.text = text;
    roll.textContent = text;
    label.appendChild(roll);
  });

  const splitChars = (el) => {
    if (!el) return [];
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
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    return $$('.char', el);
  };

  const splitWords = (el) => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w) => `<span class="word" aria-hidden="true">${w}</span>`).join(' ');
    return $$('.word', el);
  };

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
      inner.textContent = ws.map((w) => w.textContent).join(' ');
      line.appendChild(inner);
      el.appendChild(line);
      return inner;
    });
  };

  /* ---------- Demande de proposition (contact) ---------- */
  const PRICES = {
    wd: { casa: 39, braise: 69, alfresco: 85 },
    jj: { flamme: 130, signature: 145 },
    opt: { entree: 6, plat: 15, dessert: 15 },
    br: 32,
  };
  const form = $('[data-form]');
  if (form) {
    const val = (name) => (form.elements[name] ? String(form.elements[name].value || '').trim() : '');
    const checked = (name) => !!(form.elements[name] && form.elements[name].checked);
    const radio = (name) => { const r = $(`input[name="${name}"]:checked`, form); return r ? r.value : ''; };
    const frDate = (v) => {
      if (!v) return '';
      const [y, m, d] = v.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const recapEl = $('[data-recap]', form);
    const totalBox = $('[data-recap-total]', form);
    const amountEl = $('[data-recap-amount]', form);
    const ppEl = $('[data-recap-pp]', form);
    const shownAmount = { v: 0 };

    // Moments : ouvrir/fermer, et cocher le moment quand on choisit une formule
    const moments = $$('.moment-pick', form);
    const syncMoments = () => moments.forEach((m) => {
      const on = $('.moment-pick__toggle input', m).checked;
      m.classList.toggle('is-on', on);
    });
    moments.forEach((m) => {
      $('.moment-pick__body', m).addEventListener('click', () => {
        const t = $('.moment-pick__toggle input', m);
        if (!t.checked) { t.checked = true; syncMoments(); compute(); }
      });
    });

    // Année : bornes des dates
    const syncYear = () => {
      const y = val('year');
      $$('input[type="date"]', form).forEach((d) => {
        d.min = `${y}-01-01`; d.max = `${y}-12-31`;
        if (d.value && !d.value.startsWith(y)) d.value = '';
      });
    };
    // Le welcome dinner et le brunch se calent sur la date du jour J
    const dateJJ = $('#f-date-jj', form);
    dateJJ.addEventListener('change', () => {
      if (!dateJJ.value) return;
      const [y, m, d] = dateJJ.value.split('-').map(Number);
      const shift = (n) => { const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
      const wdDate = $('#f-date-wd', form);
      const brDate = $('#f-date-br', form);
      if (!wdDate.value) wdDate.value = shift(-1);
      if (!brDate.value) brDate.value = shift(1);
    });

    // Compteurs adultes / enfants
    $$('.counter', form).forEach((c) => {
      const input = $('input', c);
      $$('button', c).forEach((b) => b.addEventListener('click', () => {
        input.value = Math.max(0, Math.min(999, (parseInt(input.value, 10) || 0) + parseInt(b.dataset.step, 10)));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }));
    });

    // Lecture de la sélection et récapitulatif
    const read = () => {
      const adults = Math.max(0, parseInt(val('adults'), 10) || 0);
      const kids = Math.max(0, parseInt(val('kids'), 10) || 0);
      const guests = adults + kids;
      const items = [];
      let pp = 0;
      if (checked('m_wd')) {
        const k = radio('wd');
        if (k) pp += PRICES.wd[k];
        items.push({ moment: 'Welcome dinner', date: frDate(val('date_wd')), formula: k ? LABELS.wd[k] : 'Formule à définir ensemble', price: k ? `dès ${PRICES.wd[k]} € / pers` : '' });
      }
      if (checked('m_jj')) {
        const k = radio('jj');
        const opts = $$('input[name="opt"]:checked', form).map((o) => o.value);
        if (k) pp += PRICES.jj[k];
        opts.forEach((o) => { pp += PRICES.opt[o]; });
        const extra = opts.length ? ` + ${opts.map((o) => LABELS.opt[o].toLowerCase()).join(', ')}` : '';
        items.push({ moment: 'Jour J', date: frDate(val('date_jj')), formula: (k ? LABELS.jj[k] : 'Formule à définir ensemble') + extra, price: k ? `dès ${PRICES.jj[k] + opts.reduce((s, o) => s + PRICES.opt[o], 0)} € / pers` : '' });
      }
      if (checked('m_br')) {
        pp += PRICES.br;
        items.push({ moment: 'Lendemain', date: frDate(val('date_br')), formula: 'Time to brunch', price: `dès ${PRICES.br} € TTC / pers` });
      }
      return {
        adults, kids, guests, items, pp, total: pp * guests,
        vendors: $$('input[name="vendors"]:checked', form).map((v) => v.value),
      };
    };

    const compute = () => {
      const r = read();
      const rows = [];
      const couple = [val('name1'), val('name2')].filter(Boolean).join(' & ');
      if (couple) rows.push(['Les mariés', esc(couple)]);
      const where = [val('place'), val('town')].filter(Boolean).join(', ');
      rows.push(['Le mariage', esc(`${val('year')}${where ? ` · ${where}` : ''}`)]);
      r.items.forEach((it) => rows.push([it.moment, `<strong>${esc(it.formula)}</strong>${it.price ? `<small>${esc(it.price)}</small>` : ''}${it.date ? `<small>${esc(it.date)}</small>` : ''}`]));
      if (!r.items.length) rows.push(['Moments', '<em>Aucun moment sélectionné</em>']);
      rows.push(['Convives', `${r.adults} adulte${r.adults > 1 ? 's' : ''}${r.kids ? ` · ${r.kids} enfant${r.kids > 1 ? 's' : ''}` : ''}`]);
      if (r.vendors.length) rows.push(['Prestataires', esc(r.vendors.join(', '))]);
      if (val('budget')) rows.push(['Budget', esc(val('budget'))]);
      recapEl.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

      totalBox.hidden = !r.total;
      ppEl.textContent = r.total ? `soit ${euro.format(r.pp)} € par convive` : '';
      const paint = () => { amountEl.textContent = euro.format(Math.round(shownAmount.v)); };
      if (hasGsap && !reduced) window.gsap.to(shownAmount, { v: r.total, duration: .8, ease: 'power3.out', overwrite: true, onUpdate: paint });
      else { shownAmount.v = r.total; paint(); }
      return r;
    };

    // Arrivée depuis une autre page (Choisir Casa, simulateur…) : la sélection est reprise.
    const q = new URLSearchParams(window.location.search);
    const setRadio = (name, value) => { const el = $(`input[name="${name}"][value="${value}"]`, form); if (el) el.checked = true; };
    if (PRICES.wd[q.get('wd')]) { form.elements.m_wd.checked = true; setRadio('wd', q.get('wd')); }
    if (PRICES.jj[q.get('jj')]) { form.elements.m_jj.checked = true; setRadio('jj', q.get('jj')); }
    (q.get('opt') || '').split(',').forEach((o) => { if (PRICES.opt[o]) { form.elements.m_jj.checked = true; $(`input[name="opt"][value="${o}"]`, form).checked = true; } });
    if (q.get('br') === '1') form.elements.m_br.checked = true;
    const g = parseInt(q.get('g'), 10);
    if (g > 0 && g < 1000) form.elements.adults.value = g;

    syncYear();
    syncMoments();
    compute();
    form.elements.year.addEventListener('change', syncYear);
    form.addEventListener('input', () => { syncMoments(); compute(); });
    form.addEventListener('change', () => { syncMoments(); compute(); });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = $('[data-form-note]', form);
      let ok = true;
      ['name1', 'tel1', 'email'].forEach((n) => {
        const input = form.elements[n];
        const valid = input.value.trim() && input.checkValidity();
        input.closest('.field').classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
      });
      const r = read();
      if (!ok) { note.textContent = 'Merci d’indiquer au moins un prénom, un téléphone et un e-mail valide.'; form.querySelector('.is-invalid input')?.focus(); return; }
      if (!r.items.length) { note.textContent = 'Merci de sélectionner au moins un moment (welcome dinner, jour J ou brunch).'; return; }
      const line = (label, value) => (value ? `${label} : ${value}` : null);
      const body = [
        `DEMANDE DE PROPOSITION · MARIAGE ${val('year')}`,
        '',
        'LES MARIÉS',
        line('Marié(e)', `${val('name1')} · ${val('tel1')}`),
        val('name2') || val('tel2') ? line('Marié(e)', `${val('name2') || '—'} · ${val('tel2') || '—'}`) : null,
        line('E-mail', val('email')),
        '',
        'LE MARIAGE',
        line('Année', val('year')),
        line('Domaine / lieu', val('place') || 'à préciser'),
        line('Commune', val('town')),
        '',
        'MOMENTS & FORMULES CHOISIS',
        ...r.items.map((it) => `• ${it.moment} — ${it.formula}${it.price ? ` (${it.price})` : ''}${it.date ? ` — ${it.date}` : ' — date à préciser'}`),
        r.total ? `Estimation indicative : à partir de ${euro.format(r.total)} € (${euro.format(r.pp)} € × ${r.guests} convives)` : null,
        '',
        'LES INVITÉS',
        `Adultes : ${r.adults} · Enfants : ${r.kids}`,
        '',
        'AUTOUR DE NOUS',
        line('Prestataires présents', r.vendors.join(', ') || 'aucun pour le moment'),
        line('Précisions', val('vendors_more')),
        line('Budget envisagé', val('budget') || 'à en parler ensemble'),
        '',
        'NOTRE MESSAGE',
        val('message') || '—',
      ].filter((l) => l !== null).join('\n');
      const subject = `Mariage ${val('year')} — ${[val('name1'), val('name2')].filter(Boolean).join(' & ')}`;
      form.lastRequest = { subject, body };
      window.location.href = `mailto:contact@cookevents.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      note.textContent = 'Merci ! Votre messagerie s’ouvre avec votre demande et le récapitulatif pré-remplis.';
    });
  }

  /* ---------- Simulateur de budget ---------- */
  const estimator = $('[data-estimator]');
  if (estimator) {
    const f = $('form', estimator);
    const guestsInput = $('#e-guests', estimator);
    const guestsOut = $('[data-est-guests]', estimator);
    const totalEl = $('[data-est-total]', estimator);
    const ppEl = $('[data-est-pp]', estimator);
    const linesEl = $('[data-est-lines]', estimator);
    const cta = $('[data-est-cta]', estimator);
    const optionsSet = $('[data-options]', estimator);
    const shown = { t: 0, p: 0 };

    const compute = () => {
      const g = +guestsInput.value;
      const pick = (name) => $(`input[name="${name}"]:checked`, f);
      const wd = pick('wd');
      const jj = pick('jj');
      const br = pick('br');
      const hasJJ = !!jj.value;
      optionsSet.disabled = !hasJJ;
      const opts = hasJJ ? $$('input[name="opt"]:checked', f) : [];
      const lines = [];
      if (wd.value) lines.push([`Welcome dinner · ${LABELS.wd[wd.value]}`, +wd.dataset.price]);
      if (hasJJ) lines.push([`Jour J · ${LABELS.jj[jj.value]}`, +jj.dataset.price]);
      opts.forEach((o) => lines.push([LABELS.opt[o.value], +o.dataset.price]));
      if (br.value) lines.push(['Lendemain · Time to brunch', +br.dataset.price]);
      const pp = lines.reduce((s, l) => s + l[1], 0);
      return { g, pp, total: pp * g, lines, wd: wd.value, jj: jj.value, br: br.value, opts: opts.map((o) => o.value) };
    };

    const render = () => {
      const r = compute();
      guestsOut.textContent = r.g + (r.g === +guestsInput.max ? '+' : '');
      linesEl.innerHTML = r.lines.length
        ? r.lines.map(([label, price]) => `<li><span>${label}</span><b>${price} € × ${r.g}</b></li>`).join('')
        : '<li><span>Choisissez au moins un moment pour obtenir une estimation.</span></li>';
      const params = new URLSearchParams();
      if (r.wd) params.set('wd', r.wd);
      if (r.jj) params.set('jj', r.jj);
      if (r.opts.length) params.set('opt', r.opts.join(','));
      if (r.br) params.set('br', '1');
      params.set('g', r.g);
      if (r.total) params.set('est', r.total);
      cta.href = `contact.html?${params}`;
      const paint = () => { totalEl.textContent = euro.format(Math.round(shown.t)); ppEl.textContent = euro.format(Math.round(shown.p)); };
      if (hasGsap && !reduced) {
        window.gsap.to(shown, { t: r.total, p: r.pp, duration: .8, ease: 'power3.out', overwrite: true, onUpdate: paint });
      } else {
        shown.t = r.total; shown.p = r.pp; paint();
      }
    };
    f.addEventListener('input', render);
    f.addEventListener('change', render);
    render();
  }

  /* ---------- Onglets de la carte du dîner ---------- */
  const tabs = $('[data-tabs]');
  if (tabs) {
    const buttons = $$('[role="tab"]', tabs);
    const panels = $$('[role="tabpanel"]', tabs);
    const ink = $('.tabs__ink', tabs);
    const img = $('[data-tab-img]', tabs);
    const caption = $('[data-tab-caption]', tabs);
    const placeInk = (btn) => {
      if (!ink || !btn) return;
      ink.style.width = `${btn.offsetWidth}px`;
      ink.style.transform = `translateX(${btn.offsetLeft}px)`;
    };
    const select = (btn, focus) => {
      buttons.forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
      });
      const panel = $(`#${btn.getAttribute('aria-controls')}`);
      panels.forEach((p) => { p.hidden = p !== panel; });
      placeInk(btn);
      if (focus) btn.focus();
      const animate = hasGsap && !reduced;
      if (img && panel.dataset.img && img.getAttribute('src') !== panel.dataset.img) {
        img.src = panel.dataset.img;
        if (caption) caption.textContent = panel.dataset.caption || '';
        if (animate) window.gsap.fromTo(img.parentElement, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'expo.out' });
      }
      if (animate) window.gsap.from(panel.children, { y: 24, opacity: 0, stagger: .05, duration: .8, ease: 'expo.out' });
    };
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        select(buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length], true);
      });
    });
    const current = () => buttons.find((b) => b.getAttribute('aria-selected') === 'true');
    window.addEventListener('resize', () => placeInk(current()));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => placeInk(current()));
  }

  /* ---------- Citations ---------- */
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
      void dots[index].offsetWidth;
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
    if (window.__lenis) { if (open) window.__lenis.stop(); else window.__lenis.start(); }
  };
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Lieux : liste <-> carte ---------- */
  $$('[data-place], [data-pin]').forEach((el) => {
    const key = el.dataset.place || el.dataset.pin;
    const toggle = (on) => $$(`[data-place="${key}"], [data-pin="${key}"]`).forEach((x) => x.classList.toggle('is-active', on));
    el.addEventListener('mouseenter', () => toggle(true));
    el.addEventListener('mouseleave', () => toggle(false));
  });

  /* ---------- Bouton de contact fixe (mobile) ---------- */
  const sticky = $('.sticky-cta');
  if (sticky && 'IntersectionObserver' in window) {
    const blockers = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) blockers.add(en.target); else blockers.delete(en.target); });
      sticky.classList.toggle('is-visible', blockers.size === 0);
    });
    $$('.hero, .cta-band, .footer').forEach((el) => io.observe(el));
  }

  /* ---------- Version statique (sans GSAP ou mouvement réduit) ---------- */
  if (!hasGsap || reduced) {
    root.classList.add('reduced-motion');
    $('.loader')?.remove();
    $('.curtain')?.remove();
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
  const NAV_OFFSET = -90;

  /* ---------- Défilement doux ---------- */
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    lenis.scrollTo(0, { immediate: true, force: true });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollToTarget = (target, immediate) => {
    if (lenis) lenis.scrollTo(target, { offset: NAV_OFFSET, duration: immediate ? 0 : 1.6, immediate: !!immediate, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
  };

  /* ---------- Liens : ancres et transitions de page ---------- */
  const curtain = $('.curtain');
  if (curtain) {
    gsap.set(curtain, { visibility: 'visible', clipPath: 'inset(0% 0% 0% 0%)' });
    curtain.classList.remove('curtain--init');
  }
  const fileOf = (path) => path.split('/').pop() || 'index.html';
  const here = fileOf(window.location.pathname);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const raw = a.getAttribute('href');
    if (/^(mailto|tel):/.test(raw) || raw === '#') return;
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (fileOf(url.pathname) === here && url.search === window.location.search) {
      if (!url.hash) return;
      e.preventDefault();
      if (url.hash === '#contenu') { if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const target = $(url.hash);
      if (target) scrollToTarget(target);
      return;
    }
    if (!curtain) return;
    e.preventDefault();
    gsap.timeline({ onComplete: () => { window.location.href = url.href; } })
      .set(curtain, { visibility: 'visible' })
      .fromTo(curtain, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .8, ease: 'expo.inOut' })
      .fromTo($('img', curtain), { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .5 }, '-=.3');
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && curtain) gsap.set(curtain, { clipPath: 'inset(0% 0% 100% 0%)', visibility: 'hidden' });
  });

  /* ---------- Préparation des textes ---------- */
  const heroChars = splitChars($('[data-split]'));
  const wordsManifesto = $$('[data-words]').map((el) => ({ el, words: splitWords(el) }));
  const footerChars = splitChars($('[data-footer-word]'));

  gsap.set(heroChars, { yPercent: 110, rotate: 8, opacity: 0 });
  gsap.set('[data-hero-fade]', { y: 30, opacity: 0 });
  // Welcome Dinner · Wedding Day · Brunch : chaque moment s'écrit à la plume, l'un après l'autre
  const heroMoments = $$('.hero__moment');
  const heroSeps = $$('.hero__moments-sep');
  gsap.set(heroMoments, { clipPath: 'inset(-30% 100% -30% -10%)', opacity: 0, y: 8, filter: 'blur(6px)' });
  gsap.set(heroSeps, { scale: 0, opacity: 0, rotate: -45 });
  if ($('.hero__media')) {
    gsap.set('.hero__media', { scale: 1.25 });
    gsap.set('.hero__media img', { scale: 1.08 });
  }
  gsap.set('.nav__inner', { y: -40, opacity: 0 });

  function heroIntro() {
    const tl = gsap.timeline();
    if ($('.hero__media')) tl.to('.hero__media', { scale: 1, duration: 2.6, ease: 'expo.out' }, 0);
    if (heroChars.length) tl.to(heroChars, { yPercent: 0, rotate: 0, opacity: 1, stagger: Math.min(.05, 1 / heroChars.length), duration: 1.4 }, .15);
    tl.to('[data-hero-fade]', { y: 0, opacity: 1, stagger: .14 }, .5)
      .to('.nav__inner', { y: 0, opacity: 1, duration: 1, clearProps: 'transform' }, .2);
    heroMoments.forEach((m, i) => {
      const at = 1.1 + i * .85;
      tl.to(m, { clipPath: 'inset(-30% -10% -30% -10%)', opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.5, ease: 'power2.inOut' }, at);
      if (heroSeps[i]) tl.to(heroSeps[i], { scale: 1, opacity: 1, rotate: 45, duration: .9, ease: 'back.out(2)' }, at + .9);
    });
    return tl;
  }

  const afterIntro = () => {
    document.body.classList.remove('is-loading');
    lenis?.start();
    ScrollTrigger.refresh();
    toTop();
  };

  /* ---------- Entrée : préchargeur (première visite) ou rideau ---------- */
  const loader = $('.loader');
  const firstVisit = !session.get('ce-visited');
  session.set('ce-visited', '1');
  if (loader && firstVisit) {
    curtain && gsap.set(curtain, { visibility: 'hidden', clipPath: 'inset(0% 0% 100% 0%)' });
    document.body.classList.add('is-loading');
    lenis?.stop();
    const counter = { v: 0 };
    gsap.timeline({ onComplete: () => { loader.remove(); afterIntro(); } })
      .from('.loader__logo', { opacity: 0, scale: .85, duration: 1.2 })
      .from('.loader__brand span', { yPercent: 110, stagger: .12, duration: 1 }, .1)
      .to(counter, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { $('.loader__num').textContent = Math.round(counter.v); } }, .2)
      .to('.loader__bar span', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, .2)
      .to('.loader__inner', { yPercent: -60, opacity: 0, duration: .8, ease: 'power3.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.3')
      .add(heroIntro(), '-=.6');
  } else {
    loader?.remove();
    const tl = gsap.timeline({ onComplete: afterIntro });
    if (curtain) {
      tl.set(curtain, { visibility: 'visible', clipPath: 'inset(0% 0% 0% 0%)' })
        .to($('img', curtain), { opacity: 0, scale: .9, duration: .4, ease: 'power2.in' })
        .to(curtain, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '-=.1')
        .set(curtain, { visibility: 'hidden' });
    }
    tl.add(heroIntro(), curtain ? '-=.7' : 0);
  }

  /* ---------- Barre de progression ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---------- Navigation : thème + masquage ---------- */
  const nav = $('[data-nav]');
  const darkSections = $$('[data-nav-dark]');
  const updateNavTheme = () => {
    const dark = darkSections.some((s) => { const r = s.getBoundingClientRect(); return r.top <= 39 && r.bottom >= 39; });
    nav.classList.toggle('is-dark', dark);
    nav.classList.toggle('is-top', window.scrollY < 40);
  };
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      updateNavTheme();
      const y = self.scroll();
      if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > 400);
      lastY = y;
    },
  });
  updateNavTheme();

  /* ---------- Hero : la photo s'éloigne au scroll ---------- */
  if ($('.hero')) {
    gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
      defaults: { ease: 'none', duration: 1 },
    })
      .to('.hero__media img', { yPercent: 16, scale: 1.18 }, 0)
      .to('.hero__copy', { yPercent: -40, opacity: 0 }, 0)
      .to('.hero__dust', { opacity: .3 }, 0);

    if (finePointer) {
      const hero = $('.hero');
      const mx = gsap.quickTo('.hero__media img', 'x', { duration: 1.4, ease: 'power3' });
      const my = gsap.quickTo('.hero__media img', 'y', { duration: 1.4, ease: 'power3' });
      const tx = gsap.quickTo('.hero__copy', 'x', { duration: 1.6, ease: 'power3' });
      hero.addEventListener('mousemove', (e) => {
        const nx = e.clientX / window.innerWidth - .5;
        const ny = e.clientY / window.innerHeight - .5;
        mx(nx * -30); my(ny * -20); tx(nx * -24);
      });
      hero.addEventListener('mouseleave', () => { mx(0); my(0); tx(0); });
    }
    initDust($('.hero__dust'));
  }

  /* ---------- Marquee réactif à la vitesse de scroll ---------- */
  const track = $('[data-marquee]');
  if (track) {
    let x = 0;
    let dir = 1;
    let boost = 0;
    let groupWidth = track.firstElementChild.offsetWidth;
    if ('ResizeObserver' in window) new ResizeObserver(() => { groupWidth = track.firstElementChild.offsetWidth; }).observe(track.firstElementChild);
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => { dir = self.direction; boost = Math.min(Math.abs(self.getVelocity()) / 120, 18); },
    });
    gsap.ticker.add((time, delta) => {
      boost *= 0.92;
      x -= (0.6 + boost) * dir * (delta / 16.7);
      if (x <= -groupWidth) x += groupWidth;
      if (x > 0) x -= groupWidth;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* ---------- Titres : révélation ligne par ligne ---------- */
  const lineTargets = $$('[data-split-lines]');
  gsap.set(lineTargets, { opacity: 0 });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    lineTargets.forEach((el) => {
      const lines = splitLines(el);
      gsap.set(el, { opacity: 1 });
      gsap.from(lines, { yPercent: 110, rotate: 3, stagger: .1, duration: 1.4, scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    ScrollTrigger.refresh();
  });

  /* ---------- Révélations génériques ---------- */
  gsap.set('[data-reveal]', { opacity: 0 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    onEnter: (batch) => gsap.fromTo(batch, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .1, overwrite: true }),
  });

  /* ---------- Compteurs ---------- */
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }),
    });
  });

  /* ---------- Parallaxe des photographies ---------- */
  $$('[data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed);
    gsap.to(el, {
      y: () => speed * -400, ease: 'none',
      scrollTrigger: { trigger: el.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  });

  // Photos dévoilées comme un rideau qui se lève
  $$('[data-img-reveal]').forEach((img) => {
    const frame = img.parentElement;
    gsap.fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut',
      scrollTrigger: { trigger: frame, start: 'top 88%' },
    });
    gsap.from(img, { scale: 1.35, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: frame, start: 'top 88%' } });
  });
  if ($('.collage__round')) {
    gsap.from('.collage__round', { scale: 0, rotate: -40, duration: 1.8, ease: 'back.out(1.4)', scrollTrigger: { trigger: '.collage', start: 'top 60%' } });
  }

  // Assiettes qui tournent doucement au scroll
  $$('[data-spin]').forEach((plate, i) => {
    gsap.fromTo(plate, { rotate: i % 2 ? 40 : -40, scale: .85 }, {
      rotate: i % 2 ? -40 : 40, scale: 1, ease: 'none',
      scrollTrigger: { trigger: plate, start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
  });

  /* ---------- Tuiles, formules, moments : entrée + inclinaison 3D ---------- */
  [['.tile', '.tiles'], ['.formule', '.formules__grid'], ['.moment', '.moments__grid']].forEach(([items, wrap]) => {
    if (!$(wrap)) return;
    gsap.from(items, {
      y: 120, opacity: 0, rotateX: -10, transformOrigin: '50% 0%', stagger: .12, duration: 1.4,
      scrollTrigger: { trigger: wrap, start: 'top 82%' },
    });
  });
  if ($('.tiles')) gsap.from('.tile__media img', { scale: 1.4, stagger: .12, duration: 2.2, scrollTrigger: { trigger: '.tiles', start: 'top 78%' } });

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
        rx(-py * 5); ry(px * 7);
        if (depth) { dx(px * 30); dy(py * 22); }
      });
      card.addEventListener('mouseleave', () => { rx(0); ry(0); if (depth) { dx(0); dy(0); } });
    });
  }

  /* ---------- Déroulé : scroll horizontal épinglé ---------- */
  const stepsTrack = $('.steps__track');
  if (stepsTrack) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const distance = () => stepsTrack.scrollWidth - window.innerWidth;
      const tween = gsap.to(stepsTrack, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: '.steps', start: 'top top', end: () => '+=' + distance(), pin: '.steps__pin', scrub: 1, invalidateOnRefresh: true },
      });
      gsap.to('.steps__progress span', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: '.steps', start: 'top top', end: () => '+=' + distance(), scrub: true, invalidateOnRefresh: true },
      });
      $$('.step__media img').forEach((img) => {
        gsap.fromTo(img, { xPercent: -10 }, {
          xPercent: 10, ease: 'none',
          scrollTrigger: { trigger: img.closest('.step'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        });
      });
    });
    mm.add('(max-width: 900px)', () => {
      gsap.from('.step', { y: 60, opacity: 0, stagger: .1, scrollTrigger: { trigger: '.steps__track', start: 'top 80%' } });
    });
  }

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

  /* ---------- Lieux : la côte se dessine ---------- */
  if ($('.map')) {
    $$('.map__coast, .map__river, .map__route').forEach((path) => {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: path.classList.contains('map__river') ? '4 6' : len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.map', start: 'top 80%', end: 'center 45%', scrub: 1 } });
    });
    gsap.from('.pin__dot', { scale: 0, transformOrigin: '50% 50%', stagger: .1, duration: 1.2, ease: 'back.out(3)', scrollTrigger: { trigger: '.map', start: 'top 60%' } });
    gsap.from('.pin text', { opacity: 0, y: 10, stagger: .1, duration: 1, scrollTrigger: { trigger: '.map', start: 'top 60%' } });
  }

  /* ---------- Simulateur : apparition ---------- */
  if ($('.estimator')) {
    gsap.from('.choice', { y: 40, opacity: 0, stagger: .1, duration: 1.2, scrollTrigger: { trigger: '.estimator', start: 'top 80%' } });
    gsap.from('.estimator__result', { y: 80, opacity: 0, duration: 1.4, scrollTrigger: { trigger: '.estimator', start: 'top 75%' } });
  }

  /* ---------- Footer : le grand mot se lève ---------- */
  if (footerChars.length) {
    gsap.from(footerChars, { yPercent: 100, stagger: .04, duration: 1.4, scrollTrigger: { trigger: '.footer__word', start: 'top 95%' } });
  }

  /* ---------- Boutons magnétiques + curseur ---------- */
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
    initCursor();
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());

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
      const onButton = e.target.closest('.btn, button');
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
        hue: 32 + Math.random() * 16,
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
        if (dist < 120 && dist > 0) { p.x += (dx / dist) * 1.4; p.y += (dy / dist) * 1.4; }
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
    const navEl = $('[data-nav]');
    const darks = $$('[data-nav-dark]');
    const update = () => {
      navEl.classList.toggle('is-dark', darks.some((s) => { const r = s.getBoundingClientRect(); return r.top <= 39 && r.bottom >= 39; }));
      navEl.classList.toggle('is-top', window.scrollY < 40);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
