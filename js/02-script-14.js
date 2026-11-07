window.addEventListener("resize", ()=>{
  positionHighlightLayer();
  syncHighlight();
});

page.addEventListener("load", ()=>{
  positionHighlightLayer();
  requestAnimationFrame(()=>syncHighlight());
});
