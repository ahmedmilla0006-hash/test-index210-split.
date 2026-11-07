/* قوائم القارئ والسورة الزجاجية بدل الـ select الأصلي */
(function(){
  function $(id){ return document.getElementById(id); }

  function openOverlay(el){
    if(!el) return;
    el.classList.add("show");
    el.classList.add("picker-fullscreen");
    try{
      /* قائمة القارئ/السورة في المشغّل: 90% من الشاشة وليس 100% */
      el.style.setProperty("display", "flex", "important");
      el.style.setProperty("align-items", "center", "important");
      el.style.setProperty("justify-content", "center", "important");
      el.style.setProperty("padding", "0", "important");
      el.style.setProperty("inset", "0", "important");
      el.style.setProperty("z-index", "400", "important");
      el.style.setProperty("pointer-events", "auto", "important");
      el.style.setProperty("background", "rgba(0,0,0,0.55)", "important");
      el.style.setProperty("backdrop-filter", "none", "important");
      el.style.setProperty("-webkit-backdrop-filter", "none", "important");
      var box = el.querySelector(".popup-box");
      if(box){
        box.style.setProperty("width", "90%", "important");
        box.style.setProperty("max-width", "90%", "important");
        box.style.setProperty("min-width", "0", "important");
        box.style.setProperty("height", "90%", "important");
        box.style.setProperty("max-height", "90%", "important");
        box.style.setProperty("min-height", "0", "important");
        box.style.setProperty("border-radius", "18px", "important");
        box.style.setProperty("margin", "0", "important");
        box.style.setProperty("display", "flex", "important");
        box.style.setProperty("flex-direction", "column", "important");
        box.style.setProperty("box-sizing", "border-box", "important");
        box.style.setProperty("pointer-events", "auto", "important");
        box.style.setProperty("padding", "14px 12px 16px", "important");
      }
      var list = el.querySelector(".popup-list");
      if(list){
        list.style.setProperty("flex", "1 1 auto", "important");
        list.style.setProperty("min-height", "0", "important");
        list.style.setProperty("overflow-y", "auto", "important");
        list.style.setProperty("pointer-events", "auto", "important");
      }
    }catch(e){}
  }
  function closeOverlay(el){
    if(!el) return;
    el.classList.remove("show");
    el.classList.remove("picker-fullscreen");
    try{
      el.removeAttribute("style");
      var box = el.querySelector(".popup-box");
      if(box) box.removeAttribute("style");
      var list = el.querySelector(".popup-list");
      if(list) list.removeAttribute("style");
    }catch(e){}
  }

  function syncReaderLabel(){
    const sel = $("readerSelect");
    const label = $("readerPickerLabel");
    if(!sel || !label) return;
    const opt = sel.options[sel.selectedIndex];
    label.textContent = (opt && opt.textContent) ? opt.textContent.trim() : "اختر القارئ";
  }

  function syncSurahLabel(){
    const sel = $("surahSelect");
    const label = $("surahPickerLabel");
    if(!sel || !label) return;
    const opt = sel.options[sel.selectedIndex];
    if(opt && opt.value){
      label.textContent = opt.textContent.trim();
    }else{
      /* حاول من currentAudioSurah أو رقم الصفحة */
      try{
        let n = Number(typeof currentAudioSurah !== "undefined" && currentAudioSurah
          ? currentAudioSurah
          : (typeof getSurahNumberForPage === "function"
              ? getSurahNumberForPage(typeof currentPage !== "undefined" ? currentPage : 1)
              : 0));
        if(n >= 1 && typeof surahs !== "undefined" && surahs[n-1]){
          label.textContent = n + " - " + surahs[n-1][0];
          return;
        }
      }catch(e){}
      label.textContent = "اختر السورة";
    }
  }

  function ensureSurahOptions(){
    const sel = $("surahSelect");
    if(!sel) return;
    /* إن كانت القائمة ناقصة أعد تعبئتها من surahs */
    if(typeof surahs === "undefined" || !Array.isArray(surahs)) return;
    if(sel.options.length >= 114) return;
    if(typeof populateDirectSurahSelector === "function"){
      try{ populateDirectSurahSelector(); }catch(e){}
    }
    if(sel.options.length < 114){
      sel.innerHTML = '<option value="">اختر السورة</option>';
      surahs.forEach(function(s, i){
        const o = document.createElement("option");
        o.value = String(i + 1);
        o.textContent = (i + 1) + " - " + s[0];
        sel.appendChild(o);
      });
    }
  }

  function buildReaderList(){
    const list = $("readerPickerList");
    const sel = $("readerSelect");
    if(!list || !sel) return;

    list.innerHTML = "";
    const current = selectedReader || sel.value;
    let selectedBtn = null;

    /*
     * قائمة قراء التظليل تُبنى مباشرة من RECITERS، وليس من خيارات select.
     * أي قارئ ليس listenOnly يظهر هنا، وبذلك لا يختفي السديس وبقية القراء
     * الذين لديهم timingId بسبب اختلاف محتوى القائمة القديمة.
     */
    Object.keys(RECITERS || {}).forEach(function(key){
      const r = RECITERS[key];
      if(!r || r.listenOnly) return;

      /* تأكد أن القارئ موجود أيضاً في select حتى تعمل آلية onchange الحالية. */
      let opt = Array.from(sel.options).find(function(o){ return o.value === key; });
      if(!opt){
        opt = document.createElement("option");
        opt.value = key;
        opt.textContent = r.name || key;
        sel.appendChild(opt);
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-item" + (key === current ? " glass-selected" : "");
      btn.textContent = r.name || key;

      btn.onclick = function(){
        /* غيّر القارئ فعلياً ثم شغّل نفس مسار التبديل الأصلي */
        selectedReader = key;
        try{ localStorage.setItem("quranReader", key); }catch(e){}
        sel.value = key;
        try{
          sel.dispatchEvent(new Event("change", { bubbles: true }));
        }catch(e){
          /* دعم WebView قديم */
          try{
            var ev = document.createEvent("HTMLEvents");
            ev.initEvent("change", true, false);
            sel.dispatchEvent(ev);
          }catch(e2){}
        }
        try{ syncReaderLabel(); }catch(e){}
        closeOverlay($("readerPickerOverlay"));
      };

      list.appendChild(btn);
      if(key === current) selectedBtn = btn;
    });

    requestAnimationFrame(function(){
      list.scrollTop = 0;
      if(selectedBtn){
        try{ selectedBtn.scrollIntoView({block:"nearest"}); }catch(e){}
      }
    });
  }

  function buildSurahList(){
    ensureSurahOptions();
    const list = $("surahPickerList");
    const sel = $("surahSelect");
    if(!list || !sel) return;
    list.innerHTML = "";
    const current = String(sel.value || "");
    let fallback = current;
    if(!fallback){
      try{
        fallback = String(
          (typeof currentAudioSurah !== "undefined" && currentAudioSurah)
            ? currentAudioSurah
            : (typeof getSurahNumberForPage === "function"
                ? getSurahNumberForPage(typeof currentPage !== "undefined" ? currentPage : 1)
                : "")
        );
      }catch(e){ fallback = ""; }
    }

    /* قائمة ثابتة من 1 إلى 114 — الفاتحة أولاً دائماً */
    var names = null;
    if(typeof surahs !== "undefined" && Array.isArray(surahs) && surahs.length >= 114){
      names = surahs.map(function(s){ return s[0]; });
    }
    if(!names || names.length < 114){
      names = [];
      for(var oi = 0; oi < sel.options.length; oi++){
        var op = sel.options[oi];
        if(!op.value) continue;
        names[parseInt(op.value, 10) - 1] = (op.textContent || "").replace(/^\d+\s*[-–—.]\s*/, "").trim();
      }
    }
    /* أسماء احتياطية إن نقصت */
    var fallbackNames = ["الفاتحة","البقرة","آل عمران","النساء","المائدة"];
    for(var n = 1; n <= 114; n++){
      var label = (names && names[n - 1]) ? names[n - 1] : (fallbackNames[n - 1] || ("سورة " + n));
      var num = String(n);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "popup-item" + (num === String(fallback) ? " glass-selected" : "");
      btn.textContent = num + " - " + label;
      btn.setAttribute("data-surah", num);
      (function(surahNum){
        btn.onclick = function(){
          ensureSurahOptions();
          sel.value = surahNum;
          try{ sel.dispatchEvent(new Event("change", { bubbles: true })); }catch(e){}
          syncSurahLabel();
          closeOverlay($("surahPickerOverlay"));
        };
      })(num);
      list.appendChild(btn);
    }
    /* ابدأ من أعلى القائمة حتى تظهر الفاتحة */
    list.scrollTop = 0;
    requestAnimationFrame(function(){
      list.scrollTop = 0;
      try{
        var first = list.querySelector('.popup-item[data-surah="1"]');
        if(first) first.scrollIntoView({ block: "start" });
        list.scrollTop = 0;
      }catch(e){}
    });
  }

  function bind(){
    const rBtn = $("readerPickerBtn");
    const sBtn = $("surahPickerBtn");
    const rOv = $("readerPickerOverlay");
    const sOv = $("surahPickerOverlay");
    const rClose = $("readerPickerClose");
    const sClose = $("surahPickerClose");
    const rSel = $("readerSelect");
    const sSel = $("surahSelect");

    if(rBtn) rBtn.onclick = function(){
      buildReaderList();
      openOverlay(rOv);
    };
    if(sBtn) sBtn.onclick = function(){
      buildSurahList();
      openOverlay(sOv);
    };
    if(rClose) rClose.onclick = function(){ closeOverlay(rOv); };
    if(sClose) sClose.onclick = function(){ closeOverlay(sOv); };
    if(rOv) rOv.addEventListener("click", function(e){ if(e.target === rOv) closeOverlay(rOv); });
    if(sOv) sOv.addEventListener("click", function(e){ if(e.target === sOv) closeOverlay(sOv); });

    if(rSel) rSel.addEventListener("change", syncReaderLabel);
    if(sSel) sSel.addEventListener("change", syncSurahLabel);

    const recitersBtn = $("recitersButton");
    if(recitersBtn){
      recitersBtn.onclick = function(){
        try{ if(typeof closeSideMenu === "function") closeSideMenu(); }catch(e){}
        buildReaderList();
        openOverlay(rOv);
      };
    }

    ensureSurahOptions();
    syncReaderLabel();
    syncSurahLabel();
    setTimeout(function(){ ensureSurahOptions(); syncSurahLabel(); }, 300);
    setTimeout(function(){ ensureSurahOptions(); syncSurahLabel(); }, 1000);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", bind);
  }else{
    bind();
  }
  window.addEventListener("load", function(){
    setTimeout(function(){
      ensureSurahOptions();
      syncReaderLabel();
      syncSurahLabel();
    }, 80);
  });
})();
