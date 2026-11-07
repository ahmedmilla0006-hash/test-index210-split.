/* رقم الإصدار الثابت المعروض داخل التطبيق */
(function(){
  const APP_VERSION = "__AYA_BUILD_VERSION__";
  try{
    var num = document.getElementById("sideMenuVersionNum");
    if(num) num.textContent = APP_VERSION;
    var aboutNum = document.getElementById("aboutAppVersionNum");
    if(aboutNum) aboutNum.textContent = APP_VERSION;
    var side = document.getElementById("sideMenuVersion");
    if(side && !document.getElementById("sideMenuVersionNum")) side.textContent = APP_VERSION;
    var about = document.getElementById("aboutAppVersion");
    if(about && !document.getElementById("aboutAppVersionNum")) about.textContent = APP_VERSION;
  }catch(e){}
})();
