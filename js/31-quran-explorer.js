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
  function currentPageNumber(){return Math.max(1,Math.min(604,Number(localStorage.getItem('quranPage')||1)));}
  function currentJuzIndex(page){let index=0;for(let i=0;i<juzStarts.length;i++){if(page>=juzStarts[i])index=i;else break;}return index;}
  function currentSurahIndex(page){const rows=getSurahRows();let index=0;for(let i=0;i<rows.length;i++){if(page>=Number(rows[i][1]))index=i;else break;}return index;}
  function refreshCurrentPosition(){
    const host=$('qeCurrentPosition');if(!host)return;
    const page=currentPageNumber(),rows=getSurahRows(),si=currentSurahIndex(page),ji=currentJuzIndex(page);
    const surahName=rows[si]?rows[si][0]:'—';
    const ayahText=activeAyah&&Number(activeAyah.page)===page?' • الآية '+Number(activeAyah.ayah):'';
    host.innerHTML='<div class="qe-current-title">📍 موضعك الحالي في المصحف</div>'+
      '<div class="qe-current-meta">سورة '+surahName+ayahText+'<br>الجزء '+juzNames[ji]+' • الصفحة '+page+' من 604</div>'+
      '<button type="button" class="qe-action" id="qeGoCurrent">العودة إلى موضعي الحالي</button>';
    const go=$('qeGoCurrent');if(go)go.addEventListener('click',()=>{try{if(typeof loadPage==='function')loadPage(page,{keepAudio:true});}catch(e){}close();});
  }
  const $=id=>document.getElementById(id);
  const getSurahRows=()=>typeof surahs!=='undefined'&&Array.isArray(surahs)?surahs:[];
  function pageForSurah(n){const rows=getSurahRows();return (rows[n-1]&&Number(rows[n-1][1]))?Number(rows[n-1][1]):1;}
  function goPage(n){try{if(typeof loadPage==='function')loadPage(Math.max(1,Math.min(604,Number(n)||1)));}catch(e){} close();}
  window.addEventListener('aya:active-ayah',e=>{
    if(e&&e.detail)activeAyah={surah:Number(e.detail.surah),ayah:Number(e.detail.ayah),page:Number(e.detail.page)||currentPageNumber()};
    refreshCurrentPosition();
  });
  setInterval(()=>{const page=currentPageNumber();if(page!==lastObservedPage){lastObservedPage=page;refreshCurrentPosition();}},500);
  function ensureUI(){
    if($('quranExplorerOverlay'))return;
    const menu=$('sideMenu'); if(!menu)return;
    const btn=document.createElement('button');btn.className='menu-item';btn.id='quranExplorerButton';btn.type='button';btn.textContent='🧭 خريطة القرآن ورحلاته';
    const before=$('searchButton'); if(before)menu.insertBefore(btn,before);else menu.appendChild(btn);
    const style=document.createElement('style');style.textContent=`#quranExplorerOverlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:14px}#quranExplorerOverlay.open{display:flex}.qe-box{width:min(620px,100%);max-height:88vh;overflow:auto;background:var(--popup-bg,#fff);color:var(--text-color,#222);border-radius:18px;padding:16px;box-shadow:0 12px 40px #0005}.qe-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.qe-head h2{font-size:19px;margin:0}.qe-close,.qe-tab,.qe-item,.qe-action{border:0;border-radius:10px;padding:10px 12px;font:inherit;cursor:pointer}.qe-close{font-size:24px;background:transparent;color:inherit}.qe-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.qe-tab{background:#e8eee9;color:#174b2c}.qe-tab.active{background:#168443;color:white}.qe-content{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:8px}.qe-item{background:rgba(22,132,67,.10);color:inherit;text-align:right;border:1px solid rgba(22,132,67,.2)}.qe-item small{display:block;opacity:.7;margin-top:4px}.qe-note{line-height:1.7;opacity:.8}.qe-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.qe-action{background:#168443;color:white}.qe-verse{width:100%;min-height:70px;border-radius:10px;padding:10px;border:1px solid #aaa;background:transparent;color:inherit;font:inherit}.qe-accordion{display:flex;flex-direction:column;gap:10px;margin-top:12px}.qe-journey-row{width:100%}.qe-journey-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:14px;text-align:right;border:1px solid rgba(200,220,235,.18);border-radius:14px;padding:15px 16px;background:rgba(55,72,88,.42);color:inherit;font:inherit;cursor:pointer}.qe-journey-arrow{font-size:22px;transition:transform .2s ease;color:#69cf91;flex:0 0 auto}.qe-journey-toggle.expanded .qe-journey-arrow{transform:rotate(180deg)}.qe-journey-panel{padding:12px 4px 4px}.qe-journey-panel[hidden]{display:none}.qe-journey-panel h3{margin:4px 0 8px}.qe-journey-panel .qe-content{grid-template-columns:1fr;gap:8px}.qe-story-event{width:100%;margin:0 0 9px}.qe-story-event-toggle{display:grid!important;grid-template-columns:1fr auto;align-items:center;gap:5px 10px;text-align:right}.qe-story-event-toggle small{grid-column:1/-1;display:block;opacity:.72;font-size:.88em}.qe-story-event-toggle .qe-journey-arrow{grid-column:2;grid-row:1}.qe-story-event-detail{padding:12px 14px 14px;margin-top:6px;border:1px solid rgba(200,220,235,.14);border-radius:12px;background:rgba(20,35,48,.22)}.qe-story-event-detail[hidden]{display:none}.qe-story-event-detail p{line-height:1.9;margin:0 0 12px}.qe-story-go{width:100%;background:rgba(24,132,67,.85)!important;color:#fff!important;border-color:rgba(105,207,145,.5)!important}
/* الواجهة الزجاجية الجديدة: اجعل الخريطة تتبعها حتى في الوضع النهاري */
body.interface-new #quranExplorerOverlay .qe-box{background:rgba(28,42,56,.96);color:#f4f7f9;border:1px solid rgba(200,220,235,.22);box-shadow:0 16px 48px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.06)}
body.interface-new #quranExplorerOverlay .qe-head h2{color:#fff}
body.interface-new #quranExplorerOverlay .qe-tab{background:rgba(55,72,88,.72);color:#f4f7f9;border:1px solid rgba(200,220,235,.16)}
body.interface-new #quranExplorerOverlay .qe-tab.active{background:#50c878;color:#0a2018;border-color:#50c878}
body.interface-new #quranExplorerOverlay .qe-item{background:rgba(55,72,88,.58);color:#f4f7f9;border:1px solid rgba(200,220,235,.16)}
body.interface-new #quranExplorerOverlay .qe-item:active{background:rgba(70,92,110,.78)}body.interface-new #quranExplorerOverlay .qe-journey-toggle{background:rgba(55,72,88,.40);color:#f4f7f9;border:1px solid rgba(200,220,235,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}body.interface-new #quranExplorerOverlay .qe-journey-toggle.expanded{background:rgba(65,91,108,.58);border-color:rgba(105,207,145,.5)}body.night-mode #quranExplorerOverlay .qe-journey-toggle{background:#303a32;color:#f1f1f1;border-color:#49634f}
body.interface-new #quranExplorerOverlay .qe-note{color:rgba(230,238,244,.82)}
body.interface-new #quranExplorerOverlay .qe-verse{border-color:rgba(200,220,235,.3);color:#f4f7f9}
/* مطابقة دقيقة لزجاج القائمة الجانبية في الواجهة الجديدة */
body.interface-new #quranExplorerOverlay{background:rgba(0,0,0,.20)}
body.interface-new #quranExplorerOverlay .qe-box{
  background:rgba(28,42,56,.72) !important;
  border:1px solid rgba(200,220,235,.22) !important;
  box-shadow:14px 0 40px rgba(0,0,0,.40),inset -1px 0 rgba(255,255,255,.06) !important;
  backdrop-filter:blur(18px) saturate(135%) !important;
  -webkit-backdrop-filter:blur(18px) saturate(135%) !important;
  color:#f4f7f9 !important;
}
body.interface-new #quranExplorerOverlay .qe-head h2{color:#fff !important}
body.interface-new #quranExplorerOverlay .qe-tab,
body.interface-new #quranExplorerOverlay .qe-item{
  background:rgba(55,72,88,.40) !important;
  border:1px solid rgba(200,220,235,.12) !important;
  color:#f4f7f9 !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05) !important;
}
body.interface-new #quranExplorerOverlay .qe-tab.active{
  background:var(--green,#168443) !important;color:#fff !important;border-color:rgba(125,222,168,.45) !important;
}
body.interface-new #quranExplorerOverlay .qe-item:active,
body.interface-new #quranExplorerOverlay .qe-tab:active{background:rgba(70,92,110,.55) !important}
body.interface-new #quranExplorerOverlay .qe-note{color:rgba(244,247,249,.78) !important}
body.interface-new #quranExplorerOverlay .qe-verse{
  background:rgba(55,72,88,.40) !important;border:1px solid rgba(200,220,235,.22) !important;color:#f4f7f9 !important;
}
body.interface-new.night-mode #quranExplorerOverlay .qe-box{background:rgba(20,30,40,.78) !important}
body.interface-new.night-mode #quranExplorerOverlay .qe-box{background:rgba(20,30,40,.98);color:#f4f7f9}
body.night-mode #quranExplorerOverlay .qe-box{background:#242424;color:#f2f2f2;border:1px solid #444}
body.night-mode #quranExplorerOverlay .qe-tab{background:#383838;color:#e5e5e5;border:1px solid #505050}
body.night-mode #quranExplorerOverlay .qe-tab.active{background:var(--green,#16803b);color:#fff;border-color:var(--green,#16803b)}
body.night-mode #quranExplorerOverlay .qe-item{background:#303a32;color:#f1f1f1;border-color:#49634f}
body.night-mode #quranExplorerOverlay .qe-verse{border-color:#555;color:#f2f2f2}
body.night-mode #quranExplorerOverlay .qe-note{color:#d0d0d0}
`;document.head.appendChild(style);
    const positionStyle=document.createElement('style');
    positionStyle.textContent='.qe-current-position{border:1px solid rgba(22,132,67,.35);background:rgba(22,132,67,.08);border-radius:14px;padding:12px;margin:10px 0 16px}.qe-current-title{font-weight:700;margin-bottom:6px}.qe-current-meta{line-height:1.8;margin-bottom:10px}';
    document.head.appendChild(positionStyle);
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
      host.innerHTML='<p class="qe-note">اختر قصة لعرض أحداثها ومواضعها في القرآن، ثم اضغط على الحدث للانتقال إلى الآية.</p><div class="qe-accordion" id="qeStories"></div>';
      storyDetails.forEach((s,index)=>{
        const row=document.createElement('div');row.className='qe-journey-row';
        const b=document.createElement('button');b.type='button';b.className='qe-journey-toggle';
        const title=document.createElement('span');title.textContent=s.title;
        const arrow=document.createElement('span');arrow.className='qe-journey-arrow';arrow.textContent='▾';arrow.setAttribute('aria-hidden','true');
        b.append(title,arrow);
        const panel=document.createElement('div');panel.className='qe-journey-panel';panel.hidden=true;
        b.setAttribute('aria-expanded','false');
        b.addEventListener('click',()=>{
          const opening=panel.hidden;
          host.querySelectorAll('.qe-journey-panel').forEach(p=>p.hidden=true);
          host.querySelectorAll('.qe-journey-toggle').forEach(t=>{t.setAttribute('aria-expanded','false');t.classList.remove('expanded');});
          if(opening){panel.hidden=false;b.setAttribute('aria-expanded','true');b.classList.add('expanded');renderStoryDetail(s,panel);}
        });
        row.append(b,panel);$('qeStories').appendChild(row);
      });
    }else if(tab==='journey'){
      host.innerHTML='<p class="qe-note">اختر رحلة لعرض محطاتها القرآنية، ثم اضغط على المحطة للانتقال إلى موضعها.</p><div class="qe-accordion" id="qeJourneys"></div>';
      journeyDetails.forEach((j,index)=>{
        const row=document.createElement('div');row.className='qe-journey-row';
        const b=document.createElement('button');b.type='button';b.className='qe-journey-toggle';
        const title=document.createElement('span');title.textContent=j.title;
        const arrow=document.createElement('span');arrow.className='qe-journey-arrow';arrow.textContent='▾';arrow.setAttribute('aria-hidden','true');
        b.append(title,arrow);
        const panel=document.createElement('div');panel.className='qe-journey-panel';panel.hidden=true;
        b.setAttribute('aria-expanded','false');
        b.addEventListener('click',()=>{
          const opening=panel.hidden;
          host.querySelectorAll('.qe-journey-panel').forEach(p=>p.hidden=true);
          host.querySelectorAll('.qe-journey-toggle').forEach(t=>{t.setAttribute('aria-expanded','false');t.classList.remove('expanded');});
          if(opening){panel.hidden=false;b.setAttribute('aria-expanded','true');b.classList.add('expanded');renderJourney(j,panel);}
        });
        row.append(b,panel);$('qeJourneys').appendChild(row);
      });
    }else if(tab==='widget'){
      const saved=JSON.parse(localStorage.getItem('ayaWidgetVerse')||'null');
      const details=saved&&saved.surah?('السورة: '+(saved.surahName||saved.surah)+' • الآية: '+saved.ayah+' • الصفحة: '+saved.page):'سيتم تحديث الويدجت تلقائيًا عند انتقال التظليل إلى آية جديدة.';
      host.innerHTML='<p class="qe-note">يعرض الويدجت الآية التي يصل إليها التظليل تلقائيًا، مع اسم السورة ورقم الآية والصفحة. اضغط عليه للعودة إلى الموضع نفسه دون تشغيل الصوت.</p><div class="qe-verse" id="qeWidgetText" style="white-space:pre-wrap;text-align:center;line-height:1.9">'+(saved&&saved.text?saved.text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):'لم يتم تحديد آية بعد')+'</div><p class="qe-note" id="qeWidgetMeta">'+details+'</p><p class="qe-note" id="qeWidgetStatus">يُحدّث التطبيق الويدجت تلقائيًا أثناء التلاوة أو عند تغيير الآية المظللة.</p>';
    }
  }
  const storyDetails=[
    {title:'آدم عليه السلام',events:[
      ['خلق آدم واستخلافه في الأرض',2,30],['تعليم آدم الأسماء',2,31],['عرض الأسماء على الملائكة',2,32],['الأمر بالسجود لآدم وامتناع إبليس',2,34],['إسكان آدم وزوجه الجنة والنهي عن الشجرة',2,35],['وسوسة الشيطان والأكل من الشجرة',7,20],['ظهور السوءات والندم',7,22],['هبوط آدم وزوجه إلى الأرض',2,36],['تلقي آدم كلمات التوبة وقبول الله توبته',2,37],['دعاء آدم وزوجه بالمغفرة',7,23],['بيان عداوة إبليس لبني آدم',7,24],['وصية الله لبني آدم باتباع الهدى',2,38],['قصة ابني آدم وقربان القربان',5,27]
    ]},
    {title:'نوح عليه السلام',events:[
      ['دعوة نوح قومه إلى عبادة الله',7,59],['إنذار قومه ودعوتهم ليلًا ونهارًا',71,5],['موقف الملأ من دعوته',11,27],['صبر نوح على تكذيب قومه',26,116],['الأمر بصنع السفينة',11,37],['سخرية قومه من السفينة',11,38],['بداية الطوفان وفوران التنور',11,40],['ركوب المؤمنين وأهل نوح السفينة',11,40],['موج الطوفان وغرق الابن',11,42],['نداء نوح لربه بشأن ابنه',11,45],['انتهاء الطوفان واستواء السفينة على الجودي',11,44],['دعاء نوح واستغفاره',71,26]
    ]},
    {title:'هود عليه السلام',events:[
      ['دعوة عاد إلى عبادة الله',7,65],['تذكير قومه بنعم الله وقوتهم',7,69],['تكذيب قومه وطلبهم العذاب',11,53],['تبرؤ هود من شركهم وتوكله على الله',11,54],['بشارة هود بنجاة المؤمنين',11,58],['إهلاك عاد بريح صرصر عاتية',54,19],['نجاة هود والذين آمنوا معه',11,58]
    ]},
    {title:'صالح عليه السلام',events:[
      ['دعوة ثمود إلى عبادة الله',7,73],['ناقة الله آية لقوم ثمود',7,73],['النهي عن مس الناقة بسوء',11,64],['عقر الناقة ومكر القوم',11,65],['تحذير صالح لهم من العذاب',11,65],['مؤامرة القوم على صالح وأهله',27,48],['نجاة صالح والمؤمنين',11,66],['الصيحة وأخذ الظالمين',11,67]
    ]},
    {title:'إبراهيم عليه السلام',events:[
      ['ابتلاء إبراهيم بالكلمات وإمامته للناس',2,124],['دعاؤه أن يجعل مكة بلدًا آمنًا',2,126],['رفع قواعد الكعبة مع إسماعيل',2,127],['دعاؤه ببعثة رسول في ذريته',2,129],['إنكاره عبادة الأصنام على أبيه',19,42],['محاجته قومه في عبادة الكواكب',6,76],['تحطيم الأصنام وترك كبيرها',21,58],['إلقاؤه في النار وجعلها بردًا وسلامًا',21,69],['هجرته واعتزاله قومه',19,48],['بشارة الملائكة له بإسحاق',11,71],['ضيوف إبراهيم وبشارة الغلام',15,51],['دعاؤه لذريته وإسكانهم عند البيت الحرام',14,37],['الرؤيا وابتلاء الذبح مع إسماعيل',37,102],['فداء إسماعيل بذبح عظيم',37,107]
    ]},
    {title:'لوط عليه السلام',events:[
      ['دعوة لوط قومه وبيان فاحشة فعلهم',7,80],['إصرار القوم وتهديدهم بإخراجه',26,167],['قدوم الملائكة إلى لوط',11,77],['ضيق لوط بضيوفه وخوفه عليهم',11,77],['إخبار الملائكة بحقيقتهم وبشارة النجاة',11,81],['إخراج أهل لوط ليلًا إلا امرأته',11,81],['قلب القرية وإمطارها بحجارة من سجيل',11,82],['نجاة لوط وأهله إلا امرأته',7,83]
    ]},
    {title:'يوسف عليه السلام',events:[
      ['رؤيا يوسف وروايتها لأبيه',12,4],['تحذير يعقوب يوسف من قص الرؤيا على إخوته',12,5],['اتفاق الإخوة على إبعاده',12,9],['إلقاء يوسف في غيابة الجب',12,15],['عثر القافلة عليه وبيعه',12,19],['مراودة امرأة العزيز ليوسف',12,23],['ظهور براءة يوسف وشهادة الشاهد',12,26],['دخول يوسف السجن',12,35],['تأويل رؤيا صاحبي السجن',12,36],['تأويل رؤيا الملك',12,43],['ظهور براءة يوسف أمام الملك',12,51],['تولي يوسف خزائن الأرض',12,55],['قدوم إخوة يوسف إليه',12,58],['تعرف يوسف على إخوته دون أن يعرفوه',12,58],['اجتماع الأسرة وتحقق الرؤيا',12,99],['عفو يوسف عن إخوته',12,92]
    ]},
    {title:'موسى عليه السلام',events:[
      ['ولادة موسى وإلقاؤه في اليم',28,7],['وصول التابوت إلى آل فرعون',28,8],['رد موسى إلى أمه',28,13],['بلوغ موسى أشده وقتله القبطي خطأً',28,14],['خروج موسى من مصر خائفًا',28,21],['وصوله إلى مدين وسقيه للمرأتين',28,23],['زواجه وإقامته في مدين',28,27],['تكليم الله موسى عند الطور',20,11],['تكليفه بالرسالة وإرسال هارون معه',20,24],['مواجهة فرعون ودعوته إلى الله',20,47],['آيات موسى أمام فرعون',7,107],['السحرة وإيمانهم برب موسى',7,120],['خروج بني إسرائيل ليلًا',26,52],['انفلاق البحر ونجاة بني إسرائيل',26,63],['غرق فرعون وجنوده',10,90],['ميقات موسى وعبادة العجل في غيبته',7,142],['اتخاذ السامري العجل',20,88],['توبة بني إسرائيل من عبادة العجل',2,54],['قصة البقرة',2,67],['طلب بني إسرائيل رؤية الله جهرة',2,55],['قصة قارون وخسف الأرض به',28,76]
    ]},
    {title:'داود وسليمان عليهما السلام',events:[
      ['قتل داود جالوت',2,251],['إيتاء داود الملك والحكمة',38,20],['تسبيح الجبال والطير مع داود',34,10],['تعليم داود صناعة الدروع',21,80],['خصومة الخصمين عند داود',38,21],['وراثة سليمان لداود والعلم',27,16],['فهم سليمان قضية الحرث',21,78],['تسخير الريح لسليمان',21,81],['تسخير الجن لسليمان',34,12],['تفقد سليمان للطير وغياب الهدهد',27,20],['خبر الهدهد عن ملكة سبأ',27,22],['رسالة سليمان إلى ملكة سبأ',27,28],['قدوم ملكة سبأ وإسلامها',27,44],['وفاة سليمان وعدم علم الجن بموته',34,14]
    ]},
    {title:'أصحاب الكهف',events:[
      ['فتية آمنوا بربهم وزادهم الله هدى',18,13],['اعتزال الفتية قومهم ولجوؤهم إلى الكهف',18,16],['ضرب الله على آذانهم سنين',18,11],['تقليبهم ذات اليمين وذات الشمال',18,18],['بعثهم وإرسال أحدهم بالورق إلى المدينة',18,19],['اكتشاف الناس أمرهم',18,21],['بيان مدة لبثهم',18,25]
    ]},
    {title:'ذو القرنين',events:[
      ['سؤال النبي عن ذي القرنين',18,83],['بلوغه مغرب الشمس وحكمه بين القوم',18,86],['بلوغه مطلع الشمس',18,90],['وصوله بين السدين',18,93],['شكوى القوم من يأجوج ومأجوج',18,94],['بناء الردم بالحديد والقطر',18,95],['عجز يأجوج ومأجوج عن نقب الردم',18,97],['وعد الله بخروجهم عند دك السد',18,98]
    ]},
    {title:'مريم وعيسى عليهما السلام',events:[
      ['نذر امرأة عمران ما في بطنها',3,35],['ولادة مريم وكفالة زكريا لها',3,36],['بشارة الملائكة مريم بعيسى',3,45],['اعتزال مريم قومها',19,16],['تمثل جبريل لمريم بشرًا',19,17],['بشارة مريم بالغلام',19,19],['حمل مريم وولادتها عيسى',19,22],['مخاض مريم عند جذع النخلة',19,23],['عودة مريم إلى قومها وحملها عيسى',19,27],['كلام عيسى في المهد',19,30],['رسالة عيسى إلى بني إسرائيل',3,49],['المائدة ونزولها على الحواريين',5,112],['رفع عيسى وعدم قتله أو صلبه',4,157],['رفع الله عيسى إليه',4,158],['تبرؤ عيسى ممن اتخذوه وأمه إلهين',5,116]
    ]},
    {title:'أصحاب الأخدود',events:[
      ['ذكر أصحاب الأخدود',85,4],['إيقاد النار ذات الوقود',85,5],['تعذيب المؤمنين لإيمانهم',85,10],['ثبات المؤمنين على الإيمان',85,7],['وعد الله للمؤمنين بالجنات',85,11]
    ]},
    {title:'أصحاب الفيل',events:[
      ['كيد أصحاب الفيل لهدم الكعبة',105,1],['إرسال الطير الأبابيل عليهم',105,3],['رميهم بحجارة من سجيل',105,4],['جعلهم كعصف مأكول',105,5]
    ]}
  ];
  const storyIntroductions={
    'آدم عليه السلام':'تبدأ القصة بخلق آدم واستخلافه في الأرض، وتعليم الله له، ثم ابتلاء الشجرة، فالتوبة والهبوط إلى الأرض، وما فيها من دروس عن التكريم والطاعة والتوبة وعداوة الشيطان.',
    'نوح عليه السلام':'تعرض القصة دعوة نوح الطويلة لقومه، وصبره على التكذيب، ثم أمر السفينة والطوفان، ونجاة المؤمنين، وما تكشفه من عاقبة الإيمان والتكذيب.',
    'هود عليه السلام':'تتناول دعوة هود لقوم عاد، وتذكيرهم بنعم الله وقوتهم، وموقفهم من دعوته، ثم نجاة المؤمنين وهلاك المكذبين.',
    'صالح عليه السلام':'تتناول دعوة صالح لثمود، وناقة الله بوصفها آية، وموقف القوم منها، ثم عاقبة العقر والمكر ونجاة المؤمنين.',
    'إبراهيم عليه السلام':'تجمع محطات ابتلاء إبراهيم وتوحيده، ومحاجته لقومه، وتحطيم الأصنام، ونجاته من النار، وبناء الكعبة، وبشارة الذرية وابتلاء الذبح.',
    'لوط عليه السلام':'تعرض دعوة لوط لقومه، وإصرارهم على الفاحشة، وقدوم الملائكة، ثم نجاة لوط وأهله إلا امرأته ونزول العذاب بالقوم.',
    'يوسف عليه السلام':'تسرد القصة رؤيا يوسف، ومحنة إخوته والجب، وابتلاء المراودة والسجن، ثم تأويل الرؤى والتمكين واجتماع الأسرة والعفو.',
    'موسى عليه السلام':'تتبع القصة حياة موسى منذ ولادته ونشأته، وخروجه إلى مدين، وتكليفه بالرسالة، ومواجهته فرعون، ونجاة بني إسرائيل، وما وقع في غيبته.',
    'داود وسليمان عليهما السلام':'تعرض نماذج من ملك داود وسليمان وحكمتهما، وتسخير الله لهما، وقضايا القضاء والملك، وقصة الهدهد وملكة سبأ.',
    'أصحاب الكهف':'تتناول فتية آمنوا بالله وثبتوا على التوحيد، فاعتزلوا قومهم ولجؤوا إلى الكهف، فضرب الله على آذانهم ثم بعثهم آية للناس.',
    'ذو القرنين':'تروي رحلات ذي القرنين إلى مغرب الشمس ومطلعها، ثم وصوله إلى قوم طلبوا الحماية من يأجوج ومأجوج وبناء الردم.',
    'مريم وعيسى عليهما السلام':'تتناول نذر مريم وكفالتها، والبشارة بعيسى وميلاده، وكلامه في المهد ورسالته، ثم بيان القرآن لحقيقة أمره ورفعه.',
    'أصحاب الأخدود':'تصف اضطهاد المؤمنين بسبب إيمانهم، وثباتهم أمام التعذيب بالنار، ووعيد الظالمين ووعد المؤمنين.',
    'أصحاب الفيل':'تذكر محاولة أصحاب الفيل الاعتداء على البيت الحرام، وكيف أبطل الله كيدهم وأرسل عليهم طيرًا أبابيل.'
  };
  function renderStoryDetail(story,target){
    const host=target||$('qeStoryDetail');if(!host)return;
    host.innerHTML='<h3>'+story.title+'</h3><p class="qe-note">'+(storyIntroductions[story.title]||'تتضمن هذه القصة أحداثًا متتابعة، اختر كل حدث لقراءة ملخصه والوصول إلى موضعه في المصحف.')+'</p><p class="qe-note">اضغط على الحدث لعرض تفاصيله، ثم استخدم زر الانتقال لفتح الآية.</p><div class="qe-content" id="qeStoryEvents"></div>';
    const list=host.querySelector('#qeStoryEvents');
    story.events.forEach((ev,index)=>{
      const card=document.createElement('div');card.className='qe-story-event';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='qe-item qe-story-event-toggle';
      const name=document.createElement('span');name.textContent=ev[0];
      const arrow=document.createElement('span');arrow.className='qe-journey-arrow';arrow.textContent='▾';
      const ref=document.createElement('small');ref.textContent='سورة '+(getSurahRows()[ev[1]-1]?.[0]||ev[1])+' • الآية '+ev[2];
      toggle.append(name,arrow,ref);
      const detail=document.createElement('div');detail.className='qe-story-event-detail';detail.hidden=true;
      const explanation=document.createElement('p');
      const storyEventExplanations={
        'خلق آدم واستخلافه في الأرض':'يبدأ المشهد بإخبار الله الملائكة بأنه جاعل في الأرض خليفة. فتسأل الملائكة عن الحكمة، ويأتي الجواب الإلهي بأنه يعلم ما لا يعلمون. تضع الآية أصل قصة الإنسان: خلقه لمهمة في الأرض بعلم الله وحكمته، لا عبثًا ولا مصادفة.',
        'تعليم آدم الأسماء':'يمنح الله آدم علمًا لم تمنحه الملائكة، فيعلّمه أسماء الأشياء ومعانيها. تكشف المحطة عن مكانة العلم في تكريم الإنسان، وأن فضل الله على آدم ظهر في القدرة على المعرفة والتسمية.',
        'عرض الأسماء على الملائكة':'يعرض الله الأسماء على الملائكة ويسألهم عنها، فيقرّون بأن علمهم محدود بما علّمهم الله. ثم يبيّن آدم ما علّمه الله. والمقصود إظهار سعة علم الله ووجه من وجوه الحكمة في استخلاف آدم.',
        'الأمر بالسجود لآدم وامتناع إبليس':'بعد بيان فضل آدم وعلمه، يأمر الله الملائكة بالسجود له تكريمًا وامتثالًا لأمر الله، فيسجدون جميعًا إلا إبليس. يرفض إبليس الأمر استكبارًا، ويقيس نفسه بآدم محتجًا بأنه خُلق من نار وآدم من طين؛ فيتحول التكريم إلى بداية عداوته للإنسان بسبب الكبر والعصيان.',
        'إسكان آدم وزوجه الجنة والنهي عن الشجرة':'يسكن الله آدم وزوجه الجنة ويبيح لهما نعيمها، لكنه ينهاهما عن شجرة معينة ويحذرهما من الاقتراب منها. يوضح المشهد أن الأصل هو سعة الإباحة والنعمة، وأن الابتلاء كان في الالتزام بحدّ واحد.',
        'وسوسة الشيطان والأكل من الشجرة':'يبدأ الشيطان بإغواء آدم وزوجه، ويزيّن لهما المخالفة ويقسم لهما أنه ناصح. فتقع الزلة ويأكلان من الشجرة. تكشف الآية أسلوب الوسوسة: التزيين والخداع وادعاء النصح، وتبين أن عداوة إبليس بدأت بمحاولة صرف الإنسان عن أمر الله.',
        'ظهور السوءات والندم':'بعد الأكل من الشجرة تنكشف لهما سوءاتهما، ويبدآن في ستر نفسيهما من ورق الجنة، ويدركان أثر المخالفة. يبرز المشهد سرعة ظهور عاقبة المعصية، وانتقالهما من الغفلة إلى الشعور بالخطأ.',
        'هبوط آدم وزوجه إلى الأرض':'يأتي الأمر بالهبوط إلى الأرض بعد الزلة، مع بيان أن الأرض ستكون موضع استقرار ومتاع إلى حين، وأن العداوة ستقع بين إبليس وبني آدم. لا تنتهي القصة بالخطأ، بل تبدأ مرحلة التكليف والابتلاء واتباع هدى الله.',
        'تلقي آدم كلمات التوبة وقبول الله توبته':'يتلقى آدم من ربه كلمات يرجع بها إليه، فيتوب الله عليه. تؤكد الآية أن باب التوبة مفتوح، وأن النجاة ليست بإنكار الخطأ بل بالاعتراف والرجوع إلى الله، فهو التواب الرحيم.',
        'دعاء آدم وزوجه بالمغفرة':'يعترف آدم وزوجه بأنهما ظلما أنفسهما، ويسألان الله المغفرة والرحمة. يعلّم دعاؤهما المؤمن صيغة التوبة الصادقة: الاعتراف بالتقصير، وطلب المغفرة، والإقرار بأن الرحمة لا تكون إلا من الله.',
        'بيان عداوة إبليس لبني آدم':'يحذر الله بني آدم من الشيطان، ويذكّرهم بأنه يراهم هو وقبيله من حيث لا يرونهم. تنقل الآية الدرس من حادثة آدم إلى تحذير دائم لكل ذريته: لا يغتر الإنسان بوسوسة عدوه ولا يتخذ الشيطان وليًا.',
        'وصية الله لبني آدم باتباع الهدى':'يبين الله أن من اتبع هداه فلا خوف عليه ولا يحزن، أما من كذب بآياته فله عاقبة الخسران. هذه خلاصة الطريق بعد هبوط آدم: الهداية الإلهية هي سبيل النجاة، والاختيار بين اتباعها والإعراض عنها مسؤولية الإنسان.',
        'قصة ابني آدم وقربان القربان':'تنتقل الآيات إلى ابني آدم لتعرض أثر التقوى والحسد؛ تقبل قربان أحدهما ولا يتقبل من الآخر، فيهدد الحاسد أخاه بالقتل. يذكّره أخوه بأن الله يتقبل من المتقين، ثم تقع أول جريمة قتل، لتظهر خطورة الحسد حين يقود إلى العدوان وسفك الدم.'
      };
      const detailedStoryExplanations={
        'نوح عليه السلام':[
          'يفتتح نوح دعوته بنداء قومه إلى عبادة الله وحده وترك الشرك. يبدأ الإصلاح بتصحيح أصل الاعتقاد، ويعرض عليهم أنه رسول ناصح لا يطلب منهم أجرًا.',
          'يصف نوح طول محاولاته؛ دعا قومه ليلًا ونهارًا، وأعلن الدعوة وأسرّ بها، لكن الإعراض استمر. يبرز هذا التفصيل صبر الداعية وتنوع أساليب النصح.',
          'يرد الملأ على نوح بالنظر إلى أتباعه الفقراء والضعفاء، ويجعلون مكانتهم الاجتماعية مقياسًا للحق. تكشف المحطة كيف يحجب الكبر صاحبه عن قبول الرسالة.',
          'يشتد تكذيب القوم حتى يهددوا نوحًا بالرجم إن لم ينته. ومع ذلك يثبت على البلاغ، ويظهر أن طول الدعوة لا يعني ضمان استجابة الناس.',
          'بعد استمرار التكذيب يأمر الله نوحًا بصنع السفينة تحت رعايته ووحيه. يتحول مسار القصة من الإنذار إلى الاستعداد للنجاة، ويأتي الأمر في وقت لا يرى القوم فيه سببًا ظاهرًا للسفينة.',
          'يسخر القوم من نوح كلما مروا به وهو يصنع السفينة، فيرد بأن السخرية ستنكشف عاقبتها. المشهد يبين الفرق بين الثقة بوعد الله والاستهزاء بما لا يفهمه الناس.',
          'تأتي علامة بدء الطوفان بفوران التنور، ويبدأ الماء بأمر الله. عندها يتحول الإنذار الذي طالما كذّبوه إلى واقع، ويؤمر نوح بحمل المؤمنين ومن شاء الله حمله.',
          'يركب نوح ومن معه السفينة، ويذكر القرآن أن النجاة كانت للمؤمنين ومن شملهم أمر الله. ليست السفينة سببًا مستقلًا للنجاة؛ بل هي وسيلة أذن الله بها لعباده.',
          'ترتفع الأمواج كأنها الجبال، وينادي نوح ابنه ليركب معه ولا يكن مع الكافرين. يرفض الابن ظانًا أن الجبل سيعصمه من الماء، فيظهر أن النسب لا يغني عن الإيمان.',
          'يسأل نوح ربه عن ابنه بدافع الأبوة، فيأتيه البيان أن النجاة مرتبطة بالإيمان والعمل الصالح لا بمجرد القرابة. يتعلم نوح حدّ ما يعلم، ويرجع إلى الله مستعيذًا من السؤال بغير علم.',
          'يأمر الله الأرض أن تبتلع ماءها والسماء أن تقلع، وينحسر الطوفان وتستقر السفينة على الجودي. تنتهي المحنة بأمر الله كما بدأت، ويظهر مصير المكذبين ونجاة المؤمنين.',
          'يدعو نوح ربه ويستغفر مما لا يحيط بعلمه، ويسأله الرحمة. تختم محطاته بالتواضع لله، فحتى النبي يرد الأمر كله إلى علم الله وحكمته.'
        ],
        'هود عليه السلام':[
          'يدعو هود قوم عاد إلى عبادة الله وحده، ويذكرهم بأنه لا يطلب منهم أجرًا. تبدأ دعوته بإصلاح التوحيد قبل مناقشة مظاهر القوة والعمران.',
          'يذكّرهم بأن الله جعلهم خلفاء من بعد قوم نوح وزادهم في الخلق بسطة، ويدعوهم إلى تذكر النعمة. القوة ليست دليل استغناء، بل مسؤولية تستوجب الشكر والطاعة.',
          'يرفض قوم عاد دعوته ويتهمونه بالسفه، ويطالبونه بالعذاب الذي يحذرهم منه. يكشف الرد إصرارهم على التكذيب بدل مراجعة أنفسهم.',
          'يعلن هود براءته من آلهتهم الباطلة وتوكله على الله، ويتحداهم أن يكيدوا له دون إمهال. يبين موقفه أن الثبات يأتي من الاعتماد على الله لا من قوة بشرية.',
          'ينجي الله هودًا والذين آمنوا معه برحمة منه، بعد أن استحق المكذبون العذاب. تفرق الآيات بين مصير من استجاب ومصير من أصر على الكفر.',
          'تصف الآيات الريح الشديدة التي سلطت على عاد، واستمرت عليهم حتى أهلكتهم. كانت القوة التي اغتروا بها عاجزة أمام أمر الله.',
          'تؤكد المحطة نجاة هود والمؤمنين، فتربط الخاتمة بين الإيمان والرحمة الإلهية، وتعرض هلاك عاد عبرة لمن يغتر بالقوة.'
        ],
        'صالح عليه السلام':[
          'يدعو صالح ثمود إلى عبادة الله، ويذكرهم بأنه أنشأهم من الأرض ومكّن لهم فيها. يجمع خطابه بين أصل الخلق وواجب الإصلاح في الأرض.',
          'يجعل الله الناقة آية ظاهرة لقوم ثمود، لتكون حجة على صدق صالح. وجود الآية يضعهم أمام اختبار واضح: الإيمان واحترام أمر الله أو المكابرة.',
          'يحدد صالح حق الناقة في الماء ويحذرهم من إيذائها. يبين التنظيم أن الآية ليست موضع عبث، وأن عليهم الالتزام بما أمر الله.',
          'يعقر القوم الناقة متحدين التحذير، ثم يتآمرون على صالح وأهله. تنتقل المخالفة من رفض الرسالة إلى فعل عدواني يستوجب العاقبة.',
          'يذكّرهم صالح بأن أمامهم مهلة قصيرة بعد عقر الناقة، ويحذرهم من حلول العذاب. إنها فرصة أخيرة للتوبة قبل تنفيذ الوعيد.',
          'يتآمر تسعة رهط على صالح وأهله ليلًا، ويقسمون أن ينكروا فعلهم. تكشف الآيات تخطيط الظالمين للغدر، وأن مكرهم لا يخرج عن علم الله وتدبيره.',
          'ينجي الله صالحًا والذين آمنوا معه برحمته من العذاب الذي نزل بالظالمين. تظهر النجاة ثمرة الإيمان والابتعاد عن الفساد.',
          'تأخذ الصيحة ثمودًا في ديارهم فيصبحون جاثمين. تنتهي القصة بإهلاك من عقر الناقة وكذب الرسول، بعد قيام الحجة والإنذار.'
        ],
        'إبراهيم عليه السلام':[
          'يختبر الله إبراهيم بأوامر وابتلاءات فيتمها، فيجعله إمامًا للناس. ويبين الحوار أن الإمامة عهد من الله لا ينالها الظالمون.',
          'يدعو إبراهيم لمكة بالأمن والرزق لأهلها، ويظهر تعلقه بسلامة البلد واستقامة أهله. ويقرن طلب النعمة بالبعد عن عبادة الأصنام.',
          'يرفع إبراهيم وإسماعيل قواعد البيت، وهما يعملان ويدعوان الله أن يتقبل منهما. يعلّم المشهد أن العمل الصالح يحتاج إخلاصًا وطلب قبول، لا إعجابًا بالعمل.',
          'يسأل إبراهيم أن يبعث الله في ذريته رسولًا يتلو عليهم آياته ويعلمهم الكتاب والحكمة ويزكيهم. يجمع دعاؤه بين صلاح النسل والهداية والتعليم.',
          'يناقش إبراهيم أباه في عبادة ما لا يسمع ولا يبصر ولا يغني عنه شيئًا. يحافظ على أدب الخطاب مع وضوح الحجة ورفض الشرك.',
          'ينظر إبراهيم في الكواكب والقمر والشمس ضمن محاجته لقومه، ويبين أن الآفل المتغير لا يصلح أن يكون ربًا. يقودهم من التأمل في المخلوقات إلى توحيد خالقها.',
          'يحطم إبراهيم الأصنام ويترك كبيرها ليواجه قومه بسؤال يكشف عجز آلهتهم. يستخدم الموقف لإقامة الحجة على أن ما لا ينطق ولا يدفع عن نفسه لا يستحق العبادة.',
          'يلقي القوم إبراهيم في النار عقوبة له على دعوته، فيجعلها الله بردًا وسلامًا عليه. تتجلى قدرة الله في تعطيل أثر النار وإنقاذ عبده.',
          'يعتزل إبراهيم قومه وما يعبدون من دون الله، ويتوجه إلى ربه راجيًا الهداية والذرية الصالحة. الهجرة هنا موقف إيماني حين يتعذر إظهار التوحيد بين قوم معاندين.',
          'تبشر الملائكة إبراهيم وزوجه بإسحاق، فتتعجب الزوجة من البشارة مع كبر السن. يذكر الحوار أن رحمة الله وبركته لا تقف عند حدود المألوف.',
          'يستضيف إبراهيم ضيوفًا لا يعرفهم، ويقدم إليهم الطعام، ثم يطمئنونه ويخبرونه بالبشارة. يجمع المشهد بين إكرام الضيف وبشارة الله لعبده.',
          'يدعو إبراهيم لذريته ويذكر إسكان بعضهم عند البيت الحرام، ويسأل الله أن يقيموا الصلاة وأن تهوي إليهم أفئدة من الناس. يربط الدعاء بين العبادة وأمن المكان ورزق أهله.',
          'يرى إبراهيم في المنام أنه يذبح ابنه، فيعرض الرؤيا على إسماعيل فيستجيب لأمر الله. يظهر ابتلاء الطاعة من الطرفين، مع تسليم الأب والابن لحكم الله.',
          'يفدي الله إسماعيل بذبح عظيم بعد صدق الاستسلام، ويجعل لإبراهيم الثناء الحسن. لا تقع التضحية بالابن؛ بل تنتهي المحنة بالفداء وظهور معنى الطاعة.'
        ],
        'لوط عليه السلام':[
          'ينكر لوط على قومه إتيان الفاحشة التي لم يسبقهم بها أحد من العالمين، ويدعوهم إلى التقوى. يواجه الانحراف ببيان قبحه ومخالفته للفطرة والحدود.',
          'يرد القوم على النصح بالتهديد والإخراج بدل التوبة، ويظهر إصرارهم على رفض الإصلاح. تصبح الخصومة مع الرسول بسبب تمسكه بالطهارة والحق.',
          'يأتي الملائكة إلى لوط في صورة ضيوف، فيضيق بهم ويخشى اعتداء قومه عليهم. يمهد المشهد للمحنة التي يواجهها النبي في حماية ضيوفه.',
          'يشتد قلق لوط حين يعلم بإقبال قومه على ضيوفه، ويشعر بالضيق لضعف قدرته على ردهم. يعرض القرآن شدة الموقف الإنساني قبل ظهور الفرج الإلهي.',
          'تخبر الملائكة لوطًا بحقيقتهم، وتطمئنه أن قومه لن يصلوا إليه، وتأمره بالخروج بأهله ليلًا. يتحول الخوف إلى بشارة بالنجاة وتحديد لطريق الخروج.',
          'يؤمر لوط وأهله بالخروج في جزء من الليل، مع استثناء امرأته التي كان لها موقفها من القوم. توضح المحطة أن النجاة بالإيمان لا بمجرد صلة القرابة.',
          'ينزل العذاب بالقرية، فيقلب عاليها سافلها ويمطر عليها حجارة معلومة. تأتي العقوبة بعد الإصرار على الفاحشة وتكذيب الرسول.',
          'ينجي الله لوطًا وأهله المؤمنين إلا امرأته، فتؤكد الخاتمة أن الولاء للحق هو معيار النجاة، وأن القرب من النبي لا ينفع مع مخالفة الإيمان.'
        ],
        'يوسف عليه السلام':[
          'يقص يوسف على أبيه رؤياه: أحد عشر كوكبًا والشمس والقمر يسجدون له. يدرك يعقوب ما قد تحمله الرؤيا فيحذره من إخبار إخوته بها.',
          'يحذر يعقوب يوسف من قص الرؤيا على إخوته خشية الحسد ومكر الشيطان. تكشف المحطة حكمة الأب في حماية ابنه مع طمأنته بحسن تدبير الله.',
          'يتشاور الإخوة في إبعاد يوسف عن أبيهم بدافع الغيرة، ويقترحون قتله أو طرحه أرضًا. يبين الحوار كيف يحول الحسد المحبة الأسرية إلى تدبير للأذى.',
          'يلقي الإخوة يوسف في غيابة الجب وينفذون خطتهم، ثم يبدأ ابتلاؤه بعيدًا عن أبيه. ومع قسوة الحدث يأتي وعد الله له بأنه سينبئهم بأمرهم وهم لا يشعرون.',
          'تمر قافلة بالبئر فتخرج يوسف، ثم يباع بثمن قليل. ينتقل من الجب إلى بيت العزيز، وتبدأ مرحلة جديدة من الابتلاء والرعاية الإلهية.',
          'تراود امرأة العزيز يوسف عن نفسه، فيستعصم بالله ويستعيذ به. يوضح الموقف ثبات يوسف أمام الإغراء، وتقديمه طاعة الله على المنفعة العاجلة.',
          'تظهر قرائن براءة يوسف، ويشهد شاهد من أهلها بما يميز صدقه. تتحول القضية من اتهام إلى ظهور الحقيقة، وإن لم تنته آثارها فورًا.',
          'يدخل يوسف السجن رغم ظهور ما يدل على براءته، فيصبر ولا يجعل الظلم سببًا لترك الدعوة. داخل السجن يبدأ فصل جديد من إحسانه إلى من حوله.',
          'يسأل صاحبا السجن يوسف عن رؤياهما، فيدعوهما أولًا إلى التوحيد ثم يفسر لهما الرؤيا. يجمع بين اغتنام الفرصة للدعوة والإحسان في التعامل.',
          'يرى الملك رؤيا تحير الملأ، فيتذكر الساقي يوسف ويطلب تفسيرها. يفسر يوسف السنوات المقبلة ويقدم خطة عملية لمواجهة القحط.',
          'يطلب يوسف التحقق من قضيته قبل الخروج، فتظهر براءته على لسان امرأة العزيز والنسوة. يحرص على أن يخرج وقد انكشفت الحقيقة لا بمجرد زوال السجن.',
          'يعهد الملك إلى يوسف بخزائن الأرض لما ظهر من أمانته وعلمه. ينتقل يوسف من السجن إلى مسؤولية إدارة موارد البلاد في زمن الشدة.',
          'يأتي إخوة يوسف إلى مصر طلبًا للميرة، فيعرفهم يوسف وهم لا يعرفونه. يبدأ تدبير يجمع شمل الأسرة ويختبر تغير حال الإخوة.',
          'يحتفظ يوسف بهويته عن إخوته في اللقاء الأول، ويطلب منهم إحضار أخيهم. تتقدم الأحداث بخطة محسوبة تمهد لاجتماع الأسرة وظهور الحقائق.',
          'يدخل يعقوب وأهل يوسف عليه، ويتحقق معنى الرؤيا القديمة. تنتهي سنوات الفراق بلقاء الأسرة وظهور فضل الله في تدبيره.',
          'يعفو يوسف عن إخوته بعد أن صار قادرًا على مؤاخذتهم، ولا يواجههم بالانتقام. يختار الصفح ويذكرهم برحمة الله، فتكتمل القصة بالعفو بعد التمكين.'
        ],
        'موسى عليه السلام':[
          'حين خافت أم موسى عليه من بطش فرعون، ألهمها الله أن تضعه في التابوت وتلقيه في اليم، ووعدها برده إليها وجعله من المرسلين. يجتمع في المشهد الخوف البشري والثقة بوعد الله.',
          'يلتقط آل فرعون التابوت، فيدخل موسى بيت من كان سبب الخطر عليه. يسوق الله الأسباب ليكون الطفل في رعاية القصر الذي أراد قتل أبناء قومه.',
          'يرفض موسى المراضع، فتدل أخته آل فرعون على من يكفله، فيرده الله إلى أمه. يتحقق الوعد الإلهي وتقر عين الأم بعد الخوف والفراق.',
          'يبلغ موسى أشده، ويقع منه قتل القبطي دون قصد القتل، فيستغفر الله ويعترف بذنبه. تعرض الآيات خطأه ثم توبته، ولا تجعله متعمدًا للقتل.',
          'يخرج موسى من مصر خائفًا يترقب بعد انتشار خبر الحادثة، ويدعو ربه أن ينجيه من القوم الظالمين. تبدأ مرحلة الغربة والاعتماد على الله.',
          'يصل موسى إلى ماء مدين فيسقي للمرأتين بعد أن رأى عجزهما عن مزاحمة الرعاة، ثم يأوي إلى الظل ويدعو ربه. يظهر خلقه في المبادرة إلى المساعدة مع حاجته.',
          'يدعوه والد المرأتين ويعرض عليه الزواج بإحدى ابنتيه مقابل العمل عنده مدة معلومة، فيقبل موسى. تمثل هذه المرحلة استقرارًا بعد الغربة وبداية حياة جديدة.',
          'يسمع موسى النداء عند الطور ويكلمه الله ويختاره للرسالة. يأمره بالتوحيد وإقامة الصلاة، ويمنحه من الآيات ما يؤيده في مهمته.',
          'يأمر الله موسى أن يذهب إلى فرعون، ويطلب موسى أن يكون هارون معه معينًا له في البلاغ. تظهر أهمية الاستعانة بالله وطلب العون في حمل الرسالة.',
          'يذهب موسى وهارون إلى فرعون ويطالبانه بإرسال بني إسرائيل ويدعوانه إلى الإيمان. يبدأ الحوار بإبلاغ الرسالة وبيان أن السلام على من اتبع الهدى.',
          'يؤيد الله موسى بالآيات، فتنقلب عصاه حية ويظهر يده بيضاء للناظرين. يواجه فرعون الدليل بمعاندته واتهام السحر بدل الاعتبار.',
          'يلقي السحرة حبالهم وعصيهم، فيبطل الله سحرهم بعصا موسى، فيخر السحرة ساجدين مؤمنين. يعرف أهل الصنعة حقيقة الآية فيسارعون إلى الحق رغم تهديد فرعون.',
          'يأمر الله موسى أن يسري ببني إسرائيل ليلًا، فيتهيأ الخروج من مصر بعد طول الاستضعاف. يبدأ طريق النجاة الذي سيختبر فيه إيمان القوم وثباتهم.',
          'يضرب موسى البحر بعصاه فينفلق طرقًا يبسًا، فيعبر بنو إسرائيل ويتبعهم فرعون وجنوده. تنقلب المطاردة إلى نجاة للمؤمنين وهلاك للمعتدين.',
          'يدرك الغرق فرعون فيعلن الإيمان عند معاينة الموت، لكن الإيمان المتأخر لا ينفعه بعد المعاينة. تحفظ الآيات جسده آية لمن يأتي بعده.',
          'يواعد الله موسى لميقات، ويستخلف هارون على قومه، ثم تقع فتنة العجل في غيبته. يبين الحدث أن النجاة من فرعون لا تعني زوال الابتلاء من قلوب بني إسرائيل.',
          'يصنع السامري عجلًا جسدًا له خوار ويدعو القوم إلى عبادته، فيفتن كثيرًا منهم. تكشف المحطة أثر التضليل حين يغيب العلم ويضعف الثبات.',
          'يأمر موسى قومه بالتوبة من عبادة العجل، ويذكرهم بعظم جرمهم. تأتي التوبة بعد اعترافهم بالخطأ والرجوع عن الشرك.',
          'يسأل بنو إسرائيل موسى أن يبين لهم البقرة، فيتكرر السؤال عن صفاتها حتى تتحدد. تعرض القصة أثر التشدد وكثرة الجدل في تأخير الامتثال لأمر واضح.',
          'يطلب فريق من بني إسرائيل رؤية الله جهرة، فيأخذهم الصاعقة ثم يبعثهم الله بعد موتهم. تكشف المحطة تجاوزهم حدود الأدب في الطلب رغم ما رأوه من الآيات.',
          'يبطر قارون بنعمه وينسب ما أوتي إلى علم عنده، فينصحه قومه ألا يفرح فرح بطر وأن يبتغي الدار الآخرة. ثم يخسف الله به وبداره الأرض، فتظهر عاقبة الكبر والاغترار بالمال.'
        ],
        'داود وسليمان عليهما السلام':[
          'يقتل داود جالوت بإذن الله، ويؤتيه الله الملك والحكمة. يربط المشهد النصر بتأييد الله، لا بمجرد القوة والعدد.',
          'يشدد الله ملك داود ويؤتيه الحكمة وفصل الخطاب. تبرز الآية أن الملك الصالح يحتاج حكمًا وعدلًا وبصيرة.',
          'يسخر الله الجبال والطير لتسبح مع داود، فيكون الكون شاهدًا على التسبيح. النعمة هنا تسخير يعين على العبادة لا مظهر سلطان فحسب.',
          'يعلم الله داود صناعة الدروع لتحصين الناس في الحرب. يبين الحدث أن الأنبياء يأخذون بالأسباب ويتعلمون ما ينفع الناس.',
          'يدخل الخصمان على داود فيفزع منهما، ثم يسمع القضية ويحكم بعد أن يتبين له وجهها. تذكر القصة القاضي بضرورة العدل والانتباه إلى أن الخصومة قد تحمل اختبارًا.',
          'يرث سليمان داود ويؤتى العلم، ويشكر الله على فضله. الوراثة هنا مقرونة بالعلم والقيام بالمسؤولية، لا بمجرد انتقال الملك.',
          'يحكم سليمان في قضية الحرث التي أفسدته الغنم، ويفهم الله كليهما وجه الحكم. تعرض الآية تفاوت الاجتهاد مع إقرار الله علمًا وحكمة لعبديه.',
          'يسخر الله الريح لسليمان تجري بأمره حيث أراد. تظهر الآية اتساع الملك الذي وهبه الله له، وأن التسخير فضل إلهي.',
          'يسخر الله لسليمان طائفة من الجن يعملون بأمره، ويحاسب من يخرج عن الأمر. يوضح الحدث أن هذه القدرة ليست ذاتية بل تسخير من الله.',
          'يتفقد سليمان الطير فلا يرى الهدهد، فيسأل عنه ويتوعده إن غاب بلا عذر. يبين المشهد دقة متابعة المسؤول لرعيته وجنده.',
          'يأتي الهدهد بخبر قوم سبأ وملكة تملكهم، ويذكر عبادتهم الشمس من دون الله. يلفت الخبر سليمان إلى واجب الدعوة وتصحيح الاعتقاد.',
          'يرسل سليمان كتابًا إلى ملكة سبأ يدعوها فيه إلى الإيمان وألا تتكبر. ينتقل الأمر من جمع المعلومات إلى مخاطبة القوم بالحجة والرسالة.',
          'تأتي ملكة سبأ إلى سليمان، وترى من آيات الله ما يحملها على الإقرار والإسلام مع سليمان لله رب العالمين. يظهر الحدث رجاحة عقلها حين قدمت الحق على الملك.',
          'يموت سليمان وهو متكئ على عصاه، ولا تعلم الجن بموته حتى تأكل دابة الأرض منسأته فيخر. تكشف النهاية أن الجن لا يعلمون الغيب، وأن علم الغيب لله وحده.'
        ],
        'أصحاب الكهف':[
          'يذكر القرآن فتية آمنوا بربهم وزادهم الله هدى، فثبتوا على التوحيد في بيئة مخالفة. يبدأ فضلهم من صدق الإيمان ثم يأتيهم مزيد الهداية.',
          'يعتزل الفتية قومهم وما يعبدون من دون الله ويلجؤون إلى الكهف، راجين رحمة الله وتيسيره. كانت هجرتهم حفظًا لدينهم لا طلبًا لمصلحة دنيوية.',
          'يضرب الله على آذانهم فينامون في الكهف سنين طويلة، فيحفظهم من تقلبات العالم خارج الكهف. النوم الطويل آية على قدرة الله على البعث.',
          'يقلبهم الله ذات اليمين وذات الشمال، وتبقى هيئتهم محفوظة. يذكر القرآن هذه التفاصيل لتصوير عناية الله بهم خلال مدة لبثهم.',
          'يبعثهم الله فيتساءلون عن مدة نومهم، ثم يبعثون أحدهم إلى المدينة بورقهم ليأتي بطعام. يظنون أن الأمر لم يطل، بينما تغير الزمن من حولهم.',
          'يطلع الناس على أمر الفتية، فيكون ظهورهم دليلًا على صدق وعد الله والبعث. ينتقل خبرهم من سر محفوظ إلى آية يشاهدها الناس.',
          'يبين القرآن مدة لبثهم، ثم يوجه إلى أن الله أعلم بحقيقتها وتفاصيلها. المقصود الاعتبار بقدرة الله، لا الانشغال بالجدل فيما لم يرد به بيان.'
        ],
        'ذو القرنين':[
          'يسأل الناس النبي عن ذي القرنين، فيأمره الله أن يذكر لهم خبرًا من شأنه. تمهد الآيات لعرض نموذج حاكم مكن الله له في الأرض فاستعمل القوة في العدل.',
          'يبلغ ذو القرنين مغرب الشمس، ويجد قومًا فيحكم فيهم بما أقدره الله عليه: يعاقب الظالم ويعامل المؤمن الصالح بالحسنى. تظهر المحطة مسؤولية السلطة في إقامة العدل.',
          'يتجه إلى مطلع الشمس ويجد قومًا ليس لهم ستر يحجبهم عنها، فيصف القرآن حالهم دون إسهاب. يواصل ذو القرنين رحلته مستعملًا ما مكنه الله فيه.',
          'يصل إلى منطقة بين جبلين، ويجد قومًا لا يكادون يفقهون قولًا. يواجه هنا مشكلة أمنية تهدد الناس، فيستمع إلى حاجتهم.',
          'يشكو القوم فساد يأجوج ومأجوج في الأرض، ويعرضون مالًا مقابل إقامة حاجز يحميهم. يبين طلبهم حجم الضرر الذي يعانونه وحاجتهم إلى حماية عادلة.',
          'يرفض ذو القرنين أن يجعل المال غايته، ويطلب منهم القوة والعمل معه، ثم يبني ردمًا من الحديد ويصب عليه القطر. يجمع بين التخطيط والمهارة ومشاركة الناس.',
          'يعجز يأجوج ومأجوج عن تسلق الردم أو نقبه، فيتحقق الأمن للقوم بفضل الله ثم العمل المنظم. لا ينسب ذو القرنين الإنجاز إلى نفسه استقلالًا.',
          'يقول ذو القرنين إن الردم رحمة من ربه، لكنه لن يبقى إلى الأبد؛ فإذا جاء وعد الله جعله دكاء. تذكر الخاتمة أن أعظم المنشآت والقوى مؤقتة أمام أمر الله.'
        ],
        'مريم وعيسى عليهما السلام':[
          'تنذر امرأة عمران ما في بطنها لخدمة العبادة، وتطلب من الله قبول نذرها. تكشف البداية صدق نيتها وتعلقها بالله قبل أن تعرف ما سيكون عليه المولود.',
          'تلد مريم وتسميها، وتسأل الله أن يعيذها وذريتها من الشيطان، فيتقبلها ربها بقبول حسن ويكفلها زكريا. يبدأ إعداد مريم برعاية إلهية وبيئة عبادة.',
          'تبشر الملائكة مريم بكلمة من الله اسمه المسيح عيسى ابن مريم، وتذكر صفاته ومكانته. تأتي البشارة بما يتجاوز المألوف، وتؤكد قدرة الله.',
          'تعتزل مريم أهلها وتتخذ مكانًا شرقيًا، طلبًا للخلوة والعبادة. تمهد العزلة للموقف العظيم الذي ستواجهه وحدها.',
          'يتمثل لها جبريل بشرًا سويًا، فتستعيذ بالرحمن منه إن كان تقيًا. يظهر عفاف مريم وسرعة لجوئها إلى الله عند المفاجأة.',
          'يخبرها جبريل أنه رسول ربها ليهب لها غلامًا زكيًا، فتتعجب كيف يكون لها ولد ولم يمسسها بشر. يأتي الجواب بأن الأمر هين على الله وأنه آية ورحمة.',
          'تحمل مريم بعيسى وتبتعد عن الناس، ثم يأتيها المخاض. تعرض الآيات مشقة الحمل والولادة في عزلة، مع استمرار عناية الله بها.',
          'تتألم مريم عند جذع النخلة وتتمنى الموت من شدة الكرب، فيطمئنها النداء ويأمرها بهز الجذع والشرب والقر. تجمع المحطة بين التثبيت الإلهي والأخذ بسبب الرزق.',
          'تعود مريم إلى قومها تحمل الطفل، فيواجهونها بالاستنكار والتهمة. تلتزم الصمت وتشير إلى عيسى، تمهيدًا لظهور آيته.',
          'يتكلم عيسى في المهد معلنًا عبوديته لله ونبوته، ويذكر وصية الصلاة والزكاة وبره بأمه. تكون المعجزة دفاعًا عن مريم وبيانًا لحقيقة عيسى.',
          'يؤيد الله عيسى بالآيات، فيخلق من الطين كهيئة الطير بإذن الله ويبرئ الأكمه والأبرص ويحيي الموتى بإذن الله. تتكرر عبارة الإذن لتأكيد أن المعجزات بقدرة الله لا باستقلال عيسى.',
          'يسأل الحواريون عيسى أن ينزل الله عليهم مائدة من السماء لتطمئن قلوبهم، فيحذرهم عيسى من كفران النعمة بعد نزولها. يبين الحدث مسؤولية من يشاهد الآية.',
          'يرد القرآن دعوى قتل عيسى وصلبه، ويبين أن الأمر التبس عليهم وأنهم لم يقتلوه يقينًا. تصحح الآية الاعتقاد وتقرر أن الله حفظ رسوله.',
          'يقرر القرآن أن الله رفع عيسى إليه، وكان الله عزيزًا حكيمًا. تأتي الآية تتمة لنفي القتل والصلب وإثبات حفظ الله لنبيه.',
          'يسأل الله عيسى يوم القيامة هل دعا الناس إلى اتخاذه وأمه إلهين، فيتبرأ من ذلك ويعلن أنه لم يقل إلا ما أمره الله به. تختم المحطة بتأكيد توحيد الله وبراءة عيسى من الغلو فيه.'
        ],
        'أصحاب الأخدود':[
          'يقسم الله بالسماء ذات البروج واليوم الموعود، ثم يذكر أصحاب الأخدود ويلعن المعتدين. يلفت المطلع إلى عظم الجريمة التي ارتكبوها بحق المؤمنين.',
          'يوقد الظالمون نارًا عظيمة ويجلسون حولها يشاهدون تعذيب المؤمنين. يكشف المشهد قسوة من جعلوا إحراق الناس وسيلة لإجبارهم على ترك إيمانهم.',
          'تتوعد الآيات الذين فتنوا المؤمنين والمؤمنات ثم لم يتوبوا بعذاب جهنم. يقرر القرآن أن الظلم لا يضيع، وأن باب التوبة يبقى مفتوحًا لمن رجع.',
          'يصف القرآن المؤمنين وهم جلوس حول النار، وما نقم الظالمون منهم إلا إيمانهم بالله العزيز الحميد. سبب التعذيب هو التوحيد وحده، فيظهر ثباتهم أمام الاضطهاد.',
          'يبشر الله المؤمنين الذين آمنوا وعملوا الصالحات بجنات تجري من تحتها الأنهار. تقابل الخاتمة عذاب الظالمين بثواب المؤمنين وتقرر الفوز الحقيقي.'
        ],
        'أصحاب الفيل':[
          'يذكر الله نبيه بما صنع بأصحاب الفيل حين قصدوا البيت الحرام لهدمه، ويسأل سؤال تقرير عن مآل كيدهم. يربط المطلع الحادثة بحفظ الله للبيت.',
          'يرسل الله على جيش الفيل طيرًا أبابيل جماعات متتابعة، فيأتيهم العذاب من حيث لا يحتسبون. يبين الحدث أن القوة العسكرية لا تمنع أمر الله.',
          'ترمي الطير الجيش بحجارة من سجيل، فيصيبهم ما قدر الله عليهم. تصف الآيات وسيلة الهلاك بإيجاز لتبرز سرعة تحقق العقوبة.',
          'يصير أصحاب الفيل كزرع أكلته الدواب فتهشم وتفرق. تختم السورة بصورة تبين انهيار جيش عظيم أمام قدرة الله وحفظه للبيت الحرام.'
        ]
      };
      const detailed=(detailedStoryExplanations[story.title]||[])[index];
      explanation.textContent=storyEventExplanations[ev[0]]||detailed||('توضح هذه المحطة حدثًا محددًا من قصة '+story.title+': '+ev[0]+'. اقرأ الآية المشار إليها مع الآيات السابقة واللاحقة لتتبين سبب الحدث وما ترتب عليه، ثم قارنها بالمحطات الأخرى في القصة.');
      const go=document.createElement('button');go.type='button';go.className='qe-item qe-story-go';go.textContent='انتقل إلى الآية في المصحف';
      go.addEventListener('click',()=>goToStoryAyah(ev[1],ev[2]));
      detail.append(explanation,go);
      toggle.setAttribute('aria-expanded','false');
      toggle.addEventListener('click',()=>{
        const opening=detail.hidden;
        list.querySelectorAll('.qe-story-event-detail').forEach(p=>p.hidden=true);
        list.querySelectorAll('.qe-story-event-toggle').forEach(t=>{t.setAttribute('aria-expanded','false');t.classList.remove('expanded');});
        if(opening){detail.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.classList.add('expanded');}
      });
      card.append(toggle,detail);list.appendChild(card);
    });
  }
  async function goToStoryAyah(surah,ayah){
    try{
      if(typeof fetchTimingForSurah!=='function'||typeof loadPage!=='function')return;
      const items=await fetchTimingForSurah(surah);
      const match=Array.isArray(items)?items.find(x=>Number(x.ayah)===Number(ayah)):null;
      const targetPage=match&&typeof pageFromTiming==='function'?Number(pageFromTiming(match,surah)):0;
      if(!targetPage){alert('تعذر تحديد صفحة الآية حاليًا. تحقق من الاتصال ثم حاول مجددًا.');return;}
      /* مرّر السورة والآية إلى مشغل الصوت أيضًا؛ keepAudio كان يمنع تحديث مصدر/موضع الصوت. */
      loadPage(targetPage,{surahNumber:Number(surah),startAyah:Number(ayah)});
      close();
      if(match){
        let tries=0;
        const timer=setInterval(()=>{
          tries++;
          try{
            if(typeof currentPage!=='undefined'&&Number(currentPage)===targetPage&&page&&page.complete){
              clearInterval(timer);drawAyahHighlight(match);return;
            }
          }catch(e){}
          if(tries>=40)clearInterval(timer);
        },150);
      }
    }catch(e){alert('تعذر الوصول إلى موضع الآية. حاول مرة أخرى.');}
  }
  const journeyDetails=[
    {title:'رحلة الإيمان والتوحيد',events:[
      ['التفكر في خلق السماوات والأرض',3,190],['آيات الله في اختلاف الليل والنهار',2,164],['الدعوة إلى عبادة الله وحده',2,21],['الله لا إله إلا هو الحي القيوم',2,255],['إخلاص العبادة لله',39,2],['مثل كلمة التوحيد والكلمة الطيبة',14,24],['الثبات على الإيمان',41,30]
    ]},
    {title:'رحلة التوبة والرجوع إلى الله',events:[
      ['النهي عن القنوط من رحمة الله',39,53],['دعوة المؤمنين إلى التوبة النصوح',66,8],['اعتراف آدم وزوجه وطلب المغفرة',7,23],['توبة يونس وتسبيحه في الظلمات',21,87],['توبة الثلاثة الذين خُلّفوا',9,118],['قبول التوبة عن عباده',42,25],['الاستغفار وطلب المغفرة',3,135]
    ]},
    {title:'رحلة الصبر والثبات',events:[
      ['الاستعانة بالصبر والصلاة',2,153],['الابتلاء بالخوف والجوع ونقص الأموال',2,155],['بشارة الصابرين',2,156],['وصية لقمان لابنه بالصبر',31,17],['صبر أيوب ورفع الضر عنه',21,83],['ثبات أصحاب الأخدود',85,7],['جزاء الصابرين بغير حساب',39,10]
    ]},
    {title:'رحلة الأنبياء والرسالة',events:[
      ['دعوة نوح قومه',71,1],['دعوة إبراهيم إلى التوحيد',21,52],['مناجاة موسى وتكليفه بالرسالة',20,11],['دعوة هود إلى عبادة الله',7,65],['دعوة صالح لقومه',7,73],['دعوة عيسى وبشارة رسالته',3,49],['خاتم النبيين محمد ﷺ',33,40]
    ]},
    {title:'رحلة الآخرة والبعث والحساب',events:[
      ['كل نفس ذائقة الموت',3,185],['النفخ في الصور',39,68],['البعث من القبور',36,51],['عرض الأعمال والكتاب',18,49],['الميزان والعدل يوم القيامة',21,47],['مشهد الحساب',84,7],['مصير أهل الجنة',3,133],['التحذير من النار',2,24]
    ]},
    {title:'رحلة الهداية والاستقامة',events:[
      ['طلب الهداية إلى الصراط المستقيم',1,6],['القرآن هدى للمتقين',2,2],['اتباع أحسن ما أنزل',39,55],['الاستقامة وعدم الطغيان',11,112],['التمسك بحبل الله',3,103],['العمل الصالح والإيمان',103,3],['الدعاء بالثبات على الهداية',3,8]
    ]},
    {title:'رحلة الأخلاق والعمل الصالح',events:[
      ['البر والإحسان إلى الوالدين',17,23],['العدل والإحسان',16,90],['الوفاء بالعهد',17,34],['اجتناب السخرية والغيبة',49,11],['قولوا للناس حسنًا',2,83],['التعاون على البر والتقوى',5,2],['المسابقة إلى الخيرات',2,148]
    ]}
,
    {title:'رحلة الدعاء والافتقار إلى الله',events:[
      ['دعاء زكريا بطلب الذرية',3,38],['دعاء إبراهيم بالأمن والرزق لمكة',2,126],['دعاء موسى بطلب شرح الصدر',20,25],['دعاء أيوب عند نزول الضر',21,83],['دعاء يونس في الظلمات',21,87],['دعاء عباد الرحمن بالنجاة من النار',25,65],['أمر الله بالدعاء ووعده بالإجابة',40,60]
    ]},
    {title:'رحلة الشكر ونعم الله',events:[
      ['تذكير بني إسرائيل بنعم الله',2,40],['الأمر بالأكل من الطيبات والشكر لله',2,172],['قليل من عبادي الشكور',34,13],['شكر آل داود',34,13],['وعد الله بالزيادة عند الشكر',14,7],['نعمة السمع والبصر والفؤاد',16,78],['التحدث بنعمة الله',93,11]
    ]},
    {title:'رحلة العلم والتفكر',events:[
      ['فضل العلم ورفع درجات أهله',58,11],['دعاء النبي بالزيادة من العلم',20,114],['التفكر في خلق السماوات والأرض',3,191],['السير في الأرض والنظر في العواقب',30,9],['التثبت من الأخبار',49,6],['سؤال أهل العلم عند الجهل',16,43],['مثل الذين يعلمون والذين لا يعلمون',39,9]
    ]},
    {title:'رحلة الأسرة والوالدين',events:[
      ['الإحسان إلى الوالدين',17,23],['شكر الوالدين',31,14],['وصية لقمان لابنه بالتوحيد',31,13],['التربية على الصلاة والصبر',20,132],['الدعاء للوالدين بالمغفرة',17,24],['مسؤولية رعاية الأهل',66,6],['الدعاء بصلاح الأزواج والذرية',25,74]
    ]},
    {title:'رحلة العدل والأمانة',events:[
      ['أداء الأمانات إلى أهلها',4,58],['الحكم بالعدل بين الناس',4,58],['العدل ولو على النفس والأقربين',4,135],['عدم حمل الخصومة على ترك العدل',5,8],['الوفاء بالكيل والميزان',6,152],['النهي عن أكل أموال الناس بالباطل',2,188],['كتابة الديون حفظًا للحقوق',2,282]
    ]},
    {title:'رحلة الرزق والتوكل',events:[
      ['الله هو الرزاق ذو القوة المتين',51,58],['الأمر بالسعي في مناكب الأرض',67,15],['التوكل على الله',3,159],['من يتوكل على الله فهو حسبه',65,3],['الإنفاق مما رزق الله',2,3],['النهي عن قتل الأولاد خشية الإملاق',17,31],['الرزق من حيث لا يحتسب المتقي',65,2]
    ]},
    {title:'رحلة الإنفاق والصدقة',events:[
      ['الإنفاق مما رزق الله',2,3],['مثل الذين ينفقون أموالهم في سبيل الله',2,261],['الإنفاق سرًا وعلانية',2,274],['البر بالإنفاق مما يحب الإنسان',3,92],['مصارف الصدقات',9,60],['القول المعروف خير من صدقة يتبعها أذى',2,263],['جزاء المنفقين',57,7]
    ]},
    {title:'رحلة الفتن والابتلاء',events:[
      ['الابتلاء لتمييز الصادقين',29,2],['الابتلاء بالخوف والجوع ونقص الأموال',2,155],['المال والأولاد فتنة',8,28],['التحذير من فتنة الدنيا',3,185],['قصة أصحاب الجنة وابتلاؤهم',68,17],['قصة قارون وفتنة المال',28,76],['النجاة بالتقوى والصبر',3,200]
    ]},
    {title:'رحلة القرآن والهداية',events:[
      ['القرآن هدى للمتقين',2,2],['شهر رمضان الذي أنزل فيه القرآن',2,185],['القرآن يهدي للتي هي أقوم',17,9],['تدبر آيات القرآن',4,82],['الإنصات للقرآن عند تلاوته',7,204],['القرآن شفاء ورحمة للمؤمنين',17,82],['الاعتصام بكتاب الله',3,103]
    ]},
    {title:'رحلة الرحمة والعفو',events:[
      ['رحمة الله وسعت كل شيء',7,156],['الأمر بالعفو والصفح',7,199],['العفو والإصلاح عند المقدرة',42,40],['كظم الغيظ والعفو عن الناس',3,134],['دفع السيئة بالحسنة',41,34],['الصفح الجميل',15,85],['عدم اليأس من رحمة الله',39,53]
    ]}
  ];
  const journeyEventExplanations={
  "رحلة الإيمان والتوحيد": [
    "تلفت الآيات النظر إلى إحكام خلق السماوات والأرض، ليكون التأمل في الكون طريقًا إلى معرفة عظمة الخالق ووحدانيته.",
    "تعدد الآية دلائل القدرة في تعاقب الليل والنهار ونزول المطر وحركة الكون؛ فهي شواهد محسوسة تقود القلب إلى الإيمان بالله.",
    "تبدأ الدعوة من أصل العبادة: أن يتوجه الإنسان إلى خالقه وحده، فهو الذي خلقه ورزقه، ولا يستحق العبادة سواه.",
    "تجمع آية الكرسي معاني كمال الله وحياته وقيوميته وعلمه وسلطانه؛ فتؤسس التوحيد على معرفة صفات الله وعظمته.",
    "بعد معرفة أن الله وحده المستحق للعبادة، تأتي هذه المحطة لتؤكد أن الدين والعمل ينبغي أن يكونا خالصين له.",
    "يضرب القرآن مثل الكلمة الطيبة بالشجرة الطيبة الثابتة؛ فالإيمان الصادق أصل راسخ تظهر آثاره في الأقوال والأعمال.",
    "تختم الرحلة بثمرة الإيمان: الثبات عند الشدائد، واستقامة القلب والعمل، ونزول الطمأنينة على من قال ربنا الله ثم استقام."
  ],
  "رحلة التوبة والرجوع إلى الله": [
    "تفتح الآية باب الرجاء أمام المذنب، وتنهى عن اليأس؛ فمهما عظم الذنب تبقى رحمة الله ودعوته إلى التوبة أوسع.",
    "بعد فتح باب الرجاء، تدعو الآية إلى توبة صادقة تمحو أثر الذنب، ويظهر صدقها في ترك المعصية والندم والعزم على الإصلاح.",
    "تقدم قصة آدم مثالًا عمليًا للرجوع بعد الزلل؛ فقد اعترف هو وزوجه بخطئهما ولم يبرراه، ولجآ إلى الله طالبين المغفرة.",
    "تظهر قصة يونس أن التسبيح والاعتراف بالتقصير باب للنجاة؛ ففي أشد الظلمات لم ينقطع رجاؤه بربه.",
    "توضح توبة الذين تخلفوا كيف يواجه المؤمن خطأه بالصدق والصبر، حتى يقبل الله توبته ويعيده إلى جماعة المؤمنين.",
    "تقرر الآية أن الله يقبل توبة عباده ويعفو عن السيئات؛ فلا يقتصر الأمر على طلب العبد، بل فضل الله يفتح له طريق العودة.",
    "تربط هذه المحطة التوبة بالاستغفار والعمل الصالح؛ فالمؤمن إذا وقع في خطأ ذكر الله ورجع إليه ولم يصر على الذنب."
  ],
  "رحلة الصبر والثبات": [
    "ترشد الآية إلى الاستعانة بالصبر والصلاة؛ فالصبر يثبت القلب، والصلاة تجدد صلته بالله عند الشدائد.",
    "توضح الآية أن الابتلاء سنة في الحياة، وأن المؤمن قد يواجه الخوف والجوع وفقد بعض ما يحب.",
    "تأتي البشارة بعد ذكر الابتلاء لتبين أن الصابرين يقابلون المصيبة بالرجوع إلى الله، فينالون رحمته وهدايته.",
    "تنتقل الرحلة من الصبر على المصائب إلى الصبر على الطاعة؛ فلقمان يوصي ابنه بالصلاة والأمر بالمعروف واحتمال ما يصيبه.",
    "تعرض قصة أيوب نموذجًا للصبر مع الدعاء؛ فقد مسه الضر لكنه بقي متعلقًا برحمة الله حتى كشف عنه ما أصابه.",
    "تظهر قصة أصحاب الأخدود ثبات المؤمنين على إيمانهم رغم التعذيب، فتجسد الصبر حين يصبح التمسك بالحق امتحانًا عظيمًا.",
    "تختم الرحلة بوعد الجزاء الواسع للصابرين؛ فالصبر ليس احتمالًا عابرًا، بل طريق إلى أجر لا يحده حساب."
  ],
  "رحلة الأنبياء والرسالة": [
    "تبدأ رحلة الرسالة بنوح عليه السلام وهو يدعو قومه إلى عبادة الله وتقواه، ويبين لهم أنه رسول ناصح.",
    "يظهر إبراهيم عليه السلام في حواره مع قومه رافضًا عبادة ما لا يسمع ولا ينفع، وموجهًا إلى عبادة الله وحده.",
    "تنتقل الرحلة إلى تكليف موسى عليه السلام؛ إذ ناداه الله وعرّفه برسالته، فبدأت مرحلة مواجهة فرعون ودعوته.",
    "يدعو هود عليه السلام قوم عاد إلى التوحيد، ويذكرهم أن دعوتهم ليست طلبًا لمصلحة شخصية بل بلاغ من رب العالمين.",
    "يخاطب صالح عليه السلام ثمود داعيًا إياهم إلى عبادة الله، ويقيم عليهم الحجة بآية الناقة.",
    "تعرض الآية جانبًا من رسالة عيسى عليه السلام، وما أيده الله به من الآيات الدالة على صدقه وعبوديته لله.",
    "تصل الرحلة إلى ختام النبوات بمحمد ﷺ؛ فهو رسول الله وخاتم النبيين، وبذلك اكتملت سلسلة الرسالات."
  ],
  "رحلة الآخرة والبعث والحساب": [
    "تذكر الآية بحقيقة الموت التي تشمل كل نفس، لتوقظ الإنسان من الغفلة وتوجهه إلى الاستعداد للقاء الله.",
    "تصور الآية النفخ في الصور وما يعقبه من تغير هائل في نظام العالم، إيذانًا ببدء مشاهد القيامة.",
    "تنتقل الصورة إلى خروج الخلق من الأجداث مسرعين إلى ربهم؛ فتؤكد أن البعث واقع بعد الموت.",
    "يعرض كتاب الأعمال ما أحصاه الله من أفعال العباد، فلا يغيب عنه صغير ولا كبير، ويواجه الإنسان سجل عمله.",
    "تقرر الآية إقامة الموازين بالحق والعدل، فلا يظلم أحد ولا تنقص نفس شيئًا من عملها.",
    "تصف الآية من يؤتى كتابه بيمينه في حساب يسير، فتبعث الرجاء في رحمة الله وحسن العاقبة.",
    "بعد الحساب والجزاء، تفتح هذه المحطة مشهد المسارعة إلى مغفرة الله وجنته المعدة للمتقين.",
    "تذكر الآية بعاقبة الكفر والعصيان والتحذير من النار، لتكتمل صورة المصير ويكون العمل في الدنيا على بصيرة."
  ],
  "رحلة الهداية والاستقامة": [
    "تبدأ الرحلة بأعظم دعاء يحتاجه العبد: أن يهديه الله الطريق المستقيم ويثبته عليه.",
    "تصف الآية القرآن بأنه هدى للمتقين؛ فالهداية ليست مجرد معرفة الطريق، بل الانتفاع بالوحي والعمل به.",
    "تدعو الآية إلى اتباع أحسن ما أنزل من القرآن قبل مجيء العذاب بغتة، فتربط الهداية بالمبادرة إلى العمل.",
    "توجه الآية إلى الاستقامة كما أمر الله، وتحذر من تجاوز الحدود؛ فالثبات على الحق يحتاج اعتدالًا ومداومة.",
    "تدعو الآية إلى الاعتصام بحبل الله جميعًا وعدم التفرق، فالهداية تقويها وحدة الجماعة على الحق.",
    "توضح المحطة أن النجاة تقوم على اجتماع الإيمان والعمل الصالح والتواصي بالحق والصبر، لا على الدعوى وحدها.",
    "تختم الرحلة بدعاء المؤمنين ألا تزيغ قلوبهم بعد الهداية، فهم يعلمون أن الثبات فضل من الله يحتاج إلى سؤال دائم."
  ],
  "رحلة الأخلاق والعمل الصالح": [
    "تبدأ الأخلاق من البيت؛ فالآية تأمر بالإحسان إلى الوالدين، وتخص حال كبرهما بلين القول وخفض الجناح.",
    "توسع الآية دائرة البر إلى العدل والإحسان وإيتاء ذوي القربى، وتجعل هذه القيم أساسًا لصلاح المجتمع.",
    "يرتبط حسن الخلق بالوفاء؛ فالآية تنهى عن نقض العهد لأن الإنسان مسؤول عما التزم به.",
    "تحمي الآية كرامة الناس ومجالسهم، فتنهى عن السخرية واللمز والتنابز والغيبة التي تفسد الأخوة.",
    "تدعو الآية إلى طيب الخطاب مع الناس، ليكون اللسان بابًا للإصلاح لا للإيذاء.",
    "تنقل الرحلة الأخلاق من سلوك الفرد إلى التعاون الجماعي على البر والتقوى، مع رفض التعاون على الإثم والعدوان.",
    "تختم بالمبادرة إلى الخيرات؛ فالأخلاق الصالحة لا تكتمل إلا بعمل نافع ومسارعة إلى ما يرضي الله."
  ],
  "رحلة الدعاء والافتقار إلى الله": [
    "يدعو زكريا ربه في خفاء طالبًا ذرية طيبة، فيظهر أدب الدعاء وحسن الظن بقدرة الله رغم تقدم السن.",
    "يسأل إبراهيم ربه الأمن والرزق لأهل مكة، فيجمع دعاؤه بين صلاح المكان وحفظ أهله وإقامة العبادة.",
    "يتوجه موسى إلى الله طالبًا شرح الصدر وتيسير الأمر، مبينًا أن حمل المسؤولية يحتاج عون الله وتوفيقه.",
    "يعرض أيوب حاجته إلى رحمة الله بأدب واختصار، فيكشف أن الدعاء يجمع الاعتراف بالضعف والثقة برب العالمين.",
    "يذكر يونس ربه في الظلمات معترفًا بتقصيره ومعلنًا تنزيه الله، فيكون الدعاء سببًا للنجاة والكشف.",
    "يصف القرآن عباد الرحمن وهم يسألون الله أن يصرف عنهم عذاب جهنم؛ فالدعاء يشمل صلاح الآخرة كما يشمل حاجات الدنيا.",
    "تختم الرحلة بالأمر العام بالدعاء ووعد الله بالإجابة، فتجتمع أدعية الأنبياء والصالحين تحت باب الافتقار إلى الله."
  ],
  "رحلة الشكر ونعم الله": [
    "تذكر الآية بني إسرائيل بنعمة الله عليهم وتدعوهم إلى الوفاء بالعهد؛ فالشكر يبدأ بتذكر المنعم والاستجابة لأمره.",
    "تربط الآية الشكر بالرزق الحلال الطيب، فاستعمال النعمة في طاعة الله من أعظم صور شكرها.",
    "تلفت الآية إلى أن الشكر الحقيقي يظهر في العمل، وأن كثرة النعم لا تعني بالضرورة كثرة الشاكرين.",
    "تذكر الآية ما سخره الله لداود وآله من النعم، ثم توجههم إلى شكرها بالفعل لا بالقول وحده.",
    "تقرر الآية وعد الله بالزيادة لمن شكر، وتحذر في المقابل من جحود النعمة وعاقبته.",
    "تعدد الآية نعم السمع والأبصار والأفئدة؛ وهي أدوات المعرفة والإدراك التي تستوجب الحمد وحسن الاستعمال.",
    "تختم الرحلة بتوجيه الإنسان إلى التحدث بنعمة ربه اعترافًا بها وثناءً عليه، دون بطر أو مباهاة."
  ],
  "رحلة العلم والتفكر": [
    "تقرر الآية رفعة أهل الإيمان والعلم، وتربط المكانة بحسن الاستجابة والتواضع في المجالس.",
    "توجه الآية النبي ﷺ إلى سؤال الله الزيادة من العلم، وفي ذلك بيان دوام حاجة الإنسان إلى التعلم.",
    "تصور الآيات أهل التفكر وهم يتأملون خلق السماوات والأرض، فيقودهم النظر إلى التسبيح والإقرار بحكمة الخالق.",
    "تدعو الآية إلى النظر في آثار الأمم السابقة، ليكون التاريخ مجالًا للعبرة وفهم سنن الله.",
    "تؤسس الآية لخلق التثبت؛ فلا يُبنى الحكم على خبر غير موثوق ثم يقع الندم على التسرع.",
    "ترشد الآية إلى الرجوع لأهل العلم فيما يجهله الإنسان، بدل القول بغير معرفة.",
    "تختم الرحلة بسؤال يوقظ العقل: هل يستوي من يعلم ومن لا يعلم؟ فالعلم النافع يثمر خشية وبصيرة."
  ],
  "رحلة الأسرة والوالدين": [
    "تجعل الآية الإحسان إلى الوالدين حقًا عظيمًا، وتؤكد رعاية مشاعرهما خصوصًا عند الكبر.",
    "تربط الآية شكر الله بشكر الوالدين، وتذكر بما بذلته الأم من حمل ورضاعة ومشقة.",
    "تبدأ وصايا لقمان لابنه بأصل التوحيد، لأن بناء الأسرة الصالحة يبدأ بتصحيح العقيدة.",
    "توجه الآية إلى أمر الأهل بالصلاة والصبر عليها، فتجعل التربية الإيمانية مسؤولية مستمرة داخل البيت.",
    "تعلم الآية الابن أن يدعو لوالديه بالرحمة، وفاءً لهما وتواضعًا أمام فضل تربيتهما.",
    "تذكر الآية المؤمنين بمسؤولية حماية أنفسهم وأهليهم من أسباب الهلاك، بالتعليم والتوجيه والطاعة.",
    "تختم الرحلة بدعاء صلاح الأزواج والذرية، ليكون البيت قرة عين على الإيمان والتقوى."
  ],
  "رحلة العدل والأمانة": [
    "تجمع الآية بين أداء الأمانات والحكم بالعدل؛ فاستقامة المجتمع تقوم على حفظ الحقوق والإنصاف.",
    "تؤكد المحطة أن العدل ليس شعارًا، بل واجب عند الفصل بين الناس مهما اختلفت أهواؤهم.",
    "ترفع الآية معيار العدل إلى أعلى درجاته: أن يشهد الإنسان بالحق ولو خالف مصلحته أو مصلحة أقرب الناس إليه.",
    "تحذر الآية من أن تتحول الخصومة أو الكراهية إلى ظلم؛ فالعدل واجب مع الموافق والمخالف.",
    "تدعو الآية إلى إتمام الكيل والميزان بالقسط، فالأمانة تظهر أيضًا في المعاملات اليومية والتجارة.",
    "تنهى الآية عن أخذ أموال الناس بالباطل أو استعمال القضاء والحجج للوصول إلى حق ليس للمرء.",
    "تختم الرحلة بآية الدين التي تفصل توثيق الديون والإشهاد عليها، حماية للحقوق ومنعًا للنزاع."
  ],
  "رحلة الرزق والتوكل": [
    "تقرر الآية أن الله هو الرزاق المتصف بالقوة، فترد القلب إلى مصدر الرزق الحقيقي.",
    "تدعو الآية إلى السعي في الأرض والانتفاع بما سخر الله، فالتوكل لا يعني ترك العمل.",
    "تربط الآية التوكل بالعزم والمشاورة ثم المضي في الأمر، مع تفويض النتائج إلى الله.",
    "تعد الآية المتوكل على الله بالكفاية؛ فمن صدق اعتماده على ربه لم يضيعه الله.",
    "توجه الآية إلى الإنفاق من الرزق الذي وهبه الله، فالنعم أمانة ووسيلة للخير.",
    "تنهى الآية عن قتل الأولاد خوف الفقر، وتقرر أن الله يتولى رزق الوالدين والأبناء.",
    "تختم الرحلة بوعد التقوى بالمخرج والرزق من حيث لا يحتسب الإنسان، فتجتمع أسباب السعي مع الثقة بالله."
  ],
  "رحلة الإنفاق والصدقة": [
    "تبدأ الرحلة بصفة المتقين الذين ينفقون مما رزقهم الله، فيجعلون للآخرين نصيبًا من عطائه.",
    "يضرب القرآن مثل الحبة التي تتضاعف سنابلها، ليبين عظم ثواب الإنفاق الخالص في سبيل الله.",
    "توضح الآية أن الإنفاق في السر والعلن محمود بحسب ما يحقق الإخلاص والمصلحة، وأن أجره محفوظ عند الله.",
    "ترفع الآية معنى البر إلى بذل ما يحبه الإنسان، لا الاكتفاء بما يستغني عنه من ماله.",
    "تبين الآية الجهات التي تصرف إليها الصدقات، حتى يصل المال إلى مستحقيه وتتحقق به الرحمة والتكافل.",
    "تحذر الآية من إفساد الصدقة بالمن والأذى، وتبين أن الكلمة الطيبة والعفو خير من عطاء يتبعه تجريح.",
    "تختم الرحلة بالدعوة إلى الإيمان والإنفاق مما استخلف الله فيه عباده، وتذكر بالأجر العظيم."
  ],
  "رحلة الفتن والابتلاء": [
    "تقرر الآية أن ادعاء الإيمان لا يعفي صاحبه من الاختبار؛ فالابتلاء يكشف صدق الإيمان وثباته.",
    "تفصل الآية صورًا من الابتلاء في النفس والمال والمعاش، وتعد الصابرين بالبشارة.",
    "تحذر الآية من أن المال والأولاد قد يصرفان الإنسان عن واجبه إن جعلهما فوق طاعة الله.",
    "تذكر الآية أن كل نفس ستذوق الموت، وأن الفوز الحقيقي هو النجاة من النار ودخول الجنة، لا الاغترار بالدنيا.",
    "تعرض قصة أصحاب الجنة اختبار النعمة حين عزم أصحابها على منع حق الفقراء، فكانت العاقبة تذكيرًا بأن النعمة تحتاج شكرًا.",
    "تكشف قصة قارون فتنة الغنى والغرور، وكيف أفسد المال صاحبه حين نسب الفضل إلى نفسه ونسي المنعم.",
    "تختم الرحلة بالتوجيه إلى الصبر والمصابرة والمرابطة والتقوى، وهي زاد المؤمن لعبور الفتن."
  ],
  "رحلة القرآن والهداية": [
    "تصف الآية القرآن بأنه هدى للمتقين، وتبين أن الانتفاع به يحتاج قلبًا مستعدًا للإيمان.",
    "تذكر الآية نزول القرآن في شهر رمضان، وتربط الشهر بالهداية والبيان والفرقان.",
    "توضح الآية أن القرآن يرشد إلى الطريق الأقوم في العقيدة والعمل والسلوك، ويبشر المؤمنين.",
    "تدعو الآية إلى تدبر القرآن؛ فالتلاوة المقصودة لا تقف عند الألفاظ، بل تمتد إلى فهم المعاني والعمل بها.",
    "تأمر الآية بالإنصات للقرآن عند تلاوته، تعظيمًا لكلام الله وتهيئة القلب للانتفاع به.",
    "تصف الآية القرآن بأنه شفاء ورحمة للمؤمنين، لما يهدي إليه من الحق ويعالجه من أمراض الشك والضلال.",
    "تختم الرحلة بالدعوة إلى الاعتصام بحبل الله وعدم التفرق، فالاجتماع على الوحي يحفظ الهداية."
  ],
  "رحلة الرحمة والعفو": [
    "تقرر الآية سعة رحمة الله، وتفتح باب الرجاء للخلق، مع تذكيرهم بأن الرحمة فضل من الله.",
    "تدعو الآية إلى أخذ العفو والأمر بالعرف والإعراض عن الجاهلين، فتجعل الحلم طريقًا للتعامل مع الإساءة.",
    "توضح الآية أن جزاء السيئة قد يكون بمثلها، لكن العفو والإصلاح طريق أرفع وأعظم أجرًا.",
    "تصف الآية المتقين بكظم الغيظ والعفو عن الناس؛ فالقوة الأخلاقية تظهر عند القدرة على الرد.",
    "توجه الآية إلى دفع الإساءة بما هو أحسن، فقد تتحول الخصومة إلى مودة حين يقابل الشر بالإحسان.",
    "تدعو الآية إلى الصفح الجميل، أي العفو الذي لا يصاحبه أذى ولا تشفٍّ.",
    "تختم الرحلة بنداء للمذنبين ألا يقنطوا من رحمة الله، وأن يبادروا إلى التوبة والإنابة."
  ]
};

  function renderJourney(journey,target){
    const detail=target||$('qeJourneyDetail')||$('qeContent');
    detail.innerHTML='<h3>'+journey.title+'</h3><p class="qe-note">هذه محطات مختارة للتدبر في الموضوع، وليست حصرًا لكل الآيات المتعلقة به. افتح كل محطة لقراءة تفاصيلها، ثم اضغط زر الانتقال لفتح موضعها في المصحف.</p><div class="qe-content qe-journey-events"></div>';
    const list=detail.querySelector('.qe-journey-events');
    journey.events.forEach((ev,index)=>{
      const card=document.createElement('div');card.className='qe-story-event qe-journey-event';
      const toggle=document.createElement('button');toggle.type='button';toggle.className='qe-item qe-story-event-toggle qe-journey-event-toggle';
      const name=document.createElement('span');name.textContent=ev[0];
      const arrow=document.createElement('span');arrow.className='qe-journey-arrow';arrow.textContent='▾';
      const ref=document.createElement('small');ref.textContent='سورة '+(getSurahRows()[ev[1]-1]?.[0]||ev[1])+' • الآية '+ev[2];
      toggle.append(name,arrow,ref);
      const panel=document.createElement('div');panel.className='qe-story-event-detail qe-journey-event-detail';panel.hidden=true;
      const explanation=document.createElement('p');
      explanation.textContent=(journeyEventExplanations[journey.title]||[])[index]||('تتناول هذه المحطة «'+ev[0]+'» ضمن '+journey.title+'. تأمل الآية في سياقها ومع المحطات الأخرى في الرحلة.');
      const go=document.createElement('button');go.type='button';go.className='qe-item qe-story-go';go.textContent='انتقل إلى الآية في المصحف';
      go.addEventListener('click',()=>goToStoryAyah(ev[1],ev[2]));
      panel.append(explanation,go);
      toggle.setAttribute('aria-expanded','false');
      toggle.addEventListener('click',()=>{
        const opening=panel.hidden;
        list.querySelectorAll('.qe-journey-event-detail').forEach(p=>p.hidden=true);
        list.querySelectorAll('.qe-journey-event-toggle').forEach(t=>{t.setAttribute('aria-expanded','false');t.classList.remove('expanded');});
        if(opening){panel.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.classList.add('expanded');}
      });
      card.append(toggle,panel);list.appendChild(card);
    });
  }

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
