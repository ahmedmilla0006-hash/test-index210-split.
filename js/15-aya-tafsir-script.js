/* التفسير: الطبري · ابن كثير · البغوي — spa5k/tafsir_api */
(function(){
  const EDITIONS = {
    "ar-tafsir-al-tabari": "جامع البيان — تفسير الطبري",
    "ar-tafsir-ibn-kathir": "تفسير ابن كثير",
    "ar-tafsir-al-baghawi": "تفسير البغوي"
  };
  const BASE = "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/";
  const SURAH_AYAHS = [0,7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,16,17,13,12,11,11,10,8,9,5,8,8,5,6,5,6,5,5,6,3,5,4,5,6,3,5,3,5,4,5,6];

  const overlay = document.getElementById("tafsirOverlay");
  const btn = document.getElementById("tafsirButton");
  const closeBtn = document.getElementById("tafsirClose");
  const editionSel = document.getElementById("tafsirEdition");
  const refEl = document.getElementById("tafsirRef");
  const ayahTextEl = document.getElementById("tafsirAyahText");
  const bodyEl = document.getElementById("tafsirBody");
  const statusEl = document.getElementById("tafsirStatus");
  const prevBtn = document.getElementById("tafsirPrev");
  const nextBtn = document.getElementById("tafsirNext");
  const playBtn = document.getElementById("tafsirPlay");
  const currentBtn = document.getElementById("tafsirCurrent");

  let tafsirSurah = 1, tafsirAyah = 1;
  const cache = {};

  try{
    const saved = localStorage.getItem("aya_tafsir_edition");
    if(saved && editionSel && EDITIONS[saved]) editionSel.value = saved;
  }catch(e){}

  function surahName(n){
    try{ if(typeof surahs !== "undefined" && surahs[n-1]) return surahs[n-1][0]; }catch(e){}
    return "سورة " + n;
  }
  function maxAyah(s){ return SURAH_AYAHS[Number(s)||1] || 7; }
  function setStatus(m){ if(statusEl) statusEl.textContent = m || ""; }

  function getPlayingRef(){
    try{
      if(typeof getActiveTiming === "function"){
        const a = getActiveTiming();
        if(a && a.ayah){
          const s = Number(a._surah || a.surah || (typeof timingSurahLoaded !== "undefined" ? timingSurahLoaded : 0) || (typeof currentAudioSurah !== "undefined" ? currentAudioSurah : 0) || (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 1));
          if(s) return { surah: s, ayah: Number(a.ayah) };
        }
      }
    }catch(e){}
    if(window.__lastTafsirRef && window.__lastTafsirRef.surah){
      return { surah: Number(window.__lastTafsirRef.surah), ayah: Number(window.__lastTafsirRef.ayah)||1 };
    }
    try{
      const s = (typeof currentAudioSurah !== "undefined" && currentAudioSurah) ? Number(currentAudioSurah) : (typeof getSurahNumberForPage === "function" ? getSurahNumberForPage(currentPage) : 1);
      return { surah: s||1, ayah: 1 };
    }catch(e){}
    return { surah: 1, ayah: 1 };
  }

  function stripTafsirNoise(text){
    return String(text||"")
      .replace(/\[\[[\s\S]*?\]\]/g, "")
      .replace(/\\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function loadTafsir(surah, ayah){
    surah = Math.max(1, Math.min(114, Number(surah)||1));
    ayah = Math.max(1, Math.min(maxAyah(surah), Number(ayah)||1));
    tafsirSurah = surah; tafsirAyah = ayah;
    const edition = (editionSel && editionSel.value) || "ar-tafsir-al-tabari";
    try{ localStorage.setItem("aya_tafsir_edition", edition); }catch(e){}
    if(refEl) refEl.textContent = surahName(surah) + " — الآية " + ayah;
    if(ayahTextEl) ayahTextEl.textContent = "";
    if(bodyEl) bodyEl.textContent = "";
    setStatus("جاري تحميل التفسير…");

    const key = edition + ":" + surah + ":" + ayah;
    if(cache[key]){ render(cache[key]); return; }

    try{
      const tafsirUrl = BASE + edition + "/" + surah + "/" + ayah + ".json";
      const ayahUrl = "https://api.alquran.cloud/v1/ayah/" + surah + ":" + ayah + "/quran-uthmani";
      const [tr, ar] = await Promise.all([
        fetch(tafsirUrl, { cache: "force-cache" }).then(r=>{ if(!r.ok) throw new Error("tafsir"); return r.json(); }),
        fetch(ayahUrl, { cache: "force-cache" }).then(r=>r.ok?r.json():null).catch(()=>null)
      ]);
      let uthmani = "";
      try{ uthmani = (ar && ar.data && ar.data.text) || ""; }catch(e){}
      const text = stripTafsirNoise((tr && (tr.text || tr.tafsir || tr.content)) || "");
      const payload = { uthmani: uthmani, tafsir: text, edition: edition };
      cache[key] = payload;
      render(payload);
    }catch(e){
      setStatus("تعذر تحميل التفسير. تأكد من الإنترنت.");
      if(bodyEl) bodyEl.textContent = "";
    }
  }

  function render(p){
    if(ayahTextEl) ayahTextEl.textContent = p.uthmani || "";
    if(bodyEl) bodyEl.textContent = p.tafsir || "لا يتوفر نص لهذه الآية.";
    setStatus(EDITIONS[p.edition] || "");
  }

  function openTafsir(ref){
    ref = ref || getPlayingRef();
    if(overlay) overlay.classList.add("show");
    try{
      const menu = document.getElementById("sideMenu");
      const ov = document.getElementById("overlay");
      if(menu) menu.classList.remove("open");
      if(ov) ov.classList.remove("show");
    }catch(e){}
    loadTafsir(ref.surah, ref.ayah);
  }
  function closeTafsir(){ if(overlay) overlay.classList.remove("show"); }

  if(btn) btn.onclick = function(){ openTafsir(); };
  if(closeBtn) closeBtn.onclick = closeTafsir;
  if(overlay) overlay.addEventListener("click", function(e){ if(e.target===overlay) closeTafsir(); });
  if(editionSel) editionSel.onchange = function(){ loadTafsir(tafsirSurah, tafsirAyah); };
  if(prevBtn) prevBtn.onclick = function(){
    let s=tafsirSurah, a=tafsirAyah-1;
    if(a<1){ s=Math.max(1,s-1); a=maxAyah(s); }
    loadTafsir(s,a);
  };
  if(nextBtn) nextBtn.onclick = function(){
    let s=tafsirSurah, a=tafsirAyah+1;
    if(a>maxAyah(s)){ s=Math.min(114,s+1); a=1; }
    loadTafsir(s,a);
  };
  if(currentBtn) currentBtn.onclick = function(){ openTafsir(getPlayingRef()); };
  if(playBtn) playBtn.onclick = function(){
    try{
      if(typeof seekToAyahItem === "function" && typeof currentTiming !== "undefined"){
        const item = (currentTiming||[]).find(function(it){ return Number(it.ayah)===Number(tafsirAyah); });
        if(item){ seekToAyahItem(item,{autoPlay:true}); return; }
      }
      if(typeof loadPage === "function" && typeof surahs !== "undefined" && surahs[tafsirSurah-1]){
        loadPage(Number(surahs[tafsirSurah-1][1])||1, { surahNumber: tafsirSurah, autoContinue: true });
      }
    }catch(e){}
  };

  window.__ayaOpenTafsir = openTafsir;
  window.__ayaSetTafsirRef = function(surah, ayah){
    window.__lastTafsirRef = { surah: Number(surah), ayah: Number(ayah) };
  };
})();
