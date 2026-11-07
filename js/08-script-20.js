/* واجهة افتتاحية — ثانيتان */
(function(){
  function hideSplash(){
    const sp = document.getElementById("splashScreen");
    if(!sp) return;
    sp.classList.add("hide");
    try{ sp.style.display="none"; sp.style.opacity="0"; sp.style.visibility="hidden"; }catch(e){}
    setTimeout(function(){ try{ sp.remove(); }catch(e){} }, 500);
  }
  if(document.readyState === "complete"){
    setTimeout(hideSplash, 2000);
  }else{
    window.addEventListener("load", function(){ setTimeout(hideSplash, 2000); });
  }
  setTimeout(hideSplash, 3500);
})();
