/**
 * main.js — Mossy the Dino
 */

/* ================================================================
   SCROLL ANIMATIONS
   Handles data-fade, data-fade-left, data-fade-right, data-scale
================================================================ */
(function initScrollAnimations() {
  var selectors = '[data-fade], [data-fade-left], [data-fade-right], [data-scale]';
  var elements = document.querySelectorAll(selectors);
  if (!elements.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(function (el) { observer.observe(el); });
})();

/* ================================================================
   STICKY CTA — appears after hero leaves viewport (mobile only)
================================================================ */
(function initStickyCta() {
  var hero = document.getElementById('hero');
  var bar  = document.getElementById('sticky-cta');
  if (!hero || !bar) return;

  var mobile = window.matchMedia('(max-width: 767px)');

  function check() {
    if (!mobile.matches) return;
    if (hero.getBoundingClientRect().bottom < 0) {
      bar.classList.add('is-visible');
    } else {
      bar.classList.remove('is-visible');
    }
  }

  window.addEventListener('scroll', check, { passive: true });
  check();
})();

/* ================================================================
   SMOOTH ANCHOR SCROLL — compensates for sticky nav height
================================================================ */
(function initSmoothScroll() {
  var NAV_H = 64;

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = this.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY - NAV_H;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });
})();

/* ================================================================
   LEAF PARALLAX — desktop only, rAF throttled
================================================================ */
(function initLeafParallax() {
  if (window.matchMedia('(max-width: 767px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var leaves = document.querySelectorAll('.jleaf');
  if (!leaves.length) return;

  var speeds = [0.04, -0.03, 0.05, -0.04, 0.03];
  leaves.forEach(function (l, i) {
    l.dataset.speed = speeds[i % speeds.length];
    l.style.setProperty('--drift', '0px');
  });

  var ticking = false;

  function update() {
    var y = window.scrollY;
    leaves.forEach(function (l) {
      var s = parseFloat(l.dataset.speed);
      var current = l.style.transform || '';
      // Only add translateY drift — preserve existing rotation set by CSS class
      l.style.marginTop = (y * s).toFixed(1) + 'px';
    });
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
})();

/* ================================================================
   TESTIMONIAL SWIPE DOTS — update active dot on mobile scroll
================================================================ */
(function initSwipeDots() {
  var rail  = document.querySelector('.testimonials');
  var dots  = document.querySelectorAll('.swipe-hint span');
  if (!rail || !dots.length) return;

  rail.addEventListener('scroll', function () {
    var index = Math.round(rail.scrollLeft / rail.offsetWidth);
    dots.forEach(function (d, i) {
      d.style.background = i === index
        ? 'var(--color-primary)'
        : 'var(--color-border)';
    });
  }, { passive: true });
})();

/* ================================================================
   ADD TO CART — placeholder, wire up to Shopify when ready
================================================================ */
(function initCart() {
  document.querySelectorAll('.buy__add, .sticky-cta__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var qty = document.getElementById('quantity')?.value || 1;
      console.log('[Cart] qty:', qty);
      var orig = btn.textContent;
      btn.textContent = 'Added!';
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = orig;
        btn.disabled = false;
      }, 1600);
    });
  });
})();
