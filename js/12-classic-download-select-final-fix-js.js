(function(){
  function fix(){
    var ids=['dlReciterSelect','dlStartSurah','dlEndSurah'];
    ids.forEach(function(id){
      var s=document.getElementById(id);
      var b=document.getElementById(id==='dlReciterSelect'?'dlReciterPicker':id==='dlStartSurah'?'dlStartSurahPicker':'dlEndSurahPicker');
      if(s){
        s.setAttribute('tabindex','-1');
        s.setAttribute('aria-hidden','true');
        s.style.setProperty('display','none','important');
        s.style.setProperty('pointer-events','none','important');
        s.style.setProperty('opacity','0','important');
      }
      if(b){
        b.style.setProperty('display','flex','important');
        b.type='button';
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fix); else fix();
  window.addEventListener('load',function(){setTimeout(fix,50);setTimeout(fix,300);});
  document.addEventListener('click',function(e){
    /* منع select المخفي فقط في الوضع الزجاجي؛ في الكلاسيكي يجب أن يبقى select الأصلي قابلاً للفتح. */
    if(!document.body.classList.contains('interface-new')) return;
    var t=e.target.closest && e.target.closest('.download-native-select');
    if(t){e.preventDefault();e.stopPropagation();return false;}
  },true);
})();
