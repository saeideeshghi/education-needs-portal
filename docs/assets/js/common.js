/* Shared, accessible shell, demo sign-in, themes and guided onboarding. */
(function () {
  'use strict';
  if (!window.PortalAllowed) return;
  const A = window.PortalAuth, P = window.Portal, D = window.PortalData, e = D.escape, fa = D.fa;
  const paths = {
    building: '<path d="M3 21h18M5 21V8h5V3h4v5h5v13M9 21v-5h6v5M8 11h.01M16 11h.01M12 7h.01"/>',
    home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
    file: '<path d="M14 2H6v20h12V8ZM14 2v6h6M8 12h8M8 16h8"/>',
    users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4ZM22 2 11 13"/>',
    edit: '<path d="m16 3 5 5M3 21l6-1L21 8a3.5 3.5 0 0 0-5-5L4 15Z"/>',
    book: '<path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/>',
    logout: '<path d="M9 3H3v18h6M8 12h14m-5-5 5 5-5 5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    chart: '<path d="M4 3v18h17M8 17v-5M13 17V8M18 17V5"/>',
    chevron: '<path d="m14 6-6 6 6 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(name) { return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (paths[name] || paths.file) + '</svg>'; }
  function date(value) { if (!value) return '—'; try { return new Intl.DateTimeFormat('fa-IR', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); } catch (_) { return '—'; } }
  function status(record) { return '<span class="status case-status status-' + e(record.status) + '">' + e(P.labels[record.status]) + '</span>'; }
  function heading(title, subtitle) { return '<div class="page-heading"><div><p class="eyebrow">' + icon('building') + e(subtitle) + '</p><h1>' + e(title) + '</h1></div><span class="demo-badge">نسخه نمایشی</span></div>'; }
  function footer() { return '<footer class="page-footer"><span>اطلس نیازهای آموزشی · خراسان شمالی</span><span>نسخه نمایشی ' + fa('4.0') + '</span></footer>'; }
  let menuOpen = false, returnFocus = null, toastTimer, tourStep = 0;
  function setMenu(open) {
    menuOpen = open; document.body.classList.toggle('menu-open', open);
    document.querySelector('[data-ui="menu"]')?.setAttribute('aria-expanded', String(open));
    if (open) { returnFocus = document.activeElement; document.querySelector('.mobile-menu-close')?.focus(); }
    else if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }
  function themeButton() { const dark = document.documentElement.dataset.theme === 'dark'; return '<button class="icon-button theme-toggle" data-ui="theme" aria-label="' + (dark ? 'فعال کردن حالت روشن' : 'فعال کردن حالت تاریک') + '" title="' + (dark ? 'حالت روشن' : 'حالت تاریک') + '">' + icon(dark ? 'sun' : 'moon') + '</button>'; }
  function shell(page, state) {
    const user = A.user(); if (!user) { A.guard(); return; }
    const school = user.role === 'expert';
    const titles = { dashboard: 'میزکار مرکز', needs: 'ثبت اطلاعات و نیازها', review: 'مرور و ارسال', requests: 'درخواست‌ها و پیگیری', admin: 'میزکار مدیریت', case: 'بررسی پرونده', tables: 'جداول شهرستان‌ها', content: 'مدیریت متن‌های پورتال' };
    const links = school ? [
      ['dashboard', 'میزکار مرکز', './index.html', 'home'], ['needs', 'ثبت اطلاعات و نیازها', './needs.html?section=' + D.nextSection(state), 'file'],
      ['review', 'مرور و ارسال', './review.html', 'send'], ['requests', 'درخواست‌ها و پیگیری', './requests.html', 'bell']
    ] : [
      ['admin', 'میزکار مدیریت', './admin.html', 'home'], ['requests', 'درخواست‌ها و پیگیری', './requests.html', 'bell'], ['tables', 'جداول شهرستان‌ها', './tables.html', 'chart']
    ];
    if (user.role === 'admin') links.push(['content', 'مدیریت متن‌ها', './content.html', 'edit']);
    const records = P.list();
    const pending = P.unreadCount();
    const scopedName = school ? state.profile.name : 'همه پرونده‌های سامانه';
    const notificationText = pending ? fa(pending) + ' پیام خوانده‌نشده در درخواست‌ها و پیگیری دارید.' : 'پیام خوانده‌نشده‌ای ندارید. مکاتبه‌های قبلی را در صندوق پیگیری ببینید.';
    document.getElementById('shell').innerHTML =
      '<button class="menu-backdrop" data-ui="close-menu" tabindex="-1" aria-label="بستن منو"></button><aside class="sidebar" id="sidebar" aria-label="منوی اصلی"><button class="mobile-menu-close" data-ui="close-menu" aria-label="بستن منو">' + icon('close') + '</button>' +
      '<a href="' + A.home(user) + '" class="brand">' + icon('building') + '<span class="brand-title">اطلس نیازهای آموزشی</span><span class="brand-subtitle">آموزش‌وپرورش خراسان شمالی</span></a>' +
      '<nav class="nav-list" aria-label="صفحات سامانه">' + links.map(l => '<a class="nav-link ' + (page === l[0] ? 'is-active' : '') + '" href="' + l[2] + '"' + (page === l[0] ? ' aria-current="page"' : '') + '>' + icon(l[3]) + '<span>' + e(l[1]) + '</span>' + (l[0] === 'requests' && pending ? '<span class="nav-count">' + fa(pending) + '</span>' : '') + '</a>').join('') +
      '<button class="nav-link" data-ui="guide">' + icon('book') + '<span>راهنما و مستندات</span></button></nav>' +
      '<div class="sidebar-bottom"><div class="school-mini"><strong>' + e(P.roleLabels[user.role]) + '</strong><small>' + e(user.name) + '</small><p class="font-semibold" id="sidebar-school-name">' + e(scopedName) + '</p><small>نام کاربری: <bdi dir="ltr">' + e(user.username) + '</bdi></small></div><button class="nav-link logout-button" data-ui="logout">' + icon('logout') + '<span>خروج از حساب</span></button><p class="sidebar-caption">دوره نیازسنجی ' + fa('1405') + '</p></div></aside>' +
      '<header class="topbar"><div class="flex min-w-0 items-center gap-2"><button class="icon-button mobile-menu-button" data-ui="menu" aria-expanded="false" aria-controls="sidebar" aria-label="باز کردن منوی اصلی">' + icon('menu') + '</button><p class="mobile-brand-title">اطلس نیازهای آموزشی</p><nav class="breadcrumbs" aria-label="مسیر صفحه"><span>' + e(school ? 'پورتال مرکز' : 'پورتال مدیریت') + '</span>' + icon('chevron') + '<strong>' + e(titles[page]) + '</strong></nav></div><div class="topbar-actions"><span class="scope-pill">' + e(school ? 'پرونده مرکز شما' : 'مدیر سامانه') + '</span>' + themeButton() + '<button class="icon-button" data-ui="notifications" aria-expanded="false" aria-controls="notification-panel" aria-label="اعلان‌ها">' + icon('bell') + (pending ? '<span class="notification-dot"></span>' : '') + '</button></div>' +
      '<section class="notification-panel" id="notification-panel" aria-label="اعلان‌ها" hidden><h2 class="font-semibold text-sm mb-2">اعلان‌ها</h2><div class="notification-item">' + icon('bell') + '<p>' + e(notificationText) + '</p></div><a class="text-button" href="./requests.html">مشاهده درخواست‌ها</a></section></header>';
    P.applyCopy(document.getElementById('shell'));
  }
  function toast(message, error) {
    const element = document.getElementById('toast'); if (!element) return;
    clearTimeout(toastTimer); element.className = error ? 'is-error' : ''; element.textContent = message; element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
  }
  function guideSteps() {
    if (A.user()?.role === 'expert') return [
      ['میزکار و پرونده شما', 'home', P.text('help.own')], ['حوزه‌ها و شاخص‌ها', 'file', P.text('help.indicators')],
      ['مقدار درست را ثبت کنید', 'edit', P.text('help.values')], ['ذخیره و تکمیل حوزه', 'check', P.text('help.save')],
      ['ارسال و پیگیری اصلاحات', 'send', P.text('help.submit')]
    ];
    return [
      ['محدوده دسترسی', 'lock', 'به پرونده‌های سامانه، مکاتبه با کارشناس، جداول و مدیریت متن‌های پنل کارشناس دسترسی دارید.'],
      ['بررسی پرونده‌ها', 'file', 'در میزکار، وضعیت و نام مرکز را فیلتر کنید و پرونده ارسال‌شده را باز کنید. همه شاخص‌ها، جزئیات تجهیزات و سوابق ارسال قابل بررسی‌اند.'],
      ['درخواست اصلاح', 'edit', 'حوزه را انتخاب و شرح مشخصی برای مرکز ثبت کنید. مرکز فرم را اصلاح می‌کند و پس از پاسخ، آن را دوباره برای بررسی می‌فرستد.'],
      ['مکاتبه و تأیید', 'send', 'در درخواست‌ها و پیگیری می‌توانید پیام، درخواست یا توضیحات بفرستید و پاسخ بدهید. پس از بازبینی نهایی، پرونده را تأیید کنید.']
    ];
  }
  function renderGuide() {
    const steps = guideSteps(), step = steps[tourStep];
    const dialog = document.getElementById('tour-dialog');
    dialog.innerHTML = '<div class="dialog-head"><span class="text-sm text-muted">راهنمای شروع · ' + fa(tourStep + 1) + ' از ' + fa(steps.length) + '</span><button class="icon-button" data-ui="end-tour" aria-label="بستن راهنما">' + icon('close') + '</button></div><div class="dialog-body tour-body"><div class="tour-visual">' + icon(step[1]) + '</div><h2 id="tour-title">' + e(step[0]) + '</h2><p>' + e(step[2]) + '</p><div class="tour-dots" aria-label="پیشرفت راهنما">' + steps.map((s, index) => '<span class="' + (index === tourStep ? 'is-active' : '') + '"></span>').join('') + '</div><p class="tour-demo-note">این نسخه دمو است. اطلاعات و گردش بررسی در همین مرورگر نگه داشته می‌شوند.</p></div><div class="dialog-footer"><button class="button button-quiet" data-ui="end-tour">بعداً می‌خوانم</button>' + (tourStep ? '<button class="button button-secondary" data-ui="tour-back">قبلی</button>' : '') + '<button class="button button-primary" data-ui="' + (tourStep === steps.length - 1 ? 'end-tour' : 'tour-next') + '">' + (tourStep === steps.length - 1 ? 'شروع کار' : 'بعدی') + '</button></div>';
    P.applyCopy(dialog);
  }
  function guide() { if (menuOpen) setMenu(false); tourStep = 0; renderGuide(); document.getElementById('tour-dialog').showModal(); }
  function endTour() { document.getElementById('tour-dialog')?.close(); try { localStorage.setItem('education-needs-portal:guide:' + A.user().username, 'seen'); } catch (_) {} }
  function loginPage() {
    const root = document.getElementById('page-content');
    root.innerHTML = '<div class="login-layout"><section class="login-intro"><div class="login-brand">' + icon('building') + '<span>اطلس نیازهای آموزشی</span></div><p class="login-eyebrow">آموزش‌وپرورش خراسان شمالی</p><h1>اطلاعات دقیق‌تر،<br>تصمیم‌گیری بهتر.</h1><p>ثبت یکپارچه امکانات و نیازهای مراکز آموزشی و پیگیری بررسی پرونده‌ها در یک پورتال.</p><div class="login-capabilities"><div>' + icon('file') + '<span><strong>فرم مرکز</strong><small>ثبت و پیگیری اطلاعات مرکز خودتان</small></span></div><div>' + icon('users') + '<span><strong>پورتال مدیریت</strong><small>بررسی، اصلاح و تأیید پرونده‌ها</small></span></div><div>' + icon('lock') + '<span><strong>دسترسی بر اساس نقش</strong><small>ورود به میزکار مرتبط با حساب کاربری</small></span></div></div><span class="login-intro-footer">دوره نیازسنجی ' + fa('1405') + ' · نسخه نمایشی</span></section><section class="login-side"><div class="login-tools">' + themeButton() + '</div><div class="login-card"><span class="login-label">ورود به سامانه</span><h2>به پورتال خوش آمدید</h2><p class="text-muted text-sm">با نام کاربری و رمز عبور وارد میزکار خود شوید.</p><div class="login-tabs" role="tablist" aria-label="نوع پورتال"><button type="button" id="tab-school" class="is-active" role="tab" aria-selected="true" aria-controls="login-panel" data-ui="login-tab" data-role="expert">کارشناس ثبت اطلاعات</button><button type="button" id="tab-manager" role="tab" aria-selected="false" aria-controls="login-panel" data-ui="login-tab" data-role="manager" tabindex="-1">مدیر سامانه</button></div><div id="login-panel" role="tabpanel" aria-labelledby="tab-school"><p class="login-role-hint" id="login-hint">برای ثبت و پیگیری فرم مرکز خود وارد شوید.</p><form id="login-form"><label class="field-label" for="username">نام کاربری</label><input class="field login-input" id="username" name="username" autocomplete="username" required maxlength="40" dir="ltr" placeholder="expert"><label class="field-label mt-4" for="password">رمز عبور</label><div class="password-wrap"><input class="field login-input" type="password" id="password" name="password" autocomplete="current-password" required maxlength="80" dir="ltr"><button class="icon-button" type="button" data-ui="password" aria-label="نمایش رمز عبور" aria-pressed="false">' + icon('eye') + '</button></div><p id="login-error" class="field-error mt-3" role="alert" hidden></p><button class="button button-primary login-submit" type="submit">ورود به میزکار' + icon('chevron') + '</button></form></div><details class="demo-accounts"><summary>حساب‌های نمایشی برای مشاهده نسخه</summary><p>روی حساب کلیک کنید؛ سپس دکمه ورود را بزنید.</p>' + A.accounts.map(account => '<button class="demo-account" data-ui="fill-account" data-username="' + account.username + '"><span>' + e(account.name) + '<small>' + e(P.roleLabels[account.role]) + '</small></span><bdi dir="ltr">' + account.username + '<small>' + account.password + '</small></bdi></button>').join('') + '</details><p class="login-note">حساب‌ها و رمزها فقط برای این دمو هستند. از اطلاعات واقعی یا محرمانه استفاده نکنید.</p></div><p class="login-bottom">اطلس نیازهای آموزشی · نسخه ' + fa('4.0') + '</p></section></div>';
    document.getElementById('login-form').addEventListener('submit', event => {
      event.preventDefault(); const result = A.login(event.target.username.value, event.target.password.value);
      const error = document.getElementById('login-error'); error.hidden = result.ok; if (!result.ok) { error.textContent = result.message; document.getElementById('password').setAttribute('aria-invalid', 'true'); return; }
      location.href = A.home(result.account);
    });
  }
  function setLoginTab(role) {
    document.querySelectorAll('[data-ui="login-tab"]').forEach(b => { const selected = b.dataset.role === role; b.classList.toggle('is-active', selected); b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1; });
    document.getElementById('login-panel').setAttribute('aria-labelledby', role === 'expert' ? 'tab-school' : 'tab-manager');
    document.getElementById('login-hint').textContent = role === 'expert' ? 'برای ثبت و پیگیری فرم مرکز خود وارد شوید.' : 'برای بررسی پرونده‌ها و مکاتبه با کارشناس وارد شوید.';
    document.getElementById('username').placeholder = role === 'expert' ? 'expert' : 'admin';
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-ui]'); const action = button?.dataset.ui;
    const notifications = document.getElementById('notification-panel');
    if (notifications && !notifications.hidden && action !== 'notifications' && !notifications.contains(event.target)) { notifications.hidden = true; document.querySelector('[data-ui="notifications"]')?.setAttribute('aria-expanded', 'false'); }
    if (!button) return;
    if (action === 'theme') {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme; try { localStorage.setItem('education-needs-portal:theme', theme); } catch (_) {}
      button.outerHTML = themeButton(); document.querySelector('[data-ui="theme"]')?.focus();
    }
    if (action === 'logout') { window.dispatchEvent(new Event('portal-flush')); A.logout(); }
    if (action === 'menu') setMenu(true);
    if (action === 'close-menu') setMenu(false);
    if (action === 'guide') guide();
    if (action === 'tour-next') { tourStep++; renderGuide(); document.querySelector('[data-ui="tour-next"],[data-ui="end-tour"].button-primary')?.focus(); }
    if (action === 'tour-back') { tourStep--; renderGuide(); document.querySelector('[data-ui="tour-back"],[data-ui="tour-next"]')?.focus(); }
    if (action === 'end-tour') endTour();
    if (action === 'notifications') { notifications.hidden = !notifications.hidden; button.setAttribute('aria-expanded', String(!notifications.hidden)); }
    if (action === 'login-tab') setLoginTab(button.dataset.role);
    if (action === 'fill-account') {
      const account = A.accounts.find(a => a.username === button.dataset.username);
      setLoginTab(account.role === 'expert' ? 'expert' : 'manager'); document.getElementById('username').value = account.username; document.getElementById('password').value = account.password; document.getElementById('login-error').hidden = true; document.querySelector('.login-submit').focus();
    }
    if (action === 'password') { const input = document.getElementById('password'), show = input.type === 'password'; input.type = show ? 'text' : 'password'; button.setAttribute('aria-pressed', String(show)); button.setAttribute('aria-label', show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuOpen) setMenu(false);
    if (event.target.matches('[data-ui="login-tab"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const role = event.key === 'Home' ? 'expert' : event.key === 'End' ? 'manager' : event.target.dataset.role === 'expert' ? 'manager' : 'expert'; setLoginTab(role); document.querySelector('[data-ui="login-tab"][aria-selected="true"]').focus(); }
    if (menuOpen && event.key === 'Tab') {
      const items = Array.from(document.getElementById('sidebar').querySelectorAll('a,button')).filter(b => b.getClientRects().length);
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
  });
  matchMedia('(min-width:1024px)').addEventListener('change', event => { if (event.matches && menuOpen) setMenu(false); });
  window.PortalUI = Object.freeze({ shell, heading, footer, icon, date, status, toast, guide });
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'login') { loginPage(); return; }
    const overlays = document.createElement('div'); overlays.id = 'shared-overlays'; overlays.innerHTML = '<dialog class="dialog tour-dialog" id="tour-dialog" aria-labelledby="tour-title"></dialog>'; document.body.append(overlays);
    document.getElementById('tour-dialog').addEventListener('cancel', () => { try { localStorage.setItem('education-needs-portal:guide:' + A.user().username, 'seen'); } catch (_) {} });
    if (new URLSearchParams(location.search).get('notice') === 'denied') toast('این صفحه در دسترس نقش شما نیست.', true);
    if (A.user()?.role === 'expert') { try { if (!localStorage.getItem('education-needs-portal:guide:' + A.user().username)) guide(); } catch (_) {} }
  });
})();

