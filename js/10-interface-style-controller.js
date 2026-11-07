(function(){
  const KEY='quranInterfaceStyle';
  const newStyle=document.getElementById('new-ui-style');
  const buttons=[...document.querySelectorAll('.interface-style-btn')];
  const readerSelect=document.getElementById('readerSelect');
  const surahSelect=document.getElementById('surahSelect');
  const readerPickerBtn=document.getElementById('readerPickerBtn');
  const surahPickerBtn=document.getElementById('surahPickerBtn');
  const readerPickerOverlay=document.getElementById('readerPickerOverlay');
  const surahPickerOverlay=document.getElementById('surahPickerOverlay');
  const recitersButton=document.getElementById('recitersButton');

  function visibility(oldMode){
    if(readerSelect){ oldMode ? readerSelect.removeAttribute('hidden') : readerSelect.setAttribute('hidden','hidden'); }
    if(surahSelect){ oldMode ? surahSelect.removeAttribute('hidden') : surahSelect.setAttribute('hidden','hidden'); }
    if(readerPickerBtn) readerPickerBtn.style.display=oldMode?'none':'';
    if(surahPickerBtn) surahPickerBtn.style.display=oldMode?'none':'';
  }
  function oldReciters(){
    if(!recitersButton) return;
    recitersButton.onclick=function(){
      try{if(typeof closeSideMenu==='function')closeSideMenu();}catch(e){}
      if(readerSelect){readerSelect.removeAttribute('hidden');readerSelect.style.display='block';try{readerSelect.focus();}catch(e){}try{readerSelect.click();}catch(e){}}
    };
  }
  function newReciters(){
    if(!recitersButton) return;
    recitersButton.onclick=function(){
      try{if(typeof closeSideMenu==='function')closeSideMenu();}catch(e){}
      if(readerPickerBtn) readerPickerBtn.click();
    };
  }
  function apply(style,save){
    const oldMode=style==='old';
    document.body.classList.toggle('interface-old',oldMode);
    document.body.classList.toggle('interface-new',!oldMode);
    document.body.classList.remove('theme-makkah','theme-uthmani','theme-fajr');
    if(newStyle) newStyle.disabled=oldMode;
    visibility(oldMode);
    if(oldMode){
      if(readerPickerOverlay) readerPickerOverlay.classList.remove('show');
      if(surahPickerOverlay) surahPickerOverlay.classList.remove('show');
      oldReciters();
    }else{newReciters();}
    buttons.forEach(b=>{const a=b.dataset.interfaceStyle===style;b.classList.toggle('active',a);b.setAttribute('aria-pressed',a?'true':'false');});
    if(save){try{localStorage.setItem(KEY,style)}catch(e){}}
  }
  let saved='new';
  try{
    const s=localStorage.getItem(KEY);
    if(s==='old'||s==='new') saved=s;
  }catch(e){}
  buttons.forEach(b=>b.addEventListener('click',()=>apply(b.dataset.interfaceStyle,true)));
  apply(saved,false);
})();
