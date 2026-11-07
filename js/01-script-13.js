/*
  ============================================================================
  مصحف تفاعلي — ملاحظات عامة للكود
  ============================================================================
  - الصفحات: SVG من mp3quran (quran_pages_svg)
  - التلاوة: ملفات سورة كاملة من خوادم mp3quran حسب القارئ
  - التوقيت والتمييز: ayat_timing API (مضلعات polygon لكل آية)
  - الضغط القصير على الصفحة: إخفاء/إظهار المشغّل وزر القائمة (انسدال)
  - الضغط المطوّل على آية: الانتقال إليها + تشغيل (يدعم عدة سور في الصفحة)
  - السحب الأفقي: الصفحة التالية/السابقة
  الحالة تُحفظ في localStorage: الصفحة، القارئ، وضع التمييز، إخفاء الواجهة
  ============================================================================
*/

const TOTAL_PAGES = 604;

let currentPage =
  Number(localStorage.getItem("quranPage") || 1);

let highlightMode = localStorage.getItem("highlightMode") || "word-color";
/* إزالة وضع متابعة الكلمة إن كان محفوظاً سابقاً */
if(highlightMode === "word-by-word"){
  highlightMode = "word-color";
  localStorage.setItem("highlightMode", highlightMode);
}
let highlightColor = localStorage.getItem("highlightColor") || "#168443";
/* التظليل: أغمق وأوضح كما طُلب — التلوين يبقى بالنسخة الأصلية */
function getShadeFillAlpha(){ return 0.50; }
function getShadeStrokeAlpha(){ return 0.28; }

let startX = 0;

const page =
  document.getElementById("quranPage");

const pageArea =
  document.getElementById("pageArea");

const audio =
  document.getElementById("audio");

const playButton =
  document.getElementById("playButton");

const progress =
  document.getElementById("progress");

const currentTime =
  document.getElementById("currentTime");

const duration =
  document.getElementById("duration");

const readerSelect =
  document.getElementById("readerSelect");

const readerName =
  document.getElementById("readerName");

const menuButton =
  document.getElementById("menuButton");

const sideMenu =
  document.getElementById("sideMenu");

const overlay =
  document.getElementById("overlay");

const closeMenu =
  document.getElementById("closeMenu");

const surahOverlay =
  document.getElementById("surahOverlay");

const surahList =
  document.getElementById("surahList");

const surahClose =
  document.getElementById("surahClose");

const juzOverlay =
  document.getElementById("juzOverlay");

const juzList =
  document.getElementById("juzList");

const juzClose =
  document.getElementById("juzClose");

const aboutOverlay =
  document.getElementById("aboutOverlay");

const aboutButton =
  document.getElementById("aboutButton");

const telegramContactButton =
  document.getElementById("telegramContactButton");

const aboutClose =
  document.getElementById("aboutClose");


/* =========================
   تحميل الصفحة
========================= */

let currentAudioSurah = null;

function loadPage(n, options = {}){

  currentPage =
    Math.max(
      1,
      Math.min(TOTAL_PAGES, n)
    );

  localStorage.setItem(
    "quranPage",
    currentPage
  );

  if(typeof updateMushafPageInfo === "function"){
    updateMushafPageInfo();
  }

  loadQuranPageFromInternet(currentPage);

  clearAyahHighlight();

  /* تجهيز مسبق لتوقيت كل سور الصفحة (يُسرّع الضغط المطوّل لاحقاً) */
  if(typeof loadPageHitTiming === "function"){
    loadPageHitTiming(currentPage);
  }

  // عندما تكون الصفحة التالية داخل نفس مسار التلاوة،
  // نغيّر الصورة فقط ولا نعيد تحميل ملف الصوت.
  if(options.keepAudio){
    syncHighlight();
    return;
  }

  const navShouldContinue =
    !!options.autoContinue ||
    !!(typeof userWantsPlay !== "undefined" && userWantsPlay) ||
    !!(typeof audio !== "undefined" && audio && !audio.paused);

  updateAudioSource(
    false,
    {
      autoContinue: navShouldContinue,
      surahNumber: options.surahNumber || null,
      startAyah: options.startAyah || null
    }
  );
}


/* =========================
   الصفحة التالية
========================= */

/* =========================
   الصفحة التالية
========================= */

function nextPage(){

  if(currentPage < TOTAL_PAGES){
    /* التقليب اليدوي مفعّل دائماً — يحدّث الصفحة والصوت لموضع الصفحة */
    loadPage(currentPage + 1);
  }

}


/* =========================
   الصفحة السابقة
========================= */

function prevPage(){

  if(currentPage > 1){
    loadPage(currentPage - 1);
  }

}


/* =========================
   السحب بين الصفحات
   يُلغى إذا نجح ضغط مطوّل على آية حتى لا تتغيّر الصفحة بالخطأ
========================= */

pageArea.addEventListener(
  "touchstart",
  e=>{

    startX =
      e.touches[0].clientX;

  },
  {passive:true}
);

pageArea.addEventListener(
  "touchend",
  e=>{

    /* لا تقلب الصفحة بعد اختيار آية بالضغط المطوّل */
    if(typeof longPressTriggered !== "undefined" && longPressTriggered){
      return;
    }

    const endX =
      e.changedTouches[0].clientX;

    const dx =
      endX - startX;

    if(Math.abs(dx) < 60){
      return;
    }

    if(dx < 0){
      prevPage();
    }else{
      nextPage();
    }

  },
  {passive:true}
);


/* =========================
   القائمة
========================= */

function openMenu(){

  sideMenu.classList.add("open");
  try{ clearReadingUIAutoHide(); }catch(e){}

  overlay.classList.add("show");

}

function closeSideMenu(){

  sideMenu.classList.remove("open");
  try{ if(!readingUIHidden) scheduleReadingUIAutoHide(); }catch(e){}

  overlay.classList.remove("show");

}

menuButton.onclick =
  openMenu;

closeMenu.onclick =
  closeSideMenu;

overlay.onclick =
  closeSideMenu;


/* =====================================================
   إخفاء/إظهار واجهة القراءة
   الضغط على أي مكان في صفحة المصحف يبدّل الواجهة.
   الأزرار والقائمة تبقى في مواضعها الأصلية.
===================================================== */
const readingUI = {
  menuButton: document.getElementById("menuButton"),
  player: document.querySelector(".player"),
  sideMenu: document.getElementById("sideMenu")
};

let readingUIHidden =
  localStorage.getItem("readingUIHidden") === "1";


/* إخفاء تلقائي للمشغّل وزر القائمة مع الإبقاء على الإظهار/الإخفاء بالضغط */
let readingUIAutoHideTimer = null;
const READING_UI_AUTO_HIDE_MS = 4000;

function clearReadingUIAutoHide(){
  if(readingUIAutoHideTimer){
    clearTimeout(readingUIAutoHideTimer);
    readingUIAutoHideTimer = null;
  }
}

function scheduleReadingUIAutoHide(){
  clearReadingUIAutoHide();
  /* لا نخفي تلقائياً والقائمة الجانبية مفتوحة */
  try{
    if(readingUI.sideMenu && readingUI.sideMenu.classList.contains("open")){
      return;
    }
  }catch(e){}
  /* أثناء تحميل الصوت (نت ضعيف) أبقِ الواجهة ظاهرة */
  try{
    if(typeof audioIsLoading !== "undefined" && audioIsLoading){
      return;
    }
  }catch(e){}
  if(readingUIHidden) return;
  readingUIAutoHideTimer = setTimeout(function(){
    readingUIAutoHideTimer = null;
    try{
      if(readingUI.sideMenu && readingUI.sideMenu.classList.contains("open")){
        return;
      }
    }catch(e){}
    if(!readingUIHidden){
      setReadingUIHidden(true);
    }
  }, READING_UI_AUTO_HIDE_MS);
}

function setReadingUIHidden(hidden){
  readingUIHidden = !!hidden;

  if(readingUI.menuButton){
    readingUI.menuButton.classList.toggle("ui-hidden", readingUIHidden);
  }

  if(readingUI.player){
    readingUI.player.classList.toggle("ui-hidden", readingUIHidden);
  }

  /* معلومات المصحف ليست من أزرار التحكم؛ تبقى ظاهرة دائمًا مثل المصحف الورقي. */
  /*
    القائمة الجانبية نفسها تُعامل كعنصر من عناصر الواجهة.
    إذا كانت مفتوحة فلا نخفيها فجأة أثناء استخدامها.
  */
  if(readingUI.sideMenu && !readingUI.sideMenu.classList.contains("open")){
    readingUI.sideMenu.classList.toggle("ui-hidden", readingUIHidden);
  }

  /*
    --player-height يضبط موضع رقم الصفحة أسفل الشاشة.
    عند إخفاء المشغّل نجعله 0 حتى ينزل الرقم للأسفل مع الحركة.
  */
  if(readingUIHidden){
    document.documentElement.style.setProperty("--player-height", "0px");
  }else if(readingUI.player){
    try{
      const rect = readingUI.player.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      const gap = Math.max(0, vh - rect.top);
      document.documentElement.style.setProperty("--player-height", Math.ceil(gap) + "px");
    }catch(e){
      const h = readingUI.player.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--player-height", h + "px");
    }
  }

  localStorage.setItem(
    "readingUIHidden",
    readingUIHidden ? "1" : "0"
  );

  if(readingUIHidden){
    clearReadingUIAutoHide();
  }else{
    scheduleReadingUIAutoHide();
  }
}

function toggleReadingUI(){
  /*
    إذا كانت القائمة مفتوحة، لا نغلقها بالضغط داخلها.
    الضغط خارجها/على المصحف يعالج إظهار الواجهة.
  */
  if(readingUI.sideMenu &&
     readingUI.sideMenu.classList.contains("open")){
    return;
  }

  setReadingUIHidden(!readingUIHidden);
}

/* تطبيق الحالة المحفوظة بعد تحميل الواجهة */
setReadingUIHidden(readingUIHidden);

/* أي تفاعل مع المشغّل يعيد عدّاد الإخفاء التلقائي */
(function(){
  function bump(){
    try{
      if(!readingUIHidden) scheduleReadingUIAutoHide();
    }catch(e){}
  }
  document.addEventListener("pointerdown", function(e){
    var t = e.target;
    if(!t || !t.closest) return;
    if(t.closest(".player") || t.closest("#menuButton") || t.closest(".side-menu") || t.closest(".menu-button")){
      bump();
    }
  }, true);
})();


/*
  ============================================================
  التفاعل باللمس على صفحة المصحف
  ------------------------------------------------------------
  1) ضغط قصير (< 200ms وبدون حركة) عند الرفع
     → إظهار/إخفاء أزرار التحكم (toggleReadingUI)
  2) ضغط >= 200ms ثم رفع الإصبع (قبل 700ms)
     → فتح تفسير الآية
  3) ضغط مطوّل (>= 700ms)
     → تشغيل تلاوة الآية (بدون فتح التفسير أثناء الضغط)
  3) سحب أفقي
     → تنقل بين الصفحات (معالج touchstart/touchend المنفصل)
  أزرار المشغّل والقائمة لا تمر من هنا (يُستبعد أقرب عنصر تحكم).
  ============================================================
*/
let uiTapStartX = 0;
let uiTapStartY = 0;
let uiTapStartTime = 0;
let longPressTimer = null;   /* مؤقت تشغيل الآية (700ms) */
let tafsirPressTimer = null; /* مؤقت اختيار الآية للتفسير (200ms) */
let longPressTriggered = false; /* تشغيل التلاوة */
let tafsirPressTriggered = false; /* فتح التفسير */
const TAFSIR_PRESS_MS = 200; /* اختيار الآية → التفسير */
const LONG_PRESS_MS = 700;   /* اختيار الآية → القراءة */
const TAP_MOVE_MAX = 28;
const HIT_NEAREST_MAX = 80;

function clearLongPressTimer(){
  if(longPressTimer){
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  if(tafsirPressTimer){
    clearTimeout(tafsirPressTimer);
    tafsirPressTimer = null;
  }
}

/* اختبار نقطة داخل مضلع (ray casting) — إحداثيات viewBox لصفحة SVG */
function pointInPolygon(x, y, pts){
  let inside = false;
  for(let i = 0, j = pts.length - 1; i < pts.length; j = i++){
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const intersect =
      ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi);
    if(intersect) inside = !inside;
  }
  return inside;
}

function parsePolygonPoints(polygon){
  return String(polygon || "").trim().split(/\s+/).map(pair=>{
    const p = pair.split(",").map(Number);
    return (p.length === 2 && p.every(Number.isFinite)) ? p : null;
  }).filter(Boolean);
}

/* مركز تقريبي للمضلع */
function polygonCentroid(pts){
  let sx = 0, sy = 0;
  for(let i = 0; i < pts.length; i++){
    sx += pts[i][0];
    sy += pts[i][1];
  }
  return [sx / pts.length, sy / pts.length];
}

/* هل النقطة داخل المستطيل المحيط بالمضلع مع هامش؟ */
function pointInExpandedBBox(x, y, pts, margin){
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for(let i = 0; i < pts.length; i++){
    const px = pts[i][0], py = pts[i][1];
    if(px < minX) minX = px;
    if(py < minY) minY = py;
    if(px > maxX) maxX = px;
    if(py > maxY) maxY = py;
  }
  return x >= minX - margin && x <= maxX + margin &&
         y >= minY - margin && y <= maxY + margin;
}

/*
  تحويل إحداثيات الشاشة (clientX/Y) إلى نظام إحداثيات viewBox.
  نحسب المقياس من أبعاد الصورة المعروضة مقابل viewBox الحقيقي
  (نفس أسلوب طبقة التمييز) مع object-position: center center.
*/
function clientToPageSvgCoords(clientX, clientY){
  if(!page || !page.complete) return null;

  const imageRect = page.getBoundingClientRect();
  if(imageRect.width <= 0 || imageRect.height <= 0) return null;

  const m = typeof getHighlightMapping === "function"
    ? getHighlightMapping(currentPage)
    : null;

  const viewW = m && m.viewW ? m.viewW : (page.naturalWidth || 456);
  const viewH = m && m.viewH ? m.viewH : (page.naturalHeight || 672);
  const x0 = m && Number.isFinite(m.x0) ? m.x0 : 0;
  const y0 = m && Number.isFinite(m.y0) ? m.y0 : 0;

  /*
    الصورة تُعرض بـ object-fit:contain و object-position:center center.
    نحسب منطقة الرسم الفعلية داخل صندوق الـ img (letterbox) بدقة.
  */
  const scale = Math.min(imageRect.width / viewW, imageRect.height / viewH);
  const drawnW = viewW * scale;
  const drawnH = viewH * scale;
  const offsetX = (imageRect.width - drawnW) / 2;
  const offsetY = (imageRect.height - drawnH) / 2; /* center */

  const localX = clientX - imageRect.left - offsetX;
  const localY = clientY - imageRect.top - offsetY;

  /* هامش سماح صغير خارج الرسم */
  if(localX < -8 || localY < -8 || localX > drawnW + 8 || localY > drawnH + 8){
    return null;
  }

  return {
    x: x0 + localX / scale,
    y: y0 + localY / scale,
    scale: scale
  };
}

/*
  إرجاع أرقام كل السور التي تظهر في صفحة معيّنة.
  ضروري لأن Timing API يُطلب لكل سورة على حدة، بينما الصفحة
  قد تضم عدة سور (خاصة جزء عمّ وصفحة 604).

  ملاحظة مهمة:
  - سور تبدأ في نفس الصفحة (الإخلاص/الفلق/الناس في 604)
  - سور تكتمل آياتها في صفحة بداية السورة التالية (بقية النبأ في 583)
  لذلك end = next (شامل صفحة بداية السورة التالية) ثم نفلتر بالـ API.
*/
function getSurahsOnPage(pageNumber){
  const p = Number(pageNumber) || 1;
  if(typeof surahs === "undefined" || !Array.isArray(surahs)) return [];
  const maxPage = typeof TOTAL_PAGES !== "undefined" ? TOTAL_PAGES : 604;
  const list = [];
  for(let i = 0; i < surahs.length; i++){
    const start = Number(surahs[i][1]);
    const next =
      i < surahs.length - 1
        ? Number(surahs[i + 1][1])
        : maxPage + 1;
    /*
      نهاية السورة تشمل صفحة بداية السورة التالية.
      مثال: النبأ تبدأ 582 والنازعات 583، وبقية النبأ موجودة فعلياً في 583.
      التصفية النهائية تتم عبر حقل page في Timing API.
    */
    const end = next;
    if(p >= start && p <= end && p <= maxPage){
      list.push(i + 1);
    }
  }
  return list;
}

/*
  pageHitTiming: مصفوفة آيات (مع مضلعات) لكل سور الصفحة الحالية.
  تُستخدم فقط لاكتشاف الآية تحت الإصبع عند الضغط المطوّل.
  currentTiming يبقى خاصاً بالسورة التي تُشغَّل حالياً للتمييز الزمني.
*/
let pageHitTiming = [];
let pageHitTimingPage = 0;   /* رقم الصفحة التي بُني لها pageHitTiming */
let pageHitTimingToken = 0;  /* لإلغاء نتائج الطلبات القديمة عند تغيير الصفحة بسرعة */
let audioPageToken = 0;      /* لمنع سباق updateAudioSource عند قلب الصفحات بسرعة */

/* وسم كل عنصر توقيت برقم سورته (_surah) لأن الـ API لا يعيد رقم السورة داخل العنصر */
function tagTimingItems(items, surahNumber){
  return (Array.isArray(items) ? items : []).map(item=>{
    if(!item) return null;
    const copy = Object.assign({}, item);
    copy._surah = Number(surahNumber);
    return copy;
  }).filter(Boolean);
}

/* عدد آيات كل سورة؛ نستخدمه لاكتشاف ملفات التوقيت الناقصة قبل حفظها أو اعتمادها. */
const SURAH_AYAH_COUNTS = [
  0,7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,
  135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,
  85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,
  13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,
  42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,
  11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
];

function hasCompleteSurahTiming(items, surahNumber){
  const surah = Number(surahNumber);
  const expected = SURAH_AYAH_COUNTS[surah];
  if(!Array.isArray(items) || !items.length || !expected) return false;
  const seen = new Set();
  for(const item of items){
    const ayah = Number(item && item.ayah);
    if(Number.isInteger(ayah) && ayah >= 1 && ayah <= expected) seen.add(ayah);
  }
  return seen.size >= expected;
}

function removeIncompleteTimingCache(cacheKey){
  try{ delete timingCache[cacheKey]; }catch(e){}
  try{ localStorage.removeItem("ayaTiming:" + cacheKey); }catch(e){}
}

/*
  جلب توقيت سورة واحدة من MP3Quran (مع تخزين مؤقت حسب القارئ+السورة).
  النتيجة موشومة بـ _surah لتسهيل التبديل بين السور عند الضغط المطوّل.
*/
async function fetchTimingForSurah(surahNumber){
  const surah = Number(surahNumber);
  if(!Number.isFinite(surah) || surah < 1) return [];

  const cacheKey = selectedReader + ":" + surah;
  if(timingCache[cacheKey]){
    if(hasCompleteSurahTiming(timingCache[cacheKey], surah)){
      return tagTimingItems(timingCache[cacheKey], surah);
    }
    removeIncompleteTimingCache(cacheKey);
  }
  try{
    const ls = localStorage.getItem("ayaTiming:"+cacheKey);
    if(ls){
      const parsed = JSON.parse(ls);
      if(hasCompleteSurahTiming(parsed, surah)){
        timingCache[cacheKey] = parsed;
        return tagTimingItems(parsed, surah);
      }
      removeIncompleteTimingCache(cacheKey);
    }
  }catch(e){}

  try{
    const readId = await getTimingReadId();
    if(!readId) return [];

    const res = await fetch(
      TIMING_API + "?surah=" + surah + "&read=" + readId,
      {cache:"force-cache"}
    );
    if(!res.ok){
      try{
        const cache = await caches.open("aya-timing-v1");
        const hit = await cache.match(TIMING_API + "?surah=" + surah + "&read=" + readId);
        if(hit){
          const data = await hit.json();
          const list = Array.isArray(data) ? data.filter(x =>
            x && x.ayah != null &&
            Number.isFinite(Number(x.start_time)) &&
            Number.isFinite(Number(x.end_time))
          ) : [];
          if(hasCompleteSurahTiming(list, surah)){
            timingCache[cacheKey] = list;
            try{ localStorage.setItem("ayaTiming:"+cacheKey, JSON.stringify(list)); }catch(e){}
            return tagTimingItems(list, surah);
          }
        }
      }catch(e){}
      return [];
    }

    const data = await res.json();
    const list = Array.isArray(data)
      ? data.filter(x =>
          x &&
          x.ayah != null &&
          Number.isFinite(Number(x.start_time)) &&
          Number.isFinite(Number(x.end_time))
        )
      : [];

    /* لا نعتمد ولا نحفظ توقيتاً ناقصاً؛ قد يكون هو سبب توقف التظليل في منتصف السورة. */
    const completeTiming = hasCompleteSurahTiming(list, surah);
    if(completeTiming){
      timingCache[cacheKey] = list;
      try{ localStorage.setItem("ayaTiming:"+cacheKey, JSON.stringify(list)); }catch(e){}
    }
    try{
      if(completeTiming && readId){
        var fu = TIMING_API + "?surah=" + surah + "&read=" + readId;
        caches.open("aya-timing-v1").then(function(cache){
          cache.put(fu, new Response(JSON.stringify(list), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })).catch(function(){});
        }).catch(function(){});
      }
    }catch(e){}
    return tagTimingItems(list, surah);
  }catch(e){
    try{
      const ls = localStorage.getItem("ayaTiming:"+cacheKey);
      if(ls){
        const parsed = JSON.parse(ls);
        if(hasCompleteSurahTiming(parsed, surah)){
          timingCache[cacheKey] = parsed;
          return tagTimingItems(parsed, surah);
        }
        removeIncompleteTimingCache(cacheKey);
      }
    }catch(e2){}
    return [];
  }
}

