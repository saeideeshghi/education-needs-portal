/* Frontend demo only. Real identity, authorization and storage belong on a server. */
(function () {
  'use strict';
  if (!window.PortalAllowed) return;
  const D = window.PortalData, A = window.PortalAuth;
  const KEY = 'education-needs-portal:records:v4', COPYKEY = 'education-needs-portal:copy:v4';
  const clone = value => JSON.parse(JSON.stringify(value));
  const labels = { draft: 'پیش‌نویس', submitted: 'در انتظار بررسی مدیر', changes_requested: 'نیازمند اصلاح', resubmitted: 'ارسال مجدد', approved: 'تأیید شده' };
  const roleLabels = { expert: 'کارشناس ثبت اطلاعات', admin: 'مدیر سامانه' };
  const threadKinds = { request: 'درخواست', message: 'توضیحات', followup: 'پیگیری', correction: 'اصلاح فرم' };
  const threadStates = { open: 'باز', answered: 'پاسخ داده شده', closed: 'بسته شده' };
  const editableStatuses = ['draft', 'changes_requested'];
  let volatileBook = null;
  function now() { return new Date().toISOString(); }
  function id(prefix) { const n = new Uint32Array(2); crypto.getRandomValues(n); return prefix + '-' + Array.from(n, x => x.toString(16)).join('-'); }
  function event(record, text) { record.history.unshift({ id: id('event'), at: now(), actor: A.user()?.name || 'داده نمونه', text }); record.updatedAt = now(); }
  function message(role, body, at, actor) { return { id: id('message'), role, body, at: at || now(), actor: actor || roleLabels[role] }; }
  function makeThread(record, kind, title, body, role, options) {
    const at = options?.at || now();
    return {
      id: options?.id || id('thread'), tracking: 'REQ-DEMO-' + id('1405').slice(5).toUpperCase(),
      kind, title, section: options?.section || null, requestId: options?.requestId || null,
      relatedId: options?.relatedId || null, createdBy: role, status: 'open', at, updatedAt: at,
      messages: [message(role, body, at, options?.actor)], seen: { expert: role === 'expert' ? 1 : 0, admin: role === 'admin' ? 1 : 0 }
    };
  }
  function seedMessages(record) {
    if (record.id !== 'center-01') return;
    const at = new Date(Date.now() - 3600000).toISOString();
    const welcome = makeThread(record, 'message', 'راهنمای شروع ثبت اطلاعات', 'لطفاً اطلاعات مرکز را در حوزه‌های موجود کامل کنید. اگر ابهامی داشتید، از همین بخش درخواست یا توضیح بفرستید.', 'admin', {at});
    const request = makeThread(record, 'request', 'توضیح درباره تجهیزات موردنیاز', 'برای تجهیزات آزمایشگاه، تعداد تجهیز موجود و مقدار موردنیاز را در کدام بخش ثبت کنم؟', 'expert', {at});
    request.messages.push(message('admin', 'در حوزه تجهیزات، گروه مربوط را انتخاب کنید. مقدار موجود و موردنیاز شاخص‌های جدا هستند؛ شرح تجهیزات را هم در جزئیات ثبت کنید.', at));
    request.status = 'answered'; request.seen = { expert: 1, admin: 2 };
    const followup = makeThread(record, 'followup', 'پیگیری بررسی اطلاعات مرکز', 'لطفاً وضعیت بررسی اطلاعات مرکز و موارد باقی‌مانده را اعلام کنید.', 'expert', {at,relatedId:request.id});
    record.threads.push(welcome, request, followup);
  }
  function correctionThreads(record) {
    record.requests.forEach(request => {
      if (record.threads.some(t => t.requestId === request.id)) return;
      const thread = makeThread(record, 'correction', 'اصلاح ' + (D.definitions.find(d => d.id === request.section)?.title || 'اطلاعات فرم'), request.message, 'admin', {at:request.at, requestId:request.id, section:request.section, actor:'مدیر سامانه'});
      if (request.reply) {
        thread.messages.push(message('expert', request.reply, request.replyAt || request.at, 'کارشناس ثبت اطلاعات'));
        thread.seen = { expert: 2, admin: 1 }; thread.status = 'answered';
      }
      if (request.status === 'resolved') thread.status = 'closed';
      record.threads.push(thread);
    });
  }
  function normalizeBook(book, migrated) {
    book.version = 4;
    book.records.forEach(record => {
      record.owner = record.id === 'center-01' ? 'expert' : null;
      record.state = D.sanitize(record.state);
      if (record.snapshot) record.snapshot = D.sanitize(record.snapshot);
      if (record.status === 'forwarded') record.status = 'approved';
      record.requests = Array.isArray(record.requests) ? record.requests : [];
      record.requests.forEach(q => { q.actor = 'مدیر سامانه'; });
      record.threads = Array.isArray(record.threads) ? record.threads : [];
      record.history = Array.isArray(record.history) ? record.history : [];
      record.history.forEach(h => {
        if (/کارشناس شهرستان/.test(h.actor)) h.actor = 'مدیر سامانه';
        if (/مسئول/.test(h.actor)) h.actor = 'کارشناس ثبت اطلاعات';
      });
      if (migrated) {
        correctionThreads(record);
        if (record.id === 'center-01') seedMessages(record);
      }
    });
    return book;
  }
  function seedBook() {
    const centers = [
      ['center-01', 'دبیرستان نمونه', '123456', 'بجنورد', 'draft'],
      ['center-02', 'هنرستان امید', '223456', 'شیروان', 'draft'],
      ['center-03', 'دبستان مهر', '123457', 'بجنورد', 'submitted'],
      ['center-04', 'هنرستان دانش', '123458', 'بجنورد', 'changes_requested'],
      ['center-05', 'دبیرستان فرزانگان', '123459', 'بجنورد', 'approved'],
      ['center-06', 'دبستان فردا', '323456', 'اسفراین', 'approved'],
      ['center-07', 'دبیرستان آفتاب', '423456', 'فاروج', 'submitted'],
      ['center-08', 'دبستان فرهنگ', '123460', 'بجنورد', 'resubmitted']
    ];
    const records = centers.map((c, index) => {
      let state = index === 0 ? D.load().state : D.seed();
      const importedSubmission = state.submission;
      state.profile = { ...state.profile, name: c[1], code: c[2], county: c[3], type: c[1].includes('هنرستان') ? 'هنرستان' : 'مدرسه' };
      state.submission = null;
      const status = index === 0 && importedSubmission ? 'submitted' : c[4];
      if (status !== 'draft') Object.values(state.sections).forEach(s => { s.completed = true; });
      const tracking = importedSubmission?.tracking || 'DEMO-1405-' + String(10000001 + index);
      const at = new Date(Date.now() - (index + 1) * 86400000).toISOString();
      if (status !== 'draft' && status !== 'changes_requested') state.submission = { tracking, at };
      const record = { id:c[0], owner:index === 0 ? 'expert' : null, county:c[3], code:c[2], state, snapshot:status === 'draft' ? null : clone({...state, submission:{tracking,at}}), status, tracking:status === 'draft' ? null : tracking, requests:[], threads:[], history:[{id:'seed-'+index,at,actor:'داده نمونه',text:status === 'draft' ? 'پرونده نمونه برای تکمیل آماده شد.' : 'پرونده نمونه در گردش بررسی قرار گرفت.'}], updatedAt:at, revision:0 };
      if (status === 'changes_requested') record.requests.push({ id:'request-seed',section:'safety',message:'تعداد تجهیزات ایمنی موردنیاز و وضعیت اعلام حریق را بررسی و اصلاح کنید.',status:'open',at,actor:'مدیر سامانه',reply:'',replyAt:null });
      if (index === 7) record.requests.push({ id:'request-answered',section:'equipment',message:'تعداد نیمکت‌های موردنیاز بازبینی شود.',status:'answered',at,actor:'مدیر سامانه',reply:'تعداد نیمکت با آمار مرکز تطبیق داده و اصلاح شد.',replyAt:at });
      correctionThreads(record); seedMessages(record);
      return record;
    });
    return {version:4,revision:0,records};
  }
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const book = JSON.parse(raw); if (book.version === 4 && Array.isArray(book.records)) return book; }
      const previous = localStorage.getItem('education-needs-portal:records:v3');
      const old = previous ? JSON.parse(previous) : null;
      const book = old?.version === 3 && Array.isArray(old.records) ? normalizeBook(clone(old), true) : seedBook();
      localStorage.setItem(KEY, JSON.stringify(book)); return book;
    } catch (_) { if (!volatileBook) volatileBook = seedBook(); return clone(volatileBook); }
  }
  function visible(record) {
    const user = A.user();
    return !!user && (user.role === 'admin' || user.role === 'expert' && record.owner === user.username && record.id === user.caseId);
  }
  function list() { return read().records.filter(visible).map(clone); }
  function get(caseId) { const record = read().records.find(r => r.id === caseId); return record && visible(record) ? clone(record) : null; }
  function own() { return A.user()?.role === 'expert' ? get(A.user().caseId) : null; }
  function mutate(caseId, roles, change, expectedRevision, touchForm = true) {
    const user = A.user();
    if (!user || !roles.includes(user.role)) return {ok:false,message:'اجازه انجام این عملیات را ندارید.'};
    const book = read(), record = book.records.find(r => r.id === caseId);
    if (!record || !visible(record)) return {ok:false,message:'این پرونده در دسترس شما نیست.'};
    if (expectedRevision !== undefined && record.revision !== expectedRevision) return {ok:false,message:'پرونده در صفحه دیگری تغییر کرده است. صفحه را تازه کنید و دوباره بررسی کنید.'};
    const error = change(record);
    if (error) return {ok:false,message:error};
    if (touchForm) record.revision++;
    book.revision++;
    try {localStorage.setItem(KEY,JSON.stringify(book));return {ok:true,record:clone(record)};}
    catch (_) {return {ok:false,message:'ذخیره انجام نشد. ذخیره‌سازی مرورگر را بررسی کنید.'};}
  }
  function saveDraft(state, revision) {
    return mutate(A.user()?.caseId,['expert'],record => {
      if (!editableStatuses.includes(record.status)) return 'پرونده برای ویرایش قفل است.';
      const clean = D.sanitize(state);
      if (clean.profile.code !== record.code || clean.profile.county !== record.county) return 'کد مرکز و شهرستان قابل تغییر نیست.';
      clean.submission = null; record.state = clean; record.updatedAt = now();
    },revision);
  }
  function submit(state, revision) {
    return mutate(A.user()?.caseId,['expert'],record => {
      if (!editableStatuses.includes(record.status)) return 'این پرونده قبلاً ارسال شده است.';
      if (D.stats(state).percent !== 100) return 'ابتدا همه حوزه‌ها را تکمیل کنید.';
      if (record.requests.some(r => r.status === 'open')) return 'پیش از ارسال، به درخواست‌های اصلاح پاسخ بدهید.';
      const clean = D.sanitize(state);
      if (clean.profile.code !== record.code || clean.profile.county !== record.county) return 'مشخصات هویتی پرونده مغایرت دارد.';
      if (D.stats(clean).percent !== 100) return 'اطلاعات پرونده معتبر نیست.';
      const n = new Uint32Array(1); crypto.getRandomValues(n);
      record.tracking = record.tracking || 'DEMO-1405-'+String(10000000+n[0]%90000000);
      record.status = record.status === 'changes_requested' ? 'resubmitted' : 'submitted';
      clean.submission = {at:now(),tracking:record.tracking}; record.state = clean; record.snapshot = clone(clean);
      event(record,record.status === 'resubmitted' ? 'اطلاعات اصلاح و دوباره برای بررسی مدیر ارسال شد.' : 'پرونده برای بررسی مدیر سامانه ارسال شد.');
    },revision);
  }
  function withdraw(revision) {
    return mutate(A.user()?.caseId,['expert'],record => {
      if (!['submitted','resubmitted'].includes(record.status)) return 'در این مرحله امکان بازگشت به پیش‌نویس وجود ندارد.';
      record.status = 'draft'; record.state.submission = null; record.snapshot = null;
      event(record,'کارشناس ثبت اطلاعات، پرونده را برای ویرایش به پیش‌نویس برگرداند.');
    },revision);
  }
  function requestChange(caseId, section, body, revision) {
    return mutate(caseId,['admin'],record => {
      if (!['submitted','resubmitted','changes_requested'].includes(record.status)) return 'در این مرحله درخواست اصلاح مجاز نیست.';
      if (!D.definitions.some(d => d.id === section) || typeof body !== 'string' || body.trim().length < 10 || body.length > 600) return 'حوزه و شرح درخواست را کامل کنید؛ شرح بین ۱۰ تا ۶۰۰ کاراکتر باشد.';
      const request = {id:id('request'),section,message:body.trim(),status:'open',at:now(),actor:A.user().name,reply:'',replyAt:null};
      record.requests.unshift(request);
      record.threads.unshift(makeThread(record,'correction','اصلاح '+D.definitions.find(d => d.id === section).title,request.message,'admin',{requestId:request.id,section}));
      record.status = 'changes_requested'; record.state.submission = null; record.state.sections[section].completed = false;
      event(record,'درخواست اصلاح مدیر برای کارشناس ثبت شد.');
    },revision);
  }
  function approve(caseId, revision) {
    return mutate(caseId,['admin'],record => {
      if (!['submitted','resubmitted'].includes(record.status) || record.requests.some(r => r.status === 'open')) return 'پرونده برای تأیید آماده نیست.';
      if (!record.snapshot || D.stats(record.snapshot).percent !== 100) return 'اطلاعات ارسال‌شده کامل نیست.';
      record.status = 'approved';
      record.requests.forEach(r => {if(r.status === 'answered') r.status = 'resolved';});
      record.threads.forEach(t => {if(t.kind === 'correction') t.status = 'closed';});
      event(record,'پرونده پس از بررسی توسط مدیر سامانه تأیید شد.');
    },revision);
  }
  function allThreads() {
    return list().flatMap(record => record.threads.map(thread => ({...thread,caseId:record.id,caseName:record.state.profile.name}))).sort((a,b) => Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  }
  function thread(threadId) { return allThreads().find(t => t.id === threadId) || null; }
  function unread(t, role) { role = role || A.user()?.role; return t.messages.filter((m,index) => index >= (t.seen?.[role] || 0) && m.role !== role).length; }
  function unreadCount() {return allThreads().reduce((n,t) => n+unread(t),0);}
  function createThread(caseId, kind, title, body, relatedId) {
    return mutate(caseId,['expert','admin'],record => {
      if (!['request','message','followup'].includes(kind) || typeof title !== 'string' || title.trim().length < 3 || title.length > 100 || typeof body !== 'string' || body.trim().length < 5 || body.length > 1200) return 'عنوان ۳ تا ۱۰۰ و متن ۵ تا ۱۲۰۰ کاراکتر باشد.';
      if (record.threads.length >= 120) return 'حداکثر تعداد مکاتبه این پرونده ثبت شده است.';
      if (relatedId && !record.threads.some(t => t.id === relatedId)) return 'درخواست ارجاع‌شده در این پرونده وجود ندارد.';
      record.threads.unshift(makeThread(record,kind,title.trim(),body.trim(),A.user().role,{relatedId:relatedId || null}));
      event(record,threadKinds[kind]+' جدید از طرف '+roleLabels[A.user().role]+' ثبت شد.');
    },undefined,false);
  }
  function replyThread(threadId, body) {
    const found = thread(threadId);
    if (!found) return {ok:false,message:'این مکاتبه در دسترس شما نیست.'};
    return mutate(found.caseId,['expert','admin'],record => {
      const t = record.threads.find(t => t.id === threadId);
      if (t.status === 'closed') return 'این مکاتبه بسته شده است. یک پیگیری جدید ثبت کنید.';
      if (typeof body !== 'string' || body.trim().length < 5 || body.length > 1200) return 'متن پاسخ ۵ تا ۱۲۰۰ کاراکتر باشد.';
      if (t.messages.length >= 200) return 'حداکثر پیام این مکاتبه ثبت شده است؛ پیگیری جدید بسازید.';
      t.messages.push(message(A.user().role,body.trim(),null,A.user().name));
      t.seen[A.user().role] = t.messages.length; t.updatedAt = now(); t.status = 'answered';
      if (t.kind === 'correction' && A.user().role === 'expert') {
        const q = record.requests.find(r => r.id === t.requestId);
        if (q && q.status !== 'resolved') {q.reply = body.trim(); q.replyAt = now(); q.status = 'answered';}
      }
      event(record,'پاسخ در مکاتبه «'+t.title+'» ثبت شد.');
    },undefined,false);
  }
  function markRead(threadId) {
    const found = thread(threadId);
    if (!found) return {ok:false,message:'این مکاتبه در دسترس شما نیست.'};
    if (found.seen?.[A.user().role] === found.messages.length) return {ok:true};
    return mutate(found.caseId,['expert','admin'],record => {
      const t = record.threads.find(t => t.id === threadId); t.seen[A.user().role] = t.messages.length;
    },undefined,false);
  }
  function closeThread(threadId, reopen) {
    const found = thread(threadId);
    if (!found) return {ok:false,message:'این مکاتبه در دسترس شما نیست.'};
    return mutate(found.caseId,['admin'],record => {
      const t = record.threads.find(t => t.id === threadId);
      if (t.kind === 'correction') return 'درخواست اصلاح پس از ارسال مجدد و تأیید پرونده بسته می‌شود.';
      if (reopen && t.status !== 'closed' || !reopen && t.status === 'closed') return 'وضعیت این مکاتبه تغییر کرده است.';
      t.status = reopen ? 'open' : 'closed'; t.updatedAt = now();
      event(record,(reopen?'بازگشایی':'بستن')+' مکاتبه «'+t.title+'» توسط مدیر.');
    },undefined,false);
  }

  const copyBase = [
    ['dashboard.title', 'میزکار مرکز'], ['dashboard.eyebrow', 'ثبت امکانات و نیازهای آموزشی'],
    ['dashboard.sections', 'بخش‌های نیازسنجی'], ['dashboard.continue', 'ادامه تکمیل اطلاعات'],
    ['dashboard.edit', 'ویرایش اطلاعات مرکز'], ['dashboard.view', 'مشاهده پرونده ارسال‌شده'],
    ['dashboard.progress', 'هر ۹ حوزه برای بررسی و تکمیل در دسترس است.'], ['dashboard.workflow', 'پیگیری پرونده'],
    ['nav.form', 'ثبت اطلاعات و نیازها'], ['nav.review', 'مرور و ارسال'], ['nav.requests', 'درخواست‌ها و پیگیری'],
    ['nav.help', 'راهنما و مستندات'], ['brand.title', 'اطلس نیازهای آموزشی'], ['brand.subtitle', 'آموزش‌وپرورش خراسان شمالی'],
    ['form.eyebrow', 'فرم نیازسنجی مرکز'], ['form.hint', 'مقادیر این فرم نمونه‌اند و برای همین مرکز وارد می‌شوند.'],
    ['form.rule', 'شاخص‌های موجود و موردنیاز جدا هستند. برای مقدار نامعلوم، «اطلاعات نامشخص» را انتخاب کنید.'],
    ['form.tip', 'خانه خالی به معنی صفر نیست. «تکمیل حوزه» همه گروه‌های همین حوزه را بررسی می‌کند.'],
    ['form.save', 'ذخیره پیش‌نویس'], ['form.next', 'تکمیل حوزه و ادامه'], ['form.unknown', 'اطلاعات نامشخص'],
    ['form.value', 'مقدار / وضعیت'], ['form.notes', 'توضیحات'], ['form.indicator', 'شاخص'],
    ['form.extra', 'وضعیت‌های تکمیلی'], ['form.details', 'جزئیات تجهیزات'],
    ['form.empty', 'تجهیزی در فهرست ثبت نشده است.'], ['form.add', 'افزودن تجهیز'],
    ['form.place', 'مرکز / فضا'], ['form.item', 'تجهیز موردنیاز'], ['form.count', 'تعداد'],
    ['review.title', 'مرور و ارسال پرونده'], ['review.eyebrow', 'بررسی اطلاعات پیش از ارسال'],
    ['review.summary', 'خلاصه اطلاعات ثبت‌شده'], ['review.details', 'مشاهده جزئیات پیش از ارسال'],
    ['review.consent', 'اطلاعات واردشده را بررسی کرده‌ام.'], ['review.submit', 'ارسال برای بررسی مدیر سامانه'],
    ['review.back', 'بازگشت به ویرایش'], ['profile.title', 'مشخصات مرکز'], ['profile.edit', 'ویرایش مشخصات مرکز'],
    ['profile.name', 'نام مرکز'], ['profile.code', 'کد مرکز'], ['profile.county', 'شهرستان'],
    ['profile.students', 'تعداد دانش‌آموز'], ['profile.classrooms', 'تعداد کلاس'], ['profile.type', 'نوع مرکز'],
    ['profile.level', 'مقطع'], ['profile.gender', 'جنسیت'], ['profile.discrepancy', 'اعلام مغایرت اطلاعات پایه'],
    ['profile.save', 'ذخیره مشخصات'], ['requests.title', 'درخواست‌ها و پیگیری'],
    ['requests.help', 'درخواست، توضیحات یا پیگیری بفرستید و پاسخ‌ها را در همین صندوق ببینید.'],
    ['requests.reply', 'ثبت پاسخ'], ['requests.empty', 'درخواستی برای شما ثبت نشده است.'],
    ['help.own', 'این میزکار مخصوص مرکز شماست. پیشرفت فرم، وضعیت بررسی و درخواست‌های اصلاح را از همین‌جا دنبال کنید.'],
    ['help.indicators', 'از «ثبت اطلاعات و نیازها» حوزه و گروه را انتخاب کنید. موجود یعنی مقدار فعلی و موردنیاز یعنی نیاز اضافه؛ این دو شاخص جدا هستند.'],
    ['help.values', 'صفر یعنی مقدار صفر. خانه خالی یعنی اطلاعات ناقص؛ اگر مقدار را نمی‌دانید، «اطلاعات نامشخص» را انتخاب کنید.'],
    ['help.save', 'تغییرات به‌صورت خودکار ذخیره می‌شوند. «تکمیل حوزه و ادامه» همه گروه‌های همان حوزه را بررسی می‌کند. هر ۹ حوزه باید کامل شوند.'],
    ['help.submit', 'در «مرور و ارسال» اطلاعات را بررسی و تأیید کنید. پس از ارسال، فرم قفل می‌شود. نظر مدیر در «درخواست‌ها و پیگیری» می‌آید.'],
    ['nav.logout', 'خروج از حساب'], ['form.domains', 'حوزه‌های نیازسنجی'], ['form.sourceRow', 'ردیف منبع'],
    ['form.pdfFields', 'فیلدهای تکمیلی PDF'], ['form.detailCaption', 'شرح تجهیز و تعداد'], ['form.sourceCaption', 'مطابق عنوان‌های Excel'],
    ['form.saved', 'پیش‌نویس ذخیره شده'], ['form.sample', 'اطلاعات نمونه'], ['form.remove', 'حذف'],
    ['form.locked', 'پرونده برای بررسی قفل است. وضعیت و امکان بازگشت به پیش‌نویس را از صفحه مرور پیگیری کنید.'],
    ['form.review', 'مرور پرونده'], ['profile.editShort', 'ویرایش مشخصات'], ['profile.view', 'مشاهده مشخصات'],
    ['profile.hint', 'کد مرکز و شهرستان ثابت است. برای اعلام مغایرت، شرح آن را ثبت کنید.'],
    ['profile.placeholder', 'شرح مغایرت، در صورت وجود'], ['profile.close', 'بستن'],
    ['dashboard.own', 'فقط اطلاعات پرونده مرکز خودتان در این پورتال نمایش داده می‌شود.'],
    ['dashboard.correction', 'نظر مدیر را در درخواست‌ها بخوانید و پس از اصلاح، دوباره ارسال کنید.'],
    ['dashboard.history', 'درخواست‌ها و سوابق'], ['dashboard.enter', 'ورود به بخش'], ['dashboard.viewData', 'مشاهده اطلاعات'],
    ['dashboard.indicators', 'شاخص در فرم‌ها'], ['dashboard.domains', 'حوزه نیازسنجی'], ['dashboard.oneCase', 'پرونده متعلق به شما'],
    ['dashboard.follow', 'پیگیری درخواست‌های مرکز'], ['dashboard.draftState', 'در حال تکمیل اطلاعات'],
    ['dashboard.waitingState', 'در صف بررسی مدیر سامانه'], ['dashboard.correctionState', 'پاسخ و ارسال مجدد مرکز'],
    ['dashboard.approvedState', 'پس از تأیید مدیر'],
    ['review.sentTitle', 'ارسال نمایشی پرونده ثبت شد'], ['review.sentHelp', 'پرونده در میزکار کارشناس همین دمو قابل بررسی است؛ ارسال واقعی انجام نشده است.'],
    ['review.tracking', 'کد پیگیری نمایشی'], ['review.allComplete', 'هر ۹ حوزه تکمیل شده است.'],
    ['review.withdraw', 'بازگشت به پیش‌نویس'], ['review.withdrawHelp', 'تا پیش از تأیید مدیر می‌توانید پرونده را به پیش‌نویس برگردانید.'],
    ['review.approvedHelp', 'پرونده تأییدشده برای کارشناس ثبت اطلاعات قفل است.'], ['review.follow', 'پیگیری پرونده'],
    ['review.pendingHelp', 'ابتدا به درخواست‌های اصلاح در صفحه پیگیری پاسخ بدهید.'],
    ['review.trackingHelp', 'شماره پیگیری پس از ارسال نمایشی ایجاد می‌شود.'], ['review.dialogTitle', 'ارسال نمایشی پرونده'],
    ['review.dialogHelp', 'پرونده در میزکار مدیر سامانه همین دمو قرار می‌گیرد. برای دیدن نتیجه با حساب admin وارد شوید. ذخیره و ارسال بین دستگاه‌ها هنوز متصل نشده است.'],
    ['review.dialogConfirm', 'تأیید ارسال نمایشی'], ['review.dialogBack', 'بازگشت'],
    ['requests.replyLabel', 'پاسخ شما به درخواست'], ['requests.replyPlaceholder', 'توضیح دهید چه موردی بررسی یا اصلاح شد.'],
    ['requests.emptyHelp', 'پس از بررسی پرونده، درخواست‌های کارشناس اینجا نمایش داده می‌شوند.'],
    ['requests.history', 'سوابق پرونده'], ['requests.centerReply', 'پاسخ مرکز'],
    ['help.titleOwn', 'میزکار و پرونده شما'], ['help.titleIndicators', 'حوزه‌ها و شاخص‌ها'],
    ['help.titleValues', 'مقدار درست را ثبت کنید'], ['help.titleSave', 'ذخیره و تکمیل حوزه'], ['help.titleSubmit', 'ارسال و پیگیری اصلاحات']
  ].map(([key, value]) => ({ key, value, category: key.startsWith('help.') ? 'help' : 'interface', label: key }));
  D.definitions.forEach(definition => {
    copyBase.push({ key: 'domain.' + definition.id, value: definition.title, category: definition.id, label: 'عنوان حوزه' });
    definition.rows.forEach(row => copyBase.push({ key: 'indicator.' + definition.id + '.' + row.id, value: row.title, category: definition.id, label: 'شاخص ردیف ' + D.fa(row.excelRow) }));
    definition.extras.forEach(field => copyBase.push({ key: 'extra.' + definition.id + '.' + field.id, value: field.title, category: definition.id, label: 'فیلد تکمیلی' }));
    [...new Set(definition.rows.map(row => row.group))].forEach((value, index) => copyBase.push({ key: 'group.' + definition.id + '.' + index, value, category: definition.id, label: 'عنوان گروه' }));
  });
  function copyConfig() {
    try {
      const current = localStorage.getItem(COPYKEY);
      if (current) { const c = JSON.parse(current); return c && typeof c.values === 'object' ? c : {values:{}}; }
      const previous = JSON.parse(localStorage.getItem('education-needs-portal:copy:v3'));
      if (!previous?.values) return {values:{}};
      const values = {};
      for (let [key,value] of Object.entries(previous.values)) {
        if (/^group\.space\./.test(key)) { const index = Number(key.split('.').pop()); if (!index) continue; key = 'group.space.'+(index-1); }
        if (copyBase.some(entry => entry.key === key) && typeof value === 'string') values[key] = value;
      }
      const config = {values,at:previous.at,actor:previous.actor}; localStorage.setItem(COPYKEY,JSON.stringify(config)); return config;
    } catch (_) { return {values:{}}; }
  }
  let currentCopy = copyConfig();
  function text(key, fallback) { const value = currentCopy.values[key]; return typeof value === 'string' && value.trim() ? value : fallback ?? copyBase.find(c => c.key === key)?.value ?? ''; }
  function applyCopy(root) {
    if (A.user()?.role !== 'expert') return;
    const mapped = new Map(copyBase.filter(c => ['interface','help'].includes(c.category)).map(c => [c.value, text(c.key, c.value)]));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const node = walker.currentNode; if (/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(node.parentElement?.tagName) || node.parentElement?.closest('.message-body,.request-message,.request-reply')) continue; const trimmed = node.textContent.trim(); if (mapped.has(trimmed)) node.textContent = node.textContent.replace(trimmed, mapped.get(trimmed)); }
    root.querySelectorAll('[placeholder],[aria-label]').forEach(node => {
      for (const attribute of ['placeholder','aria-label']) { const value = node.getAttribute(attribute); if (mapped.has(value)) node.setAttribute(attribute, mapped.get(value)); }
    });
  }
  function group(section, value) { const entry = copyBase.find(c => c.category === section && c.key.startsWith('group.') && c.value === value); return entry ? text(entry.key, value) : value; }
  function saveCopy(values) {
    if (A.user()?.role !== 'admin') return { ok: false, message: 'ویرایش متن فقط برای مدیر سامانه مجاز است.' };
    const clean = {};
    for (const entry of copyBase) {
      const value = values[entry.key];
      if (value === undefined || value === entry.value) continue;
      if (typeof value !== 'string' || !value.trim() || value.length > 600) return { ok: false, message: 'متن‌ها باید بین ۱ تا ۶۰۰ کاراکتر باشند.' };
      clean[entry.key] = value.trim();
    }
    const config = { values: clean, at: now(), actor: A.user().name };
    try { localStorage.setItem(COPYKEY, JSON.stringify(config)); currentCopy = config; return { ok: true }; }
    catch (_) { return { ok: false, message: 'متن‌ها ذخیره نشدند. فضای ذخیره مرورگر را بررسی کنید.' }; }
  }
  window.Portal = Object.freeze({ KEY, COPYKEY, labels, roleLabels, threadKinds, threadStates, list, get, own, saveDraft, submit, withdraw, requestChange, approve, allThreads, thread, unread, unreadCount, createThread, replyThread, markRead, closeThread, copyBase, copyConfig, text, group, applyCopy, saveCopy, editableStatuses, id });
})();

