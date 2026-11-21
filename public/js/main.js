/* main.js — homepage dynamic content, programs list, program detail, donate, contact */
function programCard(p) {
  return `<article class="card program-card fade-up">
    <img class="card-img" src="${escapeHtml(programImage(p))}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="${imgFallback()}">
    <div class="card-body">
      ${categoryPill(p.category)}
      <h3><a href="/program.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h3>
      <p>${escapeHtml(p.shortDescription || p.description || '')}</p>
      <a class="btn btn-outline btn-sm mt-2" href="/program.html?slug=${encodeURIComponent(p.slug)}">Learn More &amp; Apply →</a>
    </div>
  </article>`;
}

/* --- Homepage: featured programs + stats --- */
async function loadHomePrograms() {
  const el = document.getElementById('featured-programs');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading programs…</p>';
  try {
    const programs = await API.get('/api/programs');
    if (!programs || programs.length === 0) {
      el.innerHTML = '<p class="empty">Programs will appear here soon. Please check back shortly.</p>';
      return;
    }
    el.innerHTML = programs.slice(0, 3).map(programCard).join('');
  } catch (e) {
    el.innerHTML = `<p class="empty">We could not load programs right now. Please try again later.</p>`;
  }
}
async function loadHomeStats() {
  const el = document.getElementById('impact-stats');
  if (!el) return;
  try {
    const s = await API.get('/api/stats');
    const stats = [
      { n: s.peopleSupported, label: 'People Supported' },
      { n: s.volunteers, label: 'Volunteers' },
      { n: s.statesReached, label: 'States Reached' },
      { n: s.corePrograms, label: 'Core Programs' }
    ];
    el.innerHTML = stats.map(st => `<div class="stat"><div class="stat-num">${Number(st.n || 0).toLocaleString()}</div><div class="stat-label">${st.label}</div></div>`).join('');
  } catch (e) {
    el.innerHTML = '<p class="loading" style="grid-column:1/-1">Impact numbers are being updated — please check back soon.</p>';
  }
}

/* --- Programs page: list + category filter --- */
let _allPrograms = [];
async function loadProgramsPage() {
  const el = document.getElementById('programs-list');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading programs…</p>';
  try {
    _allPrograms = await API.get('/api/programs');
    renderProgramsList('ALL');
    const filter = document.getElementById('category-filter');
    if (filter) filter.addEventListener('change', e => renderProgramsList(e.target.value));
  } catch (e) {
    el.innerHTML = '<p class="empty">We could not load programs right now. Please try again later.</p>';
  }
}
function renderProgramsList(cat) {
  const el = document.getElementById('programs-list');
  const countEl = document.getElementById('programs-count');
  const list = cat === 'ALL' ? _allPrograms : _allPrograms.filter(p => p.category === cat);
  if (countEl) countEl.textContent = list.length === 1 ? '1 program' : `${list.length} programs`;
  if (!list.length) { el.innerHTML = '<p class="empty">No programs in this category yet — please check back soon.</p>'; return; }
  el.innerHTML = list.map(programCard).join('');
}

/* --- Program detail + application form --- */
async function loadProgramDetail() {
  const el = document.getElementById('program-detail');
  if (!el) return;
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) { el.innerHTML = '<p class="empty">No program selected. <a href="/programs.html">Browse all programs</a>.</p>'; return; }
  try {
    const p = await API.get('/api/programs/' + encodeURIComponent(slug));
    document.title = p.title + ' — Arabic Step for Life';
    el.innerHTML = `
      <div class="split">
        <div class="img-frame"><img class="rounded-img" src="${escapeHtml(programImage(p))}" alt="${escapeHtml(p.title)}" onerror="${imgFallback()}"></div>
        <div>
          ${categoryPill(p.category)}
          <h1>${escapeHtml(p.title)}</h1>
          <p class="lead">${escapeHtml(p.shortDescription || '')}</p>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="btn-row mt-3"><a class="btn btn-teal" href="#apply">Apply for This Program</a><a class="btn btn-ghost" href="/programs.html">← All Programs</a></div>
        </div>
      </div>`;
    setupApplyForm(p);
  } catch (e) {
    el.innerHTML = '<p class="empty">This program could not be found. It may have been removed. <a href="/programs.html">Browse all programs</a>.</p>';
    const formWrap = document.getElementById('apply-section');
    if (formWrap) formWrap.classList.add('hidden');
  }
}
async function setupApplyForm(program) {
  const wrap = document.getElementById('apply-section');
  if (!wrap) return;
  const user = await getCurrentUser();
  const form = document.getElementById('apply-form');
  const gate = document.getElementById('apply-login-gate');
  if (!user) {
    if (form) form.classList.add('hidden');
    if (gate) {
      gate.classList.remove('hidden');
      gate.innerHTML = `<p>You need an account to apply for <strong>${escapeHtml(program.title)}</strong>. It only takes a minute to register, and you can track your application afterwards.</p>
        <div class="btn-row mt-2"><a class="btn btn-teal" href="/login.html?next=${encodeURIComponent('/program.html?slug=' + program.slug)}">Login</a><a class="btn btn-outline" href="/register.html">Create an Account</a></div>`;
    }
    return;
  }
  if (gate) gate.classList.add('hidden');
  if (form) {
    form.classList.remove('hidden');
    document.getElementById('applicantFirstName').value = user.firstName || '';
    document.getElementById('applicantLastName').value = user.lastName || '';
    document.getElementById('applicantEmail').value = user.email || '';
    if (user.phone) document.getElementById('applicantPhone').value = user.phone;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const alertEl = document.getElementById('apply-alert');
      const btn = form.querySelector('button[type=submit]');
      hideAlert(alertEl);
      const details = document.getElementById('details').value.trim();
      if (!details) { showAlert(alertEl, 'Please tell us a little about your situation and what support you need.'); return; }
      setLoading(btn, true);
      try {
        const app = await API.post('/api/applications', {
          programId: program.id,
          applicantFirstName: document.getElementById('applicantFirstName').value.trim(),
          applicantLastName: document.getElementById('applicantLastName').value.trim(),
          applicantEmail: document.getElementById('applicantEmail').value.trim(),
          applicantPhone: document.getElementById('applicantPhone').value.trim() || undefined,
          details,
          needs: document.getElementById('needs').value.trim() || undefined
        });
        const code = app.trackingCode || (app.application && app.application.trackingCode) || '';
        showAlert(alertEl, `Thank you — your application was submitted successfully. Your tracking code is ${code}. You can follow its progress from your dashboard.`, 'success');
        form.reset();
      } catch (err) { showAlert(alertEl, err.message || 'Could not submit your application. Please try again.'); }
      finally { setLoading(btn, false, 'Submit Application'); }
    });
  }
}

