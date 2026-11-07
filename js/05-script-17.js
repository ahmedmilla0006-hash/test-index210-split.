/* =====================================================
   تشغيل في الخلفية + إشعار الوسائط (Media Session)
   للنسخة النهائية — مناسب لتغليف APK / WebView
===================================================== */
(function(){
  const audio = document.getElementById("audio");
  if(!audio) return;

  audio.setAttribute("playsinline", "");
  audio.setAttribute("webkit-playsinline", "");
  try{ audio.preload = "auto"; }catch(e){}

  let userWantsPlay = false;

  function nativeBridge(cmd, payload){
    try{
      if(window.AndroidInterface && typeof window.AndroidInterface.postMessage === "function"){
        window.AndroidInterface.postMessage(JSON.stringify({ cmd: cmd, data: payload || {} }));
        return true;
      }
    }catch(e){}
    try{
      if(window.Android && typeof window.Android.onMediaEvent === "function"){
        window.Android.onMediaEvent(cmd, JSON.stringify(payload || {}));
        return true;
      }
    }catch(e){}
    return false;
  }

  function reciterLabel(){
    try{
      const nameEl = document.getElementById("readerName");
      if(nameEl && nameEl.textContent.trim()) return nameEl.textContent.trim();
      const sel = document.getElementById("readerSelect");
      if(sel && sel.selectedOptions && sel.selectedOptions[0]){
        return sel.selectedOptions[0].textContent.trim();
      }
    }catch(e){}
    return "قارئ القرآن";
  }

  function surahLabel(){
    try{
      const n = Number(
        (typeof currentAudioSurah !== "undefined" && currentAudioSurah) ||
        (typeof getSurahNumberForPage === "function"
          ? getSurahNumberForPage(typeof currentPage !== "undefined" ? currentPage : 1)
          : 1)
      ) || 1;
      if(typeof surahs !== "undefined" && Array.isArray(surahs) && surahs[n - 1]){
        return "سورة " + surahs[n - 1][0];
      }
      return "سورة " + n;
    }catch(e){
      return "القرآن الكريم";
    }
  }

  function ayahHint(){
    try{
      if(typeof getActiveTiming === "function"){
        const a = getActiveTiming();
        if(a && a.ayah != null) return "الآية " + a.ayah;
      }
    }catch(e){}
    return "";
  }

  function fmtMediaTime(sec){
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function mediaPayload(){
    var pos = Number(audio.currentTime);
    var dur = Number(audio.duration);
    if(!Number.isFinite(pos) || pos < 0) pos = 0;
    if(!Number.isFinite(dur) || dur < 0) dur = 0;
    /* بعض المتصفحات تعطي Infinity قبل اكتمال البيانات */
    if(dur === Infinity) dur = 0;
    if(dur > 0 && pos > dur) pos = dur;
    return {
      title: surahLabel() + (ayahHint() ? " — " + ayahHint() : ""),
      artist: reciterLabel(),
      album: "آية",
      playing: !audio.paused,
      position: pos,
      duration: dur,
      positionSec: Math.floor(pos),
      durationSec: Math.floor(dur),
      positionText: fmtMediaTime(pos),
      durationText: fmtMediaTime(dur),
      playbackRate: audio.playbackRate || 1
    };
  }

  /* هل أُظهر إشعار التلاوة مسبقاً في هذه الجلسة؟ */
  var __mediaNotifActive = false;

  function updateMediaSession(){
    const payload = mediaPayload();
    payload.ongoing = !!payload.playing;
    var wants = false;
    try{ wants = !!userWantsPlay; }catch(e){ wants = false; }

    /*
      بعد إيقاف المستخدم: أخفِ الإشعار فقط إن كان قد ظهر من قبل.
      لا نرسل أوامر غريبة عند فتح التطبيق (قد توقف الطبقة الأصلية).
    */
    /*
      الإشعار يبقى عند الإيقاف.
      إن حذفه المستخدم يدوياً: الطبقة الأصلية لا تعيده إلا بعد media-play من التطبيق.
    */
    if(!payload.playing && !wants){
      if(__mediaNotifActive){
        try{ nativeBridge("media-pause", payload); }catch(e){}
        try{ nativeBridge("media-update", Object.assign({}, payload, { playing: false })); }catch(e){}
      }
      if("mediaSession" in navigator){
        try{ navigator.mediaSession.playbackState = "paused"; }catch(e){}
      }
      return;
    }

    if(payload.playing) __mediaNotifActive = true;

    nativeBridge(payload.playing ? "media-play" : "media-pause", payload);
    nativeBridge("media-update", payload);

    if(!("mediaSession" in navigator)) return;

    try{
      navigator.mediaSession.metadata = new MediaMetadata({
        title: payload.title,
        artist: payload.artist,
        album: "آية — القرآن الكريم",
        artwork: [
          {
            src: "https://www.mp3quran.net/images/logo.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      });
    }catch(e){
      try{
        navigator.mediaSession.metadata = new MediaMetadata({
          title: payload.title,
          artist: payload.artist,
          album: "آية"
        });
      }catch(e2){}
    }

    try{
      if(payload.duration > 0 && Number.isFinite(payload.duration)){
        navigator.mediaSession.setPositionState({
          duration: payload.duration,
          playbackRate: payload.playbackRate || 1,
          position: Math.max(0, Math.min(payload.position, payload.duration))
        });
      }
    }catch(e){}

    try{
      navigator.mediaSession.playbackState = payload.playing ? "playing" : "paused";
    }catch(e){}
  }

  function bindAction(action, fn){
    if(!("mediaSession" in navigator)) return;
    try{ navigator.mediaSession.setActionHandler(action, fn); }catch(e){}
  }

  var __notifPlayLockUntil = 0;

  function safePlay(){
    userWantsPlay = true;
    /* قفل قصير جداً فقط ضد pause عابر عند بدء التشغيل */
    __notifPlayLockUntil = Date.now() + 600;
    return audio.play().then(()=>{
      const pb = document.getElementById("playButton");
      if(pb) pb.textContent = "Ⅱ";
      updateMediaSession();
    }).catch(()=>{
      userWantsPlay = false;
      updateMediaSession();
    });
  }

  function safePause(){
    userWantsPlay = false;
    __notifPlayLockUntil = 0;
    try{ audio.pause(); }catch(e){}
    const pb = document.getElementById("playButton");
    if(pb) pb.textContent = "▶";
    try{ updateMediaSession(); }catch(e){}
  }

  audio.addEventListener("pause", function(){
    /* تبديل ملف الصوت عند التنقل بين الصفحات/السور/الأجزاء */
    try{
      if(window.__ayaAudioSourceSwitching){
        return;
      }
    }catch(e){}
    /*
      إن أوقف المستخدم التشغيل (من الإشعار أو الزر) بعد انتهاء قفل الاستئناف القصير
      نحفظ حالة الإيقاف ولا نعيد التشغيل.
    */
    if(Date.now() >= __notifPlayLockUntil){
      userWantsPlay = false;
      try{
        const pb = document.getElementById("playButton");
        if(pb && !pb.classList.contains("is-loading")) pb.textContent = "▶";
      }catch(e){}
      return;
    }
    /* قفل قصير فقط لحماية انقطاع عابر أثناء بدء التشغيل */
    if(userWantsPlay && audio.src){
      setTimeout(function(){
        if(userWantsPlay && audio.paused && Date.now() < __notifPlayLockUntil){
          audio.play().catch(function(){});
        }
      }, 50);
    }
  });

  bindAction("play", function(){ safePlay(); });
  bindAction("pause", function(){ safePause(); });
  bindAction("stop", function(){
    safePause();
    try{ audio.currentTime = 0; }catch(e){}
  });
  bindAction("previoustrack", function(){
    const b = document.getElementById("backButton");
    if(b) b.click();
    setTimeout(updateMediaSession, 120);
  });
  bindAction("nexttrack", function(){
    const b = document.getElementById("forwardButton");
    if(b) b.click();
    setTimeout(updateMediaSession, 120);
  });
  bindAction("seekbackward", function(d){
    const off = (d && d.seekOffset) || 10;
    try{ audio.currentTime = Math.max(0, (audio.currentTime || 0) - off); }catch(e){}
    updateMediaSession();
  });
  bindAction("seekforward", function(d){
    const off = (d && d.seekOffset) || 10;
    try{
      const t = (audio.currentTime || 0) + off;
      audio.currentTime = Math.min(audio.duration || t, t);
    }catch(e){}
    updateMediaSession();
  });
  bindAction("seekto", function(d){
    if(d && Number.isFinite(d.seekTime)){
      try{ audio.currentTime = d.seekTime; }catch(e){}
      updateMediaSession();
    }
  });

  window.__ayahMediaCommand = function(cmd){
    if(cmd === "play") safePlay();
    else if(cmd === "pause") safePause();
    else if(cmd === "toggle"){ if(audio.paused) safePlay(); else safePause(); }
    else if(cmd === "next"){
      const b = document.getElementById("forwardButton");
      if(b) b.click();
    }else if(cmd === "prev"){
      const b = document.getElementById("backButton");
      if(b) b.click();
    }
  };

  audio.addEventListener("play", function(){
    userWantsPlay = true;
    updateMediaSession();
  });
  audio.addEventListener("pause", updateMediaSession);
  audio.addEventListener("ended", updateMediaSession);
  audio.addEventListener("loadedmetadata", updateMediaSession);
  audio.addEventListener("durationchange", updateMediaSession);

  /* تحديث العداد في الإشعار أثناء التشغيل (كل ثانية) */
  setInterval(function(){
    if(!audio.paused) updateMediaSession();
  }, 1000);

  /* مزامنة أدق مع تقدم الصوت */
  var __mediaLastTu = 0;
  audio.addEventListener("timeupdate", function(){
    var now = Date.now();
    if(now - __mediaLastTu < 900) return;
    __mediaLastTu = now;
    updateMediaSession();
  });

  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "visible"){
      updateMediaSession();
      /* لا نستأنف التشغيل تلقائياً بعد الإيقاف من الإشعار أو التطبيق */
      try{
        var img = document.getElementById("page");
        if(img && (!img.complete || !img.naturalWidth) && typeof currentPage !== "undefined"){
          if(typeof loadPage === "function"){
            loadPage(currentPage, { keepAudio: true });
          }else if(typeof loadQuranPageFromInternet === "function"){
            loadQuranPageFromInternet(currentPage);
          }
        }
      }catch(e){}
    }else if(!audio.paused){
      updateMediaSession();
    }
  });

  window.addEventListener("pageshow", function(){
    updateMediaSession();
    /* الحفاظ على حالة الإيقاف — بلا استئناف تلقائي */
  });

  const playBtn = document.getElementById("playButton");
  if(playBtn){
    playBtn.addEventListener("click", function(){
      setTimeout(function(){
        userWantsPlay = !audio.paused;
        updateMediaSession();
      }, 100);
    });
  }

  updateMediaSession();
})();
