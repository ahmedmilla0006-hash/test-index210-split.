/* مواقيت الصلاة — تحديد المدينة عبر IP دون GPS أو إذن الموقع */
(()=>{
  'use strict';
  if(window.AyaPrayerTimes) return;
  const STORE='ayaPrayerTimesV1';
  const $=id=>document.getElementById(id);
  const names={Fajr:'الفجر',Sunrise:'الشروق',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'};
  let state={mode:'auto',city:'',country:'',timezone:'',latitude:null,longitude:null,timings:null,date:'',updated:0};
  try{state={...state,...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch(_){}
  const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(state))}catch(_){}};
  const dateAtZone=zone=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}};
  const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function installUI(){
    const menu=$('sideMenu');
    let b=$('ayaPrayerTimesButton');
    if(!b&&menu){
      b=document.createElement('button');
      b.type='button';b.className='menu-item';b.id='ayaPrayerTimesButton';b.textContent='🕌 مواقيت الصلاة';
      const anchor=$('downloadsButton');
      if(anchor&&anchor.parentNode===menu) anchor.insertAdjacentElement('afterend',b);
      else menu.insertBefore(b,menu.firstChild);
    }
    if(b) b.onclick=(event)=>{event.preventDefault();event.stopPropagation();open();};
    if(!$('ayaPrayerOverlay')){
      const ov=document.createElement('div');ov.className='popup-overlay';ov.id='ayaPrayerOverlay';
      ov.innerHTML='<div class="popup-box aya-prayer-box"><div class="popup-header"><h2>🕌 مواقيت الصلاة</h2><button type="button" class="popup-close" id="ayaPrayerClose">✕</button></div><div class="aya-prayer-city" id="ayaPrayerCity">مواقيت الصلاة</div><div class="aya-prayer-status" id="ayaPrayerStatus"></div><div class="aya-prayer-grid" id="ayaPrayerGrid"></div><div class="aya-prayer-actions"><button type="button" id="ayaPrayerRefresh">تحديث المواقيت</button><button type="button" id="ayaPrayerManualToggle">اختيار مدينة يدويًا</button></div><button type="button" id="ayaQiblaToggle" class="aya-qibla-toggle">🧭 اتجاه القبلة</button><section id="ayaQiblaPanel" class="aya-qibla-panel" hidden><div class="aya-qibla-dial"><div class="aya-qibla-north">N</div><div id="ayaQiblaNeedle" class="aya-qibla-needle">▲</div><div class="aya-qibla-center">🕋</div></div><div id="ayaQiblaStatus" class="aya-qibla-status">اضغط لبدء تحديد اتجاه القبلة.</div><div id="ayaQiblaBearing" class="aya-qibla-bearing"></div></section><form id="ayaPrayerManual" hidden><input id="ayaPrayerCityInput" placeholder="المدينة — مثل Ankara" autocomplete="address-level2"><input id="ayaPrayerCountryInput" placeholder="الدولة — مثل Turkey" autocomplete="country-name"><button type="submit">اعتماد المدينة</button><button type="button" id="ayaPrayerAuto">العودة للتحديد التلقائي</button></form></div>';
      document.body.appendChild(ov);
      const st=document.createElement('style');st.textContent=`
      #ayaPrayerOverlay{z-index:650;align-items:center;justify-content:center}
      #ayaPrayerOverlay .aya-prayer-box{width:min(94vw,430px);max-height:88dvh;overflow:auto;direction:rtl}
      .aya-prayer-city{text-align:center;font-weight:800;font-size:18px;margin:8px 0 4px;color:var(--green,#16803b)}
      .aya-prayer-status{text-align:center;font-size:13px;opacity:.78;margin:0 0 14px;line-height:1.7}
      .aya-prayer-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .aya-prayer-item{display:flex;align-items:center;justify-content:space-between;padding:13px 12px;border-radius:12px;background:rgba(22,128,59,.09);border:1px solid rgba(22,128,59,.2)}
      .aya-prayer-item b{font-size:14px}.aya-prayer-item strong{font-size:17px;direction:ltr}
      .aya-prayer-actions{display:flex;gap:8px;margin-top:14px}
      .aya-prayer-actions button,#ayaPrayerManual button{flex:1;border:1px solid rgba(120,150,130,.35);border-radius:10px;padding:11px 8px;background:var(--green,#16803b);color:white;font:inherit}
      #ayaPrayerManual{display:grid;gap:8px;margin-top:12px}
      #ayaPrayerManual[hidden]{display:none}
      #ayaPrayerManual input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #888;background:transparent;color:inherit;font:inherit}
      .aya-prayer-foot{text-align:center;font-size:12px;opacity:.7;line-height:1.7;margin-top:13px}.aya-qibla-toggle{width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid rgba(22,128,59,.35);background:rgba(22,128,59,.12);color:inherit;font:inherit;font-weight:700}.aya-qibla-panel{margin-top:12px;padding:14px;border-radius:16px;text-align:center;background:rgba(22,128,59,.07);border:1px solid rgba(22,128,59,.2)}.aya-qibla-panel[hidden]{display:none}.aya-qibla-dial{width:170px;height:170px;max-width:55vw;max-height:55vw;margin:4px auto 12px;border:5px solid #8c9b91;border-radius:50%;position:relative;background:radial-gradient(circle,#fff 0 52%,#e8eee9 53% 100%);box-shadow:0 4px 18px #0002}.aya-qibla-north{position:absolute;top:5px;left:50%;transform:translateX(-50%);font-weight:900;color:#b33}.aya-qibla-needle{position:absolute;left:50%;top:18%;height:65%;width:30px;margin-left:-15px;display:flex;align-items:flex-start;justify-content:center;font-size:43px;color:#168443;transform-origin:50% 50%;text-shadow:0 1px 2px #555}.aya-qibla-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:22px;background:#fff;border-radius:50%;padding:8px;box-shadow:0 1px 5px #0003}.aya-qibla-status{font-size:14px;line-height:1.7}.aya-qibla-bearing{font-weight:800;margin-top:4px;direction:rtl}body.interface-new #ayaPrayerOverlay .aya-qibla-panel{background:rgba(55,72,88,.4);border-color:rgba(200,220,235,.2)}body.interface-new #ayaPrayerOverlay .aya-qibla-dial{background:radial-gradient(circle,#e9eff2 0 52%,#cbd7dd 53% 100%)}body.interface-new #ayaPrayerOverlay .aya-qibla-center{background:#f8fafb}
      /* المظهر الكلاسيكي: نافذة فاتحة ونص واضح */
      #ayaPrayerOverlay .aya-prayer-box{background:#f5f0e7;color:#202020;border:1px solid #d8cdbb}
      #ayaPrayerOverlay .aya-prayer-box .popup-header h2{color:#176b36}
      #ayaPrayerOverlay .aya-prayer-status{color:#555;opacity:1}
      #ayaPrayerOverlay .aya-prayer-item{background:#fff;border:1px solid #ded6c9;color:#202020}
      #ayaPrayerOverlay .aya-prayer-item b{color:#333}
      #ayaPrayerOverlay .aya-prayer-item strong{color:#145c30}
      #ayaPrayerOverlay .aya-prayer-city{color:#176b36}
      body.interface-new #ayaPrayerOverlay .aya-prayer-box{background:rgba(28,42,56,.82);color:#f4f7f9;border:1px solid rgba(200,220,235,.22);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      body.interface-new #ayaPrayerOverlay .aya-prayer-item{background:rgba(55,72,88,.4);border-color:rgba(200,220,235,.18);color:#f4f7f9}
      body.interface-new #ayaPrayerOverlay .aya-prayer-item b,body.interface-new #ayaPrayerOverlay .aya-prayer-item strong{color:#f4f7f9}
      body.night-mode:not(.interface-new) #ayaPrayerOverlay .aya-prayer-box{background:#242424;color:#f2f2f2;border-color:#444}
      body.night-mode:not(.interface-new) #ayaPrayerOverlay .aya-prayer-item{background:#303030;color:#f2f2f2;border-color:#505050}
      body.night-mode:not(.interface-new) #ayaPrayerOverlay .aya-prayer-item b,body.night-mode:not(.interface-new) #ayaPrayerOverlay .aya-prayer-item strong{color:#f2f2f2}
      `;document.head.appendChild(st);
      $('ayaPrayerClose').onclick=close;ov.addEventListener('click',e=>{if(e.target===ov)close()});$('ayaQiblaToggle').onclick=async()=>{const panel=$('ayaQiblaPanel');panel.hidden=!panel.hidden;if(!panel.hidden)await startQibla();};
      $('ayaPrayerRefresh').onclick=()=>{state.mode='auto';save();loadAuto(true)};
      $('ayaPrayerManualToggle').onclick=()=>{$('ayaPrayerManual').hidden=!$('ayaPrayerManual').hidden};
      $('ayaPrayerManual').onsubmit=e=>{e.preventDefault();loadCity($('ayaPrayerCityInput').value.trim(),$('ayaPrayerCountryInput').value.trim())};
      $('ayaPrayerAuto').onclick=()=>{state.mode='auto';save();$('ayaPrayerManual').hidden=true;loadAuto(true)};
    }
  }
  function open(){installUI();$('ayaPrayerOverlay').classList.add('show');render();if(!state.timings||state.date!==dateAtZone(state.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone))loadCurrent()}
  function close(){$('ayaPrayerOverlay')?.classList.remove('show')}
  function render(){
    if(!$('ayaPrayerGrid'))return;
    $('ayaPrayerCity').textContent=state.city?(state.city+(state.country?'، '+state.country:'')):'لم تُحدد المدينة بعد';
    $('ayaPrayerGrid').innerHTML=state.timings?Object.keys(names).map(k=>'<div class="aya-prayer-item"><b>'+names[k]+'</b><strong>'+esc(state.timings[k]||'—')+'</strong></div>').join(''):'';
    $('ayaPrayerStatus').textContent=state.timings?'مواقيت اليوم • '+(state.date||'')+' • آخر تحديث: '+(state.updated?new Date(state.updated).toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'}):'—'):'سيتم جلب المواقيت عند توفر الإنترنت.';
  }
  async function getTimings(lat,lon,zone){
    const ts=Math.floor(Date.now()/1000),url='https://api.aladhan.com/v1/timings/'+ts+'?latitude='+encodeURIComponent(lat)+'&longitude='+encodeURIComponent(lon)+'&method=13&timezonestring='+encodeURIComponent(zone||'Europe/Istanbul');
    const res=await fetch(url);if(!res.ok)throw Error('تعذر جلب مواقيت الصلاة');const j=await res.json();if(j.code!==200||!j.data?.timings)throw Error('استجابة مواقيت الصلاة غير صالحة');
    const t={};Object.keys(names).forEach(k=>t[k]=String(j.data.timings[k]||'').split(' ')[0]);
    return {timings:t,date:dateAtZone(zone||'Europe/Istanbul')};
  }
  async function loadAuto(force){
    $('ayaPrayerStatus').textContent='جارٍ تحديث مواقيت الصلاة…';
    try{
      const r=await fetch('https://ipwho.is/?fields=success,city,region,country,latitude,longitude,timezone');
      if(!r.ok)throw Error('تعذر تحديد المدينة تلقائيًا');const g=await r.json();
      if(!g.success||!Number.isFinite(Number(g.latitude))||!Number.isFinite(Number(g.longitude)))throw Error('لم يتمكن الاتصال من تحديد المدينة');
      const zone=g.timezone?.id||'Europe/Istanbul';
      const data=await getTimings(g.latitude,g.longitude,zone);
      state={...state,mode:'auto',city:g.city||g.region||'',country:g.country||'',latitude:Number(g.latitude),longitude:Number(g.longitude),timezone:zone,...data,updated:Date.now()};
      save();render();
    }catch(e){$('ayaPrayerStatus').textContent=(e.message||'تعذر التحديث')+' — يمكنك اختيار المدينة يدويًا.';render()}
  }
  async function loadCity(city,country){
    if(!city||!country){$('ayaPrayerStatus').textContent='اكتب اسم المدينة والدولة.';return}
    $('ayaPrayerStatus').textContent='جارٍ جلب مواقيت '+city+'…';
    try{
      const url='https://api.aladhan.com/v1/timingsByCity?city='+encodeURIComponent(city)+'&country='+encodeURIComponent(country)+'&method=13';
      const r=await fetch(url);if(!r.ok)throw Error('تعذر جلب المواقيت');const j=await r.json();if(j.code!==200||!j.data?.timings)throw Error('لم يتم العثور على المدينة');
      const t={};Object.keys(names).forEach(k=>t[k]=String(j.data.timings[k]||'').split(' ')[0]);
      state={...state,mode:'manual',city,country,timezone:j.data.meta?.timezone||'',latitude:j.data.meta?.latitude,longitude:j.data.meta?.longitude,timings:t,date:dateAtZone(j.data.meta?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone),updated:Date.now()};
      save();$('ayaPrayerManual').hidden=true;render();
    }catch(e){$('ayaPrayerStatus').textContent=e.message||'حدث خطأ أثناء البحث عن المدينة'}
  }
  async function loadCurrent(){
    if(state.mode==='manual'&&state.city&&state.country)return loadCity(state.city,state.country);
    return loadAuto(false);
  }
  let qiblaBearing=null,qiblaListening=false;
  function bearingToKaaba(lat,lon){const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI,p1=rad(lat),p2=rad(21.422487),dl=rad(39.826206-lon),y=Math.sin(dl),x=Math.cos(p1)*Math.tan(p2)-Math.sin(p1)*Math.cos(dl);return(deg(Math.atan2(y,x))+360)%360;}
  async function startQibla(){
    const status=$('ayaQiblaStatus'),needle=$('ayaQiblaNeedle');
    if(!Number.isFinite(Number(state.latitude))||!Number.isFinite(Number(state.longitude))){status.textContent='حدّد المدينة أولًا من مواقيت الصلاة.';return;}
    qiblaBearing=bearingToKaaba(Number(state.latitude),Number(state.longitude));
    $('ayaQiblaBearing').textContent='اتجاه القبلة من الشمال: '+Math.round(qiblaBearing)+'°';
    status.textContent='حرّك الهاتف ببطء بشكل أفقي لمعايرة البوصلة.';
    const handler=e=>{let h=Number.isFinite(e.webkitCompassHeading)?e.webkitCompassHeading:(Number.isFinite(e.alpha)?360-e.alpha:NaN);if(!Number.isFinite(h))return;const angle=(screen.orientation&&Number(screen.orientation.angle))||0;h=(h-angle+360)%360;needle.style.transform='rotate('+((qiblaBearing-h+360)%360)+'deg)';status.textContent='اتجاه القبلة — حرّك الهاتف حتى يشير السهم إلى الأعلى.';};
    if(qiblaListening)return;
    try{if(typeof DeviceOrientationEvent==='undefined'){status.textContent='هذا الجهاز أو المتصفح لا يدعم مستشعر البوصلة.';return;}if(typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted'){status.textContent='لم يُسمح باستخدام مستشعر الاتجاه.';return;}}window.addEventListener('deviceorientationabsolute',handler,true);window.addEventListener('deviceorientation',handler,true);qiblaListening=true;}catch(err){status.textContent='تعذر تشغيل البوصلة. افتح الموقع عبر اتصال آمن HTTPS.';}
  }
  function init(){
    installUI();
    if(state.timings)render();
    if(state.mode==='auto'&&(!state.timings||Date.now()-state.updated>12*60*60*1000))loadAuto(false);
    setInterval(()=>{
      const today=dateAtZone(state.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone);
      if(state.date!==today)loadCurrent();
      else if(state.mode==='auto'&&Date.now()-state.updated>24*60*60*1000)loadAuto(false);
    },30*60*1000);
  }
  window.AyaPrayerTimes={open,refresh:loadCurrent};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();