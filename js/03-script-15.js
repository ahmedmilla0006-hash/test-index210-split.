function populateDirectSurahSelector(){
  const select=document.getElementById("surahSelect");
  if(!select || typeof surahs==="undefined") return;
  select.innerHTML='<option value="">اختر السورة</option>';
  surahs.forEach((s,i)=>{
    const o=document.createElement("option");
    o.value=String(i+1);
    o.textContent=(i+1)+" - "+s[0];
    select.appendChild(o);
  });
}

/* تحديث قائمة/تسمية السورة في المشغّل لتتوافق مع السورة الحالية */
function syncPlayerSurahUI(surahNumber){
  var n = Number(surahNumber);
  if(!n || n < 1) {
    try{
      n = Number(typeof currentAudioSurah !== "undefined" && currentAudioSurah
        ? currentAudioSurah
        : (typeof getSurahNumberForPage === "function"
            ? getSurahNumberForPage(typeof currentPage !== "undefined" ? currentPage : 1)
            : 1));
    }catch(e){ n = 1; }
  }
  var sel = document.getElementById("surahSelect");
  var label = document.getElementById("surahPickerLabel");
  var name = "";
  try{
    if(typeof surahs !== "undefined" && surahs[n - 1]) name = surahs[n - 1][0] || "";
  }catch(e){}
  if(sel){
    if(sel.options.length < 2 && typeof populateDirectSurahSelector === "function"){
      try{ populateDirectSurahSelector(); }catch(e){}
    }
    var val = String(n);
    if(sel.value !== val){
      sel.value = val;
      /* لا نُطلق change حتى لا يُعاد loadPage */
    }
  }
  if(label){
    label.textContent = name ? (n + " - " + name) : ("سورة " + n);
  }
  try{
    if(typeof syncSurahLabel === "function") syncSurahLabel();
  }catch(e){}
}
function chooseDirectSurah(n){
  n=Number(n);
  if(!n || typeof surahs==="undefined") return;

  const s=surahs[n-1];
  if(!s) return;

  currentAudioSurah=n;

  if(typeof loadPage==="function"){
    loadPage(
      Number(s[1]),
      {
        surahNumber:n,
        autoContinue:true
      }
    );
  }
}
document.addEventListener("DOMContentLoaded",()=>{
  populateDirectSurahSelector();
  const s=document.getElementById("surahSelect");
  if(s) s.addEventListener("change",()=>chooseDirectSurah(s.value));
  try{
    var n = Number(typeof currentAudioSurah !== "undefined" && currentAudioSurah
      ? currentAudioSurah
      : (typeof getSurahNumberForPage === "function"
          ? getSurahNumberForPage(typeof currentPage !== "undefined" ? currentPage : 1)
          : 1));
    syncPlayerSurahUI(n);
  }catch(e){}
});
