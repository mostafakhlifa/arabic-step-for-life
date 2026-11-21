/* admin.js — admin dashboard: overview, applications, programs CRUD, stats, users, donations, search, audit log, contact messages */
let _adminUser = null;
let _adminPrograms = [];
let _editingProgramId = null;

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
  if (name === 'applications') loadAdminApplications();
  if (name === 'programs') loadAdminPrograms();
  if (name === 'stats') loadAdminStats();
  if (name === 'users') loadAdminUsers();
  if (name === 'donations') loadAdminDonations();
  if (name === 'audit') loadAuditLogs();
  if (name === 'contact') loadContactMessages();
}
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
}
function confirmModal(title, text, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h3 id="modal-title">${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>
    <div class="btn-row mt-3"><button class="btn btn-primary" id="modal-confirm" type="button">Yes, Confirm</button><button class="btn btn-ghost" id="modal-cancel" type="button">Cancel</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#modal-confirm').addEventListener('click', () => { overlay.remove(); onConfirm(); });
}

/* --- Overview --- */
async function loadOverview() {
  const el = document.getElementById('overview-cards');
  const recentEl = document.getElementById('overview-recent');
  if (!el) return;
  try {
    const o = await API.get('/api/admin/overview');
    el.innerHTML = [
      { n: o.totalUsers, l: 'Registered Users' },
      { n: o.totalApplications, l: 'Total Applications' },
      { n: o.pendingApplications, l: 'Pending Applications' },
      { n: o.activePrograms, l: 'Active Programs' },
      { n: o.donationsCount, l: 'Donations Received' },
      { n: formatMoney(o.donationsTotal), l: 'Total Donations' }
    ].map(k => `<div class="kpi"><div class="kpi-num">${k.n == null ? '—' : k.n}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    const recent = o.recentApplications || [];
    recentEl.innerHTML = recent.length === 0 ? '<p class="empty">No recent applications.</p>' :
      `<div class="table-wrap"><table><thead><tr><th>Code</th><th>Program</th><th>Applicant</th><th>Submitted</th><th>Status</th></tr></thead><tbody>
      ${recent.map(a => `<tr><td><span class="tracking-code">${escapeHtml(a.trackingCode || '—')}</span></td><td>${escapeHtml(a.programTitle || (a.program && a.program.title) || '—')}</td><td>${escapeHtml((a.applicantFirstName || '') + ' ' + (a.applicantLastName || ''))}</td><td>${formatDate(a.submittedAt || a.createdAt)}</td><td>${statusBadge(a.status, a.statusLabel)}</td></tr>`).join('')}
      </tbody></table></div>`;
  } catch (e) { el.innerHTML = '<p class="empty">Could not load the overview. Please refresh the page.</p>'; }
}

/* --- Applications --- */
let _appPage = 1;
async function loadAdminApplications(page = 1) {
  _appPage = page;
  const el = document.getElementById('admin-applications');
  if (!el) return;
  const search = document.getElementById('app-search').value.trim();
  const status = document.getElementById('app-status-filter').value;
  const programId = document.getElementById('app-program-filter').value;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading applications…</p>';
  const params = new URLSearchParams({ page, limit: 20 });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (programId) params.set('programId', programId);
  try {
    const d = await API.get('/api/admin/applications?' + params.toString());
    const items = d.items || [];
    document.getElementById('app-pagination').innerHTML = `Page ${d.page || page} of ${d.pages || 1} · ${d.total || 0} applications
      <div class="btn-row mt-2"><button class="btn btn-ghost btn-sm" id="app-prev" type="button" ${(d.page || 1) <= 1 ? 'disabled' : ''}>← Previous</button><button class="btn btn-ghost btn-sm" id="app-next" type="button" ${(d.page || 1) >= (d.pages || 1) ? 'disabled' : ''}>Next →</button></div>`;
    const prev = document.getElementById('app-prev'); const next = document.getElementById('app-next');
    if (prev) prev.addEventListener('click', () => loadAdminApplications(_appPage - 1));
    if (next) next.addEventListener('click', () => loadAdminApplications(_appPage + 1));
    if (!items.length) { el.innerHTML = '<p class="empty">No applications match your filters.</p>'; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Code</th><th>Program</th><th>Applicant</th><th>Email</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${items.map(a => `<tr>
        <td><span class="tracking-code">${escapeHtml(a.trackingCode || '—')}</span></td>
        <td>${escapeHtml(a.programTitle || (a.program && a.program.title) || '—')}</td>
        <td>${escapeHtml((a.applicantFirstName || '') + ' ' + (a.applicantLastName || ''))}</td>
        <td>${escapeHtml(a.applicantEmail || '')}</td>
        <td>${formatDate(a.submittedAt || a.createdAt)}</td>
        <td>${statusBadge(a.status, a.statusLabel)}</td>
        <td><div style="display:flex;gap:6px;flex-wrap:wrap">
          <select class="status-select" data-app-id="${a.id}" aria-label="Update status for ${escapeHtml(a.trackingCode || '')}">
            ${['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED'].map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s.replace(/_/g, ' ')}</option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" data-msg-app="${a.id}" data-msg-user="${a.userId || ''}" type="button">Message</button>
        </div></td></tr>`).join('')}
      </tbody></table></div>`;
    el.querySelectorAll('.status-select').forEach(sel => sel.addEventListener('change', async () => {
      try {
        await API.patch('/api/admin/applications/' + sel.dataset.appId + '/status', { status: sel.value });
        loadAdminApplications(_appPage);
      } catch (err) { alert(err.message || 'Could not update status.'); loadAdminApplications(_appPage); }
    }));
    el.querySelectorAll('[data-msg-app]').forEach(b => b.addEventListener('click', () => openAdminMessage(b.dataset.msgUser, b.dataset.msgApp)));
  } catch (e) { el.innerHTML = '<p class="empty">Could not load applications.</p>'; }
}
function setupAppFilters() {
  ['app-search', 'app-status-filter', 'app-program-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => loadAdminApplications(1));
  });
  const searchBtn = document.getElementById('app-search-btn');
  if (searchBtn) searchBtn.addEventListener('click', () => loadAdminApplications(1));
}
async function fillProgramFilter() {
  try {
    const programs = await API.get('/api/admin/programs');
    _adminPrograms = programs;
    const sel = document.getElementById('app-program-filter');
    if (sel) sel.innerHTML = '<option value="">All programs</option>' + programs.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join('');
  } catch (e) { /* ignore */ }
}
function openAdminMessage(userId, applicationId) {
  switchTab('messages');
  const rid = document.getElementById('admin-msg-recipient');
  const app = document.getElementById('admin-msg-application');
  if (rid && userId) rid.value = userId;
  if (app && applicationId) app.value = applicationId;
  document.getElementById('admin-message-form').scrollIntoView({ behavior: 'smooth' });
}

/* --- Programs CRUD --- */
async function loadAdminPrograms() {
  const el = document.getElementById('admin-programs');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading programs…</p>';
  try {
    const programs = await API.get('/api/admin/programs');
    _adminPrograms = programs;
    if (!programs.length) { el.innerHTML = '<p class="empty">No programs yet. Use the form below to create your first program.</p>'; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${programs.map(p => `<tr><td><strong>${escapeHtml(p.title)}</strong><br><small>${escapeHtml(p.slug || '')}</small></td>
      <td>${escapeHtml(categoryLabel(p.category))}</td>
      <td>${p.isActive ? '<span class="status-badge st-APPROVED">Active</span>' : '<span class="status-badge st-PENDING">Inactive</span>'}</td>
      <td><div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" data-edit-program="${p.id}" type="button">Edit</button>
        <button class="btn btn-ghost btn-sm" data-toggle-program="${p.id}" type="button">${p.isActive ? 'Deactivate' : 'Activate'}</button>
        <button class="btn btn-ghost btn-sm" data-delete-program="${p.id}" data-program-title="${escapeHtml(p.title)}" type="button">Delete</button>
      </div></td></tr>`).join('')}
      </tbody></table></div>`;
    el.querySelectorAll('[data-edit-program]').forEach(b => b.addEventListener('click', () => editProgram(b.dataset.editProgram)));
    el.querySelectorAll('[data-toggle-program]').forEach(b => b.addEventListener('click', async () => {
      try { await API.patch('/api/admin/programs/' + b.dataset.toggleProgram + '/toggle', {}); loadAdminPrograms(); }
      catch (err) { alert(err.message || 'Could not update program.'); }
    }));
    el.querySelectorAll('[data-delete-program]').forEach(b => b.addEventListener('click', () => {
      confirmModal('Delete program?', `Are you sure you want to delete "${b.dataset.programTitle}"? This cannot be undone.`, async () => {
        try { await API.del('/api/admin/programs/' + b.dataset.deleteProgram); loadAdminPrograms(); }
        catch (err) { alert(err.message || 'Could not delete program.'); }
      });
    }));
  } catch (e) { el.innerHTML = '<p class="empty">Could not load programs.</p>'; }
}
function editProgram(id) {
  const p = _adminPrograms.find(x => String(x.id) === String(id));
  if (!p) return;
  _editingProgramId = p.id;
  document.getElementById('program-form-title').textContent = 'Edit Program: ' + p.title;
  document.getElementById('prog-title').value = p.title || '';
  document.getElementById('prog-slug').value = p.slug || '';
  document.getElementById('prog-category').value = p.category || 'COMMUNITY';
  document.getElementById('prog-short').value = p.shortDescription || '';
  document.getElementById('prog-description').value = p.description || '';
  document.getElementById('prog-image').value = p.imageUrl || '';
  document.getElementById('prog-active').checked = !!p.isActive;
  document.getElementById('program-form').scrollIntoView({ behavior: 'smooth' });
}
function resetProgramForm() {
  _editingProgramId = null;
  document.getElementById('program-form-title').textContent = 'Create New Program';
  document.getElementById('program-form').reset();
  document.getElementById('prog-active').checked = true;
}
function setupProgramForm() {
  const form = document.getElementById('program-form');
  if (!form) return;
  document.getElementById('prog-cancel').addEventListener('click', resetProgramForm);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('program-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    const payload = {
      title: document.getElementById('prog-title').value.trim(),
      slug: document.getElementById('prog-slug').value.trim(),
      category: document.getElementById('prog-category').value,
      shortDescription: document.getElementById('prog-short').value.trim(),
      description: document.getElementById('prog-description').value.trim(),
      imageUrl: document.getElementById('prog-image').value.trim() || undefined,
      isActive: document.getElementById('prog-active').checked
    };
    setLoading(btn, true);
    try {
      if (_editingProgramId) await API.put('/api/admin/programs/' + _editingProgramId, payload);
      else await API.post('/api/admin/programs', payload);
      showAlert(alertEl, _editingProgramId ? 'Program updated successfully.' : 'Program created successfully.', 'success');
      resetProgramForm();
      loadAdminPrograms();
    } catch (err) { showAlert(alertEl, err.message || 'Could not save the program.'); }
    finally { setLoading(btn, false, 'Save Program'); }
  });
}

/* --- Stats editor --- */
async function loadAdminStats() {
  try {
    const s = await API.get('/api/admin/stats');
    document.getElementById('stat-people').value = s.peopleSupported ?? 0;
    document.getElementById('stat-volunteers').value = s.volunteers ?? 0;
    document.getElementById('stat-states').value = s.statesReached ?? 0;
  } catch (e) { /* ignore */ }
}
function setupStatsForm() {
  const form = document.getElementById('stats-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('stats-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    setLoading(btn, true);
    try {
      await API.put('/api/admin/stats', {
        peopleSupported: Number(document.getElementById('stat-people').value),
        volunteers: Number(document.getElementById('stat-volunteers').value),
        statesReached: Number(document.getElementById('stat-states').value)
      });
      showAlert(alertEl, 'Impact statistics updated. The homepage now reflects these numbers.', 'success');
    } catch (err) { showAlert(alertEl, err.message || 'Could not update statistics.'); }
    finally { setLoading(btn, false, 'Save Statistics'); }
  });
}

/* --- Users --- */
let _userPage = 1;
async function loadAdminUsers(page = 1) {
  _userPage = page;
  const el = document.getElementById('admin-users');
  if (!el) return;
  const search = document.getElementById('user-search').value.trim();
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading users…</p>';
  const params = new URLSearchParams({ page, limit: 20 });
  if (search) params.set('search', search);
  const isSuper = _adminUser && _adminUser.role === 'SUPER_ADMIN';
  try {
    const d = await API.get('/api/admin/users?' + params.toString());
    const items = d.items || [];
    document.getElementById('user-pagination').innerHTML = `Page ${d.page || page} · ${d.total || 0} users
      <div class="btn-row mt-2"><button class="btn btn-ghost btn-sm" id="user-prev" type="button" ${(d.page || 1) <= 1 ? 'disabled' : ''}>← Previous</button><button class="btn btn-ghost btn-sm" id="user-next" type="button" ${items.length < 20 ? 'disabled' : ''}>Next →</button></div>`;
    const prev = document.getElementById('user-prev'); const next = document.getElementById('user-next');
    if (prev) prev.addEventListener('click', () => loadAdminUsers(_userPage - 1));
    if (next) next.addEventListener('click', () => loadAdminUsers(_userPage + 1));
    if (!items.length) { el.innerHTML = '<p class="empty">No users found.</p>'; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
      ${items.map(u => `<tr><td>${escapeHtml(u.firstName + ' ' + u.lastName)}</td><td>${escapeHtml(u.email)}</td>
      <td><span class="role-badge">${escapeHtml(u.role)}</span></td>
      <td>${u.isActive ? '<span class="status-badge st-APPROVED">Active</span>' : '<span class="status-badge st-REJECTED">Inactive</span>'}</td>
      <td>${formatDate(u.createdAt)}</td>
      <td>${isSuper ? `<div style="display:flex;gap:6px;flex-wrap:wrap">
        <select class="role-select" data-user-id="${u.id}" aria-label="Change role for ${escapeHtml(u.email)}">
          ${['USER', 'ADMIN', 'SUPER_ADMIN'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
        <button class="btn btn-ghost btn-sm" data-toggle-user="${u.id}" data-active="${u.isActive}" type="button">${u.isActive ? 'Deactivate' : 'Activate'}</button>
      </div>` : '<span class="placeholder-note">Role &amp; status controls require SUPER_ADMIN.</span>'}</td></tr>`).join('')}
      </tbody></table></div>`;
    el.querySelectorAll('.role-select').forEach(sel => sel.addEventListener('change', async () => {
      try { await API.patch('/api/admin/users/' + sel.dataset.userId + '/role', { role: sel.value }); loadAdminUsers(_userPage); }
      catch (err) { alert(err.message || 'Could not change role.'); loadAdminUsers(_userPage); }
    }));
    el.querySelectorAll('[data-toggle-user]').forEach(b => b.addEventListener('click', async () => {
      const activate = b.dataset.active === 'false';
      try { await API.patch('/api/admin/users/' + b.dataset.toggleUser + '/status', { isActive: activate }); loadAdminUsers(_userPage); }
      catch (err) { alert(err.message || 'Could not update user status.'); }
    }));
  } catch (e) { el.innerHTML = '<p class="empty">Could not load users.</p>'; }
}
function setupUserSearch() {
  const btn = document.getElementById('user-search-btn');
  if (btn) btn.addEventListener('click', () => loadAdminUsers(1));
  const input = document.getElementById('user-search');
  if (input) input.addEventListener('change', () => loadAdminUsers(1));
}

/* --- Donations --- */
async function loadAdminDonations(page = 1) {
  const el = document.getElementById('admin-donations');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading donations…</p>';
  try {
    const d = await API.get('/api/admin/donations?page=' + page);
    const items = d.items || [];
    if (!items.length) { el.innerHTML = '<p class="empty">No donations recorded yet.</p>'; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Donor</th><th>Email</th><th>Amount</th><th>Status</th></tr></thead><tbody>
      ${items.map(x => `<tr><td>${formatDate(x.createdAt)}</td><td>${escapeHtml(x.donorName || 'Anonymous')}</td><td>${escapeHtml(x.donorEmail || '—')}</td><td>${formatMoney(x.amount)}</td><td>${statusBadge(x.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING', x.status)}</td></tr>`).join('')}
      </tbody></table></div><p class="mt-2">${d.total || items.length} donations total.</p>`;
  } catch (e) { el.innerHTML = '<p class="empty">Could not load donations.</p>'; }
}

/* --- Global search --- */
function setupGlobalSearch() {
  const form = document.getElementById('global-search-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const q = document.getElementById('global-search-q').value.trim();
    const el = document.getElementById('global-search-results');
    if (!q) { el.innerHTML = '<p class="empty">Type a name, email, or tracking code to search.</p>'; return; }
    el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Searching…</p>';
    try {
      const d = await API.get('/api/admin/search?q=' + encodeURIComponent(q));
      const users = d.users || []; const apps = d.applications || [];
      if (!users.length && !apps.length) { el.innerHTML = '<p class="empty">No results found.</p>'; return; }
      el.innerHTML = `
        ${users.length ? `<h4>Users (${users.length})</h4>` + users.map(u => `<div class="list-item"><h4>${escapeHtml(u.firstName + ' ' + u.lastName)}</h4><p class="meta">${escapeHtml(u.email)} · ${escapeHtml(u.role)}</p></div>`).join('') : ''}
        ${apps.length ? `<h4>Applications (${apps.length})</h4>` + apps.map(a => `<div class="list-item"><h4><span class="tracking-code">${escapeHtml(a.trackingCode || '')}</span> — ${escapeHtml(a.programTitle || (a.program && a.program.title) || '')}</h4><p class="meta">${escapeHtml((a.applicantFirstName || '') + ' ' + (a.applicantLastName || ''))} · ${escapeHtml(a.applicantEmail || '')}</p><p>${statusBadge(a.status, a.statusLabel)}</p></div>`).join('') : ''}`;
    } catch (err) { el.innerHTML = '<p class="empty">Search failed. Please try again.</p>'; }
  });
}

/* --- Audit log --- */
async function loadAuditLogs(page = 1) {
  const el = document.getElementById('audit-logs');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading audit log…</p>';
  try {
    const d = await API.get('/api/admin/audit-logs?page=' + page);
    const items = d.items || [];
    if (!items.length) { el.innerHTML = '<p class="empty">No audit entries yet.</p>'; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead><tbody>
      ${items.map(l => `<tr><td>${formatDate(l.createdAt)}</td><td>${escapeHtml(l.actorName || l.actorEmail || l.userId || 'System')}</td><td>${escapeHtml(l.action || '')}</td><td>${escapeHtml(l.details || l.description || '')}</td></tr>`).join('')}
      </tbody></table></div><p class="mt-2">${d.total || items.length} entries total.</p>`;
  } catch (e) { el.innerHTML = '<p class="empty">Could not load the audit log.</p>'; }
}

/* --- Contact messages --- */
async function loadContactMessages() {
  const el = document.getElementById('contact-messages');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading messages…</p>';
  try {
    const items = await API.get('/api/admin/contact-messages');
    const list = Array.isArray(items) ? items : (items.items || []);
    if (!list.length) { el.innerHTML = '<p class="empty">No contact messages yet.</p>'; return; }
    el.innerHTML = list.map(m => `<div class="list-item${m.isRead ? '' : ' unread'}">
      <h4>${escapeHtml(m.subject || '(No subject)')}</h4>
      <p class="meta">${escapeHtml(m.name || '')} · ${escapeHtml(m.email || '')}${m.phone ? ' · ' + escapeHtml(m.phone) : ''} · ${formatDate(m.createdAt)}</p>
      <p>${escapeHtml(m.message || '')}</p>
      ${m.isRead ? '' : `<button class="btn btn-ghost btn-sm" data-mark-contact="${m.id}" type="button">Mark as read</button>`}
    </div>`).join('');
    el.querySelectorAll('[data-mark-contact]').forEach(b => b.addEventListener('click', async () => {
      try { await API.patch('/api/admin/contact-messages/' + b.dataset.markContact + '/read', {}); loadContactMessages(); } catch (e) { /* ignore */ }
    }));
  } catch (e) { el.innerHTML = '<p class="empty">Could not load contact messages.</p>'; }
}

/* --- Admin messaging --- */
function setupAdminMessageForm() {
  const form = document.getElementById('admin-message-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('admin-msg-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    const recipientId = document.getElementById('admin-msg-recipient').value.trim();
    if (!recipientId) { showAlert(alertEl, 'Please enter the recipient user ID (find it in the Users tab or use the Message button on an application).'); return; }
    const body = { recipientId, subject: document.getElementById('admin-msg-subject').value.trim(), body: document.getElementById('admin-msg-body').value.trim() };
    const appId = document.getElementById('admin-msg-application').value.trim();
    if (appId) body.applicationId = appId;
    setLoading(btn, true);
    try {
      await API.post('/api/admin/messages', body);
      showAlert(alertEl, 'Message sent successfully.', 'success');
      form.reset();
    } catch (err) { showAlert(alertEl, err.message || 'Could not send the message.'); }
    finally { setLoading(btn, false, 'Send Message'); }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  const user = await getCurrentUser();
  if (!user) { window.location.href = '/login.html?next=' + encodeURIComponent('/admin.html'); return; }
  if (!isAdmin(user)) { window.location.href = '/dashboard.html'; return; }
  _adminUser = user;
  document.getElementById('admin-name').textContent = `${user.firstName || ''} ${user.lastName || ''} (${user.role})`;
  loadOverview();
  setupAppFilters();
  fillProgramFilter();
  setupProgramForm();
  setupStatsForm();
  setupUserSearch();
  setupGlobalSearch();
  setupAdminMessageForm();
});
