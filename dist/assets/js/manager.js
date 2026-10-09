/* Scoped management views and request inbox, without runtime dependencies. */
(function () {
  'use strict';
  if (!window.PortalAllowed || document.body.dataset.page === 'login') return;
  const A = window.PortalAuth, P = window.Portal, D = window.PortalData, UI = window.PortalUI;
  const user = A.user(), page = document.body.dataset.page;
  if (!user || user.role !== 'admin') return;
  const e = D.escape, fa = D.fa, root = document.getElementById('page-content');
  let search = '', statusFilter = '', countyFilter = '', tableMode = 'source', showReserved = false;
  let section = new URLSearchParams(location.search).get('section') || 'space';
  if (!D.definitions.some(d => d.id === section)) section = 'space';
  let caseRecord = null, confirmAction = null, editorDirty = false;
  let editorCategory = 'interface', editorSearch = '', editorPage = 0, editorValues = { ...P.copyConfig().values };
  const domain = d => P.text('domain.' + d.id, d.title);
  const title = (d, row) => P.text('indicator.' + d.id + '.' + row.id, row.title);
  const footer = UI.footer;
  function displayProfile(record) {
    const p = record.state.profile;
    return '<section class="panel school-banner"><div><p class="school-banner-name">' + e(p.name) + '</p><div class="school-meta"><span>شهرستان: ' + e(record.county) + '</span><span>کد مرکز: <bdi>' + fa(record.code) + '</bdi></span><span>' + e(p.type) + ' · ' + e(p.level) + '</span></div></div>' + UI.status(record) + '</section>';
  }
  function metric(value, text, icon) { return '<div class="panel manager-metric"><span class="metric-icon">' + UI.icon(icon) + '</span><div><strong>' + fa(value) + '</strong><span>' + e(text) + '</span></div></div>'; }
  function caseRows(records) {
    return records.length ? '<div class="queue-scroll"><table class="queue-table"><caption class="sr-only">پرونده‌های محدوده دسترسی شما</caption><thead><tr><th>مرکز / کد</th><th>شهرستان</th><th>پیشرفت</th><th>وضعیت پرونده</th><th>آخرین فعالیت</th><th>اقدام</th></tr></thead><tbody>' + records.map(record => {
      const progress = D.stats(record.state);
      return '<tr><td data-label="مرکز"><strong>' + e(record.state.profile.name) + '</strong><small>کد ' + fa(record.code) + '</small></td><td data-label="شهرستان">' + e(record.county) + '</td><td data-label="پیشرفت"><div class="mini-progress"><span>' + fa(progress.percent) + '٪</span><div><i style="width:' + progress.percent + '%"></i></div></div></td><td data-label="وضعیت">' + UI.status(record) + '</td><td data-label="آخرین فعالیت">' + e(UI.date(record.updatedAt)) + '</td><td><a class="text-button" href="./case.html?id=' + encodeURIComponent(record.id) + '">بررسی پرونده' + UI.icon('chevron') + '</a></td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty-state">' + UI.icon('file') + '<h3>پرونده‌ای با این شرایط پیدا نشد</h3><p>فیلترها را تغییر دهید یا جست‌وجو را پاک کنید.</p></div>';
  }
  function filteredRecords() { return P.list().filter(r => (!statusFilter || r.status === statusFilter) && (!countyFilter || r.county === countyFilter) && (!search || (r.state.profile.name + ' ' + r.code + ' ' + r.county).includes(D.latin(search)))); }
  function dashboard() {
    const records = P.list(), counts = status => records.filter(r => status.includes(r.status)).length;
    const counties = [...new Set(records.map(r => r.county))];
    const pendingReplies = P.unreadCount();
    return UI.heading('میزکار مدیر سامانه', 'بررسی پرونده‌ها و مکاتبه با کارشناس ثبت اطلاعات') +
      '<section class="manager-welcome"><div><span class="text-sm text-muted">خوش آمدید</span><h2>' + e(user.name) + '</h2><p>' + ('به پرونده‌ها، مکاتبه‌های کارشناس و مدیریت متن‌های پورتال دسترسی دارید.') + '</p></div><a href="./requests.html" class="button button-secondary">' + UI.icon('bell') + 'بررسی درخواست‌ها' + (pendingReplies ? ' · ' + fa(pendingReplies) + ' پیام جدید' : '') + '</a></section>' +
      '<section class="manager-metrics" aria-label="آمار پرونده‌ها">' + metric(records.length, 'پرونده در محدوده شما', 'file') + metric(counts(['submitted','resubmitted']), 'در انتظار بررسی', 'eye') + metric(counts(['changes_requested']), 'نیازمند اصلاح', 'edit') + metric(counts(['approved']), 'پرونده تأییدشده', 'check') + '</section>' +
      '<section class="panel queue-panel"><div class="queue-heading"><div><h2>فهرست پرونده‌ها</h2><p>پرونده را باز کنید و اطلاعات ارسال‌شده را بررسی کنید.</p></div><a class="text-button" href="./tables.html">' + UI.icon('chart') + 'جداول حوزه‌ها</a></div><div class="queue-filters"><div class="search-field"><label class="field-label" for="case-search">جست‌وجوی مرکز یا کد</label><input class="field" id="case-search" value="' + e(search) + '" placeholder="نام مرکز یا کد را بنویسید"></div><div><label class="field-label" for="case-status">وضعیت پرونده</label><select class="field" id="case-status"><option value="">همه وضعیت‌ها</option>' + Object.entries(P.labels).map(([key,value]) => '<option value="' + key + '"' + (statusFilter === key ? ' selected' : '') + '>' + value + '</option>').join('') + '</select></div>' +
      (user.role === 'admin' ? '<div><label class="field-label" for="case-county">شهرستان</label><select class="field" id="case-county"><option value="">همه شهرستان‌ها</option>' + counties.map(c => '<option' + (countyFilter === c ? ' selected' : '') + '>' + e(c) + '</option>').join('') + '</select></div>' : '') + '<button class="text-button" data-manager="clear-filters">پاک کردن فیلترها</button></div><div id="case-results">' + caseRows(filteredRecords()) + '</div></section><p class="data-footnote">پرونده‌های فهرست، داده نمونه هستند. ارسال‌ها و پاسخ‌های این دمو در همین مرورگر بین حساب‌ها قابل مشاهده‌اند.</p>' + footer();
  }
  function history(record) {
    return '<section class="panel history-panel"><h2>سوابق پرونده</h2><ol class="history-list">' + record.history.map(item => '<li><span class="history-dot"></span><div><p>' + e(item.text) + '</p><small>' + e(item.actor) + ' · ' + e(UI.date(item.at)) + '</small></div></li>').join('') + '</ol></section>';
  }
  function details(record) {
    if (!record.snapshot) return '<section class="panel empty-state">' + UI.icon('lock') + '<h2>پرونده هنوز ارسال نشده است</h2><p>اطلاعات پیش‌نویس مرکز پس از ارسال برای بررسی نمایش داده می‌شود.</p></section>';
    const state = record.snapshot;
    return '<section class="panel"><div class="queue-heading"><div><h2>اطلاعات ارسال‌شده مرکز</h2><p>آخرین نسخه ارسال‌شده · ' + e(UI.date(state.submission?.at)) + '</p></div><bdi class="case-tracking" dir="ltr">' + e(record.tracking) + '</bdi></div><div class="case-profile-grid"><div><span>دانش‌آموز</span><strong>' + fa(state.profile.students) + '</strong></div><div><span>کلاس</span><strong>' + fa(state.profile.classrooms) + '</strong></div><div><span>جنسیت</span><strong>' + e(state.profile.gender) + '</strong></div><div><span>دوره</span><strong>' + fa(state.profile.period) + '</strong></div></div>' + (state.profile.discrepancy ? '<p class="profile-discrepancy">اعلام مغایرت مرکز: ' + e(state.profile.discrepancy) + '</p>' : '') +
      '<div class="review-details">' + D.definitions.map(def => {
        const s = state.sections[def.id];
        return '<details><summary>' + e(domain(def)) + '<span>' + fa(def.rows.length) + ' شاخص</span></summary><div class="review-table-wrap"><table class="review-table"><thead><tr><th>شاخص / شرح</th><th>مقدار / وضعیت</th><th>یادداشت</th></tr></thead><tbody>' +
          def.rows.map(row => { const saved = s.rows.find(r => r.id === row.id); return '<tr><td>' + e(title(def,row)) + '</td><td>' + (saved.unknown ? 'نامشخص' : e(fa(saved.value))) + '</td><td>' + e(saved.notes) + '</td></tr>'; }).join('') +
          def.extras.map(field => '<tr><td>' + e(P.text('extra.' + def.id + '.' + field.id,field.title)) + '</td><td>' + e(fa(s.extras.find(r => r.id === field.id).value)) + '</td><td>فیلد تکمیلی</td></tr>').join('') +
          s.items.map(item => '<tr><td>' + e(item.place) + ' · ' + e(item.title) + '</td><td>' + e(fa(item.count)) + '</td><td>جزئیات تجهیزات</td></tr>').join('') + '</tbody></table></div></details>';
      }).join('') + '</div></section>';
  }
  function requestCard(request, record) {
    const def = D.definitions.find(d => d.id === request.section);
    const states = { open: 'در انتظار پاسخ مرکز', answered: 'پاسخ ثبت شده', resolved: 'بررسی و بسته شده' };
    return '<article class="panel request-card"><div class="request-card-head"><div><span class="request-domain">' + e(domain(def)) + '</span><h3>' + e(record.state.profile.name) + '</h3></div><span class="status ' + (request.status === 'open' ? 'status-draft' : 'status-done') + '">' + states[request.status] + '</span></div><p class="request-message">' + e(request.message) + '</p><p class="request-meta">' + e(request.actor) + ' · ' + e(UI.date(request.at)) + '</p>' +
      (request.reply ? '<div class="request-reply"><strong>پاسخ مرکز</strong><p>' + e(request.reply) + '</p><small>' + e(UI.date(request.replyAt)) + '</small></div>' : '') +
      ('<a class="text-button mt-3" href="./requests.html?thread=' + encodeURIComponent(record.threads.find(t=>t.requestId===request.id)?.id || '') + '">مشاهده مکاتبه و پاسخ' + UI.icon('chevron') + '</a>') + '</article>';
  }
  function casePage() {
    const caseId = new URLSearchParams(location.search).get('id');
    caseRecord = P.get(caseId);
    if (!caseRecord) return UI.heading('پرونده در دسترس نیست', 'بررسی محدوده دسترسی') + '<section class="panel empty-state">' + UI.icon('lock') + '<p>این پرونده پیدا نشد یا در محدوده دسترسی شما نیست.</p><a class="button button-primary mt-4" href="./admin.html">بازگشت به میزکار</a></section>' + footer();
    const record = caseRecord;
    const canReview = ['submitted','resubmitted'].includes(record.status), canRequest = ['submitted','resubmitted','changes_requested'].includes(record.status);
    return UI.heading('بررسی پرونده مرکز', 'میزکار مدیر سامانه') + '<a class="text-button mb-4" href="./admin.html">بازگشت به فهرست پرونده‌ها</a>' + displayProfile(record) +
      '<div class="case-layout"><div class="case-main">' + (record.status === 'changes_requested' ? '<div class="notice notice-warning">پرونده برای اصلاح نزد مرکز است. اطلاعات زیر، آخرین نسخه ارسال‌شده است.</div>' : '') + details(record) + (record.requests.length ? '<section><h2 class="section-title">درخواست‌ها و پاسخ‌های این پرونده</h2><div class="space-y-4">' + record.requests.map(q => requestCard(q, record)).join('') + '</div></section>' : '') + '</div><aside class="case-side"><section class="panel case-actions"><h2>اقدامات بررسی</h2><p class="text-muted text-sm">نظر شما در پورتال کارشناس نمایش داده می‌شود.</p><a class="button button-secondary mt-3 w-full" href="./requests.html?case=' + encodeURIComponent(record.id) + '&compose=1">ارسال درخواست یا توضیحات</a>' +
      (canRequest ? '<form id="request-form"><label class="field-label mt-4" for="request-section">حوزه نیازمند اصلاح</label><select class="field" id="request-section" name="section">' + D.definitions.map(d => '<option value="' + d.id + '">' + e(domain(d)) + '</option>').join('') + '</select><label class="field-label mt-4" for="request-message">شرح درخواست اصلاح</label><textarea class="field" name="message" id="request-message" required minlength="10" maxlength="600" rows="4" placeholder="شاخص و اصلاح موردنیاز را مشخص کنید."></textarea><button class="button button-secondary mt-3 w-full" type="submit">' + UI.icon('edit') + 'ارسال درخواست اصلاح</button></form>' : '<p class="action-state-note">در این مرحله درخواست اصلاح قابل ارسال نیست.</p>') +
      (canReview ? '<div class="approve-area"><p>اطلاعات ارسال‌شده و پاسخ‌های مرکز را بررسی کرده‌ام.</p><button class="button button-primary w-full" data-manager="approve">' + UI.icon('check') + 'تأیید نهایی پرونده</button></div>' : '') +
      '</section>' + history(record) + '</aside></div>' + footer();
  }
  function tablePage() {
    const sheet = window.PortalCountyData?.sheets.find(s => s.id === section);
    if (!sheet) return UI.heading('جداول شهرستان‌ها', 'داده‌های حوزه‌های نیازسنجی') + '<section class="panel empty-state">در حال آماده‌سازی جدول…</section>';
    const named = sheet.rows.filter(r => !r.placeholder), rows = showReserved ? sheet.rows : named;
    const selectedColumns = sheet.columns.map((column,index) => ({column,index})).filter(({index}) => index !== 0);
    const className = index => index === sheet.countyStart - 1 ? 'matrix-indicator' : index === sheet.columns.length - 1 ? 'matrix-total' : index < sheet.countyStart ? 'matrix-row-index' : '';
    const issues = user.role === 'admin' && tableMode === 'source' ? D.sourceIssues(sheet) : [];
    return UI.heading('جداول شهرستان‌ها', 'اطلاعات تمام شهرستان‌ها و جمع استان') +
      '<section class="panel matrix-panel"><div class="matrix-toolbar"><div><label class="field-label" for="table-section">حوزه اطلاعات</label><select class="field" id="table-section">' + D.definitions.map(d => '<option value="' + d.id + '"' + (d.id===section?' selected':'') + '>' + e(domain(d)) + '</option>').join('') + '</select></div><div class="data-mode" role="group" aria-label="نوع داده">' + [['source','داده‌های فایل'],['sample','داده‌های نمونه']].map(([key,label]) => '<button class="mode-button ' + (tableMode===key?'is-active':'') + '" data-manager="table-mode" data-mode="' + key + '" aria-pressed="' + (tableMode===key) + '">' + label + '</button>').join('') + '</div></div><div class="matrix-title"><div><h2>' + e(domain(sheet)) + '</h2><p>' + fa(named.length) + ' شاخص · ' + fa(selectedColumns.length) + ' ستون · ' + (user.role === 'admin' ? 'همه شهرستان‌ها' : e(user.county)) + '</p></div><span class="source-label ' + (tableMode==='sample'?'is-sample':'') + '">' + (tableMode==='sample'?'اعداد ساختگی برای نمایش':'از فایل Excel') + '</span></div><p class="matrix-hint">' + (tableMode==='sample'?'داده‌ها نمونه‌اند و مستقل از پرونده‌های مرکز هستند.':'خانه‌های خالی، صفر، متن و علامت * مطابق فایل نمایش داده می‌شوند.') + '</p>' +
      (issues.length ? '<details class="source-audit"><summary>' + fa(issues.length) + ' اختلاف در جمع‌های ثبت‌شده</summary><ul>' + issues.map(q => '<li>' + e(q.title) + ': جمع استان فایل ' + fa(q.reported) + '؛ مجموع اعداد شهرستان‌ها ' + fa(q.calculated) + (q.partial ? '؛ برخی خانه‌ها عدد ندارند.' : '.') + '</li>').join('') + '</ul><p>مقدار اصلی فایل حفظ شده است.</p></details>' : '') +
      '<div class="matrix-scroll" role="region" aria-label="جدول ' + e(sheet.title) + '" tabindex="0"><table class="source-matrix scoped-matrix ' + (sheet.countyStart === 3 ? 'has-row-index' : '') + '"><caption class="sr-only">' + e(sheet.title) + '</caption><thead><tr>' + selectedColumns.map(({column,index}) => '<th scope="col" class="' + className(index) + '" data-source-column="' + column.letter + '">' + e(column.title) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(row => {
        const cells = tableMode==='sample' ? D.sampleCells(sheet,row) : row.cells;
        return '<tr data-source-row="' + row.excelRow + '">' + selectedColumns.map(({index}) => {
          const cell=cells[index], value=D.cellValue(cell);
          return '<td class="' + className(index) + '"' + (cell && typeof cell==='object'?' title="' + e('فرمول فایل: '+cell.formula) + '"':'') + '>' + (value===null?'<span class="empty-cell" aria-label="ثبت نشده">—</span>':typeof value==='number'?'<bdi>'+fa(value.toLocaleString('en-US'))+'</bdi>':e(fa(value))) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><div class="matrix-footer"><span>جدول را برای مشاهده ستون‌ها افقی پیمایش کنید.</span>' + (sheet.rows.length>named.length?'<label class="reserved-toggle"><input id="show-reserved" type="checkbox"' + (showReserved?' checked':'') + '>نمایش ' + fa(sheet.rows.length-named.length) + ' ردیف بدون عنوان</label>':'') + '</div></section>' + footer();
  }
  const categories = () => [{id:'interface',title:'عنوان‌ها و متن‌های رابط'}, {id:'help',title:'راهنمای شروع'}, ...D.definitions.map(d => ({id:d.id,title:d.title}))];
  function editorEntries() { return P.copyBase.filter(entry => entry.category===editorCategory && (!editorSearch || (entry.value + ' ' + (editorValues[entry.key] || '')).includes(editorSearch))); }
  function editorPreview(entry) {
    const value = entry ? editorValues[entry.key] ?? entry.value : 'متنی را برای ویرایش انتخاب کنید.';
    return '<span class="preview-label">پیش‌نمایش متن انتخاب‌شده</span><div class="preview-browser"><span></span><span></span><span></span></div><div class="editor-preview-body"><span class="status status-done">پورتال کارشناس ثبت اطلاعات</span><h3>' + e(editorValues['dashboard.title'] || P.text('dashboard.title')) + '</h3><div class="preview-content" id="preview-text">' + e(value) + '</div><p>تغییرها پس از «ذخیره و انتشار متن‌ها» در پنل کارشناس نمایش داده می‌شوند.</p></div>';
  }
  function editorFields() {
    const entries = editorEntries(), count = Math.max(1, Math.ceil(entries.length/12));
    editorPage=Math.min(editorPage,count-1); const selected=entries.slice(editorPage*12,(editorPage+1)*12);
    const contexts = {dashboard:'میزکار',nav:'منو',brand:'نام سامانه',form:'فرم',review:'مرور و ارسال',profile:'مشخصات مرکز',requests:'درخواست‌ها',help:'راهنما'};
    return (selected.length ? selected.map(entry => {
      const index=P.copyBase.indexOf(entry), value=editorValues[entry.key]??entry.value;
      return '<div class="editor-field"><label class="field-label" for="copy-'+index+'">'+e(entry.category==='interface'||entry.category==='help'?contexts[entry.key.split('.')[0]]+' · '+entry.value:entry.label)+'<span class="edited-label"'+(value!==entry.value?'':' hidden')+'>ویرایش شده</span></label><textarea class="field copy-input" id="copy-'+index+'" data-copy="'+index+'" required maxlength="600" rows="'+(entry.value.length>90?3:2)+'">'+e(value)+'</textarea><button class="text-button" type="button" data-manager="restore-text" data-index="'+index+'">بازگرداندن متن اصلی</button></div>';
    }).join(''):'<div class="empty-state">متنی با این عبارت پیدا نشد.</div>') + '<div class="editor-pagination"><button class="button button-secondary" type="button" data-manager="editor-prev"'+(editorPage===0?' disabled':'')+'>قبلی</button><span>'+fa(editorPage+1)+' از '+fa(count)+' · '+fa(entries.length)+' متن</span><button class="button button-secondary" type="button" data-manager="editor-next"'+(editorPage===count-1?' disabled':'')+'>بعدی</button></div>';
  }
  function editorPageHtml() {
    return UI.heading('مدیریت متن‌های پورتال', 'ویژه مدیر سامانه') + '<div class="editor-intro"><div>'+UI.icon('edit')+'<p>عنوان‌ها، متن راهنما و نام شاخص‌های پنل کارشناس را ویرایش کنید. تغییر متن، نوع فیلد و داده ثبت‌شده را تغییر نمی‌دهد.</p></div><span class="status status-draft" id="editor-save-state">همه تغییرها ذخیره شده‌اند</span></div><div class="editor-layout"><form class="panel editor-form" id="content-form"><div class="editor-toolbar"><div><label class="field-label" for="editor-category">بخش موردنظر</label><select class="field" id="editor-category">'+categories().map(c=>'<option value="'+c.id+'"'+(editorCategory===c.id?' selected':'')+'>'+e(c.title)+'</option>').join('')+'</select></div><div><label class="field-label" for="editor-search">جست‌وجو در متن‌های این بخش</label><input class="field" id="editor-search" placeholder="بخشی از متن را بنویسید" value="'+e(editorSearch)+'"></div></div><div id="editor-fields">'+editorFields()+'</div><div class="editor-form-footer"><button class="button button-primary" type="submit">ذخیره و انتشار متن‌ها</button><button class="button button-quiet" type="button" data-manager="reset-copy">بازگردانی همه متن‌ها</button></div></form><aside class="panel editor-preview" id="editor-preview">'+editorPreview(editorEntries()[0])+'</aside></div><p class="data-footnote">متن‌ها به‌صورت ساده نمایش داده می‌شوند. این ویرایشگر کد HTML اجرا نمی‌کند. تغییرها در این دمو به همین مرورگر محدودند.</p>'+footer();
  }
  function showConfirm(action) {
    confirmAction = action;
    let dialog=document.getElementById('manager-confirm');
    if (!dialog) { dialog=document.createElement('dialog'); dialog.id='manager-confirm'; dialog.className='dialog'; dialog.setAttribute('aria-labelledby','confirm-title'); document.body.append(dialog); }
    const reset=action==='reset-copy';
    dialog.innerHTML='<div class="dialog-head"><h2 id="confirm-title">'+(reset?'بازگردانی متن‌های اصلی':'تأیید نهایی پرونده')+'</h2><button class="icon-button" data-manager="cancel-confirm" aria-label="بستن">'+UI.icon('close')+'</button></div><div class="dialog-body"><p>'+(reset?'همه متن‌ها به مقدار اولیه برمی‌گردند. سپس برای اعمال، «ذخیره و انتشار متن‌ها» را بزنید.':'پرونده '+e(caseRecord.state.profile.name)+' بررسی شده و برای تأیید آماده است؟')+'</p></div><div class="dialog-footer"><button class="button button-secondary" data-manager="cancel-confirm">بازگشت</button><button class="button button-primary" data-manager="confirm-action">تأیید</button></div>';
    dialog.showModal();
  }
  function render() {
    UI.shell(page, null);
    root.innerHTML = page==='admin'?dashboard():page==='case'?casePage():page==='tables'?tablePage():editorPageHtml();
    P.applyCopy(root);
  }
  function handleResult(result, message) { if (!result.ok) { UI.toast(result.message,true); return false; } render(); UI.toast(message); return true; }
  document.addEventListener('submit', event => {
    if (event.target.id==='request-form') { event.preventDefault(); const form=event.target; if (!form.reportValidity()) return; handleResult(P.requestChange(caseRecord.id,form.section.value,form.message.value,caseRecord.revision),'درخواست اصلاح در پورتال مرکز ثبت شد.'); }
    if (event.target.id==='content-form') { event.preventDefault(); if (!event.target.reportValidity()) return; const result=P.saveCopy(editorValues); if (result.ok) { editorDirty=false; render(); UI.toast('متن‌ها منتشر شدند و در پورتال کارشناس نمایش داده می‌شوند.'); } else UI.toast(result.message,true); }
  });
  document.addEventListener('input', event => {
    const input=event.target;
    if (input.id==='case-search') { search=input.value.trim(); document.getElementById('case-results').innerHTML=caseRows(filteredRecords()); }
    if (input.id==='editor-search') { editorSearch=input.value.trim(); editorPage=0; document.getElementById('editor-fields').innerHTML=editorFields(); }
    if (input.dataset.copy) {
      const entry=P.copyBase[Number(input.dataset.copy)]; editorValues[entry.key]=input.value; editorDirty=true;
      document.getElementById('editor-save-state').textContent='تغییرهای منتشرنشده';
      input.closest('.editor-field').querySelector('.edited-label').hidden=input.value===entry.value;
      document.getElementById('editor-preview').innerHTML=editorPreview(entry);
    }
  });
  document.addEventListener('focusin', event => { if (event.target.dataset.copy) document.getElementById('editor-preview').innerHTML=editorPreview(P.copyBase[Number(event.target.dataset.copy)]); });
  document.addEventListener('change', event => {
    const input=event.target;
    if (input.id==='case-status') { statusFilter=input.value; document.getElementById('case-results').innerHTML=caseRows(filteredRecords()); }
    if (input.id==='case-county') { countyFilter=input.value; document.getElementById('case-results').innerHTML=caseRows(filteredRecords()); }
    if (input.id==='table-section') { section=input.value; showReserved=false; window.history.replaceState({},'', './tables.html?section='+section); root.innerHTML=tablePage(); document.getElementById('table-section').focus(); }
    if (input.id==='show-reserved') { showReserved=input.checked; root.innerHTML=tablePage(); document.getElementById('show-reserved').focus(); }
    if (input.id==='editor-category') { editorCategory=input.value; editorSearch=''; editorPage=0; root.innerHTML=editorPageHtml(); document.getElementById('editor-category').focus(); if(editorDirty)document.getElementById('editor-save-state').textContent='تغییرهای منتشرنشده'; }
  });
  document.addEventListener('click', event => {
    const button=event.target.closest('[data-manager]'); if (!button) return;
    const action=button.dataset.manager;
    if (action==='clear-filters') { search='';statusFilter='';countyFilter='';render();document.getElementById('case-search').focus(); }
    if (action==='table-mode') { tableMode=button.dataset.mode;root.innerHTML=tablePage();document.querySelector('[data-mode="'+tableMode+'"]').focus(); }
    if (['approve','reset-copy'].includes(action)) showConfirm(action);
    if (action==='cancel-confirm') document.getElementById('manager-confirm').close();
    if (action==='confirm-action') {
      document.getElementById('manager-confirm').close();
      if (confirmAction==='reset-copy') { editorValues={};editorDirty=true;root.innerHTML=editorPageHtml();document.getElementById('editor-save-state').textContent='تغییرهای منتشرنشده'; UI.toast('متن‌های اولیه آماده شدند. برای اعمال، ذخیره و انتشار را بزنید.'); }
      else handleResult(P.approve(caseRecord.id,caseRecord.revision),'پرونده توسط مدیر تأیید شد.');
    }
    if (action==='restore-text') { const entry=P.copyBase[Number(button.dataset.index)];delete editorValues[entry.key];editorDirty=true;document.getElementById('editor-fields').innerHTML=editorFields();document.getElementById('editor-preview').innerHTML=editorPreview(entry);document.getElementById('editor-save-state').textContent='تغییرهای منتشرنشده';document.getElementById('copy-'+button.dataset.index).focus(); }
    if (['editor-prev','editor-next'].includes(action)) { editorPage+=action==='editor-next'?1:-1;document.getElementById('editor-fields').innerHTML=editorFields();document.querySelector('.copy-input')?.focus(); }
  });
  window.addEventListener('beforeunload', event => { if (editorDirty) { event.preventDefault();event.returnValue=''; } });
  render();
  if (page==='tables') {
    const script=document.createElement('script'); script.src='./assets/js/county-data.js';
    script.onload=()=>{ root.innerHTML=tablePage(); };
    script.onerror=()=>{root.innerHTML=UI.heading('جدول آماده نشد','داده‌های شهرستان‌ها')+'<section class="panel empty-state">فایل داده دریافت نشد. صفحه را دوباره باز کنید.</section>';};
    document.head.append(script);
  }
})();

