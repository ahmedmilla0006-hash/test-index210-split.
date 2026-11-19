/* تجربة أولية لأحكام التجويد — صفحة 75 فقط.
   لا تعدّل صورة المصحف أو ملفات SVG أو نظام التظليل الحالي. */
(function(){
  'use strict';
  const STYLE_ID='aya-tajweed-prototype-style';
  function install(){
    if(document.getElementById('ayaTajweedButton')) return;
    const menu=document.getElementById('sideMenu');
    if(!menu) return;
    const btn=document.createElement('button');
    btn.type='button'; btn.id='ayaTajweedButton'; btn.className='menu-item';
    btn.textContent='أحكام التجويد (تجربة)';
    const before=document.getElementById('searchButton');
    if(before) menu.insertBefore(btn,before); else menu.appendChild(btn);
    const style=document.createElement('style'); style.id=STYLE_ID;
    style.textContent=`
      #ayaTajweedOverlay{position:fixed;inset:0;z-index:12000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.68);direction:rtl}
      #ayaTajweedOverlay.open{display:flex}
      #ayaTajweedOverlay .at-box{width:min(420px,100%);max-height:82vh;overflow:auto;border-radius:18px;padding:18px;background:var(--popup-bg,#fff);color:var(--text-color,#222);box-shadow:0 12px 40px #0006}
      #ayaTajweedOverlay .at-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
      #ayaTajweedOverlay h3{margin:0;font-size:19px}
      #ayaTajweedOverlay .at-close{border:0;background:transparent;color:inherit;font-size:26px}
      #ayaTajweedOverlay .at-word{margin:18px 0 10px;padding:16px;text-align:center;border-radius:14px;background:rgba(22,132,67,.10);border:1px solid rgba(22,132,67,.3);font-size:32px;color:#168443;font-family:serif}
      #ayaTajweedOverlay .at-rule{font-size:18px;font-weight:700;margin:10px 0}
      #ayaTajweedOverlay .at-note{line-height:1.9;margin:8px 0}
      #ayaTajweedOverlay .at-tag{display:inline-block;border-radius:20px;padding:4px 10px;background:#168443;color:white;font-size:13px}
      #ayaTajweedOverlay .at-foot{font-size:12px;opacity:.7;line-height:1.7;margin-top:14px}
      #ayaTajweedOverlay .at-toggle{display:flex;align-items:center;gap:9px;margin-top:14px;padding:10px;border-radius:10px;background:rgba(120,120,120,.09)}
    `;
    document.head.appendChild(style);
    const ov=document.createElement('div'); ov.id='ayaTajweedOverlay';
    ov.innerHTML=`<section class="at-box" role="dialog" aria-modal="true" aria-labelledby="atTitle">
      <header class="at-head"><h3 id="atTitle">تجربة أحكام التجويد</h3><button type="button" class="at-close" id="atClose" aria-label="إغلاق">×</button></header>
      <div class="at-tag">سورة آل عمران — صفحة 75</div>
      <div class="at-word" id="atWord">أَنْصَارٍ</div>
      <div class="at-rule">الحكم: إخفاء حقيقي</div>
      <p class="at-note">السبب: جاءت النون الساكنة قبل حرف الصاد، والصاد من حروف الإخفاء الحقيقي.</p>
      <p class="at-note">طريقة الأداء: إخفاء النون عند الصاد مع غُنّة مقدارها حركتان.</p>
      <label class="at-toggle"><input type="checkbox" id="atColorToggle" checked> إظهار لون الحكم في بطاقة التجربة</label>
      <p class="at-foot">هذه معاينة تعليمية أولية للكلمة والحكم. صورة صفحة المصحف الأصلية ما زالت كما هي؛ لم نغيّر ملف SVG أو نلوّن حروف الصفحة بعد.</p>
    </section>`;
    document.body.appendChild(ov);
    const close=()=>ov.classList.remove('open');
    btn.addEventListener('click',()=>ov.classList.add('open'));
    document.getElementById('atClose').addEventListener('click',close);
    ov.addEventListener('click',e=>{if(e.target===ov)close();});
    document.getElementById('atColorToggle').addEventListener('change',e=>{
      document.getElementById('atWord').style.color=e.target.checked?'#168443':'inherit';
      document.getElementById('atWord').style.background=e.target.checked?'rgba(22,132,67,.10)':'transparent';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
  const observer=new MutationObserver(()=>{if(document.getElementById('sideMenu')&&!document.getElementById('ayaTajweedButton'))install();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();