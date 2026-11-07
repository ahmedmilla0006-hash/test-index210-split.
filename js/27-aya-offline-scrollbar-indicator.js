(function(){
  function isPlayingLocal(){
    try{
      var a = document.getElementById("audio");
      if(!a) return false;
      var src = String(a.currentSrc || a.src || "");
      return src.indexOf("blob:") === 0;
    }catch(e){ return false; }
  }
  function syncOfflineClass(){
    try{
      var netOff = (typeof navigator !== "undefined" && navigator.onLine === false);
      var localPlay = isPlayingLocal();
      /* أوفلاين الشبكة أو تشغيل من مقطع محلي محفوظ */
      if(netOff || localPlay) document.body.classList.add("is-offline");
      else document.body.classList.remove("is-offline");
    }catch(e){}
  }
  function boot(){
    syncOfflineClass();
    try{
      window.addEventListener("offline", syncOfflineClass);
      window.addEventListener("online", syncOfflineClass);
    }catch(e){}
    try{
      var a = document.getElementById("audio");
      if(a){
        ["play","playing","pause","ended","emptied","loadstart","loadeddata","error"].forEach(function(ev){
          a.addEventListener(ev, syncOfflineClass);
        });
      }
    }catch(e){}
    try{ setInterval(syncOfflineClass, 1500); }catch(e){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
