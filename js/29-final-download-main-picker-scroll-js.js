(function(){
  var LIMIT=10;
  var states=new WeakMap();
  function getState(btn){
    var s=states.get(btn);
    if(!s){s={x:0,y:0,moved:false,active:false};states.set(btn,s);}
    return s;
  }
  function getBtn(e){
    return e.target && e.target.closest ? e.target.closest('#downloadsPopup .download-glass-picker') : null;
  }

  /* اعتراض pointerdown قبل كود الفتح القديم: لا نفتح القائمة أثناء بدء السحب */
  document.addEventListener('pointerdown',function(e){
    var btn=getBtn(e); if(!btn) return;
    var s=getState(btn);
    s.x=e.clientX; s.y=e.clientY; s.moved=false; s.active=true;
    e.stopImmediatePropagation();
  },true);

  document.addEventListener('pointermove',function(e){
    var btn=getBtn(e); if(!btn) return;
    var s=getState(btn); if(!s.active) return;
    var dx=e.clientX-s.x, dy=e.clientY-s.y;
    if(Math.sqrt(dx*dx+dy*dy)>LIMIT) s.moved=true;
  },true);

  document.addEventListener('pointerup',function(e){
    var btn=getBtn(e); if(!btn) return;
    var s=getState(btn);
    var moved=s.moved;
    s.active=false;
    e.stopImmediatePropagation();
    /* ضغطة مستقلة فقط = فتح القائمة. السحب = لا تفعل شيئاً */
    if(!moved){
      setTimeout(function(){
        try{ btn.click(); }catch(_){ }
      },0);
    }
  },true);

  document.addEventListener('pointercancel',function(e){
    var btn=getBtn(e); if(!btn) return;
    var s=getState(btn); s.active=false; s.moved=true;
    e.stopImmediatePropagation();
  },true);

  /* Android قد يرسل touchstart منفصلاً قبل pointerdown؛ امنع كود الفتح القديم فقط */
  document.addEventListener('touchstart',function(e){
    var btn=getBtn(e); if(!btn) return;
    e.stopImmediatePropagation();
  },true);
})();
