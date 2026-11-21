/* api.js — fetch wrapper for Arabic Step for Life API (see API_CONTRACT.md) */
const API = {
  async request(path, { method = 'GET', body = null } = {}) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== null) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(path, opts); }
    catch (e) { throw new Error('Network error — please check your connection and try again.'); }
    let json = {};
    try { json = await res.json(); } catch (e) { /* non-JSON response */ }
    if (!res.ok) {
      const err = new Error(json.error || `Request failed (${res.status})`);
      err.status = res.status; err.setupRequired = !!json.setupRequired; err.data = json;
      throw err;
    }
    return json.data !== undefined ? json.data : json;
  },
  get(path) { return this.request(path); },
  post(path, body) { return this.request(path, { method: 'POST', body }); },
  put(path, body) { return this.request(path, { method: 'PUT', body }); },
  patch(path, body) { return this.request(path, { method: 'PATCH', body }); },
  del(path) { return this.request(path, { method: 'DELETE' }); }
};

/* ---------- UI helpers ---------- */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return String(d); }
}
function formatMoney(n) {
  const v = Number(n);
  if (isNaN(v)) return '—';
  return '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function showAlert(el, message, type = 'error') {
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.textContent = message;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideAlert(el) { if (el) el.classList.add('hidden'); }
function setLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Please wait…';
    btn.disabled = true;
  } else {
    btn.innerHTML = label || btn.dataset.orig || 'Submit';
    btn.disabled = false;
  }
}
function statusBadge(status, label) {
  const s = String(status || 'PENDING').toUpperCase();
  const text = label || s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return `<span class="status-badge st-${escapeHtml(s)}">${escapeHtml(text)}</span>`;
}
function categoryLabel(cat) {
  const map = { BURN_SUPPORT: 'Burn Support', NEWCOMER: 'Newcomer Support', ARABIC: 'Arabic Learning', COMMUNITY: 'Community' };
  return map[cat] || String(cat || 'Community').replace(/_/g, ' ');
}
function categoryPill(cat) {
  const cls = { BURN_SUPPORT: 'pill-orange', NEWCOMER: 'pill-navy', ARABIC: 'pill-green', COMMUNITY: '' }[cat] || '';
  return `<span class="pill ${cls}">${escapeHtml(categoryLabel(cat))}</span>`;
}
/* Local illustrated artwork per program category (v2 restyle). Programs keep
   working with any custom image URL an admin sets; only the six stock photos
   shipped by the original seed are swapped for illustrations, so existing
   databases pick up the new look without re-seeding. */
const PROGRAM_IMAGES = {
  BURN_SUPPORT: '/assets/images/burn-care.svg',
  NEWCOMER: '/assets/images/newcomer-family.svg',
  ARABIC: '/assets/images/arabic-class.svg',
  COMMUNITY: '/assets/images/community-sunset.svg'
};
const SEED_STOCK_PHOTOS = [
  'photo-1576091160550-2173dba999ef',
  'photo-1584515933487-779824d29309',
  'photo-1529156069898-49953e39b3ac',
  'photo-1469571486292-0ba58a3f068b',
  'photo-1456513080510-7bf3a84b82f8',
  'photo-1559027615-cd4628902d4a'
];
function programImage(p) {
  const fallback = (p && PROGRAM_IMAGES[p.category]) || PROGRAM_IMAGES.COMMUNITY;
  if (!p || !p.imageUrl) return fallback;
  if (SEED_STOCK_PHOTOS.some(id => p.imageUrl.indexOf(id) !== -1)) return fallback;
  return p.imageUrl;
}
function imgFallback() { return "this.onerror=null;this.style.display='none'"; }

/* Session cache */
let _currentUser = null; let _meChecked = false;
async function getCurrentUser(force = false) {
  if (_meChecked && !force) return _currentUser;
  try { const d = await API.get('/api/auth/me'); _currentUser = d.user || d; }
  catch (e) { _currentUser = null; }
  _meChecked = true;
  return _currentUser;
}
function isAdmin(user) { return user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'); }
function requireAuthRedirect() {
  return getCurrentUser().then(u => {
    if (!u) { window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search); }
    return u;
  });
}
