/* Travel Buddy site motion (Claude Design, site-motion.js). Paper and ink: the hard shadow is a fixed
   ink layer (the floor); objects lift off it (shadow grows) and land (shadow snaps back). Two curves +
   a leave curve, 180–560 ms, 60 ms cascades, each plays once. Only transform, opacity,
   stroke-dashoffset. Reduce Motion: final state, no movement. Content is in its final state in the
   markup, so it reads without JS. Loaded at the end of <body>, so it starts before the first paint. */
(function () {
  const C = {
    travel: 'cubic-bezier(.3,.7,.3,1)',
    arrive: 'cubic-bezier(.34,1.56,.64,1)',
    leave: 'cubic-bezier(.55,0,.8,.2)',
    arc: 'cubic-bezier(.45,0,.55,1)',
    burst: 'cubic-bezier(.2,.8,.3,1)',
  };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (el, kf, ms, o = {}) =>
    el.animate(kf, { duration: ms, delay: o.delay || 0, easing: C[o.curve || 'travel'], fill: o.fill || 'backwards' });
  const setText = (el, s) => {
    if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = s;
    else el.textContent = s;
  };
  const langOf = (el) => (el.closest('[lang]') || document.documentElement).getAttribute('lang') || 'fr';
  const money = (v, el) =>
    new Intl.NumberFormat(langOf(el) === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(v);
  // Both languages are in the page; only the one shown is animated.
  const shown = (root, sel) => [...root.querySelectorAll(sel)].find((n) => n.getClientRects().length) || root.querySelector(sel);

  const K = {
    drop: [
      { opacity: 0, transform: 'translate(-10px,-22px) rotate(-1.2deg)', offset: 0 },
      { opacity: 1, offset: 0.35 },
      { transform: 'translate(1px,1px) rotate(0deg)', offset: 0.85 },
      { opacity: 1, transform: 'translate(0,0) rotate(0deg)', offset: 1 },
    ],
    slam: [
      { opacity: 0, transform: 'rotate(-22deg) scale(2.6)' },
      { opacity: 1, transform: 'rotate(-10deg) scale(.9)', offset: 0.6 },
      { opacity: 1, transform: 'rotate(-10deg) scale(1)' },
    ],
    blow: [
      { transform: 'translate(0,0)' },
      { transform: 'translate(3px,4px)', offset: 0.3 },
      { transform: 'translate(-1px,0)', offset: 0.6 },
      { transform: 'translate(0,0)' },
    ],
    rise: [
      { opacity: 0, transform: 'translateY(18px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    grow: [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
    pop: [
      { opacity: 0, transform: 'translateY(18px) scale(.94)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ],
  };

  /* ---- one-shot effects ---- */
  const fx = {
    drop(el) {
      anim(el, K.drop, 620, { delay: +el.dataset.d || 0 });
    },
    slam(el) {
      const d = +el.dataset.d || 0;
      anim(el, K.slam, 380, { delay: d, curve: 'leave' });
      const host = el.closest('[data-blow]');
      if (host) anim(host, K.blow, 320, { delay: d + 240, fill: 'none' });
    },
    rise(el) {
      return anim(el, K[el.dataset.kf || 'rise'], +el.dataset.ms || 440, {
        delay: +el.dataset.d || 0,
        curve: el.dataset.curve || 'travel',
      });
    },
    async flip(el) {
      const seq = (el.dataset.seq || '').split(',');
      if (seq.length < 2) return;
      const face = el.querySelector('[data-face]');
      const h = el.offsetHeight;
      const mk = (ch, part) => {
        const half = document.createElement('span');
        half.style.cssText = `position:absolute;left:0;right:0;height:50%;overflow:hidden;background:inherit;${
          part === 'top'
            ? 'top:0;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0;transform-origin:50% 100%;'
            : 'top:50%;border-radius:inherit;border-top-left-radius:0;border-top-right-radius:0;transform-origin:50% 0%;'
        }backface-visibility:hidden;`;
        const inner = document.createElement('span');
        inner.textContent = ch;
        inner.style.cssText = `position:absolute;left:0;right:0;height:${h}px;line-height:${h}px;text-align:center;${part === 'top' ? 'top:0' : 'top:-100%'}`;
        half.appendChild(inner);
        return half;
      };
      const layer = document.createElement('span');
      layer.style.cssText = 'position:absolute;inset:0;z-index:0;border-radius:inherit;background:inherit;perspective:300px;';
      el.appendChild(layer);
      if (face) face.style.visibility = 'hidden';
      const draw = (top, bottom) => {
        layer.replaceChildren(mk(top, 'top'), mk(bottom, 'bot'));
      };
      draw(seq[0], seq[0]);
      await wait(+el.dataset.d || 0);
      for (let i = 1; i < seq.length; i++) {
        const prev = seq[i - 1],
          next = seq[i];
        draw(next, prev);
        const ft = mk(prev, 'top'),
          fb = mk(next, 'bot');
        fb.style.transform = 'rotateX(90deg)';
        layer.append(ft, fb);
        await anim(ft, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], 180, { curve: 'leave' }).finished;
        ft.remove();
        await anim(fb, [{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], 220, { curve: 'arrive' }).finished;
        draw(next, next);
        await wait(140);
      }
      layer.remove();
      if (face) face.style.visibility = '';
    },
    arc(el) {
      const path = el.querySelector('[data-route]');
      const mask = el.querySelector('[data-mask]');
      const plane = el.querySelector('[data-plane]');
      const tag = el.querySelector('[data-dest]');
      const L = path.getTotalLength();
      const svg = path.ownerSVGElement;
      const ms = 1300;
      mask.style.strokeDasharray = `${L} ${L}`;
      anim(mask, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], ms, { curve: 'arc' });
      const t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const place = (t) => {
        const box = svg.getBoundingClientRect(),
          vb = svg.viewBox.baseVal;
        const k = box.width / vb.width;
        const p = path.getPointAtLength(L * t),
          q = path.getPointAtLength(Math.min(L, L * t + 1));
        const ang = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
        plane.style.transform = `translate(${p.x * k - 17}px,${p.y * k - 17}px) rotate(${ang}deg)`;
        plane.style.opacity = t <= 0 ? 0 : Math.min(1, t / 0.06);
      };
      place(0);
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        place(ease(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      if (tag)
        anim(
          tag,
          [{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.35) rotate(-4deg)', offset: 0.5 }, { transform: 'scale(1) rotate(0)' }],
          380,
          { delay: ms - 50, fill: 'none' },
        );
    },
    async budget(el) {
      const field = shown(el, '[data-type]');
      const coin = el.querySelector('[data-coin]');
      const fill = el.querySelector('[data-fill]');
      const left = shown(el, '[data-left]');
      const bar = el.querySelector('[data-bar]');
      const text = field.textContent;
      const from = +el.dataset.from,
        to = +el.dataset.to,
        total = +el.dataset.total;
      const sFrom = 1 - from / total,
        sTo = 1 - to / total;
      setText(field, '');
      fill.style.transform = `scaleX(${sFrom})`;
      setText(left, money(from, left));
      coin.style.opacity = 0;
      for (let i = 1; i <= text.length; i++) {
        setText(field, text.slice(0, i));
        await wait(42);
      }
      await wait(180);
      const a = field.getBoundingClientRect(),
        b = bar.getBoundingClientRect(),
        o = el.getBoundingClientRect();
      const x0 = a.right - o.left - 12,
        y0 = a.top - o.top + a.height / 2 - 12;
      const x1 = b.left - o.left + b.width * sTo - 12,
        y1 = b.top - o.top - 12;
      const mx = (x0 + x1) / 2,
        my = Math.min(y0, y1) - 70;
      const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => {
        const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
        const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
        return { transform: `translate(${x}px,${y}px) scale(${1 - 0.25 * t})`, opacity: t > 0.95 ? 0 : 1 };
      });
      pts[0].opacity = 1;
      await anim(coin, pts, 520, { curve: 'arc', fill: 'forwards' }).finished;
      coin.style.opacity = 0;
      anim(fill, [{ transform: `scaleX(${sFrom})` }, { transform: `scaleX(${sTo})` }], 420, { fill: 'none' });
      fill.style.transform = `scaleX(${sTo})`;
      anim(bar.parentElement, [{ transform: 'translate(0,0)' }, { transform: 'translate(3px,3px)', offset: 0.35 }, { transform: 'translate(0,0)' }], 360, {
        fill: 'none',
      });
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / 420);
        const e = 1 - Math.pow(1 - t, 3);
        setText(left, money(from + (to - from) * e, left));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    folders(el) {
      el.querySelectorAll('[data-folder]').forEach((f, i) => {
        anim(f, K.pop, 440, { delay: i * 60, curve: 'arrive' });
        const ph = f.querySelector('[data-photo]');
        if (ph)
          anim(
            ph,
            [{ transform: 'translateY(34px) rotate(0deg)' }, { transform: getComputedStyle(ph).transform === 'none' ? 'none' : getComputedStyle(ph).transform }],
            380,
            { delay: 300 + i * 60, curve: 'arrive' },
          );
      });
    },
    perks(el) {
      const items = [...el.querySelectorAll('[data-perk]')].filter((n) => n.getClientRects().length);
      items.forEach((it, i) => {
        anim(it, K.rise, 360, { delay: i * 60 });
        const ck = it.querySelector('[data-check]');
        if (ck) anim(ck, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], 300, { delay: 180 + i * 60, curve: 'arrive' });
      });
      const last = items[items.length - 1];
      const ck = last && last.querySelector('[data-check]');
      if (!ck) return;
      setTimeout(() => {
        const host = el,
          o = host.getBoundingClientRect(),
          r = ck.getBoundingClientRect();
        const cx = r.left - o.left + r.width / 2,
          cy = r.top - o.top + r.height / 2;
        const colors = ['#F4C542', '#22C58B', '#F06A24', '#E66A91', '#2869D8'];
        for (let i = 0; i < 16; i++) {
          const p = document.createElement('span');
          const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3,
            d = 40 + Math.random() * 50;
          p.style.cssText = `position:absolute;left:${cx - 4}px;top:${cy - 3}px;width:8px;height:6px;border-radius:1px;background:${colors[i % 5]};pointer-events:none;`;
          host.appendChild(p);
          anim(
            p,
            [
              { transform: 'translate(0,0) rotate(0)', opacity: 1 },
              { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 18}px) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 0 },
            ],
            560,
            { curve: 'burst' },
          ).finished.then(() => p.remove());
        }
      }, 180 + (items.length - 1) * 60 + 260);
    },
    tear(el) {
      const stub = el.querySelector('[data-stub]');
      anim(
        stub,
        [{ transform: 'translate(0,0) rotate(0deg)' }, { transform: 'translate(0,2px) rotate(1.5deg)', offset: 0.35 }, { transform: 'translate(10px,16px) rotate(5deg)' }],
        560,
        { delay: 200, curve: 'travel', fill: 'forwards' },
      );
    },
  };
  const finals = {
    tear(el) {
      const s = el.querySelector('[data-stub]');
      if (s) s.style.transform = 'translate(10px,16px) rotate(5deg)';
    },
  };

  function faq(root) {
    root.querySelectorAll('details[data-faq]').forEach((d) => {
      if (d._tb) return;
      d._tb = 1;
      const bar = d.querySelector('[data-vbar]');
      const body = d.querySelector('[data-body]');
      const sync = () => {
        if (bar) bar.style.transform = d.open ? 'rotate(90deg)' : 'rotate(0deg)';
      };
      sync();
      d.addEventListener('toggle', () => {
        sync();
        if (d.open && body && !reduced())
          anim(body, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }], 260, { fill: 'none' });
      });
    });
  }

  function run(root) {
    root = root || document;
    faq(root);
    const red = reduced();
    root.querySelectorAll('[data-m]').forEach((el) => {
      if (el._tb) return;
      el._tb = 1;
      const kind = el.dataset.m;
      if (red) {
        finals[kind] && finals[kind](el);
        return;
      }
      if (!fx[kind]) return;
      if (el.dataset.when === 'view' && 'IntersectionObserver' in window) {
        // Hold the first frame until it scrolls in.
        const hold = kind === 'rise' ? anim(el, K[el.dataset.kf || 'rise'], 1) : null;
        if (hold) hold.pause();
        const hide =
          kind === 'folders'
            ? [...el.querySelectorAll('[data-folder]')].map((f) => {
                const h = anim(f, K.pop, 1);
                h.pause();
                return h;
              })
            : [];
        const io = new IntersectionObserver(
          (es) => {
            if (!es.some((e) => e.isIntersecting)) return;
            io.disconnect();
            hold && hold.cancel();
            hide.forEach((h) => h.cancel());
            fx[kind](el);
          },
          { threshold: 0.35 },
        );
        io.observe(el);
      } else fx[kind](el);
    });
  }

  window.TBMotion = { run, curves: C, reduced };
  run(document);
})();
