/* dashboard.js — user dashboard: profile, applications, tracking, notifications, messages */
let _dashUser = null;

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
}
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById('tab-' + hash)) switchTab(hash);
}

async function loadProfile() {
  try {
    const d = await API.get('/api/auth/profile');
    _dashUser = d.user || d;
    document.getElementById('welcome-name').textContent = _dashUser.firstName ? `Welcome back, ${escapeHtml(_dashUser.firstName)}!` : 'Welcome back!';
    document.getElementById('profile-firstName').value = _dashUser.firstName || '';
    document.getElementById('profile-lastName').value = _dashUser.lastName || '';
    document.getElementById('profile-phone').value = _dashUser.phone || '';
    document.getElementById('profile-email').textContent = _dashUser.email || '';
    document.getElementById('profile-role').textContent = _dashUser.role || 'USER';
    document.getElementById('profile-verified').textContent = _dashUser.emailVerified ? 'Verified' : 'Not verified';
    document.getElementById('profile-joined').textContent = formatDate(_dashUser.createdAt);
  } catch (e) { /* handled by guard */ }
}
function setupProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('profile-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    setLoading(btn, true);
    try {
      const d = await API.put('/api/auth/profile', {
        firstName: document.getElementById('profile-firstName').value.trim(),
        lastName: document.getElementById('profile-lastName').value.trim(),
        phone: document.getElementById('profile-phone').value.trim()
      });
      _dashUser = d.user || d;
      showAlert(alertEl, 'Your profile was updated successfully.', 'success');
    } catch (err) { showAlert(alertEl, err.message || 'Could not update your profile.'); }
    finally { setLoading(btn, false, 'Save Changes'); }
  });
}

