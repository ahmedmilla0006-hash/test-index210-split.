/* مصحف المدينة — طبقة عرض تجريبية مستقلة، لا تستبدل مشغل آية أو نظامه الحالي */
(function(){
  "use strict";
  const pageArea=document.getElementById("pageArea");
  const pageImage=document.getElementById("quranPage");
  if(!pageArea||!pageImage) return;

  const CDN="https://cdn.quran.ws/svg/elements/v1.1.1/pages/";
  const cache=new Map();
  let requestToken=0;
  let enabled=localStorage.getItem("ayaMadinahMushaf")==="1";

  const host=document.createElement("div");
  host.id="madinahMushafHost";
  host.className="madinah-mushaf-host";
  host.setAttribute("aria-label","مصحف المدينة");
  pageArea.appendChild(host);

  const button=document.createElement("button");
  button.type="button";
  button.id="madinahMushafToggle";
  button.className="madinah-mushaf-toggle";
  button.textContent="مصحف المدينة";
  button.setAttribute("aria-pressed","false");
  pageArea.appendChild(button);

  const status=document.createElement("div");
  status.id="madinahMushafStatus";
  status.className="madinah-mushaf-status";
  status.setAttribute("role","status");
  pageArea.appendChild(status);

  /* تلاوة الكلمات: نستخدم ملف الصوت نفسه الذي تعيده Quran.com مع توقيتاته */
  const audioEl=document.getElementById("audio");
  const RECITATION_IDS={
    shatri:4, sudais:3, afasy:7, husary:6,
    shuraim:10, tablawi:11, minshawi:9,
    abdulbasitMujawwad:1
  };
  let wordTimings=[];
  let wordFrame=0;
  let activeWordKey="";
  let activeVerseKey="";
  let wordSurah=0;
  let originalAudioUrl="";
  let wordAudioUrl="";
  let wordLoading=false;
  let audioWasPlaying=false;
  function clearWord(){
    host.querySelectorAll("g.word.aya-word-active").forEach(el=>el.classList.remove("aya-word-active"));
    activeWordKey="";
  }
  function clearVerse(){
    host.querySelectorAll("g.word.aya-verse-active").forEach(el=>el.classList.remove("aya-verse-active"));
    activeVerseKey="";
    clearWord();
  }
  function paintWord(){
    if(!enabled||!audioEl||audioEl.paused||!wordTimings.length) return;
    const ms=audioEl.currentTime*1000;
    let found=null;
    let foundVerse="";
    outer: for(const verse of wordTimings){
      for(const seg of (verse.segments||[])){
        if(ms>=Number(seg[1])&&ms<Number(seg[2])){
          foundVerse=String(verse.verse_key);
          found=foundVerse+":"+String(seg[0]);
          break outer;
        }
      }
    }
    if(foundVerse&&foundVerse!==activeVerseKey){
      clearVerse();
      activeVerseKey=foundVerse;
      host.querySelectorAll('g.word[data-word-key^="'+foundVerse+':"]').forEach(el=>el.classList.add("aya-verse-active"));
    }
    if(found!==activeWordKey){
      clearWord();
      if(found){
        const el=host.querySelector('g.word[data-word-key="'+found+'"]');
        if(el){el.classList.add("aya-word-active");activeWordKey=found;}
      }
    }
  }
  function startWordFrame(){
    if(wordFrame) cancelAnimationFrame(wordFrame);
    const tick=()=>{
      if(!enabled||!audioEl||audioEl.paused) {wordFrame=0;return;}
      paintWord();
      wordFrame=requestAnimationFrame(tick);
    };
    wordFrame=requestAnimationFrame(tick);
  }
  function activeSurah(){
    try{
      return Number(currentAudioSurah)||Number(getSurahNumberForPage(currentPageNumber()))||1;
    }catch(e){return 1;}
  }
  async function loadWordRecitation(force){
    if(!enabled||!audioEl||wordLoading) return;
    const surah=activeSurah();
    const recitationId=RECITATION_IDS[typeof selectedReader!=="undefined"?selectedReader:""];
    if(!recitationId){
      status.textContent="تلوين الكلمات غير متاح لهذا القارئ حاليًا؛ لم نغيّر تسجيله.";
      return;
    }
    if(!force&&wordSurah===surah&&wordTimings.length&&wordAudioUrl) return;
    wordLoading=true;
    status.textContent="جارٍ تجهيز تسجيل الكلمات وتوقيتاتها…";
    try{
      const response=await fetch("https://api.quran.com/api/v4/chapter_recitations/"+recitationId+"/"+surah+"?segments=true",{headers:{Accept:"application/json"},cache:"no-store"});
      if(!response.ok) throw new Error("HTTP "+response.status);
      const data=await response.json();
      const af=data.audio_file||{};
      const list=Array.isArray(af.timestamps)?af.timestamps:[];
      if(!af.audio_url||!list.length||!list.some(v=>Array.isArray(v.segments)&&v.segments.length)){
        throw new Error("لا توجد توقيتات كلمات مكتملة لهذه السورة والقارئ");
      }
      wordTimings=list;
      wordSurah=surah;
      clearVerse();
      wordAudioUrl=af.audio_url;
      originalAudioUrl=String(audioEl.currentSrc||audioEl.src||"");
      audioWasPlaying=!audioEl.paused;
      audioEl.pause();
      audioEl.src=wordAudioUrl;
      audioEl.load();
      audioEl.currentTime=0;
      clearWord();
      status.textContent="جاهز: تسجيل متزامن مع توقيتات الكلمات.";
      if(audioWasPlaying) await audioEl.play();
    }catch(error){
      wordTimings=[];wordSurah=0;wordAudioUrl="";
      status.textContent="تعذر تجهيز تلوين الكلمات: "+error.message;
      console.warn("[Aya word recitation]",error);
    }finally{wordLoading=false;}
  }
  function restoreOriginalRecitation(){
    if(!audioEl||!wordAudioUrl) return;
    const wasPlaying=!audioEl.paused;
    const surah=activeSurah();
    let url="";
    try{url=typeof getAudioUrl==="function"?getAudioUrl(selectedReader,currentPageNumber(),surah):"";}catch(e){}
    if(!url) url=originalAudioUrl;
    audioEl.pause();
    if(url){audioEl.src=url;audioEl.load();if(wasPlaying)audioEl.play().catch(()=>{});}
    wordTimings=[];wordSurah=0;wordAudioUrl="";originalAudioUrl="";
    clearVerse();
    if(wordFrame) cancelAnimationFrame(wordFrame);
    wordFrame=0;
  }

  function currentPageNumber(){
    const n=Number(localStorage.getItem("quranPage")||1);
    return Math.max(1,Math.min(604,n));
  }
  function setMode(on){
    enabled=!!on;
    document.body.classList.toggle("aya-madinah-mode",enabled);
    button.setAttribute("aria-pressed",String(enabled));
    button.textContent=enabled?"العودة للمصحف الحالي":"مصحف المدينة";
    localStorage.setItem("ayaMadinahMushaf",enabled?"1":"0");
    status.textContent="";
    if(enabled){ renderPage(currentPageNumber()); loadWordRecitation(true); }
    else { restoreOriginalRecitation(); host.replaceChildren(); }
  }
  async function getSvg(pageNo){
    if(cache.has(pageNo)) return cache.get(pageNo);
    const url=CDN+String(pageNo).padStart(3,"0")+".svg";
    const response=await fetch(url,{mode:"cors",credentials:"omit"});
    if(!response.ok) throw new Error("HTTP "+response.status);
    const source=await response.text();
    const doc=new DOMParser().parseFromString(source,"image/svg+xml");
    const svg=doc.documentElement;
    if(svg.localName!=="svg"||doc.querySelector("parsererror")) throw new Error("SVG غير صالح");
    const imported=document.importNode(svg,true);
    imported.removeAttribute("width");
    imported.removeAttribute("height");
    imported.setAttribute("preserveAspectRatio","xMidYMid meet");
    imported.setAttribute("role","img");
    imported.setAttribute("aria-label","صفحة "+pageNo+" من مصحف المدينة");
    cache.set(pageNo,imported);
    return imported;
  }
  async function renderPage(pageNo){
    const token=++requestToken;
    status.textContent="جارٍ تحميل صفحة المصحف…";
    try{
      const source=await getSvg(pageNo);
      if(token!==requestToken||!enabled) return;
      const svg=document.importNode(source,true);
      host.replaceChildren(svg);
      host.dataset.page=String(pageNo);
      if(wordTimings.length) paintWord();
      if(!wordLoading) status.textContent="";
    }catch(error){
      if(token!==requestToken||!enabled) return;
      host.replaceChildren();
      status.textContent="تعذّر تحميل الصفحة. تحقق من الاتصال.";
      console.warn("[Aya Madinah Mushaf]",error);
    }
  }
  button.addEventListener("click",()=>setMode(!enabled));
  if(audioEl){
    audioEl.addEventListener("play",startWordFrame);
    audioEl.addEventListener("pause",()=>{if(wordFrame)cancelAnimationFrame(wordFrame);wordFrame=0;});
    audioEl.addEventListener("timeupdate",paintWord);
  }
  if(typeof readerSelect!=="undefined"&&readerSelect){
    readerSelect.addEventListener("change",()=>{
      if(enabled){wordTimings=[];wordSurah=0;wordAudioUrl="";setTimeout(()=>loadWordRecitation(true),0);}
    });
  }
  const observer=new MutationObserver(()=>{
    if(enabled){
      renderPage(currentPageNumber());
      if(wordSurah&&activeSurah()!==wordSurah) loadWordRecitation(true);
    }
  });
  observer.observe(pageImage,{attributes:true,attributeFilter:["src"]});
  window.addEventListener("pageshow",()=>{if(enabled)renderPage(currentPageNumber());});
  setMode(enabled);
})();