/*
  بناء pageHitTiming للصفحة الحالية:
  - يجلب توقيت كل السور الظاهرة في الصفحة بالتوازي
  - يدمج آيات هذه الصفحة فقط (أو كل آيات السورة إن كانت في صفحة واحدة)
  يُستدعى عند تغيير الصفحة وعند كل ضغط مطوّل.
*/
async function loadPageHitTiming(pageNumber){
  const p = Number(pageNumber) || currentPage;
  const token = ++pageHitTimingToken;
  const surahList = getSurahsOnPage(p);

  if(!surahList.length){
    pageHitTiming = [];
    pageHitTimingPage = p;
    return [];
  }

  const parts = await Promise.all(
    surahList.map(s => fetchTimingForSurah(s))
  );

  /* تجاهل النتيجة إن تغيّرت الصفحة أثناء التحميل */
  if(token !== pageHitTimingToken) return pageHitTiming;

  const merged = [];
  parts.forEach((list, idx)=>{
    const surahNum = surahList[idx];
    list.forEach(item=>{
      const pg = pageFromTiming(item, item._surah || surahNum);
      /*
        نعتمد على حقل page من Timing API (مثال: بقية النبأ = 583.svg).
        إن غاب page نُبقي الآية كاحتياط للسور القصيرة جداً.
      */
      if(pg === p || pg == null){
        merged.push(item);
      }
    });
  });

  pageHitTiming = merged;
  pageHitTimingPage = p;
  return pageHitTiming;
}

/*
  تحويل إحداثيات الشاشة → آية عبر مضلعات الصفحة.
  الترتيب:
  1) إصابة مباشرة داخل المضلع
  2) داخل المستطيل المحيط بهامش
  3) أقرب مركز مضلع ضمن HIT_NEAREST_MAX
*/
function findAyahAtClientPoint(clientX, clientY){
  const coords = clientToPageSvgCoords(clientX, clientY);
  if(!coords) return null;

  let items = pageHitTimingPage === currentPage && pageHitTiming.length
    ? pageHitTiming
    : (typeof itemsForCurrentPage === "function" ? itemsForCurrentPage() : []);

  if(!items.length && currentTiming && currentTiming.length){
    items = currentTiming.filter(item =>
      pageFromTiming(item, item._surah || timingSurahLoaded) === currentPage
    );
  }

  if(!items.length) return null;

  let bboxHit = null;
  let nearest = null;
  let nearestDist = Infinity;

  for(let i = items.length - 1; i >= 0; i--){
    const item = items[i];
    if(!item || !item.polygon) continue;
    const pts = parsePolygonPoints(item.polygon);
    if(pts.length < 3) continue;

    if(pointInPolygon(coords.x, coords.y, pts)){
      return item;
    }

    if(!bboxHit && pointInExpandedBBox(coords.x, coords.y, pts, 12)){
      bboxHit = item;
    }

    const c = polygonCentroid(pts);
    const d = Math.hypot(coords.x - c[0], coords.y - c[1]);
    if(d < nearestDist){
      nearestDist = d;
      nearest = item;
    }
  }

  if(bboxHit) return bboxHit;
  if(nearest && nearestDist <= HIT_NEAREST_MAX) return nearest;
  return null;
}

/* تشغيل الصوت من الموضع الحالي مع إعادة محاولة عند الرفض المؤقت */
function playFromCurrentPosition(){
  if(!audio) return;
  const tryPlay = (attempt)=>{
    audio.play().then(()=>{
      if(playButton) playButton.textContent = "Ⅱ";
    }).catch(()=>{
      if(attempt < 3){
        setTimeout(()=>tryPlay(attempt + 1), 120 * attempt);
      }
    });
  };
  tryPlay(1);
}

/*
  الانتقال إلى آية معيّنة ثم التشغيل (افتراضياً).
  - إن كانت نفس السورة الحالية: seek مباشر على الملف المفتوح
  - إن كانت سورة أخرى (حتى في نفس الصفحة): تبديل ملف الصوت ثم seek
*/
function showOfflineMissingDialog(msg){
  try{
    var ov = document.getElementById("offlineMissingOverlay");
    var body = document.getElementById("offlineMissingBody");
    if(!ov){
      try{ if(typeof setStatus === "function") setStatus(msg || "غير متوفر أوفلاين"); }catch(e){}
      return;
    }
    if(body){
      body.textContent = msg || "عفوا ملف الصوت غير موجود ولا يمكن تنزيله - فضلا تأكد من الإتصال بالانترنت";
    }
    ov.classList.add("show");
    ov.setAttribute("aria-hidden", "false");
    var close = function(){
      try{ ov.classList.remove("show"); ov.setAttribute("aria-hidden","true"); }catch(e){}
    };
    var ok = document.getElementById("offlineMissingOk");
    var back = document.getElementById("offlineMissingBack");
    if(ok){ ok.onclick = close; }
    if(back){ back.onclick = close; }
    ov.onclick = function(e){ if(e.target === ov) close(); };
  }catch(e){
    try{ if(typeof setStatus === "function") setStatus(msg || "غير متوفر أوفلاين"); }catch(e2){}
  }
}

function seekToAyahItem(item, options = {}){
  if(!item || !audio) return false;
  const st = Number(item.start_time);
  if(!Number.isFinite(st)) return false;
  const targetSec = Math.max(0, st / 1000);

  const targetSurah = Number(
    item._surah ||
    currentAudioSurah ||
    (typeof getSurahNumberForPage === "function"
      ? getSurahNumberForPage(currentPage)
      : 1)
  );

  const autoPlay = options.autoPlay !== false;

  if(typeof resetRepeat === "function") resetRepeat();

  const applySeekAndPlay = ()=>{
    try{
      audio.currentTime = targetSec;
    }catch(e){
      return false;
    }
    if(typeof syncHighlight === "function"){
      requestAnimationFrame(()=>syncHighlight());
    }
    if(autoPlay) playFromCurrentPosition();
    return true;
  };

  /* نفس السورة الحالية: انتقال مباشر ثم تشغيل */
  const sameSurahReady =
    Number(currentAudioSurah) === targetSurah &&
    audio.src &&
    audio.error == null &&
    audio.readyState >= 0;

  if(sameSurahReady && audio.readyState >= 1){
    try{ if(typeof syncPlayerSurahUI === "function") syncPlayerSurahUI(targetSurah); }catch(e){}
    return applySeekAndPlay();
  }

  if(sameSurahReady && audio.readyState < 1){
    const onMeta = function(){
      audio.removeEventListener("loadedmetadata", onMeta);
      applySeekAndPlay();
    };
    audio.addEventListener("loadedmetadata", onMeta);
    return true;
  }

  /* سورة مختلفة (مثلاً من الناس إلى الفلق على نفس الصفحة) */
  currentAudioSurah = targetSurah;

  /* مزامنة اسم السورة في المشغّل فوراً */
  try{
    if(typeof syncPlayerSurahUI === "function") syncPlayerSurahUI(targetSurah);
  }catch(e){}

  const url = typeof getAudioUrl === "function"
    ? getAudioUrl(selectedReader, currentPage, targetSurah)
    : "";

  if(!url) return false;

  if(typeof resetRepeat === "function") resetRepeat();

  /* أوقف المصدر القديم تماماً — لا تترك صوت سورة سابقة يعمل */
  try{ audio.pause(); }catch(e){}
  try{
    audio.__ayaPartialMaxSec = 0;
    audio.__ayaPartialUrl = "";
    audio.__ayaResumeAfterPartial = targetSec;
    audio.__ayaHandoffBusy = false;
    audio.__ayaPartialUpgrading = false;
    audio.__ayaEndedHandoffBusy = false;
    audio.__ayaOfflineEnded = false;
    audio.__ayaForceNet = false;
    audio.__ayaSrcToken = (audio.__ayaSrcToken || 0) + 1;
  }catch(e){}
  try{
    var oldSrc = String(audio.currentSrc || audio.src || "");
    if(oldSrc){
      try{ audio.removeAttribute("src"); }catch(e){}
      try{ audio.load(); }catch(e){}
    }
  }catch(e){}

  if(playButton) playButton.textContent = "▶";
  if(typeof clearAyahHighlight === "function") clearAyahHighlight();

  /* حمّل توقيت السورة الجديدة */
  const cacheKey = selectedReader + ":" + targetSurah;
  if(timingCache[cacheKey]){
    currentTiming = tagTimingItems(timingCache[cacheKey], targetSurah);
    timingSurahLoaded = targetSurah;
  }else{
    fetchTimingForSurah(targetSurah).then(list=>{
      if(Number(currentAudioSurah) !== Number(targetSurah)) return;
      currentTiming = list;
      timingSurahLoaded = targetSurah;
      if(typeof syncHighlight === "function") syncHighlight();
    }).catch(function(){});
  }

  let seekApplied = false;
  const onReady = function(){
    if(seekApplied) return;
    if(Number(currentAudioSurah) !== Number(targetSurah)) return;
    seekApplied = true;
    try{ audio.removeEventListener("loadedmetadata", onReady); }catch(e){}
    try{ audio.removeEventListener("canplay", onReady); }catch(e){}
    applySeekAndPlay();
  };

  const attachReady = function(){
    audio.addEventListener("loadedmetadata", onReady);
    audio.addEventListener("canplay", onReady);
    setTimeout(onReady, 80);
    setTimeout(onReady, 250);
    setTimeout(onReady, 600);
  };

  var offline = false;
  try{ offline = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}

  /* تأكيد أن الملف المحلي لنفس رقم السورة */
  function urlMatchesSurah(u, surahNum){
    try{
      var leaf = (String(u || "").split("/").pop() || "").split("?")[0];
      var want = String(Number(surahNum)).padStart(3, "0") + ".mp3";
      return leaf.toLowerCase() === want.toLowerCase();
    }catch(e){ return false; }
  }

  if(offline){
    var appliedLocal = false;
    var token = audio.__ayaSrcToken;
    var applyLocalSrc = function(local, maxSec, sourceUrl){
      if(appliedLocal) return;
      if(token !== audio.__ayaSrcToken) return;
      if(Number(currentAudioSurah) !== Number(targetSurah)) return;
      appliedLocal = true;
      try{
        audio.__ayaPartialUrl = sourceUrl || url;
        audio.__ayaPartialMaxSec = Number(maxSec) || 0;
        audio.__ayaResumeAfterPartial = targetSec;
      }catch(e){}
      try{ audio.src = local; }catch(e){}
      try{ audio.load(); }catch(e){}
      attachReady();
    };
    var failOffline = function(msg){
      if(appliedLocal) return;
      if(token !== audio.__ayaSrcToken) return;
      appliedLocal = true;
      try{ audio.pause(); }catch(e){}
      try{ audio.removeAttribute("src"); audio.load(); }catch(e){}
      try{ playButton.textContent = "▶"; }catch(e){}
      try{ if(typeof setAudioLoading === "function") setAudioLoading(false); }catch(e){}
      try{
        audio.__ayaPartialMaxSec = 0;
        audio.__ayaPartialUrl = "";
        audio.__ayaResumeAfterPartial = 0;
      }catch(e){}
      try{
        var curEl = document.getElementById("currentTime");
        var durEl = document.getElementById("duration");
        if(curEl) curEl.textContent = "0:00";
        if(durEl) durEl.textContent = "0:00";
        var bar = document.querySelector(".progress-bar, #progressBar, .progress");
        if(bar){
          if(bar.style) bar.style.width = "0%";
          if(bar.value != null) bar.value = 0;
        }
      }catch(e){}
      try{
        if(typeof showOfflineMissingDialog === "function"){
          showOfflineMissingDialog(msg || "عفوا ملف الصوت غير موجود ولا يمكن تنزيله - فضلا تأكد من الإتصال بالانترنت");
        }else if(typeof setStatus === "function"){
          setStatus(msg || "غير متوفر أوفلاين لهذه السورة");
        }
      }catch(e){}
    };
    (async function(){
      try{
        /* 1) مقطع جزئي */
        if(window.__ayaAutoOffline && typeof window.__ayaAutoOffline.idbFindPartial === "function"){
          var rec = await window.__ayaAutoOffline.idbFindPartial(url);
          if(token !== audio.__ayaSrcToken) return;
          if(rec && rec.blob && urlMatchesSurah(rec.url || url, targetSurah)){
            applyLocalSrc(URL.createObjectURL(rec.blob), Number(rec.maxSec) || 0, rec.url || url);
            return;
          }
        }
        /* 2) كاش كامل */
        if(typeof caches !== "undefined"){
          var cache = await caches.open("aya-audio-v1");
          var hit = await cache.match(url);
          if(token !== audio.__ayaSrcToken) return;
          if(hit){
            var b = await hit.blob();
            if(b && b.size){
              applyLocalSrc(URL.createObjectURL(b), 1e9, url);
              return;
            }
          }
        }
        /* 3) resolveLocal مع التحقق من رقم السورة */
        if(window.__ayaAutoOffline && typeof window.__ayaAutoOffline.resolveLocal === "function"){
          var local = await window.__ayaAutoOffline.resolveLocal(url);
          if(token !== audio.__ayaSrcToken) return;
          if(local){
            var pu = "";
            try{ pu = String(audio.__ayaPartialUrl || url); }catch(e){}
            if(urlMatchesSurah(pu, targetSurah) || urlMatchesSurah(url, targetSurah)){
              applyLocalSrc(local, Number(audio.__ayaPartialMaxSec) || 0, pu || url);
              return;
            }
          }
        }
        failOffline("عفوا ملف الصوت غير موجود ولا يمكن تنزيله - فضلا تأكد من الإتصال بالانترنت");
      }catch(e){
        failOffline("عفوا ملف الصوت غير موجود ولا يمكن تنزيله - فضلا تأكد من الإتصال بالانترنت");
      }
    })();
    return true;
  }

  /* أونلاين */
  try{ audio.__ayaForceNet = true; }catch(e){}
  try{ audio.src = url; }catch(e){}
  try{ audio.load(); }catch(e){}
  try{ setTimeout(function(){ try{ audio.__ayaForceNet = false; }catch(e){} }, 1200); }catch(e){}
  attachReady();

  return true;
}


/*
  معالجة الضغط المطوّل:
  1) التأكد من جاهزية viewBox والصورة
  2) تحميل توقيت كل سور الصفحة (مع إعادة محاولة عند الفراغ)
  3) إيجاد الآية (مباشر / صندوق / أقرب)
  4) الانتقال + تشغيل
*/
async function resolveAyahAtPoint(clientX, clientY){
  try{
    if(page && !page.complete){
      await new Promise(resolve=>{
        const done = ()=>resolve();
        page.addEventListener("load", done, {once:true});
        setTimeout(done, 800);
      });
    }
    if(typeof positionHighlightLayer === "function") positionHighlightLayer();
    try{ await loadPageHitTiming(currentPage); }catch(e){}
    const item = findAyahAtClientPoint(clientX, clientY);
    if(!item) return null;
    const s = Number(item._surah || item.surah || (typeof timingSurahLoaded !== "undefined" ? timingSurahLoaded : 0) || (typeof currentAudioSurah !== "undefined" ? currentAudioSurah : 0) || (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 1));
    return { item: item, surah: s || 1, ayah: Number(item.ayah) || 1 };
  }catch(e){
    return null;
  }
}

function onTafsirPressAyah(clientX, clientY){
  (async function(){
    const ref = await resolveAyahAtPoint(clientX, clientY);
    if(!ref) return;
    window.__lastTafsirRef = { surah: ref.surah, ayah: ref.ayah };
    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
    if(typeof window.__ayaOpenTafsir === "function"){
      window.__ayaOpenTafsir({ surah: ref.surah, ayah: ref.ayah });
    }
  })();
}

function onLongPressAyah(clientX, clientY){
  longPressTriggered = true;

  const ensureAndSeek = async ()=>{
    if(page && !page.complete){
      await new Promise(resolve=>{
        const done = ()=>resolve();
        page.addEventListener("load", done, {once:true});
        setTimeout(done, 800);
      });
    }

    if(typeof positionHighlightLayer === "function"){
      positionHighlightLayer();
    }

    let items = [];
    try{
      items = await loadPageHitTiming(currentPage);
    }catch(e){}

    /* إعادة محاولة واحدة إن فشل التحميل (شبكة بطيئة) */
    if(!items || !items.length){
      try{
        await new Promise(r=>setTimeout(r, 200));
        items = await loadPageHitTiming(currentPage);
      }catch(e){}
    }

    const item = findAyahAtClientPoint(clientX, clientY);
    if(item){
      try{
        const s = Number(item._surah || item.surah || (typeof timingSurahLoaded !== "undefined" ? timingSurahLoaded : 0) || (typeof currentAudioSurah !== "undefined" ? currentAudioSurah : 0) || (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 1));
        window.__lastTafsirRef = { surah: s || 1, ayah: Number(item.ayah) || 1 };
      }catch(e){}
      seekToAyahItem(item, {autoPlay:true});
      try{
        if(navigator.vibrate) navigator.vibrate(18);
      }catch(e){}
    }
  };

  ensureAndSeek();
}

pageArea.addEventListener("pointerdown", e=>{
  /* لا نلتقط الضغط إذا بدأ من عناصر التحكم */
  if(e.target && e.target.closest && (
    e.target.closest(".player") ||
    e.target.closest(".menu-button") ||
    e.target.closest(".side-menu") ||
    e.target.closest(".popup-overlay")
  )){
    return;
  }

  uiTapStartX = e.clientX;
  uiTapStartY = e.clientY;
  uiTapStartTime = Date.now();
  longPressTriggered = false;
  tafsirPressTriggered = false;
  clearLongPressTimer();

  const pressX = e.clientX;
  const pressY = e.clientY;

  /* 200ms: تأهيل الآية للتفسير — لا نفتح النافذة إلا عند رفع الإصبع */
  tafsirPressTimer = setTimeout(()=>{
    tafsirPressTimer = null;
    tafsirPressTriggered = true;
    try{ if(navigator.vibrate) navigator.vibrate(8); }catch(e){}
  }, TAFSIR_PRESS_MS);

  /* 700ms: تشغيل التلاوة */
  longPressTimer = setTimeout(()=>{
    longPressTimer = null;
    longPressTriggered = true;
    /* ألغِ فتح التفسير لأن المستخدم اختار القراءة */
    tafsirPressTriggered = false;
    onLongPressAyah(pressX, pressY);
  }, LONG_PRESS_MS);
}, {passive:true});

pageArea.addEventListener("pointermove", e=>{
  if(!longPressTimer) return;
  const dx = e.clientX - uiTapStartX;
  const dy = e.clientY - uiTapStartY;
  /* إلغاء الضغط المطوّل فقط عند حركة واضحة (سحب صفحة) */
  if(Math.abs(dx) > TAP_MOVE_MAX || Math.abs(dy) > TAP_MOVE_MAX){
    clearLongPressTimer();
  }
}, {passive:true});

pageArea.addEventListener("pointerup", e=>{
  clearLongPressTimer();

  const dx = e.clientX - uiTapStartX;
  const dy = e.clientY - uiTapStartY;
  const elapsed = Date.now() - uiTapStartTime;
  const moved = Math.abs(dx) >= TAP_MOVE_MAX || Math.abs(dy) >= TAP_MOVE_MAX;

  /* تشغيل تلاوة (700ms): لا تفتح تفسير ولا تبدّل الواجهة */
  if(longPressTriggered){
    setTimeout(()=>{ longPressTriggered = false; tafsirPressTriggered = false; }, 50);
    return;
  }

  /* ضغط >= 200ms ثم رفع الإصبع → فتح التفسير */
  if(!moved && tafsirPressTriggered){
    const px = e.clientX, py = e.clientY;
    setTimeout(()=>{ longPressTriggered = false; tafsirPressTriggered = false; }, 50);
    if(typeof onTafsirPressAyah === "function"){
      onTafsirPressAyah(px, py);
    }
    return;
  }

  /* ضغط عادي قصير: إظهار/إخفاء أزرار التحكم */
  if(!moved && elapsed < TAFSIR_PRESS_MS){
    toggleReadingUI();
  }

  tafsirPressTriggered = false;
}, {passive:true});

pageArea.addEventListener("pointercancel", ()=>{
  clearLongPressTimer();
  /* لا تصفر longPressTriggered فوراً حتى لا يتعارض مع touchend */
  setTimeout(()=>{ longPressTriggered = false; }, 50);
}, {passive:true});

/* لا نلغي المؤقت عند pointerleave — على الجوال يسبب فشل عشوائي */

/*
  عند فتح القائمة من زر ☰ نظهر الواجهة مؤقتاً.
  وعند إغلاقها نعيد حالة الإخفاء السابقة.
*/
const originalOpenMenu = openMenu;
openMenu = function(){
  setReadingUIHidden(false);
  originalOpenMenu();
};

const originalCloseSideMenu = closeSideMenu;
closeSideMenu = function(){
  originalCloseSideMenu();
  setReadingUIHidden(readingUIHidden);
};

/* أي ضغط على زر ☰ لا يمر إلى منطقة المصحف */
if(readingUI.menuButton){
  readingUI.menuButton.addEventListener("pointerdown", e=>{
    e.stopPropagation();
  });
}

/* لا نسمح للقائمة المفتوحة بأن تُخفى أثناء استخدامها */
if(readingUI.sideMenu){
  readingUI.sideMenu.addEventListener("pointerdown", e=>{
    e.stopPropagation();
  });
}



/* =========================
   القراء
========================= */

/* =========================
   القراء والتلاوات
========================= */

