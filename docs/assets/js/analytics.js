/* Admin-only dashboard. Every visual is derived from the selected analytical facts. */
(function () {
  'use strict';
  if (!window.PortalAllowed || window.PortalAuth.user()?.role !== 'admin' || document.body.dataset.page !== 'analytics') return;
  const D = window.PortalData, P = window.Portal, UI = window.PortalUI, M = window.PortalAnalytics;
  const root = document.getElementById('page-content'), e = D.escape;
  const colors = { valid: '#008795', missing: '#cbd5e1', unknown: '#c68a20', invalid: '#cc5261', approved: '#008795', submitted: '#467cb3', resubmitted: '#7b68aa', changes_requested: '#c68a20', draft: '#94a3b8' };
  const qualityLabels = { valid: 'مقدار معتبر', missing: 'ثبت‌نشده', unknown: 'نامشخص / علامت *', invalid: 'مقدار نامعتبر' };
  const params = new URLSearchParams(location.search);
  const state = { mode: ['source', 'records', 'powerbi'].includes(params.get('mode')) ? params.get('mode') : 'source',
    county: D.counties.includes(params.get('county')) ? params.get('county') : '',
    domain: D.definitions.some(d => d.id === params.get('domain')) ? params.get('domain') : '',
    metric: params.get('metric') || '', basis: params.get('basis') === 'latest' ? 'latest' : 'submitted',
    type: D.profileChoices.type.includes(params.get('type')) ? params.get('type') : '',
    status: Object.hasOwn(P.labels, params.get('status') || '') ? params.get('status') : '',
    period: /^\d{4}$/.test(params.get('period') || '') ? params.get('period') : '',
    days: ['7', '30'].includes(params.get('days')) ? params.get('days') : '' };
  let refreshedAt = new Date(), selected, full;
  function number(value) { return value === null || value === undefined ? '—' : new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(value); }
  function percent(value) { return value === null ? '—' : number(value) + '٪'; }
  function domainTitle(domain) { return P.text('domain.' + domain.id, domain.title); }
  function rowTitle(domain, row) { return P.text('indicator.' + domain.id + '.' + row.id, row.title); }
  function icon(name) {
    const paths = { download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>', refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>', filter: '<path d="M3 4h18l-7 8v7l-4 2v-9Z"/>', print: '<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6ZM17 11h.01"/>', spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>', check: '<path d="m5 12 4 4L19 6"/>', warning: '<path d="m12 3 10 18H2ZM12 9v5m0 3h.01"/>' };
    return paths[name] ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + paths[name] + '</svg>' : UI.icon(name);
  }
  function field(id, label, options, value) {
    return '<div class="bi-filter"><label for="' + id + '">' + e(label) + '</label><select class="field" id="' + id + '" data-bi-filter="' + id.replace('bi-', '') + '">' + options.map(o => '<option value="' + e(o.value) + '"' + (o.value === value ? ' selected' : '') + '>' + e(o.label) + '</option>').join('') + '</select></div>';
  }
  function options(values, label) { return [{ value: '', label }, ...values.map(value => ({ value, label: value }))]; }
  function prepare() {
    full = state.mode === 'records' ? M.submissions(P.list(), state.basis) : M.workbook(window.PortalCountyData);
    selected = M.filter(full, { county: state.county, domain: state.domain,
      type: state.mode === 'records' ? state.type : '', status: state.mode === 'records' ? state.status : '',
      period: state.mode === 'records' ? state.period : '', days: state.mode === 'records' ? state.days : '' });
    const eligible = D.definitions.filter(d => !state.domain || d.id === state.domain);
    if (!eligible.some(d => d.rows.some(r => M.key(d.id, r.id) === state.metric))) {
      const domain = eligible.find(d => d.id === 'students') || eligible[0];
      const row = domain.rows.find(r => r.kind === 'count' && M.isNeed(r)) || domain.rows[0];
      state.metric = M.key(domain.id, row.id);
    }
  }
  function syncURL() {
    const query = new URLSearchParams();
    for (const name of ['mode', 'county', 'domain', 'metric', 'basis', 'type', 'status', 'period', 'days']) if (state[name]) query.set(name, state[name]);
    history.replaceState(null, '', './analytics.html?' + query.toString());
  }
  function hero() {
    return '<section class="bi-hero"><div><span class="bi-eyebrow">' + icon('chart') + ' مرکز تحلیل و تصمیم‌گیری</span><h1>تحلیل نیازهای آموزشی</h1><p>وضعیت اطلاعات و نیازها را ببینید، شهرستان‌ها را مقایسه کنید و به جزئیات برسید.</p><div class="bi-hero-meta"><span class="bi-live-dot"></span>خراسان شمالی<span>·</span>' + number(D.definitions.length) + ' حوزه<span>·</span>' + number(D.indicatorCount) + ' شاخص</div></div><div class="bi-hero-actions"><span class="bi-version">BI / نمای مدیریتی</span><div><button class="button" data-bi-action="refresh" id="bi-refresh">' + icon('refresh') + 'بازمحاسبه</button><button class="button" data-bi-action="print">' + icon('print') + 'چاپ / PDF</button><button class="button bi-export" data-bi-action="export">' + icon('download') + 'خروجی داده</button></div></div></section>';
  }
  function modes() {
    return '<div class="bi-modes" role="tablist" aria-label="نوع گزارش">' + [['source', 'تحلیل جداول شهرستان‌ها', 'chart'], ['records', 'تحلیل پرونده‌های سامانه', 'file'], ['powerbi', 'گزارش Power BI', 'spark']].map(([mode, label, image]) => '<button type="button" role="tab" id="bi-mode-' + mode + '" aria-selected="' + (state.mode === mode) + '" aria-controls="bi-report" tabindex="' + (state.mode === mode ? 0 : -1) + '" class="' + (state.mode === mode ? 'is-active' : '') + '" data-bi-action="mode" data-mode="' + mode + '">' + icon(image) + e(label) + '</button>').join('') + '</div>';
  }
  function filters() {
    let html = field('bi-county', 'شهرستان', options(D.counties, 'همه شهرستان‌ها'), state.county) +
      field('bi-domain', 'حوزه نیازسنجی', [{ value: '', label: 'همه حوزه‌ها' }, ...D.definitions.map(d => ({ value: d.id, label: domainTitle(d) }))], state.domain);
    if (state.mode === 'records') {
      html += field('bi-type', 'نوع مرکز', options(D.profileChoices.type, 'همه مراکز'), state.type) +
        field('bi-period', 'دوره نیازسنجی', options([...new Set([...full.entities.map(e => e.period), ...(state.period ? [state.period] : [])])], 'همه دوره‌ها'), state.period) +
        field('bi-status', 'وضعیت پرونده', [{ value: '', label: 'همه وضعیت‌ها' }, ...Object.entries(P.labels).map(([value, label]) => ({ value, label }))], state.status) +
        field('bi-days', state.basis === 'latest' ? 'زمان آخرین فعالیت' : 'زمان آخرین ارسال', [{ value: '', label: 'همه تاریخ‌ها' }, { value: '30', label: '۳۰ روز گذشته' }, { value: '7', label: '۷ روز گذشته' }], state.days);
    }
    return '<section class="panel bi-filter-panel" aria-label="فیلترهای گزارش"><div class="bi-filter-title">' + icon('filter') + '<strong>محدوده تحلیل</strong><button class="text-button" data-bi-action="reset" id="bi-reset">پاک کردن فیلترها</button></div><div class="bi-filters ' + (state.mode === 'records' ? 'bi-filters-records' : '') + '">' + html + '</div>' + (state.mode === 'records' ? '<div class="bi-basis">' + field('bi-basis', 'مبنای اطلاعات فرم', [{ value: 'submitted', label: 'آخرین نسخه ارسال‌شده؛ پیش‌نویس‌ها کنار گذاشته می‌شوند' }, { value: 'latest', label: 'آخرین فرم ذخیره‌شده؛ شامل پیش‌نویس و اصلاحات' }], state.basis) + '<span>داده‌های نمونه و تغییرات همین مرورگر</span></div>' : '') + '</section>';
  }
  function card(value, title, note, image, tone) {
    return '<article class="panel bi-kpi ' + (tone || '') + '"><div class="bi-kpi-top"><span>' + e(title) + '</span><span class="bi-kpi-icon">' + icon(image) + '</span></div><strong class="bi-kpi-value">' + value + '</strong><small>' + e(note) + '</small></article>';
  }
  function kpis() {
    const s = M.summary(selected), q = s.quality;
    return '<section class="bi-kpis" aria-label="شاخص‌های کلیدی">' + (state.mode === 'source' ?
      card(number(s.counties), 'شهرستان دارای مقدار معتبر', 'از ' + number(selected.entities.length) + ' شهرستان در محدوده', 'building') +
      card(percent(q.percent), 'پوشش داده‌های جدول', number(q.valid) + ' مقدار معتبر از ' + number(q.total) + ' سلول', 'check', 'bi-kpi-accent') +
      card(number(s.needIndicators), 'شاخص نیاز با مقدار مثبت', 'تعداد شاخص‌ها؛ نیازهای مختلف با هم جمع نشده‌اند', 'chart') +
      card(number(q.missing + q.unknown + q.invalid), 'مقدار نیازمند پیگیری', 'ثبت‌نشده، نامشخص یا نامعتبر', 'warning', 'bi-kpi-warning') :
      card(number(s.entities), 'پرونده در محدوده تحلیل', number(new Set(selected.entities.map(e => e.county)).size) + ' شهرستان · مبنای انتخاب‌شده', 'file') +
      card(percent(s.approvalPercent), 'نرخ تأیید پرونده‌ها', number(s.approved) + ' پرونده تأییدشده از ' + number(s.entities), 'check', 'bi-kpi-accent') +
      card(percent(q.percent), 'پوشش مقادیر شاخص‌ها', number(q.valid) + ' مقدار معتبر از ' + number(q.total), 'chart') +
      card(number(state.domain && state.domain !== 'safety' ? null : s.safetyEntities), 'مرکز دارای نیاز ایمنی', state.domain && state.domain !== 'safety' ? 'حوزه ایمنی در فیلتر فعلی نیست' : 'نیاز مثبت ایمنی یا فقدان اعلام / اطفای حریق', 'warning', 'bi-kpi-warning')) + '</section>';
  }
  function panelHeader(title, description, tag) {
    return '<div class="bi-panel-header"><div><h2>' + e(title) + '</h2><p>' + e(description) + '</p></div>' + (tag ? '<span class="bi-tag">' + e(tag) + '</span>' : '') + '</div>';
  }
  function empty(title, note) { return '<div class="bi-empty">' + icon('chart') + '<strong>' + e(title) + '</strong><p>' + e(note || 'فیلترها را تغییر دهید یا اطلاعات این شاخص را تکمیل کنید.') + '</p></div>'; }
  function metricSelector() {
    return '<label class="bi-metric-label" for="bi-metric">شاخص موردنظر برای مقایسه</label><select id="bi-metric" class="field" data-bi-filter="metric">' + D.definitions.filter(d => !state.domain || d.id === state.domain).map(d => '<optgroup label="' + e(domainTitle(d)) + '">' + d.rows.map(r => '<option value="' + M.key(d.id, r.id) + '"' + (state.metric === M.key(d.id, r.id) ? ' selected' : '') + '>' + e(rowTitle(d, r)) + '</option>').join('') + '</optgroup>').join('') + '</select>';
  }
  function metricPanel() {
    const m = M.metric(selected, state.metric), [domainId, rowId] = state.metric.split(':');
    const domain = D.definitions.find(d => d.id === domainId), row = domain.rows.find(r => r.id === rowId);
    const maximum = Math.max(1, ...m.counties.map(c => c.value || 0));
    let chart;
    if (m.numeric) {
      chart = '<div class="bi-bars" aria-label="مقادیر شاخص به تفکیک شهرستان">' + m.counties.map(c => '<button class="bi-bar-row" data-bi-action="county" data-county="' + e(c.county) + '" aria-label="' + e(c.county + ': ' + (c.value === null ? 'داده ثبت نشده' : number(c.value)) + '؛ ' + number(c.quality.valid) + ' مقدار معتبر از ' + number(c.quality.total) + '؛ فیلتر این شهرستان') + '"><span class="bi-bar-name">' + e(c.county) + '</span><span class="bi-bar-track"><span class="bi-bar-fill" style="width:' + (c.value === null ? 0 : c.value / maximum * 100) + '%"></span>' + (c.value === null ? '<span class="bi-no-value">فاقد مقدار معتبر</span>' : '') + '</span><b>' + number(c.value) + (c.quality.valid && c.quality.valid < c.quality.total ? '<span title="جمع ناقص؛ بعضی مقادیر موجود نیستند">*</span>' : '') + '</b></button>').join('') + '</div>';
    } else {
      chart = m.distribution.length ? '<div class="bi-distribution">' + m.distribution.map(item => '<div><span>' + e(D.fa(item.label)) + '</span><b>' + number(item.value) + ' ' + (state.mode === 'source' ? 'شهرستان' : 'مرکز') + '</b></div>').join('') + '</div>' : empty('برای این شاخص مقدار معتبری ثبت نشده');
    }
    const audit = !state.county && selected.audits.find(a => a.domainId === domainId && a.rowId === rowId);
    return '<section class="panel bi-panel bi-main-chart">' + panelHeader('مقایسه شهرستان‌ها', 'روی نام یا میله هر شهرستان کلیک کنید تا گزارش فیلتر شود.', m.numeric ? 'یک شاخص، یک واحد' : 'توزیع پاسخ‌ها') + '<div class="bi-metric-controls">' + metricSelector() + '</div><div class="bi-metric-summary"><div><span>' + e(rowTitle(domain, row)) + '</span><strong>' + (m.numeric ? number(m.sum) : number(m.quality.valid)) + '<small>' + (m.numeric ? 'جمع مقادیر معتبر' : 'پاسخ معتبر') + '</small></strong></div><span class="bi-tag">' + number(m.quality.valid) + ' از ' + number(m.quality.total) + ' ' + (state.mode === 'source' ? 'شهرستان' : 'مرکز') + ' دارای داده</span></div>' + chart + '<p class="bi-chart-note">' + (m.numeric ? 'عدد صفر یعنی مقدار صفر ثبت شده؛ خط تیره یعنی مقدار معتبر موجود نیست. علامت * کنار جمع یعنی بخشی از داده‌ها ناقص است.' : 'مقادیر متنی، وجود/عدم وجود و سال، جمع عددی نمی‌شوند.') + '</p>' + (audit ? '<div class="bi-inline-warning">' + icon('warning') + '<span>جمع فایل: ' + number(audit.reported) + '؛ جمع مقادیر موجود: ' + number(audit.calculated) + (audit.partial ? '؛ برخی شهرستان‌ها داده ندارند.' : '؛ این مغایرت باید بررسی شود.') + '</span></div>' : '') + '</section>';
  }
  function donut(items, label, center, note) {
    const total = items.reduce((n, item) => n + item.value, 0);
    let current = 0;
    const gradient = total ? items.filter(item => item.value).map(item => { const start = current; current += item.value / total * 100; return item.color + ' ' + start + '% ' + current + '%'; }).join(',') : 'var(--border) 0% 100%';
    return '<div class="bi-donut" role="img" aria-label="' + e(label + '؛ ' + items.map(i => i.label + ': ' + number(i.value)).join('، ')) + '" style="background:conic-gradient(' + gradient + ')"><div><strong>' + center + '</strong><span>' + e(note) + '</span></div></div><ul class="bi-legend">' + items.map(item => '<li><span><i style="background:' + item.color + '"></i>' + e(item.label) + '</span><b>' + number(item.value) + '<small>' + (total ? percent(Math.round(item.value / total * 100)) : '—') + '</small></b></li>').join('') + '</ul>';
  }
  function qualityPanel() {
    const q = M.quality(selected.facts);
    return '<section class="panel bi-panel">' + panelHeader('کیفیت و پوشش اطلاعات', 'میزان قابل اتکا بودن نمای فعلی', 'کل محدوده') + donut(Object.keys(qualityLabels).map(status => ({ label: qualityLabels[status], value: q[status], color: colors[status] })), 'کیفیت داده', percent(q.percent), 'مقدار معتبر') + '<div class="bi-info-note">' + icon('info') + '<p>سلول خالی و مقدار نامشخص وارد جمع نمی‌شوند. کامل بودن داده به معنی تأیید صحت آن نیست.</p></div></section>';
  }
  function needsPanel() {
    const ds = M.domains(selected), unit = state.mode === 'source' ? 'شهرستان' : 'مرکز';
    const maximum = Math.max(1, selected.entities.length);
    return '<section class="panel bi-panel">' + panelHeader(unit + '‌های دارای نیاز در هر حوزه', 'هر ' + unit + ' در هر حوزه حداکثر یک بار شمرده می‌شود.', 'تعداد ' + unit) + '<div class="bi-domain-bars">' + ds.map(d => '<button data-bi-action="domain" data-domain="' + d.id + '" class="bi-domain-row"><span>' + e(domainTitle(d)) + '<small>پوشش داده ' + percent(d.quality.percent) + '</small></span><div><span style="width:' + d.needEntities / maximum * 100 + '%"></span></div><b>' + number(d.needEntities) + '</b></button>').join('') + '</div><p class="bi-chart-note">نیاز مثبت در یکی از شاخص‌های موردنیاز، نیازمند یا فاقد. این نمودار شدت نیاز یا رتبه اولویت بودجه نیست.</p></section>';
  }
  function pairsPanel() {
    const pairs = M.pairs(selected).filter(pair => pair.existing.quality.valid || pair.needed.quality.valid).slice(0, 6);
    return '<section class="panel bi-panel">' + panelHeader('امکانات موجود و نیاز اعلام‌شده', 'مقایسه جداگانه شاخص‌های هم‌نوع؛ هر ردیف واحد خودش را دارد.', 'حداکثر ۶ ردیف') + '<div class="bi-pair-legend"><span><i></i>موجود</span><span><i></i>نیاز اعلام‌شده</span></div>' + (pairs.length ? '<div class="bi-pairs">' + pairs.map(pair => {
      const max = Math.max(1, pair.existing.sum || 0, pair.needed.sum || 0);
      return '<div class="bi-pair"><strong>' + e(pair.title) + '</strong>' + [['existing', pair.existing], ['needed', pair.needed]].map(([kind, m]) => '<div><span class="bi-pair-track"><i class="' + kind + '" style="width:' + (m.sum || 0) / max * 100 + '%"></i></span><b>' + number(m.sum) + (m.quality.valid && m.quality.valid < m.quality.total ? '*' : '') + '</b></div>').join('') + '</div>';
    }).join('') + '</div>' : empty('جفت موجود / نیاز دارای داده نداریم', 'در این محدوده، شاخص جفت تعریف نشده یا هیچ مقدار معتبری برای آن ثبت نشده است.')) + '<p class="bi-chart-note">«موردنیاز» نیاز اعلام‌شده است؛ کمبود از تفریق «موجود» به دست نیامده. خط تیره مقدار ثبت‌نشده را نشان می‌دهد.</p></section>';
  }
  function heatmap() {
    const ds = M.domains(selected), rows = M.matrix(selected);
    return '<section class="panel bi-panel bi-wide">' + panelHeader('ماتریس پوشش شهرستان‌ها و حوزه‌ها', 'هر خانه درصد مقادیر معتبر است. با انتخاب آن، شهرستان و حوزه هم‌زمان فیلتر می‌شوند.', 'پوشش داده، نه حجم نیاز') + '<div class="bi-table-scroll"><table class="bi-matrix"><caption class="sr-only">درصد پوشش شاخص‌ها در هر شهرستان و حوزه</caption><thead><tr><th scope="col">شهرستان</th>' + ds.map(d => '<th scope="col">' + e(domainTitle(d)) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr><th scope="row">' + e(row.county) + '</th>' + ds.map(d => {
      const q = row.domains.find(domain => domain.id === d.id)?.quality, p = q?.percent ?? null;
      return '<td><button class="bi-heat-cell heat-' + (p === null || p === 0 ? 'empty' : p < 35 ? 'low' : p < 75 ? 'mid' : 'high') + '" data-bi-action="cell" data-county="' + e(row.county) + '" data-domain="' + d.id + '" aria-label="' + e(row.county + '، ' + domainTitle(d) + '، پوشش ' + percent(p) + '، ' + number(q?.valid) + ' از ' + number(q?.total) + ' مقدار؛ فیلتر این خانه') + '">' + percent(p) + '</button></td>';
    }).join('') + '</tr>').join('') + '</tbody></table></div><div class="bi-heat-legend"><span>پوشش داده</span><i class="heat-empty"></i><span>صفر</span><i class="heat-low"></i><span>کمتر از ۳۵٪</span><i class="heat-mid"></i><span>۳۵ تا ۷۴٪</span><i class="heat-high"></i><span>۷۵ تا ۱۰۰٪</span></div></section>';
  }
  function workflowPanels() {
    const items = Object.entries(P.labels).map(([status, label]) => ({ label, value: selected.entities.filter(entity => entity.status === status).length, color: colors[status] }));
    const days = M.timeline(selected), max = Math.max(1, ...days.map(d => d.value));
    return '<section class="panel bi-panel">' + panelHeader('گردش بررسی پرونده‌ها', 'وضعیت جاری پرونده‌ها در محدوده انتخاب‌شده') + donut(items, 'وضعیت پرونده‌ها', number(selected.entities.length), 'پرونده') + '</section><section class="panel bi-panel">' + panelHeader('آخرین ارسال مراکز در ۱۴ روز اخیر', 'هر پرونده در روز آخرین ارسال خود، یک بار شمرده می‌شود.', 'تاریخ واقعی رکورد') + '<div class="bi-timeline" aria-label="تعداد آخرین ارسال پرونده‌ها در ۱۴ روز اخیر">' + days.map(day => '<div title="' + e(new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(day.at)) + ': ' + number(day.value) + ' پرونده') + '"><b>' + number(day.value) + '</b><span><i style="height:' + day.value / max * 100 + '%"></i></span><small>' + e(new Intl.DateTimeFormat('fa-IR', { day: 'numeric', timeZone: 'UTC' }).format(new Date(day.at))) + '</small></div>').join('') + '</div><p class="bi-chart-note">این روند، تعداد کل دفعات ارسال یا تاریخچه تغییر نیازها نیست. پرونده بدون تاریخ ارسال معتبر شمرده نمی‌شود.</p></section>';
  }
  function insights() {
    const q = M.quality(selected.facts), audits = selected.audits;
    return '<section class="bi-insights" aria-label="نکات قابل پیگیری"><article><span>' + icon('info') + '</span><div><h3>' + (q.percent === 100 ? 'همه مقادیر جدول ثبت شده‌اند' : 'تکمیل اطلاعات پیش از تصمیم نهایی') + '</h3><p>' + number(q.missing) + ' مقدار ثبت‌نشده و ' + number(q.unknown) + ' مقدار نامشخص در این محدوده وجود دارد.</p></div></article><article><span>' + icon('warning') + '</span><div><h3>' + (state.mode === 'source' ? number(audits.length) + ' جمع منبع نیازمند بازبینی' : 'مبنای ارسال و تأیید را جدا ببینید') + '</h3><p>' + (state.mode === 'source' ? 'جمع ستون منبع با مقادیر موجود شهرستان‌ها تطبیق داده شد. بازبینی جمع، مربوط به کل فایل است.' : 'فیلتر «تأیید شده» فقط پرونده‌های نهایی را نشان می‌دهد؛ پیش‌نویس از مبنای ارسال حذف است.') + '</p></div></article><article><span>' + icon('spark') + '</span><div><h3>نیازهای هم‌پوشان، افراد متفاوت نیستند</h3><p>یک دانش‌آموز می‌تواند چند نیاز داشته باشد. جمع چند گروه حمایتی، تعداد افراد یکتا را نشان نمی‌دهد.</p></div></article></section>';
  }
  function detailsTable() {
    const m = M.metric(selected, state.metric), entityMap = new Map(selected.entities.map(e => [e.id, e]));
    const [domainId, rowId] = state.metric.split(':'), domain = D.definitions.find(d => d.id === domainId), row = domain.rows.find(r => r.id === rowId);
    const rows = m.facts.map(f => {
      const entity = entityMap.get(f.entityId);
      return '<tr><th scope="row">' + e(entity.name) + (entity.code ? '<small>کد ' + e(D.fa(entity.code)) + '</small>' : '') + '</th>' + (state.mode === 'records' ? '<td>' + e(entity.county) + '</td>' : '') + '<td class="bi-value-cell">' + (f.status === 'valid' ? e(f.kind === 'count' ? number(f.value) : D.fa(f.value)) : '—') + '</td><td><span class="bi-data-status data-' + f.status + '">' + e(qualityLabels[f.status]) + '</span></td><td><a class="text-button" href="' + (state.mode === 'source' ? './tables.html?section=' + domainId : './case.html?id=' + encodeURIComponent(entity.id)) + '">' + (state.mode === 'source' ? 'جدول منبع' : 'پرونده مرکز') + icon('chevron') + '</a></td></tr>';
    }).join('');
    return '<section class="panel bi-panel bi-wide">' + panelHeader('جزئیات شاخص انتخاب‌شده', rowTitle(domain, row), number(m.facts.length) + ' ردیف') + '<div class="bi-table-scroll"><table class="bi-detail-table"><caption class="sr-only">' + e(rowTitle(domain, row)) + '</caption><thead><tr><th scope="col">' + (state.mode === 'source' ? 'شهرستان' : 'مرکز / کد') + '</th>' + (state.mode === 'records' ? '<th scope="col">شهرستان</th>' : '') + '<th scope="col">مقدار معتبر</th><th scope="col">وضعیت داده</th><th scope="col">مشاهده</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }
  function methodology() {
    return '<details class="panel bi-method"><summary>' + icon('info') + 'روش محاسبه و خواندن گزارش' + icon('chevron') + '</summary><div><p><strong>پوشش اطلاعات:</strong> تعداد مقادیر معتبر تقسیم بر تعداد سلول‌های شاخص‌های جدول در محدوده انتخاب‌شده. «نامشخص»، «*»، خالی و مقدار نامعتبر در صورت کسر نیستند. صفر ثبت‌شده معتبر است.</p><p><strong>مبنای پرونده:</strong> پیش‌فرض آخرین نسخه ارسال‌شده است. در حالت «آخرین فرم ذخیره‌شده»، اصلاحات و پیش‌نویس هم وارد تحلیل می‌شوند. فیلتر تأییدشده، تحلیل پرونده‌های نهایی را جدا می‌کند.</p><p><strong>واحد شاخص:</strong> فقط مقادیر یک شاخص عددی با هم جمع می‌شوند. ظرفیت، تعداد مدرسه، تعداد تجهیز و تعداد دانش‌آموز با هم جمع نمی‌شوند؛ سال و متن هم مقدار عددی تجمیعی نیستند.</p><p><strong>حدود تحلیل:</strong> نمودارها بر ۲۵۰ شاخص جدول استوارند. جزئیات اقلام تجهیزات جدا از این شاخص‌هاست. داده بودجه و هزینه و تاریخچه مقادیر شهرستان‌ها در فایل منبع وجود ندارد؛ برای آن‌ها عدد یا روندی ساخته نشده است.</p></div></details>';
  }
  function powerBI() {
    const raw = window.PortalAnalyticsConfig?.secureEmbedUrl, url = M.secureEmbedURL(raw);
    if (url) return '<section class="panel bi-panel bi-wide bi-powerbi">' + panelHeader('گزارش متصل Power BI', 'برای مشاهده گزارش، با حساب Microsoft دارای دسترسی وارد شوید.', 'گزارش مستقل') + '<p class="bi-chart-note">فیلترها و به‌روزرسانی داده این گزارش در Power BI انجام می‌شود. تغییر فرم‌های دمو، خودکار وارد این گزارش نمی‌شود.</p><iframe title="گزارش Power BI نیازهای آموزشی" src="' + e(url) + '" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></section>';
    return '<section class="panel bi-powerbi-empty"><span class="bi-pbi-mark">' + icon('chart') + '</span><span class="bi-tag">Microsoft Power BI</span><h2>' + (raw ? 'نشانی اتصال معتبر نیست' : 'گزارش Power BI هنوز متصل نشده') + '</h2><p>' + (raw ? 'نشانی گزارش باید لینک امن Website or portal از Power BI باشد.' : 'داشبورد تحلیلی سامانه آماده استفاده است. بعد از انتشار و اتصال گزارش Power BI، گزارش در همین صفحه نمایش داده می‌شود.') + '</p><div><button class="button button-primary" data-bi-action="mode" data-mode="source">مشاهده تحلیل جداول</button><button class="button button-secondary" data-bi-action="export">' + icon('download') + 'دریافت داده برای Power BI</button></div><small>گزارش متصل، دسترسی و فیلترهای مستقل خودش را دارد.</small></section>';
  }
  function render(focusId) {
    prepare(); syncURL(); UI.shell('analytics', null);
    const noEntities = !selected.entities.length;
    const description = state.mode === 'source' ? 'منبع: مقادیر اصلی فایل «جمع آوری داده ها 2.xlsx»؛ سلول خالی تکمیل نشده است.' : 'منبع: پرونده‌های نمونه و اطلاعات ذخیره‌شده سامانه در همین مرورگر؛ ' + (state.basis === 'latest' ? 'آخرین فرم ذخیره‌شده.' : 'آخرین نسخه ارسال‌شده.');
    root.innerHTML = '<div class="bi-dashboard">' + hero() + modes() + '<div id="bi-report" role="tabpanel" aria-labelledby="bi-mode-' + state.mode + '">' + (state.mode === 'powerbi' ? powerBI() : !selected.available ? '<section class="panel">' + empty('داده فایل منبع بارگذاری نشد', 'صفحه را تازه کنید تا فایل اطلاعات شهرستان‌ها دوباره بارگذاری شود.') + '</section>' : filters() + '<div class="bi-source-caption"><span>' + icon('info') + e(description) + '</span><time>' + new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(refreshedAt) + ' · بازمحاسبه نما</time></div><div id="bi-announcement" class="sr-only" role="status" aria-live="polite">' + number(selected.entities.length) + ' ' + (state.mode === 'source' ? 'شهرستان' : 'پرونده') + ' در محدوده تحلیل</div>' + kpis() + (noEntities ? '<section class="panel">' + empty('پرونده‌ای در این محدوده نیست', 'فیلترها را پاک کنید یا مبنای فرم و وضعیت پرونده را تغییر دهید.') + '</section>' : '<div class="bi-chart-grid">' + metricPanel() + qualityPanel() + needsPanel() + pairsPanel() + (state.mode === 'records' ? workflowPanels() : '') + heatmap() + detailsTable() + '</div>' + insights()) + methodology()) + '</div>' + UI.footer() + '</div>';
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }
  function download() {
    const model = state.mode === 'powerbi' ? M.workbook(window.PortalCountyData) : selected;
    if (!model.facts.length) { UI.toast('در این محدوده داده‌ای برای خروجی وجود ندارد.', true); return; }
    const blob = new Blob([M.exportFacts(model)], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'education-needs-' + model.mode + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    UI.toast('خروجی CSV برای محدوده انتخاب‌شده آماده شد. مقدار نامشخص در خروجی عددی خالی است.');
  }
  document.addEventListener('change', event => {
    const filter = event.target.dataset.biFilter;
    if (!filter || !Object.hasOwn(state, filter)) return;
    state[filter] = event.target.value; render(event.target.id);
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-bi-action]'); if (!button) return;
    const action = button.dataset.biAction;
    if (action === 'export') { download(); return; }
    if (action === 'print') { window.print(); return; }
    if (action === 'mode') { state.mode = button.dataset.mode; render('bi-mode-' + state.mode); return; }
    if (action === 'refresh') { refreshedAt = new Date(); render('bi-refresh'); UI.toast('گزارش از داده‌های فعلی دوباره محاسبه شد.'); return; }
    if (action === 'reset') { for (const name of ['county', 'domain', 'type', 'status', 'period', 'days', 'metric']) state[name] = ''; render('bi-reset'); return; }
    if (action === 'county') { state.county = state.county === button.dataset.county ? '' : button.dataset.county; render('bi-county'); return; }
    if (action === 'domain') { state.domain = state.domain === button.dataset.domain ? '' : button.dataset.domain; render('bi-domain'); return; }
    if (action === 'cell') { state.county = button.dataset.county; state.domain = button.dataset.domain; render('bi-county'); }
  });
  document.addEventListener('keydown', event => {
    if (!event.target.matches('[role="tab"][data-bi-action="mode"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); const modes = ['source', 'records', 'powerbi'], index = modes.indexOf(state.mode);
    state.mode = event.key === 'Home' ? modes[0] : event.key === 'End' ? modes[2] : modes[(index + (event.key === 'ArrowLeft' ? 1 : 2)) % 3];
    render('bi-mode-' + state.mode);
  });
  window.addEventListener('storage', event => { if ([P.KEY, P.COPYKEY].includes(event.key) || event.key === null) { refreshedAt = new Date(); render(); } });
  render();
})();
