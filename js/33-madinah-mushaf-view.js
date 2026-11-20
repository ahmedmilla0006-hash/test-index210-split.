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

  /* صوت مصحف المدينة وتوقيتاته مصدر واحد: Quran.com */
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
  let wordReaderKey="";
  let originalAudioUrl="";
  let wordAudioUrl="";
  let wordLoadToken=0;
  let wordLoading=false;

  function clearWord(){
    host.querySelectorAll("g.word.aya-word-active").forEach(el=>el.classList.remove("aya-word-active"));
    activeWordKey="";
  }
  function clearVerse(){
    activeVerseKey="";
    clearWord();
  }
  function verseIdentity(item){
    const key=String(item&&item.verse_key||"");
    const m=key.match(/^(\\d+):(\\d+)$/);
    return m?{surah:Number(m[1]),ayah:Number(m[2])}:null;
  }
  function verseStart(item){
    const starts=(item&&item.segments||[]).map(seg=>Number(seg[1])).filter(Number.isFinite);
    return starts.length?Math.min(...starts):null;
  }
  function currentAyah(){
    const ms=(audioEl.currentTime||0)*1000;
    for(const verse of wordTimings){
      const start=verseStart(verse);
      const end=(verse.segments||[]).reduce((n,seg)=>Math.max(n,Number(seg[2])||0),0);
      if(start!=null&&ms>=start&&ms<end){
        const id=verseIdentity(verse);
        if(id)return id.ayah;
      }
    }
    return null;
  }
  function paintWord(){
    if(!enabled||!audioEl||!wordTimings.length) return;
    const ms=audioEl.currentTime*1000;
    let found=null,foundVerse="";
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
      clearWord();
      activeVerseKey=foundVerse;
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
  function readerKeyNow(){
    const select=document.getElementById("readerSelect");
    return (select&&select.value)||(typeof selectedReader!=="undefined"?selectedReader:"");
  }
  function setPlayerStatus(message){
    status.textContent=message||"";
  }
  function waitForAudioMetadata(){
    if(audioEl.readyState>=1)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      let done=false;
      const finish=error=>{
        if(done)return;done=true;
        audioEl.removeEventListener("loadedmetadata",onReady);
        audioEl.removeEventListener("error",onError);
        clearTimeout(timer);
        error?reject(error):resolve();
      };
      const onReady=()=>finish();
      const onError=()=>finish(new Error("تعذر تحميل ملف التلاوة"));
      const timer=setTimeout(()=>finish(new Error("انتهت مهلة تحميل التلاوة")),15000);
      audioEl.addEventListener("loadedmetadata",onReady,{once:true});
      audioEl.addEventListener("error",onError,{once:true});
    });
  }
  async function switchToSurah(surah,options={}){
    if(!enabled||!audioEl)return false;
    const targetSurah=Number(surah)||activeSurah();
    const readerKey=options.readerKey||readerKeyNow();
    const recitationId=RECITATION_IDS[readerKey];
    if(!recitationId){
      setPlayerStatus("تلوين الكلمات غير متاح لهذا القارئ؛ لم نستخدم توقيتات قارئ آخر.");
      return false;
    }
    const requestedAyah=Number(options.ayah)||null;
    const wasPlaying=options.play===true;
    const token=++wordLoadToken;
    const sameRecording=wordSurah===targetSurah&&wordReaderKey===readerKey&&wordTimings.length&&wordAudioUrl;
    try{
      wordLoading=true;
      if(!sameRecording){
        setPlayerStatus("جارٍ تجهيز صوت القارئ وتوقيتات كلماته…");
        const response=await fetch("https://api.quran.com/api/v4/chapter_recitations/"+recitationId+"/"+targetSurah+"?segments=true",{headers:{Accept:"application/json"},cache:"no-store"});
        if(!response.ok)throw new Error("HTTP "+response.status);
        const data=await response.json();
        const af=data.audio_file||{};
        const list=Array.isArray(af.timestamps)?af.timestamps:[];
        if(!af.audio_url||!list.length||!list.some(v=>Array.isArray(v.segments)&&v.segments.length)){
          throw new Error("لا توجد توقيتات كلمات مكتملة لهذه السورة والقارئ");
        }
        if(token!==wordLoadToken)return false;
        wordTimings=list;
        wordSurah=targetSurah;
        wordReaderKey=readerKey;
        wordAudioUrl=af.audio_url;
      }
      if(token!==wordLoadToken)return false;
      const verse=wordTimings.find(v=>{
        const id=verseIdentity(v);
        return id&&id.surah===targetSurah&&(!requestedAyah||id.ayah===requestedAyah)&&verseStart(v)!=null;
      })||wordTimings.find(v=>verseIdentity(v)&&verseStart(v)!=null);
      const startMs=verse?verseStart(verse):0;
      const needNewSource=String(audioEl.currentSrc||audioEl.src||"")!==String(wordAudioUrl);
      if(needNewSource){
        audioEl.pause();
        audioEl.__ayaMadinahWordAudio=true;
        audioEl.__ayaPartialUrl="";
        audioEl.__ayaPartialMaxSec=0;
        audioEl.__ayaResumeAfterPartial=0;
        audioEl.src=wordAudioUrl;
        audioEl.load();
        await waitForAudioMetadata();
      }
      if(token!==wordLoadToken)return false;
      audioEl.__ayaMadinahWordAudio=true;
      if(startMs!=null)audioEl.currentTime=Math.max(0,startMs/1000);
      if(typeof currentAudioSurah!=="undefined")currentAudioSurah=targetSurah;
      clearVerse();
      paintWord();
      if(typeof refreshTimeDisplay==="function")refreshTimeDisplay({resetCurrent:!requestedAyah});
      setPlayerStatus("جاهز: صوت "+(readerKey==="shatri"?"أبي بكر الشاطري":"القارئ المحدد")+" مع توقيتاته الأصلية.");
      if(wasPlaying){
        try{await audioEl.play();}catch(e){throw new Error("تم تحميل الصوت لكن تعذر بدء التشغيل");}
      }
      return true;
    }catch(error){
      if(token===wordLoadToken){
        setPlayerStatus("تعذر تجهيز صوت الكلمات: "+error.message);
        console.warn("[Aya Madinah word audio]",error);
      }
      return false;
    }finally{
      if(token===wordLoadToken)wordLoading=false;
    }
  }
  async function loadWordRecitation(force){
    if(!enabled||!audioEl)return;
    const surah=activeSurah();
    const readerKey=readerKeyNow();
    if(!force&&wordSurah===surah&&wordReaderKey===readerKey&&wordTimings.length)return;
    const keepAyah=currentAyah();
    const wasPlaying=!audioEl.paused;
    await switchToSurah(surah,{readerKey,ayah:keepAyah||1,play:wasPlaying});
  }
  function restoreOriginalRecitation(){
    if(!audioEl)return;
    const wasPlaying=!audioEl.paused;
    const surah=activeSurah();
    let url="";
    try{url=typeof getAudioUrl==="function"?getAudioUrl(readerKeyNow(),currentPageNumber(),surah):"";}catch(e){}
    if(!url)url=originalAudioUrl;
    audioEl.pause();
    audioEl.__ayaMadinahWordAudio=false;
    if(url){audioEl.src=url;audioEl.load();if(wasPlaying)audioEl.play().catch(()=>{});}
    wordTimings=[];wordSurah=0;wordReaderKey="";wordAudioUrl="";originalAudioUrl="";
    clearVerse();
    if(wordFrame)cancelAnimationFrame(wordFrame);
    wordFrame=0;
  }

  /* واجهة ربط يستخدمها مشغّل آية الأصلي؛ لا ننشئ مشغلاً بديلاً. */
  window.__ayaMadinahAudioBridge={
    isEnabled:()=>enabled,
    changeReader:({surah,ayah,play})=>switchToSurah(surah,{readerKey:readerKeyNow(),ayah,play}),
    updateSource:({surah,ayah,play,keepPosition})=>{
      const target=Number(surah)||activeSurah();
      if(target===wordSurah&&wordReaderKey===readerKeyNow()&&wordTimings.length){
        if(keepPosition&&!ayah)return Promise.resolve(true);
      }
      return switchToSurah(target,{readerKey:readerKeyNow(),ayah:ayah||1,play:!!play});
    },
    getCurrentAyah:currentAyah
  };

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
    if(enabled){ originalAudioUrl=String(audioEl&& (audioEl.currentSrc||audioEl.src)||""); renderPage(currentPageNumber()); loadWordRecitation(true); }
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
      /* أزل أي أثر سابق؛ التلوين الأزرق للكلمة الحالية فقط */
      clearVerse();
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
  /* زر الآية التالية: استخدم توقيتات تسجيل Quran.com في وضع مصحف المدينة،
     لا توقيتات MP3Quran الخاصة بالمصحف الأصلي. */
  const forwardAyahButton=document.getElementById("forwardButton");
  if(forwardAyahButton){
    forwardAyahButton.addEventListener("click",event=>{
      if(!enabled||!audioEl||!wordTimings.length) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const now=audioEl.currentTime*1000;
      const ordered=wordTimings.map((verse,index)=>{
        const starts=(verse.segments||[])
          .map(seg=>Number(seg[1]))
          .filter(Number.isFinite);
        return {verse,index,start:starts.length?Math.min(...starts):Infinity,
          end:(verse.segments||[]).reduce((max,seg)=>Math.max(max,Number(seg[2])||0),0)};
      }).filter(x=>Number.isFinite(x.start)).sort((a,b)=>a.start-b.start);
      if(!ordered.length) return;
      let current=ordered.findIndex(x=>now>=x.start&&now<x.end);
      if(current<0){
        for(let i=0;i<ordered.length;i++){
          if(ordered[i].start<=now) current=i;
          else break;
        }
      }
      const next=ordered[current+1];
      if(!next) return;
      try{
        if(typeof resetRepeat==="function") resetRepeat();
        audioEl.currentTime=Math.max(0,next.start/1000);
        paintWord();
      }catch(error){console.warn("[Aya Madinah next ayah]",error);}
    },true);
  }

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