const RECITERS = {
  minshawi: {
    name: "الشيخ محمد صديق المنشاوي",
    server: "https://server10.mp3quran.net/minsh/",
    timingId: 112,
    complete: true
  },
  husary: {
    name: "الشيخ محمود خليل الحصري",
    server: "https://server13.mp3quran.net/husr/",
    timingId: 118,
    complete: true
  },
  shatri: {
    name: "أبو بكر الشاطري",
    server: "https://server11.mp3quran.net/shatri/",
    timingId: 4,
    complete: true
  },
  idrees: {
    name: "إدريس أبكر",
    server: "https://server6.mp3quran.net/abkr/",
    timingId: 12,
    complete: true
  },
  fares: {
    name: "الشيخ فارس عباد",
    server: "https://server8.mp3quran.net/frs_a/",
    timingId: 81,
    complete: true
  },
  afasy: {
    name: "مشاري العفاسي",
    server: "https://server8.mp3quran.net/afs/",
    timingId: 123,
    complete: true
  },
  yasser: {
    name: "الشيخ ياسر الدوسري",
    /* صوت QuranAudio + توقيت mp3quran read=92.
       سور لا يتطابق فيها ملف QuranAudio مع التوقيت تُحمَّل من cdn.mp3quran (انظر getAudioUrl). */
    server: "https://download.quranicaudio.com/quran/yasser_ad-dussary/",
    timingId: 92,
    complete: true,
    /* سور: ملف QuranAudio مختلف المدة عن توقيت read=92 → استخدم مصدر التوقيت */
    timingAudioSurahs: [8, 49, 50, 92],
    timingAudioServer: "https://cdn.mp3quran.net/audio/yasser-dosari/r1/"
  },
  khalidJalil: {
    name: "الشيخ خالد الجليل",
    server: "https://server10.mp3quran.net/jleel/",
    timingId: 20,
    complete: true,
    /* آل عمران (3): الملف يبدأ بالفاتحة ثم البسملة ثم آل عمران.
       ابدأ من الثانية 34: تخطّي الفاتحة مع الإبقاء على البسملة (الآية 1 عند ~40.5ث). */
    audioIntroOffsetSec: { 3: 34 }
  },
  abdulbasitMujawwad: {
    name: "الشيخ عبد الباسط عبد الصمد مجود",
    server: "https://server7.mp3quran.net/basit/Almusshaf-Al-Mojawwad/",
    timingId: 51,
    complete: true
  },
  maher: {
    name: "الشيخ ماهر المعيقلي مجود",
    server: "https://server12.mp3quran.net/maher/Almusshaf-Al-Mojawwad/",
    timingId: 133,
    complete: true
  },
  qatami: {
    name: "الشيخ ناصر القطامي",
    server: "https://server6.mp3quran.net/qtm/",
    timingId: 86,
    complete: true
  },
  ghamdi: {
    name: "الشيخ سعد الغامدي",
    server: "https://server7.mp3quran.net/s_gmd/",
    timingId: 30,
    complete: true
  },
  ajmy: {
    name: "الشيخ أحمد العجمي",
    server: "https://server10.mp3quran.net/ajm/",
    timingId: 5,
    complete: true
  },
  ayyub: {
    name: "الشيخ محمد أيوب",
    server: "https://server8.mp3quran.net/ayyub/",
    timingId: 109,
    complete: true
  },
  shuraim: {
    name: "الشيخ سعود الشريم",
    server: "https://server7.mp3quran.net/shur/",
    timingId: 31,
    complete: true
  },
  kurdi: {
    name: "الشيخ رعد الكردي",
    server: "https://server6.mp3quran.net/kurdi/",
    timingId: 221,
    complete: true
  },
  salimi: {
    name: "الشيخ منصور السالمي",
    server: "https://server14.mp3quran.net/mansor/",
    timingId: 245,
    complete: true
  },
  khalaf: {
    name: "الشيخ عبدالله الخلف",
    server: "https://cdn.mp3quran.net/audio/abdullah-khalaf/r1/",
    timingId: 244,
    complete: true
  },
  aliJaber: {
    name: "الشيخ علي جابر",
    server: "https://server11.mp3quran.net/a_jbr/",
    timingId: 76,
    complete: true
  },
  wadee: {
    name: "الشيخ وديع اليمني",
    server: "https://server6.mp3quran.net/wdee3/",
    timingId: 219,
    complete: true
  },

  /* قراء للاستماع فقط (بدون توقيت/تظليل) */
  sudais: {
    name: "الشيخ عبدالرحمن السديس",
    server: "https://server11.mp3quran.net/sds/",
    complete: true,
    timingId: 54
  },
  tablawi: {
    name: "الشيخ محمد الطبلاوي",
    server: "https://server12.mp3quran.net/tblawi/",
    complete: true,
    timingId: 106
  },
  akhdar: {
    name: "الشيخ إبراهيم الأخضر",
    server: "https://server6.mp3quran.net/akdr/",
    complete: true,
    timingId: 1
  },
  nabil: {
    name: "الشيخ نبيل الرفاعي",
    server: "https://server9.mp3quran.net/nabil/",
    complete: true,
    timingId: 87
  },
  hani: {
    name: "الشيخ هاني الرفاعي",
    server: "https://server8.mp3quran.net/hani/",
    complete: true,
    timingId: 89
  },
  arkani: {
    name: "الشيخ عبدالولي الأركاني",
    server: "https://server6.mp3quran.net/arkani/",
    complete: true,
    timingId: 72
  },
  bukhatir: {
    name: "الشيخ صلاح بو خاطر",
    server: "https://server8.mp3quran.net/bu_khtr/",
    timingId: 46,
    complete: true
  },
  banna: {
    name: "الشيخ محمود علي البنا",
    server: "https://server8.mp3quran.net/bna/",
    complete: true,
    listenOnly: true
  },
  mustafaIsmail: {
    name: "الشيخ مصطفى إسماعيل",
    server: "https://server8.mp3quran.net/mustafa/",
    complete: true,
    listenOnly: true
  },
  jibreel: {
    name: "الشيخ محمد جبريل",
    server: "https://server8.mp3quran.net/jbrl/",
    complete: true,
    listenOnly: true
  },
  balilah: {
    name: "الشيخ بندر بليلة",
    server: "https://server6.mp3quran.net/balilah/",
    complete: true,
    listenOnly: true
  },
  islamSobhi: {
    name: "الشيخ إسلام صبحي",
    server: "https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/",
    complete: true,
    listenOnly: true,
    availableSurahs: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,38,41,42,43,44,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114]
  },
  luhaidan: {
    name: "الشيخ محمد اللحيدان",
    server: "https://server8.mp3quran.net/lhdan/",
    complete: true,
    listenOnly: true
  },
  jibreen: {
    name: "الشيخ إبراهيم الجبرين",
    server: "https://server6.mp3quran.net/jbreen/",
    complete: true,
    listenOnly: true,
    availableSurahs: [1,2,3,4,6,7,8,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,30,31,32,33,34,35,36,37,38,39,40,41,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114]
  },
  afasyCalifornia: {
    name: "الشيخ مشاري العفاسي (كاليفورنيا)",
    server: "https://download.quranicaudio.com/quran/mishaari_california/",
    complete: true,
    listenOnly: true
  },
  imamFeysal: {
    name: "القارئ إمام فيصل محمد",
    server: "https://archive.org/download/Faycell_uP_bY_mUSLEm/",
    filePattern: "{n}_uP_bY_mUSLEm.mp3",
    complete: true,
    listenOnly: true
  }
};

let selectedReader =
  localStorage.getItem("quranReader") || "shatri";

if(
  !RECITERS[selectedReader] ||
  selectedReader === "mahmoudBanna"
){
  selectedReader = "shatri";
  localStorage.setItem("quranReader", selectedReader);
}

function getSurahNumberForPage(pageNumber){
  /*
    نُرجع أول سورة لها محتوى في الصفحة (وليس آخر سورة تبدأ فيها).
    مثال: صفحة 587 → الانفطار قبل المطففين.
  */
  if(typeof getSurahsOnPage === "function"){
    const list = getSurahsOnPage(pageNumber);
    if(list && list.length) return list[0];
  }

  for(let i = 0; i < surahs.length; i++){

    const startPage = Number(surahs[i][1]);
    const nextStart =
      i < surahs.length - 1
        ? Number(surahs[i + 1][1])
        : TOTAL_PAGES + 1;

    if(pageNumber >= startPage && pageNumber < nextStart){
      return i + 1;
    }

  }

  return 1;
}

function getAudioUrl(readerKey, pageNumber, explicitSurah = null){

  const reader = RECITERS[readerKey];

  if(!reader) return "";

  const surahNumber =
    Number(explicitSurah || getSurahNumberForPage(pageNumber)) || 1;

  const fileNumber =
    String(surahNumber).padStart(3, "0");

  /*
    ياسر الدوسري: بعض السور على QuranAudio أطول/أقصر من توقيت mp3quran read=92
    (مثل الأنفال 8، الحجرات 49، ق 50، الليل 92).
    لهذه السور نستخدم ملف التوقيت من cdn.mp3quran حتى يتزامن التظليل.
  */
  try{
    const special = reader.timingAudioSurahs;
    const altServer = reader.timingAudioServer;
    if(
      Array.isArray(special) &&
      altServer &&
      special.indexOf(surahNumber) >= 0
    ){
      return String(altServer).replace(/\/?$/, "/") + fileNumber + ".mp3";
    }
  }catch(e){}

  return reader.server + fileNumber + ".mp3";
}


function getAudioIntroOffsetMs(readerKey, surahNum){
  try{
    const r = RECITERS[readerKey || selectedReader];
    if(!r || !r.audioIntroOffsetSec) return 0;
    const sec = Number(r.audioIntroOffsetSec[Number(surahNum)]);
    if(Number.isFinite(sec) && sec > 0) return Math.round(sec * 1000);
  }catch(e){}
  return 0;
}

/* إزاحة المقدمة بالثواني للسورة الحالية (للعداد وشريط التقدم) */
function getActiveIntroOffsetSec(){
  try{
    const s = Number(
      (typeof currentAudioSurah !== "undefined" && currentAudioSurah)
        ? currentAudioSurah
        : (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 0)
    ) || 0;
    return getAudioIntroOffsetMs(selectedReader, s) / 1000;
  }catch(e){ return 0; }
}

/* الوقت المعروض: يبدأ من 0 بعد تجاوز المقدمة */
function displayCurrentTimeSec(){
  try{
    const off = getActiveIntroOffsetSec();
    const t = Number(audio.currentTime) || 0;
    return Math.max(0, t - off);
  }catch(e){ return Number(audio.currentTime) || 0; }
}

function displayDurationSec(){
  try{
    const off = getActiveIntroOffsetSec();
    const d = Number(audio.duration);
    if(!Number.isFinite(d) || d <= 0) return 0;
    return Math.max(0, d - off);
  }catch(e){ return Number(audio.duration) || 0; }
}

/* تحديث العدادين (الوقت الحالي + طول السورة) دون تصفير طول السورة إن كان معروفاً */
function refreshTimeDisplay(opts){
  opts = opts || {};
  try{
    const cur = typeof displayCurrentTimeSec === "function" ? displayCurrentTimeSec() : (audio.currentTime || 0);
    const dur = typeof displayDurationSec === "function" ? displayDurationSec() : (audio.duration || 0);
    if(currentTime){
      if(opts.resetCurrent) currentTime.textContent = "0:00";
      else currentTime.textContent = fmt(cur);
    }
    if(duration){
      /* لا تصفّر طول السورة إذا المدة معروفة في عنصر الصوت */
      if(Number.isFinite(dur) && dur > 0){
        duration.textContent = fmt(dur);
      }else if(opts.forceZeroDuration){
        duration.textContent = "0:00";
      }
      /* وإلا اترك القيمة السابقة كما هي */
    }
    if(progress && Number.isFinite(dur) && dur > 0){
      progress.value = (cur / dur) * 100;
    }else if(progress && opts.resetCurrent){
      progress.value = 0;
    }
  }catch(e){}
}

function updateReaderName(){

  const reader = RECITERS[selectedReader];

  readerName.textContent =
    reader ? reader.name : "اختر القارئ";

}


/* =========================
   مزامنة التلاوة مع الآية والصفحة
   الصفحة + التوقيت + polygon من MP3Quran مباشرة.
   لا توجد إزاحات يدوية مثل +100/+270.
========================= */

const ayahHighlightLayer =
  document.getElementById("ayahHighlightLayer");

let timingCache = {};      /* مفتاح: reader:surah → مصفوفة آيات */
let timingReadIdCache = {}; /* مفتاح: reader → رقم القراءة في API */
let currentTiming = [];
let timingReadId = null;
let timingSurahLoaded = 0;
let timingLoading = false;
let timingToken = 0;

let pageSvgViewBox = "0 0 456 672";
let pageSvgToken = 0;

const TIMING_API =
  "https://mp3quran.net/api/v3/ayat_timing";

const TIMING_READS_API =
  "https://mp3quran.net/api/v3/ayat_timing/reads";

const QURAN_PAGE_SVG_BASE =
  "https://www.mp3quran.net/api/quran_pages_svg/";

function quranPageSvgUrl(pageNumber){
  return QURAN_PAGE_SVG_BASE +
    String(pageNumber).padStart(3,"0") +
    ".svg";
}

function clearAyahHighlight(){
  if(!ayahHighlightLayer) return;
  ayahHighlightLayer.innerHTML = "";
  ayahHighlightLayer.style.display = "none";
  ayahHighlightLayer.style.opacity = "1";
  ayahHighlightLayer._wordMode = false;
  ayahHighlightLayer._wordClipAyahId = null;
}

function pageFromTiming(item, surahHint){
  if(!item) return null;

  /* المصدر الرسمي يعيد page كعنوان SVG في أغلب الآيات. */
  if(item.page){
    const m =
      String(item.page).match(/(\d{3})\.svg(?:\?|$)/i);

    if(m) return Number(m[1]);
  }

  /*
    في بعض بيانات أول سورتين قد تكون page = null لبعض العناصر.
    نعرف الصفحة من السورة نفسها بدل إسقاط التظليل.
  */
  const surah = Number(
    surahHint ||
    item._surah ||
    timingSurahLoaded
  );
  const ayah = Number(item.ayah);

  if(surah === 1 && ayah >= 1 && ayah <= 7){
    return 1;
  }

  if(surah === 2 && ayah >= 1){
    return 2;
  }

  return null;
}

/* قراءة viewBox الحقيقي لصفحة SVG من الإنترنت */
async function readPageSvgViewBox(url){
  try{
    const response =
      await fetch(url,{cache:"force-cache"});

    if(!response.ok) return null;

    const text = await response.text();

    const xml =
      new DOMParser().parseFromString(
        text,
        "image/svg+xml"
      );

    const root = xml.documentElement;

    if(
      !root ||
      root.nodeName.toLowerCase() !== "svg"
    ){
      return null;
    }

    const viewBox =
      root.getAttribute("viewBox");

    if(viewBox){
      const parts =
        viewBox.trim().split(/\s+/).map(Number);

      if(
        parts.length === 4 &&
        parts.every(Number.isFinite) &&
        parts[2] > 0 &&
        parts[3] > 0
      ){
        return parts.join(" ");
      }
    }

    const width =
      parseFloat(root.getAttribute("width"));

    const height =
      parseFloat(root.getAttribute("height"));

    if(
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ){
      return "0 0 " + width + " " + height;
    }

  }catch(e){}

  return null;
}

const pageViewBoxCache = {};
const prefetchedPages = Object.create(null);

function prefetchQuranPage(pageNumber){
  const n = Number(pageNumber);
  if(!n || n < 1 || n > TOTAL_PAGES) return;
  if(prefetchedPages[n]) return;
  prefetchedPages[n] = true;
  const url = quranPageSvgUrl(n);
  try{
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }catch(e){}
  /* تسخين الكاش الشبكي */
  try{
    fetch(url, { mode: "no-cors", credentials: "omit", cache: "force-cache" }).catch(function(){});
  }catch(e){}
}

async function loadQuranPageFromInternet(pageNumber){
  if(!page) return;

  const token = ++pageSvgToken;
  const url = quranPageSvgUrl(pageNumber);
  const n = Number(pageNumber);

  clearAyahHighlight();

  /* تحميل أسرع: لا ننتظر viewBox إن كان مخزّناً */
  page.src = url;

  let detectedViewBox = pageViewBoxCache[n] || null;
  if(!detectedViewBox){
    try{
      const lsVb = localStorage.getItem("ayaViewBox:"+n);
      if(lsVb) detectedViewBox = lsVb;
    }catch(e){}
  }
  if(!detectedViewBox){
    try{
      detectedViewBox = await readPageSvgViewBox(url);
      if(detectedViewBox){
        pageViewBoxCache[n] = detectedViewBox;
        try{ localStorage.setItem("ayaViewBox:"+n, detectedViewBox); }catch(e){}
      }
    }catch(e){}
  }else{
    pageViewBoxCache[n] = detectedViewBox;
  }

  if(token !== pageSvgToken) return;

  if(detectedViewBox){
    pageSvgViewBox = detectedViewBox;
  }

  positionHighlightLayer();

  if(page.complete){
    syncHighlight();
  }else{
    page.addEventListener("load", function onPg(){
      page.removeEventListener("load", onPg);
      if(token === pageSvgToken){
        positionHighlightLayer();
        syncHighlight();
      }
    });
  }

  /* تحميل مسبق للصفحات المجاورة */
  prefetchQuranPage(n - 1);
  prefetchQuranPage(n + 1);
  prefetchQuranPage(n + 2);
}

function positionHighlightLayer(pageNumber){
  if(!ayahHighlightLayer || !page || !pageArea) return;

  const effectivePage =
    Number(pageNumber || currentPage);

  const imageRect = page.getBoundingClientRect();
  const areaRect = pageArea.getBoundingClientRect();

  const left =
    imageRect.left -
    areaRect.left +
    pageArea.scrollLeft;

  const top =
    imageRect.top -
    areaRect.top +
    pageArea.scrollTop;

  /*
     طبقة التمييز يجب أن تغطي منطقة الرسم الفعلية فقط
     (محتوى المصحف داخل object-fit:contain + center)،
     وليس صندوق الـ img بالكامل — وإلا ينزاح التظليل عن الكلمات.
  */
  const fallbackW = page.naturalWidth || 456;
  const fallbackH = page.naturalHeight || 672;
  const sourceViewBox =
    pageSvgViewBox ||
    ("0 0 " + fallbackW + " " + fallbackH);

  const parts = String(sourceViewBox).trim().split(/\s+/).map(Number);
  const viewW = (parts.length === 4 && parts[2] > 0) ? parts[2] : fallbackW;
  const viewH = (parts.length === 4 && parts[3] > 0) ? parts[3] : fallbackH;

  const scale = Math.min(
    imageRect.width / Math.max(1, viewW),
    imageRect.height / Math.max(1, viewH)
  );
  const drawnW = viewW * scale;
  const drawnH = viewH * scale;
  const offsetX = (imageRect.width - drawnW) / 2;
  const offsetY = (imageRect.height - drawnH) / 2;

  ayahHighlightLayer.style.left = (left + offsetX) + "px";
  ayahHighlightLayer.style.top = (top + offsetY) + "px";
  ayahHighlightLayer.style.width = drawnW + "px";
  ayahHighlightLayer.style.height = drawnH + "px";

  ayahHighlightLayer.setAttribute("viewBox", sourceViewBox);

  /* none = ملء الطبقة بالكامل بنفس نسب viewBox (لا letterbox داخل الطبقة) */
  ayahHighlightLayer.setAttribute(
    "preserveAspectRatio",
    "none"
  );

  ayahHighlightLayer.setAttribute("width", drawnW);
  ayahHighlightLayer.setAttribute("height", drawnH);
}

function getHighlightMapping(pageNumber){
  /*
     لا توجد هنا أي إحداثيات ثابتة. الـTiming API يرسل polygon
     في نظام إحداثيات صفحة SVG نفسها، لذلك نستخدم viewBox الحقيقي
     الذي قرأناه من نفس ملف الصفحة.
  */
  const fallbackW = page.naturalWidth || 456;
  const fallbackH = page.naturalHeight || 672;
  let sourceViewBox = pageSvgViewBox;

  if(!sourceViewBox){
    sourceViewBox = "0 0 " + fallbackW + " " + fallbackH;
  }

  const parts =
    String(sourceViewBox).trim().split(/\s+/).map(Number);

  const x0 = Number.isFinite(parts[0]) ? parts[0] : 0;
  const y0 = Number.isFinite(parts[1]) ? parts[1] : 0;
  const srcW = Number.isFinite(parts[2]) && parts[2] > 0 ? parts[2] : fallbackW;
  const srcH = Number.isFinite(parts[3]) && parts[3] > 0 ? parts[3] : fallbackH;

  return {
    mapX: x => Number(x),
    mapY: y => Number(y),
    viewBox: sourceViewBox,
    viewW: srcW,
    viewH: srcH,
    x0,
    y0
  };
}

function hexToRgb(hex){
  const h=String(hex||"").replace("#","");
  if(!/^[0-9a-fA-F]{6}$/.test(h)) return {r:22,g:132,b:67};
  return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
}
function colorToRgba(hex,a){const c=hexToRgb(hex);return `rgba(${c.r},${c.g},${c.b},${a})`;}
function applyHighlightColor(){
  document.documentElement.style.setProperty("--ayah-highlight-fill", colorToRgba(highlightColor, getShadeFillAlpha()));
  document.documentElement.style.setProperty("--ayah-highlight-stroke", colorToRgba(highlightColor, getShadeStrokeAlpha()));
}
applyHighlightColor();

/*
  متابعة الكلمة أثناء التلاوة (تقديري):
  مصدر التوقيت يعطي الآية فقط، لذلك نتابع التقدّم داخل الآية
  ونلوّن مقطعاً يتحرك مع الصوت (يمين→يسار، أعلى→أسفل).
*/
function getAyahProgress(item){
  const start = Number(item.start_time);
  const end = Number(item.end_time);
  if(!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const t = (audio.currentTime * 1000) - start;
  return Math.max(0, Math.min(1, t / (end - start)));
}

function polygonBBox(pts){
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for(let i = 0; i < pts.length; i++){
    const x = pts[i][0], y = pts[i][1];
    if(x < minX) minX = x;
    if(x > maxX) maxX = x;
    if(y < minY) minY = y;
    if(y > maxY) maxY = y;
  }
  return {minX, maxX, minY, maxY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY)};
}

