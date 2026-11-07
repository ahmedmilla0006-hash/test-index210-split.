(function(){
  var PAGE_CACHE = "aya-pages-v1";
  var AUDIO_CACHE = "aya-audio-v1";
  var TIMING_CACHE = "aya-timing-v1";
  var IDB_NAME = "aya-audio-partial-db";
  var IDB_STORE = "partials";

  function $(id){ return document.getElementById(id); }

  function fmtSize(n){
    n = Number(n) || 0;
    if(n < 1024) return Math.round(n) + " بايت";
    if(n < 1024*1024) return (n/1024).toFixed(n < 10*1024 ? 1 : 0) + " ك.ب";
    return (n/(1024*1024)).toFixed(n < 10*1024*1024 ? 2 : 1) + " م.ب";
  }

  async function cacheSize(name){
    if(typeof caches === "undefined") return { bytes: 0, count: 0 };
    try{
      var cache = await caches.open(name);
      var keys = await cache.keys();
      var total = 0;
      for(var i=0;i<keys.length;i++){
        try{
          var res = await cache.match(keys[i]);
          if(!res) continue;
          var buf = await res.clone().arrayBuffer();
          total += buf.byteLength || 0;
        }catch(e){}
      }
      return { bytes: total, count: keys.length };
    }catch(e){ return { bytes: 0, count: 0 }; }
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

  async function partialSize(){
    try{
      var db = await openIdb();
      return await new Promise(function(resolve){
        var tx = db.transaction(IDB_STORE, "readonly");
        var store = tx.objectStore(IDB_STORE);
        var req = store.getAll();
        req.onsuccess = function(){
          var rows = req.result || [];
          var total = 0;
          for(var i=0;i<rows.length;i++){
            var b = rows[i] && rows[i].blob;
            if(b && typeof b.size === "number") total += b.size;
            else if(rows[i] && rows[i].byteEnd) total += Number(rows[i].byteEnd) || 0;
          }
          resolve({ bytes: total, count: rows.length });
        };
        req.onerror = function(){ resolve({ bytes: 0, count: 0 }); };
      });
    }catch(e){ return { bytes: 0, count: 0 }; }
  }

  async function timingLocalSize(){
    var total = 0, count = 0;
    try{
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(!k) continue;
        if(k.indexOf("ayaTiming:") === 0 || k.indexOf("ayaViewBox:") === 0 || k.indexOf("ayaPartialMax:") === 0){
          var v = localStorage.getItem(k) || "";
          total += (k.length + v.length) * 2;
          count++;
        }
      }
    }catch(e){}
    var cachePart = await cacheSize(TIMING_CACHE);
    return { bytes: total + cachePart.bytes, count: count + cachePart.count };
  }

  function surahName(n){
    n = Number(n) || 0;
    try{
      if(typeof surahs !== "undefined" && surahs[n - 1]) return String(surahs[n - 1][0] || ("سورة " + n));
    }catch(e){}
    return n ? ("سورة " + n) : "—";
  }

  function fmtSec(sec){
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function reciterNameFromUrl(url){
    url = String(url || "");
    try{
      if(typeof RECITERS !== "undefined"){
        for(var k in RECITERS){
          if(!Object.prototype.hasOwnProperty.call(RECITERS, k)) continue;
          var r = RECITERS[k];
          if(!r) continue;
          var server = String(r.server || r.base || "");
          if(server && url.indexOf(server.replace(/\/?$/, "")) >= 0){
            return r.name || r.label || k;
          }
          if(r.folder && url.indexOf("/" + r.folder + "/") >= 0) return r.name || k;
        }
      }
    }catch(e){}
    /* استخرج مجلد القارئ من المسار إن أمكن */
    try{
      var m = url.match(/\/(?:download|quran)\/([^\/]+)\//i) || url.match(/\/\/([^\/]+)\/(\d{3})\.mp3/i);
      if(m) return m[1];
    }catch(e){}
    return "قارئ";
  }

  function pageLabelFromUrl(url){
    url = String(url || "");
    var m = url.match(/(\d{3})\.svg/i) || url.match(/page[_\-]?(\d+)/i) || url.match(/\/(\d{1,3})(?:\.svg|\.png)?(?:\?|$)/i);
    if(m) return "صفحة " + String(Number(m[1]));
    return url.split("/").pop() || url;
  }

  function surahFromAudioUrl(url){
    url = String(url || "");
    var m = url.match(/\/(\d{3})\.mp3/i) || url.match(/[_\-](\d{3})(?:\.mp3)?(?:\?|$)/i);
    if(m) return Number(m[1]);
    return 0;
  }

  async function listCacheEntries(cacheName){
    var rows = [];
    if(typeof caches === "undefined") return rows;
    try{
      var cache = await caches.open(cacheName);
      var keys = await cache.keys();
      for(var i = 0; i < keys.length; i++){
        var req = keys[i];
        var url = req && req.url ? req.url : String(req);
        var bytes = 0;
        try{
          var res = await cache.match(req);
          if(res){
            var buf = await res.clone().arrayBuffer();
            bytes = buf.byteLength || 0;
          }
        }catch(e){}
        rows.push({ url: url, bytes: bytes });
      }
    }catch(e){}
    rows.sort(function(a, b){ return (a.url || "").localeCompare(b.url || ""); });
    return rows;
  }

  async function listPartials(){
    var rows = [];
    try{
      var db = await openIdb();
      rows = await new Promise(function(resolve){
        var tx = db.transaction(IDB_STORE, "readonly");
        var req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = function(){ resolve(req.result || []); };
        req.onerror = function(){ resolve([]); };
      });
    }catch(e){}
    return rows;
  }

  function listTimingKeys(){
    var items = [];
    try{
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!k) continue;
        if(k.indexOf("ayaTiming:") === 0 || k.indexOf("ayaViewBox:") === 0 || k.indexOf("ayaPartialMax:") === 0){
          var v = localStorage.getItem(k) || "";
          items.push({ key: k, bytes: (k.length + v.length) * 2 });
        }
      }
    }catch(e){}
    return items;
  }

  function renderDetailList(el, lines){
    if(!el) return;
    if(!lines || !lines.length){
      el.innerHTML = '<div style="opacity:.7;padding:8px 4px">لا توجد عناصر.</div>';
      return;
    }
    var html = '<div style="display:flex;flex-direction:column;gap:6px;padding-top:8px">';
    for(var i = 0; i < lines.length; i++){
      var it = lines[i];
      html += '<div style="background:rgba(0,0,0,.18);border-radius:10px;padding:10px 12px">';
      html += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">';
      html += '<div style="min-width:0;flex:1"><div style="font-weight:700">' + it.title + '</div>';
      if(it.sub) html += '<div style="opacity:.8;font-size:12px;margin-top:3px;line-height:1.55">' + it.sub + '</div>';
      if(it.meta) html += '<div style="opacity:.7;font-size:11px;margin-top:4px;line-height:1.5">' + it.meta + '</div>';
      html += '</div><div style="flex:none;font-weight:700;white-space:nowrap">' + it.size + '</div></div>';
      if(it.pct != null && Number.isFinite(Number(it.pct))){
        var p = Math.max(0, Math.min(100, Number(it.pct)));
        html += '<div style="margin-top:8px;height:6px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden">';
        html += '<div style="height:100%;width:' + p.toFixed(1) + '%;background:linear-gradient(90deg,#16803b,#79d69a);border-radius:999px"></div></div>';
        html += '<div style="margin-top:4px;font-size:11px;opacity:.85;text-align:left">نسبة التقدم: ' + p.toFixed(0) + '%</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  async function fillPagesDetails(){
    var el = $("stPagesDetails");
    if(!el) return;
    el.innerHTML = '<div style="opacity:.7;padding:8px 4px">جاري التحميل…</div>';
    var rows = await listCacheEntries(PAGE_CACHE);
    var lines = rows.map(function(r){
      return { title: pageLabelFromUrl(r.url), sub: "", size: fmtSize(r.bytes) };
    });
    /* دمج أرقام الصفحات المتتالية اختياري — نعرض كل صفحة */
    lines.sort(function(a, b){
      var na = Number((a.title.match(/\d+/) || [0])[0]);
      var nb = Number((b.title.match(/\d+/) || [0])[0]);
      return na - nb;
    });
    renderDetailList(el, lines);
  }

  async function fillAudioDetails(){
    var el = $("stAudioDetails");
    if(!el) return;
    el.innerHTML = '<div style="opacity:.7;padding:8px 4px">جاري التحميل…</div>';
    var rows = await listCacheEntries(AUDIO_CACHE);
    var lines = rows.map(function(r){
      var sn = surahFromAudioUrl(r.url);
      var rec = reciterNameFromUrl(r.url);
      return {
        title: (sn ? surahName(sn) + " (" + sn + ")" : "تلاوة"),
        sub: rec,
        size: fmtSize(r.bytes)
      };
    });
    renderDetailList(el, lines);
  }

  function readerKeyFromUrl(url){
    url = String(url || "");
    try{
      if(typeof RECITERS !== "undefined"){
        for(var k in RECITERS){
          if(!Object.prototype.hasOwnProperty.call(RECITERS, k)) continue;
          var r = RECITERS[k];
          if(!r) continue;
          var server = String(r.server || "").replace(/\/+$/, "");
          if(server && url.indexOf(server) >= 0) return k;
          if(r.timingAudioServer && url.indexOf(String(r.timingAudioServer).replace(/\/+$/, "")) >= 0) return k;
        }
      }
    }catch(e){}
    return "";
  }

  /* آخر آية يغطيها المقطع — يفضّل توقيت نفس القارئ */
  function ayahReachedAt(surahNum, maxSec, audioUrl){
    surahNum = Number(surahNum) || 0;
    maxSec = Number(maxSec) || 0;
    if(!surahNum || maxSec < 0.2) return 0;
    var preferReader = readerKeyFromUrl(audioUrl || "");
    var candidates = [];
    try{
      if(typeof timingCache !== "undefined" && timingCache){
        for(var k in timingCache){
          if(!Object.prototype.hasOwnProperty.call(timingCache, k)) continue;
          var parts = String(k).split(":");
          var sPart = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
          if(String(sPart) !== String(surahNum)) continue;
          if(Array.isArray(timingCache[k]) && timingCache[k].length){
            candidates.push({ key: k, list: timingCache[k], reader: parts[0] || "" });
          }
        }
      }
    }catch(e){}
    try{
      for(var i = 0; i < localStorage.length; i++){
        var key = localStorage.key(i);
        if(!key || key.indexOf("ayaTiming:") !== 0) continue;
        var rest = key.slice("ayaTiming:".length);
        var p2 = rest.split(":");
        var s2 = p2.length >= 2 ? p2[p2.length - 1] : p2[0];
        if(String(s2) !== String(surahNum)) continue;
        try{
          var parsed = JSON.parse(localStorage.getItem(key) || "[]");
          if(Array.isArray(parsed) && parsed.length){
            candidates.push({ key: key, list: parsed, reader: p2[0] || "" });
          }
        }catch(e){}
      }
    }catch(e){}
    if(!candidates.length) return 0;
    /* فضّل توقيت القارئ المطابق للرابط */
    var list = null;
    if(preferReader){
      for(var c = 0; c < candidates.length; c++){
        if(candidates[c].reader === preferReader){ list = candidates[c].list; break; }
      }
    }
    if(!list) list = candidates[0].list;
    var tMs = maxSec * 1000;
    var best = 0;
    for(var j = 0; j < list.length; j++){
      var it = list[j];
      if(!it) continue;
      var ayah = Number(it.ayah);
      if(!Number.isFinite(ayah) || ayah < 1) continue;
      var st = Number(it.start_time);
      var en = Number(it.end_time);
      /* الآية التي بدأها القارئ أو أتمّها ضمن المقطع */
      if(Number.isFinite(st) && tMs >= st - 80) best = Math.max(best, ayah);
      else if(Number.isFinite(en) && tMs >= en - 80) best = Math.max(best, ayah);
    }
    return best;
  }

  function getTimingListFor(surahNum, audioUrl){
    surahNum = Number(surahNum) || 0;
    if(!surahNum) return null;
    var preferReader = readerKeyFromUrl(audioUrl || "");
    var candidates = [];
    try{
      if(typeof timingCache !== "undefined" && timingCache){
        for(var k in timingCache){
          if(!Object.prototype.hasOwnProperty.call(timingCache, k)) continue;
          var parts = String(k).split(":");
          var sPart = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
          if(String(sPart) !== String(surahNum)) continue;
          if(Array.isArray(timingCache[k]) && timingCache[k].length){
            candidates.push({ list: timingCache[k], reader: parts[0] || "" });
          }
        }
      }
    }catch(e){}
    try{
      for(var i = 0; i < localStorage.length; i++){
        var key = localStorage.key(i);
        if(!key || key.indexOf("ayaTiming:") !== 0) continue;
        var rest = key.slice("ayaTiming:".length);
        var p2 = rest.split(":");
        var s2 = p2.length >= 2 ? p2[p2.length - 1] : p2[0];
        if(String(s2) !== String(surahNum)) continue;
        try{
          var parsed = JSON.parse(localStorage.getItem(key) || "[]");
          if(Array.isArray(parsed) && parsed.length){
            candidates.push({ list: parsed, reader: p2[0] || "" });
          }
        }catch(e){}
      }
    }catch(e){}
    if(!candidates.length) return null;
    if(preferReader){
      for(var c = 0; c < candidates.length; c++){
        if(candidates[c].reader === preferReader) return candidates[c].list;
      }
    }
    return candidates[0].list;
  }

  function pageFromTimingItem(item){
    try{
      if(typeof pageFromTiming === "function"){
        var p = pageFromTiming(item);
        if(p) return Number(p) || 0;
      }
    }catch(e){}
    try{
      if(item && item.page){
        var m = String(item.page).match(/(\d{3})/);
        if(m) return Number(m[1]) || 0;
      }
    }catch(e){}
    return 0;
  }

  function progressInfo(surahNum, sec, ayah, audioUrl){
    var info = {
      totalAyahs: 0,
      totalSec: 0,
      page: 0,
      ayahPct: null,
      timePct: null,
      ayahAt: ayah || 0
    };
    var list = getTimingListFor(surahNum, audioUrl);
    if(!list || !list.length) return info;
    var maxA = 0, maxEn = 0, pageAt = 0;
    var tMs = (Number(sec) || 0) * 1000;
    for(var i = 0; i < list.length; i++){
      var it = list[i];
      if(!it) continue;
      var a = Number(it.ayah) || 0;
      var en = Number(it.end_time) || 0;
      var st = Number(it.start_time) || 0;
      if(a > maxA) maxA = a;
      if(en > maxEn) maxEn = en;
      if(ayah > 0 && a === ayah){
        var pg = pageFromTimingItem(it);
        if(pg) pageAt = pg;
      }
      if(!ayah && tMs >= st - 80){
        var pg2 = pageFromTimingItem(it);
        if(pg2) pageAt = pg2;
        if(a > info.ayahAt) info.ayahAt = a;
      }
    }
    info.totalAyahs = maxA;
    info.totalSec = maxEn > 0 ? maxEn / 1000 : 0;
    info.page = pageAt;
    if(info.ayahAt > 0 && maxA > 0){
      info.ayahPct = Math.min(100, (info.ayahAt / maxA) * 100);
    }
    if(sec > 0 && info.totalSec > 0){
      info.timePct = Math.min(100, (sec / info.totalSec) * 100);
    }
    return info;
  }

  async function fillPartialDetails(){
    var el = $("stPartialDetails");
    if(!el) return;
    el.innerHTML = '<div style="opacity:.7;padding:8px 4px">جاري التحميل…</div>';
    var rows = await listPartials();
    var lines = rows.map(function(r){
      var url = r.url || "";
      var sn = surahFromAudioUrl(url);
      var rec = reciterNameFromUrl(url);
      var sec = Number(r.maxSec) || 0;
      var bytes = (r.blob && r.blob.size) ? r.blob.size : (Number(r.byteEnd) || 0);
      var totalBytes = Number(r.contentLength) || 0;
      var when = "";
      try{
        if(r.updatedAt){
          var d = new Date(r.updatedAt);
          when = d.toLocaleDateString("ar") + " · " + d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
        }
      }catch(e){}
      var ayah = Number(r.maxAyah) || 0;
      if(!ayah) ayah = ayahReachedAt(sn, sec, url);
      var prog = progressInfo(sn, sec, ayah, url);
      if(!ayah && prog.ayahAt) ayah = prog.ayahAt;

      // maxSec may include extra seconds downloaded for smooth offline playback.
      // Display the actual timing endpoint of the last saved ayah when available.
      var displaySec = sec;
      if(sn && ayah > 0){
        try{
          var timingRows = getTimingListFor(sn, url);
          if(timingRows && timingRows.length){
            var ayahEndMs = 0;
            for(var ti = 0; ti < timingRows.length; ti++){
              var timingItem = timingRows[ti];
              if(Number(timingItem && timingItem.ayah) === ayah){
                var endMs = Number(timingItem.end_time) || 0;
                if(endMs > ayahEndMs) ayahEndMs = endMs;
              }
            }
            if(ayahEndMs > 0) displaySec = ayahEndMs / 1000;
          }
        }catch(e){}
      }

      var pct = null;
      if(prog.timePct != null) pct = prog.timePct;
      else if(prog.ayahPct != null) pct = prog.ayahPct;
      else if(totalBytes > 0 && bytes > 0) pct = Math.min(100, (bytes / totalBytes) * 100);

      var range = "";
      if(ayah > 0) range = "حتى الآية " + ayah;
      if(displaySec > 0) range += (range ? " · " : "") + fmtSec(displaySec);

      return {
        title: (sn ? surahName(sn) + " (" + sn + ")" : "مقطع تلاوة") + (range ? " · " + range : ""),
        reciter: rec || "",
        when: when,
        bytes: bytes,
        pct: pct
      };
    });

    if(!lines.length){
      el.innerHTML = '<div style="opacity:.7;padding:8px 4px;text-align:center">لا توجد مقاطع تلاوة تدريجية.</div>';
      return;
    }

    // تخطيط مدمج يحاكي بطاقات إدارة المساحة في الصورة المرجعية.
    var html = '<div style="display:flex;flex-direction:column;gap:9px;padding:8px 6px 8px">';
    for(var i = 0; i < lines.length; i++){
      var it = lines[i];
      var p = it.pct != null && Number.isFinite(Number(it.pct))
        ? Math.max(0, Math.min(100, Number(it.pct))) : null;

      html += '<div style="background:rgba(0,0,0,.19);border-radius:17px;padding:12px 14px;direction:rtl;color:#f4f6f8">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">';
      html += '<div style="flex:1;min-width:0;text-align:right;font-size:14px;font-weight:700;line-height:1.65;color:#f5f7fa">' + it.title + '</div>';
      html += '<div style="flex:none;white-space:nowrap;font-size:13px;font-weight:700;color:#f4f6f8">' + (it.bytes > 0 ? fmtSize(it.bytes) : '—') + '</div>';
      html += '</div>';

      var secondary = [];
      if(it.reciter) secondary.push(it.reciter);
      if(it.when) secondary.push(it.when);
      if(secondary.length){
        html += '<div style="margin-top:3px;font-size:12px;font-weight:400;color:#aeb8c2;line-height:1.7;text-align:right">' + secondary.join(' · ') + '</div>';
      }

      if(p != null){
        html += '<div style="display:flex;align-items:center;gap:9px;margin-top:7px">';
        html += '<div style="flex:1;height:3px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden;direction:ltr">';
        html += '<div style="height:100%;width:' + p.toFixed(1) + '%;background:#72bd91;border-radius:999px"></div></div>';
        html += '<span style="font-size:10px;color:#aeb8c2;white-space:nowrap">' + p.toFixed(0) + '%</span>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  async function fillTimingDetails(){
    var el = $("stTimingDetails");
    if(!el) return;
    var localItems = listTimingKeys();
    var n = localItems.length;
    var bytes = 0;
    for(var i = 0; i < localItems.length; i++) bytes += Number(localItems[i].bytes) || 0;
    try{
      var cacheRows = await listCacheEntries(TIMING_CACHE);
      n += cacheRows.length;
      for(var j = 0; j < cacheRows.length; j++) bytes += Number(cacheRows[j].bytes) || 0;
    }catch(e){}
    if(n < 1){
      el.innerHTML = '<div style="opacity:.7;padding:8px 4px">لا توجد بيانات.</div>';
      return;
    }
    el.innerHTML = '<div style="padding:10px 4px;opacity:.85;line-height:1.7">محفوظ للأوفلاين · ' + n + ' عنصر · ' + fmtSize(bytes) + '</div>';
  }

  var detailsLoaded = Object.create(null);

  function bindDetailToggles(){
    var btns = document.querySelectorAll("#storageManagePopup .st-cat-toggle");
    for(var i = 0; i < btns.length; i++){
      (function(btn){
        if(btn.__stBound) return;
        btn.__stBound = true;
        btn.addEventListener("click", function(){
          var cat = btn.getAttribute("data-cat");
          var map = {
            pages: "stPagesDetails",
            audio: "stAudioDetails",
            partial: "stPartialDetails",
            timing: "stTimingDetails"
          };
          var id = map[cat];
          var panel = id ? $(id) : null;
          if(!panel) return;
          var open = panel.style.display === "none" || !panel.style.display;
          /* أغلق الباقي */
          var all = document.querySelectorAll("#storageManagePopup .st-details");
          for(var j = 0; j < all.length; j++) all[j].style.display = "none";
          var marks = document.querySelectorAll("#storageManagePopup .st-cat-toggle small");
          for(var k = 0; k < marks.length; k++) marks[k].textContent = "▸";
          if(open){
            panel.style.display = "block";
            var sm = btn.querySelector("small");
            if(sm) sm.textContent = "▾";
            if(!detailsLoaded[cat]){
              detailsLoaded[cat] = true;
              if(cat === "pages") fillPagesDetails();
              else if(cat === "audio") fillAudioDetails();
              else if(cat === "partial") fillPartialDetails();
              else if(cat === "timing") fillTimingDetails();
            }else{
              /* أعد التحميل دائماً ليعكس المسح */
              if(cat === "pages") fillPagesDetails();
              else if(cat === "audio") fillAudioDetails();
              else if(cat === "partial") fillPartialDetails();
              else if(cat === "timing") fillTimingDetails();
            }
          }
        });
      })(btns[i]);
    }
  }

  async function refreshStats(){
    var st = $("stStatus");
    if(st) st.textContent = "جاري حساب المساحة…";
    detailsLoaded = Object.create(null);
    var pages = await cacheSize(PAGE_CACHE);
    var audio = await cacheSize(AUDIO_CACHE);
    var partial = await partialSize();
    var timing = await timingLocalSize();
    var sum = pages.bytes + audio.bytes + partial.bytes + timing.bytes;
    if($("stPages")) $("stPages").textContent = fmtSize(pages.bytes) + (pages.count ? " · " + pages.count + " ملف" : "");
    if($("stAudio")) $("stAudio").textContent = fmtSize(audio.bytes) + (audio.count ? " · " + audio.count + " ملف" : "");
    if($("stPartial")) $("stPartial").textContent = fmtSize(partial.bytes) + (partial.count ? " · " + partial.count + " مقطع" : "");
    if($("stTiming")) $("stTiming").textContent = fmtSize(timing.bytes) + (timing.count ? " · " + timing.count + " عنصر" : "");
    if($("stTotal")) $("stTotal").textContent = fmtSize(sum);
    /* أخفِ التفاصيل المفتوحة وأعد ربط الأزرار */
    try{
      var all = document.querySelectorAll("#storageManagePopup .st-details");
      for(var j = 0; j < all.length; j++){
        all[j].style.display = "none";
        all[j].innerHTML = "";
      }
      var marks = document.querySelectorAll("#storageManagePopup .st-cat-toggle small");
      for(var k = 0; k < marks.length; k++) marks[k].textContent = "▸";
    }catch(e){}
    bindDetailToggles();
    if(st) st.textContent = sum > 0 ? "اضغط قسماً لعرض تفاصيل كل تنزيل. يمكنك المسح دون فقدان الإعدادات." : "لا توجد ملفات منزّلة حالياً.";
  }

  async function clearCache(name){
    try{ await caches.delete(name); }catch(e){}
    try{ await caches.open(name); }catch(e){}
  }

  async function clearPartials(){
    try{
      var db = await openIdb();
      await new Promise(function(resolve){
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(){ resolve(); };
      });
    }catch(e){}
    try{
      var keys = [];
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(k && k.indexOf("ayaPartialMax:") === 0) keys.push(k);
      }
      keys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    }catch(e){}
  }

  async function clearTimingLocal(){
    try{ await caches.delete(TIMING_CACHE); }catch(e){}
    try{
      var keys = [];
      for(var i=0;i<localStorage.length;i++){
        var k = localStorage.key(i);
        if(k && (k.indexOf("ayaTiming:") === 0 || k.indexOf("ayaViewBox:") === 0)) keys.push(k);
      }
      keys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    }catch(e){}
  }

  function forceHideSplash(){
    try{
      var sp = document.getElementById("splashScreen");
      if(!sp) return;
      sp.classList.add("hide");
      sp.style.cssText = "display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;z-index:-1!important;position:fixed!important;inset:0;width:0!important;height:0!important;overflow:hidden!important;";
      sp.setAttribute("aria-hidden", "true");
      try{ sp.replaceChildren(); }catch(e){}
      try{ if(sp.parentNode) sp.parentNode.removeChild(sp); }catch(e){}
    }catch(e){}
  }
  function openPopup(){
    forceHideSplash();
    try{ document.body.classList.add("storage-popup-open"); }catch(e){}
    try{ document.body.classList.add("aya-storage-from-settings"); }catch(e){}
    var p = $("storageManagePopup");
    if(!p) return;
    p.classList.add("show");
    try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
    refreshStats();
  }
  function closePopup(){
    var p = $("storageManagePopup");
    if(p) p.classList.remove("show");
    try{ document.body.classList.remove("storage-popup-open"); }catch(e){}
    try{ document.body.classList.remove("aya-storage-from-settings"); }catch(e){}
    forceHideSplash();
  }

  var btn = $("storageManageButton");
  if(btn) btn.addEventListener("click", openPopup);
  var closeBtn = $("storageManageClose");
  if(closeBtn) closeBtn.addEventListener("click", closePopup);
  var pop = $("storageManagePopup");
  if(pop) pop.addEventListener("click", function(e){ if(e.target === pop) closePopup(); });

  function bindClear(id, fn, label){
    var el = $(id);
    if(!el) return;
    el.addEventListener("click", async function(){
      if(!confirm(label)) return;
      var st = $("stStatus");
      if(st) st.textContent = "جاري المسح…";
      try{ await fn(); }catch(e){}
      await refreshStats();
      if(st) st.textContent = "تم المسح.";
    });
  }

  bindClear("stClearPages", function(){ return clearCache(PAGE_CACHE); }, "مسح صفحات المصحف المنزّلة؟");
  bindClear("stClearAudio", function(){ return clearCache(AUDIO_CACHE); }, "مسح التلاوات الكاملة المنزّلة؟");
  bindClear("stClearPartial", function(){ return clearPartials(); }, "مسح مقاطع التلاوة التدريجية؟");
  bindClear("stClearTiming", function(){ return clearTimingLocal(); }, "مسح بيانات التوقيت المحفوظة؟");
  bindClear("stClearAll", async function(){
    await clearCache(PAGE_CACHE);
    await clearCache(AUDIO_CACHE);
    await clearCache(TIMING_CACHE);
    await clearPartials();
    await clearTimingLocal();
  }, "مسح كل الملفات المنزّلة؟ (لن تُحذف الإعدادات أو العلامات)");

  async function fillAboutStorage(){
    try{
      var pages = await cacheSize(PAGE_CACHE);
      var audio = await cacheSize(AUDIO_CACHE);
      var partial = await partialSize();
      var timing = await timingLocalSize();
      var sum = pages.bytes + audio.bytes + partial.bytes + timing.bytes;
      var other = partial.bytes + timing.bytes;
      var t = document.getElementById("aboutStTotal");
      var p = document.getElementById("aboutStPages");
      var a = document.getElementById("aboutStAudio");
      var o = document.getElementById("aboutStOther");
      if(t) t.textContent = fmtSize(sum);
      if(p) p.textContent = fmtSize(pages.bytes);
      if(a) a.textContent = fmtSize(audio.bytes);
      if(o) o.textContent = fmtSize(other);
    }catch(e){}
  }

  try{
    window.__ayaOpenStorageManager = openPopup;
    window.__ayaRefreshAboutStorage = fillAboutStorage;
  }catch(e){}

  var aboutBtn = document.getElementById("aboutStorageManageBtn");
  if(aboutBtn){
    aboutBtn.addEventListener("click", function(){
      try{
        var about = document.getElementById("aboutOverlay");
        if(about) about.classList.remove("show");
      }catch(e){}
      openPopup();
    });
  }

  /* فتح إدارة المساحة من أندرويد: ?storage=1 أو localStorage أو استدعاء أصلي */
  var storageMenuButton = document.getElementById("storageManageMenuButton");
  if(storageMenuButton) storageMenuButton.addEventListener("click", function(){
    try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
    if(typeof window.__ayaOpenStorageManager === "function") window.__ayaOpenStorageManager();
  });
  function shouldOpenStorage(){
    try{
      var q = (location.search || "").replace(/^\?/, "");
      var params = new URLSearchParams(q);
      if(params.get("storage") === "1" || params.get("manageSpace") === "1") return true;
      if((location.hash || "").indexOf("storage") >= 0) return true;
    }catch(e){}
    try{
      if(localStorage.getItem("aya_open_storage") === "1") return true;
      if(sessionStorage.getItem("aya_open_storage") === "1") return true;
    }catch(e){}
    return false;
  }
  function clearStorageFlag(){
    try{ localStorage.removeItem("aya_open_storage"); }catch(e){}
    try{ sessionStorage.removeItem("aya_open_storage"); }catch(e){}
  }
  function maskAppForStorage(){
    try{ forceHideSplash(); }catch(e){}
  }
  function openStorageNow(){
    maskAppForStorage();
    try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
    try{ openPopup(); }catch(e){}
  }
  function tryOpenStorageManager(force){
    if(!force && !shouldOpenStorage()) return false;
    try{ document.body.classList.add("aya-storage-from-settings"); }catch(e){}
    forceHideSplash();
    maskAppForStorage();
    clearStorageFlag();
    openStorageNow();
    setTimeout(openStorageNow, 300);
    setTimeout(openStorageNow, 900);
    setTimeout(openStorageNow, 1800);
    return true;
  }
  /* أندرويد قد يضبط العلم بعد تحميل الصفحة */
  try{
    if(localStorage.getItem("aya_open_storage") === "1" || sessionStorage.getItem("aya_open_storage") === "1"){
      forceHideSplash();
    }
  }catch(e){}

  var storagePoll = 0;
  var storageTimer = setInterval(function(){
    storagePoll++;
    if(shouldOpenStorage()){
      tryOpenStorageManager(true);
      clearInterval(storageTimer);
    }
    if(storagePoll > 40) clearInterval(storageTimer);
  }, 400);
  if(document.readyState === "complete") tryOpenStorageManager(false);
  else window.addEventListener("load", function(){ tryOpenStorageManager(false); });

  try{
    window.__ayaOpenStorageManager = openPopup;
    window.__ayaRequestStorageManager = function(){
      try{ localStorage.setItem("aya_open_storage", "1"); }catch(e){}
      tryOpenStorageManager(true);
    };
  }catch(e){}
})();
