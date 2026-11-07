(function(){
  /* تسخين اتصال الصوت: عند ظهور الصفحة حمّل بداية ملف التلاوة في الخلفية */
  var lastWarm = "";
  function warmCurrentAudio(){
    /* عُطّل — Range على ملف التلاوة كان يقطع البث من أول تشغيل */
    return;
  }
  /* بعد تحميل الصفحة */
  if(document.readyState === "complete") setTimeout(warmCurrentAudio, 400);
  else window.addEventListener("load", function(){ setTimeout(warmCurrentAudio, 400); });
  /* عند تغيير الصفحة */
  var _lp = window.loadPage;
  if(typeof _lp === "function"){
    window.loadPage = function(){
      var r = _lp.apply(this, arguments);
      setTimeout(warmCurrentAudio, 250);
      return r;
    };
  }
  /* عند تغيير القارئ */
  document.addEventListener("change", function(e){
    if(e && e.target && e.target.id === "readerSelect") setTimeout(warmCurrentAudio, 100);
  });
})();