/*
  مقطع الكلمة الحالية داخل الآية حسب التقدّم.
  نقسم الآية إلى أسطر ثم مقاطع أفقية (اتجاه المصحف).
*/
function estimateWordWindow(pts, progress){
  const b = polygonBBox(pts);
  const lineH = 36;
  const lines = Math.max(1, Math.round(b.h / lineH));
  /* عدد مقاطع تقريبي حسب عرض السطر */
  const segsPerLine = Math.max(3, Math.min(12, Math.round(b.w / 28)));
  const totalSegs = lines * segsPerLine;
  const idx = Math.min(totalSegs - 1, Math.floor(progress * totalSegs));
  const line = Math.floor(idx / segsPerLine);
  const seg = idx % segsPerLine;
  const segW = b.w / segsPerLine;
  const segH = b.h / lines;
  /* من اليمين إلى اليسار */
  const x2 = b.maxX - seg * segW;
  const x1 = b.maxX - (seg + 1) * segW;
  const y1 = b.minY + line * segH;
  return {
    x: x1 - 2,
    y: y1 - 1,
    w: Math.max(4, segW + 4),
    h: Math.max(8, segH + 2)
  };
}

function drawAyahHighlight(item){
  clearAyahHighlight();
  const displayColor=getAyahDisplayColor();

  if(highlightMode === "none") return;
  if(!item || !item.polygon || !page.complete) return;

  const targetPage = pageFromTiming(item) || currentPage;
  if(targetPage !== currentPage) return;

  const pts = String(item.polygon).trim().split(/\s+/).map(pair=>{
    const p = pair.split(",").map(Number);
    return (p.length===2 && p.every(Number.isFinite)) ? p : null;
  }).filter(Boolean);
  if(!pts.length) return;

  const m = getHighlightMapping(targetPage);
  positionHighlightLayer(targetPage);

  /* تظليل الآية: نفس حدود الـ polygon، بدون إعادة رسم النص. */
  if(highlightMode === "ayah-highlight"){
    const ns = "http://www.w3.org/2000/svg";
    const poly = document.createElementNS(ns,"polygon");
    poly.setAttribute("points", pts.map(p =>
      m.mapX(p[0]) + "," + m.mapY(p[1])
    ).join(" "));
    poly.setAttribute("fill",colorToRgba(displayColor,getShadeFillAlpha()));
    poly.setAttribute("stroke",colorToRgba(displayColor,getShadeStrokeAlpha()));
    poly.setAttribute("stroke-width",".8");
    ayahHighlightLayer.appendChild(poly);
    ayahHighlightLayer.style.display = "block";
    return;
  }

  /*
     تلوين حقيقي فوق نفس ملف المصحف:
     - لا نكتب الآية من جديد.
     - لا نستخدم HTML text.
     - لا نرسم مستطيلاً ملوناً.
     - نكرر نفس SVG الصفحة داخل طبقة SVG ونقصّه بحدود
       الـ polygon الذي أعاده Timing API، ثم نستخدم فلترًا
       يحوّل الحبر الداكن داخل المنطقة إلى أخضر ويترك الخلفية
       البيضاء بيضاء تقريبًا.
     - في وضع word-by-word: نضيّق القصّ إلى مستطيل الكلمة الحالية.
  */
  const ns = "http://www.w3.org/2000/svg";
  const clipId = "ayahColorClip_" + Date.now();

  const defs = document.createElementNS(ns,"defs");
  const clip = document.createElementNS(ns,"clipPath");
  clip.setAttribute("id",clipId);
  clip.setAttribute("clipPathUnits","userSpaceOnUse");

  const poly = document.createElementNS(ns,"polygon");
  poly.setAttribute("points", pts.map(p =>
    m.mapX(p[0]) + "," + m.mapY(p[1])
  ).join(" "));

  const isWordFollow = highlightMode === "word-by-word";
  let wordWindow = null;

  if(isWordFollow){
    const progress = getAyahProgress(item);
    wordWindow = estimateWordWindow(pts, progress);

    /* طبقة خفيفة لكل الآية */
    const softPoly = document.createElementNS(ns,"polygon");
    softPoly.setAttribute("points", pts.map(p =>
      m.mapX(p[0]) + "," + m.mapY(p[1])
    ).join(" "));
    softPoly.setAttribute("fill", colorToRgba(displayColor, 0.18));
    softPoly.setAttribute("stroke", colorToRgba(displayColor, 0.2));
    softPoly.setAttribute("stroke-width", ".6");
    ayahHighlightLayer.appendChild(softPoly);

    /* قص المقطع الحالي فقط للتلوين القوي */
    const rect = document.createElementNS(ns,"rect");
    rect.setAttribute("x", wordWindow.x);
    rect.setAttribute("y", wordWindow.y);
    rect.setAttribute("width", wordWindow.w);
    rect.setAttribute("height", wordWindow.h);
    clip.appendChild(rect);
  }else{
    clip.appendChild(poly);
  }

  /* يحوّل البكسلات الداكنة إلى اللون المختار، مع إبقاء الأبيض أبيض */
  const filterId = "ayahInkGreen_" + Date.now();
  const filter = document.createElementNS(ns,"filter");
  filter.setAttribute("id",filterId);
  filter.setAttribute("x","-5%");
  filter.setAttribute("y","-5%");
  filter.setAttribute("width","110%");
  filter.setAttribute("height","110%");

  const tone = document.createElementNS(ns,"feComponentTransfer");
  tone.setAttribute("color-interpolation-filters","sRGB");
  ["R","G","B"].forEach(ch=>{
    const f = document.createElementNS(ns,"feFunc"+ch);
    f.setAttribute("type","gamma");
    f.setAttribute("amplitude","1");
    f.setAttribute("exponent","2.8");
    f.setAttribute("offset","0");
    tone.appendChild(f);
  });
  filter.appendChild(tone);

  const matrix = document.createElementNS(ns,"feColorMatrix");
  matrix.setAttribute("type","matrix");
  const ink=hexToRgb(displayColor);
  matrix.setAttribute("values",
    "0.299 0.587 0.114 0 "+(ink.r/255).toFixed(6)+"\n"+
    "0.299 0.587 0.114 0 "+(ink.g/255).toFixed(6)+"\n"+
    "0.299 0.587 0.114 0 "+(ink.b/255).toFixed(6)+"\n"+
    "0 0 0 1 0");
  filter.appendChild(matrix);

  defs.appendChild(clip);
  defs.appendChild(filter);
  ayahHighlightLayer.appendChild(defs);

  const img = document.createElementNS(ns,"image");
  img.setAttribute("href", page.src || quranPageSvgUrl(currentPage));
  img.setAttribute("x","0");
  img.setAttribute("y","0");
  img.setAttribute("width",m.viewW);
  img.setAttribute("height",m.viewH);
  img.setAttribute("preserveAspectRatio","none");
  img.setAttribute("filter",`url(#${filterId})`);
  img.setAttribute("pointer-events","none");

  if(isWordFollow){
    /* قص مزدوج: حدود الآية + نافذة الكلمة */
    const ayahClipId = "ayahFollowClip_" + Date.now();
    const ayahClip = document.createElementNS(ns,"clipPath");
    ayahClip.setAttribute("id", ayahClipId);
    ayahClip.setAttribute("clipPathUnits","userSpaceOnUse");
    const poly2 = document.createElementNS(ns,"polygon");
    poly2.setAttribute("points", pts.map(p =>
      m.mapX(p[0]) + "," + m.mapY(p[1])
    ).join(" "));
    ayahClip.appendChild(poly2);
    defs.appendChild(ayahClip);

    const g = document.createElementNS(ns,"g");
    g.setAttribute("clip-path", `url(#${ayahClipId})`);
    img.setAttribute("clip-path", `url(#${clipId})`);
    g.appendChild(img);
    ayahHighlightLayer.appendChild(g);
  }else{
    img.setAttribute("clip-path",`url(#${clipId})`);
    ayahHighlightLayer.appendChild(img);
  }

  ayahHighlightLayer.style.opacity = "1";
  ayahHighlightLayer.style.display = "block";
}

const FALLBACK_TIMING_READ_ID = 54;

async function getTimingReadId(){
  const reader = RECITERS[selectedReader];
  if(!reader) return FALLBACK_TIMING_READ_ID;

  if(Number.isFinite(Number(reader.timingId))){
    return Number(reader.timingId);
  }

  if(timingReadIdCache[selectedReader] != null){
    return timingReadIdCache[selectedReader];
  }

  try{
    const res = await fetch(
      TIMING_READS_API,
      {cache:"force-cache"}
    );

    if(!res.ok) return FALLBACK_TIMING_READ_ID;

    const reads = await res.json();

    const wanted =
      String(reader.server || "")
        .replace(/\/+$/,"" )
        .toLowerCase();

    for(const r of (Array.isArray(reads) ? reads : [])){
      const folder =
        String(r.folder_url || "")
          .replace(/\/+$/,"" )
          .toLowerCase();

      if(!folder || !wanted) continue;

      if(
        folder === wanted ||
        folder.startsWith(wanted) ||
        wanted.startsWith(folder) ||
        folder.endsWith(wanted.split("/").pop()) ||
        wanted.endsWith(folder.split("/").pop())
      ){
        const id = Number(r.id);
        if(Number.isFinite(id)){
          timingReadIdCache[selectedReader] = id;
          return id;
        }
      }
    }
  }catch(e){}

  timingReadIdCache[selectedReader] = FALLBACK_TIMING_READ_ID;
  return FALLBACK_TIMING_READ_ID;
}

async function loadTimingForCurrentSurah(){
  const surah =
    Number(
      currentAudioSurah ||
      getSurahNumberForPage(currentPage)
    );
  const token = ++timingToken;

  timingSurahLoaded = surah;
  currentTiming = [];

  try{
    if(RECITERS[selectedReader] && RECITERS[selectedReader].listenOnly){
      timingLoading = false;
      try{ if(typeof clearAyahHighlight === "function") clearAyahHighlight(); }catch(e){}
      return;
    }
  }catch(e){}

  const cacheKey =
    selectedReader + ":" + surah;

  if(timingCache[cacheKey] && hasCompleteSurahTiming(timingCache[cacheKey], surah)){
    currentTiming = tagTimingItems(timingCache[cacheKey], surah);
    /* حمّل أيضاً توقيت باقي سور الصفحة للضغط المطوّل */
    loadPageHitTiming(currentPage);
    return;
  }else if(timingCache[cacheKey]){
    removeIncompleteTimingCache(cacheKey);
  }

  /* نسخة محلية من التوقيت للتشغيل بدون نت */
  try{
    const ls = localStorage.getItem("ayaTiming:"+cacheKey);
    if(ls){
      const parsed = JSON.parse(ls);
      if(hasCompleteSurahTiming(parsed, surah)){
        timingCache[cacheKey] = parsed;
        currentTiming = tagTimingItems(parsed, surah);
        loadPageHitTiming(currentPage);
        requestAnimationFrame(function(){
          if(typeof positionHighlightLayer === "function") positionHighlightLayer();
          if(typeof syncHighlight === "function") syncHighlight();
        });
        return;
      }
      removeIncompleteTimingCache(cacheKey);
    }
  }catch(e){}

  timingLoading = true;

  try{
    const readId = await getTimingReadId();

    if(token !== timingToken) return;

    timingReadId = readId;

    if(!readId) return;

    const res =
      await fetch(
        TIMING_API +
        "?surah=" + surah +
        "&read=" + readId,
        {cache:"force-cache"}
      );

    if(!res.ok){
      /* بدون نت: Cache Storage */
      try{
        const cache = await caches.open("aya-timing-v1");
        const hit = await cache.match(TIMING_API + "?surah=" + surah + "&read=" + readId);
        if(hit){
          const data = await hit.json();
          const raw = Array.isArray(data) ? data.filter(x =>
            x && x.ayah != null &&
            Number.isFinite(Number(x.start_time)) &&
            Number.isFinite(Number(x.end_time))
          ) : [];
          if(hasCompleteSurahTiming(raw, surah)){
            timingCache[cacheKey] = raw;
            try{ localStorage.setItem("ayaTiming:"+cacheKey, JSON.stringify(raw)); }catch(e){}
            currentTiming = tagTimingItems(raw, surah);
            requestAnimationFrame(function(){
              if(typeof positionHighlightLayer === "function") positionHighlightLayer();
              if(typeof syncHighlight === "function") syncHighlight();
            });
            loadPageHitTiming(currentPage);
          }
        }
      }catch(e){}
      return;
    }

    const data = await res.json();

    if(token !== timingToken) return;

    const raw =
      Array.isArray(data)
        ? data.filter(x =>
            x &&
            x.ayah != null &&
            Number.isFinite(Number(x.start_time)) &&
            Number.isFinite(Number(x.end_time))
          )
        : [];

    const completeTiming = hasCompleteSurahTiming(raw, surah);
    if(completeTiming) timingCache[cacheKey] = raw;
    currentTiming = tagTimingItems(raw, surah);

    /* حفظ دائم للتظليل أوفلاين فقط بعد التأكد أن توقيت السورة كامل. */
    try{
      if(completeTiming){
        localStorage.setItem("ayaTiming:"+cacheKey, JSON.stringify(raw));
      }else{
        removeIncompleteTimingCache(cacheKey);
      }
    }catch(e){}
    try{
      if(completeTiming && timingReadId){
        var tUrl = TIMING_API + "?surah=" + surah + "&read=" + timingReadId;
        caches.open("aya-timing-v1").then(function(cache){
          cache.put(tUrl, new Response(JSON.stringify(raw), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })).catch(function(){});
        }).catch(function(){});
      }
    }catch(e){}

    /* إعادة المحاولة مهمة للفـاتحة وأول البقرة بعد وصول التوقيت */
    requestAnimationFrame(()=>{
      positionHighlightLayer();
      syncHighlight();
    });

    /* توقيت كل سور الصفحة لدعم الانتقال بين السور في نفس الصفحة */
    loadPageHitTiming(currentPage);
  }catch(e){
    currentTiming = [];
  }finally{
    timingLoading = false;
  }
}

function itemsForCurrentPage(){
  return currentTiming.filter(
    item => pageFromTiming(item) === currentPage
  );
}

/*
  أول آية ظاهرياً في أعلى الصفحة (أصغر Y في المضلع).
  تُستخدم عند قلب الصفحة لبدء التلاوة من رأس الصفحة
  وليس من بداية آخر سورة فيها.
*/
function getTopmostAyahItem(items){
  if(!Array.isArray(items) || !items.length) return null;

  const annotated = [];
  for(let i = 0; i < items.length; i++){
    const item = items[i];
    if(!item || !item.polygon) continue;
    const pts = parsePolygonPoints(item.polygon);
    if(pts.length < 2) continue;

    let minY = Infinity;
    for(let j = 0; j < pts.length; j++){
      if(pts[j][1] < minY) minY = pts[j][1];
    }

    /* أقصى X على الشريط العلوي فقط (وليس كامل المضلع متعدد الأسطر) */
    const band = minY + 22;
    let topMaxX = -Infinity;
    for(let j = 0; j < pts.length; j++){
      if(pts[j][1] <= band && pts[j][0] > topMaxX){
        topMaxX = pts[j][0];
      }
    }
    if(!Number.isFinite(topMaxX)) topMaxX = pts[0][0];

    annotated.push({
      item,
      minY,
      topMaxX,
      surah: Number(item._surah) || 999,
      ayah: Number(item.ayah) || 999,
      start: Number(item.start_time) || 0
    });
  }

  if(!annotated.length) return null;

  let topY = Infinity;
  for(let i = 0; i < annotated.length; i++){
    if(annotated[i].minY < topY) topY = annotated[i].minY;
  }

  const topBand = annotated.filter(a => a.minY <= topY + 18);
  topBand.sort((a, b)=>{
    if(Math.abs(a.minY - b.minY) > 1.5) return a.minY - b.minY;
    if(Math.abs(a.topMaxX - b.topMaxX) > 1) return b.topMaxX - a.topMaxX;
    if(a.surah !== b.surah) return a.surah - b.surah;
    if(a.ayah !== b.ayah) return a.ayah - b.ayah;
    return a.start - b.start;
  });

  return topBand[0].item;
}

function seekAudioToCurrentPage(){
  /*
    نفضّل آيات pageHitTiming (كل سور الصفحة) لاختيار أعلى آية،
    وإلا نرجع لآيات السورة الحالية فقط.
    مهم: نقيّد النتائج بسورة الصوت الحالية حتى لا نأخذ توقيت
    سورة سابقة موجودة أعلى الصفحة ونقفز لوسط السورة الجديدة.
  */
  let items =
    pageHitTimingPage === currentPage && pageHitTiming.length
      ? pageHitTiming
      : itemsForCurrentPage();

  const audioSurah = Number(currentAudioSurah) || 0;
  if(audioSurah > 0 && items.length){
    const sameSurah = items.filter(it => Number(it._surah) === audioSurah);
    if(sameSurah.length) items = sameSurah;
  }

  if(!items.length) return;

  const first = getTopmostAyahItem(items) || items[0];
  if(!first) return;

  /*
    إذا كانت أول آية في السورة على صفحة بدايتها → ابدأ من 0
    ليشمل البسملة، وإلا اذهب لبداية أعلى آية في الصفحة.
  */
  const surahStartPage =
    typeof surahs !== "undefined" && surahs[audioSurah - 1]
      ? Number(surahs[audioSurah - 1][1])
      : currentPage;

  try{
    if(
      audioSurah > 0 &&
      Number(first.ayah) === 1 &&
      surahStartPage === currentPage
    ){
      /* إن وُجدت مقدمة (مثل الفاتحة داخل ملف آل عمران) لا تبدأ من 0 */
      const introMs = typeof getAudioIntroOffsetMs === "function"
        ? getAudioIntroOffsetMs(selectedReader, audioSurah)
        : 0;
      audio.currentTime = introMs > 0 ? (introMs / 1000) : 0;
    }else{
      audio.currentTime =
        Number(first.start_time || 0) / 1000;
    }
  }catch(e){}
}

function getActiveTiming(){
  if(!currentTiming.length) return null;

  let t = audio.currentTime * 1000;
  /* ملف جزئي: لا تتجاوز آخر زمن محفوظ */
  try{
    const maxSec = Number(audio.__ayaPartialMaxSec) || 0;
    if(maxSec > 1 && t > maxSec * 1000) t = maxSec * 1000 - 1;
  }catch(e){}

  const exact = currentTiming.find(item =>
    t >= Number(item.start_time) &&
    t < Number(item.end_time)
  );
  if(exact) return exact;

  /* أقرب آية بالزمن — يمنع اختفاء/خطأ التظليل عند فجوات بسيطة */
  let best = null, bestDist = Infinity;
  for(let i = 0; i < currentTiming.length; i++){
    const it = currentTiming[i];
    const st = Number(it.start_time), en = Number(it.end_time);
    if(!Number.isFinite(st) || !Number.isFinite(en)) continue;
    let dist = 0;
    if(t < st) dist = st - t;
    else if(t >= en) dist = t - en + 0.01;
    else dist = 0;
    if(dist < bestDist){ bestDist = dist; best = it; }
  }
  return (best && bestDist < 800) ? best : null;
}

function syncHighlight(){
  if(!audio || !currentTiming.length) return;

  const active = getActiveTiming();

  if(!active) return;

  const targetPage =
    pageFromTiming(active);

  if(targetPage && targetPage !== currentPage){
    loadPage(
      targetPage,
      {keepAudio:true}
    );
    return;
  }

  if(targetPage === currentPage){
    drawAyahHighlight(active);
  }
}


/* قفزة واحدة فقط — بدون تكرار حتى لا يُقطَّع الصوت */
function seekOnceToMs(ms){
  if(!audio || !Number.isFinite(ms)) return;
  try{
    const t = Math.max(0, Number(ms) / 1000);
    const d = Number(audio.duration);
    const target = (Number.isFinite(d) && d > 0) ? Math.min(t, Math.max(0, d - 0.05)) : t;
    if(Math.abs((audio.currentTime || 0) - target) < 0.35) return;
    audio.currentTime = target;
  }catch(e){}
}

/* أول آية في الصفحة من حقل page في التوقيت */
function getEarliestTimingOnPage(list, pageNum, surahNum){
  if(!Array.isArray(list) || !list.length) return null;
  const page = Number(pageNum);
  const surah = Number(surahNum) || 0;
  let best = null, bestStart = Infinity;
  for(let i = 0; i < list.length; i++){
    const it = list[i];
    if(!it) continue;
    if(surah && it._surah != null && Number(it._surah) !== surah) continue;
    let p = null;
    try{ p = pageFromTiming(it, surah || undefined); }catch(e){}
    if(Number(p) !== page) continue;
    const st = Number(it.start_time);
    if(!Number.isFinite(st)) continue;
    if(st < bestStart){ bestStart = st; best = it; }
  }
  return best;
}

function seekMsForPageStart(list, pageNum, surahNum){
  const top = getEarliestTimingOnPage(list, pageNum, surahNum);
  if(!top) return null;
  let ms = Number(top.start_time);
  if(!Number.isFinite(ms)) return null;
  const prevAyah = Number(top.ayah) - 1;
  if(prevAyah >= 1){
    for(let i = 0; i < list.length; i++){
      const it = list[i];
      if(Number(it.ayah) !== prevAyah) continue;
      if(surahNum && it._surah != null && Number(it._surah) !== Number(surahNum)) continue;
      const en = Number(it.end_time);
      if(Number.isFinite(en) && ms < en + 20) ms = en + 30;
      break;
    }
  }
  try{
    if(Number(top.ayah) === 1 && typeof surahs !== "undefined" && surahs[surahNum - 1] &&
       Number(surahs[surahNum - 1][1]) === Number(pageNum)){
      const introMs = typeof getAudioIntroOffsetMs === "function"
        ? getAudioIntroOffsetMs(selectedReader, surahNum)
        : 0;
      return introMs > 0 ? introMs : 0;
    }
  }catch(e){}
  return ms;
}

