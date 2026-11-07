(function(){
  function bindProgressSeek(){
    var prog = document.getElementById("progress");
    var a = document.getElementById("audio");
    if(!prog || !a || prog.__seekBound) return;
    prog.__seekBound = true;
    function clientXFrom(e){
      if(e.touches && e.touches.length) return e.touches[0].clientX;
      if(e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
      return e.clientX;
    }
    function seekFromEvent(e){
      if(!a.duration || !isFinite(a.duration) || a.duration <= 0) return;
      var rect = prog.getBoundingClientRect();
      if(!rect.width) return;
      var ratio = Math.max(0, Math.min(1, (rect.right - clientXFrom(e)) / rect.width));
      /* العداد يعرض من 0 بعد المقدمة: حوّل نسبة الشريط إلى موضع الصوت الفعلي */
      var off = 0;
      try{ if(typeof getActiveIntroOffsetSec === "function") off = getActiveIntroOffsetSec() || 0; }catch(err){}
      var effectiveDur = Math.max(0, a.duration - off);
      var target = off + ratio * effectiveDur;
      try{ a.currentTime = Math.max(0, Math.min(a.duration, target)); }catch(err){}
      try{
        prog.value = ratio * 100;
        var ct = document.getElementById("currentTime");
        if(ct && typeof fmt === "function"){
          ct.textContent = fmt(typeof displayCurrentTimeSec === "function" ? displayCurrentTimeSec() : a.currentTime);
        }
        if(typeof syncHighlight === "function") syncHighlight();
      }catch(err){}
    }
    var dragging = false;
    prog.addEventListener("click", function(e){ seekFromEvent(e); });
    prog.addEventListener("pointerdown", function(e){
      dragging = true;
      try{ prog.setPointerCapture(e.pointerId); }catch(err){}
      seekFromEvent(e);
      e.preventDefault();
    });
    prog.addEventListener("pointermove", function(e){
      if(!dragging) return;
      seekFromEvent(e);
      e.preventDefault();
    });
    function endDrag(e){
      if(!dragging) return;
      dragging = false;
      seekFromEvent(e);
    }
    prog.addEventListener("pointerup", endDrag);
    prog.addEventListener("pointercancel", function(){ dragging = false; });
    prog.addEventListener("touchstart", function(e){
      dragging = true; seekFromEvent(e); e.preventDefault();
    }, {passive:false});
    prog.addEventListener("touchmove", function(e){
      if(!dragging) return; seekFromEvent(e); e.preventDefault();
    }, {passive:false});
    prog.addEventListener("touchend", function(e){
      if(!dragging) return; dragging = false; seekFromEvent(e);
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindProgressSeek);
  else bindProgressSeek();
  window.addEventListener("load", function(){ setTimeout(bindProgressSeek, 100); });
})();
