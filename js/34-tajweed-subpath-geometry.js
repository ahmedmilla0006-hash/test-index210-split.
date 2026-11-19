/* فاحص هندسي تجريبي للمسارات الفرعية في SVG صفحة 75.
   يعمل على نسخة SVG منفصلة داخل نافذة التشخيص فقط، ولا يغيّر المصحف أو التظليل. */
(function(){
  'use strict';
  const SVG_URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg';
  const NS='http://www.w3.org/2000/svg';
  function splitSubpaths(d){
    const tokens=d.match(/[a-zA-Z]|[-+]?(?:\\d*\\.)?\\d+(?:[eE][-+]?\\d+)?/g)||[];
    const arity={m:2,l:2,h:1,v:1,c:6,s:4,q:4,t:2,a:7};
    const out=[]; let i=0,cmd='',x=0,y=0,sx=0,sy=0,current=null;
    const num=()=>Number(tokens[i++]);
    const add=(v)=>current.push(String(v));
    function finish(){if(current&&current.length)out.push(current.join(' '));current=null;}
    while(i<tokens.length){
      if(/^[a-zA-Z]$/.test(tokens[i])) cmd=tokens[i++];
      if(!cmd) break;
      const low=cmd.toLowerCase(), rel=cmd===low;
      if(low==='z'){
        if(current)add(cmd);
        x=sx;y=sy;cmd='';continue;
      }
      const n=arity[low]; if(!n) break;
      if(i>=tokens.length||/^[a-zA-Z]$/.test(tokens[i])) continue;
      let first=true;
      while(i<tokens.length&&!/^[a-zA-Z]$/.test(tokens[i])){
        if(low==='m'){
          const ox=x,oy=y,px=num(),py=num();
          const nx=rel?ox+px:px,ny=rel?oy+py:py;
          if(first){finish();current=['M',String(nx),String(ny)];sx=nx;sy=ny;}
          else {current.push(rel?'l':'L',String(px),String(py));}
          x=nx;y=ny;first=false;
          if(i<tokens.length&&!/^[a-zA-Z]$/.test(tokens[i])){
            // الأزواج الإضافية بعد moveto تعامل كأوامر lineto.
            const save=cmd;cmd=rel?'l':'L';
            while(i<tokens.length&&!/^[a-zA-Z]$/.test(tokens[i])){
              const a=num(),b=num();current.push(cmd,String(a),String(b));x=rel?x+a:a;y=rel?y+b:b;
            }
            cmd=save;
          }
          break;
        }
        const vals=[];for(let k=0;k<n&&i<tokens.length&&!/^[a-zA-Z]$/.test(tokens[i]);k++)vals.push(num());
        if(vals.length!==n)break;
        if(!current)current=[];
        current.push(cmd,...vals.map(String));
        if(low==='l'||low==='t'){x=rel?x+vals[0]:vals[0];y=rel?y+vals[1]:vals[1];}
        else if(low==='h')x=rel?x+vals[0]:vals[0];
        else if(low==='v')y=rel?y+vals[0]:vals[0];
        else if(low==='c'){x=rel?x+vals[4]:vals[4];y=rel?y+vals[5]:vals[5];}
        else if(low==='s'||low==='q'){x=rel?x+vals[2]:vals[2];y=rel?y+vals[3]:vals[3];}
        else if(low==='a'){x=rel?x+vals[5]:vals[5];y=rel?y+vals[6]:vals[6];}
        first=false;
      }
    }
    finish();return out;
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
        const rows=[];
        parts.forEach((d,index)=>{
          const p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('fill','#222');p.setAttribute('stroke','none');svg.appendChild(p);
          const b=p.getBBox();rows.push({id:index+1,x:+b.x.toFixed(3),y:+b.y.toFixed(3),width:+b.width.toFixed(3),height:+b.height.toFixed(3)});
          p.setAttribute('fill','hsl('+((index*47)%360)+' 70% 48%)');p.setAttribute('fill-opacity','.82');p.setAttribute('stroke','#222');p.setAttribute('stroke-width','.22');
          const label=document.createElementNS(NS,'text');label.setAttribute('x',String(b.x+b.width/2));label.setAttribute('y',String(b.y+b.height/2));label.setAttribute('font-size','2.4');label.setAttribute('text-anchor','middle');label.setAttribute('fill','#111');label.textContent=String(index+1);svg.appendChild(label);
        });
        csv='id,x,y,width,height\\n'+rows.map(r=>[r.id,r.x,r.y,r.width,r.height].join(',')).join('\\n');
        preview.appendChild(svg);copy.style.display='block';
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