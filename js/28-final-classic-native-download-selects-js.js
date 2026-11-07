(function(){
  var ids=['dlReciterSelect','dlStartSurah','dlEndSurah'];
  function apply(){
    var old=document.body.classList.contains('interface-old');
    ids.forEach(function(id){
      var s=document.getElementById(id);
      var b=document.getElementById(id==='dlReciterSelect'?'dlReciterPicker':id==='dlStartSurah'?'dlStartSurahPicker':'dlEndSurahPicker');
      if(s){
        if(old){
          s.removeAttribute('aria-hidden');
          s.removeAttribute('tabindex');
          s.style.setProperty('display','block','important');
          s.style.setProperty('position','static','important');
          s.style.setProperty('width','100%','important');
          s.style.setProperty('height','52px','important');
          s.style.setProperty('opacity','1','important');
          s.style.setProperty('visibility','visible','important');
          s.style.setProperty('pointer-events','auto','important');
          s.style.setProperty('appearance','auto','important');
          s.style.setProperty('-webkit-appearance','auto','important');
        }else{
          s.setAttribute('tabindex','-1');
          s.setAttribute('aria-hidden','true');
          s.style.setProperty('display','none','important');
          s.style.setProperty('pointer-events','none','important');
          s.style.setProperty('opacity','0','important');
        }
      }
      if(b) b.style.setProperty('display',old?'none':'flex','important');
    });
  }
  function start(){
    apply();
    var obs=new MutationObserver(apply);
    obs.observe(document.body,{attributes:true,attributeFilter:['class']});
    window.addEventListener('load',apply);
    setTimeout(apply,100); setTimeout(apply,500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
