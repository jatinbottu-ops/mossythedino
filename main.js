/**
 * main.js — Mossy the Dino Hoodie
 */

/* ================================================================
   ANALYTICS — helper around Vercel Web Analytics
================================================================ */
(function initAnalytics() {
  window.mossyTrack = function (name, data) {
    if (typeof window.va !== 'function') return;
    try {
      window.va('event', name, data || {});
    } catch (e) {
      /* Never let analytics break the storefront */
    }
  };

  var ctas = [
    { selector: '.nav__cta', name: 'Buy CTA Clicked', data: { location: 'nav' } },
    { selector: '.hero__cta', name: 'Buy CTA Clicked', data: { location: 'hero' } },
    { selector: '.sticky-cta__btn', name: 'Buy CTA Clicked', data: { location: 'sticky' } },
    { selector: '.hero__link', name: 'Social Proof Clicked', data: { location: 'hero' } }
  ];

  ctas.forEach(function (entry) {
    document.querySelectorAll(entry.selector).forEach(function (node) {
      node.addEventListener('click', function () {
        window.mossyTrack(entry.name, entry.data);
      });
    });
  });

  document.querySelectorAll('.btn--apple').forEach(function (node) {
    node.addEventListener('click', function () {
      window.mossyTrack('Express Checkout Clicked', { provider: 'apple_pay' });
    });
  });

  document.querySelectorAll('.btn--shoppay').forEach(function (node) {
    node.addEventListener('click', function () {
      window.mossyTrack('Express Checkout Clicked', { provider: 'shop_pay' });
    });
  });
})();

/* ================================================================
   CHECKOUT RETURN STATE
================================================================ */
(function initCheckoutState() {
  var params = new URLSearchParams(window.location.search);
  var state = params.get('checkout');
  if (!state) return;

  function showMessage(text, type) {
    var existing = document.getElementById('checkout-message');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.id = 'checkout-message';
    banner.className = 'checkout-message checkout-message--' + type;
    banner.textContent = text;
    document.body.prepend(banner);
  }

  if (state === 'cancel') {
    showMessage('Checkout was canceled. Your cart is still here when you are ready.', 'warning');
    return;
  }

  if (state !== 'success') return;

  var sessionId = params.get('session_id');
  if (!sessionId) {
    showMessage('Payment return received, but the session could not be verified.', 'warning');
    return;
  }

  fetch('/api/checkout-session-status?session_id=' + encodeURIComponent(sessionId))
    .then(function (res) { return res.json(); })
    .then(function (payload) {
      if (payload && payload.payment_status === 'paid') {
        localStorage.removeItem('mossy_cart');
        showMessage('Payment successful. Thank you for your order.', 'success');
        window.mossyTrack('Purchase Completed', { session_id: sessionId });
      } else {
        showMessage('Checkout returned, but payment is still pending.', 'warning');
      }
    })
    .catch(function () {
      showMessage('Payment return received, but verification failed.', 'warning');
    });
})();

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
   CART — tracks items in localStorage, shows count in nav
