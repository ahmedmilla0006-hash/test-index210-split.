(function(){
  /*
    تحميل تلقائي لما وصل إليه القارئ فقط:
    - صفحات: من أول السورة حتى الصفحة الحالية
    - صوت: جزء الملف من البداية حتى زمن آخر آية وصل إليها (HTTP Range)
    - توقيت: السورة الحالية فقط
  */
  var PAGE_CACHE = "aya-pages-v1";
  var AUDIO_CACHE = "aya-audio-v1";
  var TIMING_CACHE = "aya-timing-v1";
  var IDB_NAME = "aya-audio-partial-db";
  var IDB_STORE = "partials";
  var KEY_ENABLED = "ayaAutoOffline";
  var queue = [];
  var busy = false;
  var lastPageKey = "";
  var partialBusy = Object.create(null);
  var metaCache = Object.create(null); /* url -> {length, supportsRange} */
  var savedMaxSec = Object.create(null); /* url -> sec */

  function enabled(){
    try{
      var v = localStorage.getItem(KEY_ENABLED);
      if(v === null || v === undefined) return true;
      return v !== "0";
    }catch(e){ return true; }
  }

  function openIdb(){
    return new Promise(function(resolve, reject){
      try{
        var req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = function(){
          var db = req.result;
          if(!db.objectStoreNames.contains(IDB_STORE)){
            db.createObjectStore(IDB_STORE, { keyPath: "url" });
          }
        };
        req.onsuccess = function(){ resolve(req.result); };
        req.onerror = function(){ reject(req.error); };
      }catch(e){ reject(e); }
    });
  }

  function idbGet(url){
    return openIdb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, "readonly");
        var req = tx.objectStore(IDB_STORE).get(url);
        req.onsuccess = function(){ resolve(req.result || null); };
        req.onerror = function(){ reject(req.error); };
      });
    }).catch(function(){ return null; });
  }

  function idbGetAll(){
    return openIdb().then(function(db){
      return new Promise(function(resolve){
        var tx = db.transaction(IDB_STORE, "readonly");
        var req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = function(){ resolve(req.result || []); };
        req.onerror = function(){ resolve([]); };
      });
    }).catch(function(){ return []; });
  }

  /* بحث مرن: نفس الرابط، أو نفس مسار القارئ + نفس اسم الملف.
     لا نطابق بالملف فقط (001.mp3) حتى لا يُشغَّل مقطع قارئ آخر بعد التبديل. */
  function partialPathKey(u){
    u = String(u || "").split("?")[0];
    try{
      var parts = u.replace(/\/+$/, "").split("/");
      if(parts.length >= 2){
        return (parts[parts.length - 2] || "").toLowerCase() + "/" + (parts[parts.length - 1] || "").toLowerCase();
      }
    }catch(e){}
    return u.toLowerCase();
  }
  function idbFindPartial(url){
    url = String(url || "");
    var leaf = "";
    var pathKey = "";
    try{ leaf = (url.split("/").pop() || "").split("?")[0]; }catch(e){}
    try{ pathKey = partialPathKey(url); }catch(e){}
    return idbGet(url).then(function(rec){
      if(rec && rec.blob) return rec;
      try{
        var bare = url.split("?")[0];
        if(bare && bare !== url){
          return idbGet(bare).then(function(rec2){
            if(rec2 && rec2.blob) return rec2;
            return idbFindPartialByPath(url, leaf, pathKey);
          });
        }
      }catch(e){}
      return idbFindPartialByPath(url, leaf, pathKey);
    });
  }
  function idbFindPartialByPath(url, leaf, pathKey){
    return idbGetAll().then(function(rows){
      if(!rows || !rows.length) return null;
      for(var i = 0; i < rows.length; i++){
        var r = rows[i];
        if(!r || !r.blob) continue;
        var u = String(r.url || "");
        if(u === url || u.split("?")[0] === String(url).split("?")[0]) return r;
        var rLeaf = "";
        var rKey = "";
        try{ rLeaf = (u.split("/").pop() || "").split("?")[0]; }catch(e){}
        try{ rKey = partialPathKey(u); }catch(e){}
        if(leaf && rLeaf && leaf === rLeaf && pathKey && rKey && pathKey === rKey) return r;
      }
      return null;
    });
  }

  function idbPut(record){
    return openIdb().then(function(db){
      return new Promise(function(resolve, reject){
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(record);
        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(){ reject(tx.error); };
      });
    }).catch(function(){});
  }

  async function putUrl(cacheName, url){
    if(!url || typeof caches === "undefined") return;
    try{
      var cache = await caches.open(cacheName);
      var hit = await cache.match(url);
      if(hit) return;
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
      if(res) await cache.put(url, res.clone ? res.clone() : res);
    }catch(e){}
  }

  function enqueue(job){
    if(!job || !job.url) return;
    for(var i=0;i<queue.length;i++){
      if(queue[i].url === job.url && queue[i].cache === job.cache) return;
    }
    queue.push(job);
    pump();
  }

  function pump(){
    if(busy || !queue.length || !enabled()) return;
    /* أثناء البث: صفّح ببطء (صفحة واحدة كل 3 ث) بدل الإيقاف الكامل */
    try{
      var streaming = false;
      if(typeof isStreamingOnline === "function") streaming = isStreamingOnline();
      else {
        var a2 = document.getElementById("audio");
        if(a2 && !a2.paused){
          var s2 = String(a2.currentSrc || a2.src || "");
          if(s2.indexOf("http") === 0 && navigator.onLine !== false) streaming = true;
        }
      }
      if(streaming){
        if(pump._streamDelay){ setTimeout(pump, 800); return; }
        pump._streamDelay = true;
        setTimeout(function(){ pump._streamDelay = false; }, 3000);
      }
    }catch(e){}
    busy = true;
    var job = queue.shift();
    putUrl(job.cache, job.url).then(function(){
      busy = false;
      if(queue.length) setTimeout(pump, 30);
    }).catch(function(){
      busy = false;
      if(queue.length) setTimeout(pump, 80);
    });
  }

  function pageUrl(n){
    n = Number(n) || 1;
    try{
      if(typeof quranPageSvgUrl === "function") return quranPageSvgUrl(n);
    }catch(e){}
    return "https://www.mp3quran.net/api/quran_pages_svg/" + String(n).padStart(3,"0") + ".svg";
  }

  function audioUrlFor(surah){
    try{
      if(typeof getAudioUrl === "function" && typeof selectedReader !== "undefined"){
        return getAudioUrl(selectedReader, (typeof currentPage !== "undefined" ? currentPage : 1), surah);
      }
    }catch(e){}
    return "";
  }

  function timingUrl(surah, readId){
    return "https://mp3quran.net/api/v3/ayat_timing?surah=" + surah + "&read=" + readId;
  }

  function surahStartPage(surah){
    surah = Number(surah) || 1;
    try{
      if(typeof surahs !== "undefined" && surahs[surah - 1]) return Number(surahs[surah - 1][1]) || 1;
    }catch(e){}
    return 1;
  }

  /*
    تنزيل التوقيت + مضلعات التظليل وحفظها محلياً (localStorage + Cache)
    ليعملا مع التلاوة أوفلاين مباشرة.
  */
  var timingPersistBusy = Object.create(null);
  async function cacheTiming(surah){
    surah = Number(surah) || 1;
    try{
      if(typeof RECITERS === "undefined" || !RECITERS[selectedReader]) return;
      if(RECITERS[selectedReader].listenOnly) return;
      var readerKey = String(selectedReader || "");
      var cacheKey = readerKey + ":" + surah;
      var busyKey = cacheKey;
      if(timingPersistBusy[busyKey]) return;
      /* إن كان محفوظاً مسبقاً لا تعِد الطلب */
      try{
        var ls0 = localStorage.getItem("ayaTiming:"+cacheKey);
        if(ls0){
          var p0 = JSON.parse(ls0);
          if(Array.isArray(p0) && p0.length){
            try{ if(typeof timingCache !== "undefined") timingCache[cacheKey] = p0; }catch(e){}
            return;
          }
        }
      }catch(e){}
      timingPersistBusy[busyKey] = true;
      var readId = null;
      if(typeof getTimingReadId === "function") readId = await getTimingReadId();
      else readId = RECITERS[selectedReader].timingId;
      if(!readId){ timingPersistBusy[busyKey] = false; return; }
      var url = timingUrl(surah, readId);
      enqueue({ cache: TIMING_CACHE, url: url });
      var list = null;
      try{
        var res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
        if(res && res.ok){
          var data = await res.json();
          list = Array.isArray(data) ? data.filter(function(x){
            return x && x.ayah != null &&
              Number.isFinite(Number(x.start_time)) &&
              Number.isFinite(Number(x.end_time));
          }) : [];
          try{
            var cache = await caches.open(TIMING_CACHE);
            await cache.put(url, new Response(JSON.stringify(list), {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }));
          }catch(e){}
        }
      }catch(e){}
      if(!list || !list.length){
        try{
          var cache2 = await caches.open(TIMING_CACHE);
          var hit = await cache2.match(url);
          if(hit){
            var data2 = await hit.json();
            list = Array.isArray(data2) ? data2 : [];
          }
        }catch(e){}
      }
      if(list && list.length){
        try{ localStorage.setItem("ayaTiming:"+cacheKey, JSON.stringify(list)); }catch(e){}
        try{ if(typeof timingCache !== "undefined") timingCache[cacheKey] = list; }catch(e){}
      }
      timingPersistBusy[busyKey] = false;
    }catch(e){
      timingPersistBusy[busyKey] = false;
    }
  }

  /* حفظ viewBox للصفحة (لازم لتظليل مضلعات SVG أوفلاين) */
  async function cachePageViewBox(pageNum){
    pageNum = Number(pageNum) || 0;
    if(pageNum < 1) return;
    try{
      if(localStorage.getItem("ayaViewBox:"+pageNum)) return;
    }catch(e){}
    try{
      var url = pageUrl(pageNum);
      var res = await fetch(url, { mode: "cors", credentials: "omit", cache: "force-cache" });
      if(!res || !res.ok) return;
      var txt = await res.text();
      var m = txt.match(/viewBox\s*=\s*["']([^"']+)["']/i);
      if(m && m[1]){
        try{ localStorage.setItem("ayaViewBox:"+pageNum, m[1].trim()); }catch(e){}
      }
    }catch(e){}
  }

  async function getAudioMeta(url){
    if(metaCache[url]) return metaCache[url];
    var length = 0;
    var supportsRange = false;
    try{
      var res = await fetch(url, { method: "HEAD", mode: "cors", credentials: "omit" });
      if(res && res.ok){
        length = Number(res.headers.get("content-length")) || 0;
        var ar = (res.headers.get("accept-ranges") || "").toLowerCase();
        supportsRange = ar.indexOf("bytes") >= 0 || length > 0;
      }
    }catch(e){}
    /* بعض الخوادم ترفض HEAD — جرّب Range صغيراً */
    if(!length){
      try{
        var r2 = await fetch(url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          headers: { "Range": "bytes=0-0" }
        });
        if(r2 && (r2.status === 206 || r2.status === 200)){
          var cr = r2.headers.get("content-range") || "";
          var m = cr.match(/\/(\d+)\s*$/);
          if(m) length = Number(m[1]) || 0;
          supportsRange = r2.status === 206 || length > 0;
        }
      }catch(e){}
    }
    metaCache[url] = { length: length, supportsRange: supportsRange };
    return metaCache[url];
  }

  /*
    تحميل تدريجي: بايتات 0..(نهاية الآية الحالية) فقط.
    maxSec = زمن نهاية آخر آية وصل إليها القارئ (بالثواني).
  */
  async function downloadAudioUpTo(url, maxSec, maxAyah){
    if(!enabled() || !url || !(maxSec > 0.5)) return;
    maxSec = Number(maxSec);
    maxAyah = Number(maxAyah) || 0;
    if(savedMaxSec[url] && maxSec <= savedMaxSec[url] + 1.5){
      /* حدّث رقم الآية فقط إن تقدّم */
      if(maxAyah > 0){
        try{
          var prevA = await idbGet(url);
          if(prevA && (Number(prevA.maxAyah) || 0) < maxAyah){
            prevA.maxAyah = maxAyah;
            prevA.maxSec = Math.max(Number(prevA.maxSec) || 0, maxSec);
            prevA.updatedAt = Date.now();
            await idbPut(prevA);
          }
        }catch(e){}
      }
      return;
    }
    if(partialBusy[url]) return;
    partialBusy[url] = true;
    try{
      /* إن وُجد الملف كاملاً في الكاش لا داعي للجزء */
      try{
        if(typeof caches !== "undefined"){
          var full = await caches.open(AUDIO_CACHE).then(function(c){ return c.match(url); });
          if(full){ savedMaxSec[url] = 1e9; return; }
        }
      }catch(e){}

      var prev = await idbGet(url);
      if(prev && prev.maxSec && maxSec <= prev.maxSec + 1.5){
        savedMaxSec[url] = prev.maxSec;
        return;
      }

      var meta = await getAudioMeta(url);
      var duration = 0;
      try{
        var a = document.getElementById("audio");
        if(a && isFinite(a.duration) && a.duration > 1) duration = a.duration;
      }catch(e){}

      var byteEnd = 0;
      if(meta.length > 0 && duration > 1){
        byteEnd = Math.ceil((Math.min(maxSec, duration) / duration) * meta.length);
      }else if(meta.length > 0){
        /* تقدير ~128kbps إن لم تُعرف المدة بعد */
        byteEnd = Math.ceil(Math.min(meta.length - 1, maxSec * 16000));
      }else{
        byteEnd = Math.ceil(maxSec * 16000);
      }
      /* هامش صغير حتى لا يُقطع آخر الآية */
      byteEnd = Math.ceil(byteEnd * 1.02) + 65536;
      if(meta.length > 0) byteEnd = Math.min(byteEnd, meta.length - 1);
      if(byteEnd < 4096) byteEnd = 4096;

      var res = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: { "Range": "bytes=0-" + byteEnd }
      });
      if(!res || !(res.status === 206 || res.status === 200)) return;
      var buf = await res.arrayBuffer();
      if(!buf || !buf.byteLength) return;

      /* إذا رجع الملف كاملاً ضعه في كاش التلاوات */
      if(res.status === 200 && meta.length > 0 && buf.byteLength >= meta.length * 0.98){
        try{
          var cache = await caches.open(AUDIO_CACHE);
          await cache.put(url, new Response(buf, {
            status: 200,
            headers: { "Content-Type": "audio/mpeg", "Content-Length": String(buf.byteLength) }
          }));
          savedMaxSec[url] = 1e9;
          return;
        }catch(e){}
      }

      var prevAyah = 0, prevSec = 0, prevBlob = null, prevUrl = url;
      try{
        var prevRec = prev || await idbFindPartial(url);
        if(prevRec){
          prevAyah = Number(prevRec.maxAyah) || 0;
          prevSec = Number(prevRec.maxSec) || 0;
          prevBlob = prevRec.blob || null;
          if(prevRec.url) prevUrl = prevRec.url;
        }
      }catch(e){}
      /* لا تستبدل بمقطع أصغر حجماً أو زمناً */
      var newSec = Math.max(maxSec, prevSec);
      if(prevBlob && prevSec >= maxSec - 0.5 && prevBlob.size >= (buf.byteLength || 0)){
        savedMaxSec[url] = prevSec;
        try{ if(prevUrl) savedMaxSec[prevUrl] = prevSec; }catch(e){}
        return;
      }
      await idbPut({
        url: prevUrl || url,
        blob: new Blob([buf], { type: "audio/mpeg" }),
        maxSec: newSec,
        maxAyah: Math.max(maxAyah, prevAyah) || 0,
        byteEnd: Math.max(byteEnd, 0),
        contentLength: meta.length || 0,
        updatedAt: Date.now()
      });
      savedMaxSec[url] = newSec;
      try{ if(prevUrl) savedMaxSec[prevUrl] = newSec; }catch(e){}
      try{ localStorage.setItem("ayaPartialMax:"+url, String(newSec)); }catch(e){}
      try{ localStorage.setItem("ayaPartialMax:"+(prevUrl||url), String(newSec)); }catch(e){}
    }catch(e){
    }finally{
      partialBusy[url] = false;
    }
  }

  function surahEndPage(surah){
    surah = Number(surah) || 1;
    try{
      if(typeof surahs !== "undefined" && surahs.length){
        if(surah >= surahs.length) return 604;
        var nextStart = Number(surahs[surah][1]); /* بداية السورة التالية */
        if(Number.isFinite(nextStart) && nextStart > 1) return nextStart - 1;
      }
    }catch(e){}
    return 604;
  }

  function enqueuePageWithViewBox(p, delay){
    p = Number(p) || 0;
    if(p < 1 || p > 604) return;
    enqueue({ cache: PAGE_CACHE, url: pageUrl(p) });
    setTimeout(function(){ cachePageViewBox(p); }, delay || 40);
  }

  /*
    حمّل الصفحات + التظليل قبل وصول التلاوة إليها:
    - كل صفحات السورة من البداية حتى نهايتها (وليس حتى الصفحة الحالية فقط)
    - توقيت السورة كاملاً (مضلعات كل الآيات)
    - صفحة/توقيت السورة التالية عند الاقتراب من النهاية
  */
  function schedulePagesAndTiming(page, surah){
    if(!enabled()) return;
    page = Number(page) || 1;
    surah = Number(surah) || 1;
    var endP = surahEndPage(surah);
    var startP = surahStartPage(surah);
    /* مفتاح يتغير عند تقدّم كبير في الصفحة لإعادة جدولة ما تبقّى */
    var key = String(selectedReader || "") + ":s:" + surah + ":e:" + endP;
    var fullKey = key + ":p:" + page;
    if(fullKey === lastPageKey) return;
    lastPageKey = fullKey;

    /* 1) صفحات من أول السورة → الحالية فوراً */
    for(var p = startP; p <= page; p++){
      enqueuePageWithViewBox(p, 20 + (p - startP) * 25);
    }
    /* 2) صفحات قادمة قبل وصول التلاوة (باقي السورة) */
    var aheadLimit = Math.min(endP, page + 12); /* دفعة أولى: 12 صفحة قادمة */
    for(var p2 = page + 1; p2 <= aheadLimit; p2++){
      enqueuePageWithViewBox(p2, 80 + (p2 - page) * 35);
    }
    /* 3) باقي السورة لاحقاً بهدوء */
    if(aheadLimit < endP){
      for(var p3 = aheadLimit + 1; p3 <= endP; p3++){
        (function(pn, idx){
          setTimeout(function(){
            if(!enabled()) return;
            enqueuePageWithViewBox(pn, 0);
          }, 600 + idx * 120);
        })(p3, p3 - aheadLimit);
      }
    }

    /* 4) توقيت + تظليل السورة كاملة قبل الوصول للآيات */
    cacheTiming(surah);
    try{
      if(typeof getSurahsOnPage === "function"){
        var ss = getSurahsOnPage(page) || [];
        for(var i = 0; i < ss.length; i++){
          if(Number(ss[i]) !== surah) cacheTiming(Number(ss[i]));
        }
      }
    }catch(e){}

    /* 5) عند آخر 3 صفحات: جهّز السورة التالية */
    if(page >= endP - 2 && surah < 114){
      var ns = surah + 1;
      cacheTiming(ns);
      var nsStart = surahStartPage(ns);
      var nsEnd = Math.min(surahEndPage(ns), nsStart + 3);
      for(var np = nsStart; np <= nsEnd; np++){
        enqueuePageWithViewBox(np, 200 + (np - nsStart) * 50);
      }
    }
  }

  /* أثناء التشغيل: صفحات الآيات القادمة من التوقيت قبل أن يصل الصوت */
  function prefetchUpcomingFromTiming(){
    if(!enabled()) return;
    try{
      var a = document.getElementById("audio");
      var t = a ? (Number(a.currentTime) || 0) : 0;
      var list = null;
      try{
        if(typeof currentTiming !== "undefined" && currentTiming && currentTiming.length){
          list = currentTiming;
        }
      }catch(e){}
      if(!list || !list.length) return;
      var tMs = t * 1000;
      var seen = Object.create(null);
      var count = 0;
      for(var i = 0; i < list.length && count < 25; i++){
        var it = list[i];
        if(!it) continue;
        var st = Number(it.start_time);
        /* آيات قادمة أو الجارية خلال الدقائق التالية */
        if(!Number.isFinite(st) || st < tMs - 500) continue;
        if(st > tMs + 180000) break; /* حتى 3 دقائق قادمة */
        var pg = 0;
        try{
          if(typeof pageFromTiming === "function") pg = Number(pageFromTiming(it)) || 0;
        }catch(e){}
        if(!pg && it.page){
          var m = String(it.page).match(/(\d{3})/);
          if(m) pg = Number(m[1]) || 0;
        }
        if(pg >= 1 && pg <= 604 && !seen[pg]){
          seen[pg] = true;
          enqueuePageWithViewBox(pg, 30 + count * 40);
          count++;
        }
      }
      /* تأكد من توقيت السورة الحالية */
      cacheTiming(currentSurahGuess());
    }catch(e){}
  }

  function currentSurahGuess(){
    try{
      if(typeof currentAudioSurah !== "undefined" && currentAudioSurah) return Number(currentAudioSurah);
    }catch(e){}
    try{
      if(typeof getSurahNumberForPage === "function") return Number(getSurahNumberForPage(currentPage || 1)) || 1;
    }catch(e){}
    return 1;
  }

  function reachedSecFromTiming(){
    try{
      var a = document.getElementById("audio");
      var t = a ? (a.currentTime || 0) : 0;
      if(typeof getActiveTiming === "function"){
        var active = getActiveTiming();
        if(active && Number.isFinite(Number(active.end_time))){
          return Math.max(t, Number(active.end_time) / 1000);
        }
      }
      if(typeof currentTiming !== "undefined" && currentTiming && currentTiming.length){
        var best = 0;
        for(var i=0;i<currentTiming.length;i++){
          var it = currentTiming[i];
          var st = Number(it.start_time) / 1000;
          var en = Number(it.end_time) / 1000;
          if(t >= st - 0.05) best = Math.max(best, en);
        }
        if(best > 0) return best;
      }
      return t;
    }catch(e){ return 0; }
  }

  function reachedAyahFromTiming(){
    try{
      if(typeof getActiveTiming === "function"){
        var active = getActiveTiming();
        if(active && Number.isFinite(Number(active.ayah)) && Number(active.ayah) > 0){
          return Number(active.ayah);
        }
      }
      var a = document.getElementById("audio");
      var t = a ? (a.currentTime || 0) : 0;
      var best = 0;
      if(typeof currentTiming !== "undefined" && currentTiming && currentTiming.length){
        for(var i=0;i<currentTiming.length;i++){
          var it = currentTiming[i];
          var st = Number(it.start_time) / 1000;
          var ayah = Number(it.ayah);
          if(Number.isFinite(ayah) && t >= st - 0.05) best = Math.max(best, ayah);
        }
      }
      return best;
    }catch(e){ return 0; }
  }

  function isStreamingOnline(){
    try{
      var a = document.getElementById("audio");
      if(!a || a.paused) return false;
      if(typeof navigator !== "undefined" && navigator.onLine === false) return false;
      var src = String(a.currentSrc || a.src || "");
      return src.indexOf("http") === 0;
    }catch(e){ return false; }
  }

  function scheduleAudioProgress(){
    if(!enabled()) return;
    try{
      var surah = currentSurahGuess();
      var url = audioUrlFor(surah);
      if(!url) return;
      var a = document.getElementById("audio");
      var tNow = a ? (Number(a.currentTime) || 0) : 0;

      if(isStreamingOnline()){
        try{
          if(tNow > 0.8){
            try{ localStorage.setItem("ayaPartialMax:"+url, String(Math.max(tNow, Number(localStorage.getItem("ayaPartialMax:"+url))||0))); }catch(e){}
          }
        }catch(e){}
        /* بعد 40ث تشغيل مستقر: مدّ المقطع في الخلفية (لا يمس src) كل ~50ث */
        if(tNow > 40){
          var aEl = document.getElementById("audio");
          if(aEl && !aEl.paused && !aEl.__ayaBgPartialBusy){
            aEl.__ayaBgPartialBusy = true;
            setTimeout(function(){ try{ aEl.__ayaBgPartialBusy = false; }catch(e){} }, 50000);
            var tgt = Math.max(tNow + 45, Number(aEl.__ayaPartialMaxSec)||0);
            setTimeout(function(){
              try{ downloadAudioUpTo(url, tgt, reachedAyahFromTiming()); }catch(e){}
            }, 800);
          }
        }
        return;
      }

      cacheTiming(surah);
      prefetchUpcomingFromTiming();
      try{
        var page = typeof currentPage !== "undefined" ? currentPage : 1;
        schedulePagesAndTiming(page, surah);
      }catch(e){}

      var sec = reachedSecFromTiming();
      if(!(sec > 0.8)) return;
      var ayah = reachedAyahFromTiming();
      downloadAudioUpTo(url, sec, ayah);
    }catch(e){}
  }

  var _lp = window.loadPage;
  if(typeof _lp === "function"){
    window.loadPage = function(n, options){
      var r = _lp.apply(this, arguments);
      try{
        var page = Number(n) || (typeof currentPage !== "undefined" ? currentPage : 1);
        setTimeout(function(){
          schedulePagesAndTiming(page, currentSurahGuess());
          scheduleAudioProgress();
        }, 200);
      }catch(e){}
      return r;
    };
  }

  function tryPlayPartial(url, preferOffline){
    return seamlessToPartial(url, null);
  }

  /*
    تبديل سلس إلى المقطع المحفوظ مع حفظ الموضع.
    لا يُعاد التعيين إن كنا أصلاً على blob يغطي الزمن الحالي.
  */
  function seamlessToPartial(url, forceTime){
    if(!url) return Promise.resolve(false);
    var audioEl = document.getElementById("audio");
    if(!audioEl) return Promise.resolve(false);
    if(audioEl.__ayaHandoffBusy) return Promise.resolve(false);

    return idbFindPartial(url).then(function(rec){
      if(!rec || !rec.blob) return false;
      /* ارفض إن كان المقطع لسورة أخرى */
      try{
        var need = (String(url).split("/").pop() || "").split("?")[0];
        var got = (String(rec.url || "").split("/").pop() || "").split("?")[0];
        if(need && got && need !== got) return false;
      }catch(e){}

      var maxSec = Number(rec.maxSec) || 0;
      var t = 0;
      try{
        if(forceTime != null && Number(forceTime) > 0) t = Number(forceTime);
        else t = Number(audioEl.currentTime) || 0;
      }catch(e){}
      try{
        var saved = Number(audioEl.__ayaResumeAfterPartial) || 0;
        if(t < 0.2 && saved > 0.2) t = saved;
      }catch(e){}

      /* إن كنا على blob لنفس الملف والموضع داخل المدى — لا تبدّل (يمنع التقطيع) */
      try{
        var cur = String(audioEl.currentSrc || audioEl.src || "");
        if(cur.indexOf("blob:") === 0){
          var same = String(audioEl.__ayaPartialUrl || "") === String(rec.url || url) ||
                     (function(){
                       try{
                         var a = String(audioEl.__ayaPartialUrl || "").split("?")[0];
                         var b = String(rec.url || url || "").split("?")[0];
                         if(!a || !b) return false;
                         if(a === b) return true;
                         var pa = a.replace(/\/+$/, "").split("/");
                         var pb = b.replace(/\/+$/, "").split("/");
                         if(pa.length < 2 || pb.length < 2) return false;
                         return pa[pa.length-1] === pb[pb.length-1] && pa[pa.length-2] === pb[pb.length-2];
                       }catch(e){ return false; }
                     })();
          var cover = !(maxSec > 1) || t < maxSec - 0.5;
          if(same && cover && audioEl.readyState >= 2){
            try{ audioEl.__ayaPartialMaxSec = maxSec || audioEl.__ayaPartialMaxSec; }catch(e){}
            return true;
          }
        }
      }catch(e){}

      if(maxSec > 1 && t > maxSec - 0.1){
        t = Math.max(0, maxSec - 1.2);
      }

      audioEl.__ayaHandoffBusy = true;
      var wasPlaying = false;
      try{ wasPlaying = !audioEl.paused; }catch(e){}
      var local = URL.createObjectURL(rec.blob);
      try{ audioEl.__ayaPartialMaxSec = maxSec || 0; }catch(e){}
      try{ audioEl.__ayaPartialUrl = rec.url || url; }catch(e){}
      try{ audioEl.__ayaResumeAfterPartial = t; }catch(e){}

      var done = false;
      var applyPos = function(){
        if(done) return;
        try{
          var r = Number(audioEl.__ayaResumeAfterPartial) || t || 0;
          var d = Number(audioEl.duration);
          if(Number.isFinite(d) && d > 0) r = Math.min(r, Math.max(0, d - 0.08));
          if(r > 0.15) audioEl.currentTime = r;
        }catch(e){}
      };
      var finish = function(){
        if(done) return;
        done = true;
        applyPos();
        if(wasPlaying){
          try{ audioEl.play().catch(function(){}); }catch(e){}
        }
        try{ if(typeof setAudioLoading === "function") setAudioLoading(false); }catch(e){}
        audioEl.__ayaHandoffBusy = false;
        try{
          if(typeof loadTimingForCurrentSurah === "function") loadTimingForCurrentSurah();
        }catch(e){}
        try{
          if(typeof positionHighlightLayer === "function") positionHighlightLayer();
          if(typeof syncHighlight === "function") syncHighlight();
        }catch(e){}
      };

      audioEl.addEventListener("loadedmetadata", function onM(){
        try{ audioEl.removeEventListener("loadedmetadata", onM); }catch(e){}
        applyPos();
      });
      audioEl.addEventListener("canplay", function onC(){
        try{ audioEl.removeEventListener("canplay", onC); }catch(e){}
        finish();
      });
      try{ audioEl.src = local; }catch(e){ audioEl.__ayaHandoffBusy = false; return false; }
      setTimeout(applyPos, 60);
      setTimeout(applyPos, 180);
      setTimeout(finish, 350);
      setTimeout(function(){ audioEl.__ayaHandoffBusy = false; }, 800);
      return true;
    }).catch(function(){
      try{ var a = document.getElementById("audio"); if(a) a.__ayaHandoffBusy = false; }catch(e){}
      return false;
    });
  }

  /* عند انقطاع النت: انتقل للمقطع فوراً دون انتظار error */
  function onConnectivityChange(){
    try{
      var a = document.getElementById("audio");
      if(!a) return;
      var url = audioUrlFor(currentSurahGuess());
      if(!url) return;
      var offline = (typeof navigator !== "undefined" && navigator.onLine === false);
      if(offline){
        var src = String(a.currentSrc || a.src || "");
        if(src.indexOf("http") === 0 || (a.error && a.error.code)){
          var t = Number(a.currentTime) || 0;
          try{ a.__ayaResumeAfterPartial = t; }catch(e){}
          seamlessToPartial(url, t);
        }
      }else{
        /* عودة النت: ابقَ على المقطع إن كان يعمل — لا ترجع للشبكة (تقطيع) */
        try{
          var src2 = String(a.currentSrc || a.src || "");
          if(src2.indexOf("blob:") === 0){
            var maxSec = Number(a.__ayaPartialMaxSec) || 0;
            var t2 = Number(a.currentTime) || 0;
            if(maxSec > 1) downloadAudioUpTo(url, Math.max(maxSec, t2) + 60, reachedAyahFromTiming());
          }
        }catch(e){}
      }
    }catch(e){}
  }

  try{
    if(!window.__ayaConnBound){
      window.__ayaConnBound = true;
      window.addEventListener("offline", onConnectivityChange);
      window.addEventListener("online", onConnectivityChange);
    }
  }catch(e){}


  try{
    var a = document.getElementById("audio");
    if(a && !a.__ayaAutoOffBound){
      a.__ayaAutoOffBound = true;
      a.addEventListener("play", function(){
        schedulePagesAndTiming(typeof currentPage !== "undefined" ? currentPage : 1, currentSurahGuess());
        /* لا تنزيل صوت أثناء بداية التشغيل الشبكي */
        setTimeout(function(){ scheduleAudioProgress(); }, 100);
      });
      a.addEventListener("pause", function(){
        /* بعد الإيقاف: احفظ أقصى موضع وصلت إليه (لا تُنقص المقطع أبداً) */
        setTimeout(function(){
          try{
            var surah = currentSurahGuess();
            var url = audioUrlFor(surah);
            if(!url) return;
            var t = 0;
            try{ t = Number(a.currentTime) || 0; }catch(e){}
            var sec = 0;
            try{ sec = Number(reachedSecFromTiming()) || 0; }catch(e){}
            var target = Math.max(t, sec, Number(a.__ayaPartialMaxSec)||0);
            if(target > 0.8) downloadAudioUpTo(url, target, reachedAyahFromTiming());
          }catch(e){}
        }, 200);
      });
      /* عند إخفاء الصفحة/إغلاق التطبيق: احفظ أيضاً */
      if(!window.__ayaPartialHideBound){
        window.__ayaPartialHideBound = true;
        document.addEventListener("visibilitychange", function(){
          if(document.visibilityState !== "hidden") return;
          try{
            var el = document.getElementById("audio");
            if(!el) return;
            var surah = currentSurahGuess();
            var url = audioUrlFor(surah);
            if(!url) return;
            var t = Number(el.currentTime) || 0;
            var sec = 0;
            try{ sec = Number(reachedSecFromTiming()) || 0; }catch(e){}
            var target = Math.max(t, sec, Number(el.__ayaPartialMaxSec)||0);
            if(target > 0.8) downloadAudioUpTo(url, target, reachedAyahFromTiming());
          }catch(e){}
        });
      }
      a.addEventListener("timeupdate", function(){
        if(a.__ayaPartialTick) return;
        a.__ayaPartialTick = true;
        setTimeout(function(){
          a.__ayaPartialTick = false;
          scheduleAudioProgress();
        }, 2000);
        /*
          لا ننتقل للشبكة أثناء التشغيل (تسبب تعليق التحميل).
          نمدّد المقطع المحلي +90ث، وعند الحاجة نستبدل الـ blob بمقطع أطول مع حفظ الموضع.
        */
        try{
          var maxSec = Number(a.__ayaPartialMaxSec) || 0;
          var t = Number(a.currentTime) || 0;
          var url = audioUrlFor(currentSurahGuess());
          if(!url) return;
          var online = true;
          try{ online = !(typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}

          /* مدّ المقطع فقط إن كنا نلعب من blob محلي — لا أثناء بث http */
          var srcNow = String(a.currentSrc || a.src || "");
          if(online && srcNow.indexOf("blob:") === 0 && maxSec > 1){
            if(!a.__ayaExtendTick){
              a.__ayaExtendTick = true;
              setTimeout(function(){ a.__ayaExtendTick = false; }, 5000);
              var target = Math.max(maxSec, t) + 90;
              downloadAudioUpTo(url, target, reachedAyahFromTiming());
            }
          }

          if(!(maxSec > 2 && maxSec < 1e8)) return;
          /* بعيد عن النهاية: لا تبدّل المصدر */
          if(t < maxSec - 1.5) return;
          if(a.__ayaPartialUpgrading) return;
          if(!online) return;

          /*
            إصلاح تقطّع الصوت عند عودة الشبكة:
            لا تستبدل مصدر blob الجاري تشغيله بمقطع آخر أثناء التلاوة.
            يستمر تنزيل الجزء التالي في الخلفية أعلاه، ويُترك الانتقال للمسار
            المخصص عند نهاية المقطع، حتى لا يعاد تحميل الصوت أو يقفز التوقيت.
          */
          if(!a.paused && a.readyState >= 2) return;

          a.__ayaPartialUpgrading = true;
          var resumeAt = t;
          (async function(){
            try{
              await downloadAudioUpTo(url, resumeAt + 120, reachedAyahFromTiming());
            }catch(e){}
            var rec = null;
            try{ rec = await idbFindPartial(url); }catch(e){}
            if(rec && rec.blob && Number(rec.maxSec) > resumeAt + 2){
              try{ a.__ayaPartialMaxSec = Number(rec.maxSec); }catch(e){}
              try{ a.__ayaPartialUrl = rec.url || url; }catch(e){}
              try{ a.__ayaResumeAfterPartial = resumeAt; }catch(e){}
              var wasPlaying = !a.paused;
              var local = URL.createObjectURL(rec.blob);
              var onMeta = function(){
                try{ a.removeEventListener("loadedmetadata", onMeta); }catch(e){}
                try{
                  var r = Number(a.__ayaResumeAfterPartial) || resumeAt;
                  var d = Number(a.duration);
                  if(Number.isFinite(d) && d > 0) r = Math.min(r, d - 0.05);
                  if(r > 0.2) a.currentTime = r;
                }catch(e){}
                if(wasPlaying) try{ a.play().catch(function(){}); }catch(e){}
                a.__ayaPartialUpgrading = false;
                try{ if(typeof setAudioLoading === "function") setAudioLoading(false); }catch(e){}
              };
              a.addEventListener("loadedmetadata", onMeta);
              a.addEventListener("canplay", onMeta);
              try{ a.src = local; }catch(e){ a.__ayaPartialUpgrading = false; }
              setTimeout(onMeta, 80);
              setTimeout(onMeta, 250);
              return;
            }
            a.__ayaPartialUpgrading = false;
          })().catch(function(){ a.__ayaPartialUpgrading = false; });
        }catch(e){}
      });
      /*
        عند انتهاء المقطع المحلي أثناء الأوفلاين ثم عودة الشبكة:
        انتقل إلى ملف السورة الشبكي عند نفس موضع نهاية المقطع، ولا تبدأ من أول السورة.
        إذا لم تتوفر الشبكة أو لم يكن المصدر blob محلياً، اترك السلوك الأصلي دون تغيير.
      */
      a.addEventListener("ended", function(){
        try{
          var srcEnded = String(a.currentSrc || a.src || "");
          var onlineNow = !(typeof navigator !== "undefined" && navigator.onLine === false);
          /* إذا انتهى الجزء المحلي والشبكة ما زالت مقطوعة، احفظ نقطة النهاية
             لأن المتصفح قد يعيد currentTime إلى صفر بعد حدث ended. */
          if(srcEnded.indexOf("blob:") === 0 && !onlineNow){
            var offlineEnd = Number(a.__ayaPartialMaxSec) || Number(a.duration) || Number(a.currentTime) || 0;
            if(offlineEnd > 0.5){
              a.__ayaOfflineEnded = true;
              a.__ayaResumeAfterPartial = offlineEnd;
            }
            return;
          }
          if(!onlineNow || srcEnded.indexOf("blob:") !== 0) return;
          if(a.__ayaEndedHandoffBusy) return;
          var urlEnded = audioUrlFor(currentSurahGuess());
          if(!urlEnded) return;
          var maxEnded = Number(a.__ayaPartialMaxSec) || 0;
          var resumeEnded = Number(a.currentTime) || 0;
          if(maxEnded > 1) resumeEnded = Math.max(resumeEnded, maxEnded - 0.25);
          if(!(resumeEnded > 0.5)) return;

          a.__ayaEndedHandoffBusy = true;
          var tokenEnded = (a.__ayaEndedHandoffToken || 0) + 1;
          a.__ayaEndedHandoffToken = tokenEnded;
          a.__ayaResumeAfterPartial = resumeEnded;
          a.__ayaForceNet = true;
          try{ a.pause(); }catch(e){}

          var finishedEnded = false;
          var continueNetwork = function(){
            if(finishedEnded || a.__ayaEndedHandoffToken !== tokenEnded) return;
            if(a.readyState < 1) return;
            finishedEnded = true;
            try{ a.removeEventListener("loadedmetadata", continueNetwork); }catch(e){}
            try{ a.removeEventListener("canplay", continueNetwork); }catch(e){}
            try{
              var durationEnded = Number(a.duration);
              var targetEnded = resumeEnded;
              if(Number.isFinite(durationEnded) && durationEnded > 0){
                targetEnded = Math.min(targetEnded, Math.max(0, durationEnded - 0.15));
              }
              a.currentTime = targetEnded;
            }catch(e){}
            try{ a.__ayaPartialUrl = urlEnded; a.__ayaPartialMaxSec = 0; }catch(e){}
            try{ a.play().then(function(){
              try{ if(typeof userWantsPlay !== "undefined") userWantsPlay = true; }catch(e){}
            }).catch(function(){}); }catch(e){}
            setTimeout(function(){
              try{ if(a.__ayaEndedHandoffToken === tokenEnded) a.__ayaEndedHandoffBusy = false; }catch(e){}
            }, 700);
          };
          a.addEventListener("loadedmetadata", continueNetwork);
          a.addEventListener("canplay", continueNetwork);
          try{ a.src = urlEnded; a.load(); }catch(e){
            a.__ayaEndedHandoffBusy = false;
            try{ a.__ayaForceNet = false; }catch(ignore){}
          }
          setTimeout(continueNetwork, 500);
          setTimeout(function(){
            if(!finishedEnded && a.__ayaEndedHandoffToken === tokenEnded){
              try{ a.removeEventListener("loadedmetadata", continueNetwork); }catch(e){}
              try{ a.removeEventListener("canplay", continueNetwork); }catch(e){}
              a.__ayaEndedHandoffBusy = false;
            }
          }, 10000);
        }catch(e){ try{ a.__ayaEndedHandoffBusy = false; }catch(ignore){} }
      });

      /* فشل الشبكة أو انقطاع: استخدم الجزء المحفوظ فوراً */
      a.addEventListener("error", function(){
        try{
          var url = audioUrlFor(currentSurahGuess());
          tryPlayPartial(url);
        }catch(e){}
      });
      /* لا تبدّل المصدر أثناء التشغيل المستقر — يمنع التقطّع أوفلاين/أونلاين */
      a.addEventListener("loadstart", function(){
        try{
          if(a.__ayaPartialUpgrading || a.__ayaForceNet) return;
          var cur = String(a.currentSrc || a.src || "");
          if(!cur || cur.indexOf("blob:") === 0) return;
          /* إن الشبكة تعمل بالفعل لا تسرقها للجزئي وسط التشغيل */
          if(!a.paused && a.readyState >= 2 && (a.currentTime || 0) > 0.5) return;
          var url = audioUrlFor(currentSurahGuess());
          if(!url) return;
          var offline = false;
          try{ offline = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}
          if(!offline) return; /* أونلاين: اترك الشبكة ما لم يفشل */
          resolveLocal(url).then(function(local){
            if(!local) return;
            var now = String(a.currentSrc || a.src || "");
            if(now.indexOf("blob:") === 0) return;
            var t = 0;
            try{ t = a.currentTime || 0; }catch(e){}
            var wantPlay = !a.paused;
            try{
              a.__ayaPartialUrl = url;
              a.src = local;
              var onMeta = function(){
                try{ a.removeEventListener("loadedmetadata", onMeta); }catch(e){}
                try{ if(t > 0.3) a.currentTime = t; }catch(e){}
                if(wantPlay) try{ a.play().catch(function(){}); }catch(e){}
              };
              a.addEventListener("loadedmetadata", onMeta);
              setTimeout(onMeta, 60);
            }catch(e){}
          });
        }catch(e){}
      });

      /* عند عودة الشبكة: لا تلمس src — فقط مدّد المقطع في الخلفية */
      try{
        if(!window.__ayaOnlinePartialBound){
          window.__ayaOnlinePartialBound = true;
          window.addEventListener("online", function(){
            try{
              var el = document.getElementById("audio");
              if(!el) return;
              var maxSec = Number(el.__ayaPartialMaxSec) || 0;
              var url = audioUrlFor(currentSurahGuess());
              if(!url) return;
              /* إذا انتهى الملف المحلي أثناء انقطاع الشبكة، أكمل من نهاية
                 الجزء المحفوظ بعد عودة الاتصال بدلاً من بدء السورة من الصفر. */
              if(el.__ayaOfflineEnded && !el.__ayaOnlineEndHandoffBusy){
                var resumeOnline = Number(el.__ayaResumeAfterPartial) || maxSec || 0;
                if(resumeOnline > 0.5){
                  el.__ayaOnlineEndHandoffBusy = true;
                  el.__ayaForceNet = true;
                  var finishedOnline = false;
                  var resumeToNetwork = function(){
                    if(finishedOnline || el.readyState < 1) return;
                    finishedOnline = true;
                    try{ el.removeEventListener("loadedmetadata", resumeToNetwork); }catch(e){}
                    try{ el.removeEventListener("canplay", resumeToNetwork); }catch(e){}
                    try{
                      var durOnline = Number(el.duration);
                      var targetOnline = resumeOnline;
                      if(Number.isFinite(durOnline) && durOnline > 0) targetOnline = Math.min(targetOnline, Math.max(0, durOnline - 0.2));
                      el.currentTime = targetOnline;
                    }catch(e){}
                    try{ el.__ayaOfflineEnded = false; el.__ayaPartialUrl = url; el.__ayaPartialMaxSec = 0; }catch(e){}
                    try{ el.play().catch(function(){}); }catch(e){}
                    setTimeout(function(){ try{ el.__ayaOnlineEndHandoffBusy = false; el.__ayaForceNet = false; }catch(e){} }, 1200);
                  };
                  el.addEventListener("loadedmetadata", resumeToNetwork);
                  el.addEventListener("canplay", resumeToNetwork);
                  try{ el.src = url; el.load(); }catch(e){ el.__ayaOnlineEndHandoffBusy = false; el.__ayaForceNet = false; }
                  setTimeout(resumeToNetwork, 700);
                  setTimeout(function(){
                    if(!finishedOnline){
                      try{ el.removeEventListener("loadedmetadata", resumeToNetwork); }catch(e){}
                      try{ el.removeEventListener("canplay", resumeToNetwork); }catch(e){}
                      el.__ayaOnlineEndHandoffBusy = false;
                      el.__ayaForceNet = false;
                    }
                  }, 12000);
                  return;
                }
              }
              if(!(maxSec > 1 && maxSec < 1e8)) return;
              var t = Number(el.currentTime) || 0;
              downloadAudioUpTo(url, Math.max(maxSec, t) + 60, reachedAyahFromTiming());
            }catch(e){}
          });
        }
      }catch(e){}
    }
  }catch(e){}

  /*
    resolveLocal: يعيد blob: من الكاش الكامل أو المقطع الجزئي إن وُجد.
    يُستخدم عند كل تعيين src حتى لا ننتظر الشبكة بعد أول تنزيل تدريجي.
  */
  async function resolveLocal(url){
    if(!url || String(url).indexOf("blob:") === 0) return null;
    /* كاش كامل */
    try{
      if(typeof caches !== "undefined"){
        var cache = await caches.open(AUDIO_CACHE);
        var hit = await cache.match(url);
        if(hit){
          var b = await hit.blob();
          if(b && b.size){
            try{ savedMaxSec[url] = 1e9; }catch(e){}
            return URL.createObjectURL(new Blob([b], { type: "audio/mpeg" }));
          }
        }
      }
    }catch(e){}
    /* مقطع جزئي IndexedDB (بحث مرن بالرابط أو اسم الملف) */
    try{
      var rec = await idbFindPartial(url);
      if(rec && rec.blob){
        try{
          var aEl = document.getElementById("audio");
          if(aEl){
            aEl.__ayaPartialMaxSec = Number(rec.maxSec) || 0;
            aEl.__ayaPartialUrl = rec.url || url;
          }
        }catch(e){}
        try{ savedMaxSec[url] = Number(rec.maxSec) || savedMaxSec[url] || 0; }catch(e){}
        try{ if(rec.url) savedMaxSec[rec.url] = Number(rec.maxSec) || 0; }catch(e){}
        return URL.createObjectURL(rec.blob);
      }
    }catch(e){}
    return null;
  }

  /* معترض src: أونلاين = شبكة فوراً | أوفلاين = محلي إن وُجد لنفس الملف فقط */
  try{
    var audioEl = document.getElementById("audio");
    if(audioEl && !audioEl.__ayaPartialSrcHook){
      audioEl.__ayaPartialSrcHook = true;
      var desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src")
        || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(audioEl), "src");
      /* إن وُجد معترض سابق على العنصر، استبدله بهذا */
      try{
        var existing = Object.getOwnPropertyDescriptor(audioEl, "src");
        if(existing && existing.set){
          /* أعِد الربط على النموذج الأصلي */
        }
      }catch(e){}
      if(desc && desc.set){
        Object.defineProperty(audioEl, "src", {
          configurable: true,
          enumerable: true,
          get: function(){ return desc.get.call(this); },
          set: function(v){
            var self = this;
            if(!v || String(v).indexOf("blob:") === 0){
              try{ desc.set.call(self, v); }catch(e){}
              return;
            }
            if(self.__ayaForceNet){
              try{ self.__ayaForceNet = false; }catch(e){}
              try{ desc.set.call(self, v); }catch(e){}
              return;
            }
            var offline = false;
            try{ offline = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}
            /* أونلاين: شبكة مباشرة — صفر انتظار IndexedDB */
            if(!offline){
              try{ desc.set.call(self, v); }catch(e){}
              return;
            }
            /* أوفلاين: محلي لنفس مسار القارئ + نفس الملف فقط */
            var token = (self.__ayaSrcToken = (self.__ayaSrcToken || 0) + 1);
            var pathNeed = "";
            try{
              var parts = String(v).split("?")[0].replace(/\/+$/, "").split("/");
              if(parts.length >= 2) pathNeed = (parts[parts.length-2] + "/" + parts[parts.length-1]).toLowerCase();
            }catch(e){}
            var applied = false;
            resolveLocal(v).then(function(local){
              if(token !== self.__ayaSrcToken) return;
              if(local){
                try{
                  var pu = String(self.__ayaPartialUrl || v);
                  var parts2 = pu.split("?")[0].replace(/\/+$/, "").split("/");
                  var pathGot = "";
                  if(parts2.length >= 2) pathGot = (parts2[parts2.length-2] + "/" + parts2[parts2.length-1]).toLowerCase();
                  if(pathNeed && pathGot && pathNeed !== pathGot){
                    try{ desc.set.call(self, v); }catch(e){}
                    return;
                  }
                }catch(e){}
                applied = true;
                try{ desc.set.call(self, local); }catch(e){}
              }else if(!applied){
                try{ desc.set.call(self, v); }catch(e){}
              }
            }).catch(function(){
              if(token !== self.__ayaSrcToken) return;
              try{ desc.set.call(self, v); }catch(e){}
            });
            setTimeout(function(){
              if(token !== self.__ayaSrcToken) return;
              if(!applied) try{ desc.set.call(self, v); }catch(e){}
            }, 80);
          }
        });
      }
    }
  }catch(e){}


  function boot(){
    try{
      schedulePagesAndTiming(
        typeof currentPage !== "undefined" ? currentPage : 1,
        currentSurahGuess()
      );
      scheduleAudioProgress();
    }catch(e){}
  }
  if(document.readyState === "complete") setTimeout(boot, 1200);
  else window.addEventListener("load", function(){ setTimeout(boot, 1200); });

  var _fetch = window.fetch;
  if(typeof _fetch === "function" && !window.__ayaTimingFetchPatched){
    window.__ayaTimingFetchPatched = true;
    window.fetch = function(input, init){
      var url = (typeof input === "string") ? input : (input && input.url);
      var p = _fetch.apply(this, arguments);
      if(url && String(url).indexOf("ayat_timing") >= 0){
        return p.then(function(res){
          if(res && res.ok){
            try{
              caches.open(TIMING_CACHE).then(function(cache){
                cache.put(url, res.clone()).catch(function(){});
              });
            }catch(e){}
            return res;
          }
          return caches.open(TIMING_CACHE).then(function(cache){
            return cache.match(url).then(function(hit){ return hit || res; });
          }).catch(function(){ return res; });
        }).catch(function(err){
          return caches.open(TIMING_CACHE).then(function(cache){
            return cache.match(url).then(function(hit){
              if(hit) return hit;
              throw err;
            });
          });
        });
      }
      return p;
    };
  }

  window.__ayaAutoOffline = {
    enabled: enabled,
    setEnabled: function(on){
      try{ localStorage.setItem(KEY_ENABLED, on ? "1" : "0"); }catch(e){}
      if(on) boot();
    },
    scheduleAudioProgress: scheduleAudioProgress,
    downloadAudioUpTo: downloadAudioUpTo,
    resolveLocal: resolveLocal,
    tryPlayPartial: tryPlayPartial,
    seamlessToPartial: seamlessToPartial,
    idbGet: idbGet,
    idbFindPartial: idbFindPartial,
    idbGetAll: idbGetAll
  };
})();
