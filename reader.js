'use strict';
(() => {
  const handbook = window.FLIPBOOK_HANDBOOK;
  const TOTAL = handbook?.total ?? window.FLIPBOOK_PAGES?.length ?? 30;
  const $ = id => document.getElementById(id);
  const book = $('book'), leaf = $('leaf'), stage = $('stage');
  const slots = {
    left: $('left').querySelector('img'), right: $('right').querySelector('img'),
    front: leaf.querySelector('.front img'), back: leaf.querySelector('.back img')
  };
  const mobileQuery = matchMedia('(max-width: 600px)');
  const spreadReader = document.body.classList.contains('handbook-reader');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const urls = window.FLIPBOOK_PAGES || Array.from({length: TOTAL}, (_, i) => `pages/${String(i + 1).padStart(2, '0')}.jpg`);
  const decoded = new Map();
  function pageUrl(index) {
    if (!handbook) return urls[index];
    const edition = compactImages ? 'mobile' : 'desktop';
    return `handbook-pages/${edition}/${String(index + 1).padStart(2, '0')}.webp?v=7cd4cbbd`;
  }
  const requestedPage = Number(new URLSearchParams(location.search).get('page'));
  const initialPage = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= TOTAL ? requestedPage - 1 : 0;
  let current = initialPage, single = !spreadReader && mobileQuery.matches, busy = false;
  let revision = 0, ready = false, activeAnimations = [];
  let compactImages = mobileQuery.matches;
  const hasSingleBack = TOTAL % 2 === 0;
  function pages(index, phone = single) {
    if (phone) return [null, index];
    if (index === 0) return [null, 0];
    if (hasSingleBack && index === TOTAL - 1) return [TOTAL - 1, null];
    const left = index % 2 ? index : index - 1;
    return [left, left + 1];
  }
  function position(index) {
    return single ? 'open' : index === 0 ? 'front' : hasSingleBack && index === TOTAL - 1 ? 'back' : 'open';
  }
  function translation(index) {
    return `translateX(${single ? 0 : index === 0 ? -25 : hasSingleBack && index === TOTAL - 1 ? 25 : 0}%)`;
  }
  function destination(direction) {
    const visible = pages(current).filter(n => n !== null);
    const next = direction > 0 ? visible.at(-1) + 1 : visible[0] - 1;
    return next < 0 || next >= TOTAL ? null : pages(next).find(n => n !== null);
  }
  function decode(index) {
    if (index === null) return Promise.resolve();
    const url = pageUrl(index);
    if (!decoded.has(url)) {
      const image = new Image();
      image.decoding = 'async'; image.src = url;
      const promise = image.decode().then(() => image).catch(error => { if (decoded.get(url) === promise) decoded.delete(url); throw error; });
      decoded.set(url, promise);
    }
    return decoded.get(url);
  }
  // Reuse four image elements for every turn. Image decoding happens before animation.
  function put(slot, index) {
    const image = slots[slot];
    const surface = image.parentElement;
    surface.classList.toggle('empty', index === null);
    if (index === null) { image.hidden = true; image.removeAttribute('src'); image.alt = ''; return; }
    image.hidden = false;
    const url = pageUrl(index);
    if (image.getAttribute('src') !== url) image.src = url;
    image.alt = slot === 'left' || slot === 'right' ? `Handbook page ${index + 1}` : '';
  }
  function controls() {
    const visible = pages(current).filter(n => n !== null);
    $('count').textContent = (visible.length > 1 ? `${visible[0] + 1}–${visible[1] + 1}` : visible[0] + 1) + ` / ${TOTAL}`;
    $('prev').disabled = !ready || destination(-1) === null;
    $('next').disabled = !ready || destination(1) === null;
  }
  function mediaState(isBusy) {
    document.dispatchEvent(new CustomEvent('flipbook:state', {detail: {
      pages: pages(current).map(n => n === null ? null : n + 1), busy: isBusy, single
    }}));
  }
  function settle() {
    const [left, right] = pages(current);
    put('left', left); put('right', right);
    book.dataset.position = position(current);
    book.classList.remove('turning');
    if (leaf.classList.contains('curling')) {
      leaf.classList.remove('curling');
      leaf.style.removeProperty('--curl-front');
      leaf.style.removeProperty('--curl-back');
      book.style.removeProperty('--curl-perspective');
    }
    leaf.style.transform = ''; leaf.style.opacity = '';
    // Release obsolete face references after the hidden leaf leaves the compositor.
    put('front', null); put('back', null);
    controls();
    mediaState(false);
  }
  function prefetch() {
    const wanted = new Set(pages(current).filter(n => n !== null));
    for (const direction of [-1, 1]) {
      const target = destination(direction);
      if (target !== null) pages(target).forEach(n => { if (n !== null) wanted.add(n); });
    }
    for (const n of wanted) decode(n).catch(() => {});
    const wantedUrls = new Set([...wanted].map(pageUrl));
    for (const url of decoded.keys()) if (!wantedUrls.has(url)) decoded.delete(url);
  }
  // Optional QA instrumentation; normal reading runs no per-frame JavaScript.
  function measure() {
    if (!new URLSearchParams(location.search).has('perf')) return () => {};
    let running = true, last = 0, id, intervals = [];
    function sample(time) {
      if (!running) return;
      if (last) intervals.push(time - last);
      last = time; id = requestAnimationFrame(sample);
    }
    id = requestAnimationFrame(sample);
    return () => {
      running = false; cancelAnimationFrame(id);
      const sorted = intervals.slice().sort((a,b) => a-b);
      const result = {page: current + 1, single, frames: intervals.length,
        averageMs: intervals.length ? intervals.reduce((a,b) => a+b,0) / intervals.length : 0,
        p95Ms: sorted[Math.floor(sorted.length * .95)] || 0,
        maxMs: sorted.at(-1) || 0, over25Ms: intervals.filter(n => n > 25).length};
      window.flipbookDiagnostics = [...(window.flipbookDiagnostics || []), result].slice(-30);
      book.dataset.performance = JSON.stringify(window.flipbookDiagnostics);
    };
  }
  // Bend one sheet across the spine using reusable strips. Each strip carries
  // matching slices of the front and back artwork, with the back in reverse order.
  const stripCount = 8;
  const strips = spreadReader ? Array.from({length: stripCount}, (_, index) => {
    const strip = document.createElement('div');
    strip.className = 'paper-strip';
    strip.style.width = `${100 / stripCount}%`;
    for (const [side, slice] of [['front', index], ['back', stripCount - 1 - index]]) {
      const face = document.createElement('div');
      face.className = `face ${side}`;
      face.style.backgroundSize = `${stripCount * 100}% 100%, ${stripCount * 100}% 100%`;
      face.style.backgroundPositionX = `${slice / (stripCount - 1) * 100}%`;
      strip.append(face);
    }
    leaf.append(strip);
    return strip;
  }) : [];

  let cachedCurl;
  function curlFrames(width) {
    if (cachedCurl?.width === width) return cachedCurl;
    const forward = strips.map(() => []);
    const stripWidth = width / stripCount;
    // Cover subpixel gaps where the browser rasterizes adjacent 3D edges separately.
    const seamScale = 1 + 0.75 / stripWidth;
    // Each slice starts at the previous slice's edge as the sheet bends.
    for (let step = 0; step <= 24; step++) {
      const progress = step / 24;
      const bend = Math.sin(Math.PI * progress) * 1.35;
      let x = 0, z = 0;
      for (let index = 0; index < stripCount; index++) {
        const angle = -Math.PI * progress + bend * (.5 - index / (stripCount - 1));
        const scale = index === stripCount - 1 ? 1 : seamScale;
        forward[index].push({transform: `translate3d(${x}px, 0, ${z}px) rotateY(${angle}rad) scaleX(${scale})`});
        x += stripWidth * Math.cos(angle);
        z -= stripWidth * Math.sin(angle);
      }
    }
    cachedCurl = {width, forward, backward: forward.map(frames => frames.slice().reverse())};
    return cachedCurl;
  }

  if (spreadReader && typeof ResizeObserver === 'function') {
    // Refresh geometry when the page changes size, before the next gesture.
    new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0 && !busy) curlFrames(width);
    }).observe(leaf);
  }

  function curl(direction, timing) {
    const width = leaf.getBoundingClientRect().width;
    const {forward, backward} = curlFrames(width);
    // Keep the projected depth relative to the sheet size across screen widths.
    book.style.setProperty('--curl-perspective', `${width * 4.4}px`);
    const frames = direction > 0 ? forward : backward;
    leaf.style.setProperty('--curl-front', `url("${slots.front.src}")`);
    leaf.style.setProperty('--curl-back', `url("${slots.back.src}")`);
    leaf.classList.add('curling');
    return strips.map((strip, index) => strip.animate(frames[index], timing));
  }

  async function turn(direction) {
    if (!ready) return;
    if (busy) return;
    const target = destination(direction);
    if (target === null) return;
    busy = true;
    mediaState(true);
    const token = revision;
    const old = pages(current), next = pages(target);
    let stopMeasure = () => {};
    try {
      await Promise.all([...new Set([...old, ...next])].map(decode));
      if (token !== revision) return;
      if (single) {
        put('front', direction > 0 ? old[1] : next[1]);
        put('back', null);
        put('right', direction > 0 ? next[1] : old[1]);
      } else if (direction > 0) {
        put('front', old[1]); put('back', next[0]);
        put('left', old[0]); put('right', next[1]);
      } else {
        put('front', next[1]); put('back', old[0]);
        put('left', next[0]); put('right', old[1]);
      }
      const from = single ? (direction > 0 ? 0 : -100) : (direction > 0 ? 0 : -180);
      const to = single ? (direction > 0 ? -100 : 0) : (direction > 0 ? -180 : 0);
      book.classList.add('turning');
      const timing = {duration: reduceMotion.matches ? 0 : single ? 360 : spreadReader ? 700 : 460,
        easing: 'cubic-bezier(.32,.05,.24,1)', fill: 'both'};
      const turnFrames = [{transform: `rotateY(${from}deg)`}, {transform: `rotateY(${to}deg)`}];
      if (single) {
        turnFrames[0].opacity = direction > 0 ? 1 : 0;
        turnFrames[1].opacity = direction > 0 ? 0 : 1;
      }
      const useCurl = spreadReader && !reduceMotion.matches && !document.hidden;
      activeAnimations = useCurl ? curl(direction, timing) : [leaf.animate(turnFrames, timing)];
      if (!single && translation(current) !== translation(target)) {
        activeAnimations.push(book.animate([{transform: translation(current)}, {transform: translation(target)}], timing));
      }
      if (useCurl) {
        // Paint the first pose before starting the shared animation clock.
        // A timeout also releases this wait if the tab is backgrounded.
        activeAnimations.forEach(animation => {
          animation.pause();
          animation.currentTime = 0;
        });
        await new Promise(resolve => {
          let secondFrame;
          const finish = () => {
            cancelAnimationFrame(firstFrame);
            if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
            clearTimeout(timeout);
            resolve();
          };
          const firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(finish); });
          const timeout = setTimeout(finish, 70);
        });
        if (token !== revision) return;
        activeAnimations.forEach(animation => {
          if (animation.playState !== 'finished') animation.play();
        });
      }
      stopMeasure = measure();
      await Promise.all(activeAnimations.map(animation => animation.finished));
      if (token !== revision) return;
      current = target;
      $('message').textContent = '';
    } catch (error) {
      if (token === revision && error.name !== 'AbortError') $('message').textContent = 'Page could not load. Please try turning again.';
    } finally {
      stopMeasure();
      if (token === revision) {
        // Commit the final static state before removing the animation's fill.
        settle();
        activeAnimations.forEach(animation => animation.cancel()); activeAnimations = [];
        busy = false;
        prefetch();
      }
    }
  }
  async function resizeMode() {
    if (spreadReader || single === mobileQuery.matches) return;
    revision++; activeAnimations.forEach(a => a.cancel()); activeAnimations = [];
    mediaState(true);
    busy = true; ready = false; single = mobileQuery.matches;
    compactImages = single;
    const token = revision;
    try {
      await Promise.all(pages(current).map(decode));
      if (token !== revision) return;
      ready = true; busy = false; settle(); prefetch();
    } catch { if (token === revision) { busy = false; $('message').textContent = 'Please reload to load this page.'; } }
  }
  document.addEventListener('flipbook:navigate', event => { if (event.detail?.direction === 1 || event.detail?.direction === -1) turn(event.detail.direction); });
  $('prev').addEventListener('click', () => turn(-1));
  $('next').addEventListener('click', () => turn(1));
  document.addEventListener('keydown', event => {
    if (event.target.closest('[data-no-turn],dialog')) return;
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); turn(event.key === 'ArrowRight' ? 1 : -1); }
  });
  let pointer = null, suppressClick = false;
  const zoomed = () => stage.classList.contains('zoomed');
  const cancelGesture = () => { pointer = null; suppressClick = true; };
  book.addEventListener('pointerdown', event => {
    if (event.target.closest('[data-no-turn]')) return;
    if (!event.isPrimary || event.button !== 0 || zoomed() || busy) { cancelGesture(); return; }
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, touch: event.pointerType === 'touch'};
    suppressClick = false;
    book.setPointerCapture(event.pointerId);
  });
  book.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const {touch, x, y} = pointer;
    const dx = event.clientX - x, dy = event.clientY - y;
    pointer = null;
    if (zoomed()) { cancelGesture(); return; }
    if (touch && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      suppressClick = true;
      turn(dx < 0 ? 1 : -1);
    } else if (Math.hypot(dx, dy) > 12) suppressClick = true;
  });
  book.addEventListener('pointercancel', cancelGesture);
  book.addEventListener('click', event => {
    if (event.target.closest('[data-no-turn]')) return;
    if (suppressClick) { suppressClick = false; return; }
    if (zoomed() || busy) return;
    const bounds = book.getBoundingClientRect();
    turn(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
  });
  let zoomScale = 1;
  function setZoom(scale) {
    zoomScale = scale;
    stage.classList.toggle('zoomed', scale > 1);
    stage.style.setProperty('--reading-zoom', scale);
    $('zoom').setAttribute('aria-pressed', String(scale > 1));
    $('zoom').textContent = scale > 1 ? '−' : '＋';
    if (scale === 1) stage.scrollTo(0, 0);
  }
  if (spreadReader) {
    let pinch;
    const distance = touches => Math.hypot(touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY);
    stage.addEventListener('touchstart', event => {
      if (event.touches.length !== 2) return;
      cancelGesture();
      if (event.cancelable) event.preventDefault();
      if (!busy) pinch = {distance: distance(event.touches), scale: zoomScale};
    }, {passive: false});
    stage.addEventListener('touchmove', event => {
      if (!pinch || event.touches.length !== 2) return;
      if (event.cancelable) event.preventDefault();
      const bounds = book.getBoundingClientRect();
      const x = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const y = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      const scale = Math.min(4, Math.max(1, pinch.scale * distance(event.touches) / Math.max(1, pinch.distance)));
      setZoom(scale < 1.04 ? 1 : scale);
      if (zoomed()) {
        const next = book.getBoundingClientRect();
        stage.scrollLeft += next.left + (x - bounds.left) * next.width / bounds.width - x;
        stage.scrollTop += next.top + (y - bounds.top) * next.height / bounds.height - y;
      }
    }, {passive: false});
    const finishPinch = () => { if (pinch) { pinch = null; cancelGesture(); } };
    stage.addEventListener('touchend', finishPinch);
    stage.addEventListener('touchcancel', finishPinch);
  }
  $('zoom').addEventListener('click', () => {
    if (!busy) setZoom(zoomed() ? 1 : 1.5);
  });
  const fullButton = $('full');
  const fallbackActive = () => document.body.classList.contains('fullscreen-fallback');
  function syncFullscreen() {
    const active = Boolean(document.fullscreenElement) || fallbackActive();
    const label = active ? 'Exit Fullscreen' : 'Fullscreen';
    fullButton.setAttribute('aria-label', label);
    fullButton.setAttribute('aria-pressed', String(active));
    fullButton.title = label;
    fullButton.textContent = active ? '⤢' : '⛶';
    cancelGesture();
  }
  fullButton.addEventListener('click', async () => {
    if (fallbackActive()) document.body.classList.remove('fullscreen-fallback');
    else if (document.fullscreenElement) await document.exitFullscreen();
    else {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        document.body.classList.add('fullscreen-fallback');
      }
    }
    syncFullscreen();
  });
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !fallbackActive()) return;
    document.body.classList.remove('fullscreen-fallback');
    syncFullscreen();
    fullButton.focus();
  });
  mobileQuery.addEventListener('change', resizeMode);
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) activeAnimations.forEach(animation => animation.finish()); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) activeAnimations.forEach(animation => animation.finish());
  });
  async function start() {
    try {
      await Promise.all(pages(current).map(decode)); ready = true; settle(); prefetch();
    } catch { $('message').textContent = 'The handbook could not load. Please reload to try again.'; }
  }
  start();
})();
