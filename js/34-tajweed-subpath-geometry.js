/* فاحص هندسي تجريبي للمسارات الفرعية في SVG صفحة 75.
   يعمل على نسخة SVG منفصلة داخل نافذة التشخيص فقط، ولا يغيّر المصحف أو التظليل. */
(function(){
  'use strict';
  const SVG_URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg';
  const NS='http://www.w3.org/2000/svg';
  function splitSubpaths(d){
    // في هذا الملف ثبت أن أوامر بدء الأشكال الفرعية كلها m صغيرة.
    // نقسم عند أوامر m فقط، مع إبقاء بقية أوامر الرسم كما هي.
    const starts=[];
    const re=/m(?=[\s,+\-\d.])/g;
    let match;
    while((match=re.exec(d))!==null) starts.push(match.index);
    const out=[];
    for(let i=0;i<starts.length;i++){
      const segment=d.slice(starts[i],i+1<starts.length?starts[i+1]:d.length).trim();
      if(segment) out.push(segment);
    }
    return out;
  }
  function addUI(){
    const box=document.querySelector('#ayaTajweedOverlay .at-box');
    if(!box||document.getElementById('atGeometryBtn'))return false;
    const area=document.createElement('div');
    area.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #8885';
    area.innerHTML='<button id="atGeometryBtn" type="button" style="width:100%;padding:11px;border:0;border-radius:10px;background:#176b55;color:white;font-weight:700">تحليل الأشكال هندسيًا — صفحة 75</button><div id="atGeometryStatus" style="font-size:13px;line-height:1.8;margin-top:8px"></div><div id="atGeometryPreview" style="max-height:55vh;overflow:auto;background:#fff;margin-top:8px;text-align:center"></div><button id="atGeometryCopy" type="button" style="display:none;width:100%;padding:9px;margin-top:8px">نسخ إحداثيات الأشكال (CSV)</button>';
    box.appendChild(area);
    const status=area.querySelector('#atGeometryStatus'),preview=area.querySelector('#atGeometryPreview'),copy=area.querySelector('#atGeometryCopy');
    let csv='';
    area.querySelector('#atGeometryBtn').addEventListener('click',async function(){
      this.disabled=true;this.textContent='جارٍ تحليل 1317 شكلًا…';status.textContent='يتم تحميل SVG وحساب حدود الأشكال؛ قد يستغرق ذلك لحظات.';preview.replaceChildren();copy.style.display='none';
      try{
        const res=await fetch(SVG_URL,{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
        const doc=new DOMParser().parseFromString(await res.text(),'image/svg+xml');
        const paths=[...doc.getElementsByTagNameNS(NS,'path')];if(paths.length!==9)throw new Error('عدد المسارات غير المتوقع: '+paths.length);
        const original=paths[8],parts=splitSubpaths(original.getAttribute('d')||'');
        const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',doc.documentElement.getAttribute('viewBox')||'0 0 345 550');svg.setAttribute('width','100%');svg.setAttribute('xmlns',NS);svg.style.maxWidth='500px';svg.style.height='auto';
        const rows=[];preview.appendChild(svg);
        parts.forEach((d,index)=>{
          const p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('fill','#222');p.setAttribute('stroke','none');svg.appendChild(p);
          const b=p.getBBox();rows.push({id:index+1,x:+b.x.toFixed(3),y:+b.y.toFixed(3),width:+b.width.toFixed(3),height:+b.height.toFixed(3)});
          p.setAttribute('fill','hsl('+((index*47)%360)+' 70% 48%)');p.setAttribute('fill-opacity','.82');p.setAttribute('stroke','#222');p.setAttribute('stroke-width','.22');
          const label=document.createElementNS(NS,'text');label.setAttribute('x',String(b.x+b.width/2));label.setAttribute('y',String(b.y+b.height/2));label.setAttribute('font-size','2.4');label.setAttribute('text-anchor','middle');label.setAttribute('fill','#111');label.textContent=String(index+1);svg.appendChild(label);
        });
        csv='id,x,y,width,height\\n'+rows.map(r=>[r.id,r.x,r.y,r.width,r.height].join(',')).join('\\n');
        copy.style.display='block';
        status.textContent='تم استخراج '+rows.length+' شكلًا من المسار التاسع. الألوان والأرقام في المعاينة تشخيصية فقط وليست أحكام تجويد. الإحداثيات تقريبية لحدود كل مسار فرعي؛ وقد يحتوي الشكل على أكثر من جزء من الحرف.';
        this.textContent='إعادة التحليل الهندسي';
      }catch(e){status.textContent='تعذر التحليل: '+(e&&e.message?e.message:String(e));this.textContent='إعادة المحاولة';}
      this.disabled=false;
    });
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(csv);copy.textContent='تم نسخ CSV';}catch(e){copy.textContent='تعذر النسخ؛ حاول مرة أخرى';}});
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addUI);else addUI();
  new MutationObserver(addUI).observe(document.documentElement,{childList:true,subtree:true});
})();