function updateAudioSource(keepPosition = false, options = {}){

  const oldTime = audio.currentTime || 0;
  const wasPlaying =
    !audio.paused ||
    !!(typeof userWantsPlay !== "undefined" && userWantsPlay);
  const autoContinue = !!options.autoContinue;
  /* أثناء تبديل المصدر بسبب التنقل لا تُفسَّر pause على أنها إيقاف من المستخدم */
  var __continueAfterSource =
    !!(wasPlaying || autoContinue);
  try{
    if(typeof userWantsPlay !== "undefined" && __continueAfterSource){
      userWantsPlay = true;
    }
  }catch(e){}
  try{ window.__ayaAudioSourceSwitching = true; }catch(e){}
  const explicitSurah = options.surahNumber || null;
  const explicitAyah = Number(options.startAyah) || null;

  /*
    عند فتح/قلب صفحة بدون سورة محددة:
    نحدد أول آية في أعلى الصفحة → سورتها وموضع البداية.
  */
  const applySource = (surahNumber, seekMs)=>{
    currentAudioSurah = Number(surahNumber) || getSurahNumberForPage(currentPage);

    /* مزامنة اسم السورة في المشغّل مع السورة الظاهرة/المختارة */
    try{
      if(typeof syncPlayerSurahUI === "function"){
        syncPlayerSurahUI(currentAudioSurah);
      }
    }catch(e){}

    const url =
      getAudioUrl(
        selectedReader,
        currentPage,
        currentAudioSurah
      );

    if(!url){
      try{ playButton.textContent = "▶"; }catch(e){}
      return;
    }

    /* امسح حالة المقطع القديم حتى لا يُشغَّل صوت سورة أخرى */
    try{
      audio.__ayaPartialMaxSec = 0;
      audio.__ayaPartialUrl = "";
      audio.__ayaResumeAfterPartial = 0;
      audio.__ayaOfflineEnded = false;
      audio.__ayaHandoffBusy = false;
      audio.__ayaPartialUpgrading = false;
      audio.__ayaRecovering = false;
      var offline = (typeof navigator !== "undefined" && navigator.onLine === false);
      /* لا forceNet عند تبديل السورة — يمنع قفزة وقت خاطئة وتقطيع */
      try{ audio.__ayaForceNet = false; }catch(e){}
    }catch(e){}

    resetRepeat();
    try{ window.__ayaAudioSourceSwitching = true; }catch(e){}

    /* رمز تحميل لكل مصدر جديد — يمنع تشغيل مصدر قديم بعد قلب الصفحة */
    const loadToken = ++audioPageToken;
    audio._ayaLoadToken = loadToken;

    /* صفّر الوقت الحالي فقط؛ طول السورة يبقى إن كان الملف نفسه جاهزاً */
    try{
      if(typeof refreshTimeDisplay === "function"){
        refreshTimeDisplay({ resetCurrent: true });
      }else{
        currentTime.textContent = "0:00";
        progress.value = 0;
      }
    }catch(e){
      currentTime.textContent = "0:00";
      progress.value = 0;
    }
    playButton.textContent = "▶";
    clearAyahHighlight();

    loadTimingForCurrentSurah();

    let seekDone = false;

    const tryPlay = (attempt)=>{
      if(audio._ayaLoadToken !== loadToken) return;
      if(!(wasPlaying || autoContinue || __continueAfterSource)) return;
      try{
        if(typeof userWantsPlay !== "undefined") userWantsPlay = true;
        if(typeof __notifPlayLockUntil !== "undefined"){
          __notifPlayLockUntil = Date.now() + 400;
        }
      }catch(e){}
      const p = audio.play();
      if(p && typeof p.then === "function"){
        p.then(()=>{
          if(audio._ayaLoadToken !== loadToken) return;
          try{ window.__ayaAudioSourceSwitching = false; }catch(e){}
          try{ if(typeof userWantsPlay !== "undefined") userWantsPlay = true; }catch(e){}
          playButton.textContent = "Ⅱ";
        }).catch(()=>{
          if(audio._ayaLoadToken !== loadToken) return;
          /* إعادة محاولة أسرع لبدء التشغيل */
          if(attempt < 8){
            setTimeout(()=>tryPlay(attempt + 1), 80 + attempt * 40);
          }else{
            try{ window.__ayaAudioSourceSwitching = false; }catch(e){}
          }
        });
      }
    };

    const doSeekAndPlay = ()=>{
      if(seekDone) return;
      if(audio._ayaLoadToken !== loadToken) return;
      /* انتظر بيانات كافية قبل القفز/التشغيل */
      if(audio.readyState < 1) return;
      seekDone = true;

      try{
        if(keepPosition){
          const d = audio.duration;
          audio.currentTime = Math.min(
            oldTime,
            Number.isFinite(d) && d > 0 ? d : oldTime
          );
        }else if(Number.isFinite(seekMs)){
          var ms = Number(seekMs);
          /* لا تبدأ من 0 إذا كانت للسورة مقدمة صوتية */
          if(ms <= 0){
            try{
              var intro = typeof getAudioIntroOffsetMs === "function"
                ? getAudioIntroOffsetMs(selectedReader, currentAudioSurah)
                : 0;
              if(intro > 0) ms = intro;
            }catch(e){}
          }
          if(typeof seekOnceToMs === "function") seekOnceToMs(ms);
          else audio.currentTime = Math.max(0, ms / 1000);
        }else if(typeof seekAudioToCurrentPage === "function"){
          seekAudioToCurrentPage();
        }
      }catch(e){}

      try{ syncHighlight(); }catch(e){}
      if(wasPlaying || autoContinue || __continueAfterSource){
        tryPlay(0);
      }else{
        try{ window.__ayaAudioSourceSwitching = false; }catch(e){}
      }
    };

    const onMeta = ()=>{
      if(audio._ayaLoadToken !== loadToken) return;
      audio.removeEventListener("loadedmetadata", onMeta);
      doSeekAndPlay();
    };
    const onCanPlay = ()=>{
      if(audio._ayaLoadToken !== loadToken) return;
      audio.removeEventListener("canplay", onCanPlay);
      doSeekAndPlay();
    };
    const onCanPlayThrough = ()=>{
      if(audio._ayaLoadToken !== loadToken) return;
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
      doSeekAndPlay();
    };

    /* اربط المستمعين قبل تعيين المصدر — canplay يكفي، لا ننتظر canplaythrough */
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("loadeddata", onCanPlay);

    try{
      const cur = String(audio.getAttribute("src") || audio.src || audio.currentSrc || "");
      var leaf = "";
      try{ leaf = (url.split("/").pop() || "").split("?")[0]; }catch(e){}
      /* blob أو ملف مختلف = ليس نفس الملف */
      const sameFile = !!(url && cur && cur.indexOf("blob:") !== 0 && (
        cur === url ||
        cur.split("?")[0] === url.split("?")[0] ||
        (function(){
          try{
            var ca = cur.split("?")[0].replace(/\/+$/, "").split("/");
            var ua = url.split("?")[0].replace(/\/+$/, "").split("/");
            if(ca.length < 2 || ua.length < 2) return false;
            return ca[ca.length-1] === ua[ua.length-1] && ca[ca.length-2] === ua[ua.length-2];
          }catch(e){ return false; }
        })()
      ));

      if(sameFile && Number.isFinite(seekMs)){
        /* نفس السورة: قفزة واحدة دون إعادة تحميل (بدون تقطيع) */
        try{ if(!audio.paused) { /* ابقَ يعمل */ } }catch(e){}
        seekOnceToMs(seekMs);
        try{ syncHighlight(); }catch(e){}
        seekDone = true;
        if(wasPlaying || autoContinue || __continueAfterSource){
          if(audio.paused) tryPlay(0);
          else {
            try{ playButton.textContent = "Ⅱ"; }catch(e){}
            try{ window.__ayaAudioSourceSwitching = false; }catch(e){}
          }
        }else{
          try{ window.__ayaAudioSourceSwitching = false; }catch(e){}
        }
        return;
      }

      if(sameFile){
        try{ audio.removeAttribute("src"); }catch(e){}
      }
      try{ audio.preload = "auto"; }catch(e){}

      /* أوقف المصدر القديم فوراً حتى لا يبقى صوت سورة أخرى */
      try{ audio.pause(); }catch(e){}
      try{
        var oldSrc = String(audio.currentSrc || audio.src || "");
        if(oldSrc.indexOf("blob:") === 0){
          try{ audio.removeAttribute("src"); audio.load(); }catch(e){}
        }
      }catch(e){}

      var offlineNow = false;
      try{ offlineNow = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}
      var wantPlay = !!(wasPlaying || autoContinue || __continueAfterSource);

      if(offlineNow){
        /* أوفلاين:
           1) ابحث أولاً عن النسخة الكاملة عبر resolveLocal (الكاش الدائم أولاً).
           2) إن لم توجد، اسمح بالمقطع الجزئي المحفوظ.
           هذا يمنع سجل تنزيل تدريجي قديم من حجب الملف الكامل. */
        var applied = false;
        var offlineToken = loadToken;

        var applyOfflineLocal = function(local, maxSec){
          if(applied || audio._ayaLoadToken !== offlineToken) return;
          applied = true;
          try{
            audio.__ayaOfflineEnded = false;
            audio.__ayaPartialUrl = url;
            audio.__ayaPartialMaxSec = Number(maxSec) || 0;
            audio.__ayaResumeAfterPartial = 0;
            audio.__ayaForceNet = false;
          }catch(e){}
          try{ audio.src = local; }catch(e){}
          try{ audio.load(); }catch(e){}
          if(wantPlay) tryPlay(0);
        };

        var failOffline = function(){
          if(applied || audio._ayaLoadToken !== offlineToken) return;
          applied = true;
          try{ audio.pause(); }catch(e){}
          try{ audio.removeAttribute("src"); audio.load(); }catch(e){}
          try{ playButton.textContent = "▶"; }catch(e){}
          try{
            if(typeof showOfflineMissingDialog === "function"){
              showOfflineMissingDialog("ملف السورة التالية غير محفوظ لهذا القارئ. اتصل بالإنترنت لتنزيله أولاً.");
            }else if(typeof setStatus === "function"){
              setStatus("ملف السورة غير محفوظ أوفلاين لهذا القارئ");
            }
          }catch(e){}
          try{ window.__ayaAudioSourceSwitching = false; }catch(e){}
        };

        (async function(){
          try{
            var local = null;

            /* المسار المعتمد للتخزين المحلي الدائم؛ يفضّل الملف الكامل */
            if(window.__ayaAutoOffline && typeof window.__ayaAutoOffline.resolveLocal === "function"){
              try{ local = await window.__ayaAutoOffline.resolveLocal(url); }catch(e){}
              if(audio._ayaLoadToken !== offlineToken) return;
              if(local){
                /* resolveLocal يضع قيمة maxSec للمقطع الجزئي فقط.
                   الصفر يعني أن النسخة محلية كاملة أو لا يوجد حد جزئي. */
                var resolvedMax = Number(audio.__ayaPartialMaxSec) || 0;
                applyOfflineLocal(local, resolvedMax);
                return;
              }
            }

            /* احتياط: افحص الكاش الكامل بشكل مستقل */
            if(typeof caches !== "undefined"){
              try{
                var cache = await caches.open("aya-audio-v1");
                var hit = await cache.match(url);
                if(audio._ayaLoadToken !== offlineToken) return;
                if(hit){
                  var fullBlob = await hit.blob();
                  if(fullBlob && fullBlob.size){
                    applyOfflineLocal(URL.createObjectURL(fullBlob), 1e9);
                    return;
                  }
                }
              }catch(e){}
            }

            /* أخيراً: اسمح بالجزء التدريجي إن لم يوجد ملف كامل */
            if(window.__ayaAutoOffline && typeof window.__ayaAutoOffline.idbFindPartial === "function"){
              var rec = await window.__ayaAutoOffline.idbFindPartial(url);
              if(audio._ayaLoadToken !== offlineToken) return;
              if(rec && rec.blob){
                var expectedLeaf = "";
                var foundLeaf = "";
                try{ expectedLeaf = (url.split("/").pop() || "").split("?")[0]; }catch(e){}
                try{ foundLeaf = ((rec.url || "").split("/").pop() || "").split("?")[0]; }catch(e){}
                if(expectedLeaf && foundLeaf && expectedLeaf !== foundLeaf){
                  failOffline();
                  return;
                }
                applyOfflineLocal(URL.createObjectURL(rec.blob), Number(rec.maxSec) || 0);
                return;
              }
            }
            failOffline();
          }catch(e){
            failOffline();
          }
        })();
      }else{
        audio.src = url;
        try{ audio.load(); }catch(e){}
        if(wantPlay) tryPlay(0);
      }
    }catch(e){}

    setTimeout(()=>{
      if(audio._ayaLoadToken !== loadToken) return;
      if(audio.readyState >= 1) doSeekAndPlay();
      else if(wasPlaying || autoContinue || __continueAfterSource) tryPlay(1);
    }, 20);
    setTimeout(()=>{
      if(audio._ayaLoadToken !== loadToken) return;
      if(audio.readyState >= 1) doSeekAndPlay();
      if((wasPlaying || autoContinue || __continueAfterSource) && audio.paused) tryPlay(2);
    }, 100);
    setTimeout(()=>{
      if(audio._ayaLoadToken !== loadToken) return;
      if((wasPlaying || autoContinue || __continueAfterSource) && audio.paused) tryPlay(3);
    }, 300);
  };

  if(explicitSurah){
    /* عند اختيار جزء: ملف الصوت هو ملف السورة، لكن البداية يجب أن تكون
       من أول آية للجزء داخل السورة، وليس من أول السورة. */
    if(explicitAyah){
      const partToken = ++audioPageToken;
      const partTargetPage = currentPage;
      (async ()=>{
        let seekMs = 0;
        try{
          const cacheKey = selectedReader + ":" + Number(explicitSurah);
          let list = timingCache[cacheKey];
          if(!list){
            list = await fetchTimingForSurah(Number(explicitSurah));
          }
          if(partToken !== audioPageToken || currentPage !== partTargetPage){
            return;
          }
          const item = (list || []).find(x => Number(x.ayah) === explicitAyah);
          if(item && Number.isFinite(Number(item.start_time))){
            seekMs = Number(item.start_time);
          }
        }catch(e){}

        if(partToken !== audioPageToken){
          return;
        }
        applySource(explicitSurah, seekMs);
      })();
      return;
    }

    /* عند انتهاء سورة أو اختيار سورة: ابدأ من أول التلاوة
       مع تجاوز المقدمة إن وُجدت (مثل الفاتحة داخل ملف آل عمران) */
    var startMs = 0;
    try{
      if(typeof getAudioIntroOffsetMs === "function"){
        startMs = getAudioIntroOffsetMs(selectedReader, explicitSurah) || 0;
      }
    }catch(e){}
    applySource(explicitSurah, startMs);
    return;
  }

  if(keepPosition){
    applySource(
      currentAudioSurah || getSurahNumberForPage(currentPage),
      null
    );
    return;
  }

  /* قلب صفحة: ابدأ من أعلى الصفحة (مع منع سباق القلب السريع) */
  const pageToken = ++audioPageToken;
  const targetPage = currentPage;

  const startFromTop = async ()=>{
    let seekMs = null;
    let surahNum = getSurahNumberForPage(targetPage);

    try{
      let list = [];
      try{ list = await fetchTimingForSurah(surahNum); }catch(e){}
      if(pageToken !== audioPageToken || currentPage !== targetPage) return;

      if(list && list.length && typeof seekMsForPageStart === "function"){
        const ms = seekMsForPageStart(list, targetPage, surahNum);
        if(ms != null && Number.isFinite(ms)) seekMs = ms;
      }

      if(seekMs == null){
        const items = await loadPageHitTiming(targetPage);
        if(pageToken !== audioPageToken || currentPage !== targetPage) return;
        const top = getTopmostAyahItem(items);
        if(top){
          if(top._surah) surahNum = Number(top._surah);
          const st = Number(top.start_time);
          if(Number(top.ayah) === 1 && typeof surahs !== "undefined" && surahs[surahNum - 1] &&
             Number(surahs[surahNum - 1][1]) === targetPage){
            const introMs = typeof getAudioIntroOffsetMs === "function"
              ? getAudioIntroOffsetMs(selectedReader, surahNum)
              : 0;
            seekMs = introMs > 0 ? introMs : 0;
          }else if(Number.isFinite(st)) seekMs = st;
        }
      }
    }catch(e){}

    if(pageToken !== audioPageToken || currentPage !== targetPage){
      return;
    }

    applySource(surahNum, seekMs);
  };

  startFromTop();
}

readerSelect.value = selectedReader;
updateReaderName();

readerSelect.onchange = ()=>{

  /* احفظ الآية الحالية قبل تبديل القارئ لنبدأ منها بعد التحميل */
  const wasPlaying = audio && !audio.paused;
  let targetAyah = null;
  let targetSurah = Number(
    currentAudioSurah ||
    getSurahNumberForPage(currentPage)
  );
  if(typeof getActiveTiming === "function"){
    const active = getActiveTiming();
    if(active && active.ayah != null){
      targetAyah = Number(active.ayah);
      if(active._surah) targetSurah = Number(active._surah);
    }
  }
  /* إن لم نجد آية نشطة (مثلاً عند الإيقاف) نأخذ أقرب آية حسب الوقت */
  if(targetAyah == null && currentTiming && currentTiming.length && audio){
    const t = (audio.currentTime || 0) * 1000;
    let nearest = null;
    let nearestDist = Infinity;
    for(const item of currentTiming){
      const st = Number(item.start_time);
      if(!Number.isFinite(st)) continue;
      const d = Math.abs(t - st);
      if(d < nearestDist){
        nearestDist = d;
        nearest = item;
      }
    }
    if(nearest && nearest.ayah != null){
      targetAyah = Number(nearest.ayah);
      if(nearest._surah) targetSurah = Number(nearest._surah);
    }
  }

  selectedReader = readerSelect.value;

  localStorage.setItem(
    "quranReader",
    selectedReader
  );

  updateReaderName();
  currentAudioSurah = targetSurah;

  /* حمّل صوت القارئ الجديد ثم ابحث عن نفس الآية في توقيته */
  const url = getAudioUrl(selectedReader, currentPage, currentAudioSurah);
  if(!url){
    updateAudioSource(false);
    return;
  }

  resetRepeat();
  audio.pause();
  /* امسح حالة المقطع الجزئي للقارئ السابق حتى لا يُعاد تشغيل صوته بعد التبديل */
  try{
    audio.__ayaPartialUrl = "";
    audio.__ayaPartialMaxSec = 0;
    audio.__ayaResumeAfterPartial = 0;
    audio.__ayaForceNet = true;
    audio.__ayaHandoffBusy = false;
    audio.__ayaPartialUpgrading = false;
    audio.__ayaEndedHandoffBusy = false;
    audio.__ayaOfflineEnded = false;
  }catch(e){}
  try{ audio.preload = "auto"; }catch(e){}
  audio.src = url;
  audio.load();
  try{ setTimeout(function(){ try{ audio.__ayaForceNet = false; }catch(e){} }, 1500); }catch(e){}
  try{
    if(typeof refreshTimeDisplay === "function"){
      refreshTimeDisplay({ resetCurrent: true, forceZeroDuration: true });
    }else{
      currentTime.textContent = "0:00";
      duration.textContent = "0:00";
      progress.value = 0;
    }
  }catch(e){
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
    progress.value = 0;
  }
  playButton.textContent = wasPlaying ? "Ⅱ" : "▶";
  clearAyahHighlight();

  /* ابدأ التشغيل فوراً عند تبديل القارئ — لا تنتظر التوقيت */
  if(wasPlaying){
    try{ if(typeof userWantsPlay !== "undefined") userWantsPlay = true; }catch(e){}
    const kick = (n)=>{
      const p = audio.play();
      if(p && typeof p.then === "function"){
        p.then(()=>{ playButton.textContent = "Ⅱ"; }).catch(()=>{
          if(n < 6) setTimeout(()=>kick(n+1), 70 + n*40);
        });
      }
    };
    kick(0);
  }

  const applyAyahSeek = ()=>{
    if(targetAyah == null || !currentTiming.length){
      if(wasPlaying && audio.paused){
        audio.play().then(()=>{ playButton.textContent = "Ⅱ"; }).catch(()=>{});
      }
      return;
    }
    const match = currentTiming.find(item =>
      Number(item.ayah) === targetAyah &&
      (item._surah == null || Number(item._surah) === targetSurah)
    );
    if(match && Number.isFinite(Number(match.start_time))){
      try{
        audio.currentTime = Math.max(0, Number(match.start_time) / 1000);
      }catch(e){}
      if(typeof syncHighlight === "function") syncHighlight();
    }
    if(wasPlaying && audio.paused){
      audio.play().then(()=>{ playButton.textContent = "Ⅱ"; }).catch(()=>{});
    }
  };

  /* التوقيت في الخلفية ثم القفز للآية دون تأخير البدء */
  const waitTimingAndSeek = async ()=>{
    await loadTimingForCurrentSurah();
    if(audio.readyState >= 1){
      applyAyahSeek();
      return;
    }
    const onReady = function(){
      audio.removeEventListener("loadedmetadata", onReady);
      audio.removeEventListener("canplay", onReady);
      applyAyahSeek();
    };
    audio.addEventListener("loadedmetadata", onReady);
    audio.addEventListener("canplay", onReady);
  };
  waitTimingAndSeek();

};


