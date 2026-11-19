/* فاحص هندسي تجريبي للمسارات الفرعية في SVG صفحة 75.
   يعمل على نسخة SVG منفصلة داخل نافذة التشخيص فقط، ولا يغيّر المصحف أو التظليل. */
(function(){
  'use strict';
  const SVG_URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg';
  const NS='http://www.w3.org/2000/svg';
  function splitSubpaths(d){
    // تتبع نقطة الرسم الحالية وفق أوامر SVG، ثم تحويل كل m نسبية إلى M مطلقة.
    const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g)||[];
    const counts={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};
    const parts=[];
    let x=0,y=0,sx=0,sy=0,cmd=null,i=0,current=null;
    while(i<tokens.length){
      if(/^[a-zA-Z]$/.test(tokens[i])) cmd=tokens[i++];
      if(!cmd) break;
      const upper=cmd.toUpperCase(),rel=cmd!==upper,n=counts[upper];
      if(n===undefined) break;
      if(n===0){
        if(current) current.tokens.push('Z');
        x=sx;y=sy;cmd=null;continue;
      }
      if(i+n>tokens.length) break;
      const vals=[];
      for(let k=0;k<n;k++) vals.push(Number(tokens[i++]));
      const px=x,py=y;
      if(upper==='M'){
        const nx=rel?px+vals[0]:vals[0],ny=rel?py+vals[1]:vals[1];
        if(current) parts.push(current.tokens.join(' '));
        current={tokens:['M',String(nx),String(ny)]};
        x=nx;y=ny;sx=x;sy=y;
        if(i<tokens.length&&!/^[a-zA-Z]$/.test(tokens[i])) cmd=rel?'l':'L';
      }else{
        if(!current) current={tokens:[]};
        current.tokens.push(cmd,...vals.map(String));
        if(upper==='L'||upper==='T'){x=rel?px+vals[0]:vals[0];y=rel?py+vals[1]:vals[1];}
        else if(upper==='H') x=rel?px+vals[0]:vals[0];
        else if(upper==='V') y=rel?py+vals[0]:vals[0];
        else if(upper==='C'||upper==='S'||upper==='Q'||upper==='A'){
          const ex=vals[vals.length-2],ey=vals[vals.length-1];
          x=rel?px+ex:ex;y=rel?py+ey:ey;
        }
      }
    }
    if(current) parts.push(current.tokens.join(' '));
    return parts.filter(Boolean);
  }
  function addUI(){
    const box=document.querySelector('#ayaTajweedOverlay .at-box');
    if(!box||document.getElementById('atGeometryBtn'))return false;
    const area=document.createElement('div');
    area.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #8885';
    area.innerHTML='<button id="atGeometryBtn" type="button" style="width:100%;padding:11px;border:0;border-radius:10px;background:#176b55;color:white;font-weight:700">تحليل الأشكال هندسيًا — صفحة 75</button><div id="atGeometryStatus" style="font-size:13px;line-height:1.8;margin-top:8px"></div><div id="atGeometryPreview" style="max-height:55vh;overflow:auto;background:#fff;margin-top:8px;text-align:center"></div><button id="atGeometrySelect" type="button" style="display:none;width:100%;padding:10px;margin-top:8px">تحديد منطقة حول الكلمة بالسحب</button><div id="atGeometrySelectionStatus" style="font-size:13px;line-height:1.8;margin-top:6px"></div><button id="atGeometryCopy" type="button" style="display:none;width:100%;padding:9px;margin-top:8px">نسخ إحداثيات الأشكال (CSV)</button>';
    box.appendChild(area);
    const status=area.querySelector('#atGeometryStatus'),preview=area.querySelector('#atGeometryPreview'),copy=area.querySelector('#atGeometryCopy'),selectBtn=area.querySelector('#atGeometrySelect'),selectionStatus=area.querySelector('#atGeometrySelectionStatus');
    let csv='',allRows=[],svgRef=null,selectMode=false,dragStart=null,hitRect=null,selectionRect=null;
    area.querySelector('#atGeometryBtn').addEventListener('click',async function(){
      this.disabled=true;this.textContent='جارٍ تحليل 1317 شكلًا…';status.textContent='يتم تحميل SVG وحساب حدود الأشكال؛ قد يستغرق ذلك لحظات.';preview.replaceChildren();copy.style.display='none';
      try{
        const res=await fetch(SVG_URL,{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
        const doc=new DOMParser().parseFromString(await res.text(),'image/svg+xml');
        const paths=[...doc.getElementsByTagNameNS(NS,'path')];if(paths.length!==9)throw new Error('عدد المسارات غير المتوقع: '+paths.length);
        const viewBox=doc.documentElement.getAttribute('viewBox')||'0 0 345 550';
        // Mount the original SVG invisibly so getCTM() includes every ancestor transform.
        const sourceRoot=doc.documentElement;
        sourceRoot.setAttribute('width','345');sourceRoot.setAttribute('height','550');
        sourceRoot.style.cssText='position:absolute;left:-10000px;top:0;width:345px;height:550px;visibility:hidden';
        document.body.appendChild(sourceRoot);
        const original=[...sourceRoot.getElementsByTagNameNS(NS,'path')][8];
        const matrix=original.getCTM();
        if(!matrix) throw new Error('تعذر قراءة تحويلات SVG الأصلية');
        const svg=document.createElementNS(NS,'svg');
        svg.setAttribute('viewBox',viewBox);svg.setAttribute('width','100%');svg.setAttribute('xmlns',NS);
        svg.style.maxWidth='500px';svg.style.height='auto';preview.appendChild(svg);
        const parts=splitSubpaths(original.getAttribute('d')||'');
        const matrixText='matrix('+[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f].join(' ')+')';
        const rows=[];
        parts.forEach((d,index)=>{
          const group=document.createElementNS(NS,'g');group.setAttribute('transform',matrixText);svg.appendChild(group);
          const p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('fill','hsl('+((index*47)%360)+' 70% 48%)');p.setAttribute('fill-opacity','.82');p.setAttribute('stroke','#222');p.setAttribute('stroke-width','.22');group.appendChild(p);
          const rect=p.getBoundingClientRect(),inv=svg.getScreenCTM().inverse();
          const corners=[
            new DOMPoint(rect.left,rect.top).matrixTransform(inv),
            new DOMPoint(rect.right,rect.top).matrixTransform(inv),
            new DOMPoint(rect.right,rect.bottom).matrixTransform(inv),
            new DOMPoint(rect.left,rect.bottom).matrixTransform(inv)
          ];
          const xs=corners.map(q=>q.x),ys=corners.map(q=>q.y);
          const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
          rows.push({id:index+1,x:+x.toFixed(3),y:+y.toFixed(3),width:+w.toFixed(3),height:+h.toFixed(3)});
          const label=document.createElementNS(NS,'text');label.setAttribute('x',String(x+w/2));label.setAttribute('y',String(y+h/2));label.setAttribute('font-size','2.4');label.setAttribute('text-anchor','middle');label.setAttribute('fill','#111');label.textContent=String(index+1);svg.appendChild(label);
        });
        sourceRoot.remove();
        allRows=rows;svgRef=svg;
        // Transparent interaction layer: drag a rectangle around the target word.
        hitRect=document.createElementNS(NS,'rect');hitRect.setAttribute('x','0');hitRect.setAttribute('y','0');hitRect.setAttribute('width','345');hitRect.setAttribute('height','550');hitRect.setAttribute('fill','transparent');hitRect.setAttribute('pointer-events','all');svg.appendChild(hitRect);
        selectionRect=document.createElementNS(NS,'rect');selectionRect.setAttribute('fill','#ffcc00');selectionRect.setAttribute('fill-opacity','.16');selectionRect.setAttribute('stroke','#d00');selectionRect.setAttribute('stroke-width','1');selectionRect.setAttribute('pointer-events','none');selectionRect.style.display='none';svg.appendChild(selectionRect);
        const point=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
        hitRect.addEventListener('pointerdown',e=>{if(!selectMode)return;e.preventDefault();dragStart=point(e);selectionRect.setAttribute('x',dragStart.x);selectionRect.setAttribute('y',dragStart.y);selectionRect.setAttribute('width','0');selectionRect.setAttribute('height','0');selectionRect.style.display='block';hitRect.setPointerCapture(e.pointerId);});
        hitRect.addEventListener('pointermove',e=>{if(!dragStart||!selectMode)return;const p=point(e),x=Math.min(p.x,dragStart.x),y=Math.min(p.y,dragStart.y);selectionRect.setAttribute('x',x);selectionRect.setAttribute('y',y);selectionRect.setAttribute('width',Math.abs(p.x-dragStart.x));selectionRect.setAttribute('height',Math.abs(p.y-dragStart.y));});
        hitRect.addEventListener('pointerup',e=>{if(!dragStart||!selectMode)return;const p=point(e),x=Math.min(p.x,dragStart.x),y=Math.min(p.y,dragStart.y),w=Math.abs(p.x-dragStart.x),h=Math.abs(p.y-dragStart.y);dragStart=null;selectMode=false;selectBtn.textContent='إعادة تحديد منطقة';const chosen=allRows.filter(r=>r.x<=x+w&&r.x+r.width>=x&&r.y<=y+h&&r.y+r.height>=y);csv='id,x,y,width,height\\n'+chosen.map(r=>[r.id,r.x,r.y,r.width,r.height].join(',')).join('\\n');selectionStatus.textContent='داخل المنطقة المحددة: '+chosen.length+' شكلًا. يمكنك نسخها لإرسالها دون بقية الأشكال.';copy.textContent='نسخ أشكال المنطقة المحددة (CSV)';copy.style.display=chosen.length?'block':'none';});
        csv='id,x,y,width,height\\n'+rows.map(r=>[r.id,r.x,r.y,r.width,r.height].join(',')).join('\\n');
        copy.style.display='block';selectBtn.style.display='block';selectionStatus.textContent='اسحب بإصبعك مستطيلًا حول كلمة أَنْصَارٍ في المعاينة، ثم انسخ الأشكال التي تقع داخله.';
        status.textContent='تم استخراج '+rows.length+' شكلًا من المسار التاسع. الألوان والأرقام في المعاينة تشخيصية فقط وليست أحكام تجويد. الإحداثيات تقريبية لحدود كل مسار فرعي؛ وقد يحتوي الشكل على أكثر من جزء من الحرف.';
        this.textContent='إعادة التحليل الهندسي';
      }catch(e){status.textContent='تعذر التحليل: '+(e&&e.message?e.message:String(e));this.textContent='إعادة المحاولة';}
      this.disabled=false;
    });
    selectBtn.addEventListener('click',()=>{if(!svgRef)return;selectMode=true;dragStart=null;selectionRect.style.display='none';selectionStatus.textContent='اسحب الآن مستطيلًا حول الكلمة في معاينة المصحف.';selectBtn.textContent='اسحب داخل المعاينة…';});
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(csv);copy.textContent='تم نسخ CSV';}catch(e){copy.textContent='تعذر النسخ؛ حاول مرة أخرى';}});
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addUI);else addUI();
  new MutationObserver(addUI).observe(document.documentElement,{childList:true,subtree:true});
})();