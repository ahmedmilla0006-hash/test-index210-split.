/* ميزات خريطة القرآن وفهرس القصص ورحلة القرآن والويدجت — إضافة مستقلة */
(function(){
  'use strict';
  const juzStarts=[1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
  const juzNames=['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر','السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون','الحادي والعشرون','الثاني والعشرون','الثالث والعشرون','الرابع والعشرون','الخامس والعشرون','السادس والعشرون','السابع والعشرون','الثامن والعشرون','التاسع والعشرون','الثلاثون'];
  const stories=[
    ['آدم عليه السلام',[1,2,7,15,17,18,20]],['نوح عليه السلام',[7,10,11,23,26,54,71]],['هود عليه السلام',[7,11,26,46]],['صالح عليه السلام',[7,11,26,27]],['إبراهيم عليه السلام',[2,6,9,11,14,15,19,21,26,29,37,51,60]],['لوط عليه السلام',[7,11,15,26,29,37,54]],['يوسف عليه السلام',[12,40]],['موسى عليه السلام',[2,7,10,17,18,20,26,27,28,40,43,44,79]],['داود وسليمان عليهما السلام',[2,4,21,27,34,38]],['أصحاب الكهف',[18]],['ذو القرنين',[18]],['مريم وعيسى عليهما السلام',[3,4,5,19,23,43,57,61]],['أصحاب الأخدود',[85]],['أصحاب الفيل',[105]]
  ];
  const $=id=>document.getElementById(id);
  const getSurahRows=()=>typeof surahs!=='undefined'&&Array.isArray(surahs)?surahs:[];
  function pageForSurah(n){const rows=getSurahRows();return (rows[n-1]&&Number(rows[n-1][1]))?Number(rows[n-1][1]):1;}
  function goPage(n){try{if(typeof loadPage==='function')loadPage(Math.max(1,Math.min(604,Number(n)||1)));}catch(e){} close();}
  function ensureUI(){
    if($('quranExplorerOverlay'))return;
    const menu=$('sideMenu'); if(!menu)return;
    const btn=document.createElement('button');btn.className='menu-item';btn.id='quranExplorerButton';btn.type='button';btn.textContent='🧭 خريطة القرآن ورحلاته';
    const before=$('searchButton'); if(before)menu.insertBefore(btn,before);else menu.appendChild(btn);
    const style=document.createElement('style');style.textContent=`#quranExplorerOverlay{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;padding:14px}#quranExplorerOverlay.open{display:flex}.qe-box{width:min(620px,100%);max-height:88vh;overflow:auto;background:var(--popup-bg,#fff);color:var(--text-color,#222);border-radius:18px;padding:16px;box-shadow:0 12px 40px #0005}.qe-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.qe-head h2{font-size:19px;margin:0}.qe-close,.qe-tab,.qe-item,.qe-action{border:0;border-radius:10px;padding:10px 12px;font:inherit;cursor:pointer}.qe-close{font-size:24px;background:transparent;color:inherit}.qe-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.qe-tab{background:#e8eee9;color:#174b2c}.qe-tab.active{background:#168443;color:white}.qe-content{display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:8px}.qe-item{background:rgba(22,132,67,.10);color:inherit;text-align:right;border:1px solid rgba(22,132,67,.2)}.qe-item small{display:block;opacity:.7;margin-top:4px}.qe-note{line-height:1.7;opacity:.8}.qe-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.qe-action{background:#168443;color:white}.qe-verse{width:100%;min-height:70px;border-radius:10px;padding:10px;border:1px solid #aaa;background:transparent;color:inherit;font:inherit}
/* الواجهة الزجاجية الجديدة: اجعل الخريطة تتبعها حتى في الوضع النهاري */
body.interface-new #quranExplorerOverlay .qe-box{background:rgba(28,42,56,.96);color:#f4f7f9;border:1px solid rgba(200,220,235,.22);box-shadow:0 16px 48px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.06)}
body.interface-new #quranExplorerOverlay .qe-head h2{color:#fff}
body.interface-new #quranExplorerOverlay .qe-tab{background:rgba(55,72,88,.72);color:#f4f7f9;border:1px solid rgba(200,220,235,.16)}
body.interface-new #quranExplorerOverlay .qe-tab.active{background:#50c878;color:#0a2018;border-color:#50c878}
body.interface-new #quranExplorerOverlay .qe-item{background:rgba(55,72,88,.58);color:#f4f7f9;border:1px solid rgba(200,220,235,.16)}
body.interface-new #quranExplorerOverlay .qe-item:active{background:rgba(70,92,110,.78)}
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
      host.innerHTML='<p class="qe-note">اختر جزءًا أو سورة للانتقال مباشرة إلى موضعها في المصحف.</p><h3>الأجزاء</h3><div class="qe-content" id="qeJuz"></div><h3>السور</h3><div class="qe-content" id="qeSurahs"></div>';
      juzStarts.forEach((p,i)=>{const b=document.createElement('button');b.className='qe-item';b.textContent='الجزء '+juzNames[i];b.addEventListener('click',()=>goPage(p));$('qeJuz').appendChild(b);});
      getSurahRows().forEach((s,i)=>{const b=document.createElement('button');b.className='qe-item';b.innerHTML=`${i+1}. ${s[0]}<small>صفحة ${s[1]}</small>`;b.addEventListener('click',()=>goPage(s[1]));$('qeSurahs').appendChild(b);});
    }else if(tab==='stories'){
      host.innerHTML='<p class="qe-note">اختر قصة، ثم اختر الحدث الذي تريد الوصول إليه. سينتقل المصحف إلى صفحة الآية المحددة.</p><div class="qe-content" id="qeStories"></div><div id="qeStoryDetail"></div>';
      storyDetails.forEach((s,i)=>{const b=document.createElement('button');b.className='qe-item';b.textContent=s.title;$('qeStories').appendChild(b);b.addEventListener('click',()=>renderStoryDetail(s));});
    }else if(tab==='journey'){
      host.innerHTML='<p class="qe-note">اختر رحلة موضوعية، ثم تنقّل بين محطاتها القرآنية. عند اختيار محطة ينتقل المصحف ومشغل التلاوة إلى الآية المحددة.</p><div class="qe-content" id="qeJourneys"></div><div id="qeJourneyDetail"></div>';
      journeyDetails.forEach(j=>{const b=document.createElement('button');b.className='qe-item';b.textContent=j.title;$('qeJourneys').appendChild(b);b.addEventListener('click',()=>renderJourney(j));});
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
  function renderStoryDetail(story){
    const host=$('qeStoryDetail');if(!host)return;
    host.innerHTML='<h3>'+story.title+'</h3><p class="qe-note">اضغط على الحدث للانتقال إلى آيته في المصحف.</p><div class="qe-content" id="qeStoryEvents"></div>';
    story.events.forEach(ev=>{
      const b=document.createElement('button');b.className='qe-item';
      b.innerHTML=ev[0]+'<small>سورة '+(getSurahRows()[ev[1]-1]?.[0]||ev[1])+' • الآية '+ev[2]+'</small>';
      b.addEventListener('click',()=>goToStoryAyah(ev[1],ev[2]));
      $('qeStoryEvents').appendChild(b);
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
  function renderJourney(journey){
    const detail=$('qeJourneyDetail')||$('qeContent');
    detail.innerHTML='<h3>'+journey.title+'</h3><p class="qe-note">هذه محطات مختارة للتدبر في الموضوع، وليست حصرًا لكل الآيات المتعلقة به. اضغط على المحطة لفتح موضعها في المصحف ومزامنة مشغل التلاوة.</p><div class="qe-content" id="qeJourneyItems"></div>';
    journey.events.forEach(ev=>{
      const b=document.createElement('button');b.className='qe-item';
      b.innerHTML=ev[0]+'<small>سورة '+(getSurahRows()[ev[1]-1]?.[0]||ev[1])+' • الآية '+ev[2]+'</small>';
      b.addEventListener('click',()=>goToStoryAyah(ev[1],ev[2]));
      $('qeJourneyItems').appendChild(b);
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
