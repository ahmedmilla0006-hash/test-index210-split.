(function(){
  /* تحميل مسبق للسورة التالية أثناء التشغيل لتسريع الانتقال */
  var lastPrefetch = "";
  function prefetchUrl(url){
    /* عُطّل prefetch الكامل لملف الصوت — ينافس البث الحالي ويسبب تقطيعاً */
    return;
  }
  function maybePrefetchNext(){
    try{
      var a = document.getElementById("audio");
      if(!a || !a.duration || !isFinite(a.duration) || a.duration < 10) return;
      /* عندما يتبقى أقل من 25% أو 45 ثانية */
      var left = a.duration - (a.currentTime || 0);
      if(left > 45 && (a.currentTime / a.duration) < 0.75) return;
      var surah = 1;
      try{ surah = Number(currentAudioSurah || 1) || 1; }catch(e){}
      var next = surah + 1;
      if(next > 114) return;
      var url = null;
      try{
        if(typeof getAudioUrl === "function"){
          url = getAudioUrl(selectedReader, currentPage || 1, next);
        }
      }catch(e){}
      if(url) prefetchUrl(url);
    }catch(e){}
  }
  var a = document.getElementById("audio");
  if(a){
    a.addEventListener("timeupdate", function(){
      if(!a.__ayaPrefetchTick){
        a.__ayaPrefetchTick = true;
        setTimeout(function(){ a.__ayaPrefetchTick = false; maybePrefetchNext(); }, 3000);
      }
    });
  }
})();
