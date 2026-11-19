/* فاحص تشخيصي لبنية SVG — صفحة 75 فقط.
   لا يغيّر المصحف ولا يلمس طبقة التظليل أو ملفات SVG. */
(function(){
  'use strict';
  const SVG_URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg';
  function addInspector(){
    const overlay=document.getElementById('ayaTajweedOverlay');
    if(!overlay || document.getElementById('atInspectBtn')) return false;
    const box=overlay.querySelector('.at-box');
    if(!box) return false;
    const wrap=document.createElement('div');
    wrap.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #8885';
    wrap.innerHTML='<button type="button" id="atInspectBtn" style="width:100%;padding:11px;border:0;border-radius:10px;background:#315b83;color:#fff;font-weight:700">فحص بنية SVG لصفحة 75</button><pre id="atInspectReport" dir="ltr" style="display:none;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left;max-height:240px;overflow:auto;font-size:11px;padding:10px;background:#8881;border-radius:8px"></pre><button type="button" id="atCopyReport" style="display:none;width:100%;padding:9px;margin-top:7px">نسخ التقرير</button>';
    box.appendChild(wrap);
    const report=wrap.querySelector('#atInspectReport');
    const copy=wrap.querySelector('#atCopyReport');
    wrap.querySelector('#atInspectBtn').addEventListener('click',async function(){
      this.disabled=true; this.textContent='جارٍ فحص SVG…';
      try{
        const response=await fetch(SVG_URL,{cache:'no-store'});
        if(!response.ok) throw new Error('HTTP '+response.status);
        const source=await response.text();
        const doc=new DOMParser().parseFromString(source,'image/svg+xml');
        if(doc.querySelector('parsererror')) throw new Error('تعذر تحليل ملف SVG');
        const root=doc.documentElement;
        const names=['path','g','text','use','image','defs','symbol','clipPath','rect','polygon','polyline','circle','ellipse'];
        const counts={}; names.forEach(n=>counts[n]=doc.getElementsByTagNameNS('*',n).length);
        const paths=[...doc.getElementsByTagNameNS('*','path')];
        const reportData={
          page:75, url:SVG_URL, httpStatus:response.status,
          svgViewBox:root.getAttribute('viewBox'),
          svgWidth:root.getAttribute('width'), svgHeight:root.getAttribute('height'),
          elementCounts:counts,
          pathsWithFill:paths.filter(p=>p.hasAttribute('fill')||p.style.fill).length,
          pathsWithStroke:paths.filter(p=>p.hasAttribute('stroke')||p.style.stroke).length,
          pathsWithId:paths.filter(p=>p.hasAttribute('id')).length,
          pathsWithClass:paths.filter(p=>p.hasAttribute('class')).length,
          samplePaths:paths.map((p,i)=>{
            const d=p.getAttribute('d')||'';
            const parent=p.parentElement;
            return {index:i+1,dLength:d.length,moveCommands:(d.match(/[Mm]/g)||[]).length,
              relativeMoveCommands:(d.match(/m/g)||[]).length,
              absoluteMoveCommands:(d.match(/M/g)||[]).length,
              fill:p.getAttribute('fill'),parentTag:parent&&parent.localName,
              parentChildElements:parent?parent.children.length:0,
              groupAncestors:(()=>{let n=parent,c=0;while(n&&n!==root){if(n.localName==='g')c++;n=n.parentElement;}return c;})()};
          }),
          note:'عدد أوامر M/m يقدّر عدد بدايات المسارات الفرعية داخل كل path، لكنه لا يثبت أن كل مسار فرعي حرف مستقل ولا يحدد كلمة أَنْصَارٍ وحدها.'
        };
        report.textContent=JSON.stringify(reportData,null,2);
      }catch(err){
        report.textContent='تعذر فحص SVG: '+(err&&err.message?err.message:String(err))+'\nقد يكون السبب منع CORS أو تعذر الاتصال بخادم MP3Quran.';
      }
      report.style.display='block'; copy.style.display='block';
      this.disabled=false; this.textContent='إعادة فحص SVG لصفحة 75';
    });
    copy.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(report.textContent);copy.textContent='تم نسخ التقرير';}
      catch(e){copy.textContent='حدد التقرير وانسخه يدويًا';}
    });
    return true;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addInspector);
  else addInspector();
  new MutationObserver(addInspector).observe(document.documentElement,{childList:true,subtree:true});
})();