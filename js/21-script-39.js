(function(){
  function bindBm(){
    var c = document.getElementById("bookmarksPickerClose");
    var ov = document.getElementById("bookmarksPickerOverlay");
    if(c) c.onclick = function(){ if(typeof closeBookmarksPicker==="function") closeBookmarksPicker(); };
    if(ov && !ov.__bmBound){
      ov.__bmBound = true;
      ov.addEventListener("click", function(e){ if(e.target===ov && typeof closeBookmarksPicker==="function") closeBookmarksPicker(); });
    }
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bindBm);
  else bindBm();
  window.addEventListener("load", bindBm);
})();
