/* AYA_OFFLINE_DOWNLOADS_V1 */
(function(){
  const PAGE_CACHE = "aya-pages-v1";
  const AUDIO_CACHE = "aya-audio-v1";
  let cancelFlag = false;

  const popup = document.getElementById("downloadsPopup");
  const statusEl = document.getElementById("dlStatus");
  const progressEl = document.getElementById("dlProgress");
  const tabPages = document.getElementById("dlTabPages");
  const tabAudio = document.getElementById("dlTabAudio");
  const panelPages = document.getElementById("dlPanelPages");
  const panelAudio = document.getElementById("dlPanelAudio");

  function setStatus(msg){ if(statusEl) statusEl.textContent = msg; }
  function setProgress(done, total){
    if(!progressEl) return;
    progressEl.max = total || 100;
    progressEl.value = done || 0;
  }
  function openPopup(){
    if(!popup) return;
    try{ fillReciterAndSurahSelects(); }catch(e){}
    popup.classList.add("show");
    try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
  }
  function closePopup(){
    if(!popup) return;
    popup.classList.remove("show");
  }

  const btn = document.getElementById("downloadsButton");
  if(btn) btn.addEventListener("click", function(){ openPopup(); });
  const closeBtn = document.getElementById("downloadsClose");
  if(closeBtn) closeBtn.addEventListener("click", closePopup);
  if(popup) popup.addEventListener("click", function(e){ if(e.target === popup) closePopup(); });

  if(tabPages && tabAudio){
    tabPages.addEventListener("click", function(){
      panelPages.style.display = "";
      panelAudio.style.display = "none";
      tabPages.style.opacity = "1";
      tabAudio.style.opacity = ".75";
      if(popup) popup.classList.remove("audio-tab-active");
    });
    tabAudio.addEventListener("click", function(){
      panelPages.style.display = "none";
      panelAudio.style.display = "";
      tabPages.style.opacity = ".75";
      tabAudio.style.opacity = "1";
      if(popup) popup.classList.add("audio-tab-active");
      try{ fillReciterAndSurahSelects(); }catch(e){}
    });
  }

  var cancelEl = document.getElementById("dlCancel");
  if(cancelEl) cancelEl.addEventListener("click", function(){
    cancelFlag = true;
    setStatus("جاري الإيقاف…");
  });

  var clearEl = document.getElementById("dlClear");
  if(clearEl) clearEl.addEventListener("click", function(){
    /* إدارة مساحة أدق بدل المسح الكلي فقط */
    try{
      if(typeof window.__ayaOpenStorageManager === "function"){
        try{ closePopup(); }catch(e){}
        window.__ayaOpenStorageManager();
        return;
      }
    }catch(e){}
    (async function(){
      if(!confirm("مسح كل الصفحات والتلاوات المنزّلة؟")) return;
      try{
        await caches.delete(PAGE_CACHE);
        await caches.delete(AUDIO_CACHE);
        setStatus("تم مسح التنزيلات");
        setProgress(0, 100);
      }catch(e){ setStatus("تعذر المسح"); }
    })();
  });

  function juzPageRange(pageNumber){
    const starts = [1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582,605];
    const n = Number(pageNumber) || 1;
    let i = 0;
    for(let k=0;k<starts.length-1;k++){ if(n >= starts[k]) i = k; }
    return { from: starts[i], to: starts[i+1] - 1 };
  }

  function pagesForCurrentSurah(){
    const n = Number(typeof currentPage !== "undefined" ? currentPage : 1) || 1;
    if(typeof surahs === "undefined" || !Array.isArray(surahs)) return [n];
    let idx = 0;
    for(let i=0;i<surahs.length;i++){
      if(n >= Number(surahs[i][1])) idx = i;
      else break;
    }
    const start = Number(surahs[idx][1]);
    const end = (idx + 1 < surahs.length) ? Number(surahs[idx+1][1]) - 1 : 604;
    const list = [];
    for(let p=start;p<=end;p++) list.push(p);
    return list;
  }

  function surahsInJuz(pageNumber){
    const range = juzPageRange(pageNumber);
    const set = new Set();
    for(let p=range.from;p<=range.to;p++){
      if(typeof getSurahNumberForPage === "function") set.add(getSurahNumberForPage(p));
    }
    return Array.from(set).filter(Boolean).sort(function(a,b){ return a-b; });
  }

  async function cachePutUrl(cacheName, url){
    const cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if(hit) return "cached";

    /* CORS أولاً مع الاستفادة من كاش المتصفح لتسريع الإعادة */
    var res = null;
    try{
      res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
      if(!res || !res.ok) res = null;
    }catch(e){ res = null; }

    if(!res){
      try{
        res = await fetch(url, { mode: "cors", credentials: "omit", cache: "default" });
        if(!res || !res.ok) res = null;
      }catch(e){ res = null; }
    }

    if(!res){
      try{
        res = await fetch(url, { mode: "no-cors", credentials: "omit", cache: "default" });
      }catch(e2){
        throw new Error("fetch failed");
      }
    }

    if(res && (res.ok || res.type === "opaque" || res.type === "basic" || res.type === "cors")){
      try{
        await cache.put(url, res.clone ? res.clone() : res);
      }catch(e3){
        await cachePutViaXHR(cache, url);
      }
      return "ok";
    }
    throw new Error("bad response");
  }

  function cachePutViaXHR(cache, url){
    return new Promise(function(resolve, reject){
      try{
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.timeout = 120000;
        xhr.onload = function(){
          if(xhr.status >= 200 && xhr.status < 300){
            var resp = new Response(xhr.response, {
              status: 200,
              statusText: "OK",
              headers: { "Content-Type": xhr.getResponseHeader("Content-Type") || "application/octet-stream" }
            });
            cache.put(url, resp).then(function(){ resolve("xhr"); }).catch(reject);
          }else{
            reject(new Error("xhr " + xhr.status));
          }
        };
        xhr.onerror = function(){ reject(new Error("xhr error")); };
        xhr.ontimeout = function(){ reject(new Error("xhr timeout")); };
        xhr.send();
      }catch(e){ reject(e); }
    });
  }

  async function downloadList(urls, cacheName, label){
    cancelFlag = false;
    var done = 0;
    var ok = 0;
    var fail = 0;
    var total = urls.length;
    if(!total){
      setStatus("لا توجد ملفات للتنزيل");
      return;
    }
    /* تنزيل متوازٍ أسرع: عدة ملفات معاً */
    var CONCURRENCY = 6;
    setProgress(0, total);
    setStatus(label + ": بدء 0 / " + total + " (متوازٍ ×" + CONCURRENCY + ")");

    /* افتح الكاش مرة واحدة لجميع العمليات */
    var sharedCache = null;
    try{ sharedCache = await caches.open(cacheName); }catch(e){ sharedCache = null; }

    async function putOne(url){
      if(sharedCache){
        try{
          var hit = await sharedCache.match(url);
          if(hit) return "cached";
        }catch(e){}
      }
      return cachePutUrl(cacheName, url);
    }

    var index = 0;
    async function worker(){
      while(true){
        if(cancelFlag) return;
        var i = index++;
        if(i >= total) return;
        try{
          var result = await putOne(urls[i]);
          if(result) ok++;
          else fail++;
        }catch(e){
          fail++;
        }
        done++;
        setProgress(done, total);
        setStatus(label + ": " + done + " / " + total + " (نجاح " + ok + " · فشل " + fail + ")");
      }
    }

    var workers = [];
    var n = Math.min(CONCURRENCY, total);
    for(var w = 0; w < n; w++) workers.push(worker());
    await Promise.all(workers);

    if(cancelFlag){
      setStatus("تم الإيقاف — نجح " + ok + " / فشل " + fail + " من " + total);
    }else{
      setStatus("اكتمل " + label + ": نجاح " + ok + " · فشل " + fail + " من " + total);
    }
  }

  async function startPages(mode){
    const page = Number(typeof currentPage !== "undefined" ? currentPage : 1) || 1;
    var pages = [];
    if(mode === "all"){ for(var i=1;i<=604;i++) pages.push(i); }
    else if(mode === "juz"){
      var r = juzPageRange(page);
      for(var j=r.from;j<=r.to;j++) pages.push(j);
    } else { pages = pagesForCurrentSurah(); }
    var urls = pages.map(function(p){
      if(typeof quranPageSvgUrl === "function") return quranPageSvgUrl(p);
      return "https://www.mp3quran.net/api/quran_pages_svg/" + String(p).padStart(3,"0") + ".svg";
    });
    setStatus("بدء تنزيل الصفحات…");
    await downloadList(urls, PAGE_CACHE, "الصفحات");
  }

  function fillReciterAndSurahSelects(){
    var recSel = document.getElementById("dlReciterSelect");
    var startSel = document.getElementById("dlStartSurah");
    var endSel = document.getElementById("dlEndSurah");
    if(!recSel || !startSel || !endSel) return;

    /* القرّاء: من RECITERS أو من قائمة القارئ في المشغّل */
    var cur = "";
    try{ if(typeof selectedReader !== "undefined" && selectedReader) cur = selectedReader; }catch(e){}
    if(!cur){
      var rs = document.getElementById("readerSelect");
      if(rs) cur = rs.value || "";
    }
    recSel.innerHTML = "";
    var recitersObj = null;
    try{ if(typeof RECITERS !== "undefined") recitersObj = RECITERS; }catch(e){}
    if(recitersObj){
      Object.keys(recitersObj).forEach(function(key){
        var o = document.createElement("option");
        o.value = key;
        o.textContent = (recitersObj[key] && recitersObj[key].name) || key;
        if(key === cur) o.selected = true;
        recSel.appendChild(o);
      });
    }else{
      var mainReader = document.getElementById("readerSelect");
      if(mainReader){
        for(var i=0;i<mainReader.options.length;i++){
          var src = mainReader.options[i];
          var o = document.createElement("option");
          o.value = src.value;
          o.textContent = src.textContent;
          if(src.value === cur) o.selected = true;
          recSel.appendChild(o);
        }
      }
    }

    /* السور: من surahs أو من surahSelect */
    var surahArr = null;
    try{ if(typeof surahs !== "undefined" && Array.isArray(surahs)) surahArr = surahs; }catch(e){}
    function fillSurahSel(sel, defaultNum){
      sel.innerHTML = "";
      if(surahArr){
        for(var i=0;i<surahArr.length;i++){
          var o = document.createElement("option");
          o.value = String(i + 1);
          o.textContent = (i + 1) + ". " + (surahArr[i][0] || "");
          if(i + 1 === defaultNum) o.selected = true;
          sel.appendChild(o);
        }
      }else{
        var ss = document.getElementById("surahSelect");
        if(ss && ss.options.length > 1){
          for(var j=0;j<ss.options.length;j++){
            var src2 = ss.options[j];
            if(!src2.value) continue;
            var o2 = document.createElement("option");
            o2.value = src2.value;
            o2.textContent = src2.textContent;
            if(Number(src2.value) === defaultNum) o2.selected = true;
            sel.appendChild(o2);
          }
        }else{
          for(var k=1;k<=114;k++){
            var o3 = document.createElement("option");
            o3.value = String(k);
            o3.textContent = String(k);
            if(k === defaultNum) o3.selected = true;
            sel.appendChild(o3);
          }
        }
      }
    }
    fillSurahSel(startSel, 1);
    fillSurahSel(endSel, 114);
    syncDownloadGlassPickers();
  }

  function openDownloadPicker(overlayId){
    var ov = document.getElementById(overlayId);
    if(!ov) return;
    ov.classList.add("show");
    ov.setAttribute("aria-hidden","false");
  }

  function closeDownloadPicker(overlayId){
    var ov = document.getElementById(overlayId);
    if(!ov) return;
    ov.classList.remove("show");
    ov.setAttribute("aria-hidden","true");
  }

  function buildDownloadGlassPicker(selectId, overlayId, listId, labelId){
    var sel = document.getElementById(selectId);
    var list = document.getElementById(listId);
    var label = document.getElementById(labelId);
    var btn = document.querySelector('[data-dl-select="' + selectId + '"]');
    if(!sel || !list || !label) return;

    list.innerHTML = "";
    Array.from(sel.options).forEach(function(opt){
      if(!opt.value) return;
      var item = document.createElement("button");
      item.type = "button";
      item.className = "download-picker-item" + (String(opt.value) === String(sel.value) ? " selected" : "");
      var text = document.createElement("span");
      text.textContent = (opt.textContent || "").trim();
      var radio = document.createElement("span");
      radio.className = "download-picker-radio";
      item.appendChild(text);
      item.appendChild(radio);
      item.onclick = function(){
        sel.value = opt.value;
        try{ sel.dispatchEvent(new Event("change", {bubbles:true})); }catch(e){}
        label.textContent = (opt.textContent || "").trim();
        Array.from(list.querySelectorAll(".download-picker-item")).forEach(function(x){x.classList.remove("selected")});
        item.classList.add("selected");
        closeDownloadPicker(overlayId);
      };
      list.appendChild(item);
    });

    var selectedOpt = sel.options[sel.selectedIndex];
    label.textContent = selectedOpt ? (selectedOpt.textContent || "").trim() : "اختر";
  }

  function syncDownloadGlassPickers(){
    buildDownloadGlassPicker("dlReciterSelect","dlReciterPickerOverlay","dlReciterPickerList","dlReciterPickerLabel");
    buildDownloadGlassPicker("dlStartSurah","dlStartSurahPickerOverlay","dlStartSurahPickerList","dlStartSurahPickerLabel");
    buildDownloadGlassPicker("dlEndSurah","dlEndSurahPickerOverlay","dlEndSurahPickerList","dlEndSurahPickerLabel");
  }

  (function bindDownloadGlassPickers(){
    var pairs = [
      ["dlReciterPicker","dlReciterSelect","dlReciterPickerOverlay"],
      ["dlStartSurahPicker","dlStartSurah","dlStartSurahPickerOverlay"],
      ["dlEndSurahPicker","dlEndSurah","dlEndSurahPickerOverlay"]
    ];
    pairs.forEach(function(p){
      var btn = document.getElementById(p[0]);
      if(btn) btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        syncDownloadGlassPickers();
        openDownloadPicker(p[2]);
      });
      var sel = document.getElementById(p[1]);
      if(sel) sel.addEventListener("change", function(){ syncDownloadGlassPickers(); });
    });

    /* منع label من إعادة تفعيل select المخفي عند الضغط على الزر الزجاجي */
    document.addEventListener("click", function(e){
      var btn = e.target.closest && e.target.closest(".download-glass-picker");
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var map = {
        dlReciterPicker:["dlReciterSelect","dlReciterPickerOverlay","dlReciterPickerList","dlReciterPickerLabel"],
        dlStartSurahPicker:["dlStartSurah","dlStartSurahPickerOverlay","dlStartSurahPickerList","dlStartSurahPickerLabel"],
        dlEndSurahPicker:["dlEndSurah","dlEndSurahPickerOverlay","dlEndSurahPickerList","dlEndSurahPickerLabel"]
      };
      var cfg = map[btn.id];
      if(!cfg) return;
      buildDownloadGlassPicker(cfg[0],cfg[1],cfg[2],cfg[3]);
      openDownloadPicker(cfg[1]);
    }, true);

    document.querySelectorAll(".download-picker-overlay").forEach(function(ov){
      ov.addEventListener("click", function(e){
        if(e.target === ov) closeDownloadPicker(ov.id);
      });
    });
    document.querySelectorAll("[data-dl-picker-close]").forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        closeDownloadPicker(btn.getAttribute("data-dl-picker-close"));
      });
    });
  })();

  async function startAudioRange(readerKey, fromSurah, toSurah){
    if(!readerKey || typeof RECITERS === "undefined" || !RECITERS[readerKey]){
      setStatus("اختر قارئاً أولاً"); return;
    }
    fromSurah = Math.max(1, Math.min(114, Number(fromSurah) || 1));
    toSurah = Math.max(1, Math.min(114, Number(toSurah) || 114));
    if(fromSurah > toSurah){
      var tmp = fromSurah; fromSurah = toSurah; toSurah = tmp;
    }
    var page = Number(typeof currentPage !== "undefined" ? currentPage : 1) || 1;
    var surahsList = [];
    for(var s = fromSurah; s <= toSurah; s++) surahsList.push(s);
    var urls = surahsList.map(function(s){
      if(typeof getAudioUrl === "function") return getAudioUrl(readerKey, page, s);
      return RECITERS[readerKey].server + String(s).padStart(3,"0") + ".mp3";
    }).filter(Boolean);
    var readerName = (RECITERS[readerKey] && RECITERS[readerKey].name) || readerKey;
    setStatus("تنزيل: " + readerName + " (" + fromSurah + " ← " + toSurah + ")");
    await downloadList(urls, AUDIO_CACHE, "تلاوات " + readerName);
  }

  async function startAudio(mode){
    var readerKey = (document.getElementById("dlReciterSelect") || {}).value
      || ((typeof selectedReader !== "undefined" && selectedReader) ? selectedReader : null);
    var page = Number(typeof currentPage !== "undefined" ? currentPage : 1) || 1;
    if(mode === "current"){
      var s = Number(typeof currentAudioSurah !== "undefined" && currentAudioSurah
        ? currentAudioSurah
        : (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(page) : 1)) || 1;
      await startAudioRange(readerKey, s, s);
      return;
    }
    var fromS = Number((document.getElementById("dlStartSurah") || {}).value) || 1;
    var toS = Number((document.getElementById("dlEndSurah") || {}).value) || 114;
    await startAudioRange(readerKey, fromS, toS);
  }

  document.querySelectorAll("[data-dl-pages]").forEach(function(el){
    el.addEventListener("click", function(){ startPages(el.getAttribute("data-dl-pages")); });
  });
  document.querySelectorAll("[data-dl-audio]").forEach(function(el){
    el.addEventListener("click", function(){ startAudio(el.getAttribute("data-dl-audio")); });
  });
  var dlAudioStart = document.getElementById("dlAudioStart");
  if(dlAudioStart){
    dlAudioStart.addEventListener("click", function(){ startAudio("range"); });
  }



  async function blobUrlFromCache(cacheName, url){
    try{
      var cache = await caches.open(cacheName);
      var hit = await cache.match(url);
      if(!hit) return null;
      var blob = await hit.blob();
      return URL.createObjectURL(blob);
    }catch(e){ return null; }
  }

  if(typeof loadQuranPageFromInternet === "function"){
    var _orig = loadQuranPageFromInternet;
    window.loadQuranPageFromInternet = async function(pageNumber){
      try{
        var url = (typeof quranPageSvgUrl === "function") ? quranPageSvgUrl(pageNumber) : null;
        if(url && typeof page !== "undefined" && page){
          var local = await blobUrlFromCache(PAGE_CACHE, url);
          if(local){
            var token = ++pageSvgToken;
            if(typeof clearAyahHighlight === "function") clearAyahHighlight();
            page.src = local;
            try{
              if(typeof readPageSvgViewBox === "function"){
                var vb = await readPageSvgViewBox(url).catch(function(){ return null; });
                if(token === pageSvgToken && vb) pageSvgViewBox = vb;
              }
            }catch(e){}
            if(typeof positionHighlightLayer === "function") positionHighlightLayer();
            if(page.complete && typeof syncHighlight === "function") syncHighlight();
            return;
          }
        }
      }catch(e){}
      return _orig.apply(this, arguments);
    };
  }

  try{
    var audioEl = document.getElementById("audio");
    if(audioEl && !audioEl.__ayaPartialSrcHook){
      audioEl.__ayaPartialSrcHook = true;
      var desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
      if(desc && desc.set){
        Object.defineProperty(audioEl, "src", {
          configurable: true,
          enumerable: true,
          get: function(){ return desc.get.call(this); },
          set: function(v){
            var self = this;
            if(!v || String(v).indexOf("blob:") === 0){
              desc.set.call(self, v);
              return;
            }
            if(self.__ayaForceNet){
              try{ self.__ayaForceNet = false; }catch(e){}
              /* استعادة الوقت فقط إن طُلب صراحة (ترقية مقطع) — لا currentTime من سورة سابقة */
              var keepT = 0, keepPlay = false;
              try{
                keepT = Number(self.__ayaResumeAfterPartial) || 0;
                keepPlay = !!self.__ayaWantPlayAfterForce;
              }catch(e){}
              try{ self.__ayaResumeAfterPartial = 0; self.__ayaWantPlayAfterForce = false; }catch(e){}
              try{ desc.set.call(self, v); }catch(e){}
              if(keepT > 0.25){
                var restoreForce = function(){
                  try{ self.removeEventListener("loadedmetadata", restoreForce); }catch(e){}
                  try{ self.currentTime = keepT; }catch(e){}
                  if(keepPlay) try{ self.play().catch(function(){}); }catch(e){}
                };
                self.addEventListener("loadedmetadata", restoreForce);
                setTimeout(restoreForce, 80);
                setTimeout(restoreForce, 250);
              }
              return;
            }
            var offline = false;
            try{ offline = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}

            /*
              أونلاين (أول تشغيل أو بث عادي): ضع الشبكة فوراً.
              لا تنتظر IndexedDB ولا تستبدل المصدر لاحقاً — ذلك يسبب تقطيعاً.
            */
            if(!offline){
              try{ desc.set.call(self, v); }catch(e){}
              return;
            }

            /* أوفلاين فقط: فضّل المقطع المحلي */
            try{
              var curSrc = "";
              try{ curSrc = String(desc.get.call(self) || self.currentSrc || ""); }catch(e){}
              var maxSec = Number(self.__ayaPartialMaxSec) || 0;
              var t = Number(self.currentTime) || 0;
              if(curSrc.indexOf("blob:") === 0 && maxSec > 1 && t < maxSec - 0.8){
                var sameFile = false;
                try{
                  var want = String(v || "").split("?")[0].replace(/\/+$/, "").split("/");
                  var have = String(self.__ayaPartialUrl || "").split("?")[0].replace(/\/+$/, "").split("/");
                  if(want.length >= 2 && have.length >= 2 &&
                     want[want.length-1] === have[have.length-1] &&
                     want[want.length-2] === have[have.length-2]) sameFile = true;
                }catch(e){}
                if(sameFile) return;
              }
            }catch(e){}

            var applied = false;
            var token = (self.__ayaSrcToken = (self.__ayaSrcToken || 0) + 1);
            var prevTime = 0, wasPlaying = false;
            try{
              prevTime = Number(self.currentTime) || 0;
              wasPlaying = !self.paused;
            }catch(e){}
            var applyNet = function(){
              if(applied || token !== self.__ayaSrcToken) return;
              applied = true;
              try{ desc.set.call(self, v); }catch(e){}
            };
            resolveLocal(v).then(function(local){
              if(token !== self.__ayaSrcToken) return;
              if(local){
                applied = true;
                try{ self.__ayaPartialUrl = v; }catch(e){}
                try{ desc.set.call(self, local); }catch(e){}
                if(prevTime > 0.25){
                  var rl = function(){
                    try{ self.removeEventListener("loadedmetadata", rl); }catch(e){}
                    try{
                      var d = Number(self.duration);
                      var target = prevTime;
                      if(Number.isFinite(d) && d > 0) target = Math.min(prevTime, Math.max(0, d - 0.05));
                      self.currentTime = target;
                    }catch(e){}
                    if(wasPlaying) try{ self.play().catch(function(){}); }catch(e){}
                  };
                  self.addEventListener("loadedmetadata", rl);
                  setTimeout(rl, 80);
                  setTimeout(rl, 250);
                }
              }else applyNet();
            }).catch(function(){ applyNet(); });
            setTimeout(function(){
              if(token !== self.__ayaSrcToken) return;
              if(!applied) applyNet();
            }, 900);
          }
        });
      }
    }
  }catch(e){}

  setStatus("جاهز");
})();
