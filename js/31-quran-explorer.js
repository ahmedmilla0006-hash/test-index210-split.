/* ميزات خريطة القرآن وفهرس القصص ورحلة القرآن والويدجت — إضافة مستقلة */
(function(){
  'use strict';
  const juzStarts=[1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
  const juzNames=['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر','السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون','الحادي والعشرون','الثاني والعشرون','الثالث والعشرون','الرابع والعشرون','الخامس والعشرون','السادس والعشرون','السابع والعشرون','الثامن والعشرون','التاسع والعشرون','الثلاثون'];
  const stories=[
    ['آدم عليه السلام',[1,2,7,15,17,18,20]],['نوح عليه السلام',[7,10,11,23,26,54,71]],['هود عليه السلام',[7,11,26,46]],['صالح عليه السلام',[7,11,26,27]],['إبراهيم عليه السلام',[2,6,9,11,14,15,19,21,26,29,37,51,60]],['لوط عليه السلام',[7,11,15,26,29,37,54]],['يوسف عليه السلام',[12,40]],['موسى عليه السلام',[2,7,10,17,18,20,26,27,28,40,43,44,79]],['داود وسليمان عليهما السلام',[2,4,21,27,34,38]],['أصحاب الكهف',[18]],['ذو القرنين',[18]],['مريم وعيسى عليهما السلام',[3,4,5,19,23,43,57,61]],['أصحاب الأخدود',[85]],['أصحاب الفيل',[105]]
  ];
  let activeAyah=null;
  let lastObservedPage=0;
  function currentPageNumber(){
    return Math.max(1,Math.min(604,Number(localStorage.getItem('quranPage')||1)));
  }
  function currentJuzIndex(page){
    let index=0;
    for(let i=0;i<juzStarts.length;i++){if(page>=juzStarts[i])index=i;else break;}
    return index;
  }
  function currentSurahIndex(page){
    const rows=getSurahRows();let index=0;
    for(let i=0;i<rows.length;i++){if(page>=Number(rows[i][1]))index=i;else break;}
    return index;
  }
  function refreshCurrentPosition(){
    const host=$('qeCurrentPosition');if(!host)return;
    const page=currentPageNumber(), rows=getSurahRows();
    const si=currentSurahIndex(page), ji=currentJuzIndex(page);
    const surahName=rows[si]?rows[si][0]:'—';
    const ayahText=activeAyah&&Number(activeAyah.page)===page
      ? ' • الآية '+Number(activeAyah.ayah)
      : '';
    host.innerHTML='<div class="qe-current-title">📍 موضعك الحالي في المصحف</div>'+
      '<div class="qe-current-meta">سورة '+surahName+ayahText+'<br>الجزء '+juzNames[ji]+' • الصفحة '+page+' من 604</div>'+
      '<button type="button" class="qe-action" id="qeGoCurrent">العودة إلى موضعي الحالي</button>';
    const go=$('qeGoCurrent');
    if(go)go.addEventListener('click',()=>{try{if(typeof loadPage==='function')loadPage(page,{keepAudio:true});}catch(e){}close();});
  }
  window.addEventListener('aya:active-ayah',e=>{
    if(e&&e.detail)activeAyah={surah:Number(e.detail.surah),ayah:Number(e.detail.ayah),page:Number(e.detail.page)||currentPageNumber()};
    refreshCurrentPosition();
  });
  setInterval(()=>{
    const page=currentPageNumber();
    if(page!==lastObservedPage){lastObservedPage=page;refreshCurrentPosition();}
  },500);
  const $=id=>document.getElementById(id);
  const getSurahRows=()=>typeof surahs!=='undefined'&&Array.isArray(surahs)?surahs:[];
  function pageForSurah(n){return (window.surahs&&surahs[n-1])?Number(surahs[n-1][1]):1;}
  function goPage(n){try{if(typeof loadPage==='function')loadPage(Math.max(1,Math.min(604,Number(n)||1)));}catch(e){} close();}
  function ensureUI(){
    if($('quranExplorerOverlay'))return;
    const menu=$('sideMenu'); if(!menu)return;
    const btn=document.createElement('button');btn.className='menu-item';btn.id='quranExplorerButton';btn.type='button';btn.textContent='🧭 خريطة القرآن ورحلاته';
    const before=$('searchButton'); if(before)menu.insertBefore(btn,before);else menu.appendChild(btn);
    const style=document.createElement('style');style.textContent=`#quranExplorerOverlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:14px}#quranExplorerOverlay.open{display:flex}.qe-box{width:min(620px,100%);max-height:88vh;overflow:auto;background:var(--popup-bg,#fff);color:var(--text-color,#222);border-radius:18px;padding:16px;box-shadow:0 12px 40px #0005}.qe-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.qe-head h2{font-size:19px;margin:0}.qe-close,.qe-tab,.qe-item,.qe-action{border:0;border-radius:10px;padding:10px 12px;font:inherit;cursor:pointer}.qe-close{font-size:24px;background:transparent;color:inherit}.qe-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.qe-tab{background:#e8eee9;color:#174b2c}.qe-tab.active{background:#168443;color:white}.qe-content{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:8px}.qe-item{background:rgba(22,132,67,.10);color:inherit;text-align:right;border:1px solid rgba(22,132,67,.2)}.qe-item small{display:block;opacity:.7;margin-top:4px}.qe-note{line-height:1.7;opacity:.8}.qe-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.qe-action{background:#168443;color:white}.qe-verse{width:100%;min-height:70px;border-radius:10px;padding:10px;border:1px solid #aaa;background:transparent;color:inherit;font:inherit} .qe-current-position{border:1px solid rgba(22,132,67,.35);background:rgba(22,132,67,.08);border-radius:14px;padding:12px;margin:10px 0 16px}.qe-current-title{font-weight:700;margin-bottom:6px}.qe-current-meta{line-height:1.8;margin-bottom:10px}`;document.head.appendChild(style);
    const overlay=document.createElement('div');overlay.id='quranExplorerOverlay';overlay.innerHTML=`<section class="qe-box" role="dialog" aria-modal="true"><header class="qe-head"><h2>🧭 خريطة القرآن ورحلاته</h2><button class="qe-close" id="qeClose" aria-label="إغلاق">×</button></header><nav class="qe-tabs"><button class="qe-tab active" data-tab="map">خريطة القرآن</button><button class="qe-tab" data-tab="stories">قصص القرآن</button><button class="qe-tab" data-tab="journey">رحلة داخل القرآن</button><button class="qe-tab" data-tab="widget">الويدجت القرآني</button></nav><div id="qeContent"></div></section>`;
    document.body.appendChild(overlay);
    $('quranExplorerButton').addEventListener('click',()=>open('map'));
    $('qeClose').addEventListener('click',close);overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.tab)));
  }
  function open(tab){ensureUI();const ov=$('quranExplorerOverlay');if(!ov)return;ov.classList.add('open');ov.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));render(tab);}
  function close(){const ov=$('quranExplorerOverlay');if(ov)ov.classList.remove('open');}
  function render(tab){const host=$('qeContent');if(!host)return;
    if(tab==='map'){
      host.innerHTML='<p class="qe-note">تابع موضع قراءتك الحالي، أو اختر جزءًا أو سورة للانتقال مباشرة إلى المصحف.</p><div class="qe-current-position" id="qeCurrentPosition"></div><h3>الأجزاء</h3><div class="qe-content" id="qeJuz"></div><h3>السور</h3><div class="qe-content" id="qeSurahs"></div>';
      juzStarts.forEach((p,i)=>{const b=document.createElement('button');b.className='qe-item';b.textContent='الجزء '+juzNames[i];b.addEventListener('click',()=>goPage(p));$('qeJuz').appendChild(b);});
      getSurahRows().forEach((s,i)=>{const b=document.createElement('button');b.className='qe-item';b.innerHTML=`${i+1}. ${s[0]}<small>صفحة ${s[1]}</small>`;b.addEventListener('click',()=>goPage(s[1]));$('qeSurahs').appendChild(b);});
      lastObservedPage=currentPageNumber();refreshCurrentPosition();
    }else if(tab==='stories'){
      host.innerHTML='<p class="qe-note">اختر قصة لعرض السور التي وردت فيها. مواضع السور هنا دليل تنقّل عام وليست حصرًا لكل الآيات.</p><div class="qe-content" id="qeStories"></div>';
      stories.forEach((s,i)=>{const b=document.createElement('button');b.className='qe-item';b.textContent=s[0];b.addEventListener('click',()=>renderJourney(s[0],s[1]));$('qeStories').appendChild(b);});
    }else if(tab==='journey'){
      host.innerHTML='<p class="qe-note">اختر قصة، ثم تنقّل بين السور التي وردت فيها.</p><div class="qe-content" id="qeJourneys"></div><div id="qeJourneyDetail"></div>';
      stories.forEach(s=>{const b=document.createElement('button');b.className='qe-item';b.textContent=s[0];b.addEventListener('click',()=>renderJourney(s[0],s[1]));$('qeJourneys').appendChild(b);});
    }else if(tab==='widget'){
      const saved=JSON.parse(localStorage.getItem('ayaWidgetVerse')||'null');
      const details=saved&&saved.surah?('السورة: '+(saved.surahName||saved.surah)+' • الآية: '+saved.ayah+' • الصفحة: '+saved.page):'سيتم تحديث الويدجت تلقائيًا عند انتقال التظليل إلى آية جديدة.';
      host.innerHTML='<p class="qe-note">يعرض الويدجت الآية التي يصل إليها التظليل تلقائيًا، مع اسم السورة ورقم الآية والصفحة. اضغط عليه للعودة إلى الموضع نفسه دون تشغيل الصوت.</p><div class="qe-verse" id="qeWidgetText" style="white-space:pre-wrap;text-align:center;line-height:1.9">'+(saved&&saved.text?saved.text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):'لم يتم تحديد آية بعد')+'</div><p class="qe-note" id="qeWidgetMeta">'+details+'</p><p class="qe-note" id="qeWidgetStatus">يُحدّث التطبيق الويدجت تلقائيًا أثناء التلاوة أو عند تغيير الآية المظللة.</p>';
    }
  }
  function renderJourney(title,nums){const detail=$('qeJourneyDetail')||$('qeContent');detail.innerHTML=`<h3>${title}</h3><p class="qe-note">اضغط على اسم السورة للانتقال إلى بدايتها في المصحف.</p><div class="qe-content" id="qeJourneyItems"></div>`;nums.forEach(n=>{const rows=getSurahRows();const name=rows[n-1]?rows[n-1][0]:'سورة '+n;const b=document.createElement('button');b.className='qe-item';b.textContent=name;b.addEventListener('click',()=>goPage(pageForSurah(n)));$('qeJourneyItems').appendChild(b);});}
  document.addEventListener('DOMContentLoaded',ensureUI);if(document.readyState!=='loading')ensureUI();
})();


