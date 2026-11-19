/* تلوين كلمة أَنْصَارٍ في صفحة 75 فقط — إخفاء حقيقي.
   يعتمد على حدود الكلمة التي راجعها المستخدم. لا يغيّر SVG الأصلي أو نظام تمييز الآيات. */
(function(){
  'use strict';
  const PAGE=75, URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg';
  const BOX={x1:171.5,y1:57.4,x2:202.5,y2:87.6};
  const NS='http://www.w3.org/2000/svg', COLOR='#168443';
  let overlay=null, lastPage=0, busy=false, resizeTimer=0;
  const img=document.getElementById('quranPage');
  if(!img)return;

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
  function removeOverlay(){if(overlay){overlay.remove();overlay=null;}}
  function place(){
    if(!overlay||!img.isConnected)return;
    const r=img.getBoundingClientRect();
    overlay.style.left=r.left+'px';overlay.style.top=r.top+'px';
    overlay.style.width=r.width+'px';overlay.style.height=r.height+'px';
  }
  async function apply(){
    if(busy||Number(window.currentPage||localStorage.getItem('quranPage')||0)!==PAGE)return;
    busy=true;
    try{
      const res=await fetch(URL,{cache:'force-cache'});
      if(!res.ok)throw new Error('SVG unavailable');
      const doc=new DOMParser().parseFromString(await res.text(),'image/svg+xml');
      const root=doc.documentElement;
      if(doc.querySelector('parsererror'))throw new Error('SVG parse error');
      const paths=[...root.querySelectorAll('path')];
      if(paths.length!==9)throw new Error('Unexpected SVG paths');
      const source=paths[8], parent=source.parentNode;
      const parts=splitPath(source.getAttribute('d')||'');
      const picked=[];
      parts.forEach((d,i)=>{
        const p=doc.createElementNS(NS,'path');p.setAttribute('d',d);parent.appendChild(p);
        let b=null;try{b=p.getBBox();}catch(e){}
        p.remove();
        if(b&&b.width>=0&&b.height>=0&&b.x<=BOX.x2&&b.x+b.width>=BOX.x1&&b.y<=BOX.y2&&b.y+b.height>=BOX.y1){
          picked.push(d);
        }
      });
      if(!picked.length)throw new Error('No word shapes found in reviewed bounds');
      const vb=root.getAttribute('viewBox');
      if(!vb)throw new Error('Missing SVG viewBox');
      const svg=document.createElementNS(NS,'svg');
      svg.setAttribute('viewBox',vb);svg.setAttribute('preserveAspectRatio',root.getAttribute('preserveAspectRatio')||'xMidYMid meet');
      svg.setAttribute('aria-label','تلوين كلمة أَنْصَارٍ — إخفاء حقيقي');
      svg.style.cssText='position:fixed;z-index:40;pointer-events:none;overflow:visible;display:block';
      /* اخفِ محتوى نسخة المعاينة، وأبقِ مسارات الكلمة المختارة فقط. */
      const chain=[];for(let n=parent;n&&n!==root;n=n.parentNode)chain.unshift(n);
      let target=svg;
      chain.forEach(n=>{
        const g=document.createElementNS(NS,'g');
        const tr=n.getAttribute&&n.getAttribute('transform');if(tr)g.setAttribute('transform',tr);
        target.appendChild(g);target=g;
      });
      picked.forEach(d=>{
        const p=document.createElementNS(NS,'path');p.setAttribute('d',d);
        p.setAttribute('fill',COLOR);p.setAttribute('fill-opacity','1');p.setAttribute('stroke','none');
        p.style.cssText='fill:'+COLOR+'!important;fill-opacity:1!important;stroke:none!important;opacity:1!important';
        target.appendChild(p);
      });
      document.body.appendChild(svg);overlay=svg;place();
      window.addEventListener('resize',place,{passive:true});
      window.addEventListener('scroll',place,{passive:true,capture:true});
    }catch(e){
      console.warn('[Aya Tajweed page 75]',e);
      removeOverlay();
    }finally{busy=false;}
  }
  function check(){
    const p=Number(window.currentPage||localStorage.getItem('quranPage')||1);
    if(p!==PAGE){if(lastPage===PAGE)removeOverlay();lastPage=p;return;}
    if(p===PAGE&&lastPage!==PAGE){lastPage=p;apply();}
    else if(p===PAGE&&!overlay&&img.complete&&img.naturalWidth)apply();
  }
  img.addEventListener('load',()=>{if(Number(window.currentPage||localStorage.getItem('quranPage')||1)===PAGE){removeOverlay();apply();}});
  setInterval(check,500);
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(place,80);},{passive:true});
  check();
})();