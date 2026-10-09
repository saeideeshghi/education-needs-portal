/* Two-way, case-scoped correspondence for the two demo roles. */
(function () {
  'use strict';
  if (!window.PortalAllowed) return;
  const P=window.Portal, A=window.PortalAuth, D=window.PortalData, UI=window.PortalUI;
  const user=A.user(), root=document.getElementById('page-content'), e=D.escape, fa=D.fa;
  if (!user || !['expert','admin'].includes(user.role)) return;
  const qs=new URLSearchParams(location.search);
  let selectedId=qs.get('thread'), search='', filter='', kindFilter='';
  const drafts=new Map();
  function all() {return P.allThreads();}
  function waiting(t) {return t.status!=='closed' && t.messages.at(-1).role!==user.role;}
  function kind(t) {return '<span class="thread-kind kind-'+e(t.kind)+'">'+e(P.threadKinds[t.kind])+'</span>';}
  function status(t) {return '<span class="status '+(t.status==='closed'?'status-done':waiting(t)?'status-draft':'status-submitted')+'">'+e(t.status==='closed'?'بسته شده':waiting(t)?'در انتظار پاسخ شما':'در انتظار پاسخ '+(user.role==='admin'?'کارشناس':'مدیر'))+'</span>';}
  function filtered() {
    return all().filter(t=>(!kindFilter||t.kind===kindFilter)&&(!search||(t.title+' '+t.tracking+' '+t.caseName).includes(search))&&
      (!filter||filter==='unread'&&P.unread(t)>0||filter==='waiting'&&waiting(t)||filter==='closed'&&t.status==='closed'||filter==='sent'&&t.createdBy===user.role||filter==='received'&&t.createdBy!==user.role));
  }
  function listHtml() {
    const threads=filtered();
    return '<p class="thread-result-count">'+fa(threads.length)+' مکاتبه</p>'+
      (threads.length?threads.map(t=>{
        const last=t.messages.at(-1), count=P.unread(t);
        return '<button class="thread-list-item '+(t.id===selectedId?'is-selected':'')+'" data-inbox="select" data-thread="'+e(t.id)+'"'+(t.id===selectedId?' aria-current="true"':'')+'><span class="thread-item-top">'+kind(t)+'<small>'+e(UI.date(t.updatedAt))+'</small></span><strong>'+e(t.title)+'</strong><span class="thread-item-center">'+e(t.caseName)+'</span><span class="thread-last-message">'+e(last.body.slice(0,75))+(last.body.length>75?'…':'')+'</span><span class="thread-item-bottom"><bdi dir="ltr">'+e(t.tracking)+'</bdi>'+(count?'<span class="unread-count" aria-label="'+fa(count)+' پیام خوانده‌نشده">'+fa(count)+'</span>':t.status==='closed'?'<small>بسته شده</small>':'')+'</span></button>';
      }).join(''):'<div class="empty-state"><p>مکاتبه‌ای با این فیلتر پیدا نشد.</p></div>');
  }
  function conversationHtml() {
    const t=P.thread(selectedId);
    if (!t) return '<section class="panel empty-state conversation-empty">'+UI.icon('bell')+'<h2>'+(selectedId?'مکاتبه در دسترس نیست':'یک مکاتبه را انتخاب کنید')+'</h2><p>'+(selectedId?'این مکاتبه پیدا نشد یا مربوط به پرونده شما نیست.':'درخواست تازه ثبت کنید یا یکی از پیام‌های صندوق را باز کنید.')+'</p></section>';
    const record=P.get(t.caseId), other=user.role==='expert'?'admin':'expert';
    const original=t.relatedId?P.thread(t.relatedId):null;
    return '<section class="panel conversation-panel"><div class="conversation-head"><div><div class="conversation-tags">'+kind(t)+status(t)+'</div><h2 id="conversation-title" tabindex="-1">'+e(t.title)+'</h2><p>'+e(t.caseName)+' · <bdi dir="ltr">'+e(t.tracking)+'</bdi></p></div><div class="conversation-actions"><button class="text-button" data-inbox="followup">ثبت پیگیری جدید</button>'+(user.role==='admin'&&t.kind!=='correction'?'<button class="text-button" data-inbox="'+(t.status==='closed'?'reopen':'close')+'">'+(t.status==='closed'?'بازگشایی مکاتبه':'بستن مکاتبه')+'</button>':'')+'</div></div>'+
      (original?'<div class="thread-reference">پیگیری مکاتبه <button class="text-button" data-inbox="select" data-thread="'+e(original.id)+'"><bdi dir="ltr">'+e(original.tracking)+'</bdi></button></div>':'')+
      (t.kind==='correction'?'<div class="conversation-form-note">'+UI.icon('file')+'<div><p>این مکاتبه به اصلاح فرم مربوط است. پس از اصلاح و پاسخ، پرونده را دوباره ارسال کنید.</p><div>'+(user.role==='expert'?'<a class="text-button" href="./needs.html?section='+e(t.section)+'">باز کردن حوزه مربوط</a><a class="text-button" href="./review.html">مرور و ارسال پرونده</a>':'<a class="text-button" href="./case.html?id='+encodeURIComponent(t.caseId)+'">بررسی پرونده مرکز</a>')+'</div></div></div>':'')+
      '<ol class="conversation-messages" aria-label="تاریخچه پیام‌ها">'+t.messages.map((m,index)=>'<li class="message-bubble '+(m.role===user.role?'is-own':'')+'"><div class="message-heading"><strong>'+e(P.roleLabels[m.role])+'</strong><small>'+e(UI.date(m.at))+'</small></div><p class="message-body">'+e(m.body)+'</p>'+(m.role===user.role?'<small class="message-read-state">'+(index<(t.seen?.[other]||0)?'خوانده شده':'در انتظار مشاهده')+'</small>':'')+'</li>').join('')+'</ol>'+
      (t.status==='closed'?'<div class="closed-thread-note">'+UI.icon('check')+'<p>این مکاتبه بسته شده است. برای ادامه موضوع، پیگیری جدید ثبت کنید.</p></div>':
        '<form class="conversation-reply" id="thread-reply-form"><label class="field-label" for="thread-reply">پاسخ یا توضیحات شما</label><textarea class="field" id="thread-reply" name="body" required minlength="5" maxlength="1200" rows="3" placeholder="پاسخ خود را برای '+(user.role==='expert'?'مدیر سامانه':'کارشناس ثبت اطلاعات')+' بنویسید.">'+e(drafts.get(t.id)||'')+'</textarea><div class="conversation-reply-actions"><small>پاسخ در همین مکاتبه ثبت می‌شود.</small><button class="button button-primary" type="submit">'+UI.icon('send')+'ارسال پاسخ</button></div></form>')+'</section>'+
      '<section class="panel conversation-case-status"><span>وضعیت پرونده مرتبط</span>'+UI.status(record)+(user.role==='admin'?'<a class="text-button" href="./case.html?id='+encodeURIComponent(t.caseId)+'">مشاهده پرونده</a>':'<a class="text-button" href="./review.html">مرور پرونده من</a>')+'</section>';
  }
  function render(chooseDefault) {
    if (chooseDefault && !selectedId && all().length) selectedId=all()[0].id;
    if (selectedId) {const result=P.markRead(selectedId); if(!result.ok&&P.thread(selectedId))UI.toast(result.message,true);}
    UI.shell('requests',user.role==='expert'?P.own().state:null);
    root.innerHTML=UI.heading('درخواست‌ها و پیگیری','مکاتبه مستقیم بین کارشناس ثبت اطلاعات و مدیر سامانه')+
      '<section class="inbox-summary"><div><p>درخواست، توضیحات یا پیگیری بفرستید و پاسخ‌ها را در همین صندوق ببینید.</p><small>مدیر می‌تواند وضعیت مکاتبه را ببندد یا دوباره باز کند.</small></div><button class="button button-primary" data-inbox="compose">'+UI.icon('edit')+'مکاتبه جدید</button></section>'+
      '<div class="correspondence-layout"><aside class="panel correspondence-list" aria-label="فهرست مکاتبه‌ها"><div class="correspondence-filters"><label class="field-label" for="thread-search">جست‌وجوی عنوان یا کد پیگیری</label><input class="field" id="thread-search" value="'+e(search)+'" placeholder="عنوان، مرکز یا کد پیگیری"><div><div><label class="field-label" for="thread-filter">صندوق</label><select class="field" id="thread-filter">'+[['','همه مکاتبه‌ها'],['unread','خوانده‌نشده'],['waiting','نیازمند پاسخ من'],['sent','ارسالی من'],['received','دریافتی من'],['closed','بسته شده']].map(([v,l])=>'<option value="'+v+'"'+(filter===v?' selected':'')+'>'+l+'</option>').join('')+'</select></div><div><label class="field-label" for="thread-kind-filter">نوع مکاتبه</label><select class="field" id="thread-kind-filter"><option value="">همه انواع</option>'+Object.entries(P.threadKinds).map(([v,l])=>'<option value="'+v+'"'+(kindFilter===v?' selected':'')+'>'+l+'</option>').join('')+'</select></div></div></div><div id="thread-list">'+listHtml()+'</div></aside><div class="conversation-area" id="conversation-area">'+conversationHtml()+'</div></div><p class="data-footnote">ارسال‌های این دمو در همان مرورگر بین دو حساب مشترک‌اند؛ به سرویس واقعی متصل نیستند.</p>'+UI.footer();
    P.applyCopy(root);
  }
  function openCompose(followup) {
    let dialog=document.getElementById('compose-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='compose-dialog';dialog.className='dialog compose-dialog';dialog.setAttribute('aria-labelledby','compose-title');document.body.append(dialog);}
    const records=P.list(), selected=P.thread(selectedId);
    let caseId=followup?selected?.caseId:qs.get('case')||selected?.caseId;
    if(!records.some(r=>r.id===caseId))caseId=records[0]?.id;
    const type=followup?'followup':'request', related=followup?selected?.id:'';
    dialog.innerHTML='<form id="compose-form"><div class="dialog-head"><h2 id="compose-title">'+(followup?'ثبت پیگیری جدید':'مکاتبه جدید')+'</h2><button type="button" class="icon-button" data-inbox="cancel-compose" aria-label="بستن فرم">'+UI.icon('close')+'</button></div><div class="dialog-body"><p class="compose-recipient">گیرنده: '+(user.role==='expert'?'مدیر سامانه':'کارشناس ثبت اطلاعات مرکز انتخاب‌شده')+'</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="field-label" for="compose-case">پرونده مرکز</label>'+(user.role==='admin'?'<select class="field" id="compose-case" name="caseId">'+records.map(r=>'<option value="'+e(r.id)+'"'+(r.id===caseId?' selected':'')+'>'+e(r.state.profile.name)+'</option>').join('')+'</select>':'<input class="field" id="compose-case" value="'+e(records[0].state.profile.name)+'" disabled><input type="hidden" name="caseId" value="'+e(caseId)+'">')+'</div><div><label class="field-label" for="compose-kind">نوع مکاتبه</label><select class="field" id="compose-kind" name="kind">'+Object.entries(P.threadKinds).filter(([v])=>v!=='correction').map(([v,l])=>'<option value="'+v+'"'+(v===type?' selected':'')+'>'+l+'</option>').join('')+'</select></div></div><div id="compose-related-wrap"'+(type==='followup'?'':' hidden')+'><label class="field-label mt-4" for="compose-related">ارجاع به مکاتبه قبلی (اختیاری)</label><select class="field" id="compose-related" name="related">'+relatedOptions(caseId,related)+'</select></div><label class="field-label mt-4" for="compose-subject">عنوان</label><input class="field" id="compose-subject" name="title" required minlength="3" maxlength="100" value="'+(followup?e(('پیگیری: '+selected.title).slice(0,100)):'')+'" placeholder="موضوع درخواست یا توضیحات"><label class="field-label mt-4" for="compose-body">متن درخواست یا توضیحات</label><textarea class="field" id="compose-body" name="body" required minlength="5" maxlength="1200" rows="5" placeholder="موضوع و توضیحات موردنیاز را بنویسید."></textarea><p class="text-xs text-muted mt-3">پس از ارسال، کد پیگیری ایجاد می‌شود و مکاتبه در پنل گیرنده دیده می‌شود.</p></div><div class="dialog-footer"><button class="button button-secondary" type="button" data-inbox="cancel-compose">بازگشت</button><button class="button button-primary" type="submit">'+UI.icon('send')+'ارسال مکاتبه</button></div></form>';
    dialog.showModal(); document.getElementById('compose-subject').focus();
  }
  function relatedOptions(caseId, selected) {return '<option value="">بدون ارجاع</option>'+all().filter(t=>t.caseId===caseId).map(t=>'<option value="'+e(t.id)+'"'+(t.id===selected?' selected':'')+'>'+e(t.title)+' · '+e(t.tracking)+'</option>').join('');}
  document.addEventListener('submit',event=>{
    const form=event.target;
    if(form.id==='compose-form'){
      event.preventDefault();if(!form.reportValidity())return;
      const result=P.createThread(form.elements.caseId.value,form.elements.kind.value,form.elements.title.value,form.elements.body.value,form.elements.kind.value==='followup'?form.elements.related.value:null);
      if(!result.ok){UI.toast(result.message,true);return;}
      selectedId=result.record.threads[0].id;document.getElementById('compose-dialog').close();
      window.history.replaceState({},'', './requests.html?thread='+encodeURIComponent(selectedId));render(false);UI.toast('مکاتبه ارسال شد و در پنل گیرنده قابل مشاهده است.');
    }
    if(form.id==='thread-reply-form'){
      event.preventDefault();if(!form.reportValidity())return;
      const result=P.replyThread(selectedId,form.elements.body.value);
      if(!result.ok){UI.toast(result.message,true);return;}
      drafts.delete(selectedId);render(false);UI.toast('پاسخ ارسال شد.');document.getElementById('thread-reply')?.focus();
    }
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-inbox]');if(!button)return;
    const action=button.dataset.inbox;
    if(action==='compose')openCompose(false);
    if(action==='followup')openCompose(true);
    if(action==='cancel-compose')document.getElementById('compose-dialog').close();
    if(action==='select'){selectedId=button.dataset.thread;window.history.replaceState({},'', './requests.html?thread='+encodeURIComponent(selectedId));render(false);document.getElementById('conversation-title')?.focus();}
    if(action==='close'||action==='reopen'){const result=P.closeThread(selectedId,action==='reopen');if(!result.ok){UI.toast(result.message,true);return;}render(false);UI.toast(action==='close'?'مکاتبه بسته شد.':'مکاتبه دوباره باز شد.');}
  });
  document.addEventListener('input',event=>{
    if(event.target.id==='thread-search'){search=D.latin(event.target.value.trim());document.getElementById('thread-list').innerHTML=listHtml();}
    if(event.target.id==='thread-reply')drafts.set(selectedId,event.target.value);
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.id==='thread-filter'){filter=input.value;document.getElementById('thread-list').innerHTML=listHtml();}
    if(input.id==='thread-kind-filter'){kindFilter=input.value;document.getElementById('thread-list').innerHTML=listHtml();}
    if(input.id==='compose-kind')document.getElementById('compose-related-wrap').hidden=input.value!=='followup';
    if(input.id==='compose-case')document.getElementById('compose-related').innerHTML=relatedOptions(input.value,'');
  });
  window.addEventListener('storage',event=>{
    if(event.key===P.KEY){render(false);}
  });
  render(!selectedId);
  document.addEventListener('DOMContentLoaded',()=>{if(qs.get('compose')==='1')openCompose(false);});
})();

