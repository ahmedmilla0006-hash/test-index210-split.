/* تقرير هندسي لأجزاء كلمة أنصار — تشخيص فقط، لا يغيّر التلوين. */
(function(){
'use strict';
const URL='https://www.mp3quran.net/api/quran_pages_svg/075.svg',NS='http://www.w3.org/2000/svg';
const BOX={x1:171.5,y1:57.4,x2:202.5,y2:87.6};
function split(d){
 const t=d.match(/[a-zA-Z]|[-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?/g)||[],ar={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};
 const out=[];let i=0,c=null,x=0,y=0,sx=0,sy=0,p=null;
 while(i<t.length){if(/^[a-zA-Z]$/.test(t[i]))c=t[i++];if(!c)break;const u=c.toUpperCase(),rel=c!==u,n=ar[u];if(n===undefined)break;if(!n){if(p)p.push('Z');x=sx;y=sy;c=null;continue;}if(i+n>t.length)break;const v=t.slice(i,i+n).map(Number),px=x,py=y;i+=n;
 if(u==='M'){const nx=rel?px+v[0]:v[0],ny=rel?py+v[1]:v[1];if(p)out.push(p.join(' '));p=['M',nx,ny];x=sx=nx;y=sy=ny;c=rel?'l':'L';}
 else{if(!p)p=[];p.push(c,...v);if(u==='L'||u==='T'){x=rel?px+v[0]:v[0];y=rel?py+v[1]:v[1];}else if(u==='H')x=rel?px+v[0]:v[0];else if(u==='V')y=rel?py+v[0]:v[0];else if('CSQA'.includes(u)){const ex=v[v.length-2],ey=v[v.length-1];x=rel?px+ex:ex;y=rel?py+ey:ey;}}
 }if(p)out.push(p.join(' '));return out;
}
function install(){
 const box=document.querySelector('#ayaTajweedOverlay .at-box');if(!box||document.getElementById('atSegmentReport'))return;
 const w=document.createElement('section');w.id='atSegmentReport';w.style.cssText='margin-top:12px;padding-top:10px;border-top:1px solid #8885';
 w.innerHTML='<button id="atSegmentRun" style="width:100%;padding:11px;border:0;border-radius:9px;background:#175b83;color:white">تحليل أجزاء كلمة أنصار هندسيًا</button><pre id="atSegmentOut" style="white-space:pre-wrap;direction:ltr;text-align:left;max-height:35vh;overflow:auto;font-size:11px"></pre>';
 box.appendChild(w);
 w.querySelector('button').onclick=async()=>{
 const out=w.querySelector('pre');out.textContent='جارٍ تحميل SVG وتحليل الأجزاء…';
 let root;
 try{
 const res=await fetch(URL,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);
 const doc=new DOMParser().parseFromString(await res.text(),'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('SVG parse error');
 root=document.importNode(doc.documentElement,true);root.setAttribute('width','345');root.setAttribute('height','550');root.style.cssText='position:fixed;left:-10000px;top:0;width:345px;height:550px;visibility:hidden';document.body.appendChild(root);
 const paths=[...root.querySelectorAll('path')];if(paths.length!==9)throw Error('المسارات: '+paths.length);
 const src=paths[8],mat=src.getCTM();if(!mat)throw Error('تعذر حساب التحويل');
 const probe=document.createElementNS(NS,'svg');probe.setAttribute('viewBox',root.getAttribute('viewBox')||'0 0 345 550');probe.setAttribute('width','345');probe.setAttribute('height','550');probe.style.cssText='position:fixed;left:0;top:0;visibility:hidden';document.body.appendChild(probe);
 const parts=split(src.getAttribute('d')||''),rows=[],tr='matrix('+[mat.a,mat.b,mat.c,mat.d,mat.e,mat.f].join(' ')+')';
 parts.forEach((d,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('transform',tr);probe.appendChild(g);const p=document.createElementNS(NS,'path');p.setAttribute('d',d);g.appendChild(p);const b=p.getBBox();const r={i:i+1,x:b.x,y:b.y,w:b.width,h:b.height,cx:b.x+b.width/2,cy:b.y+b.height/2};if(b.x<=BOX.x2&&b.x+b.width>=BOX.x1&&b.y<=BOX.y2&&b.y+b.height>=BOX.y1)rows.push(r);g.remove();});
 probe.remove();root.remove();root=null;
 out.textContent='الأجزاء المتقاطعة مع حدود الكلمة: '+rows.length+' من '+parts.length+'\\n'+rows.map(r=>'#'+r.i+' x='+r.x.toFixed(2)+' y='+r.y.toFixed(2)+' w='+r.w.toFixed(2)+' h='+r.h.toFixed(2)+' cx='+r.cx.toFixed(2)+' cy='+r.cy.toFixed(2)).join('\\n')+'\\n\\nملاحظة: التقرير هندسي ولا يقرر وحده أي جزء هو النون أو السكون.';
 }catch(e){if(root)root.remove();out.textContent='فشل التحليل: '+e.message;}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();