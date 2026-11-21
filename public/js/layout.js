/* layout.js — injects shared header + footer (v2 restyle), auth-aware nav,
   dropdowns, mobile menu, site search, info dialogs, reveal-on-scroll.
   Auth behavior, element IDs and the layout:ready event are unchanged. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var ICONS = {
    chevron: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4"/></svg>',
    heart: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3A5.4 5.4 0 0 1 12 6.4a5.4 5.4 0 0 1 9.6 5.3C19.500 16.400 12 21 12 21z"/></svg>',
    mail: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3 7l9 6.500L21 7"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    pin: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.200 7-12a7 7 0 0 0-14 0c0 5.800 7 12 7 12z M12 12.500a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z"/></svg>',
    facebook: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.500c0-.3.2-.5.5-.5z"/></svg>',
    instagram: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3.500" y="3.500" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.200" cy="6.800" r="1" fill="currentColor"/></svg>',
    youtube: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.500 7.200a2.500 2.500 0 0 0-1.800-1.800C18.100 5 12 5 12 5s-6.100 0-7.700.4A2.500 2.500 0 0 0 2.500 7.200C2 8.800 2 12 2 12s0 3.200.5 4.800a2.500 2.500 0 0 0 1.800 1.800C5.900 19 12 19 12 19s6.100 0 7.700-.4a2.500 2.500 0 0 0 1.800-1.800C22 15.200 22 12 22 12s0-3.200-.5-4.800zM10 15V9l5.200 3z"/></svg>',
    linkedin: '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 9h4v11H4z M6 3.500a2.200 2.200 0 1 1 0 4.400 2.200 2.200 0 0 1 0-4.400z M10 9h3.800v1.600c.6-1 1.900-1.900 3.800-1.900 3.600 0 4.400 2.300 4.400 5.500V20h-4v-5c0-1.400 0-3-1.900-3s-2.200 1.400-2.200 2.900V20H10z"/></svg>'
  };

  var NAV = [
    { href: '/index.html', label: 'Home' },
    { href: '/about.html', label: 'About Us' },
    { href: '/programs.html', label: 'Our Programs', children: [
      { href: '/programs.html', label: 'Programs Overview' },
      { href: '/burn-support.html', label: 'Burn Survivor Support' },
      { href: '/newcomer-support.html', label: 'Newcomer Support' },
      { href: '/arabic-learning.html', label: 'Arabic Learning' }
    ]},
    { href: '/get-involved.html', label: 'Get Involved', children: [
      { href: '/get-involved.html', label: 'Ways to Help' },
      { href: '/contact.html?subject=Volunteering', label: 'Volunteer' },
      { href: '/contact.html?subject=Partnership', label: 'Partner With Us' },
      { href: '/donate.html', label: 'Donate' }
    ]},
    { href: '/contact.html', label: 'Contact' }
  ];

  var SEARCH_INDEX = [
    { t: 'Home', u: '/index.html', k: 'home welcome mission healing belonging hope' },
    { t: 'About Us', u: '/about.html', k: 'about story mission vision values organization' },
    { t: 'Our Programs', u: '/programs.html', k: 'programs burn newcomer arabic overview apply' },
    { t: 'Burn Survivor Support', u: '/burn-support.html', k: 'burn survivor medical financial emotional recovery healing' },
    { t: 'Newcomer Support', u: '/newcomer-support.html', k: 'newcomer immigrant settlement healthcare education employment arab families' },
    { t: 'Arabic Learning', u: '/arabic-learning.html', k: 'arabic language classes children enroll culture heritage' },
    { t: 'Get Involved', u: '/get-involved.html', k: 'volunteer partner get involved donate' },
    { t: 'Donate', u: '/donate.html', k: 'donate give support gift' },
    { t: 'Contact Us', u: '/contact.html', k: 'contact email phone message form' },
    { t: 'Login', u: '/login.html', k: 'login sign in account' },
    { t: 'Create an Account', u: '/register.html', k: 'register create account sign up' },
    { t: 'My Dashboard', u: '/dashboard.html', k: 'dashboard profile applications track notifications messages' }
  ];

  var current = window.location.pathname.replace(/\/$/, '/index.html');
  if (current === '/') current = '/index.html';

  function isCurrent(href) {
    var path = href.split('?')[0];
    return current === path || (path === '/index.html' && current === '/index.html');
  }
  function linkAttrs(href) {
    return isCurrent(href) ? ' aria-current="page"' : '';
  }

  function renderHeader(user) {
    var items = NAV.map(function (l) {
      if (!l.children) {
        return '<li><a href="' + l.href + '"' + linkAttrs(l.href) + '>' + l.label + '</a></li>';
      }
      var childActive = l.children.some(function (c) { return isCurrent(c.href); });
      var kids = l.children.map(function (c) {
        return '<li><a href="' + c.href + '"' + linkAttrs(c.href) + '>' + c.label + '</a></li>';
      }).join('');
      return '<li class="has-dropdown"><a href="' + l.href + '"' + (childActive ? ' aria-current="page"' : '') + '>' + l.label + '</a>' +
        '<button class="dropdown-toggle" type="button" aria-expanded="false" aria-label="Toggle ' + l.label + ' submenu">' + ICONS.chevron + '</button>' +
        '<ul class="dropdown" aria-label="' + l.label + '">' + kids + '</ul></li>';
    }).join('');

    var authHtml;
    var accountDropdown = '';
    if (user) {
      var adminLink = isAdmin(user) ? '<li><a href="/admin.html"' + linkAttrs('/admin.html') + '>Admin</a></li>' : '';
      var accountActive = isCurrent('/dashboard.html') || isCurrent('/admin.html');
      accountDropdown = '<li class="has-dropdown"><a href="/dashboard.html"' + (accountActive ? ' aria-current="page"' : '') + '>My Account</a>' +
        '<button class="dropdown-toggle" type="button" aria-expanded="false" aria-label="Toggle My Account submenu">' + ICONS.chevron + '</button>' +
        '<ul class="dropdown" aria-label="My Account">' +
        '<li><a href="/dashboard.html"' + linkAttrs('/dashboard.html') + '>Dashboard<span id="unread-badge"></span></a></li>' +
        adminLink +
        '<li><button class="dropdown-btn" id="logout-btn" type="button">Logout</button></li>' +
        '</ul></li>';
    } else {
      authHtml = '<a href="/login.html"' + linkAttrs('/login.html') + '>Login</a>' +
        '<a href="/register.html" class="btn btn-teal btn-sm"' + linkAttrs('/register.html') + '>Register</a>';
    }

    return `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="container header-inner">
      <a class="brand" href="/index.html" aria-label="Arabic Step for Life — home"><img class="brand-logo" src="/assets/logo/logo-full.png" alt="Arabic Step for Life Organization, Inc." width="1070" height="300"></a>
      <nav id="main-nav" class="primary-nav" aria-label="Primary">
        <ul>
          ${items}
          ${accountDropdown}
          <li class="nav-search"><button class="search-open" type="button">${ICONS.search} Search the site</button></li>
          ${user ? '' : '<li><span class="nav-auth">' + authHtml + '</span></li>'}
        </ul>
      </nav>
      <div class="header-actions">
        <button class="icon-btn search-open" type="button" aria-label="Search the site">${ICONS.search}</button>
        <a class="btn btn-cta btn-sm" href="/donate.html">Donate ${ICONS.heart}</a>
        <button class="nav-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav"><span class="sr-only">Toggle menu</span><span class="bars"></span></button>
      </div>
    </div>`;
  }

  function renderFooter() {
    return `
    <div class="container footer-grid">
      <div>
        <a class="footer-brand" href="/index.html" aria-label="Arabic Step for Life — home"><img class="brand-logo" src="/assets/logo/logo-full.png" alt="Arabic Step for Life Organization, Inc." width="1070" height="300"></a>
        <p class="footer-note">A nonprofit initiative under development in the United States. Legal and tax-exempt status: <span class="ph" title="Placeholder: replace with confirmed information">to be confirmed</span>.</p>
        <p class="footer-note"><span class="placeholder-note">[Placeholder — EIN / registration details to be provided by the organization]</span></p>
      </div>
      <div><h3>Quick Links</h3><ul class="footer-links"><li><a href="/index.html">Home</a></li><li><a href="/about.html">About Us</a></li><li><a href="/programs.html">Our Programs</a></li><li><a href="/contact.html">Contact Us</a></li></ul></div>
      <div><h3>Get Involved</h3><ul class="footer-links"><li><a href="/contact.html?subject=Volunteering">Volunteer</a></li><li><a href="/donate.html">Donate</a></li><li><a href="/contact.html?subject=Partnership">Partner With Us</a></li><li><a href="/get-involved.html">Ways to Help</a></li></ul></div>
      <div><h3>Contact Us</h3><ul class="footer-contact">
        <li>${ICONS.mail}<a href="/contact.html"><span class="ph" title="Placeholder: replace with confirmed information">info@your-domain.org</span></a></li>
        <li>${ICONS.phone}<span class="ph" title="Placeholder: replace with confirmed information">(000) 000-0000</span></li>
        <li>${ICONS.pin}<span class="placeholder-note">[Placeholder — address to be provided by the organization]</span></li>
        <li>${ICONS.pin}United States</li>
      </ul></div>
      <div><h3>Follow Us</h3><div class="socials">
        <a href="/contact.html" aria-label="Facebook (profile link coming soon)" title="Facebook: profile link is a placeholder">${ICONS.facebook}</a>
        <a href="/contact.html" aria-label="Instagram (profile link coming soon)" title="Instagram: profile link is a placeholder">${ICONS.instagram}</a>
        <a href="/contact.html" aria-label="YouTube (profile link coming soon)" title="YouTube: profile link is a placeholder">${ICONS.youtube}</a>
        <a href="/contact.html" aria-label="LinkedIn (profile link coming soon)" title="LinkedIn: profile link is a placeholder">${ICONS.linkedin}</a>
      </div></div>
    </div>
    <div class="footer-bottom"><div class="container">
      <span>© ${new Date().getFullYear()} Arabic Step for Life Organization, Inc. All Rights Reserved.</span>
      <nav aria-label="Legal"><a href="/contact.html">Privacy Policy</a><a href="/contact.html">Terms of Use</a></nav>
    </div></div>`;
  }

  function renderDialogs() {
    if (document.getElementById('search-dialog')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<dialog id="info-dialog" aria-labelledby="info-title"><div class="dialog-body"><h2 id="info-title">Coming soon</h2><p id="info-text"></p><button class="btn btn-teal btn-sm" type="button" data-close>Got it</button></div></dialog>' +
      '<dialog id="search-dialog" aria-label="Search the site"><div class="dialog-body"><label for="search-input" class="sr-only">Search pages</label><input id="search-input" class="search-input" type="search" placeholder="Search pages: volunteer, Arabic, donate…" autocomplete="off"><div id="search-results" class="search-results" aria-live="polite"></div><p style="margin:1rem 0 0"><button class="btn btn-outline btn-sm" type="button" data-close>Close</button></p></div></dialog>';
    document.body.appendChild(wrap);
  }

  function openDialog(d) {
    if (!d) return;
    if (typeof d.showModal === 'function') { if (!d.open) d.showModal(); } else { d.setAttribute('open', ''); }
  }
  function closeDialog(d) {
    if (!d) return;
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }

  function bindChrome() {
    var toggle = document.getElementById('menu-toggle');
    var nav = document.getElementById('main-nav');
    var header = document.querySelector('.site-header');

    function closeDropdowns(except) {
      document.querySelectorAll('.has-dropdown').forEach(function (li) {
        if (li === except) return;
        li.classList.remove('open');
        var b = li.querySelector('.dropdown-toggle');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }
    function closeNav() {
      if (!nav) return;
      nav.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
    document.querySelectorAll('.has-dropdown').forEach(function (li) {
      var btn = li.querySelector('.dropdown-toggle');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = !li.classList.contains('open');
        closeDropdowns(li);
        li.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.has-dropdown')) closeDropdowns();
      if (nav && nav.classList.contains('open') && !e.target.closest('.primary-nav') && !e.target.closest('.nav-toggle')) closeNav();
      if (e.target.closest('.primary-nav a')) closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDropdowns(); closeNav(); }
    });

    function onScroll() { if (header) header.classList.toggle('is-stuck', window.scrollY > 8); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* Dialogs */
    document.querySelectorAll('dialog').forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); });
      d.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeDialog(d); }); });
    });
    var info = document.getElementById('info-dialog');
    document.querySelectorAll('[data-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!info) return;
        document.getElementById('info-title').textContent = btn.getAttribute('data-modal-title') || 'Coming soon';
        document.getElementById('info-text').textContent = btn.getAttribute('data-modal');
        openDialog(info);
      });
    });

    /* Site search (client-side page index) */
    var sDlg = document.getElementById('search-dialog');
    var sInput = document.getElementById('search-input');
    var sList = document.getElementById('search-results');
    function renderResults(q) {
      if (!sList) return;
      q = (q || '').trim().toLowerCase();
      var hits = SEARCH_INDEX.filter(function (p) { return !q || (p.t + ' ' + p.k).toLowerCase().indexOf(q) !== -1; });
      sList.innerHTML = '';
      if (!hits.length) { sList.innerHTML = '<p class="ph-note">No pages match that search. Try “volunteer”, “Arabic” or “donate”.</p>'; return; }
      hits.forEach(function (p) {
        var a = document.createElement('a');
        a.href = p.u;
        a.innerHTML = '<strong></strong>';
        a.firstChild.textContent = p.t;
        sList.appendChild(a);
      });
    }
    document.querySelectorAll('.search-open').forEach(function (b) {
      b.addEventListener('click', function () {
        renderResults('');
        openDialog(sDlg);
        if (sInput) { sInput.value = ''; setTimeout(function () { sInput.focus(); }, 30); }
      });
    });
    if (sInput) {
      sInput.addEventListener('input', function () { renderResults(sInput.value); });
      sInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { var first = sList.querySelector('a'); if (first) window.location.href = first.getAttribute('href'); }
      });
    }

    /* Reveal on scroll (gentle, one-time) */
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12 });
      reveals.forEach(function (r) { io.observe(r); });
    } else {
      reveals.forEach(function (r) { r.classList.add('in'); });
    }
  }

  async function init() {
    const headerEl = document.getElementById('site-header');
    const footerEl = document.getElementById('site-footer');
    let user = null;
    try { user = await getCurrentUser(); } catch (e) { user = null; }
    if (headerEl) {
      headerEl.className = 'site-header';
      headerEl.innerHTML = renderHeader(user);
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try { await API.post('/api/auth/logout', {}); } catch (e) { /* ignore */ }
          _currentUser = null; _meChecked = false;
          window.location.href = '/index.html';
        });
      }
      if (user) {
        try {
          const d = await API.get('/api/notifications/unread-count');
          const count = d.count || 0;
          const badge = document.getElementById('unread-badge');
          if (badge && count > 0) badge.innerHTML = `<span class="badge-count" aria-label="${count} unread notifications">${count}</span>`;
        } catch (e) { /* unread count is best-effort */ }
      }
    }
    if (footerEl) { footerEl.className = 'site-footer'; footerEl.innerHTML = renderFooter(); }
    renderDialogs();
    bindChrome();
    document.dispatchEvent(new CustomEvent('layout:ready', { detail: { user } }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
