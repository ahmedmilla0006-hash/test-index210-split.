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
    if(enabled) renderPage(currentPageNumber());
    else host.replaceChildren();
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
      status.textContent="";
    }catch(error){
      if(token!==requestToken||!enabled) return;
      host.replaceChildren();
      status.textContent="تعذّر تحميل الصفحة. تحقق من الاتصال.";
      console.warn("[Aya Madinah Mushaf]",error);
    }
  }
  button.addEventListener("click",()=>setMode(!enabled));
  const observer=new MutationObserver(()=>{
    if(enabled) renderPage(currentPageNumber());
  });
  observer.observe(pageImage,{attributes:true,attributeFilter:["src"]});
  window.addEventListener("pageshow",()=>{if(enabled)renderPage(currentPageNumber());});
  setMode(enabled);
})();