(function(){
  function bind(){
    var b = document.getElementById("helpShowOnboarding");
    var w = document.getElementById("helpShowWhatsNew");
    if(b && !b.__bound){
      b.__bound = true;
      b.onclick = function(){
        try{ var h=document.getElementById("helpOverlay"); if(h) h.classList.remove("show"); }catch(e){}
        if(typeof window.__ayaShowOnboarding === "function") window.__ayaShowOnboarding();
      };
    }
    if(w && !w.__bound){
      w.__bound = true;
      w.onclick = function(){
        try{ var h=document.getElementById("helpOverlay"); if(h) h.classList.remove("show"); }catch(e){}
        if(typeof window.__ayaShowWhatsNew === "function") window.__ayaShowWhatsNew();
      };
    }
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
  setTimeout(bind, 500);
})();