/* =========================
   الانتقال التلقائي إلى السورة التالية
   مفعّل افتراضياً للمحافظة على السلوك السابق
========================= */
let autoNextSurahEnabled = true;
const autoNextSurahButton = document.getElementById("autoNextSurahButton");
const autoNextSurahText = document.getElementById("autoNextSurahText");
const autoNextSurahIcon = document.getElementById("autoNextSurahIcon");
function updateAutoNextSurahButton(){
  /* اعرض حالة الخاصية نفسها:
     مفعّل = التالية: تشغيل + سهم انتقال أخضر.
     متوقف = التالية: إيقاف + علامة إيقاف برتقالية. */
  if(autoNextSurahText) autoNextSurahText.textContent = autoNextSurahEnabled ? "التالية: تشغيل" : "التالية: إيقاف";
  if(autoNextSurahIcon) autoNextSurahIcon.textContent = autoNextSurahEnabled ? "⏭" : "Ⅱ";
  if(autoNextSurahButton){
    autoNextSurahButton.classList.toggle("auto-next-enabled", autoNextSurahEnabled);
    autoNextSurahButton.classList.toggle("auto-next-disabled", !autoNextSurahEnabled);
    autoNextSurahButton.title = autoNextSurahEnabled ? "الانتقال التلقائي مفعّل — اضغط للإيقاف" : "الانتقال التلقائي متوقف — اضغط للتشغيل";
    autoNextSurahButton.setAttribute("aria-pressed", autoNextSurahEnabled ? "true" : "false");
  }
}
if(autoNextSurahButton){
  autoNextSurahButton.onclick = function(){
    autoNextSurahEnabled = !autoNextSurahEnabled;
    updateAutoNextSurahButton();
  };
}
updateAutoNextSurahButton();

/* =========================
   تكرار الآية — النسخة المستقرة
   إيقاف → مرتان → 3 مرات → دائم → إيقاف
========================= */
const repeatCycleColors=["#168443","#2f80ed","#eb5757"]; // أخضر → أزرق → أحمر
let repeatMode=0, repeatCount=0, repeatItem=null, repeatKey=null, repeatJumping=false, repeatColorActive=false;
function getAyahDisplayColor(){return repeatColorActive&&repeatMode!==0&&repeatCount>0?repeatCycleColors[(repeatCount-1)%repeatCycleColors.length]:highlightColor;}
const repeatAyahButton=document.getElementById("repeatAyahButton");
const repeatAyahText=document.getElementById("repeatAyahText");
const repeatModes=[0,2,3,Infinity];
const repeatLabels=["تكرار: إيقاف","تكرار: مرتان","تكرار: 3 مرات","تكرار: دائم"];
function resetRepeat(){repeatCount=0;repeatItem=null;repeatKey=null;repeatJumping=false;repeatColorActive=false;}
function setRepeatLabel(){const i=repeatModes.indexOf(repeatMode);if(repeatAyahText)repeatAyahText.textContent=repeatLabels[i>=0?i:0];}
if(repeatAyahButton){repeatAyahButton.onclick=()=>{const i=repeatModes.indexOf(repeatMode);repeatMode=repeatModes[(i+1)%repeatModes.length];resetRepeat();repeatColorActive=(repeatMode!==0);setRepeatLabel();syncHighlight();};}
setRepeatLabel();
function repeatTick(){
 if(repeatMode===0||audio.paused||!currentTiming.length||repeatJumping)return;
 const now=audio.currentTime*1000;
 if(repeatItem){const end=Number(repeatItem.end_time);if(Number.isFinite(end)&&now>=end-8){const again=repeatMode===Infinity||repeatCount<repeatMode;if(again){repeatCount++;repeatColorActive=true;repeatJumping=true;syncHighlight();const st=Number(repeatItem.start_time);if(Number.isFinite(st)){audio.currentTime=st/1000;}syncHighlight();setTimeout(()=>{repeatJumping=false;},60);return;}repeatItem=null;repeatKey=null;repeatCount=0;return;}}
 const active=currentTiming.find(item=>now>=Number(item.start_time)&&now<Number(item.end_time));
 if(active){const key=String(active.ayah)+":"+String(active.start_time);if(key!==repeatKey){repeatItem=active;repeatKey=key;repeatCount=1;repeatColorActive=(repeatMode!==0);syncHighlight();}}
}
setInterval(repeatTick,20);

/* =========================
   الوقت
========================= */

function fmt(s){

  if(!Number.isFinite(s)){
    return "0:00";
  }

  return (
    Math.floor(s / 60)
    +
    ":"
    +
    String(
      Math.floor(s % 60)
    ).padStart(2,"0")
  );

}

audio.addEventListener(
  "loadedmetadata",
  ()=>{
    if(typeof refreshTimeDisplay === "function") refreshTimeDisplay();
    else if(duration) duration.textContent = fmt(audio.duration);
  }
);

audio.addEventListener(
  "durationchange",
  ()=>{
    if(typeof refreshTimeDisplay === "function") refreshTimeDisplay();
  }
);

audio.addEventListener(
  "timeupdate",
  ()=>{
    if(typeof refreshTimeDisplay === "function") refreshTimeDisplay();
    else {
      currentTime.textContent = fmt(audio.currentTime);
      progress.value = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
    }
    syncHighlight();
    /* أبقِ اسم السورة في المشغّل متزامناً مع التلاوة */
    try{
      if(typeof currentAudioSurah !== "undefined" && currentAudioSurah && typeof syncPlayerSurahUI === "function"){
        if(!audio.__ayaSurahUiTick){
          audio.__ayaSurahUiTick = true;
          setTimeout(function(){ try{ audio.__ayaSurahUiTick = false; }catch(e){} }, 800);
          syncPlayerSurahUI(currentAudioSurah);
        }
      }
    }catch(e){}
  }
);

audio.addEventListener(
  "error",
  ()=>{

    playButton.textContent = "▶";

  }
);

audio.addEventListener(
  "ended",
  ()=>{

    resetRepeat();

    /* وضع الاستماع فقط: المشغّل المخصص يتولى الانتقال */
    try{
      if(document.body.classList.contains("listen-only-mode")){
        return;
      }
    }catch(e){}

    /*
      نهاية مقطع جزئي (تنزيل تدريجي) ≠ نهاية السورة.
      - إن وُجد نت: أكمل من الملف الكامل من موضع النهاية الجزئية.
      - بدون نت: توقف دون الانتقال للسورة التالية.
    */
    try{
      var maxSec = Number(audio.__ayaPartialMaxSec) || 0;
      var isPartial = maxSec > 0.5 && maxSec < 1e8;
      if(isPartial){
        var surahNow = currentAudioSurah || (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 1);
        var netUrl = "";
        try{
          if(typeof getAudioUrl === "function"){
            netUrl = getAudioUrl(selectedReader, currentPage, surahNow) || "";
          }
        }catch(e){}
        var online = true;
        try{ online = !(typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}
        if(online && netUrl){
          var resumeAt = Math.max(0, Math.min(maxSec - 0.15, Number(audio.currentTime) || maxSec));
          try{ audio.__ayaPartialMaxSec = 0; }catch(e){}
          try{ audio.__ayaResumeAfterPartial = resumeAt; }catch(e){}
          try{ audio.__ayaForceNet = true; }catch(e){}
          var onMeta = function(){
            try{ audio.removeEventListener("loadedmetadata", onMeta); }catch(e){}
            try{
              var r = Number(audio.__ayaResumeAfterPartial) || resumeAt;
              if(r > 0.2) audio.currentTime = r;
            }catch(e){}
            try{ audio.play().catch(function(){}); }catch(e){}
          };
          audio.addEventListener("loadedmetadata", onMeta);
          try{ audio.src = netUrl; audio.load(); }catch(e){}
          setTimeout(onMeta, 120);
          try{ if(playButton) playButton.textContent = "Ⅱ"; }catch(e){}
          return;
        }
        /* أوفلاين أو لا رابط: توقف عند آخر ما حُفظ */
        try{ if(playButton) playButton.textContent = "▶"; }catch(e){}
        return;
      }
    }catch(e){}

    if(!autoNextSurahEnabled){
      playButton.textContent = "▶";
      return;
    }

    const finishedSurah =
      currentAudioSurah ||
      getSurahNumberForPage(currentPage);

    const nextSurah =
      finishedSurah + 1;

    if(nextSurah > surahs.length){
      playButton.textContent = "▶";
      return;
    }

    const nextSurahStartPage =
      Number(surahs[nextSurah - 1][1]);

    /* الملف الحالي وصل إلى نهايته بالكامل.
       في وضع عدم الاتصال انتقل إلى السورة التالية عبر مسار التحميل المحلي
       نفسه؛ سيُشغَّل الملف من الكاش/التخزين إن كان محفوظاً.
       أما المقطع الجزئي فيُعالج أعلاه ولا يُعامل كنهاية سورة. */
    loadPage(
      nextSurahStartPage,
      {
        autoContinue: true,
        surahNumber: nextSurah
      }
    );

  }
);



/* =========================
   التشغيل
========================= */


/* حالة تحميل الصوت: إبقاء الواجهة + أيقونة تحميل على زر التشغيل */
let audioIsLoading = false;
let __ayaPlayBtnSaved = null;

function setAudioLoading(on){
  audioIsLoading = !!on;
  try{
    if(!playButton) return;
    if(audioIsLoading){
      if(__ayaPlayBtnSaved == null){
        __ayaPlayBtnSaved = playButton.textContent;
      }
      playButton.textContent = "";
      playButton.classList.add("is-loading");
      playButton.setAttribute("aria-busy", "true");
      /* أظهر الواجهة أثناء التحميل ولا تُخفِها */
      try{
        if(typeof setReadingUIHidden === "function" && readingUIHidden){
          setReadingUIHidden(false);
        }else{
          if(typeof clearReadingUIAutoHide === "function") clearReadingUIAutoHide();
        }
      }catch(e){}
    }else{
      playButton.classList.remove("is-loading");
      playButton.removeAttribute("aria-busy");
      if(audio && !audio.paused){
        playButton.textContent = "Ⅱ";
      }else if(__ayaPlayBtnSaved != null && __ayaPlayBtnSaved !== ""){
        playButton.textContent = __ayaPlayBtnSaved === "Ⅱ" ? "▶" : (__ayaPlayBtnSaved || "▶");
      }else{
        playButton.textContent = (audio && !audio.paused) ? "Ⅱ" : "▶";
      }
      __ayaPlayBtnSaved = null;
      try{
        if(typeof scheduleReadingUIAutoHide === "function" && !readingUIHidden){
          scheduleReadingUIAutoHide();
        }
      }catch(e){}
    }
  }catch(e){}
}

function bindAudioLoadingUI(){
  if(!audio || audio.__ayaLoadingBound) return;
  audio.__ayaLoadingBound = true;

  function clearWaitTimers(){
    try{ if(audio.__ayaWaitTimer) clearTimeout(audio.__ayaWaitTimer); }catch(e){}
    try{ if(audio.__ayaLoadStuckTimer) clearTimeout(audio.__ayaLoadStuckTimer); }catch(e){}
    audio.__ayaWaitTimer = null;
    audio.__ayaLoadStuckTimer = null;
  }

  /* إن علقت الشبكة: ارجع للمقطع المحلي فوراً عند نفس الموضع */
  function recoverFromPartialIfPossible(){
    try{
      if(audio.__ayaRecovering || audio.__ayaHandoffBusy) return;
      var t = Number(audio.currentTime) || Number(audio.__ayaResumeAfterPartial) || 0;
      var url = "";
      try{
        if(typeof getAudioUrl === "function"){
          var s = (typeof currentAudioSurah !== "undefined" && currentAudioSurah)
            ? currentAudioSurah
            : (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 1);
          url = getAudioUrl(selectedReader, currentPage, s) || "";
        }
      }catch(e){}
      if(!url) try{ url = String(audio.__ayaPartialUrl || ""); }catch(e){}
      if(!url) return;

      /* إن كنا على blob كافٍ لا تعِد التعيين */
      try{
        var cur = String(audio.currentSrc || audio.src || "");
        var maxSec = Number(audio.__ayaPartialMaxSec) || 0;
        if(cur.indexOf("blob:") === 0 && maxSec > 1 && t < maxSec - 0.8 && audio.readyState >= 2){
          setAudioLoading(false);
          return;
        }
      }catch(e){}

      audio.__ayaRecovering = true;
      try{ audio.__ayaResumeAfterPartial = t; }catch(e){}
      var handoff = (window.__ayaAutoOffline && window.__ayaAutoOffline.seamlessToPartial)
        ? window.__ayaAutoOffline.seamlessToPartial(url, t)
        : Promise.resolve(false);
      Promise.resolve(handoff).then(function(ok){
        audio.__ayaRecovering = false;
        setAudioLoading(false);
        if(!ok){
          try{ audio.pause(); }catch(e){}
          try{
            var cur = String(audio.currentSrc || audio.src || "");
            /* لا تُبقِ صوت سورة أخرى يعمل */
            if(cur.indexOf("blob:") === 0){
              var need = (url.split("/").pop() || "").split("?")[0];
              var partialUrl = String(audio.__ayaPartialUrl || "");
              var got = (partialUrl.split("/").pop() || "").split("?")[0];
              if(need && got && need !== got){
                try{ audio.removeAttribute("src"); audio.load(); }catch(e2){}
              }
            }
          }catch(e){}
        }
      }).catch(function(){ audio.__ayaRecovering = false; setAudioLoading(false); });
    }catch(e){ try{ audio.__ayaRecovering = false; setAudioLoading(false); }catch(e2){} }
  }

  audio.addEventListener("loadstart", function(){
    if(audio.__ayaPartialUpgrading || audio.__ayaRecovering) {
      /* ترقية/استعادة: أظهر تحميلاً قصيراً مع مهلة أمان */
    }
    setAudioLoading(true);
    clearWaitTimers();
    audio.__ayaLoadStuckTimer = setTimeout(function(){
      /* بعد 6 ثوانٍ عالق: حاول المحلي أو ألغِ التحميل */
      recoverFromPartialIfPossible();
      setTimeout(function(){ setAudioLoading(false); }, 500);
    }, 6000);
  });
  audio.addEventListener("waiting", function(){
    setAudioLoading(true);
    clearWaitTimers();
    var offline = false;
    try{ offline = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}
    /* أونلاين: انتظر البث أطول قبل التحويل للمحلي (يمنع التقطيع) */
    var delay = offline ? 800 : 5000;
    audio.__ayaWaitTimer = setTimeout(function(){
      recoverFromPartialIfPossible();
      setTimeout(function(){ setAudioLoading(false); }, 300);
    }, delay);
  });
  audio.addEventListener("stalled", function(){
    setAudioLoading(true);
    clearWaitTimers();
    var offline = false;
    try{ offline = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}
    var delay = offline ? 800 : 5000;
    audio.__ayaWaitTimer = setTimeout(function(){
      recoverFromPartialIfPossible();
      setTimeout(function(){ setAudioLoading(false); }, 300);
    }, delay);
  });
  audio.addEventListener("seeking", function(){
    if(audio.readyState < 3) setAudioLoading(true);
  });
  audio.addEventListener("canplay", function(){
    clearWaitTimers();
    setAudioLoading(false);
  });
  audio.addEventListener("canplaythrough", function(){
    clearWaitTimers();
    setAudioLoading(false);
  });
  audio.addEventListener("playing", function(){
    clearWaitTimers();
    setAudioLoading(false);
  });
  audio.addEventListener("pause", function(){
    /* لا تُبقِ دائرة التحميل إن أُوقف مؤقتاً */
    if(audio.readyState >= 2) setAudioLoading(false);
  });
  audio.addEventListener("error", function(){
    clearWaitTimers();
    setAudioLoading(false);
    try{ recoverFromPartialIfPossible(); }catch(e){}
  });
  audio.addEventListener("timeupdate", function(){
    if(audioIsLoading && !audio.paused && audio.readyState >= 2){
      setAudioLoading(false);
    }
  });
}
try{ bindAudioLoadingUI(); }catch(e){}

playButton.onclick = ()=>{

  try{ if(typeof userWantsPlay !== "undefined") userWantsPlay = true; }catch(e){}
  /* إن علق التحميل: ألغِ الحالة وحاول المحلي ثم التشغيل */
  try{
    if(typeof audioIsLoading !== "undefined" && audioIsLoading){
      try{ setAudioLoading(false); }catch(e){}
    }
  }catch(e){}

  /* أوفلاين: تأكد أن الملف الحالي لنفس السورة المعروضة في المشغّل */
  try{
    var offline = (typeof navigator !== "undefined" && navigator.onLine === false);
    if(offline && typeof currentAudioSurah !== "undefined" && currentAudioSurah){
      var wantLeaf = String(Number(currentAudioSurah)).padStart(3,"0") + ".mp3";
      var pu = String(audio.__ayaPartialUrl || "");
      var src = String(audio.currentSrc || audio.src || "");
      var leafOk = false;
      if(pu){
        var pl = (pu.split("/").pop() || "").split("?")[0].toLowerCase();
        leafOk = (pl === wantLeaf.toLowerCase());
      }
      /* blob بدون تطابق مسار السورة → أعد التحميل للسورة الصحيحة */
      if(src.indexOf("blob:") === 0 && pu && !leafOk){
        if(typeof updateAudioSource === "function"){
          updateAudioSource(false, { autoContinue: true, surahNumber: currentAudioSurah });
          return;
        }
      }
    }
  }catch(e){}

  var hasSrc = false;
  try{
    hasSrc = !!(audio.currentSrc || audio.getAttribute("src") || audio.src);
    if(hasSrc && (audio.src === window.location.href || audio.getAttribute("src") === "")) hasSrc = false;
  }catch(e){}

  if(!hasSrc || audio.error){
    updateAudioSource(false, { autoContinue: true });
    return;
  }

  if(audio.paused){
    /* تجاوز مقدمة الملف (مثل الفاتحة داخل آل عمران) إن كنا قبلها */
    try{
      var introSec = typeof getActiveIntroOffsetSec === "function" ? getActiveIntroOffsetSec() : 0;
      if(introSec > 0 && (audio.currentTime || 0) < introSec - 0.15){
        audio.currentTime = introSec;
      }
    }catch(e){}
    /* إن كانت البيانات جاهزة شغّل فوراً دون إعادة تحميل */
    var p = null;
    try{
      if(typeof safePlay === "function") p = safePlay();
      else p = audio.play();
    }catch(e){}
    if(p && typeof p.then === "function"){
      p.then(function(){ playButton.textContent = "Ⅱ"; }).catch(function(){
        /* محاولة ثانية بعد لحظة قصيرة قبل إعادة التحميل */
        setTimeout(function(){
          audio.play().then(function(){ playButton.textContent = "Ⅱ"; }).catch(function(){
            updateAudioSource(true, { autoContinue: true });
          });
        }, 80);
      });
    }else{
      playButton.textContent = "Ⅱ";
    }
  }else{
    try{ if(typeof userWantsPlay !== "undefined") userWantsPlay = false; }catch(e){}
    if(typeof safePause === "function"){
      safePause();
    }else{
      audio.pause();
      playButton.textContent = "▶";
    }
  }

};


/* =========================
   التحكم بالصوت
========================= */

function seekToAdjacentAyah(direction){

  if(!audio || !currentTiming.length) return;

  const items = currentTiming
    .slice()
    .sort((a,b)=>Number(a.start_time)-Number(b.start_time));

  const t = audio.currentTime * 1000;

  let index = items.findIndex(item =>
    t >= Number(item.start_time) &&
    t < Number(item.end_time)
  );

  if(index < 0){
    if(direction > 0){
      index = items.findIndex(item => Number(item.start_time) > t);
      if(index < 0) return;
    }else{
      index = items.findIndex(item => Number(item.start_time) > t) - 1;
      if(index < 0) index = 0;
    }
  }else{
    index += direction;
  }

  if(index < 0 || index >= items.length) return;

  const target = Number(items[index].start_time);
  if(!Number.isFinite(target)) return;

  resetRepeat();
  audio.currentTime = Math.max(0, target / 1000);
  syncHighlight();
}

document.getElementById(
  "backButton"
).onclick = ()=>{
  seekToAdjacentAyah(-1);
};

document.getElementById(
  "forwardButton"
).onclick = ()=>{
  seekToAdjacentAyah(1);
};


/* =========================
   أزرار الصفحات
========================= */

document.getElementById(
  "prevButton"
).onclick =
  prevPage;

document.getElementById(
  "nextButton"
).onclick =
  nextPage;


/* =========================
   إعدادات التمييز
========================= */
const highlightSettingsButton = document.getElementById("highlightSettingsButton");
const highlightSettingsOverlay = document.getElementById("highlightSettingsOverlay");
const highlightSettingsClose = document.getElementById("highlightSettingsClose");

function refreshHighlightSettingsUI(){
  document.querySelectorAll("#highlightSettingsOverlay [data-highlight-mode]").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.highlightMode === highlightMode);
  });
  document.querySelectorAll("#highlightColors .color-choice").forEach(btn=>{
    btn.classList.toggle("active", String(btn.dataset.color).toLowerCase() === String(highlightColor).toLowerCase());
  });
}

if(highlightSettingsButton){
  highlightSettingsButton.onclick = ()=>{
    highlightSettingsOverlay.classList.add("show");
    refreshHighlightSettingsUI();
    sideMenu.classList.remove("open");
    overlay.classList.remove("show");
  };
}
if(highlightSettingsClose){
  highlightSettingsClose.onclick = ()=>highlightSettingsOverlay.classList.remove("show");
}
if(highlightSettingsOverlay){
  highlightSettingsOverlay.addEventListener("click", e=>{
    if(e.target === highlightSettingsOverlay) highlightSettingsOverlay.classList.remove("show");
  });
  highlightSettingsOverlay.querySelectorAll("[data-highlight-mode]").forEach(btn=>{
    btn.onclick=()=>{
      highlightMode=btn.dataset.highlightMode;
      localStorage.setItem("highlightMode", highlightMode);
      refreshHighlightSettingsUI();
      highlightSettingsOverlay.classList.remove("show");
      syncHighlight();
    };
  });
}

if(highlightSettingsOverlay){
  highlightSettingsOverlay.querySelectorAll("#highlightColors .color-choice").forEach(btn=>{
    btn.onclick=()=>{
      highlightColor=btn.dataset.color;
      localStorage.setItem("highlightColor",highlightColor);
      applyHighlightColor();
      refreshHighlightSettingsUI();
      syncHighlight();
    };
  });
}


/* =========================
   حفظ الصفحة
========================= */

/* =========================
   العلامة المرجعية (صفحة + آية إن توفرت)
========================= */
/* =========================
   علامات مرجعية متعددة (آيات)
========================= */
var BOOKMARKS_KEY = "quranBookmarks";
var BOOKMARKS_MAX = 40;

