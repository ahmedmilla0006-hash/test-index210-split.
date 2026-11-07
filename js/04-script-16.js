/* =====================================================
   معلومات صفحة المصحف: الجزء + السورة + رقم الصفحة
   لا نلمس الصورة أو طبقة التظليل.
===================================================== */
(function(){
  const topInfo = document.getElementById("readerInfoTop");
  const juzInfo = document.getElementById("juzInfo");
  const surahInfo = document.getElementById("surahInfo");
  const pageNumberInfo = document.getElementById("readerPageNumber");
  const player = document.querySelector(".player");

  function getJuzNameForPage(pageNumber){
    const n = Number(pageNumber) || 1;

    /* نفس جدول الأجزاء الموجود في المشروع */
    const starts = [
      [1,"الجزء الأول"],[22,"الجزء الثاني"],[42,"الجزء الثالث"],
      [62,"الجزء الرابع"],[82,"الجزء الخامس"],[102,"الجزء السادس"],
      [122,"الجزء السابع"],[142,"الجزء الثامن"],[162,"الجزء التاسع"],
      [182,"الجزء العاشر"],[202,"الجزء الحادي عشر"],[222,"الجزء الثاني عشر"],
      [242,"الجزء الثالث عشر"],[262,"الجزء الرابع عشر"],[282,"الجزء الخامس عشر"],
      [302,"الجزء السادس عشر"],[322,"الجزء السابع عشر"],[342,"الجزء الثامن عشر"],
      [362,"الجزء التاسع عشر"],[382,"الجزء العشرون"],[402,"الجزء الحادي والعشرون"],
      [422,"الجزء الثاني والعشرون"],[442,"الجزء الثالث والعشرون"],[462,"الجزء الرابع والعشرون"],
      [482,"الجزء الخامس والعشرون"],[502,"الجزء السادس والعشرون"],[522,"الجزء السابع والعشرون"],
      [542,"الجزء الثامن والعشرون"],[562,"الجزء التاسع والعشرون"],[582,"الجزء الثلاثون"]
    ];

    let result = starts[0][1];
    for(const item of starts){
      if(n >= item[0]) result = item[1];
      else break;
    }
    return result;
  }

  function getSurahNameByNumber(surahNumber){
    const n = Number(surahNumber);
    if(!Number.isFinite(n) || n < 1) return "";
    if(typeof surahs !== "undefined" && Array.isArray(surahs) && surahs[n - 1]){
      return surahs[n - 1][0] || "";
    }
    return "";
  }

  function getSurahNameForPage(pageNumber){
    const n = Number(pageNumber) || 1;

    if(typeof surahs !== "undefined" && Array.isArray(surahs)){
      let result = surahs[0] ? surahs[0][0] : "";
      for(const s of surahs){
        const start = Number(s[1]);
        if(n >= start) result = s[0];
        else break;
      }
      return result;
    }

    return "";
  }

  /*
    اسم السورة في الأعلى:
    - أثناء التلاوة / بعد اختيار آية: اسم السورة التي تُشغَّل (currentAudioSurah)
    - وإلا: تقدير من رقم الصفحة
  */
  function getDisplayedSurahName(pageNumber){
    const playing =
      typeof currentAudioSurah !== "undefined" && currentAudioSurah
        ? Number(currentAudioSurah)
        : 0;

    if(playing >= 1){
      const byAudio = getSurahNameByNumber(playing);
      if(byAudio) return byAudio;
    }

    return getSurahNameForPage(pageNumber);
  }

  function updateReaderPageInfo(pageNumber){
    const n = Number(pageNumber) || 1;

    if(juzInfo){
      juzInfo.textContent = getJuzNameForPage(n);
    }

    if(surahInfo){
      const name = getDisplayedSurahName(n);
      surahInfo.textContent = name ? "سورة " + name : "";
    }

    if(pageNumberInfo){
      pageNumberInfo.textContent = "صفحة " + n;
    }

    updatePlayerHeight();
  }

  function updatePlayerHeight(){
    if(!player) return;
    /* عند إخفاء الواجهة يبقى الارتفاع 0 حتى ينزل رقم الصفحة للأسفل */
    if(typeof readingUIHidden !== "undefined" && readingUIHidden){
      document.documentElement.style.setProperty("--player-height", "0px");
      return;
    }
    /*
      المسافة من أسفل الشاشة إلى أعلى المشغّل (وليس ارتفاع العنصر فقط)
      حتى لا يبقى رقم الصفحة خلف المشغّل العائم أو فوق شريط النظام.
    */
    try{
      const rect = player.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      const gap = Math.max(0, vh - rect.top);
      document.documentElement.style.setProperty(
        "--player-height",
        Math.ceil(gap) + "px"
      );
    }catch(e){
      const h = player.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--player-height", h + "px");
    }
  }

  /* نراقب تغيير الصفحة أو السورة المُشغَّلة */
  let lastPage = null;
  let lastAudioSurah = null;
  function watchPage(){
    const current = Number(
      typeof currentPage !== "undefined" ? currentPage : 1
    ) || 1;

    const audioSurah = Number(
      typeof currentAudioSurah !== "undefined" ? currentAudioSurah : 0
    ) || 0;

    if(current !== lastPage || audioSurah !== lastAudioSurah){
      lastPage = current;
      lastAudioSurah = audioSurah;
      updateReaderPageInfo(current);
    }

    updatePlayerHeight();
    requestAnimationFrame(watchPage);
  }

  updateReaderPageInfo(
    Number(typeof currentPage !== "undefined" ? currentPage : 1) || 1
  );
  watchPage();

  try{
    if(player && typeof ResizeObserver !== "undefined"){
      const ro = new ResizeObserver(function(){ updatePlayerHeight(); });
      ro.observe(player);
    }
  }catch(e){}

  window.addEventListener("resize", updatePlayerHeight);
  window.addEventListener("orientationchange", updatePlayerHeight);

  /* معلومات الصفحة ثابتة ولا تدخل ضمن إخفاء أزرار التحكم. */
})();