async function loadMyApplications() {
  const el = document.getElementById('my-applications');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading your applications…</p>';
  try {
    const apps = await API.get('/api/applications/mine');
    if (!apps || apps.length === 0) {
      el.innerHTML = `<p class="empty">You have not submitted any applications yet. <a href="/programs.html">Browse our programs</a> to get started.</p>`;
      return;
    }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Tracking Code</th><th>Program</th><th>Submitted</th><th>Status</th></tr></thead><tbody>
      ${apps.map(a => `<tr><td><span class="tracking-code">${escapeHtml(a.trackingCode || '—')}</span></td><td>${escapeHtml(a.programTitle || (a.program && a.program.title) || '—')}</td><td>${formatDate(a.submittedAt || a.createdAt)}</td><td>${statusBadge(a.status, a.statusLabel)}</td></tr>`).join('')}
      </tbody></table></div>`;
  } catch (e) { el.innerHTML = '<p class="empty">Could not load your applications. Please refresh the page.</p>'; }
}

function setupTrackForm() {
  const form = document.getElementById('track-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('track-alert');
    const resultEl = document.getElementById('track-result');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl); resultEl.innerHTML = '';
    const code = document.getElementById('track-code').value.trim();
    const email = document.getElementById('track-email').value.trim();
    if (!code || !email) { showAlert(alertEl, 'Please enter both your tracking code and the email used on the application.'); return; }
    setLoading(btn, true);
    try {
      const d = await API.get(`/api/applications/track/${encodeURIComponent(code)}?email=${encodeURIComponent(email)}`);
      resultEl.innerHTML = `<div class="list-item"><h4>${escapeHtml(d.programTitle || 'Application')}</h4>
        <p class="meta">Tracking code <span class="tracking-code">${escapeHtml(d.trackingCode)}</span> · Submitted ${formatDate(d.submittedAt)}</p>
        <p>Status: ${statusBadge(d.status, d.statusLabel)}</p></div>`;
    } catch (err) { showAlert(alertEl, err.message || 'No application matched that code and email. Please double-check both and try again.'); }
    finally { setLoading(btn, false, 'Track Application'); }
  });
}

async function loadNotifications() {
  const el = document.getElementById('notifications-list');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading notifications…</p>';
  try {
    const items = await API.get('/api/notifications');
    if (!items || items.length === 0) { el.innerHTML = '<p class="empty">No notifications yet. Updates about your applications will appear here.</p>'; return; }
    el.innerHTML = items.map(n => `<div class="list-item${n.isRead ? '' : ' unread'}">
      <h4>${escapeHtml(n.title || 'Notification')}</h4>
      <p class="meta">${formatDate(n.createdAt)}</p>
      <p>${escapeHtml(n.message || n.body || '')}</p>
      ${n.isRead ? '' : `<button class="btn btn-ghost btn-sm" data-mark-notif="${n.id}" type="button">Mark as read</button>`}
    </div>`).join('');
    el.querySelectorAll('[data-mark-notif]').forEach(b => b.addEventListener('click', async () => {
      try { await API.patch('/api/notifications/' + b.dataset.markNotif + '/read', {}); loadNotifications(); } catch (e) { /* ignore */ }
    }));
  } catch (e) { el.innerHTML = '<p class="empty">Could not load notifications.</p>'; }
}
function setupReadAll() {
  const btn = document.getElementById('read-all-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try { await API.patch('/api/notifications/read-all', {}); loadNotifications(); } catch (e) { /* ignore */ }
  });
}

async function loadMessages() {
  const el = document.getElementById('messages-list');
  if (!el) return;
  el.innerHTML = '<p class="loading"><span class="spinner dark"></span> Loading messages…</p>';
  try {
    const msgs = await API.get('/api/messages');
    if (!msgs || msgs.length === 0) { el.innerHTML = '<p class="empty">No messages yet. Use the form below to send a message to our team.</p>'; return; }
    el.innerHTML = msgs.map(m => {
      const fromMe = _dashUser && m.senderId === _dashUser.id;
      return `<div class="list-item${!m.isRead && !fromMe ? ' unread' : ''}">
      <h4>${escapeHtml(m.subject || '(No subject)')}</h4>
      <p class="meta">${fromMe ? 'You' : escapeHtml(m.senderName || 'Team')} · ${formatDate(m.createdAt)}${m.applicationId ? ' · Application #' + escapeHtml(m.applicationId) : ''}</p>
      <p>${escapeHtml(m.body || '')}</p>
      <div class="btn-row">
        ${!m.isRead && !fromMe ? `<button class="btn btn-ghost btn-sm" data-mark-msg="${m.id}" type="button">Mark as read</button>` : ''}
        ${!fromMe ? `<button class="btn btn-outline btn-sm" data-reply-to="${m.senderId}" data-reply-subject="${escapeHtml(m.subject || '')}" data-reply-app="${m.applicationId || ''}" type="button">Reply</button>` : ''}
      </div></div>`;
    }).join('');
    el.querySelectorAll('[data-mark-msg]').forEach(b => b.addEventListener('click', async () => {
      try { await API.patch('/api/messages/' + b.dataset.markMsg + '/read', {}); loadMessages(); } catch (e) { /* ignore */ }
    }));
    el.querySelectorAll('[data-reply-to]').forEach(b => b.addEventListener('click', () => {
      const rid = document.getElementById('msg-recipientId');
      const app = document.getElementById('msg-applicationId');
      const subj = document.getElementById('msg-subject');
      if (rid) rid.value = b.dataset.replyTo;
      if (app) app.value = b.dataset.replyApp || '';
      if (subj && b.dataset.replySubject) subj.value = 'Re: ' + b.dataset.replySubject.replace(/^Re:\s*/i, '');
      document.getElementById('message-form').scrollIntoView({ behavior: 'smooth' });
      document.getElementById('msg-body').focus();
    }));
  } catch (e) { el.innerHTML = '<p class="empty">Could not load messages.</p>'; }
}
function setupMessageForm() {
  const form = document.getElementById('message-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('message-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    const body = { subject: document.getElementById('msg-subject').value.trim(), body: document.getElementById('msg-body').value.trim() };
    const rid = document.getElementById('msg-recipientId').value.trim();
    const app = document.getElementById('msg-applicationId').value.trim();
    if (rid) body.recipientId = rid;
    if (app) body.applicationId = app;
    setLoading(btn, true);
    try {
      await API.post('/api/messages', body);
      showAlert(alertEl, 'Your message was sent. Our team will reply as soon as possible.', 'success');
      form.reset();
      loadMessages();
    } catch (err) { showAlert(alertEl, err.message || 'Could not send your message.'); }
    finally { setLoading(btn, false, 'Send Message'); }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  const user = await requireAuthRedirect();
  if (!user) return;
  _dashUser = user;
  await loadProfile();
  setupProfileForm();
  loadMyApplications();
  setupTrackForm();
  loadNotifications();
  setupReadAll();
  loadMessages();
  setupMessageForm();
});
