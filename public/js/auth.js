/* auth.js — register, login, forgot/reset password, logout, session guards */
function nextUrl(fallback) {
  const n = new URLSearchParams(window.location.search).get('next');
  if (n && n.startsWith('/') && !n.startsWith('//')) return n;
  return fallback || '/dashboard.html';
}
async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user) window.location.href = nextUrl('/dashboard.html');
}
function setupRegister() {
  const form = document.getElementById('register-form');
  if (!form) return;
  redirectIfLoggedIn();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (password.length < 8) { showAlert(alertEl, 'Your password must be at least 8 characters long.'); return; }
    if (password !== confirm) { showAlert(alertEl, 'Passwords do not match. Please check and try again.'); return; }
    setLoading(btn, true);
    try {
      await API.post('/api/auth/register', {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim() || undefined,
        password
      });
      _currentUser = null; _meChecked = false;
      showAlert(alertEl, 'Welcome! Your account was created successfully. Redirecting you to your dashboard…', 'success');
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 900);
    } catch (err) { showAlert(alertEl, err.message || 'Could not create your account. Please try again.'); }
    finally { setLoading(btn, false, 'Create My Account'); }
  });
}
function setupLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;
  redirectIfLoggedIn();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    setLoading(btn, true);
    try {
      const data = await API.post('/api/auth/login', {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
      });
      _currentUser = null; _meChecked = false;
      const user = data.user || data;
      const dest = nextUrl(isAdmin(user) ? '/admin.html' : '/dashboard.html');
      showAlert(alertEl, 'Welcome back! Redirecting…', 'success');
      setTimeout(() => { window.location.href = dest; }, 600);
    } catch (err) { showAlert(alertEl, err.message || 'Login failed. Please check your email and password.'); }
    finally { setLoading(btn, false, 'Login'); }
  });
}
function setupForgot() {
  const form = document.getElementById('forgot-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('auth-alert');
    const btn = form.querySelector('button[type=submit]');
    hideAlert(alertEl);
    setLoading(btn, true);
    try {
      await API.post('/api/auth/forgot-password', { email: document.getElementById('email').value.trim() });
      showAlert(alertEl, 'If an account exists for that email address, a password reset link has been sent. Please check your inbox (and spam folder).', 'success');
      form.reset();
    } catch (err) { showAlert(alertEl, err.message || 'Something went wrong. Please try again.'); }
    finally { setLoading(btn, false, 'Send Reset Link'); }
  });
}
function setupReset() {
  const form = document.getElementById('reset-form');
  if (!form) return;
  const token = new URLSearchParams(window.location.search).get('token');
  const alertEl = document.getElementById('auth-alert');
  if (!token) {
    showAlert(alertEl, 'This reset link is missing its token. Please request a new password reset link from the login page.');
    form.querySelector('button[type=submit]').disabled = true;
    return;
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert(alertEl);
    const btn = form.querySelector('button[type=submit]');
    const pw = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (pw.length < 8) { showAlert(alertEl, 'Your new password must be at least 8 characters long.'); return; }
    if (pw !== confirm) { showAlert(alertEl, 'Passwords do not match.'); return; }
    setLoading(btn, true);
    try {
      await API.post('/api/auth/reset-password', { token, newPassword: pw });
      showAlert(alertEl, 'Your password has been reset successfully. You can now log in with your new password.', 'success');
      setTimeout(() => { window.location.href = '/login.html'; }, 1200);
    } catch (err) { showAlert(alertEl, err.message || 'This reset link may have expired. Please request a new one.'); }
    finally { setLoading(btn, false, 'Reset My Password'); }
  });
}
document.addEventListener('DOMContentLoaded', () => {
  setupRegister(); setupLogin(); setupForgot(); setupReset();
});