function getCurrentBookmarkRef(){
  try{
    var active = (typeof getActiveTiming === "function") ? getActiveTiming() : null;
    if(active){
      var sNum = Number(active._surah || active.surah || (typeof timingSurahLoaded !== "undefined" ? timingSurahLoaded : 0) || (typeof currentAudioSurah !== "undefined" ? currentAudioSurah : 0) || 0);
      var aNum = Number(active.ayah || 0);
      if(sNum >= 1 && aNum >= 1) return { page: Number(currentPage) || 1, surah: sNum, ayah: aNum, t: Date.now() };
    }
  }catch(e){}
  try{
    var ref = window.__lastTafsirRef;
    if(ref && Number(ref.surah) >= 1 && Number(ref.ayah) >= 1){
      return { page: Number(currentPage) || 1, surah: Number(ref.surah), ayah: Number(ref.ayah), t: Date.now() };
    }
  }catch(e){}
  var surahOnly = 0;
  try{
    if(typeof getSurahNumberForPage === "function") surahOnly = Number(getSurahNumberForPage(currentPage)) || 0;
  }catch(e){}
  return { page: Number(currentPage) || 1, surah: surahOnly, ayah: 0, t: Date.now() };
}

function formatBookmarkLabel(bm){
  if(!bm) return "";
  var page = Number(bm.page) || 0;
  var surah = Number(bm.surah) || 0;
  var ayah = Number(bm.ayah) || 0;
  var name = "";
  try{
    if(surah >= 1 && typeof surahs !== "undefined" && surahs[surah - 1] && surahs[surah - 1][0]) name = surahs[surah - 1][0];
  }catch(e){}
  try{
    if(!name && surah >= 1 && typeof SURAH_NAMES !== "undefined" && SURAH_NAMES[surah - 1]) name = SURAH_NAMES[surah - 1];
  }catch(e){}
  if(surah >= 1 && ayah >= 1){
    if(name) return name + " — الآية " + ayah + " — صفحة " + page;
    return "سورة " + surah + " — الآية " + ayah + " — صفحة " + page;
  }
  if(surah >= 1 && name) return name + " — صفحة " + page;
  if(surah >= 1) return "سورة " + surah + " — صفحة " + page;
  return "صفحة " + page;
}

function loadBookmarksList(){
  var list = [];
  try{
    var raw = localStorage.getItem(BOOKMARKS_KEY);
    if(raw) list = JSON.parse(raw) || [];
  }catch(e){ list = []; }
  if(!Array.isArray(list)) list = [];

  /* ترحيل العلامة الفردية القديمة مرة واحدة فقط */
  var migrated = false;
  try{ migrated = localStorage.getItem("quranBookmarksMigrated") === "1"; }catch(e){}
  if(!list.length && !migrated){
    try{
      var one = localStorage.getItem("quranBookmark");
      if(one){
        var bm = JSON.parse(one);
        if(bm && Number(bm.page)) list.push(bm);
      }
    }catch(e){}
    try{
      if(!list.length){
        var legacy = Number(localStorage.getItem("quranSavedPage") || 0);
        if(legacy) list.push({ page: legacy, surah: 0, ayah: 0, t: Date.now() });
      }
    }catch(e){}
    try{
      localStorage.setItem("quranBookmarksMigrated", "1");
      if(list.length) localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    }catch(e){}
  }
  list = list.filter(function(b){ return b && Number(b.page) >= 1; });
  return (typeof sortBookmarksQuranOrder === "function") ? sortBookmarksQuranOrder(list) : list;
}

function saveBookmarksList(list){
  try{
    list = Array.isArray(list) ? list.slice(0, BOOKMARKS_MAX) : [];
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    if(list.length){
      localStorage.setItem("quranSavedPage", String(list[0].page));
      localStorage.setItem("quranBookmark", JSON.stringify(list[0]));
    }else{
      /* تفريغ كامل حتى لا تُستعاد آخر علامة بعد حذفها */
      localStorage.removeItem("quranSavedPage");
      localStorage.removeItem("quranBookmark");
    }
  }catch(e){}
}

function bookmarkKey(bm){
  return String(Number(bm.surah)||0) + ":" + String(Number(bm.ayah)||0) + ":" + String(Number(bm.page)||0);
}

function sortBookmarksQuranOrder(list){
  return (list || []).slice().sort(function(a, b){
    var sa = Number(a.surah) || 0, sb = Number(b.surah) || 0;
    if(sa !== sb){
      if(sa === 0) return 1;
      if(sb === 0) return -1;
      return sa - sb;
    }
    var aa = Number(a.ayah) || 0, ab = Number(b.ayah) || 0;
    if(aa !== ab){
      if(aa === 0) return 1;
      if(ab === 0) return -1;
      return aa - ab;
    }
    return (Number(a.page) || 0) - (Number(b.page) || 0);
  });
}

function saveAyahBookmark(){
  var bm = getCurrentBookmarkRef();
  var list = loadBookmarksList();
  var key = bookmarkKey(bm);
  list = list.filter(function(b){ return bookmarkKey(b) !== key; });
  list.push(bm);
  list = sortBookmarksQuranOrder(list);
  if(list.length > BOOKMARKS_MAX) list = list.slice(0, BOOKMARKS_MAX);
  saveBookmarksList(list);
  alert("تم الحفظ (" + list.length + "):\n" + formatBookmarkLabel(bm));
}

function openBookmark(bm){
  if(!bm || !Number(bm.page)) return;
  var page = Math.max(1, Math.min(604, Number(bm.page) || 1));
  var surah = Number(bm.surah) || 0;
  var ayah = Number(bm.ayah) || 0;
  closeBookmarksPicker();
  try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
  if(surah >= 1 && ayah >= 1 && typeof goToAyahFromSearch === "function"){
    try{ goToAyahFromSearch(page, surah, ayah); return; }catch(e){}
  }
  if(typeof loadPage === "function") loadPage(page);
}

function deleteBookmarkAt(index){
  var list = loadBookmarksList();
  if(index < 0 || index >= list.length) return;
  list.splice(index, 1);
  saveBookmarksList(list);
  buildBookmarksPickerList();
}

function buildBookmarksPickerList(){
  var box = document.getElementById("bookmarksPickerList");
  if(!box) return;
  var list = loadBookmarksList();
  box.innerHTML = "";
  if(!list.length){
    box.innerHTML = '<div style="text-align:center;color:#aaa;padding:24px 12px;line-height:1.8">لا توجد علامات محفوظة بعد.<br>استخدم «حفظ علامة مرجعية» أثناء التلاوة أو بعد اختيار آية.</div>';
    return;
  }
  list.forEach(function(bm, idx){
    var row = document.createElement("div");
    row.className = "bm-row";
    row.setAttribute("dir", "rtl");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bm-go";
    btn.textContent = formatBookmarkLabel(bm);
    btn.onclick = function(){ openBookmark(bm); };

    var del = document.createElement("button");
    del.type = "button";
    del.className = "bm-del";
    del.title = "حذف";
    del.setAttribute("aria-label", "حذف");
    del.textContent = "\u2715";
    del.onclick = function(e){
      e.preventDefault();
      e.stopPropagation();
      if(confirm("حذف هذه العلامة؟\n" + formatBookmarkLabel(bm))) deleteBookmarkAt(idx);
    };

    row.appendChild(btn);
    row.appendChild(del);
    box.appendChild(row);
  });
}

function openBookmarksPicker(){
  var ov = document.getElementById("bookmarksPickerOverlay");
  if(!ov) return;
  buildBookmarksPickerList();
  ov.classList.add("show");
  try{
    ov.style.setProperty("display", "flex", "important");
    ov.style.setProperty("z-index", "500", "important");
  }catch(e){}
  try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
}

function closeBookmarksPicker(){
  var ov = document.getElementById("bookmarksPickerOverlay");
  if(!ov) return;
  ov.classList.remove("show");
  try{ ov.removeAttribute("style"); }catch(e){}
}

function goToAyahBookmark(){
  openBookmarksPicker();
}

document.getElementById("saveButton").onclick = function(){
  saveAyahBookmark();
};

document.getElementById("bookmarkButton").onclick = function(){
  goToAyahBookmark();
};



/* =========================
   الوضع الليلي
========================= */

const nightButton = document.getElementById("nightButton");