// مزامنة الويدجت مع الآية النشطة دون التأثير على مشغل الصوت أو التظليل.
(function(){
  'use strict';
  let lastKey='';
  async function publishAyah(info){
    if(!info)return;
    const surah=Number(info.surah), ayah=Number(info.ayah), page=Number(info.page)||0;
    if(!(surah>0&&ayah>0))return;
    const key=surah+':'+ayah+':'+page;
    if(key===lastKey)return;
    lastKey=key;
    try{
      const response=await fetch('https://api.alquran.cloud/v1/ayah/'+surah+':'+ayah+'/quran-uthmani');
      if(!response.ok)throw new Error('Quran text request failed');
      const json=await response.json();
      const verse=(json&&json.data&&json.data.text)||'';
      if(!verse)return;
      const rows=window.surahs||[];
      const surahName=rows[surah-1]?String(rows[surah-1][0]):('سورة '+surah);
      const value={text:verse,surah,ayah,page,surahName,updated:Date.now()};
      localStorage.setItem('ayaWidgetVerse',JSON.stringify(value));
      if(window.AyaQuranWidget&&typeof window.AyaQuranWidget.setVerse==='function'){
        window.AyaQuranWidget.setVerse(verse,surah,ayah,page,surahName);
      }
      const textEl=document.getElementById('qeWidgetText');
      const metaEl=document.getElementById('qeWidgetMeta');
      if(textEl)textEl.textContent=verse;
      if(metaEl)metaEl.textContent='السورة: '+surahName+' • الآية: '+ayah+' • الصفحة: '+page;
    }catch(e){lastKey='';}
  }
  window.addEventListener('aya:active-ayah',e=>publishAyah(e.detail));
  async function openTarget(target){
    if(!target||!target.surah||!target.ayah)return;
    try{
      if(typeof fetchTimingForSurah!=='function'||typeof loadPage!=='function')return;
      const items=await fetchTimingForSurah(Number(target.surah));
      const match=Array.isArray(items)?items.find(x=>Number(x.ayah)===Number(target.ayah)):null;
      const targetPage=(match&&typeof pageFromTiming==='function'?pageFromTiming(match,target.surah):0)||Number(target.page)||1;
      if(match&&typeof drawAyahHighlight==='function'){
        if(typeof clearAyahHighlight==='function')clearAyahHighlight();
        loadPage(targetPage,{keepAudio:true});
        setTimeout(()=>{
          try{
            if(typeof currentPage!=='undefined'&&Number(currentPage)!==Number(targetPage))return;
            drawAyahHighlight(match);
          }catch(e){}
        },700);
      }else{
        loadPage(targetPage,{keepAudio:true});
      }
    }catch(e){}
  }
  function pollTarget(){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      try{
        if(window.AyaQuranWidget&&typeof window.AyaQuranWidget.consumeTarget==='function'){
          const raw=window.AyaQuranWidget.consumeTarget();
          if(raw){clearInterval(timer);openTarget(JSON.parse(raw));return;}
        }
      }catch(e){}
      if(tries>=40)clearInterval(timer);
    },350);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pollTarget,{once:true});
  else pollTarget();
})();
