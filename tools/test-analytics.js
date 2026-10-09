/* Business-logic and rendered-markup checks; no browser or DOM package required. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const rootPath = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(rootPath, 'dist/assets/js', name + '.js'), 'utf8');
function storage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) };
}
function harness(options = {}) {
  const events = {}, windowEvents = {}, elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { id, innerHTML: '', hidden: true, dataset: {}, className: '',
      focus() {}, querySelectorAll() { return []; }, contains() { return false; }, setAttribute() {} });
    return elements.get(id);
  }
  const localStorage = storage(), sessionStorage = storage();
  if (options.role !== null) sessionStorage.setItem('education-needs-portal:session:v4', JSON.stringify({ username: options.role === 'expert' ? 'expert' : 'admin', expires: Date.now() + 3600000 }));
  const c = { URL, URLSearchParams, Blob, crypto: crypto.webcrypto, localStorage, sessionStorage, NodeFilter: { SHOW_TEXT: 4 },
    location: { pathname: '/docs/' + (options.page || 'analytics.html'), search: options.query || '', replace(url) { c.redirect = url; } },
    history: { replaceState(a, b, url) { c.lastURL = url; } },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setTimeout() { return 1; }, clearTimeout() {},
    addEventListener(type, callback) { (windowEvents[type] ||= []).push(callback); },
    document: { documentElement: { dataset: {} }, body: { dataset: { page: 'analytics' }, classList: { toggle() {} }, style: {} },
      addEventListener(type, callback) { (events[type] ||= []).push(callback); },
      getElementById: element, querySelector() { return null; }, querySelectorAll() { return []; },
      createTreeWalker() { return { nextNode() { return false; } }; } }
  };
  c.window = c;
  vm.createContext(c);
  for (const name of ['boot', 'source', 'county-data', 'data', 'portal', 'common', 'analytics-config', 'analytics-model']) vm.runInContext(read(name), c, { filename: name + '.js' });
  c.PortalAnalyticsConfig = { secureEmbedUrl: options.embed || '' };
  vm.runInContext(read('analytics'), c, { filename: 'analytics.js' });
  function action(dataset) {
    const target = { dataset, closest(selector) { return selector === '[data-bi-action]' ? this : null; } };
    for (const callback of events.click || []) callback({ target });
  }
  function change(name, value) {
    const target = { id: 'bi-' + name, value, dataset: { biFilter: name } };
    for (const callback of events.change || []) callback({ target });
  }
  return { c, M: c.PortalAnalytics, D: c.PortalData, html: () => element('page-content').innerHTML,
    shell: () => element('shell').innerHTML, action, change, events, windowEvents };
}

test('workbook uses the original cells; missing counties are not zero or demo values', () => {
  const { c, M } = harness();
  const model = M.workbook(c.PortalCountyData), metric = M.metric(model, 'students:r2');
  assert.equal(model.facts.length, 2500);
  assert.equal(metric.sum, 12405);
  assert.equal(metric.quality.valid, 7);
  assert.equal(metric.quality.missing, 3);
  assert.equal(metric.counties.find(c => c.county === 'اسفراین').value, null);
  assert.equal(metric.counties.find(c => c.county === 'شیروان').value, 6650);
  assert.equal(M.quality(model.facts).valid, 331);
  assert.equal(M.quality(model.facts).unknown, 23);
  assert.equal(M.metric(model, 'equipment:r2').sum, null);
});

test('zero, Persian digits, unknown, formula cache and invalid counts remain distinct', () => {
  const { M } = harness();
  assert.equal(M.classify('۰', 'count').value, 0);
  assert.equal(M.classify('١٢', 'count').value, 12);
  assert.equal(M.classify('', 'count').status, 'missing');
  assert.equal(M.classify('*', 'count').status, 'unknown');
  assert.equal(M.classify('40', 'count', true).value, null);
  assert.equal(M.classify({ formula: '=SUM(C1:L1)', value: 75 }, 'count').value, 75);
  for (const value of ['2x', '-1', '1.5', '1000001', '<img src=x>']) assert.equal(M.classify(value, 'count').status, 'invalid');
});

test('source total discrepancy is reported as a partial sum, never silently corrected', () => {
  const { c, M } = harness();
  const audits = M.workbook(c.PortalCountyData).audits;
  assert.equal(audits.length, 1);
  assert.equal(audits[0].reported, 7068);
  assert.equal(audits[0].calculated, 7067);
  assert.equal(audits[0].partial, true);
});

test('default submission model excludes drafts and uses immutable sent snapshots', () => {
  const { c, M } = harness();
  const records = c.Portal.list();
  const sent = records.find(r => r.status === 'submitted');
  sent.state.sections.equipment.rows.find(r => r.id === 'r3').value = '900';
  const snapshotValue = Number(sent.snapshot.sections.equipment.rows.find(r => r.id === 'r3').value);
  const submitted = M.submissions(records, 'submitted'), latest = M.submissions(records, 'latest');
  assert.equal(submitted.entities.length, 6);
  assert.equal(latest.entities.length, 8);
  assert.equal(submitted.facts.find(f => f.entityId === sent.id && f.key === 'equipment:r3').value, snapshotValue);
  assert.equal(latest.facts.find(f => f.entityId === sent.id && f.key === 'equipment:r3').value, 900);
  assert.equal(M.filter(submitted, { status: 'approved' }).entities.length, 2);
});

test('a requested amount is not subtracted from existing stock', () => {
  const { c, M } = harness();
  const pair = M.pairs(M.submissions(c.Portal.list(), 'submitted')).find(p => p.domainId === 'equipment' && p.existingId === 'r2');
  assert.equal(pair.existing.sum, 720);
  assert.equal(pair.needed.sum, 108);
  assert.equal(pair.existingId, 'r2');
  assert.equal(pair.neededId, 'r3');
});

test('categorical and year values produce distributions, never numeric sums', () => {
  const { c, M } = harness();
  const model = M.workbook(c.PortalCountyData);
  for (const key of ['welfare:r35', 'welfare:r38', 'welfare:r23']) {
    const result = M.metric(model, key);
    assert.equal(result.numeric, false);
    assert.equal(result.sum, null);
  }
});

test('cross filtering recalculates denominator at county and domain grain', () => {
  const { c, M } = harness();
  const model = M.filter(M.workbook(c.PortalCountyData), { county: 'بجنورد', domain: 'students' });
  assert.equal(model.entities.length, 1);
  assert.equal(model.facts.length, 20);
  assert.equal(M.metric(model, 'students:r2').sum, 21);
  assert.equal(M.matrix(model).length, 1);
  assert.equal(M.matrix(model)[0].domains.length, 1);
  assert.equal(M.domains(model)[0].needEntities, 1);
});

test('empty record filters do not claim 0 percent coverage or divide by zero', () => {
  const { c, M } = harness();
  const model = M.filter(M.submissions(c.Portal.list(), 'submitted'), { county: 'گرمه' });
  assert.equal(model.facts.length, 0);
  assert.equal(M.summary(model).quality.percent, null);
  assert.equal(M.summary(model).approvalPercent, null);
});

test('timeline respects the Tehran day boundary and counts only the last submission', () => {
  const { M } = harness();
  const result = M.timeline({ entities: [{ sentAt: '2026-10-08T22:00:00Z' }, { sentAt: null }] }, Date.parse('2026-10-09T12:00:00Z'));
  assert.equal(result.at(-1).at, '2026-10-09');
  assert.equal(result.at(-1).value, 1);
  assert.equal(result.reduce((n, b) => n + b.value, 0), 1);
});

test('CSV is UTF-8, keeps blank numeric values and neutralizes spreadsheet formulas', () => {
  const { c, M } = harness();
  const model = M.filter(M.workbook(c.PortalCountyData), { county: 'اسفراین', domain: 'students' });
  const csv = M.exportFacts(model);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv.split('\r\n').length, 21);
  assert.ok(csv.includes('"count","missing","","","",1'));
  assert.ok(M.csv([['=HYPERLINK("bad")', '@SUM(A1)', 'normal']]).includes("'=HYPERLINK"));
});

test('secure Power BI accepts reportEmbed and rejects public, spoofed or token URLs', () => {
  const { M } = harness();
  const valid = 'https://app.powerbi.com/reportEmbed?reportId=aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb';
  assert.ok(M.secureEmbedURL(valid).includes('autoAuth=true'));
  for (const url of ['javascript:alert(1)', valid.replace('https:', 'http:'), valid.replace('app.powerbi.com', 'app.powerbi.com.evil.example'),
    valid + '&access_token=secret', 'https://app.powerbi.com/view?r=public', valid.replace('reportId=', 'reportId=bad')]) assert.equal(M.secureEmbedURL(url), null);
});

test('dashboard renders all nine domains, drilldown filters and empty state without exceptions', () => {
  const h = harness();
  assert.ok(h.html().includes('۱۲٬۴۰۵'));
  assert.ok(h.shell().includes('./analytics.html'));
  for (const domain of h.D.definitions) { h.change('domain', domain.id); assert.ok(h.html().includes('bi-matrix')); }
  h.action({ biAction: 'reset' });
  h.action({ biAction: 'cell', county: 'بجنورد', domain: 'students' });
  assert.ok(h.c.lastURL.includes('domain=students'));
  assert.ok(h.html().includes('۲۱'));
  h.action({ biAction: 'mode', mode: 'records' });
  h.change('county', 'گرمه');
  assert.ok(h.html().includes('پرونده‌ای در این محدوده نیست'));
  h.action({ biAction: 'reset' });
  assert.ok(h.html().includes('bi-timeline'));
  const ids = [...h.html().matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
});

test('public Power BI tab is honest when no report is connected; valid embed loads an iframe', () => {
  assert.ok(harness({ query: '?mode=powerbi' }).html().includes('گزارش Power BI هنوز متصل نشده'));
  assert.ok(!harness({ query: '?mode=powerbi' }).html().includes('<iframe'));
  assert.ok(harness({ query: '?mode=powerbi', embed: 'https://app.powerbi.com/reportEmbed?reportId=aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb' }).html().includes('<iframe'));
});

test('admin route is protected and experts or signed-out users cannot render analytics', () => {
  const expert = harness({ role: 'expert' }), signedOut = harness({ role: null });
  assert.equal(expert.c.PortalAllowed, false);
  assert.equal(expert.c.redirect, './index.html?notice=denied');
  assert.equal(signedOut.c.redirect, './login.html');
  assert.equal(expert.html(), '');
  assert.equal(signedOut.html(), '');
});

test('exact scope can be reopened by URL and unrecognized query input is not executed', () => {
  const h = harness({ query: '?mode=records&status=approved&type=مدرسه&domain=equipment&basis=submitted&period=1405&days=30' });
  assert.ok(h.c.lastURL.includes('status=approved'));
  assert.ok(h.c.lastURL.includes('days=30'));
  assert.ok(!harness({ query: '?county=%3Cscript%3Ealert(1)%3C/script%3E&metric=x' }).html().includes('<script>alert'));
});
