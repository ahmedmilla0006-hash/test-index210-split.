(function(){
  var SURAH_NAMES = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];

  function surahName(n){
    n = Number(n) || 1;
    try{ if(typeof surahs !== "undefined" && surahs[n-1]) return surahs[n-1][0]; }catch(e){}
    return SURAH_NAMES[n-1] || ("سورة " + n);
  }
  function isListenOnly(key){
    try{ return !!(RECITERS && RECITERS[key] && RECITERS[key].listenOnly); }catch(e){ return false; }
  }
  function fmt(t){
    t = Math.max(0, Math.floor(Number(t) || 0));
    return Math.floor(t/60) + ":" + String(t%60).padStart(2,"0");
  }
  function getAudioEl(){
    return document.getElementById("audio") || (typeof audio !== "undefined" ? audio : null);
  }
  function getSurah(){
    try{
      return Number(currentAudioSurah || (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 1)) || 1;
    }catch(e){ return 1; }
  }
  function setStatus(msg){
    var el = document.getElementById("lopStatus");
    if(el) el.textContent = msg || "";
  }
  function setPlayIcon(symbol){
    var play = document.getElementById("lopPlay");
    if(!play) return;
    play.classList.remove("is-loading");
    play.textContent = symbol;
  }
  function setLoading(on){
    var play = document.getElementById("lopPlay");
    if(!play) return;
    if(on){
      play.classList.add("is-loading");
      if(!play.textContent) play.textContent = "▶";
    }else play.classList.remove("is-loading");
  }
  function syncLopUI(){
    var rn = document.getElementById("lopReaderName");
    var sl = document.getElementById("lopSurahLabel");
    try{
      if(rn) rn.textContent = (RECITERS[selectedReader] && RECITERS[selectedReader].name) || selectedReader || "—";
    }catch(e){}
    try{
      var sn = getSurah();
      if(sl) sl.textContent = sn + " - " + surahName(sn);
    }catch(e){}
    var a = getAudioEl();
    var play = document.getElementById("lopPlay");
    if(play && a && !play.classList.contains("is-loading")){
      play.textContent = a.paused ? "▶" : "Ⅱ";
    }
  }

  /* السور المتوفرة لهذا القارئ فقط */
  function getAvailableSurahs(key){
    key = key || selectedReader;
    try{
      var r = RECITERS && RECITERS[key];
      if(r && Array.isArray(r.availableSurahs) && r.availableSurahs.length){
        return r.availableSurahs.map(Number).filter(function(n){ return n >= 1 && n <= 114; });
      }
    }catch(e){}
    var all = [];
    for(var i = 1; i <= 114; i++) all.push(i);
    return all;
  }
  function isSurahAvailable(n, key){
    n = Number(n);
    return getAvailableSurahs(key).indexOf(n) >= 0;
  }
  function nearestAvailable(n, key){
    var list = getAvailableSurahs(key);
    if(!list.length) return 1;
    n = Number(n) || 1;
    if(list.indexOf(n) >= 0) return n;
    var best = list[0], bestD = Math.abs(list[0] - n);
    for(var i = 1; i < list.length; i++){
      var d = Math.abs(list[i] - n);
      if(d < bestD){ bestD = d; best = list[i]; }
    }
    return best;
  }
  function nextAvailable(n, dir){
    var list = getAvailableSurahs();
    if(!list.length) return 1;
    n = Number(n) || list[0];
    var idx = list.indexOf(n);
    if(idx < 0){
      /* ابحث أقرب ثم تحرّك */
      n = nearestAvailable(n);
      idx = list.indexOf(n);
    }
    if(dir > 0) return list[(idx + 1) % list.length];
    return list[(idx - 1 + list.length) % list.length];
  }

  function buildUrl(surahNum){
    var n = Math.max(1, Math.min(114, Number(surahNum) || 1));
    var reader = null;
    try{ reader = RECITERS[selectedReader]; }catch(e){}
    if(!reader || !reader.server) return "";
    var base = String(reader.server).replace(/\/?$/, "/");
    var nn = String(n).padStart(3, "0");
    if(reader.filePattern){
      return base + String(reader.filePattern).replace("{n}", nn).replace("{nn}", nn).replace("{N}", String(n));
    }
    return base + nn + ".mp3";
  }

  /* تشغيل التلاوات التي تم تنزيلها من Cache Storage أولاً.
     هذا مهم لوضع الاستماع فقط، لأن تعيين audio.src مباشرة لا يمر عبر Cache API. */
  async function offlineAudioUrl(url){
    try{
      if(!url) return url;
      var offline = false;
      try{ offline = (typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}

      /* 1) كاش التلاوات الكاملة فقط — آمن مع البث */
      if(typeof caches !== "undefined"){
        try{
          var cache = await caches.open("aya-audio-v1");
          var hit = await cache.match(url);
          if(hit){
            var blob = await hit.blob();
            if(blob && blob.size){
              return URL.createObjectURL(new Blob([blob], {type: "audio/mpeg"}));
            }
          }
        }catch(e){}
      }

      /* 2) مقطع جزئي: أوفلاين فقط (أونلاين يقطع البث) */
      if(offline){
        try{
          if(window.__ayaAutoOffline && typeof window.__ayaAutoOffline.resolveLocal === "function"){
            var local = await window.__ayaAutoOffline.resolveLocal(url);
            if(local) return local;
          }
        }catch(e){}
      }
      return url;
    }catch(e){
      return url;
    }
  }

  async function assignSrc(a, url){
    try{ a.pause(); }catch(e){}
    try{ a.removeAttribute("src"); }catch(e){}
    try{ a.preload = "auto"; }catch(e){}

    var localUrl = null;
    try{
      localUrl = await offlineAudioUrl(url);
      if(localUrl === url) localUrl = null;
    }catch(e){ localUrl = null; }

    var finalSrc = localUrl || url;
    try{
      var proto = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
      if(proto && proto.set) proto.set.call(a, finalSrc);
      else a.src = finalSrc;
    }catch(e){
      try{ a.src = finalSrc; }catch(e2){}
    }
    try{ a.load(); }catch(e){}
    /* لا تبديل لاحق للمصدر أثناء التشغيل — كان سبب التقطيع أونلاين */
    return finalSrc;
  }

  var lopToken = 0;
  var lopWantPlay = false;

  function doPlay(a, token){
    if(token != null && token !== lopToken) return;
    try{ if(typeof userWantsPlay !== "undefined") userWantsPlay = true; }catch(e){}
    setStatus("جاري التشغيل…");
    var p;
    try{ p = a.play(); }catch(e){
      setPlayIcon("▶");
      setStatus("اضغط ▶ للتشغيل");
      return;
    }
    if(p && typeof p.then === "function"){
      p.then(function(){
        if(token != null && token !== lopToken) return;
        setPlayIcon("Ⅱ");
        setStatus("");
      }).catch(function(){
        if(token != null && token !== lopToken) return;
        setPlayIcon("▶");
        setStatus("اضغط ▶ مرة أخرى للتشغيل");
      });
    }else{
      setPlayIcon(a.paused ? "▶" : "Ⅱ");
      setStatus("");
    }
  }

  function loadAndPlaySurah(n, wantPlay){
    n = nearestAvailable(n);
    var a = getAudioEl();
    if(!a){ setStatus("عنصر الصوت غير موجود"); return; }
    try{ currentAudioSurah = n; }catch(e){}
    syncLopUI();

    var url = buildUrl(n);
    if(!url){
      setStatus("تعذر بناء رابط التلاوة");
      setPlayIcon("▶");
      return;
    }

    var token = ++lopToken;
    lopWantPlay = !!wantPlay;
    setLoading(true);
    setStatus(wantPlay ? "جاري التحميل…" : "جاري تجهيز الصوت…");

    var done = false;
    function finishOk(){
      if(token !== lopToken) return;
      setLoading(false);
      setStatus("");
      if(lopWantPlay) doPlay(a, token);
      else setPlayIcon("▶");
    }
    function finishErr(msg){
      if(token !== lopToken) return;
      setLoading(false);
      setPlayIcon("▶");
      setStatus(msg || "تعذر تحميل التلاوة");
    }
    function onReady(){
      if(done || token !== lopToken) return;
      done = true; cleanup(); finishOk();
    }
    function onError(){
      if(done || token !== lopToken) return;
      done = true; cleanup();
      finishErr("هذه السورة غير متوفرة لهذا القارئ");
    }
    function cleanup(){
      try{ a.removeEventListener("loadedmetadata", onReady); }catch(e){}
      try{ a.removeEventListener("canplay", onReady); }catch(e){}
      try{ a.removeEventListener("error", onError); }catch(e){}
    }
    a.addEventListener("loadedmetadata", onReady);
    a.addEventListener("canplay", onReady);
    a.addEventListener("error", onError);

    assignSrc(a, url).catch(function(){ onError(); });

    /* تشغيل مبكر جداً — لا تنتظر اكتمال التحميل */
    if(lopWantPlay){
      setTimeout(function(){
        if(token !== lopToken || done) return;
        doPlay(a, token);
      }, 50);
    }
    setTimeout(function(){
      if(token !== lopToken || done) return;
      if(a.readyState >= 1) onReady();
      else if(lopWantPlay) doPlay(a, token);
    }, 200);
    setTimeout(function(){
      if(token !== lopToken || done) return;
      if(a.readyState >= 1) onReady();
      else if(lopWantPlay){
        done = true; cleanup(); setLoading(false); doPlay(a, token);
      }else{
        setLoading(false);
        setPlayIcon("▶");
        setStatus("اضغط تشغيل عند جاهزية الصوت");
      }
    }, 1500);

    try{
      var ss = document.getElementById("surahSelect");
      if(ss) ss.value = String(n);
    }catch(e){}
  }

  /* قائمة سور مفلترة داخل نافذة السور الزجاجية */
  function openFilteredSurahPicker(){
    var list = document.getElementById("surahPickerList");
    var ov = document.getElementById("surahPickerOverlay");
    if(!list || !ov){
      /* احتياطي: نافذة بسيطة */
      openInlineSurahList();
      return;
    }
    var available = getAvailableSurahs();
    var current = String(getSurah());
    list.innerHTML = "";
    available.forEach(function(n){
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-item" + (String(n) === current ? " glass-selected" : "");
      btn.textContent = n + " - " + surahName(n);
      btn.setAttribute("data-surah", String(n));
      btn.onclick = function(){
        loadAndPlaySurah(n, true);
        try{ ov.classList.remove("show"); ov.removeAttribute("style"); }catch(e){}
      };
      list.appendChild(btn);
    });
    /* عنوان يوضح العدد */
    try{
      var h = ov.querySelector(".popup-header h2");
      if(h) h.textContent = "السور المتوفرة (" + available.length + ")";
    }catch(e){}
    ov.classList.add("show");
    try{
      ov.style.setProperty("display", "flex", "important");
      ov.style.setProperty("z-index", "520", "important");
      ov.style.setProperty("align-items", "center", "important");
      ov.style.setProperty("justify-content", "center", "important");
    }catch(e){}
    list.scrollTop = 0;
  }

  function openInlineSurahList(){
    /* نادر */
    var available = getAvailableSurahs();
    var n = prompt("رقم السورة المتوفرة:\n" + available.slice(0,20).join(", ") + "...");
    if(n) loadAndPlaySurah(Number(n), true);
  }

  function enterListenOnlyMode(){
    document.body.classList.add("listen-only-mode");
    var root = document.getElementById("listenOnlyPlayer");
    if(root) root.setAttribute("aria-hidden", "false");
    try{ if(typeof clearAyahHighlight === "function") clearAyahHighlight(); }catch(e){}
    try{ currentTiming = []; }catch(e){}
    try{ pageHitTiming = []; }catch(e){}
    var sn = nearestAvailable(getSurah());
    try{ currentAudioSurah = sn; }catch(e){}
    syncLopUI();
    loadAndPlaySurah(sn, false);
  }

  function exitListenOnlyMode(){
    document.body.classList.remove("listen-only-mode");
    var root = document.getElementById("listenOnlyPlayer");
    if(root) root.setAttribute("aria-hidden", "true");
    try{ var a = getAudioEl(); if(a) a.pause(); }catch(e){}
    setStatus("");
    /* أعد عنوان نافذة السور */
    try{
      var ov = document.getElementById("surahPickerOverlay");
      var h = ov && ov.querySelector(".popup-header h2");
      if(h) h.textContent = "اختيار السورة";
    }catch(e){}
    if(isListenOnly(selectedReader)){
      var fallback = (RECITERS && RECITERS.minshawi) ? "minshawi" : "shatri";
      try{ selectedReader = fallback; localStorage.setItem("quranReader", fallback); }catch(e){}
      var sel = document.getElementById("readerSelect");
      if(sel){ try{ sel.value = fallback; }catch(e){} }
      try{ if(typeof updateReaderName === "function") updateReaderName(); }catch(e){}
    }
    try{ if(typeof loadPage === "function") loadPage(currentPage || 1, { keepAudio: false }); }catch(e){}
  }

  function applyListenOnlyMode(){
    if(isListenOnly(selectedReader)) enterListenOnlyMode();
    else if(document.body.classList.contains("listen-only-mode")){
      document.body.classList.remove("listen-only-mode");
      var root = document.getElementById("listenOnlyPlayer");
      if(root) root.setAttribute("aria-hidden", "true");
    }
  }

  function selectListenReader(key){
    if(!RECITERS[key]) return;
    try{ selectedReader = key; localStorage.setItem("quranReader", key); }catch(e){}
    var sel = document.getElementById("readerSelect");
    if(sel){
      /* القارئ للاستماع فقط لا يُضاف أبداً إلى قائمة قراء التظليل */
      if(!isListenOnly(key)) {
        try{ sel.value = key; }catch(e){}
      }
    }
    try{ if(typeof updateReaderName === "function") updateReaderName(); }catch(e){}
    enterListenOnlyMode();
  }

  function buildListenOnlyList(){
    var list = document.getElementById("listenOnlyPickerList");
    if(!list) return;
    list.innerHTML = "";
    Object.keys(RECITERS || {}).forEach(function(key){
      var r = RECITERS[key];
      /* قسم الاستماع فقط: لا توقيت ولا تظليل */
      if(!r || !r.listenOnly || Number.isFinite(Number(r.timingId))) return;
      var avail = getAvailableSurahs(key);
      var extra = (avail.length < 114) ? (" — " + avail.length + " سورة") : "";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-item" + (key === selectedReader ? " glass-selected" : "");
      btn.innerHTML = (r.name || key) + '<small style="display:block;margin-top:4px">استماع فقط' + extra + "</small>";
      btn.onclick = function(){
        selectListenReader(key);
        closeListenOnlyPicker();
        try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
      };
      list.appendChild(btn);
    });
  }

  function openListenOnlyPicker(){
    var ov = document.getElementById("listenOnlyPickerOverlay");
    if(!ov) return;
    buildListenOnlyList();
    ov.classList.add("show");
    try{
      ov.style.setProperty("display", "flex", "important");
      ov.style.setProperty("z-index", "500", "important");
      ov.style.setProperty("align-items", "center", "important");
      ov.style.setProperty("justify-content", "center", "important");
    }catch(e){}
    try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
  }
  function closeListenOnlyPicker(){
    var ov = document.getElementById("listenOnlyPickerOverlay");
    if(!ov) return;
    ov.classList.remove("show");
    try{ ov.removeAttribute("style"); }catch(e){}
  }

  function bindPlayer(){
    var play = document.getElementById("lopPlay");
    var prev = document.getElementById("lopPrevSurah");
    var next = document.getElementById("lopNextSurah");
    var mainNextSurah = document.getElementById("nextSurahButton");
    var prog = document.getElementById("lopProgress");
    var cur = document.getElementById("lopCurrent");
    var dur = document.getElementById("lopDuration");
    var surahBtn = document.getElementById("lopSurahBtn");
    var changeR = document.getElementById("lopChangeReader");
    var back = document.getElementById("lopBackToMushaf");

    if(play) play.onclick = function(){
      var a = getAudioEl();
      if(!a){ setStatus("عنصر الصوت غير موجود"); return; }
      if(!a.paused){
        try{ if(typeof userWantsPlay !== "undefined") userWantsPlay = false; }catch(e){}
        try{ a.pause(); }catch(e){}
        setPlayIcon("▶");
        setStatus("");
        return;
      }
      var hasSrc = false;
      try{
        hasSrc = !!(a.currentSrc || a.getAttribute("src"));
        if(hasSrc && (a.currentSrc === window.location.href || a.getAttribute("src") === "")) hasSrc = false;
      }catch(e){}
      if(!hasSrc || a.readyState < 1 || a.error){
        loadAndPlaySurah(getSurah(), true);
        return;
      }
      lopWantPlay = true;
      doPlay(a, lopToken);
    };

    if(prev) prev.onclick = function(){
      loadAndPlaySurah(nextAvailable(getSurah(), -1), true);
    };
    if(next) next.onclick = function(){
      loadAndPlaySurah(nextAvailable(getSurah(), +1), true);
    };
    if(mainNextSurah) mainNextSurah.onclick = function(){
      loadAndPlaySurah(nextAvailable(getSurah(), +1), true);
    };
    if(surahBtn) surahBtn.onclick = function(){
      openFilteredSurahPicker();
    };
    if(changeR) changeR.onclick = openListenOnlyPicker;
    if(back) back.onclick = exitListenOnlyMode;

    if(prog && !prog.__lopBound){
      prog.__lopBound = true;
      var dragging = false;
      function clientXFrom(e){
        if(e.touches && e.touches.length) return e.touches[0].clientX;
        if(e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
        return e.clientX;
      }
      function seekLop(e){
        var a = getAudioEl();
        if(!a) return;
        var d = Number(a.duration);
        if(!d || !isFinite(d) || d <= 0) return;
        var rect = prog.getBoundingClientRect();
        if(!rect.width) return;
        var ratio = Math.max(0, Math.min(1, (rect.right - clientXFrom(e)) / rect.width));
        try{ a.currentTime = ratio * d; }catch(err){}
        try{
          prog.value = ratio * 100;
          if(cur) cur.textContent = fmt(a.currentTime);
        }catch(err){}
      }
      try{ prog.style.cursor = "pointer"; prog.style.touchAction = "none"; }catch(err){}
      prog.addEventListener("click", function(e){ seekLop(e); });
      prog.addEventListener("pointerdown", function(e){
        dragging = true;
        try{ prog.setPointerCapture(e.pointerId); }catch(err){}
        seekLop(e);
        e.preventDefault();
        e.stopPropagation();
      });
      prog.addEventListener("pointermove", function(e){
        if(!dragging) return;
        seekLop(e);
        e.preventDefault();
      });
      function endDrag(e){
        if(!dragging) return;
        dragging = false;
        seekLop(e);
      }
      prog.addEventListener("pointerup", endDrag);
      prog.addEventListener("pointercancel", function(){ dragging = false; });
      prog.addEventListener("touchstart", function(e){
        dragging = true;
        seekLop(e);
        e.preventDefault();
      }, {passive:false});
      prog.addEventListener("touchmove", function(e){
        if(!dragging) return;
        seekLop(e);
        e.preventDefault();
      }, {passive:false});
      prog.addEventListener("touchend", function(e){
        if(!dragging) return;
        dragging = false;
        seekLop(e);
      });
    }

    var a = getAudioEl();
    if(a && !a.__lopTimeBound){
      a.__lopTimeBound = true;
      a.addEventListener("timeupdate", function(){
        if(!document.body.classList.contains("listen-only-mode")) return;
        try{
          if(cur) cur.textContent = fmt(a.currentTime);
          if(dur) dur.textContent = fmt(a.duration || 0);
          if(prog && a.duration) prog.value = (a.currentTime / a.duration) * 100;
        }catch(e){}
      });
      a.addEventListener("play", function(){
        if(!document.body.classList.contains("listen-only-mode")) return;
        setPlayIcon("Ⅱ"); setStatus("");
      });
      a.addEventListener("pause", function(){
        if(!document.body.classList.contains("listen-only-mode")) return;
        var p = document.getElementById("lopPlay");
        if(p && !p.classList.contains("is-loading")) setPlayIcon("▶");
      });
      a.addEventListener("ended", function(){
        if(!document.body.classList.contains("listen-only-mode")) return;
        /* نهاية مقطع جزئي: لا تنتقل للسورة التالية */
        try{
          var maxSec = Number(a.__ayaPartialMaxSec) || 0;
          if(maxSec > 0.5 && maxSec < 1e8){
            var online = true;
            try{ online = !(typeof navigator !== "undefined" && navigator.onLine === false); }catch(e){}
            var netUrl = "";
            try{
              var sn = getSurah();
              if(typeof buildUrl === "function") netUrl = buildUrl(sn) || "";
            }catch(e){}
            if(online && netUrl){
              var resumeAt = Math.max(0, Math.min(maxSec - 0.15, Number(a.currentTime) || maxSec));
              try{ a.__ayaPartialMaxSec = 0; }catch(e){}
              try{ a.__ayaForceNet = true; }catch(e){}
              setStatus("إكمال التلاوة من الشبكة…");
              var onMeta = function(){
                try{ a.removeEventListener("loadedmetadata", onMeta); }catch(e){}
                try{ if(resumeAt > 0.2) a.currentTime = resumeAt; }catch(e){}
                try{ a.play().catch(function(){}); }catch(e){}
                setStatus("");
              };
              a.addEventListener("loadedmetadata", onMeta);
              try{ a.src = netUrl; a.load(); }catch(e){}
              setTimeout(onMeta, 120);
              return;
            }
            setPlayIcon("▶");
            setStatus("انتهى الجزء المحفوظ — يلزم اتصال لإكمال السورة");
            return;
          }
        }catch(e){}
        if(typeof autoNextSurahEnabled !== "undefined" && !autoNextSurahEnabled){
          setPlayIcon("▶");
          setStatus("");
          return;
        }
        try{
          var cur = getSurah();
          var nxt = nextAvailable(cur, +1);
          setStatus("الانتقال إلى السورة " + nxt + "…");
          loadAndPlaySurah(nxt, true);
        }catch(e){
          try{ loadAndPlaySurah(getSurah() + 1, true); }catch(e2){}
        }
      });
      a.addEventListener("waiting", function(){
        if(!document.body.classList.contains("listen-only-mode")) return;
        setStatus("يُحمّل…");
      });
      a.addEventListener("playing", function(){
        if(!document.body.classList.contains("listen-only-mode")) return;
        setStatus(""); setPlayIcon("Ⅱ");
      });
    }

    var ss = document.getElementById("surahSelect");
    if(ss && !ss.__lopSurahBound){
      ss.__lopSurahBound = true;
      ss.addEventListener("change", function(){
        if(!document.body.classList.contains("listen-only-mode")) return;
        var n = Number(ss.value);
        if(n >= 1 && n <= 114){
          if(!isSurahAvailable(n)) n = nearestAvailable(n);
          loadAndPlaySurah(n, true);
        }
      });
    }
  }

  function bind(){
    var btn = document.getElementById("listenOnlyRecitersButton");
    var closeBtn = document.getElementById("listenOnlyPickerClose");
    var ov = document.getElementById("listenOnlyPickerOverlay");
    if(btn) btn.onclick = openListenOnlyPicker;
    if(closeBtn) closeBtn.onclick = closeListenOnlyPicker;
    if(ov) ov.addEventListener("click", function(e){ if(e.target === ov) closeListenOnlyPicker(); });

    var sel = document.getElementById("readerSelect");
    if(sel && !sel.__listenOnlyBound){
      sel.__listenOnlyBound = true;
      sel.addEventListener("change", function(){ setTimeout(applyListenOnlyMode, 30); });
    }
    bindPlayer();
    try{
      if(isListenOnly(selectedReader)) setTimeout(enterListenOnlyMode, 500);
    }catch(e){}
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
  window.addEventListener("load", function(){ setTimeout(bind, 150); });
  window.__ayaOpenListenOnlyReciters = openListenOnlyPicker;
})();
