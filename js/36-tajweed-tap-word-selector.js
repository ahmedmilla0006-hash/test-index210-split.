/* تحديد أشكال كلمة من معاينة SVG بلمسة واحدة — صفحة 75 فقط.
   أداة مراجعة: لا تلوّن المصحف ولا تغيّر نظام التظليل الحالي. */
(function(){
  'use strict';
  const SVG_URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg';
  const NS='http://www.w3.org/2000/svg';
  const $=id=>document.getElementById(id);
  function splitPath(d){
    const t=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
    const ar={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};
    const out=[];let i=0,cmd=null,x=0,y=0,sx=0,sy=0,part=null;
    while(i<t.length){
      if(/^[a-zA-Z]$/.test(t[i]))cmd=t[i++];
      if(!cmd)break;
      const u=cmd.toUpperCase(),rel=cmd!==u,n=ar[u];
      if(n===undefined)break;
      if(n===0){if(part)part.push('Z');x=sx;y=sy;cmd=null;continue;}
      if(i+n>t.length)break;
      const v=t.slice(i,i+n).map(Number);i+=n;const px=x,py=y;
      if(u==='M'){
        const nx=rel?px+v[0]:v[0],ny=rel?py+v[1]:v[1];
        if(part)out.push(part.join(' '));
        part=['M',String(nx),String(ny)];x=sx=nx;y=sy=ny;cmd=rel?'l':'L';
      }else{
        if(!part)part=[];
        part.push(cmd,...v.map(String));
        if(u==='L'||u==='T'){x=rel?px+v[0]:v[0];y=rel?py+v[1]:v[1];}
        else if(u==='H')x=rel?px+v[0]:v[0];
        else if(u==='V')y=rel?py+v[0]:v[0];
        else if(u==='C'||u==='S'||u==='Q'||u==='A'){const ex=v[v.length-2],ey=v[v.length-1];x=rel?px+ex:ex;y=rel?py+ey:ey;}
      }
    }
    if(part)out.push(part.join(' '));
    return out.filter(Boolean);
  }
  function install(){
    const box=$('ayaTajweedOverlay')?.querySelector('.at-box');
    if(!box||$('atTapSelector'))return false;
    const section=document.createElement('section');section.id='atTapSelector';
    section.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #8885';
    section.innerHTML='<button type="button" id="atTapOpen" style="width:100%;padding:12px;border:0;border-radius:10px;background:#175b83;color:#fff;font-weight:700">معاينة الصفحة وتحديد الكلمة بلمسة</button><div id="atTapPanel" style="display:none;margin-top:10px"><p style="font-size:13px;line-height:1.7;margin:0 0 8px">المس وسط كلمة «أَنْصَارٍ» مرة واحدة. ستظهر الأشكال التي التقطتها الأداة بلون واضح للمراجعة.</p><div id="atTapStatus" role="status" style="font-size:13px;margin:6px 0 9px">جارٍ تجهيز المعاينة…</div><div id="atTapStage" style="width:100%;max-height:58vh;overflow:auto;background:#fff;border-radius:10px;padding:4px;touch-action:pan-y"><div id="atTapSvgHost"></div></div><div style="display:flex;gap:8px;margin-top:9px"><button type="button" id="atTapAgain" style="flex:1;padding:10px;border:0;border-radius:9px">إعادة التحديد</button><button type="button" id="atTapClose" style="flex:1;padding:10px;border:0;border-radius:9px">إغلاق المعاينة</button></div><div id="atTapResult" style="font-size:12px;line-height:1.7;margin-top:8px"></div></div>';
    box.appendChild(section);
    const panel=$('atTapPanel'),status=$('atTapStatus'),host=$('atTapSvgHost'),result=$('atTapResult');
    let svg=null,source=null,parts=[],shapes=[],overlay=null,selected=[];
    function clearMarks(){if(overlay)overlay.remove();overlay=null;selected=[];result.textContent='';}
    function makeOverlay(){
      overlay=document.createElementNS(NS,'g');overlay.setAttribute('id','atTapSelectionOverlay');overlay.setAttribute('pointer-events','none');
      // ارسم طبقة التحديد مباشرة تحت SVG الجذر، مع تطبيق مصفوفة CTM الكاملة
      // للمسار الأصلي؛ وبذلك لا نفقد تحويلات المجموعات الأم أو تحويل المسار نفسه.
      const matrix=source.getCTM();
      if(matrix)overlay.setAttribute('transform','matrix('+[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f].join(' ')+')');
      svg.appendChild(overlay);
      overlay.style.setProperty('display','inline');
      overlay.style.setProperty('visibility','visible');
      overlay.style.setProperty('opacity','1');
      shapes.forEach(shape=>{
        const p=document.createElementNS(NS,'path');p.setAttribute('d',parts[shape.i]);p.setAttribute('fill','#00a85a');p.setAttribute('fill-opacity','.9');p.setAttribute('stroke','#e00036');p.setAttribute('stroke-width','.7');p.setAttribute('vector-effect','non-scaling-stroke');overlay.appendChild(p);shape.mark=p;
      });
    }
    function choose(clientX,clientY){
      if(!svg||!source||!shapes.length)return;
      const inv=source.getScreenCTM()?.inverse();if(!inv){status.textContent='تعذر حساب موضع اللمسة.';return;}
      const pt=new DOMPoint(clientX,clientY).matrixTransform(inv);
      let best=null,bestD=Infinity;
      shapes.forEach(s=>{
        const dx=Math.max(s.b.x-pt.x,0,pt.x-(s.b.x+s.b.width));
        const dy=Math.max(s.b.y-pt.y,0,pt.y-(s.b.y+s.b.height));
        const d=Math.hypot(dx,dy);
        if(d<bestD){bestD=d;best=s;}
      });
      if(!best||bestD>18){status.textContent='لم تُلتقط أشكال قريبة. المس وسط الكلمة مباشرة.';return;}
      clearMarks();
      makeOverlay();
      const ax=best.b.x+best.b.width/2,ay=best.b.y+best.b.height/2;
      // جمع مكونات الحرف ونقاطه وحركاته القريبة من موضع اللمسة.
      selected=shapes.filter(s=>{
        const cx=s.b.x+s.b.width/2,cy=s.b.y+s.b.height/2;
        return Math.abs(cx-ax)<=27 && Math.abs(cy-ay)<=17;
      });
      if(!selected.includes(best))selected.push(best);
      selected.forEach(s=>s.mark?.setAttribute('fill','#00a85a'));
      selected.forEach(s=>s.mark?.setAttribute('fill-opacity','.9'));
      status.textContent='تم التقاط '+selected.length+' شكلًا قريبًا. راجع التحديد فوق الكلمة.';
      const b=selected.reduce((a,s)=>({x:Math.min(a.x,s.b.x),y:Math.min(a.y,s.b.y),r:Math.max(a.r,s.b.x+s.b.width),bt:Math.max(a.bt,s.b.y+s.b.height)}),{x:Infinity,y:Infinity,r:-Infinity,bt:-Infinity});
      result.textContent='حدود التحديد التقريبية: x '+b.x.toFixed(1)+'–'+b.r.toFixed(1)+' ، y '+b.y.toFixed(1)+'–'+b.bt.toFixed(1)+' . هذا تحديد تجريبي للمراجعة فقط، ولم يتم التلوين.';
    }
    async function load(){
      panel.style.display='block';status.textContent='جارٍ تحميل SVG صفحة 75…';host.textContent='';
      try{
        const response=await fetch(SVG_URL,{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);
        const doc=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
        if(doc.querySelector('parsererror'))throw new Error('تعذر تحليل SVG');
        svg=doc.documentElement;svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('viewBox',svg.getAttribute('viewBox')||'0 0 345 550');svg.setAttribute('width','100%');svg.setAttribute('height','auto');svg.style.cssText='display:block;width:100%;height:auto;max-width:100%;background:#fff;touch-action:pan-y';
        host.appendChild(document.importNode(svg,true));svg=host.querySelector('svg');
        const paths=[...svg.querySelectorAll('path')];if(paths.length!==9)throw new Error('بنية SVG غير متوقعة: '+paths.length+' مسارات');
        source=paths[8];parts=splitPath(source.getAttribute('d')||'');shapes=[];
        parts.forEach((d,i)=>{
          const p=document.createElementNS(NS,'path');p.setAttribute('d',d);source.parentNode.appendChild(p);
          let b;try{b=p.getBBox();}catch(e){b=null;}p.remove();
          if(b&&Number.isFinite(b.x+b.y+b.width+b.height))shapes.push({i,b,mark:null});
        });
        makeOverlay();
        svg.addEventListener('click',e=>choose(e.clientX,e.clientY));
        svg.addEventListener('touchend',e=>{if(e.changedTouches&&e.changedTouches[0]){const t=e.changedTouches[0];choose(t.clientX,t.clientY);}},{passive:true});
        status.textContent='المعاينة جاهزة. المس كلمة «أَنْصَارٍ» مرة واحدة.';
      }catch(e){status.textContent='تعذر تجهيز المعاينة: '+(e.message||String(e))+' — قد يمنع الاتصال أو CORS تحميل SVG.';}
    }
    $('atTapOpen').addEventListener('click',load);
    $('atTapAgain').addEventListener('click',()=>{clearMarks();status.textContent='المس كلمة «أَنْصَارٍ» مرة واحدة لتحديدها من جديد.';});
    $('atTapClose').addEventListener('click',()=>{panel.style.display='none';clearMarks();});
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();