function updateNightButton(){
  const isNight = document.body.classList.contains("night-mode");
  const nightLabel = nightButton.querySelector("span");
  if(nightLabel){
    nightLabel.textContent = isNight ? "☀️ الوضع النهاري" : "🌙 الوضع الليلي";
  }
  const nightToggle = document.getElementById("nightToggle");
  if(nightToggle) nightToggle.checked = isNight;
  nightButton.setAttribute("aria-label", isNight ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي");
}

nightButton.onclick = ()=>{
  const isNight = document.body.classList.toggle("night-mode");
  localStorage.setItem("quranNightMode", isNight ? "1" : "0");
  updateNightButton();
};

// استعادة الوضع المحفوظ عند فتح الصفحة
if(localStorage.getItem("quranNightMode") === "1") {
  document.body.classList.add("night-mode");
}
updateNightButton();


/* =========================
   التكبير والتصغير
========================= */

let pageScale = Number(localStorage.getItem("quranPageScale") || "1");
if(!Number.isFinite(pageScale)) pageScale = 1;
pageScale = Math.max(0.7, Math.min(2.2, pageScale));

function applyPageZoom(){
  if(!page) return;
  page.style.setProperty("--quran-page-scale", String(pageScale));
  page.style.setProperty("transform", `scale(${pageScale})`, "important");
  page.style.transformOrigin = "center center";
  page.style.transition = "transform .18s ease";
  page.style.willChange = "transform";
}

function changePageZoom(delta){
  pageScale = Math.max(0.7, Math.min(2.2, Math.round((pageScale + delta) * 100) / 100));
  localStorage.setItem("quranPageScale", String(pageScale));
  applyPageZoom();
}

const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const zoomResetButton = document.getElementById("zoomResetButton");

if(zoomInButton) zoomInButton.onclick = (e)=>{ e.preventDefault(); changePageZoom(0.15); };
if(zoomOutButton) zoomOutButton.onclick = (e)=>{ e.preventDefault(); changePageZoom(-0.15); };
if(zoomResetButton) zoomResetButton.onclick = (e)=>{
  e.preventDefault();
  pageScale = 1;
  localStorage.setItem("quranPageScale", "1");
  applyPageZoom();
};

applyPageZoom();


/* =====================================================
   السور
===================================================== */

const surahs = [

  ["الفاتحة",1],
  ["البقرة",2],
  ["آل عمران",50],
  ["النساء",77],
  ["المائدة",106],
  ["الأنعام",128],
  ["الأعراف",151],
  ["الأنفال",177],
  ["التوبة",187],
  ["يونس",208],
  ["هود",221],
  ["يوسف",235],
  ["الرعد",249],
  ["إبراهيم",255],
  ["الحجر",262],
  ["النحل",267],
  ["الإسراء",282],
  ["الكهف",293],
  ["مريم",305],
  ["طه",312],
  ["الأنبياء",322],
  ["الحج",332],
  ["المؤمنون",342],
  ["النور",350],
  ["الفرقان",359],
  ["الشعراء",367],
  ["النمل",377],
  ["القصص",385],
  ["العنكبوت",396],
  ["الروم",404],
  ["لقمان",411],
  ["السجدة",415],
  ["الأحزاب",418],
  ["سبأ",428],
  ["فاطر",434],
  ["يس",440],
  ["الصافات",446],
  ["ص",453],
  ["الزمر",458],
  ["غافر",467],
  ["فصلت",477],
  ["الشورى",483],
  ["الزخرف",489],
  ["الدخان",496],
  ["الجاثية",499],
  ["الأحقاف",502],
  ["محمد",507],
  ["الفتح",511],
  ["الحجرات",515],
  ["ق",518],
  ["الذاريات",520],
  ["الطور",523],
  ["النجم",526],
  ["القمر",528],
  ["الرحمن",531],
  ["الواقعة",534],
  ["الحديد",537],
  ["المجادلة",542],
  ["الحشر",545],
  ["الممتحنة",549],
  ["الصف",551],
  ["الجمعة",553],
  ["المنافقون",554],
  ["التغابن",556],
  ["الطلاق",558],
  ["التحريم",560],
  ["الملك",562],
  ["القلم",564],
  ["الحاقة",566],
  ["المعارج",568],
  ["نوح",570],
  ["الجن",572],
  ["المزمل",574],
  ["المدثر",575],
  ["القيامة",577],
  ["الإنسان",578],
  ["المرسلات",580],
  ["النبأ",582],
  ["النازعات",583],
  ["عبس",585],
  ["التكوير",586],
  ["الانفطار",587],
  ["المطففين",587],
  ["الانشقاق",589],
  ["البروج",590],
  ["الطارق",591],
  ["الأعلى",591],
  ["الغاشية",592],
  ["الفجر",593],
  ["البلد",594],
  ["الشمس",595],
  ["الليل",595],
  ["الضحى",596],
  ["الشرح",596],
  ["التين",597],
  ["العلق",597],
  ["القدر",598],
  ["البينة",598],
  ["الزلزلة",599],
  ["العاديات",599],
  ["القارعة",600],
  ["التكاثر",600],
  ["العصر",601],
  ["الهمزة",601],
  ["الفيل",601],
  ["قريش",602],
  ["الماعون",602],
  ["الكوثر",602],
  ["الكافرون",603],
  ["النصر",603],
  ["المسد",603],
  ["الإخلاص",604],
  ["الفلق",604],
  ["الناس",604]

];



/* === تحديث معلومات المصحف: الجزء والسورة ورقم الصفحة === */
const pageBottomInfoEl = document.getElementById("pageBottomInfo");

function getJuzNameForPage(pageNumber){
  const p = Number(pageNumber);
  if(!Array.isArray(juz) || !juz.length) return "";
  let current = juz[0];
  for(const item of juz){
    if(p >= Number(item[1])) current = item;
    else break;
  }
  return current ? current[0] : "";
}

function getSurahNameForPage(pageNumber){
  const p = Number(pageNumber);
  if(!Array.isArray(surahs) || !surahs.length) return "";
  let current = surahs[0];
  for(const item of surahs){
    if(p >= Number(item[1])) current = item;
    else break;
  }
  return current ? "سورة " + current[0] : "";
}

function updateMushafPageInfo(){
  const p = Number(currentPage) || 1;
  if(pageBottomInfoEl) pageBottomInfoEl.textContent = p;
}


/* بناء قائمة السور */

function buildSurahList(){

  surahList.innerHTML = "";

  surahs.forEach(
    (surah,index)=>{

      const button =
        document.createElement(
          "button"
        );

      button.className =
        "popup-item";

      button.innerHTML =
        "سورة " +
        surah[0] +
        " <small>— الصفحة " +
        surah[1] +
        "</small>";

      button.onclick = ()=>{

        /* تحديد رقم السورة صراحةً حتى تعمل السور القصيرة
           المشتركة في نفس الصفحة (مثل الإخلاص/الفلق/الناس) */
        loadPage(
          surah[1],
          {
            surahNumber: index + 1
          }
        );

        surahOverlay.classList.remove(
          "show"
        );

      };

      surahList.appendChild(
        button
      );

    }
  );

}


/* فتح السور */

document.getElementById(
  "surahsButton"
).onclick = ()=>{

  closeSideMenu();

  buildSurahList();

  surahOverlay.classList.add(
    "show"
  );

};


/* إغلاق السور */

surahClose.onclick = ()=>{

  surahOverlay.classList.remove(
    "show"
  );

};

surahOverlay.onclick = e=>{

  if(e.target === surahOverlay){

    surahOverlay.classList.remove(
      "show"
    );

  }

};


/* =====================================================
   الأجزاء الثلاثون
===================================================== */

const juz = [

  ["الجزء الأول",2],
  ["الجزء الثاني",22],
  ["الجزء الثالث",42],
  ["الجزء الرابع",62],
  ["الجزء الخامس",82],
  ["الجزء السادس",102],
  ["الجزء السابع",122],
  ["الجزء الثامن",142],
  ["الجزء التاسع",162],
  ["الجزء العاشر",182],
  ["الجزء الحادي عشر",202],
  ["الجزء الثاني عشر",222],
  ["الجزء الثالث عشر",242],
  ["الجزء الرابع عشر",262],
  ["الجزء الخامس عشر",282],
  ["الجزء السادس عشر",302],
  ["الجزء السابع عشر",322],
  ["الجزء الثامن عشر",342],
  ["الجزء التاسع عشر",362],
  ["الجزء العشرون",382],
  ["الجزء الحادي والعشرون",402],
  ["الجزء الثاني والعشرون",422],
  ["الجزء الثالث والعشرون",442],
  ["الجزء الرابع والعشرون",462],
  ["الجزء الخامس والعشرون",482],
  ["الجزء السادس والعشرون",502],
  ["الجزء السابع والعشرون",522],
  ["الجزء الثامن والعشرون",542],
  ["الجزء التاسع والعشرون",562],
  ["الجزء الثلاثون",582]

];

/* بناء قائمة الأجزاء */

function buildJuzList(){

  juzList.innerHTML = "";

  juz.forEach(
    item=>{

      const button =
        document.createElement(
          "button"
        );

      button.className =
        "popup-item";

      button.innerHTML =
        item[0] +
        " <small>— الصفحة " +
        item[1] +
        "</small>";

      button.onclick = ()=>{

        /* انتقال الجزء مستقل تماماً عن انتقال السور.
           نلغي أي تزامن قديم للصوت/التظليل حتى لا يعيد الصفحة السابقة،
           ثم نرسل صفحة بداية الجزء فقط إلى المسار الطبيعي لتحميل المصحف. */
        const juzPage = Number(item[1]);
        if(!Number.isFinite(juzPage) || juzPage < 1 || juzPage > TOTAL_PAGES) return;

        /* إبطال أي عمليات صوتية/تظليل معلقة من الصفحة السابقة */
        if(typeof audioPageToken !== "undefined") audioPageToken++;
        if(typeof currentTiming !== "undefined") currentTiming = [];
        if(typeof pageHitTiming !== "undefined") pageHitTiming = [];
        if(typeof timingSurahLoaded !== "undefined") timingSurahLoaded = 0;
        if(typeof audio !== "undefined" && audio){
          try{ audio.pause(); }catch(e){}
        }

        if(typeof prefetchQuranPage === "function") {
          prefetchQuranPage(juzPage);
        }

        /* الجزء = صفحة فقط، بدون surahNumber أو startAyah.
           وعند الانتقال من قائمة الأجزاء يبدأ تشغيل التلاوة تلقائياً
           من موضع الصفحة الجديدة، دون استخدام منطق السور. */
        loadPage(juzPage,{ autoContinue: true });

        juzOverlay.classList.remove(
          "show"
        );

      };

      juzList.appendChild(
        button
      );

    }
  );

}



/* فتح الأجزاء */

document.getElementById(
  "juzButton"
).onclick = ()=>{

  closeSideMenu();

  buildJuzList();

  juzOverlay.classList.add(
    "show"
  );

};


/* إغلاق الأجزاء */

juzClose.onclick = ()=>{

  juzOverlay.classList.remove(
    "show"
  );

};

juzOverlay.onclick = e=>{

  if(e.target === juzOverlay){

    juzOverlay.classList.remove(
      "show"
    );

  }

};


/* =====================================================
   حول
===================================================== */

telegramContactButton.onclick = ()=>{
  window.location.href = "https://t.me/Abuislem";
};

aboutButton.onclick = ()=>{

  closeSideMenu();

  aboutOverlay.classList.add("show");
  try{
    if(typeof window.__ayaRefreshAboutStorage === "function"){
      window.__ayaRefreshAboutStorage();
    }
  }catch(e){}

};

aboutClose.onclick = ()=>{

  aboutOverlay.classList.remove("show");

};

aboutOverlay.onclick = e=>{

  if(e.target === aboutOverlay){

    aboutOverlay.classList.remove("show");

  }

};

/* سياسة الخصوصية */
(function(){
  var privacyBtn = document.getElementById("privacyButton");
  var privacyOv = document.getElementById("privacyOverlay");
  var privacyClose = document.getElementById("privacyClose");
  function openPrivacy(){
    try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
    if(privacyOv) privacyOv.classList.add("show");
  }
  function closePrivacy(){
    if(privacyOv) privacyOv.classList.remove("show");
  }
  if(privacyBtn) privacyBtn.onclick = openPrivacy;
  if(privacyClose) privacyClose.onclick = closePrivacy;
  if(privacyOv) privacyOv.addEventListener("click", function(e){
    if(e.target === privacyOv) closePrivacy();
  });
})();


/* =====================================================
   البحث
===================================================== */

const searchOverlay =
  document.getElementById("searchOverlay");

const searchClose =
  document.getElementById("searchClose");

const searchForm =
  document.getElementById("searchForm");

const searchInput =
  document.getElementById("searchInput");

const searchResults =
  document.getElementById("searchResults");

function normalizeArabic(text){

  return String(text || "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

}

function openSearch(){

  closeSideMenu();

  searchOverlay.classList.add("show");

  if(searchResults && !searchResults.children.length){
    searchResults.innerHTML = "";
  }

  setTimeout(() => {
    try{ searchInput.focus(); }catch(e){}
  }, 80);

}

function closeSearch(){

  searchOverlay.classList.remove("show");
  /* مسح نص البحث والنتائج عند الإغلاق بزر ✕ */
  try{
    if(searchInput) searchInput.value = "";
    if(searchResults) searchResults.innerHTML = "";
  }catch(e){}

}

document.getElementById(
  "searchButton"
).onclick = openSearch;

searchClose.onclick = closeSearch;

/* لا تُغلق نافذة البحث بالضغط على الخلفية —
   تبقى مفتوحة لاختيار نتيجة أخرى، وتُغلق فقط من زر ✕ */
searchOverlay.onclick = e => {
  /* تجاهل الإغلاق التلقائي من الخلفية */
};

/* رمز لإلغاء طلبات الانتقال القديمة عند اختيار نتيجة بحث أخرى بسرعة */
let searchNavigateToken = 0;

/*
  الانتقال الدقيق من نتيجة البحث إلى آية محددة:
  1) تحديد الصفحة بدقة (من الـ API ثم من التوقيت إن لزم)
  2) تحميل صورة الصفحة
  3) جلب توقيت السورة وإيجاد الآية بنفس رقمها
  4) التظليل + التشغيل من بداية الآية مباشرة
*/
async function goToAyahFromSearch(pageNumber, surahNumber, ayahNumber){
  const token = ++searchNavigateToken;
  const surah = Number(surahNumber);
  const ayah = Number(ayahNumber);
  let pageNum = Math.max(1, Math.min(TOTAL_PAGES, Number(pageNumber) || 1));

  /* تبقى نافذة البحث مفتوحة ليختار المستخدم نتيجة أخرى إن أراد */

  if(!Number.isFinite(ayah) || ayah < 1 || !Number.isFinite(surah) || surah < 1){
    loadPage(pageNum);
    return;
  }

  if(audio){
    try{ audio.pause(); }catch(e){}
  }
  if(typeof resetRepeat === "function") resetRepeat();
  if(typeof clearAyahHighlight === "function") clearAyahHighlight();

  let items = [];
  try{
    items = await fetchTimingForSurah(surah);
  }catch(e){}

  if(token !== searchNavigateToken) return;

  if(!items || !items.length){
    try{
      await new Promise(r=>setTimeout(r, 400));
      items = await fetchTimingForSurah(surah);
    }catch(e){}
  }

  if(token !== searchNavigateToken) return;

  let match = (items || []).find(item =>
    Number(item.ayah) === ayah &&
    (item._surah == null || Number(item._surah) === surah)
  );

  if(match){
    const timingPage = pageFromTiming(match, surah);
    if(timingPage && timingPage >= 1 && timingPage <= TOTAL_PAGES){
      pageNum = timingPage;
    }
  }

  /* تحميل الصفحة عبر المسار الرسمي لضمان التزامن */
  if(typeof loadPage === "function"){
    loadPage(pageNum, { surahNumber: surah, autoContinue: false });
  }else{
    currentPage = pageNum;
    localStorage.setItem("quranPage", currentPage);
    if(typeof updateMushafPageInfo === "function") updateMushafPageInfo();
    loadQuranPageFromInternet(currentPage);
  }

  await new Promise(resolve=>{
    const img = document.getElementById("quranPage");
    if(img && img.complete && img.naturalWidth > 0){
      resolve();
      return;
    }
    const done = ()=>resolve();
    if(img) img.addEventListener("load", done, {once:true});
    setTimeout(done, 1200);
  });

  if(token !== searchNavigateToken) return;

  /* إعادة جلب التوقيت بعد تحميل الصفحة لضمان التطابق مع القارئ الحالي */
  try{
    items = await fetchTimingForSurah(surah);
  }catch(e){}
  match = (items || []).find(item =>
    Number(item.ayah) === ayah &&
    (item._surah == null || Number(item._surah) === surah)
  );

  if(!match){
    if(typeof loadPage === "function"){
      loadPage(pageNum, { surahNumber: surah, autoContinue: true });
    }
    return;
  }

  currentTiming = tagTimingItems(
    timingCache[selectedReader + ":" + surah] || items,
    surah
  );
  timingSurahLoaded = surah;
  currentAudioSurah = surah;

  if(typeof positionHighlightLayer === "function"){
    positionHighlightLayer();
  }

  const seekOk = seekToAyahItem(match, { autoPlay: true });

  if(typeof drawAyahHighlight === "function"){
    requestAnimationFrame(()=>{
      if(token !== searchNavigateToken) return;
      drawAyahHighlight(match);
    });
  }

  /* محاولات إضافية لاستقرار التشغيل والتمييز */
  [300, 700, 1200].forEach(function(ms){
    setTimeout(function(){
      if(token !== searchNavigateToken) return;
      if(typeof positionHighlightLayer === "function") positionHighlightLayer();
      if(typeof drawAyahHighlight === "function") drawAyahHighlight(match);
      if(typeof syncHighlight === "function") syncHighlight();
      if(seekOk === false){
        try{ seekToAyahItem(match, { autoPlay: true }); }catch(e){}
      }
    }, ms);
  });
}

function addSearchResult(title, meta, text, targetPage, surahNumber, ayahNumber){

  const button =
    document.createElement("button");

  button.className = "popup-item search-result";
  if(surahNumber && ayahNumber){
    button.setAttribute("data-ayah-key", String(surahNumber) + ":" + String(ayahNumber));
  }

  button.innerHTML =
    '<span class="search-result-title">' +
    title +
    '</span>' +
    '<span class="search-result-meta">' +
    meta +
    '</span>' +
    (text ?
      '<span class="search-result-text">' +
      text +
      '</span>' : '');

  button.onclick = () => {
    try{
      Array.prototype.forEach.call(
        searchResults.querySelectorAll(".search-result"),
        function(el){ el.classList.remove("glass-selected"); el.style.outline = ""; }
      );
      button.classList.add("glass-selected");
      button.style.outline = "2px solid rgba(121,214,154,.7)";
    }catch(e){}
    const s = Number(surahNumber);
    const a = Number(ayahNumber);
    if(Number.isFinite(s) && s >= 1 && Number.isFinite(a) && a >= 1){
      goToAyahFromSearch(targetPage, s, a);
    }else{
      loadPage(targetPage);
      /* لا نغلق البحث — يبقى لاختيار نتيجة أخرى */
    }
  };

  searchResults.appendChild(button);

}

function searchLocal(query){

  const q =
    normalizeArabic(query);

  const numeric =
    Number(q);

  if(/^\d+$/.test(q) &&
     numeric >= 1 &&
     numeric <= TOTAL_PAGES){

    addSearchResult(
      "الصفحة " + numeric,
      "الانتقال مباشرة إلى الصفحة",
      "",
      numeric
    );

  }

  /*
    مطابقة أسماء السور بدقة:
    - تطابق كامل أولاً
    - ثم بداية الاسم
    - للكلمات القصيرة (≤2) لا نستخدم includes حتى لا يطابق «عم» داخل «عمران»
    - أسماء شائعة: عم → النبأ، ص/ق/يس/طه كما هي
  */
  const SURAH_ALIASES = {
    "عم": "النبا",
    "عم يتساءلون": "النبا",
    "الملك": "الملك",
    "تبارك": "الملك",
    "يس": "يس",
    "ياسين": "يس",
    "طه": "طه",
    "ص": "ص",
    "ق": "ق",
    "حم": null /* لا نربط حم بسورة واحدة؛ تُعالَج كبحث كلمة كاملة فقط */
  };

  function surahMatchScore(nameNorm, qStr){
    if(!nameNorm || !qStr) return 0;
    /* تطابق كامل فقط (مع أو بدون ال) */
    if(nameNorm === qStr) return 100;
    const bare = nameNorm.replace(/^ال/, "");
    const qBare = qStr.replace(/^ال/, "");
    if(bare === qBare && qBare.length > 0) return 95;
    /*
      المطابقة الحرفية فقط:
      - لا نطابق جزءاً من اسم السورة.
      - «عمر» لا يطابق «عمران».
      - يبقى التطبيع العربي (إ/أ/آ/ى/ة والتشكيل) معمولاً به.
    */
    return 0;
  }

  const scored = [];
  const seenNums = new Set();

  /* أسماء مستعارة شائعة */
  const aliasTarget = SURAH_ALIASES[q];
  if(aliasTarget){
    surahs.forEach(function(item, idx){
      const nNorm = normalizeArabic(item[0]);
      if(nNorm === aliasTarget || nNorm.replace(/^ال/, "") === aliasTarget.replace(/^ال/, "")){
        scored.push({ item: item, num: idx + 1, score: 110 });
        seenNums.add(idx + 1);
      }
    });
  }

  surahs.forEach(function(item, idx){
    const num = idx + 1;
    if(seenNums.has(num)) return;
    if(String(num) === q){
      scored.push({ item: item, num: num, score: 120 });
      seenNums.add(num);
      return;
    }
    const score = surahMatchScore(normalizeArabic(item[0]), q);
    if(score > 0){
      scored.push({ item: item, num: num, score: score });
      seenNums.add(num);
    }
  });

  scored.sort(function(a, b){ return b.score - a.score; });

  scored.forEach(function(entry){
    addSearchResult(
      "سورة " + entry.item[0],
      "بداية السورة — الصفحة " + entry.item[1],
      "",
      entry.item[1],
      entry.num,
      1
    );
  });

  /*
    جلب كل آيات السورة فقط عند تطابق اسمها الحقيقي
    (مثل «الناس» أو «النبأ» أو «ناس»)، وليس عند الاسم المستعار («عم»).
    score 110 = اسم مستعار → لا تُجلب كل الآيات.
  */
  const exactSurahs = scored
    .filter(function(e){ return e.score >= 95 && e.score !== 110; })
    .map(function(e){ return e.num; });

  return {
    hasLocal: scored.length > 0 || (/^\d+$/.test(q) && numeric >= 1 && numeric <= TOTAL_PAGES),
    exactSurahs: exactSurahs
  };

}

async function searchWord(query){

  /* أبقِ نتائج السور/الصفحات الظاهرة، وأضف حالة التحميل تحتها */
  const loading = document.createElement("div");
  loading.className = "search-status";
  loading.id = "searchWordLoading";
  loading.textContent = "جاري البحث في آيات القرآن…";
  searchResults.appendChild(loading);

  const qNorm = normalizeArabic(query);

  function localSurahName(surahNumber){
    const n = Number(surahNumber);
    if(typeof surahs !== "undefined" && Array.isArray(surahs) && surahs[n - 1]){
      return surahs[n - 1][0];
    }
    return "سورة " + n;
  }

  function localSurahStartPage(surahNumber){
    const n = Number(surahNumber);
    if(typeof surahs !== "undefined" && Array.isArray(surahs) && surahs[n - 1]){
      return Number(surahs[n - 1][1]) || 0;
    }
    return 0;
  }

  /*
    البحث بكلمة/عبارة كاملة فقط:
    - «عمر» يطابق «عمر» فقط، ولا يطابق «عمران».
    - لا يوجد أي بحث عن جزء داخل الكلمة.
    - إذا كان البحث عدة كلمات، يجب أن تظهر العبارة كاملة وبنفس الترتيب.
    - التطبيع العربي يستمر كما هو، لذلك «ادم» يطابق «آدم».
  */
  function rankMatch(text){
    const t = normalizeArabic(text);
    if(!t || !qNorm) return 0;

    const escaped = qNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exactPattern = new RegExp(
      "(^|\\s)" + escaped + "(?=\\s|$)"
    );

    return exactPattern.test(t) ? 3 : 0;
  }

  /*
    مصدر أساسي: AlQuran Cloud (نص عربي بدون تشكيل = نتائج أدق للكلمات)
    https://api.alquran.cloud/v1/search/{word}/all/quran-simple-clean
  */
  /* استبعاد نتائج البسملة من البحث */
  function isBasmalaSearchResult(text, surahNumber, ayahNumber){
    const t = normalizeArabic(String(text || ""))
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ـ/g, "")
      .replace(/\s+/g, " ")
      .trim();
    // بسملة الفاتحة (1:1) آية حقيقية، لذلك تبقى في نتائج البحث.
    if(surahNumber === 1 && ayahNumber === 1) return false;
    /* البسملة الخاصة ببداية السور تُستبعد، لكن بسملة الفاتحة 1:1 تبقى.
       نتحقق من بداية النص أيضاً لأن بعض مصادر البحث تُرجع البسملة
       ملحقة بأول آية من السورة بدلاً من إرجاعها كسطر مستقل. */
    if(ayahNumber === 1 && surahNumber !== 1){
      return /^بسم الله الرحمن الرحيم(?:\s|[.،؛;:!؟]|$)/i.test(t);
    }
    return /^بسم الله الرحمن الرحيم[.،؛;:!؟]?$/i.test(t);
  }

  async function searchAlQuranCloud(){
    /* جرّب النص الأصلي ثم المطبّع، ثم نتحقق محلياً من تطابق الكلمة/العبارة كاملة */
    const queries = [query];
    if(qNorm && qNorm !== normalizeArabic(query) || qNorm !== query){
      if(queries.indexOf(qNorm) < 0) queries.push(qNorm);
    }
    /* أزل التطويل والهمزات الزائدة لصيغة ثالثة */
    const q2 = qNorm.replace(/ا/g, "ا").replace(/ـ/g, "");
    if(q2 && queries.indexOf(q2) < 0) queries.push(q2);

    const all = [];
    for(let qi = 0; qi < queries.length; qi++){
      const qTry = queries[qi];
      if(!qTry) continue;
      try{
        const url =
          "https://api.alquran.cloud/v1/search/" +
          encodeURIComponent(qTry) +
          "/all/quran-simple-clean";
        const response = await fetch(url, {
          method: "GET",
          headers: { "Accept": "application/json" }
        });
        if(!response.ok) continue;
        const json = await response.json();
        const raw =
          json && json.data && Array.isArray(json.data.matches)
            ? json.data.matches
            : [];
        raw.forEach(function(item){
          const surahNumber = Number(item.surah && item.surah.number);
          const ayahNumber = Number(item.numberInSurah || 0);
          const text = String(item.text || "").replace(/^\uFEFF/, "").trim();
          if(surahNumber >= 1 && ayahNumber >= 1 && !isBasmalaSearchResult(text, surahNumber, ayahNumber)){
            all.push({
              verseKey: surahNumber + ":" + ayahNumber,
              surahNumber: surahNumber,
              ayahNumber: ayahNumber,
              text: text,
              surahName: localSurahName(surahNumber),
              page: 0,
              rank: rankMatch(text)
            });
          }
        });
      }catch(e){}
    }
    if(!all.length) throw new Error("AlQuran search failed");
    return all.filter(function(item){ return item.rank > 0; });
  }

  /* احتياطي: QuranHub إن فشل المصدر الأساسي */
  async function searchQuranHubFallback(){
    const url =
      "https://api.quranhub.com/v1/search/" +
      encodeURIComponent(query) +
      "?language=ar";

    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if(!response.ok) throw new Error("QuranHub search failed");

    const json = await response.json();
    const raw =
      json && json.data && Array.isArray(json.data.ayahs)
        ? json.data.ayahs
        : (
            json && json.data && Array.isArray(json.data.results)
              ? json.data.results
              : []
          );

    return raw.map(item=>{
      let surahNumber = item.surah && Number(item.surah.number);
      let ayahNumber = Number(item.numberInSurah || item.ayah || 0);
      let verseKey = item.verse_key || "";
      if(!surahNumber && verseKey){
        const parts = String(verseKey).split(":");
        surahNumber = Number(parts[0]);
        ayahNumber = Number(parts[1]);
      }
      if(!verseKey && surahNumber && ayahNumber){
        verseKey = surahNumber + ":" + ayahNumber;
      }
      const text = String(item.text || item.name || "").trim();
      return {
        verseKey,
        surahNumber,
        ayahNumber,
        text,
        surahName: localSurahName(surahNumber),
        page: Number(item.page || 0),
        rank: rankMatch(text)
      };
    }).filter(item =>
      item.surahNumber >= 1 &&
      item.ayahNumber >= 1 &&
      !isBasmalaSearchResult(item.text, item.surahNumber, item.ayahNumber) &&
      (item.rank > 0 || !qNorm)
    );
  }

  /* جلب رقم الصفحة الرسمي للآية من AlQuran Cloud */
  async function fetchAyahPage(surahNumber, ayahNumber){
    try{
      const url =
        "https://api.alquran.cloud/v1/ayah/" +
        encodeURIComponent(surahNumber + ":" + ayahNumber);
      const response = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if(!response.ok) return 0;
      const json = await response.json();
      return Number(json && json.data && json.data.page) || 0;
    }catch(e){
      return 0;
    }
  }

  try{
    let matches = [];
    try{
      matches = await searchAlQuranCloud();
    }catch(e1){
      matches = await searchQuranHubFallback();
    }

    if(!matches.length){
      const ld = document.getElementById("searchWordLoading");
      if(ld) ld.remove();
      if(!searchResults.querySelector(".search-result")){
        searchResults.innerHTML =
          '<div class="search-status">' +
          'لم يتم العثور على نتائج للكلمة التي كتبتها.' +
          '</div>';
      }else{
        const note = document.createElement("div");
        note.className = "search-status";
        note.textContent = "لا توجد آيات إضافية تحتوي هذه الكلمة.";
        searchResults.appendChild(note);
      }
      return;
    }

    /* إزالة التكرار حسب السورة:الآية */
    const seen = new Set();
    matches = matches.filter(m=>{
      const key = m.surahNumber + ":" + m.ayahNumber;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    /* الأدق أولاً */
    matches.sort((a, b)=>{
      if(b.rank !== a.rank) return b.rank - a.rank;
      if(a.surahNumber !== b.surahNumber) return a.surahNumber - b.surahNumber;
      return a.ayahNumber - b.ayahNumber;
    });

    const ld2 = document.getElementById("searchWordLoading");
    if(ld2) ld2.textContent = "جاري تجهيز نتائج الآيات…";

    const top = matches;

    /* جلب أرقام الصفحات دفعة واحدة */
    const withPages = await Promise.all(
      top.map(async m=>{
        let page = Number(m.page) || 0;
        if(!page){
          page = await fetchAyahPage(m.surahNumber, m.ayahNumber);
        }
        if(!page){
          page = localSurahStartPage(m.surahNumber);
        }
        return Object.assign({}, m, { page });
      })
    );

    const ld3 = document.getElementById("searchWordLoading");
    if(ld3) ld3.remove();
    /* أزل رسائل الحالة القديمة فقط، واحتفظ بنتائج السور */
    Array.prototype.slice.call(searchResults.querySelectorAll(".search-status")).forEach(function(el){ el.remove(); });

    withPages.forEach(match=>{
      const pageNumber = Number(match.page);
      if(!pageNumber) return;

      addSearchResult(
        "سورة " + match.surahName,
        "الآية " + match.ayahNumber + " — الصفحة " + pageNumber,
        match.text || "",
        pageNumber,
        match.surahNumber,
        match.ayahNumber
      );
    });

    if(!searchResults.children.length){
      searchResults.innerHTML =
        '<div class="search-status">' +
        'تم العثور على النتائج ولكن تعذر تحديد صفحاتها.' +
        '</div>';
    }

  }catch(error){
    const ld4 = document.getElementById("searchWordLoading");
    if(ld4) ld4.remove();
    const note = document.createElement("div");
    note.className = "search-status";
    note.textContent = "تعذر الاتصال بخدمة البحث حالياً. تأكد من الإنترنت ثم جرّب مرة أخرى.";
    searchResults.appendChild(note);
  }

}


/* جلب كل آيات سورة معيّنة (عند تطابق اسم السورة بالكامل مثل «الناس») */
async function fetchAllAyahsOfSurah(surahNumber){
  const n = Number(surahNumber);
  if(!n || n < 1 || n > 114) return [];
  try{
    const url = "https://api.alquran.cloud/v1/surah/" + n + "/quran-simple-clean";
    const response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
    if(!response.ok) return [];
    const json = await response.json();
    const ayahs = (json && json.data && Array.isArray(json.data.ayahs)) ? json.data.ayahs : [];
    const name = (typeof surahs !== "undefined" && surahs[n-1]) ? surahs[n-1][0] : ("سورة " + n);
    const startPage = (typeof surahs !== "undefined" && surahs[n-1]) ? Number(surahs[n-1][1]) || 0 : 0;
    return ayahs.map(function(a){
      return {
        surahNumber: n,
        ayahNumber: Number(a.numberInSurah || a.number || 0),
        text: String(a.text || "").trim(),
        surahName: name,
        page: Number(a.page || startPage) || startPage
      };
    }).filter(function(a){ return a.ayahNumber >= 1; });
  }catch(e){
    return [];
  }
}

function updateSearchResultCount(){
  if(!searchResults) return;
  const old = document.getElementById("searchResultCount");
  if(old) old.remove();
  const n = searchResults.querySelectorAll(".search-result").length;
  if(n <= 0) return;
  const el = document.createElement("div");
  el.id = "searchResultCount";
  el.className = "search-status";
  el.style.cssText = "font-weight:800;color:#79d69a;padding:8px 4px 4px;text-align:center";
  el.textContent = "عدد النتائج: " + n;
  searchResults.insertBefore(el, searchResults.firstChild);
}

searchForm.onsubmit = async e => {

  e.preventDefault();

  const query =
    searchInput.value.trim();

  if(!query){

    searchResults.innerHTML =
      '<div class="search-status">' +
      'اكتب كلمة أو اسم سورة أو رقم صفحة.' +
      '</div>';

    return;

  }

  /* ابدأ دائماً بقائمة نظيفة */
  searchResults.innerHTML = "";

  const qn = normalizeArabic(query);
  const isPageOnly = /^\d+$/.test(qn) && Number(qn) >= 1 && Number(qn) <= TOTAL_PAGES;

  /* نتائج محلية: رقم صفحة أو اسم سورة */
  const localInfo = searchLocal(query) || { hasLocal: false, exactSurahs: [] };

  /* رقم صفحة فقط: لا داعي لبحث الآيات */
  if(isPageOnly){
    updateSearchResultCount();
    return;
  }

  /* دائماً ابحث عن الآيات التي تحتوي الكلمة فقط
     (لا نجلب كل آيات السورة عند مطابقة اسمها — يكفي نتيجة «بداية السورة») */
  await searchWord(query);

  updateSearchResultCount();

};


/* =====================================================
   القراء
===================================================== */

document.getElementById(
  "recitersButton"
).onclick = ()=>{

  closeSideMenu();

  readerSelect.focus();

};


/* =====================================================
   بدء الموقع
===================================================== */

readerSelect.value = selectedReader;
updateReaderName();

if(!currentAudioSurah){
  currentAudioSurah =
    getSurahNumberForPage(currentPage);
}

loadPage(
  currentPage
);
