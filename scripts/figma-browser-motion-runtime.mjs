// Embedded in generated app.js; no imports, remote assets or Figma operations at runtime.
export function installBrowserMotion(manifest) {
  const app = document.querySelector('[data-figma-app]');
  const screens = [...app.querySelectorAll('[data-figma-screen]')];
  const node = id => [...app.querySelectorAll('[data-figma-node]')].find(el => el.dataset.figmaNode === id);
  const screen = id => screens.find(el => el.dataset.figmaScreen === id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current, pending, generation = 0, animations = [], animationFinish, scrollFrame = 0, scrollFinish, modal, opener;
  const mark = (el, motion, state) => {
    el.dataset.figmaMotion = motion?.token || 'NONE';
    el.dataset.figmaTransition = motion?.native?.type || 'NONE';
    el.dataset.figmaMotionState = state;
    el.dataset.figmaMotionDuration = reduced.matches ? '0' : String(motion?.durationMs || 0);
    el.dataset.figmaMotionEasing = motion?.easing || 'none';
  };
  const stopScroll = () => { cancelAnimationFrame(scrollFrame); scrollFrame = 0; if (scrollFinish) { scrollFinish(false); scrollFinish = null; } };
  function settle() {
    generation++;
    animations.forEach(a => a.cancel()); animations = [];
    const finish = animationFinish; animationFinish = null; finish?.();
    screens.forEach(el => { el.hidden = el !== screen(current) && el !== modal; el.inert = el.hidden; });
    app.dataset.figmaMotionState = 'settled';
    if (reduced.matches) app.dataset.figmaMotionDuration = '0';
  }
  function animate(elements, motion, done) {
    const ticket = ++generation;
    mark(app, motion, 'running');
    if (reduced.matches || !motion?.durationMs) { done(); mark(app, motion, 'settled'); return; }
    animationFinish = done;
    animations = elements.map(([el, frames]) => el.animate(frames, { duration: motion.durationMs, easing: motion.easing, fill: 'both' }));
    Promise.all(animations.map(a => a.finished.catch(() => {}))).then(() => {
      if (ticket !== generation) return;
      animations.forEach(a => a.cancel()); animations = []; animationFinish = null; done(); mark(app, motion, 'settled');
    });
  }
  function route() {
    stopScroll(); settle();
    if (modal) closeModal(false);
    const id = location.hash.slice('#/screen/'.length);
    const next = screen(id) || screen(manifest.startScreenId), previous = screen(current);
    if (location.hash && !screen(id)) history.replaceState(null, '', `#/screen/${manifest.startScreenId}`);
    const motion = pending?.destinationId === next.dataset.figmaScreen ? pending.motion : null;
    pending = null; current = next.dataset.figmaScreen;
    screens.forEach(el => { el.hidden = el !== next && el !== previous; el.inert = el !== next; });
    const done = () => { screens.forEach(el => { el.hidden = el !== next; el.inert = el.hidden; }); };
    if (!previous || previous === next || !motion || !['fade','spatial'].includes(motion.kind)) { done(); mark(app, motion, 'settled'); return; }
    if (motion.kind === 'fade') animate([[previous, [{ opacity: 1 }, { opacity: 0 }]], [next, [{ opacity: 0 }, { opacity: 1 }]]], motion, done);
    else {
      const horizontal = ['LEFT','RIGHT'].includes(motion.direction), sign = ['LEFT','TOP'].includes(motion.direction) ? -1 : 1;
      const translate = n => horizontal ? `translateX(${n}%)` : `translateY(${n}%)`;
      const type = motion.native.type;
      const incoming = ['PUSH','MOVE_IN','SLIDE_IN'].includes(type), outgoing = ['PUSH','MOVE_OUT','SLIDE_OUT'].includes(type);
      previous.style.zIndex = outgoing && !incoming ? '2' : '1'; next.style.zIndex = outgoing && !incoming ? '1' : '2';
      animate([[previous, [{ transform: 'none' }, { transform: translate(outgoing ? sign * 100 : 0) }]], [next, [{ transform: translate(incoming ? -sign * 100 : 0) }, { transform: 'none' }]]], motion, done);
    }
  }
  function openModal(i, source) {
    settle(); stopScroll(); if (modal) closeModal(false);
    modal = screen(i.destinationId); if (!modal) return;
    opener = source; modal.hidden = false; modal.inert = false;
    modal.dataset.figmaOverlay = 'open'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.tabIndex = -1;
    screen(current).inert = true; modal.focus();
    animate([[modal, [{ opacity: 0 }, { opacity: 1 }]]], i.motion, () => {});
  }
  function closeModal(withMotion = true) {
    if (!modal) return;
    const closing = modal, originalOpener = opener;
    const motion = manifest.interactions.find(i => i.navigation === 'OVERLAY' && i.destinationId === closing.dataset.figmaScreen)?.motion;
    const done = () => { closing.hidden = true; closing.inert = true; delete closing.dataset.figmaOverlay; modal = null; screen(current).inert = false; originalOpener?.focus(); };
    if (withMotion) { settle(); animate([[closing, [{ opacity: 1 }, { opacity: 0 }]]], motion, done); } else done();
  }
  // CSS ease-out = cubic-bezier(0,0,.58,1); solve time coordinate, then value coordinate.
  function easeOut(t) {
    let low = 0, high = 1;
    for (let k = 0; k < 16; k++) {
      const s = (low + high) / 2, x = 3 * (1-s) * s*s * .58 + s*s*s;
      if (x < t) low = s; else high = s;
    }
    const s = (low + high) / 2; return 3 * (1-s) * s*s + s*s*s;
  }
  function scroll(i) {
    stopScroll();
    const target = node(i.destinationId), container = node(i.motion?.containerId) || screen(i.motion?.containerId);
    if (!target || !container || !container.contains(target)) return;
    const rect = target.getBoundingClientRect(), outer = container.getBoundingClientRect(), style = getComputedStyle(container);
    const axes = { x: /(auto|scroll)/.test(style.overflowX), y: /(auto|scroll)/.test(style.overflowY) };
    const end = { x: axes.x ? Math.max(0,Math.min(container.scrollWidth-container.clientWidth, container.scrollLeft+rect.left-outer.left-container.clientLeft)) : container.scrollLeft, y: axes.y ? Math.max(0,Math.min(container.scrollHeight-container.clientHeight, container.scrollTop+rect.top-outer.top-container.clientTop)) : container.scrollTop };
    const from = { x: container.scrollLeft, y: container.scrollTop };
    const set = (x,y) => container.scrollTo({ left:x, top:y, behavior:'instant' });
    const finish = correct => { if (correct) set(end.x,end.y); mark(app,i.motion,'settled'); scrollFrame = 0; };
    mark(app,i.motion,'running');
    if (reduced.matches || i.motion.kind === 'scroll-native' || from.x === end.x && from.y === end.y) { finish(true); return; }
    scrollFinish = finish;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min(1,(now-start)/i.motion.durationMs), value = easeOut(progress);
      set(from.x+(end.x-from.x)*value,from.y+(end.y-from.y)*value);
      if (progress === 1) { scrollFinish = null; finish(true); } else scrollFrame = requestAnimationFrame(tick);
    };
    scrollFrame = requestAnimationFrame(tick);
  }
  for (const i of manifest.interactions) {
    const el = node(i.sourceId); if (!el) continue;
    if (i.motion?.kind === 'state') {
      const trigger = typeof i.trigger === 'object' ? i.trigger.type : i.trigger;
      const initial = el.dataset.figmaState;
      el.style.setProperty('--figma-state-duration', `${i.motion.durationMs}ms`);
      el.addEventListener(trigger === 'ON_PRESS' ? 'pointerdown' : 'pointerenter', () => { if (!i.sourceVariantId || el.dataset.figmaState === i.sourceVariantId) el.dataset.figmaState = i.destinationId; });
      el.addEventListener(trigger === 'ON_PRESS' ? 'pointerup' : 'pointerleave', () => { el.dataset.figmaState = trigger === 'ON_PRESS' && el.matches(':hover') ? i.sourceVariantId || initial : initial; });
    }
  }
  app.addEventListener('click', event => {
    let el = event.target.closest('[data-figma-node]'), i;
    while (el && app.contains(el)) {
      i = manifest.interactions.find(i => i.sourceId === el.dataset.figmaNode && (typeof i.trigger === 'object' ? i.trigger.type : i.trigger) === 'ON_CLICK');
      if (i) break;
      el = el.parentElement?.closest('[data-figma-node]');
    }
    if (!i) return;
    if (i.navigation === 'NAVIGATE') {
      pending = i;
      if (el.tagName !== 'A') location.hash = `#/screen/${i.destinationId}`;
    } else if (i.navigation === 'OVERLAY') { event.preventDefault(); openModal(i, el); }
    else if (i.action === 'CLOSE') { event.preventDefault(); closeModal(); }
    else if (i.action === 'BACK') history.back();
    else if (['scroll','scroll-native'].includes(i.motion?.kind)) { event.preventDefault(); scroll(i); }
  });
  app.addEventListener('keydown', event => {
    if (!modal) return;
    const controls = [...modal.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el => !el.disabled);
    if (event.key === 'Tab' && controls.length) {
      const index = controls.indexOf(document.activeElement), next = event.shiftKey ? (index <= 0 ? controls.length-1 : index-1) : (index+1)%controls.length;
      event.preventDefault(); controls[next].focus();
    }
  });
  for (const type of ['wheel','touchstart','pointerdown']) app.addEventListener(type, stopScroll, { passive:true });
  reduced.addEventListener('change', () => { if (reduced.matches) { const finish = scrollFinish; stopScroll(); finish?.(true); settle(); } });
  addEventListener('hashchange', route); route();
}

export function browserMotionSource(manifest) {
  return `(${installBrowserMotion.toString()})(${JSON.stringify(manifest).replace(/</g, '\\u003c')});\n`;
}
