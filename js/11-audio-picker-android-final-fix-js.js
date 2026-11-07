(function(){
  var MAP={
    dlReciterPicker:{select:'dlReciterSelect',overlay:'dlReciterPickerOverlay',list:'dlReciterPickerList',label:'dlReciterPickerLabel'},
    dlStartSurahPicker:{select:'dlStartSurah',overlay:'dlStartSurahPickerOverlay',list:'dlStartSurahPickerList',label:'dlStartSurahPickerLabel'},
    dlEndSurahPicker:{select:'dlEndSurah',overlay:'dlEndSurahPickerOverlay',list:'dlEndSurahPickerList',label:'dlEndSurahPickerLabel'}
  };
  function openPicker(id){
    var c=MAP[id]; if(!c) return;
    var sel=document.getElementById(c.select), ov=document.getElementById(c.overlay), list=document.getElementById(c.list), label=document.getElementById(c.label);
    if(!sel||!ov||!list||!label) return;
    list.innerHTML='';
    for(var i=0;i<sel.options.length;i++){
      var opt=sel.options[i]; if(!opt.value) continue;
      var item=document.createElement('button');
      item.type='button';
      item.className='download-picker-item'+(String(opt.value)===String(sel.value)?' selected':'');
      var text=document.createElement('span'); text.textContent=(opt.textContent||'').trim();
      var radio=document.createElement('span'); radio.className='download-picker-radio';
      item.appendChild(text); item.appendChild(radio);
      (function(value,name,button){
        function choose(e){
          if(e){e.preventDefault();e.stopPropagation();}
          sel.value=value;
          label.textContent=name;
          try{sel.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){ }
          ov.classList.remove('show'); ov.setAttribute('aria-hidden','true');
        }
        button.addEventListener('click',choose,false);
      })(opt.value,(opt.textContent||'').trim(),item);
      list.appendChild(item);
    }
    var chosen=sel.options[sel.selectedIndex];
    label.textContent=chosen?(chosen.textContent||'').trim():'اختر';
    ov.classList.add('show'); ov.setAttribute('aria-hidden','false');
  }
  function bind(){
    Object.keys(MAP).forEach(function(id){
      var b=document.getElementById(id); if(!b || b.__androidFinalBound) return;
      b.__androidFinalBound=true;
      function go(e){
        if(e){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();}
        openPicker(id); return false;
      }
      b.addEventListener('pointerdown',go,true);
      b.addEventListener('touchstart',go,true);
      b.addEventListener('click',go,true);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',function(){setTimeout(bind,100);setTimeout(bind,500);});
})();
