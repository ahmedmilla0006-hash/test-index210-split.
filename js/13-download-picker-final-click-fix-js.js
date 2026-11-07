(function(){
  var map={
    dlReciterPicker:{select:'dlReciterSelect',overlay:'dlReciterPickerOverlay',list:'dlReciterPickerList',label:'dlReciterPickerLabel'},
    dlStartSurahPicker:{select:'dlStartSurah',overlay:'dlStartSurahPickerOverlay',list:'dlStartSurahPickerList',label:'dlStartSurahPickerLabel'},
    dlEndSurahPicker:{select:'dlEndSurah',overlay:'dlEndSurahPickerOverlay',list:'dlEndSurahPickerList',label:'dlEndSurahPickerLabel'}
  };
  var DRAG_LIMIT=10;

  function open(id){
    var c=map[id]; if(!c) return;
    var sel=document.getElementById(c.select), ov=document.getElementById(c.overlay), list=document.getElementById(c.list), label=document.getElementById(c.label);
    if(!sel||!ov||!list||!label) return;
    list.innerHTML='';
    list.__pickerMoved=false;
    list.__pickerDown=false;

    Array.prototype.forEach.call(sel.options,function(opt){
      if(!opt.value) return;
      var item=document.createElement('div');
      item.className='download-picker-item'+(String(opt.value)===String(sel.value)?' selected':'');
      item.setAttribute('role','button');
      item.setAttribute('tabindex','0');
      var text=document.createElement('span'); text.textContent=(opt.textContent||'').trim();
      var radio=document.createElement('span'); radio.className='download-picker-radio';
      item.appendChild(text); item.appendChild(radio);

      item.__value=opt.value;
      item.__name=(opt.textContent||'').trim();
      list.appendChild(item);
    });

    function choose(item,e){
      if(!item || list.__pickerMoved) return;
      if(e){ e.preventDefault(); e.stopPropagation(); }
      sel.value=item.__value;
      label.textContent=item.__name;
      Array.prototype.forEach.call(list.querySelectorAll('.download-picker-item'),function(x){x.classList.remove('selected');});
      item.classList.add('selected');
      try{sel.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){ }
      ov.classList.remove('show'); ov.setAttribute('aria-hidden','true');
    }

    /* لا نربط touchend بالأصناف. السحب يمرر فقط، والاختيار يتم بالنقر بعد ثبات الإصبع. */
    list.addEventListener('pointerdown',function(e){
      if(e.pointerType==='mouse' && e.button!==0) return;
      list.__pickerDown=true;
      list.__pickerMoved=false;
      list.__pickerStartX=e.clientX;
      list.__pickerStartY=e.clientY;
    },{passive:true});

    list.addEventListener('pointermove',function(e){
      if(!list.__pickerDown) return;
      var dx=e.clientX-list.__pickerStartX, dy=e.clientY-list.__pickerStartY;
      if(Math.sqrt(dx*dx+dy*dy)>DRAG_LIMIT) list.__pickerMoved=true;
    },{passive:true});

    list.addEventListener('pointerup',function(){
      list.__pickerDown=false;
      if(list.__pickerMoved){
        /* امنع click المتولد بعد السحب من اختيار عنصر */
        list.__pickerBlockClickUntil=Date.now()+350;
      }
    },{passive:true});

    list.addEventListener('pointercancel',function(){
      list.__pickerDown=false;
      list.__pickerMoved=true;
      list.__pickerBlockClickUntil=Date.now()+350;
    },{passive:true});

    list.addEventListener('click',function(e){
      if(Date.now() < (list.__pickerBlockClickUntil||0)) {
        e.preventDefault(); e.stopPropagation(); return;
      }
      var item=e.target.closest ? e.target.closest('.download-picker-item') : null;
      if(!item || !list.contains(item)) return;
      choose(item,e);
    },false);

    var chosen=sel.options[sel.selectedIndex];
    label.textContent=chosen?(chosen.textContent||'').trim():'اختر';
    ov.classList.add('show'); ov.setAttribute('aria-hidden','false');
  }

  function bind(){
    Object.keys(map).forEach(function(id){
      var b=document.getElementById(id); if(!b || b.__smoothPickerBound) return;
      b.__smoothPickerBound=true;
      b.addEventListener('click',function(e){
        e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
        open(id);
      },true);
    });
    document.querySelectorAll('.download-picker-overlay').forEach(function(ov){
      if(ov.__smoothCloseFix) return; ov.__smoothCloseFix=true;
      ov.addEventListener('click',function(e){
        if(e.target===ov){ov.classList.remove('show');ov.setAttribute('aria-hidden','true');}
      });
      var close=ov.querySelector('[data-dl-picker-close]');
      if(close) close.addEventListener('click',function(e){
        e.preventDefault(); e.stopPropagation(); ov.classList.remove('show'); ov.setAttribute('aria-hidden','true');
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',function(){setTimeout(bind,100);setTimeout(bind,500);});
})();
