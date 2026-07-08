(function(){
  window.editar_cuadricula = window.editar_cuadricula || {};

  let canvasEl = null;
  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;
  let minZoom = 0.0001;
  let maxZoom = 100000;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let onChangeCb = null;

  function emitChange(){ if(onChangeCb) try{ onChangeCb(); }catch(e){} }

  function init(opts){
    if(!opts) opts = {};
    canvasEl = opts.canvas || null;
    if(opts.minZoom) minZoom = opts.minZoom;
    if(opts.maxZoom) maxZoom = opts.maxZoom;
    onChangeCb = opts.onChange || null;

    if(!canvasEl) return;

    // Wheel zoom
    canvasEl.addEventListener('wheel', (e)=>{
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const r = canvasEl.getBoundingClientRect();
      const mouseX = e.clientX - r.left;
      const mouseY = e.clientY - r.top;

      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel * delta));
      if(newZoom !== zoomLevel){
        const canvasPointX = (mouseX - panX) / zoomLevel;
        const canvasPointY = (mouseY - panY) / zoomLevel;
        panX = mouseX - canvasPointX * newZoom;
        panY = mouseY - canvasPointY * newZoom;
        zoomLevel = newZoom;
        emitChange();
      }
    }, { passive: false });

    // Right-button pan
    canvasEl.addEventListener('mousedown', (e)=>{
      if(e.button !== 2) return;
      isPanning = true;
      panStartX = e.clientX - panX;
      panStartY = e.clientY - panY;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e)=>{
      if(!isPanning) return;
      panX = e.clientX - panStartX;
      panY = e.clientY - panStartY;
      emitChange();
    });

    window.addEventListener('mouseup', (e)=>{ if(e.button===2 && isPanning){ isPanning=false; emitChange(); } });

    // prevent context menu on canvas
    canvasEl.addEventListener('contextmenu', (e)=> e.preventDefault());
  }

  function centerForPiece(origW, origH){
    if(!canvasEl) return;
    const canvasW = canvasEl.width || 600;
    const canvasH = canvasEl.height || 400;
    const zoomX = canvasW / origW;
    const zoomY = canvasH / origH;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, Math.min(zoomX, zoomY)));
    panX = (canvasW - origW * zoomLevel) / 2;
    panY = (canvasH - origH * zoomLevel) / 2;
    emitChange();
  }

  function getZoomLevel(){ return zoomLevel; }
  function getPanX(){ return panX; }
  function getPanY(){ return panY; }
  function setZoomLevel(z){ zoomLevel = Math.max(minZoom, Math.min(maxZoom, z)); emitChange(); }
  function setPan(x,y){ panX = x; panY = y; emitChange(); }
  function isPanningNow(){ return !!isPanning; }

  window.editar_cuadricula.init = init;
  window.editar_cuadricula.centerForPiece = centerForPiece;
  window.editar_cuadricula.getZoomLevel = getZoomLevel;
  window.editar_cuadricula.getPanX = getPanX;
  window.editar_cuadricula.getPanY = getPanY;
  window.editar_cuadricula.setZoomLevel = setZoomLevel;
  window.editar_cuadricula.setPan = setPan;
  window.editar_cuadricula.isPanning = isPanningNow;
  window.editar_cuadricula.onChange = function(cb){ onChangeCb = cb; };
})();
