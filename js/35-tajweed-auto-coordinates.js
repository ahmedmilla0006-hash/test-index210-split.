/* استخراج آلي لإحداثيات الأجزاء الهندسية في صفحة 75.
   أداة تشخيص فقط: لا تعدّل SVG المصحف ولا طبقة تظليل الآيات. */
(function(){
  'use strict';
  const URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg';
  const NS='http://www.w3.org/2000/svg';
  function split(d){
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
      const v=t.slice(i,i+n).map(Number);i+=n;
      const px=x,py=y;
      if(u==='M'){
        const nx=rel?px+v[0]:v[0],ny=rel?py+v[1]:v[1];
        if(part)out.push(part.join(' '));
        part=['M',String(nx),String(ny)];x=sx=nx;y=sy=ny;
        cmd=rel?'l':'L';
      }else{
        if(!part)part=[];
        part.push(cmd,...v.map(String));
        if(u==='L'||u==='T'){x=rel?px+v[0]:v[0];y=rel?py+v[1]:v[1];}
        else if(u==='H')x=rel?px+v[0]:v[0];
        else if(u==='V')y=rel?py+v[0]:v[0];
        else if(u==='C'||u==='S'||u==='Q'||u==='A'){
          const ex=v[v.length-2],ey=v[v.length-1];x=rel?px+ex:ex;y=rel?py+ey:ey;
        }
      }
    }
    if(part)out.push(part.join(' '));
    return out.filter(Boolean);
  }
  function install(){
    const box=document.querySelector('#ayaTajweedOverlay .at-box');
    if(!box||document.getElementById('atAutoCoordsBtn'))return false;
    const wrap=document.createElement('div');
    wrap.style.cssText='margin-top:14px;padding-top:12px;border-top:1px solid #8885';
    wrap.innerHTML='<button id="atAutoCoordsBtn" type="button" style="width:100%;padding:11px;border:0;border-radius:10px;background:#175b83;color:white;font-weight:700">استخراج الإحداثيات تلقائيًا</button><div id="atAutoCoordsStatus" style="font-size:13px;line-height:1.8;margin-top:8px"></div><button id="atAutoCoordsCopy" type="button" style="display:none;width:100%;padding:9px;margin-top:7px">نسخ تقرير الإحداثيات CSV</button>';
    box.appendChild(wrap);
    const btn=wrap.querySelector('#atAutoCoordsBtn'),status=wrap.querySelector('#atAutoCoordsStatus'),copy=wrap.querySelector('#atAutoCoordsCopy');
    let csv='';
    btn.addEventListener('click',async()=>{
      btn.disabled=true;btn.textContent='جارٍ استخراج الإحداثيات…';status.textContent='تحميل SVG وحساب حدود كل جزء هندسي.';
      copy.style.display='none';
      let root=null;
      try{
        const res=await fetch(URL,{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);
        const doc=new DOMParser().parseFromString(await res.text(),'image/svg+xml');
        if(doc.querySelector('parsererror'))throw new Error('تعذر تحليل SVG');
        const paths=[...doc.getElementsByTagNameNS(NS,'path')];
        if(paths.length!==9)throw new Error('عدد المسارات غير المتوقع: '+paths.length);
        root=doc.documentElement;
        root.setAttribute('width','345');root.setAttribute('height','550');
        root.style.cssText='position:absolute;left:-10000px;top:0;width:345px;height:550px;visibility:hidden';
        document.body.appendChild(root);
        const source=paths[8];
        // الطريقة التي نجحت سابقًا: getCTM() للمسار بعد إرفاق SVG الأصلي
        // يعيد سلسلة التحويلات الموروثة من جميع مجموعات <g> حتى مساحة SVG.
        // لا نطرح getScreenCTM للجذر؛ لأنه يخلط موضع SVG المخفي على الشاشة
        // مع تحويلات الرسم، وقد ينتج إحداثيات خارج نطاق viewBox.
        const matrix=source.getCTM();
        if(!matrix)throw new Error('تعذر حساب سلسلة تحويلات المسار الموروثة');
        const probe=document.createElementNS(NS,'svg');
        probe.setAttribute('viewBox',root.getAttribute('viewBox')||'0 0 345 550');
        probe.setAttribute('width','345');probe.setAttribute('height','550');
        probe.style.cssText='position:absolute;left:0;top:0;overflow:visible';
        document.body.appendChild(probe);
        const parts=split(source.getAttribute('d')||''),rows=[];
        const transform='matrix('+[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f].join(' ')+')';
        for(let i=0;i<parts.length;i++){
          const g=document.createElementNS(NS,'g');g.setAttribute('transform',transform);probe.appendChild(g);
          const p=document.createElementNS(NS,'path');p.setAttribute('d',parts[i]);p.setAttribute('fill','#000');g.appendChild(p);
          const r=p.getBoundingClientRect();
          const inv=probe.getScreenCTM().inverse();
          const pts=[[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]].map(([a,b])=>{const q=new DOMPoint(a,b).matrixTransform(inv);return q;});
          const xs=pts.map(q=>q.x),ys=pts.map(q=>q.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
          if(Number.isFinite(x+y+w+h)&&w>=0&&h>=0)rows.push({id:i+1,x,y,width:w,height:h,cx:x+w/2,cy:y+h/2});
          probe.removeChild(g);
        }
        probe.remove();root.remove();root=null;
        // تجميع تقريبي حسب مستوى السطر، ثم ترتيب من اليمين إلى اليسار.
        const ordered=[...rows].sort((a,b)=>a.cy-b.cy);
        const lines=[];const tolerance=3.2;
        ordered.forEach(r=>{
          let line=lines.find(v=>Math.abs(v.center-r.cy)<=tolerance);
          if(!line){line={center:r.cy,items:[]};lines.push(line);}
          line.items.push(r);line.center=line.items.reduce((s,v)=>s+v.cy,0)/line.items.length;
        });
        lines.sort((a,b)=>a.center-b.center);
        const final=[];
        lines.forEach((line,index)=>line.items.sort((a,b)=>b.cx-a.cx).forEach(r=>final.push({line:index+1,...r})));
        const head='line,id,x,y,width,height,cx,cy';
        csv=head+'\\n'+final.map(r=>[r.line,r.id,...['x','y','width','height','cx','cy'].map(k=>r[k].toFixed(3))].join(',')).join('\\n');
        const minY=Math.min(...rows.map(r=>r.y)),maxY=Math.max(...rows.map(r=>r.y));
        status.textContent='اكتمل استخراج '+rows.length+' جزءًا هندسيًا، وجُمّعت مبدئيًا في '+lines.length+' مستويات أفقية. الترتيب داخل كل مستوى من اليمين إلى اليسار. هذا لا يحدد الكلمات بعد؛ لأن الحروف والنقاط والتشكيل قد تكون أجزاء منفصلة.';
        copy.style.display='block';copy.textContent='نسخ تقرير الإحداثيات CSV';btn.textContent='إعادة استخراج الإحداثيات';
      }catch(e){
        if(root&&root.isConnected)root.remove();
        status.textContent='تعذر الاستخراج: '+(e&&e.message?e.message:String(e));
        btn.textContent='إعادة المحاولة';
      }
      btn.disabled=false;
    });
    copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(csv);copy.textContent='تم نسخ التقرير';}catch(e){copy.textContent='تعذر النسخ؛ حاول مرة أخرى';}});
    return true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();