================================================================ */
(function initCart() {

  var STORAGE_KEY = 'mossy_cart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  function totalItems(cart) {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function updateBadge() {
    var cart  = getCart();
    var count = totalItems(cart);
    var badge = document.getElementById('cart-badge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function startCheckout(source, items) {
    var checkoutItems = Array.isArray(items) ? items : getCart();
    if (!checkoutItems.length) return;

    window.mossyTrack('Checkout Started', {
      source: source || 'unknown',
      items: checkoutItems.length
    });

    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items: checkoutItems })
    })
      .then(function (res) { return res.json(); })
      .then(function (payload) {
        if (!payload || !payload.url) {
          throw new Error(payload && payload.error ? payload.error : 'Unable to start checkout');
        }
        window.location.href = payload.url;
      })
      .catch(function (error) {
        window.alert(error.message || 'Unable to start checkout right now.');
      });
  }

  function addToCart() {
    var qty  = parseInt(document.getElementById('quantity')?.value  || 1, 10);
    var size = document.getElementById('size')?.value || 'child';
    var cart = getCart();

    window.mossyTrack('Add To Cart Clicked', {
      size: size,
      qty: qty
    });

    var existing = cart.find(function (i) { return i.size === size; });
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ name: 'Mossy the Dino Hoodie', size: size, price: 39, qty: qty });
    }

    saveCart(cart);
    updateBadge();
  }

  /* Inject cart icon + badge into nav */
  var navInner = document.querySelector('.nav__inner');
  if (navInner) {
    var cartBtn = document.createElement('button');
    cartBtn.className  = 'cart-btn';
    cartBtn.type       = 'button';
    cartBtn.setAttribute('aria-label', 'View cart');
    cartBtn.innerHTML  =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
      '<span class="cart-badge" id="cart-badge" style="display:none">0</span>';
    navInner.appendChild(cartBtn);

    cartBtn.addEventListener('click', function () {
      openCartDrawer('nav_cart');
    });
  }

  /* Cart drawer */
  function buildDrawer() {
    var drawer = document.createElement('div');
    drawer.id        = 'cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-label', 'Shopping cart');
    drawer.setAttribute('role', 'dialog');
    drawer.innerHTML =
      '<div class="cart-drawer__backdrop"></div>' +
      '<div class="cart-drawer__panel">' +
        '<div class="cart-drawer__head">' +
          '<h2 class="cart-drawer__title">Your cart</h2>' +
          '<button class="cart-drawer__close" type="button" aria-label="Close cart">' +
            '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="2" y1="2" x2="16" y2="16"/><line x1="16" y1="2" x2="2" y2="16"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="cart-drawer__body" id="cart-body"></div>' +
        '<div class="cart-drawer__foot" id="cart-foot"></div>' +
      '</div>';
    document.body.appendChild(drawer);

    drawer.querySelector('.cart-drawer__backdrop').addEventListener('click', closeCartDrawer);
    drawer.querySelector('.cart-drawer__close').addEventListener('click', closeCartDrawer);
    return drawer;
  }

  function renderDrawer() {
    var cart  = getCart();
    var body  = document.getElementById('cart-body');
    var foot  = document.getElementById('cart-foot');
    if (!body || !foot) return;

    if (cart.length === 0) {
      body.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
      foot.innerHTML =
        '<button class="btn btn--primary btn--lg cart-checkout" type="button" disabled>Checkout — cart empty</button>';
      return;
    }

    var total = cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);

    body.innerHTML = cart.map(function (item, idx) {
      return (
        '<div class="cart-item">' +
          '<div class="cart-item__info">' +
            '<span class="cart-item__name">' + item.name + '</span>' +
            '<span class="cart-item__meta">Size: ' + (item.size === 'adult' ? 'Adult fit' : 'Child fit') + '</span>' +
          '</div>' +
          '<div class="cart-item__controls">' +
            '<button class="cart-item__qty-btn" data-idx="' + idx + '" data-delta="-1" aria-label="Remove one">−</button>' +
            '<span class="cart-item__qty">' + item.qty + '</span>' +
            '<button class="cart-item__qty-btn" data-idx="' + idx + '" data-delta="1" aria-label="Add one">+</button>' +
          '</div>' +
          '<span class="cart-item__price">$' + (item.price * item.qty) + '</span>' +
        '</div>'
      );
    }).join('');

    foot.innerHTML =
      '<div class="cart-total"><span>Total</span><span>$' + total + '</span></div>' +
      '<button class="btn btn--primary btn--lg cart-checkout" type="button">Checkout — coming soon</button>';

    var checkoutBtn = foot.querySelector('.cart-checkout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', function () {
        window.mossyTrack('Checkout Clicked', {
          items: cart.length,
          total: total
        });
        startCheckout('cart_drawer', cart);
      });
    }

    body.querySelectorAll('.cart-item__qty-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx   = parseInt(btn.dataset.idx, 10);
        var delta = parseInt(btn.dataset.delta, 10);
        var cart  = getCart();
        cart[idx].qty += delta;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
        saveCart(cart);
        updateBadge();
        renderDrawer();
      });
    });
  }

  function openCartDrawer(source) {
    var drawer = document.getElementById('cart-drawer') || buildDrawer();
    renderDrawer();
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    window.mossyTrack('Cart Opened', {
      source: source || 'unknown'
    });
  }

  function closeCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    if (drawer) drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* Add to cart buttons */
  document.querySelectorAll('.buy__add').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addToCart();
      var orig = btn.textContent;
      btn.textContent = 'Added!';
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = orig;
        btn.disabled = false;
      }, 1400);
      openCartDrawer('buy_section');
    });
  });

  document.querySelectorAll('.sticky-cta__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openCartDrawer('sticky_cta');
    });
  });

  document.querySelectorAll('.btn--apple, .btn--shoppay').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var qty  = parseInt(document.getElementById('quantity')?.value || 1, 10);
      var size = document.getElementById('size')?.value || 'child';
      startCheckout('express_button', [{
        name: 'Mossy the Dino Hoodie',
        size: size,
        price: 39,
        qty: qty
      }]);
    });
  });

  updateBadge();
})();
