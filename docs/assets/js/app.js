/* Own-center form UI; role and case mutations are checked by Portal. */
(function () {
  "use strict";

  if (!window.PortalAllowed || window.PortalAuth.user()?.role !== "expert") return;
  const D = window.PortalData, P = window.Portal, UI = window.PortalUI;
  let record = P.own();
  if (!record) return;
  const loaded = { state: record.state, storageAvailable: true };
  const state = loaded.state;
  const page = document.body.dataset.page;
  const e = D.escape;
  const fa = D.fa;
  let storageAvailable = loaded.storageAvailable;
  let saveTimer = null;
  let dirty = false;
  let toastTimer = null;
  let currentSection = new URLSearchParams(window.location.search).get("section");
  if (!D.applicable.some((section) => section.id === currentSection)) currentSection = "space";
  let currentGroup = null;

  const paths = {
    building: '<path d="M3 21h18M5 21V8h5V3h4v5h5v13M9 21v-5h6v5M8 11h.01M16 11h.01M8 14h.01M16 14h.01M12 7h.01"/>',
    home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
    house: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8M8 16h8"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z M22 2 11 13"/>',
    book: '<path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M2 13h20"/>',
    tools: '<path d="m14 6 4 4M3 21l7-7M14 3a5 5 0 0 0-5 6l-6 6a3 3 0 0 0 4 4l6-6a5 5 0 0 0 6-5l-3 2-3-3 2-3Z M15 15l5 5"/>',
    flask: '<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L14 9V3M8 14h8"/>',
    settings: '<path d="m9 3-1 3-3 1v4l-2 1 2 1v4l3 1 1 3h6l1-3 3-1v-4l2-1-2-1V7l-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2"/>',
    tent: '<path d="M2 21 12 3l10 18H2ZM9 21l3-6 3 6M10 3l2 0 2 0"/>',
    accessibility: '<circle cx="12" cy="4" r="2"/><path d="m4 9 8 2 8-2M12 11v4M12 15l-5 7M12 15l5 7"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01"/>',
    chevron: '<path d="m14 6-6 6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    circlecheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    alert: '<path d="m12 3 10 18H2Z M12 9v5M12 17h.01"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z M7 3v6h10V3M7 21v-7h10v7"/>',
    edit: '<path d="m16 3 5 5M3 21l6-1L21 8a3.5 3.5 0 0 0-5-5L4 15Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>'
  };
  function icon(name, extra) {
    return '<svg class="icon ' + (extra || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (paths[name] || paths.file) + "</svg>";
  }
  function dateLabel(value) {
    if (!value) return "هنوز تغییری ثبت نشده";
    try {
      return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
    } catch (_) { return ""; }
  }
  function status(definition) {
    if (!definition.applicable) return { kind: "irrelevant", text: "نامرتبط" };
    if (D.complete(state, definition.id)) return { kind: "done", text: "تکمیل شده" };
    if (state.sections[definition.id].started) return { kind: "draft", text: "در حال تکمیل" };
    return { kind: "idle", text: "شروع نشده" };
  }
  function statusHtml(definition, id) {
    const value = status(definition);
    return '<span class="status status-' + value.kind + '"' + (id ? ' id="' + id + '"' : "") + ">" + value.text + "</span>";
  }
  function demoBadge() { return '<span class="demo-badge">' + icon("monitor") + "نمایش نمونه</span>"; }
  function pageHeading(title, eyebrow) {
    return '<div class="page-heading"><div><p class="eyebrow">' + icon("building") + e(eyebrow) + '</p><h1>' + e(title) + "</h1></div>" + demoBadge() + "</div>";
  }
  function schoolMeta() {
    return '<div class="school-meta"><span>نوع مرکز: ' + e(state.profile.type) + '</span><span>شهرستان: ' + e(state.profile.county) + '</span><span>کد مرکز: <bdi>' + fa(e(state.profile.code)) + '</bdi></span><span>دوره: ' + fa(state.profile.period) + "</span></div>";
  }
  function schoolBanner(action) {
    return '<section class="panel school-banner" aria-label="مشخصات مرکز"><div><p class="school-banner-name">' + e(state.profile.name) + "</p>" + schoolMeta() + "</div>" + (action || "") + "</section>";
  }
  function footer() {
    return '<footer class="page-footer"><span>اطلس نیازهای آموزشی · خراسان شمالی</span><span>نسخه نمایشی ' + fa("4.0") + "</span></footer>";
  }

  function renderShell() { UI.shell(page, state); }

  function renderDashboard() {
    const count = D.stats(state);
    const firstPending = D.nextSection(state);
    const action = state.submission
      ? '<a class="button button-primary" href="./review.html">' + icon("file") + "مشاهده پرونده ارسال‌شده</a>"
      : '<a class="button button-primary" href="./needs.html?section=' + firstPending + '">' + icon("edit") + (count.percent === 100 ? "ویرایش اطلاعات مرکز" : "ادامه تکمیل اطلاعات") + "</a>";
    const cards = D.definitions.map((definition) => {
      const value = status(definition);
      const tag = definition.applicable ? "a" : "div";
      const href = definition.applicable ? ' href="./needs.html?section=' + definition.id + '"' : "";
      const cardClass = !definition.applicable ? " is-irrelevant" : definition.id === firstPending && count.percent < 100 ? " is-current" : "";
      const actionText = !definition.applicable ? "ویژه مراکز دیگر" : state.submission ? "مشاهده اطلاعات" : value.kind === "done" ? "مشاهده اطلاعات" : "ورود به بخش";
      return "<" + tag + ' class="section-card' + cardClass + '"' + href + '><div class="section-card-top">' +
        icon(definition.icon, "section-card-icon") + "<div><h3>" + e(P.text('domain.' + definition.id, definition.title)) + '</h3><p class="card-meta">' + fa(definition.rows.length) + ' شاخص</p></div></div><div class="section-card-footer">' +
        statusHtml(definition) + '<span class="card-action">' + actionText + "</span></div></" + tag + ">";
    }).join("");
    const workflow = [
      { title: "پیش‌نویس", description: "در حال تکمیل اطلاعات", icon: "file", active: record.status === 'draft' },
      { title: "ارسال شده", description: state.submission ? "در صف بررسی مدیر سامانه" : "در انتظار بررسی", icon: "send", active: ['submitted', 'resubmitted'].includes(record.status) },
      { title: "نیازمند اصلاح", description: 'پاسخ و ارسال مجدد مرکز', icon: 'edit', active: record.status === 'changes_requested' },
      { title: "تأیید شده", description: 'پس از تأیید مدیر سامانه', icon: 'circlecheck', active: record.status === 'approved' }
    ].map((item) => '<div class="workflow-item ' + (item.active ? "is-active" : "") + '"><span class="workflow-icon">' + icon(item.icon) + "</span><div><span>" + item.title + "</span><small>" + item.description + "</small></div></div>").join("");
    return [
      pageHeading("میزکار مرکز", "ثبت امکانات و نیازهای آموزشی"),
      '<div class="space-y-5">',
      schoolBanner(action), '<section class="case-strip">' + UI.status(record) + '<span>' + (record.status === 'changes_requested' ? 'نظر مدیر را در درخواست‌ها بخوانید و پس از اصلاح، دوباره ارسال کنید.' : 'فقط اطلاعات پرونده مرکز خودتان در این پورتال نمایش داده می‌شود.') + '</span><a class="text-button" href="./requests.html">درخواست‌ها و سوابق</a></section>',
      '<section class="coverage-strip" aria-label="پوشش اطلاعات"><div><strong>' + fa(D.indicatorCount) + '</strong><span>شاخص در فرم‌ها</span></div><div><strong>' + fa(9) + '</strong><span>حوزه نیازسنجی</span></div><div><strong>' + fa(1) + '</strong><span>پرونده متعلق به شما</span></div><a class="text-button" href="./requests.html">' + icon("bell") + 'پیگیری درخواست‌های مرکز</a></section>',
      '<section class="panel progress-panel" aria-label="پیشرفت تکمیل اطلاعات">',
      '<div class="progress-head"><span><strong class="text-ink! text-base!">' + fa(count.completed) + "</strong> از " + fa(count.total) + ' حوزه تکمیل شده</span><strong>' + fa(count.percent) + "٪</strong></div>",
      '<div class="progress-track" role="progressbar" aria-label="تکمیل حوزه‌های نیازسنجی" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + count.percent + '"><div class="progress-fill" style="width:' + count.percent + '%"></div></div>',
      '<p class="progress-caption">' + icon("info") + "هر ۹ حوزه برای بررسی و تکمیل در دسترس است.</p></section>",
      '<section class="pt-1"><div class="section-heading"><h2>بخش‌های نیازسنجی</h2><button class="text-button" data-action="profile">' + icon("edit") + "ویرایش مشخصات مرکز</button></div>",
      '<div class="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4" id="domain-grid">' + cards + "</div></section>",
      '<section class="panel" aria-label="وضعیت پرونده"><div class="px-5 pt-4 text-sm font-semibold">پیگیری پرونده</div><div class="workflow">' + workflow + "</div></section></div>",
      footer()
    ].join("");
  }


  function sectionNavigation() {
    const tabs = D.definitions.map((definition) => '<button type="button" class="form-tab ' + (definition.id === currentSection ? "is-active" : "") + '" data-action="section" data-section="' + definition.id + '" aria-pressed="' + (definition.id === currentSection) + '">' + icon(definition.icon) + '<span>' + e(P.text('domain.' + definition.id, definition.title)) + '</span></button>').join("");
    return '<aside class="panel section-navigation" aria-label="حوزه‌های نیازسنجی"><h2>حوزه‌های نیازسنجی</h2><nav class="form-tabs" aria-label="انتخاب حوزه">' + tabs + '</nav></aside>';
  }
  function fieldHtml(id, title, kind, value, field, locked, extra) {
    const attributes = ' id="' + id + '" data-field="' + field + '" aria-label="' + e(title) + '" aria-describedby="' + id + '-error"' + (locked ? ' disabled' : '') + (extra || '');
    const options = kind === "presence" ? ["دارد", "ندارد"] : kind === "boolean" ? ["بله", "خیر"] : null;
    let html;
    if (options) html = '<select class="field"' + attributes + '><option value="">انتخاب کنید</option>' + options.map((option) => '<option value="' + option + '"' + (value === option ? ' selected' : '') + '>' + option + '</option>').join("") + '</select>';
    else html = '<input class="field ' + (["count", "year"].includes(kind) ? 'count-input' : '') + '" type="text"' + attributes + (["count", "year"].includes(kind) ? ' inputmode="numeric" maxlength="24"' : ' maxlength="180"') + ' value="' + e(fa(value)) + '" autocomplete="off">';
    return html + '<span class="field-error" id="' + id + '-error" hidden></span>';
  }
  function rowHtml(definition, row) {
    const prefix = currentSection + '-' + row.id;
    const locked = !!state.submission;
    return '<tr data-row="' + row.id + '"><td class="source-row-number" data-label="ردیف منبع">' + fa(definition.excelRow) + '</td><td><span class="row-title">' + e(P.text('indicator.' + currentSection + '.' + definition.id, definition.title)) + '</span><span class="row-unit">' + ({ count: 'تعداد', year: 'سال شمسی', presence: 'وضعیت', text: 'عدد یا شرح' })[definition.kind] + '</span></td><td data-label="مقدار / وضعیت">' + fieldHtml(prefix + '-value', P.text('indicator.' + currentSection + '.' + definition.id, definition.title), definition.kind, row.unknown ? '' : row.value, 'value', locked || row.unknown) + '<label class="unknown-label"><input type="checkbox" data-field="unknown"' + (row.unknown ? ' checked' : '') + (locked ? ' disabled' : '') + '>اطلاعات نامشخص</label></td><td data-label="توضیحات"><textarea class="field notes-input" rows="2" maxlength="180" data-field="notes" aria-label="توضیحات ' + e(P.text('indicator.' + currentSection + '.' + definition.id, definition.title)) + '"' + (locked ? ' disabled' : '') + '>' + e(row.notes) + '</textarea></td></tr>';
  }
  function extraFieldsHtml(definition, section) {
    return '<div class="extra-field-grid">' + definition.extras.map((field) => {
      const row = section.extras.find((item) => item.id === field.id);
      const id = currentSection + '-' + field.id + '-extra';
      return '<div data-extra="' + field.id + '"><label class="field-label" for="' + id + '">' + e(P.text('extra.' + definition.id + '.' + field.id, field.title)) + '</label>' + fieldHtml(id, P.text('extra.' + definition.id + '.' + field.id, field.title), field.kind, row.value, 'extra', !!state.submission) + '</div>';
    }).join('') + '</div>';
  }
  function itemsHtml(section) {
    const rows = section.items.map((item, index) => '<tr data-item="' + item.id + '"><td data-label="مرکز / فضا">' + fieldHtml(currentSection + '-' + item.id + '-place', 'نام مرکز یا فضا، ردیف ' + fa(index + 1), 'text', item.place, 'place', !!state.submission) + '</td><td data-label="تجهیز موردنیاز">' + fieldHtml(currentSection + '-' + item.id + '-title', 'تجهیز موردنیاز، ردیف ' + fa(index + 1), 'text', item.title, 'title', !!state.submission) + '</td><td data-label="تعداد">' + fieldHtml(currentSection + '-' + item.id + '-count', 'تعداد تجهیز، ردیف ' + fa(index + 1), 'count', item.count, 'count', !!state.submission) + '</td><td><button type="button" class="text-button remove-item" data-action="remove-item" data-item="' + item.id + '" aria-label="حذف تجهیز ردیف ' + fa(index + 1) + '"' + (state.submission ? ' disabled' : '') + '>حذف</button></td></tr>').join('');
    return '<div class="table-wrap"><table class="needs-table items-table"><caption class="sr-only">جزئیات تجهیزات موردنیاز</caption><thead><tr><th scope="col">مرکز / فضا</th><th scope="col">تجهیز موردنیاز</th><th scope="col">تعداد</th><th scope="col">اقدام</th></tr></thead><tbody>' + rows + '</tbody></table>' + (!section.items.length ? '<p class="empty-items">تجهیزی در فهرست ثبت نشده است.</p>' : '') + '<button type="button" class="button button-secondary add-item" data-action="add-item"' + (state.submission || section.items.length >= 85 ? ' disabled' : '') + '>افزودن تجهیز</button></div>';
  }
  function renderNeeds() {
    const definition = D.definitions.find((item) => item.id === currentSection);
    const section = state.sections[currentSection];
    const groups = [...new Set(definition.rows.map((row) => row.group))].map((title) => ({ id: title, title }));
    if (definition.extras.length) groups.push({ id: '__extras', title: 'وضعیت مرکز در اطلس' });
    if (definition.details) groups.push({ id: '__details', title: 'جزئیات تجهیزات' });
    if (!groups.some((group) => group.id === currentGroup)) currentGroup = groups[0].id;
    const groupButtons = groups.map((group) => '<button type="button" class="group-tab ' + (group.id === currentGroup ? 'is-active' : '') + '" data-action="group" data-group="' + e(group.id) + '" aria-pressed="' + (group.id === currentGroup) + '">' + e(P.group(currentSection, group.title)) + '</button>').join('');
    const content = currentGroup === '__extras' ? extraFieldsHtml(definition, section) : currentGroup === '__details' ? itemsHtml(section) : '<div class="table-wrap"><table class="needs-table indicators-table"><caption class="sr-only">' + e(currentGroup) + '</caption><thead><tr><th scope="col">ردیف منبع</th><th scope="col">شاخص</th><th scope="col">مقدار / وضعیت</th><th scope="col">توضیحات</th></tr></thead><tbody>' + definition.rows.filter((item) => item.group === currentGroup).map((item) => rowHtml(item, section.rows.find((row) => row.id === item.id))).join('') + '</tbody></table></div>';
    return [
      pageHeading('ثبت اطلاعات و نیازها', 'فرم نیازسنجی مرکز'), '<div class="space-y-5">',
      schoolBanner('<button class="text-button" data-action="profile">' + icon('edit') + 'ویرایش مشخصات</button>'),
      state.submission ? '<div class="notice notice-info">' + icon('lock') + '<span>پرونده برای بررسی قفل است. وضعیت و امکان بازگشت به پیش‌نویس را از صفحه مرور پیگیری کنید.</span><a class="text-button notice-action" href="./review.html">مرور پرونده</a></div>' : '',
      '<div class="forms-layout">' + sectionNavigation() + '<div class="min-w-0"><form class="panel form-panel" id="needs-form" novalidate>',
      '<div class="form-title"><div><h2>' + e(P.text('domain.' + definition.id, definition.title)) + '</h2><p>' + fa(definition.rows.length) + ' شاخص از جدول مرجع · اطلاعات مرکز شما</p></div>' + statusHtml(definition, 'section-status') + '</div>',
      '<div class="info-box">' + icon('info') + '<div><p>مقادیر این فرم نمونه‌اند و برای همین مرکز وارد می‌شوند.</p><p>شاخص‌های موجود و موردنیاز جدا هستند. برای مقدار نامعلوم، «اطلاعات نامشخص» را انتخاب کنید.</p></div></div>',
      '<nav class="group-tabs" aria-label="گروه‌های شاخص">' + groupButtons + '</nav><div class="group-heading"><h3>' + e(P.group(currentSection, groups.find((group) => group.id === currentGroup).title)) + '</h3><span>' + (currentGroup === '__extras' ? 'فیلدهای تکمیلی PDF' : currentGroup === '__details' ? 'شرح تجهیز و تعداد' : 'مطابق عنوان‌های Excel') + '</span></div>',
      '<div class="form-error" id="form-error" role="alert" hidden></div>', content,
      '<div class="form-actions"><span class="save-indicator" id="save-indicator">' + icon('circlecheck') + '<span>' + (state.savedAt ? 'پیش‌نویس ذخیره شده' : 'اطلاعات نمونه') + '</span></span><div class="action-buttons"><button type="button" class="button button-secondary" data-action="save-draft"' + (state.submission ? ' disabled' : '') + '>' + icon('save') + 'ذخیره پیش‌نویس</button><button type="submit" class="button button-primary"' + (state.submission ? ' disabled' : '') + '>تکمیل حوزه و ادامه</button></div></div></form>',
      '<p class="form-tip">' + icon('info') + 'خانه خالی به معنی صفر نیست. «تکمیل حوزه» همه گروه‌های همین حوزه را بررسی می‌کند.</p></div></div></div>', footer()
    ].join('');
  }
  function reviewDetails() {
    return '<div class="review-details"><h3>مشاهده جزئیات پیش از ارسال</h3>' + D.definitions.map((definition) => {
      const section = state.sections[definition.id];
      const rows = definition.rows.map((item) => {
        const row = section.rows.find((record) => record.id === item.id);
        return '<tr><td>' + e(P.text('indicator.' + definition.id + '.' + item.id, item.title)) + '</td><td>' + (row.unknown ? 'نامشخص' : e(fa(row.value)) || '—') + '</td><td>' + e(row.notes) + '</td></tr>';
      }).join('') + definition.extras.map((field) => '<tr><td>' + e(P.text('extra.' + definition.id + '.' + field.id, field.title)) + '</td><td>' + e(fa(section.extras.find((item) => item.id === field.id).value)) + '</td><td>فرم اطلس</td></tr>').join('') + section.items.map((item) => '<tr><td>' + e(item.place) + ' · ' + e(P.text('indicator.' + definition.id + '.' + item.id, item.title)) + '</td><td>' + e(fa(item.count)) + '</td><td>جزئیات تجهیزات</td></tr>').join('');
      return '<details><summary>' + e(P.text('domain.' + definition.id, definition.title)) + '<span>' + fa(definition.rows.length) + ' شاخص</span></summary><div class="review-table-wrap"><table class="review-table"><thead><tr><th scope="col">شاخص / شرح</th><th scope="col">مقدار / وضعیت</th><th scope="col">توضیحات</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>';
    }).join('') + '</div>';
  }


  function sectionSummary(definition) {
    const section = state.sections[definition.id];
    const recorded = definition.rows.filter((item) => {
      const row = section.rows.find((saved) => saved.id === item.id);
      return row.unknown || D.validValue(row.value, item.kind);
    }).length;
    return fa(recorded) + ' از ' + fa(definition.rows.length) + ' شاخص' + (definition.details ? ' · ' + fa(section.items.length) + ' تجهیز تفصیلی' : '');
  }

  function renderReview() {
    const count = D.stats(state);
    const ready = count.completed === count.total;
    const submitted = !!state.submission;
    const unknowns = D.unknownCount(state);
    const notice = ready
      ? '<div class="notice notice-success">' + icon("circlecheck") + "<span>هر ۹ حوزه تکمیل شده است.</span></div>"
      : '<div class="notice notice-warning">' + icon("alert") + "<span>" + fa(count.total - count.completed) + ' بخش هنوز تکمیل نشده است.</span><a class="text-button notice-action" href="./needs.html?section=' + D.nextSection(state) + '">تکمیل بخش‌های باقی‌مانده</a></div>';
    const rows = D.applicable.map((definition) => '<tr><td>' + e(P.text('domain.' + definition.id, definition.title)) + '</td><td>' + e(sectionSummary(definition)) + "</td><td>" + statusHtml(definition) +
      '</td><td><a class="text-button" href="./needs.html?section=' + definition.id + '">' + icon(submitted ? "file" : "edit") + (submitted ? "مشاهده" : "ویرایش") + "</a></td></tr>").join("");
    const success = submitted ? [
      '<section class="panel submission-panel" aria-label="نتیجه ارسال نمایشی"><span class="submission-icon">' + icon("check") + "</span>",
      '<h2 class="text-xl font-bold">ارسال نمایشی پرونده ثبت شد</h2><p class="text-muted text-sm mt-1">پرونده در میزکار کارشناس همین دمو قابل بررسی است؛ ارسال واقعی انجام نشده است.</p>',
      '<div class="mt-4 text-sm text-muted">کد پیگیری نمایشی</div><bdi class="tracking-code" dir="ltr">' + e(state.submission.tracking) + "</bdi>",
      '<p class="text-muted text-xs mt-2">زمان ثبت: ' + e(dateLabel(state.submission.at)) + "</p></section>"
    ].join("") : "";
    const unknownNotice = unknowns ? '<div class="notice notice-info text-sm! mt-4">' + icon("info") + "<span>" + fa(unknowns) + " مقدار با وضعیت «نامشخص» ثبت شده است؛ این وضعیت مانع ارسال نیست.</span></div>" : "";
    const actionArea = submitted
      ? '<div class="flex flex-wrap items-center justify-between gap-3"><div>' + UI.status(record) + '<p class="text-sm text-muted mt-2">' + (['submitted','resubmitted'].includes(record.status) ? 'تا پیش از تأیید مدیر می‌توانید پرونده را به پیش‌نویس برگردانید.' : 'پرونده تأییدشده برای کارشناس ثبت اطلاعات قفل است.') + '</p></div><div class="flex flex-wrap gap-2">' + (['submitted','resubmitted'].includes(record.status) ? '<button class="button button-secondary" data-action="edit-submitted">بازگشت به پیش‌نویس</button>' : '') + '<a class="button button-primary" href="./requests.html">پیگیری پرونده</a></div></div>'
      : '<label class="consent-label ' + (!ready ? 'is-disabled' : '') + '"><input type="checkbox" id="review-consent"' + (!ready ? ' disabled' : '') + '>اطلاعات واردشده را بررسی کرده‌ام.</label>' +
        '<div class="flex flex-wrap items-center justify-between gap-4 mt-5"><p class="text-xs text-muted">' + (record.requests.some(r => r.status === 'open') ? 'ابتدا به درخواست‌های اصلاح در صفحه پیگیری پاسخ بدهید.' : 'شماره پیگیری پس از ارسال نمایشی ایجاد می‌شود.') + '</p><div class="action-buttons"><a class="button button-secondary" href="./needs.html?section=' + D.nextSection(state) + '">بازگشت به ویرایش</a><button class="button button-primary" id="submit-button" data-action="submit" disabled>ارسال برای بررسی مدیر سامانه</button></div></div>';

    return [
      pageHeading("مرور و ارسال پرونده", "بررسی اطلاعات پیش از ارسال"),
      '<div class="space-y-5">' + success + (!submitted ? notice : ""),
      schoolBanner('<button class="text-button" data-action="profile">' + icon("edit") + (submitted ? "مشاهده مشخصات" : "ویرایش مشخصات") + "</button>"),
      '<section class="panel"><div class="review-heading"><h2>خلاصه اطلاعات ثبت‌شده</h2><span class="text-xs text-muted">' + fa(count.completed) + " از " + fa(count.total) + " بخش تکمیل شده</span></div>",
      '<div class="review-table-wrap"><table class="review-table"><caption class="sr-only">خلاصه اطلاعات در هر ۹ حوزه</caption><thead><tr><th scope="col">بخش</th><th scope="col">خلاصه</th><th scope="col">وضعیت</th><th scope="col">اقدام</th></tr></thead><tbody>' + rows + "</tbody></table></div>",
      reviewDetails(),
      '<div class="px-4 sm:px-6 pb-5">' + unknownNotice + '</div><div class="review-footer">' + actionArea + "</div></section></div>",
      footer()
    ].join("");
  }


  function renderPage() {
    const content = page === 'dashboard' ? renderDashboard() : page === 'needs' ? renderNeeds()  : renderReview();
    const migration = state.migrated ? '<div class="notice notice-info migration-notice">' + icon('info') + '<span>پیش‌نویس قبلی حفظ و به فرم‌های جدید منتقل شد. حوزه‌های گسترش‌یافته را دوباره بررسی کنید.</span><button class="text-button" data-action="dismiss-migration">بستن</button></div>' : '';
    const storage = !storageAvailable ? '<div class="notice notice-warning mb-5">' + icon('alert') + '<span>ذخیره در مرورگر در دسترس نیست. تغییرات با بستن صفحه حفظ نمی‌شوند.</span></div>' : '';
    document.getElementById('page-content').innerHTML = migration + storage + content;
    P.applyCopy(document.getElementById('page-content'));
  }

  function renderOverlays() {
    document.getElementById("overlays").innerHTML = [
      '<dialog class="dialog" id="profile-dialog" aria-labelledby="profile-title"><form id="profile-form"><div class="dialog-head"><h2 id="profile-title">مشخصات مرکز</h2><button type="button" class="icon-button" data-action="close-dialog" data-dialog="profile-dialog" aria-label="بستن مشخصات">' + icon("close") + '</button></div><div class="dialog-body">',
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div class="sm:col-span-2"><label class="field-label" for="profile-name">نام مرکز</label><input class="field" id="profile-name" name="name" required minlength="2" maxlength="80" autocomplete="organization"></div>',
      '<div><label class="field-label" for="profile-code">کد مرکز</label><input class="field count-input" id="profile-code" name="code" required inputmode="numeric" pattern="[0-9۰-۹٠-٩]{4,10}" maxlength="10"></div>',
      '<div><label class="field-label" for="profile-county">شهرستان</label><select class="field" id="profile-county" name="county">' + D.counties.map((county) => '<option value="' + e(county) + '">' + e(county) + "</option>").join("") + "</select></div>",
      '<div><label class="field-label" for="profile-students">تعداد دانش‌آموز</label><input class="field count-input" id="profile-students" name="students" required inputmode="numeric" pattern="[0-9۰-۹٠-٩]+" maxlength="7"></div>',
      '<div><label class="field-label" for="profile-classrooms">تعداد کلاس</label><input class="field count-input" id="profile-classrooms" name="classrooms" required inputmode="numeric" pattern="[0-9۰-۹٠-٩]+" maxlength="7"></div></div>',
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">' + Object.keys(D.profileChoices).map((key) => '<div><label class="field-label" for="profile-' + key + '">' + ({ type: 'نوع مرکز', level: 'مقطع', gender: 'جنسیت' })[key] + '</label><select class="field" id="profile-' + key + '" name="' + key + '">' + D.profileChoices[key].map((value) => '<option value="' + e(value) + '">' + e(value) + '</option>').join('') + '</select></div>').join('') + '</div><label class="field-label mt-4" for="profile-discrepancy">اعلام مغایرت اطلاعات پایه</label><textarea class="field" id="profile-discrepancy" name="discrepancy" maxlength="300" rows="2" placeholder="شرح مغایرت، در صورت وجود"></textarea><p class="text-xs text-muted mt-3">کد مرکز و شهرستان ثابت است. برای اعلام مغایرت، شرح آن را ثبت کنید.</p></div><div class="dialog-footer"><button type="button" class="button button-secondary" data-action="close-dialog" data-dialog="profile-dialog">بستن</button><button type="submit" id="profile-save" class="button button-primary">ذخیره مشخصات</button></div></form></dialog>',
      '<dialog class="dialog" id="submit-dialog" aria-labelledby="submit-title"><div class="dialog-head"><h2 id="submit-title">ارسال نمایشی پرونده</h2><button class="icon-button" data-action="close-dialog" data-dialog="submit-dialog" aria-label="بستن تأیید ارسال">' + icon("close") + '</button></div><div class="dialog-body">',
      '<p class="font-semibold">پرونده ' + e(state.profile.name) + ' آماده ثبت ارسال نمایشی است.</p><p class="text-sm text-muted mt-3">پرونده در میزکار مدیر سامانه همین دمو قرار می‌گیرد. برای دیدن نتیجه با حساب admin وارد شوید. ذخیره و ارسال بین دستگاه‌ها هنوز متصل نشده است.</p>',
      '</div><div class="dialog-footer"><button class="button button-secondary" data-action="close-dialog" data-dialog="submit-dialog">بازگشت</button><button class="button button-primary" data-action="confirm-submit">' + icon("send") + "تأیید ارسال نمایشی</button></div></dialog>"
    ].join("");
  }

  function toast(message, error) {
    const element = document.getElementById("toast");
    clearTimeout(toastTimer);
    element.className = error ? "is-error" : "";
    element.innerHTML = icon(error ? "alert" : "circlecheck") + "<span>" + e(message) + "</span>";
    element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 4000);
  }
  function setSaveIndicator(message, kind) {
    const element = document.getElementById("save-indicator");
    if (!element) return;
    element.className = "save-indicator" + (kind ? " is-" + kind : "");
    element.innerHTML = icon(kind === "pending" ? "clock" : kind === "error" ? "alert" : "circlecheck") + "<span>" + e(message) + "</span>";
  }
  function save(showToast) {
    clearTimeout(saveTimer);
    saveTimer = null;
    const previousSavedAt = state.savedAt;
    state.savedAt = new Date().toISOString();
    const result = P.saveDraft(state, record.revision);
    storageAvailable = result.ok;
    if (result.ok) record = result.record;
    dirty = !storageAvailable;
    if (!storageAvailable) {
      state.savedAt = previousSavedAt;
      setSaveIndicator("ذخیره در مرورگر ممکن نیست", "error");
      toast(result.message, true);
      return false;
    }
    setSaveIndicator("پیش‌نویس ذخیره شده");
    const saveTime = document.getElementById("notification-save-time");
    if (saveTime) saveTime.textContent = "آخرین ذخیره: " + dateLabel(state.savedAt);
    if (showToast) toast("پیش‌نویس ذخیره شد.");
    return true;
  }
  function flushPending() {
    if (dirty) return save(false);
    return true;
  }
  function markChanged() {
    const section = state.sections[currentSection];
    section.started = true;
    section.completed = false;
    section.updatedAt = new Date().toISOString();
    dirty = true;
    setSaveIndicator("در حال ذخیره پیش‌نویس…", "pending");
    const badge = document.getElementById("section-status");
    if (badge) { badge.className = "status status-draft"; badge.textContent = "در حال تکمیل"; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(false), 500);
  }
  function clearError(input) {
    input.removeAttribute("aria-invalid");
    const errorId = input.getAttribute("aria-describedby");
    const error = errorId ? document.getElementById(errorId) : null;
    if (error) { error.hidden = true; error.textContent = ""; }
  }

  function saveAndContinue() {
    if (state.submission) return;
    const definition = D.definitions.find((item) => item.id === currentSection);
    const section = state.sections[currentSection];
    const errors = D.validateSection(section, definition);
    if (errors.length) {
      const first = errors[0];
      currentGroup = first.field === 'extra' ? '__extras' : ['place', 'title', 'count'].includes(first.field) ? '__details' : definition.rows.find((row) => row.id === first.rowId).group;
      renderPage();
      const banner = document.getElementById('form-error');
      banner.textContent = fa(errors.length) + ' فیلد در این حوزه نیاز به بررسی دارد. خانه خالی با صفر فرق دارد.';
      banner.hidden = false;
      errors.forEach((error) => {
        const id = currentSection + '-' + error.rowId + '-' + error.field;
        const input = document.getElementById(id);
        if (!input) return;
        input.setAttribute('aria-invalid', 'true');
        const message = document.getElementById(id + '-error');
        message.textContent = error.message;
        message.hidden = false;
      });
      document.getElementById(currentSection + '-' + first.rowId + '-' + first.field).focus();
      return;
    }
    section.completed = true;
    section.started = true;
    section.updatedAt = new Date().toISOString();
    dirty = true;
    if (!save(true)) return;
    const next = D.definitions.find((item) => !D.complete(state, item.id));
    window.location.href = next ? './needs.html?section=' + next.id : './review.html';
  }

  function openProfile() {
    ["name", "code", "students", "classrooms", "county", "type", "level", "gender", "discrepancy"].forEach((key) => {
      const input = document.getElementById("profile-" + key);
      input.value = ["code", "students", "classrooms"].includes(key) ? fa(state.profile[key]) : state.profile[key];
      input.disabled = !!state.submission || ["code", "county"].includes(key);
      input.setCustomValidity("");
    });
    document.getElementById("profile-save").hidden = !!state.submission;
    document.getElementById("profile-dialog").showModal();
  }
  function saveProfile(event) {
    event.preventDefault();
    if (state.submission) return;
    const form = event.target;
    const nameInput = form.elements.name;
    if (nameInput.value.trim().length < 2) { nameInput.setCustomValidity("نام مرکز را وارد کنید."); form.reportValidity(); return; }
    for (const key of ["students", "classrooms"]) {
      const input = form.elements[key];
      if (D.parseCount(input.value) === null) { input.setCustomValidity("یک عدد صحیح بین صفر تا یک میلیون وارد کنید."); form.reportValidity(); return; }
    }
    if (!form.reportValidity()) return;
    const previous = { ...state.profile };
    state.profile.name = nameInput.value.trim();
    // Center identity is fixed by the account, not editable fields.
    
    state.profile.students = String(D.parseCount(form.elements.students.value));
    state.profile.classrooms = String(D.parseCount(form.elements.classrooms.value));
    for (const key of ["type", "level", "gender", "discrepancy"]) state.profile[key] = form.elements[key].value.trim();
    if (!save(false)) { state.profile = previous; toast("مشخصات ذخیره نشد.", true); return; }
    document.getElementById("profile-dialog").close();
    renderShell();
    renderPage();
    renderOverlays();
    toast("مشخصات مرکز ذخیره شد.");
  }
  function confirmSubmit() {
    if (state.submission || D.stats(state).percent !== 100 || !document.getElementById("review-consent")?.checked) return;
    const result = P.submit(state, record.revision);
    if (!result.ok) { toast(result.message, true); return; }
    record = result.record; Object.assign(state, record.state);
    document.getElementById("submit-dialog").close();
    renderPage();
    document.getElementById("main").focus();
  }

  document.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");
    const action = actionElement?.dataset.action;
    if (event.target.closest("a[href]")) flushPending();
    if (!actionElement) return;
    switch (action) {
      case "guide":
        UI.guide();
        break;
      case "profile": openProfile(); break;
      case "close-dialog": document.getElementById(actionElement.dataset.dialog).close(); break;
      case "section":
        if (currentSection === actionElement.dataset.section) break;
        if (!flushPending()) { toast("پیش‌نویس ذخیره نشد. پیش از تغییر بخش، ذخیره مرورگر را بررسی کنید.", true); break; }
        currentSection = actionElement.dataset.section;
        currentGroup = null;
        window.history.replaceState({}, "", "./needs.html?section=" + currentSection);
        renderPage();
        document.querySelector("#needs-form h2").setAttribute("tabindex", "-1");
        document.querySelector("#needs-form h2").focus();
        break;

      case 'group':
        if (!flushPending()) { toast('پیش‌نویس ذخیره نشد.', true); break; }
        currentGroup = actionElement.dataset.group;
        renderPage();
        document.querySelector('.group-heading h3').setAttribute('tabindex', '-1');
        document.querySelector('.group-heading h3').focus();
        break;
      case 'dismiss-migration':
        state.migrated = false;
        save(false);
        renderPage();
        break;
      case 'add-item': {
        const section = state.sections[currentSection];
        if (state.submission || section.items.length >= 85) break;
        const itemRandom = new Uint32Array(3);
        crypto.getRandomValues(itemRandom);
        const id = 'item-' + Array.from(itemRandom, (n) => n.toString(16)).join('-');
        section.items.push({ id, place: '', title: '', count: '' });
        markChanged();
        renderPage();
        document.getElementById(currentSection + '-' + id + '-place').focus();
        break;
      }
      case 'remove-item': {
        if (state.submission) break;
        const section = state.sections[currentSection];
        section.items = section.items.filter((item) => item.id !== actionElement.dataset.item);
        markChanged();
        renderPage();
        document.querySelector('[data-action="add-item"]').focus();
        break;
      }
      case "save-draft": if (!state.submission) save(true); break;
      case "submit":
        if (D.stats(state).percent === 100 && document.getElementById("review-consent").checked) document.getElementById("submit-dialog").showModal();
        break;
      case "confirm-submit": confirmSubmit(); break;
      case "edit-submitted": {
        const result = P.withdraw(record.revision);
        if (!result.ok) { toast(result.message, true); break; }
        record = result.record; Object.assign(state, record.state);
        renderShell(); renderPage();
        toast("پرونده به پیش‌نویس برگشت و قابل ویرایش است.");
        break;
      }
    }
  });

  function updateField(input) {
    const section = state.sections[currentSection];
    const rowElement = input.closest('[data-row]');
    const extraElement = input.closest('[data-extra]');
    const itemElement = input.closest('[data-item]');
    if (rowElement) {
      const row = section.rows.find((item) => item.id === rowElement.dataset.row);
      row[input.dataset.field] = input.dataset.field === 'unknown' ? input.checked : input.value;
      if (input.dataset.field === 'unknown') {
        const value = rowElement.querySelector('[data-field="value"]');
        value.disabled = row.unknown;
        value.value = row.unknown ? '' : fa(row.value);
        clearError(value);
      }
    } else if (extraElement) section.extras.find((item) => item.id === extraElement.dataset.extra).value = input.value;
    else if (itemElement) section.items.find((item) => item.id === itemElement.dataset.item)[input.dataset.field] = input.value;
    else return;
    clearError(input);
    markChanged();
  }
  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input.closest('#profile-form')) input.setCustomValidity('');
    if (page === 'needs' && input.dataset.field && input.dataset.field !== 'unknown' && input.tagName !== 'SELECT' && !state.submission) updateField(input);
  });
  document.addEventListener('change', (event) => {
    const input = event.target;
    if (input.id === 'review-consent') {
      document.getElementById('submit-button').disabled = !input.checked || D.stats(state).percent !== 100;
      return;
    }
    if (page === 'needs' && input.dataset.field && !state.submission && (input.dataset.field === 'unknown' || input.tagName === 'SELECT')) updateField(input);
  });
  document.addEventListener('focusout', (event) => {
    const input = event.target;
    if (page !== 'needs' || !input.classList.contains('count-input') || !input.dataset.field || state.submission) return;
    const count = D.parseCount(input.value);
    if (count === null) return;
    const section = state.sections[currentSection];
    const record = input.closest('[data-row]') ? section.rows.find((row) => row.id === input.closest('[data-row]').dataset.row) : input.closest('[data-extra]') ? section.extras.find((row) => row.id === input.closest('[data-extra]').dataset.extra) : section.items.find((row) => row.id === input.closest('[data-item]').dataset.item);
    const key = input.dataset.field === 'extra' ? 'value' : input.dataset.field;
    if (record[key] !== String(count)) {
      input.value = String(count);
      updateField(input);
    }
    input.value = fa(count);
  });
  document.addEventListener("submit", (event) => {
    if (event.target.id === "needs-form") { event.preventDefault(); saveAndContinue(); }
    if (event.target.id === "profile-form") saveProfile(event);
  });
  window.addEventListener("portal-flush", flushPending);
  window.addEventListener("pagehide", flushPending);
  window.addEventListener("beforeunload", flushPending);

  window.addEventListener('storage', event => {
    if (event.key !== P.KEY) return;
    const next = P.own();
    if (!next || next.revision === record.revision) return;
    if (dirty) { toast('پرونده در صفحه دیگری تغییر کرده است. پیش از ادامه، تغییرهای خود را بررسی و صفحه را تازه کنید.', true); return; }
    record = next; Object.assign(state, next.state); renderShell(); renderOverlays(); renderPage();
  });
  renderShell();
  renderOverlays();
  renderPage();
  P.applyCopy(document.getElementById("overlays"));
})();
