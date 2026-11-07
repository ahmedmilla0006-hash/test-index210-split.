(function(){
  var LIMIT=8;
  var states=new WeakMap();
  function state(list){
    var st=states.get(list);
    if(!st){st={down:false,moved:false,x:0,y:0,blockUntil:0};states.set(list,st);}
    return st;
  }
  document.addEventListener('pointerdown',function(e){
    var list=e.target.closest && e.target.closest('#downloadsPopup .download-picker-list');
    if(!list) return;
    var st=state(list); st.down=true; st.moved=false; st.x=e.clientX; st.y=e.clientY;
  },true);
  document.addEventListener('pointermove',function(e){
    var list=e.target.closest && e.target.closest('#downloadsPopup .download-picker-list');
    if(!list) return;
    var st=state(list); if(!st.down) return;
    var dx=e.clientX-st.x,dy=e.clientY-st.y;
    if(Math.sqrt(dx*dx+dy*dy)>LIMIT) st.moved=true;
  },true);
  document.addEventListener('pointerup',function(e){
    var list=e.target.closest && e.target.closest('#downloadsPopup .download-picker-list');
    if(!list) return;
    var st=state(list); st.down=false;
    if(st.moved) st.blockUntil=Date.now()+450;
  },true);
  document.addEventListener('pointercancel',function(e){
    var list=e.target.closest && e.target.closest('#downloadsPopup .download-picker-list');
    if(!list) return;
    var st=state(list); st.down=false; st.moved=true; st.blockUntil=Date.now()+450;
  },true);
  document.addEventListener('click',function(e){
    var list=e.target.closest && e.target.closest('#downloadsPopup .download-picker-list');
    if(!list) return;
    var st=state(list);
    if(Date.now()<st.blockUntil){
      e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    }
  },true);
})();
