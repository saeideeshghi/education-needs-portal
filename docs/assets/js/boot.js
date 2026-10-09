/* Demo identity and early route guard. Real authorization must run on a server. */
(function () {
  'use strict';
  const KEY = 'education-needs-portal:session:v4';
  const accounts = Object.freeze([
    Object.freeze({ username: 'expert', password: 'Expert@1405', role: 'expert', name: 'کارشناس ثبت اطلاعات دبیرستان نمونه', county: 'بجنورد', caseId: 'center-01' }),
    Object.freeze({ username: 'admin', password: 'Admin@1405', role: 'admin', name: 'مدیر سامانه', county: null })
  ]);
  const routes = { expert: ['index.html', 'needs.html', 'review.html', 'requests.html'], admin: ['admin.html', 'case.html', 'requests.html', 'tables.html', 'content.html'] };
  function user() {
    try {
      const session = JSON.parse(sessionStorage.getItem(KEY));
      if (!session || !Number.isFinite(session.expires) || session.expires <= Date.now()) return null;
      return accounts.find(a => a.username === session.username) || null;
    } catch (_) { return null; }
  }
  function home(account) { return account.role === 'expert' ? './index.html' : './admin.html'; }
  function login(username, password) {
    const account = accounts.find(a => a.username === username.trim().toLowerCase() && a.password === password);
    if (!account) return { ok: false, message: 'نام کاربری یا رمز عبور درست نیست.' };
    try { sessionStorage.setItem(KEY, JSON.stringify({ username: account.username, expires: Date.now() + 8 * 3600000 })); }
    catch (_) { return { ok: false, message: 'برای ورود، ذخیره‌سازی مرورگر باید فعال باشد.' }; }
    return { ok: true, account };
  }
  function logout() { try { sessionStorage.removeItem(KEY); } catch (_) {} location.replace('./login.html'); }
  function guard() {
    const account = user();
    const filename = location.pathname.split('/').pop() || 'index.html';
    if (filename === 'login.html') {
      if (account) { location.replace(home(account)); return false; }
      return true;
    }
    if (!account) { location.replace('./login.html'); return false; }
    if (!routes[account.role].includes(filename)) { location.replace(home(account) + '?notice=denied'); return false; }
    return true;
  }
  let theme;
  try { theme = localStorage.getItem('education-needs-portal:theme'); } catch (_) {}
  if (!['light', 'dark'].includes(theme)) theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  window.PortalAuth = Object.freeze({ accounts, user, home, login, logout, guard, routes });
  window.PortalAllowed = guard();
  const initialUser = user()?.username;
  function checkIdentity() {
    if (user()?.username !== initialUser) {
      if (document.body) document.body.style.visibility = 'hidden';
      if (guard()) location.reload();
      return;
    }
    guard();
  }
  window.addEventListener('pageshow', event => { if (event.persisted) checkIdentity(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkIdentity(); });
})();
