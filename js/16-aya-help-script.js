(function(){
  var overlay = document.getElementById("helpOverlay");
  var btn = document.getElementById("helpButton");
  var closeBtn = document.getElementById("helpClose");
  function openHelp(){
    if(!overlay) return;
    overlay.classList.add("show");
    try{
      var menu = document.getElementById("sideMenu");
      var ov = document.getElementById("overlay");
      if(menu) menu.classList.remove("open");
      if(ov) ov.classList.remove("show");
    }catch(e){}
  }
  function closeHelp(){ if(overlay) overlay.classList.remove("show"); }
  if(btn) btn.onclick = openHelp;
  if(closeBtn) closeBtn.onclick = closeHelp;
  if(overlay) overlay.addEventListener("click", function(e){ if(e.target === overlay) closeHelp(); });
})();
