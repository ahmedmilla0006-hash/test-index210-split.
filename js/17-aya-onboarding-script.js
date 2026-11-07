(function(){
  /*
    مفاتيح منفصلة:
    - aya_first_run_done  → دليل التشغيل (أول تثبيت فقط)
    - aya_seen_version    → ما الجديد (عند كل تحديث إصدار)
  */
  var KEY_FIRST = "aya_first_run_done";
  var KEY_VERSION = "aya_seen_version";
  /* توافق مع المفتاح القديم إن وُجد */
  var KEY_LEGACY = "aya_onboarding_seen_version";

  var onboardOv = document.getElementById("onboardingOverlay");
  var whatsOv = document.getElementById("whatsNewOverlay");

  function currentAppVersion(){
    try{ if(window.AYA_APP_VERSION) return String(window.AYA_APP_VERSION); }catch(e){}
    return "__AYA_BUILD_VERSION__";
  }

  /*
    جولة إرشاد فعلية على عناصر الواجهة:
    كل خطوة تُبرز عنصراً حقيقياً على الشاشة.
  */
  var TOUR_STEPS = [
    {
      selector: null,
      title: "مرحباً بك في آية",
      body: "جولة سريعة على الأزرار الحقيقية في الشاشة. اضغط «التالي» للبدء."
    },
    {
      selector: "#menuButton",
      title: "زر القائمة ☰",
      body: "من هنا تفتح القائمة: السور، الأجزاء، البحث، التفسير، الحفظ، الوضع الليلي، والتنزيلات."
    },
    {
      selector: "#pageArea",
      title: "صفحة المصحف",
      body: "ضغط قصير: إظهار/إخفاء الأزرار.\nضغط متوسط ثم ارفع إصبعك: فتح التفسير.\nضغط مطوّل: تشغيل التلاوة من الآية."
    },
    {
      selector: "#readerInfoTop",
      title: "اسم السورة والجزء",
      body: "هنا يظهر اسم السورة ورقم الجزء للصفحة الحالية."
    },
    {
      selector: ".player",
      title: "مشغّل التلاوة",
      body: "التشغيل، السابق/التالي، التكرار، والانتقال التلقائي للسورة التالية، واختيار القارئ والسورة من الأسفل."
    }
  ];

  /* احتياطي للعرض النصي القديم إن لزم */
  var FIRST_RUN_STEPS = TOUR_STEPS.map(function(s){
    return { title: s.title, html: String(s.body || "").replace(/\n/g, "<br>") };
  });

  /*
    ملاحظات كل إصدار — تظهر في «ما الجديد» بعد تثبيت تحديث جديد فقط.
    عند إصدار جديد: غيّر APP_VERSION وأضف عنصراً هنا بنفس رقم الإصدار.
  */
    var WHATS_NEW = {
    "1.0.188": [
      "إضافة القارئ <b>الشيخ عبدالله الخلف</b> مع تزامن تظليل الآيات (توقيت كامل)"
    ],
    "1.0.187": [
      "إصلاحات وتحسينات على تزامن تظليل الآيات مع التلاوة",
      "تحسين التحقق من اكتمال بيانات توقيت الآيات لجميع القراء",
      "معالجة مشكلة توقف التظليل قبل نهاية السورة",
      "تحسين حفظ بيانات التوقيت محلياً لدعم التشغيل دون إنترنت",
      "إصلاح مشكلة إعادة التلاوة من البداية عند انتهاء الملف المُنزّل والانتقال إلى التشغيل عبر الإنترنت",
      "تحسين استكمال التلاوة من موضع التوقف عند عودة الاتصال بالشبكة",
      "تحسينات عامة على الأداء والاستقرار"
    ],
    "1.0.185": [
      "إصلاحات وتحسينات على تزامن تظليل الآيات مع التلاوة",
      "تحسين التحقق من اكتمال بيانات توقيت الآيات لجميع القراء",
      "معالجة مشكلة توقف التظليل قبل نهاية السورة",
      "تحسين حفظ بيانات التوقيت محلياً لدعم التشغيل دون إنترنت",
      "تحسينات عامة على الأداء والاستقرار"
    ],
    "1.0.184": [
      "إصلاحات وتحسينات"
    ],
    "1.0.183": [
      "تشغيل أوفلاين أوضح وأكثر استقراراً: المقاطع الجزئية المحفوظة تُستخدم مباشرة عند انقطاع النت، وعند تبديل السورة بدون نت يُوقف المصدر القديم ويُحمَّل مقطع <b>نفس السورة فقط</b> (بدون اختلاط بين السور)"
    ],
    "1.0.181": [
      "إصلاحات وتحسينات"
    ],
    "1.0.171": [
      "تحسين التظليل عند التشغيل بدون إنترنت بعد الحفظ التدريجي",
      "حفظ التوقيت وأبعاد الصفحة محلياً للعمل دون نت",
      "تحميل تدريجي للتلاوة حتى موضع القراءة فقط"
    ],
    "1.0.170": [
      "إصلاحات وتحسينات"
    ],
    "1.0.169": [
      "إضافة قسم <b>شكر وعرفان</b> في المساعدة مع روابط المصادر وبيان حقوق الاستخدام",
      "إمكانية <b>التقدّم والترجيع</b> بالضغط والسحب على شريط الصوت أثناء التلاوة",
      "تفعيل التقدّم من شريط الصوت أيضاً في <b>وضع الاستماع فقط</b>",
      "تحسين شكل <b>شريط التمرير</b> ليتوافق مع واجهة التطبيق",
      "تسريع <b>بدء تشغيل التلاوة</b> عند اختيار أي قارئ أو الضغط على تشغيل، دون انتظار اكتمال التحميل"
    ],
    "1.0.168": [
      "علامات مرجعية متعددة: حفظ أكثر من آية",
      "حفظ الآية الحالية أثناء التلاوة أو بعد اختيار آية بالضغط المطوّل",
      "قائمة العلامات المرجعية مع فتح أو حذف أي علامة",
      "ترتيب العلامات حسب ترتيب المصحف (السورة ثم الآية)"
    ],
    "1.0.167": [
      "إضافة قسم <b>قراء للاستماع فقط</b> من القائمة الجانبية",
      "مشغّل مخصص للاستماع <b>بدون عرض المصحف</b> وبدون تظليل الآيات",
      "قراء للاستماع فقط: البنا · مصطفى إسماعيل · جبريل · بليلة · إسلام صبحي · اللحيدان · الجبرين · العفاسي (كاليفورنيا) · إمام فيصل محمد",
      "إضافة إلى قائمة التلاوة مع التظليل: <b>السديس · الطبلاوي · الأخضر · نبيل الرفاعي · هاني الرفاعي · الأركاني · صلاح بو خاطر</b>",
      "قائمة السور في وضع الاستماع تعرض <b>السور المتوفرة فقط</b> لكل قارئ",
      "أزرار السورة السابقة/التالية تنتقل بين السور المتوفرة فقط",
      "عند انتهاء السورة في وضع الاستماع تنتقل تلقائياً إلى <b>السورة التالية</b>",
      "تحسين تشغيل الصوت في وضع الاستماع على أجهزة أندرويد"
    ],
    "1.0.165": [
      "إصلاحات وتحسينات في الإشعارات"
    ],
    "1.0.162": [
      "تحسين تزامن <b>صوت الشيخ ياسر الدوسري</b> مع ملف صوتي متوافق من مصدر موثوق",
      "قفز أدق لأول آية في الصفحة عند قلب الصفحات <b>بدون تقطيع</b> في الصوت",
      "تحسينات عامة في استقرار التشغيل والتوقيت"
    ],
    "1.0.161": [
      "إصلاحات وتحسينات"
    ],
    "1.0.126": [
      "قسم المساعدة داخل القائمة"
    ],
    "1.0.127": [
      "إضافة <b>التفسير</b>: الطبري · ابن كثير · البغوي",
      "فتح التفسير بالضغط على الآية ثم رفع الإصبع (حوالي 200ms)",
      "تشغيل التلاوة بالضغط المطوّل على الآية (حوالي 700ms)",
      "قسم <b>المساعدة</b> الشامل من القائمة",
      "إصلاح وتحسين <b>عملية البحث</b>: نتائج أدق لكل الآيات",
      "البحث عن كلمة يظهر السورة وجميع الآيات التي تحتويها",
      "اختيار السورة من البحث يبدأ التلاوة من أولها",
      "نافذة البحث تبقى مفتوحة حتى الإغلاق لاختيار نتيجة أخرى"
    ],
    "1.0.128": [
      "تحسين <b>البحث</b>: مطابقة أسماء السور والكلمات الكاملة (وليس الحروف داخل الكلمات)",
      "إمكانية البحث عن سور بأسماء حرف واحد مثل <b>ص</b> و<b>ق</b>",
      "مسح نص البحث والنتائج عند الإغلاق بزر ✕"
    ],
    "1.0.137": [
      "تحسينات في <b>عملية البحث</b>",
      "المطابقة الجزئية لأسماء السور والكلمات تبدأ من <b>3 أحرف</b> فقط",
      "عرض <b>عدد النتائج</b> أعلى قائمة البحث",
      "مسح نص البحث والنتائج عند الإغلاق بزر ✕"
    ],
    "1.0.138": [
      "قوائم <b>اختيار القارئ</b> و<b>اختيار السورة</b> في الثيم الزجاجي أصبحت <b>ملء الشاشة</b> مثل الثيم الكلاسيكي",
      "إصلاح حصر القوائم داخل المشغّل الذي كان يمنع ملء الشاشة"
    ],
    "1.0.145": [
      "تحسين سرعة وثبات الانتقال بين الأجزاء",
      "عرض جميع نتائج البحث",
      "إضافة خيار <b>إبقاء الشاشة مضاءة</b> من الإعدادات لمنع انطفاء الشاشة أثناء القراءة",
      "إضافة زر تبديل <b>الوضع الليلي</b> داخل الإعدادات",
      "تحسين عرض حالة الإعدادات من خلال مفاتيح تشغيل وإيقاف واضحة"
    ],
    "1.0.154": [
      "إصلاح <b>إبقاء الشاشة مضاءة</b>: يبقى الخيار فعّالاً بعد الخروج من التطبيق والعودة إليه",
      "عرض <b>رقم الإصدار</b> أسفل القائمة الجانبية",
      "رابط <b>إصدار جديد متوفر: تحديث</b> أسفل القائمة عند توفر تحديث"
    ],
    "1.0.148": [
      "إخفاء تلقائي للمشغّل وزر القائمة بعد <b>4</b> ثوانٍ مع إمكانية الإظهار والإخفاء بالضغط"
    ],
    "1.0.147": [
      "إصلاح <b>تشغيل التلاوة</b> عندما كان يتوقف أحياناً أو لا يعمل بعد التنقل",
      "تحسين ثبات تحميل الصوت عند قلب الصفحات وتغيير السور بسرعة",
      "إعادة محاولة التشغيل تلقائياً عند فشل بدء التلاوة"
    ],
    "1.0.146": [
      "إصلاحات عامة وتحسينات في استقرار التطبيق",
      "تحسين سرعة واستجابة بعض عناصر التطبيق",
      "تحسين الانتقال بين الصفحات والأجزاء",
      "تحسين عرض الواجهات والإعدادات",
      "تحسين الأداء ومعالجة بعض المشاكل البسيطة",
      "ضبط <b>تظليل الآية</b> بنسبة شفافية ثابتة <b>50%</b>",
      "مزامنة <b>اسم السورة في المشغّل</b> عند التنقل بين السور من القائمة الجانبية"
    ],
    "1.0.142": [
      "إضافة التواصل مع أبو إسلام عبر تيليجرام من القائمة الجانبية",
      "إضافة رسائل الدعم والتواصل للمساعدة في حل مشاكل التطبيق"
    ],
    "1.0.141": [
      "تحسين <b>البحث في القرآن</b>: النتائج أصبحت تطابق الكلمة أو العبارة <b>كاملة</b> فقط"
    ]
  };

  function parseVer(v){
    return String(v || "0").split(".").map(function(x){ return parseInt(x, 10) || 0; });
  }
  function cmpVer(a, b){
    var pa = parseVer(a), pb = parseVer(b);
    var n = Math.max(pa.length, pb.length);
    for(var i=0;i<n;i++){
      var da = pa[i] || 0, db = pb[i] || 0;
      if(da > db) return 1;
      if(da < db) return -1;
    }
    return 0;
  }
  /* يجمع ملاحظات الإصدارات بين آخر ما شوهد والحالي — الأحدث أولاً ثم الأقدم */
  function collectWhatsNew(fromVer, toVer){
    var keys = Object.keys(WHATS_NEW).sort(function(a, b){ return cmpVer(b, a); });
    var out = [];
    for(var i=0;i<keys.length;i++){
      var k = keys[i];
      if(fromVer && cmpVer(k, fromVer) <= 0) continue;
      if(toVer && cmpVer(k, toVer) > 0) continue;
      out.push({ ver: k, items: WHATS_NEW[k] || [] });
    }
    return out;
  }

  /* ---- أول تشغيل: جولة على العناصر الفعلية ---- */
  var titleEl = document.getElementById("onboardTitle");
  var bodyEl = document.getElementById("onboardBody");
  var dotsEl = document.getElementById("onboardDots");
  var prevBtn = document.getElementById("onboardPrev");
  var nextBtn = document.getElementById("onboardNext");
  var skipBtn = document.getElementById("onboardSkip");
  var steps = FIRST_RUN_STEPS.slice();
  var step = 0;
  var shownOnce = false;

  var tourRoot = document.getElementById("ayaTourRoot");
  var tourHole = document.getElementById("ayaTourHole");
  var tourTip = document.getElementById("ayaTourTip");
  var tourTipTitle = document.getElementById("ayaTourTipTitle");
  var tourTipBody = document.getElementById("ayaTourTipBody");
  var tourNext = document.getElementById("ayaTourNext");
  var tourPrev = document.getElementById("ayaTourPrev");
  var tourSkip = document.getElementById("ayaTourSkip");
  var tourDots = document.getElementById("ayaTourDots");
  var tourStep = 0;
  var tourActive = false;

  function markFirstRunDone(){
    try{
      localStorage.setItem(KEY_FIRST, "1");
      localStorage.setItem(KEY_VERSION, currentAppVersion());
      localStorage.setItem(KEY_LEGACY, currentAppVersion());
    }catch(e){}
  }

  function markVersionSeen(){
    try{
      localStorage.setItem(KEY_VERSION, currentAppVersion());
      localStorage.setItem(KEY_LEGACY, currentAppVersion());
      if(!localStorage.getItem(KEY_FIRST)) localStorage.setItem(KEY_FIRST, "1");
    }catch(e){}
  }

  function showReadingControlsForTour(){
    try{
      if(typeof setReadingUIHidden === "function") setReadingUIHidden(false);
    }catch(e){}
    try{
      document.querySelectorAll(".player, .menu-button, #refHeader, #refBottomBar").forEach(function(el){
        el.classList.remove("ui-hidden");
      });
      document.body.classList.remove("ui-controls-hidden");
    }catch(e){}
  }

  function placeTourTip(rect){
    if(!tourTip) return;
    var tipW = Math.min(window.innerWidth * 0.9, 340);
    var tipH = tourTip.offsetHeight || 160;
    var margin = 12;
    var left, top;

    if(!rect){
      left = (window.innerWidth - tipW) / 2;
      top = (window.innerHeight - tipH) / 2;
    }else{
      left = rect.left + (rect.width - tipW) / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
      /* فضّل أسفل العنصر، وإلا أعلاه */
      if(rect.bottom + tipH + margin + 8 < window.innerHeight){
        top = rect.bottom + 12;
      }else if(rect.top - tipH - margin > 0){
        top = rect.top - tipH - 12;
      }else{
        top = Math.max(margin, window.innerHeight - tipH - margin);
      }
    }
    tourTip.style.width = tipW + "px";
    tourTip.style.left = left + "px";
    tourTip.style.top = top + "px";
  }

  function renderTourStep(){
    if(!tourRoot || !tourHole) return;
    var s = TOUR_STEPS[tourStep] || TOUR_STEPS[0];
    if(tourTipTitle) tourTipTitle.textContent = s.title || "";
    if(tourTipBody) tourTipBody.innerHTML = String(s.body || "").replace(/\n/g, "<br>");
    if(tourPrev) tourPrev.style.display = tourStep > 0 ? "inline-block" : "none";
    if(tourNext) tourNext.textContent = tourStep >= TOUR_STEPS.length - 1 ? "ابدأ القراءة" : "التالي";

    if(tourDots){
      tourDots.innerHTML = "";
      var isClassic = document.body.classList.contains("interface-old");
      var activeCol = isClassic ? "#16803b" : "#79d69a";
      for(var i=0;i<TOUR_STEPS.length;i++){
        var d = document.createElement("span");
        if(i===tourStep) d.className = "tour-dot-active";
        d.style.cssText = "width:7px;height:7px;border-radius:50%;display:inline-block;background:"+(i===tourStep?activeCol:"rgba(255,255,255,.28)");
        tourDots.appendChild(d);
      }
    }

    var el = null;
    if(s.selector){
      try{ el = document.querySelector(s.selector); }catch(e){ el = null; }
    }

    if(el){
      try{ el.scrollIntoView({ block: "nearest", inline: "nearest" }); }catch(e){}
      var r = el.getBoundingClientRect();
      var pad = 8;
      tourHole.style.display = "block";
      tourHole.style.top = Math.max(4, r.top - pad) + "px";
      tourHole.style.left = Math.max(4, r.left - pad) + "px";
      tourHole.style.width = Math.min(window.innerWidth - 8, r.width + pad * 2) + "px";
      tourHole.style.height = Math.min(window.innerHeight - 8, r.height + pad * 2) + "px";
      placeTourTip(r);
    }else{
      /* خطوة عامة: إطار في الوسط */
      var w = Math.min(window.innerWidth * 0.72, 280);
      var h = Math.min(window.innerHeight * 0.18, 120);
      tourHole.style.display = "block";
      tourHole.style.top = (window.innerHeight - h) / 2 - 40 + "px";
      tourHole.style.left = (window.innerWidth - w) / 2 + "px";
      tourHole.style.width = w + "px";
      tourHole.style.height = h + "px";
      placeTourTip(null);
    }
  }

  function closeTour(){
    tourActive = false;
    if(tourRoot){
      tourRoot.style.display = "none";
      tourRoot.setAttribute("aria-hidden", "true");
    }
    markFirstRunDone();
  }

  function openFirstRun(){
    showReadingControlsForTour();
    tourStep = 0;
    tourActive = true;
    if(onboardOv) onboardOv.classList.remove("show");
    if(tourRoot){
      tourRoot.style.display = "block";
      tourRoot.setAttribute("aria-hidden", "false");
    }
    setTimeout(renderTourStep, 80);
    setTimeout(renderTourStep, 320);
  }

  function closeOnboard(){
    if(onboardOv) onboardOv.classList.remove("show");
    closeTour();
  }

  function renderOnboard(){
    /* للتوافق إن فُتح النص القديم */
    if(!onboardOv) return;
    var s = steps[step] || { title: "", html: "" };
    if(titleEl) titleEl.textContent = s.title;
    if(bodyEl) bodyEl.innerHTML = s.html;
    if(dotsEl){
      dotsEl.innerHTML = "";
      for(var i=0;i<steps.length;i++){
        var d = document.createElement("span");
        d.style.cssText = "width:8px;height:8px;border-radius:50%;display:inline-block;background:"+(i===step?"#79d69a":"rgba(255,255,255,.28)");
        dotsEl.appendChild(d);
      }
    }
    if(prevBtn) prevBtn.style.display = step > 0 ? "block" : "none";
    if(nextBtn) nextBtn.textContent = step >= steps.length - 1 ? "ابدأ القراءة" : "التالي";
  }

  if(tourNext) tourNext.onclick = function(){
    if(tourStep >= TOUR_STEPS.length - 1) closeTour();
    else { tourStep++; renderTourStep(); }
  };
  if(tourPrev) tourPrev.onclick = function(){
    if(tourStep > 0){ tourStep--; renderTourStep(); }
  };
  if(tourSkip) tourSkip.onclick = closeTour;
  window.addEventListener("resize", function(){ if(tourActive) renderTourStep(); });

  if(prevBtn) prevBtn.onclick = function(){ if(step>0){ step--; renderOnboard(); } };
  if(nextBtn) nextBtn.onclick = function(){
    if(step >= steps.length - 1) closeOnboard();
    else { step++; renderOnboard(); }
  };
  if(skipBtn) skipBtn.onclick = closeOnboard;
  if(onboardOv) onboardOv.addEventListener("click", function(e){ if(e.target === onboardOv) closeOnboard(); });

  /* ---- ما الجديد (بعد التحديث) ---- */
  var wnTitle = document.getElementById("whatsNewTitle");
  var wnVer = document.getElementById("whatsNewVersion");
  var wnBody = document.getElementById("whatsNewBody");
  var wnClose = document.getElementById("whatsNewClose");
  var wnOk = document.getElementById("whatsNewOk");

  function closeWhatsNew(){
    if(whatsOv) whatsOv.classList.remove("show");
    markVersionSeen();
  }

  function openWhatsNew(){
    if(!whatsOv) return;
    var ver = currentAppVersion();
    var lastSeen = null;
    try{
      lastSeen = localStorage.getItem(KEY_VERSION) || localStorage.getItem(KEY_LEGACY) || null;
    }catch(e){}

    if(wnTitle) wnTitle.textContent = "ما الجديد";
    if(wnVer) wnVer.textContent = "حتى الإصدار " + ver;

    /* كل ما بين آخر إصدار شوهد والحالي (مثل 127 + 128 + 129) */
    var groups = collectWhatsNew(lastSeen, ver);
    /*
      فتح يدوي من المساعدة (أو بعد مشاهدة الإصدار الحالي):
      اعرض كل ملاحظات الإصدارات المتاحة حتى يظهر 1.0.127 وما بعده.
    */
    if(!groups.length){
      var keys = Object.keys(WHATS_NEW).sort(function(a, b){ return cmpVer(b, a); });
      groups = [];
      for(var ki = 0; ki < keys.length; ki++){
        groups.push({ ver: keys[ki], items: WHATS_NEW[keys[ki]] || [] });
      }
    }

    var html = "";
    var any = false;
    for(var g=0;g<groups.length;g++){
      var block = groups[g];
      if(!block.items || !block.items.length) continue;
      any = true;
      html += "<div style='font-weight:800;color:#79d69a;margin:"+(g? "14px":"0")+" 0 8px;font-size:15px'>الإصدار " + block.ver + "</div>";
      html += "<ul style='margin:0;padding-right:18px'>";
      for(var i=0;i<block.items.length;i++){
        html += "<li style='margin-bottom:8px'>" + block.items[i] + "</li>";
      }
      html += "</ul>";
    }
    if(!any){
      html = "<div style='color:#ccc'>تحسينات عامة واستقرار في هذا الإصدار.</div>";
    }
    if(wnBody) wnBody.innerHTML = html;
    whatsOv.classList.add("show");
  }

  if(wnClose) wnClose.onclick = closeWhatsNew;
  if(wnOk) wnOk.onclick = closeWhatsNew;
  if(whatsOv) whatsOv.addEventListener("click", function(e){ if(e.target === whatsOv) closeWhatsNew(); });

  /*
    القرار:
    - لا يوجد KEY_FIRST ولا سجل قديم → أول تثبيت → دليل التشغيل
    - يوجد تثبيت سابق وإصدار مختلف → تحديث → ما الجديد
    - نفس الإصدار → لا شيء
  */
  function decide(){
    var ver = currentAppVersion();
    var firstDone = null;
    var seenVer = null;
    var legacy = null;
    try{
      firstDone = localStorage.getItem(KEY_FIRST);
      seenVer = localStorage.getItem(KEY_VERSION);
      legacy = localStorage.getItem(KEY_LEGACY);
    }catch(e){}

    /* ترحيل من المفتاح القديم */
    if(!firstDone && !seenVer && legacy){
      try{
        localStorage.setItem(KEY_FIRST, "1");
        localStorage.setItem(KEY_VERSION, legacy);
      }catch(e){}
      firstDone = "1";
      seenVer = legacy;
    }

    if(!firstDone && !seenVer && !legacy) return "first";
    var last = seenVer || legacy || "";
    if(last === ver) return null;
    return "update";
  }

  function schedule(){
    if(shownOnce) return;
    var m = decide();
    if(!m) return;
    var run = function(){
      if(shownOnce) return;
      if(decide() !== m) return;
      shownOnce = true;
      if(m === "first") openFirstRun();
      else openWhatsNew();
    };
    /* بعد شاشة الافتتاح */
    setTimeout(run, 2500);
    setTimeout(run, 4500);
  }

  if(document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule);

  /* من المساعدة: عرض يدوي دون تغيير حالة «أول تشغيل» إلا عند الإغلاق الطبيعي */
  window.__ayaShowOnboarding = openFirstRun;
  window.__ayaShowWhatsNew = openWhatsNew;
})();