/* --- Donate page --- */
async function handleDonateReturn() {
  const params = new URLSearchParams(window.location.search);
  const alertEl = document.getElementById('donate-alert');
  const form = document.getElementById('donate-form');
  if (!form || !alertEl) return;
  if (params.get('cancelled') === 'true') {
    showAlert(alertEl, 'Your donation was cancelled — no payment was taken. You can try again whenever you are ready.', 'warning');
    window.history.replaceState({}, '', '/donate.html');
    return;
  }
  if (params.get('success') === 'true' && params.get('session_id')) {
    showAlert(alertEl, 'Thank you! Confirming your donation…', 'success');
    try {
      const data = await API.get('/api/donations/verify?session_id=' + encodeURIComponent(params.get('session_id')));
      const d = data.donation || data;
      const amount = d && (d.amount != null) ? formatMoney(d.amount) : '';
      showAlert(alertEl, 'Thank you for your generous gift' + (amount ? ' of ' + amount : '') + '! Your donation has been received. A receipt will be emailed to you by Stripe.', 'success');
    } catch (err) {
      showAlert(alertEl, 'Thank you! Your payment was submitted — if you do not receive a receipt shortly, please contact us and mention your checkout session.', 'success');
    }
    window.history.replaceState({}, '', '/donate.html');
  }
}

function setupDonate() {
  const form = document.getElementById('donate-form');
  if (!form) return;
  handleDonateReturn();
  let selectedAmount = 50;
  const customInput = document.getElementById('custom-amount');
  const amountBtns = form.querySelectorAll('.amount-btn');
  amountBtns.forEach(b => b.addEventListener('click', () => {
    amountBtns.forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
    selectedAmount = Number(b.dataset.amount);
    if (customInput) customInput.value = '';
  }));
  if (customInput) customInput.addEventListener('input', () => {
    if (customInput.value) { amountBtns.forEach(x => x.classList.remove('selected')); selectedAmount = Number(customInput.value); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('donate-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    const amount = customInput && customInput.value ? Number(customInput.value) : selectedAmount;
    if (!amount || isNaN(amount) || amount < 1 || amount > 100000) {
      showAlert(alertEl, 'Please choose or enter a donation amount between $1 and $100,000.');
      return;
    }
    setLoading(btn, true);
    try {
      const data = await API.post('/api/donations/checkout', {
        amount,
        donorName: document.getElementById('donorName').value.trim() || undefined,
        donorEmail: document.getElementById('donorEmail').value.trim() || undefined,
        message: document.getElementById('donorMessage').value.trim() || undefined
      });
      if (data.url) window.location.href = data.url;
      else showAlert(alertEl, 'We could not start the secure checkout. Please try again later.');
    } catch (err) {
      if (err.status === 503 || err.setupRequired) {
        showAlert(alertEl, 'Online donations are not yet enabled. The organization is setting up its Stripe account.', 'warning');
      } else {
        showAlert(alertEl, err.message || 'Something went wrong. Please try again later.');
      }
    } finally { setLoading(btn, false, 'Continue to Secure Checkout →'); }
  });
}

/* --- Contact page --- */
function setupContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('contact-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    setLoading(btn, true);
    try {
      await API.post('/api/contact', {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim() || undefined,
        subject: document.getElementById('subject').value.trim(),
        message: document.getElementById('message').value.trim()
      });
      showAlert(alertEl, 'Thank you for reaching out! Your message has been received and our team will get back to you as soon as possible.', 'success');
      form.reset();
    } catch (err) { showAlert(alertEl, err.message || 'Could not send your message. Please try again.'); }
    finally { setLoading(btn, false, 'Send Message'); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadHomePrograms();
  loadHomeStats();
  loadProgramsPage();
  loadProgramDetail();
  setupDonate();
  setupContact();
});
