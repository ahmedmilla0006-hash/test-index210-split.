/* يوضح مصدر ملف الصوت الجاري استخدامه فعليًا */
(function(){
  function init(){
    var audio=document.getElementById("audio");
    var badge=document.getElementById("audioSourceIndicator");
    var label=document.getElementById("audioSourceText");
    if(!audio||!badge||!label) return;

    function sync(){
      try{
        var src=String(audio.currentSrc||audio.getAttribute("src")||audio.src||"").trim();
        var kind="";

        if(/^blob:/i.test(src)||/^file:/i.test(src)||/^content:/i.test(src)||/^filesystem:/i.test(src)){
          kind="local";
        }else if(/^https?:\/\//i.test(src)){
          kind="online";
        }

        if(!kind){
          badge.hidden=true;
          badge.classList.remove("is-online","is-local");
          label.textContent="";
          return;
        }

        badge.classList.toggle("is-online",kind==="online");
        badge.classList.toggle("is-local",kind==="local");
        label.textContent=kind==="online"?"متصل":"محلي";
        badge.title=kind==="online"?"الصوت يعمل عبر الإنترنت":"الصوت يعمل من ملف محفوظ محليًا";
        badge.hidden=false;
      }catch(e){}
    }

    ["loadstart","loadedmetadata","loadeddata","canplay","playing","pause","ended","emptied","error"].forEach(function(ev){
      audio.addEventListener(ev,sync);
    });

    try{
      new MutationObserver(sync).observe(audio,{attributes:true,attributeFilter:["src"]});
    }catch(e){}

    sync();
    setInterval(sync,700);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
