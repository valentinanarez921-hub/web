// PH_puntos.js - Módulo unificado de puntos de control (fusionado con P_puntos.js)
(function(){
  // API pública (se expone en ambas claves para compatibilidad)
  window.PH_puntos = window.PH_puntos || {};
  window.P_puntos = window.P_puntos || {};

  // Estado interno
  let pointsEnabled = false;
  const pointRadius = 5;
  const magnetDistance = 20; // píxeles en espacio del canvas

  // Calcular los 9 puntos de control en coordenadas de pieza (w,h pasados)
  function getControlPoints(w = 600, h = 400){
    return [
      {x: 0, y: 0, name: 'tl'},
      {x: w/2, y: 0, name: 'tm'},
      {x: w, y: 0, name: 'tr'},
      {x: w, y: h/2, name: 'mr'},
      {x: w, y: h, name: 'br'},
      {x: w/2, y: h, name: 'bm'},
      {x: 0, y: h, name: 'bl'},
      {x: 0, y: h/2, name: 'ml'},
      {x: w/2, y: h/2, name: 'c'}
    ];
  }

  // Buscar punto más cercano (en coordenadas de canvas sin pan/zoom)
  function getNearestPoint(mouseX, mouseY, points, magnetDistanceThreshold = 15){
    let nearest = null;
    let minDist = magnetDistanceThreshold;
    points.forEach(pt => {
      const ptX = pt.screenX !== undefined ? pt.screenX : pt.x;
      const ptY = pt.screenY !== undefined ? pt.screenY : pt.y;
      const dist = Math.sqrt(Math.pow(mouseX - ptX, 2) + Math.pow(mouseY - ptY, 2));
      if(dist < minDist){
        minDist = dist;
        nearest = pt;
      }
    });
    return nearest;
  }

  function getTransformState(){
    return {
      zoomLevel: window.popupEditar && window.popupEditar.getZoomLevel ? window.popupEditar.getZoomLevel() : 1,
      panX: window.popupEditar && window.popupEditar.getPanX ? window.popupEditar.getPanX() : 0,
      panY: window.popupEditar && window.popupEditar.getPanY ? window.popupEditar.getPanY() : 0
    };
  }

  // Dibuja puntos; se asume que el contexto NO está transformado (popupEditar aplica translate/scale antes)
  function drawControlPoints(ctx, w, h){
    if(!pointsEnabled) return;
    const transform = getTransformState();
    ctx.save();
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 / transform.zoomLevel;
    const points = getControlPoints(w, h);
    points.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pointRadius / transform.zoomLevel, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  // Devuelve posición magnetizada en coordenadas normalizadas [0..1]
  function magnetizePosition(canvasX, canvasY, origW = 600, origH = 400){
    const transform = getTransformState();
    const scaledCanvasX = (canvasX - transform.panX) / transform.zoomLevel;
    const scaledCanvasY = (canvasY - transform.panY) / transform.zoomLevel;
    const points = getControlPoints(origW, origH);
    const nearest = getNearestPoint(scaledCanvasX, scaledCanvasY, points, magnetDistance / transform.zoomLevel);
    if(nearest){
      return { x: nearest.x / origW, y: nearest.y / origH };
    }
    return { x: scaledCanvasX / origW, y: scaledCanvasY / origH };
  }

  function toggle(){
    pointsEnabled = !pointsEnabled;
    const toolPoints = document.getElementById('editar-tool-points');
    if(toolPoints){ toolPoints.classList.toggle('activo', pointsEnabled); }
    if(window.popupEditar && window.popupEditar.drawPreview) window.popupEditar.drawPreview();
  }

  function isEnabled(){ return !!pointsEnabled; }
  function setEnabled(enabled){ pointsEnabled = !!enabled; const toolPoints = document.getElementById('editar-tool-points'); if(toolPoints) toolPoints.classList.toggle('activo', pointsEnabled); if(window.popupEditar && window.popupEditar.drawPreview) window.popupEditar.drawPreview(); }

  // Init opcional: conectar listeners si se pasa canvas en opts
  function init(opts){
    if(!opts) return;
    const canvas = opts.canvas;
    if(!canvas) return;
    // mousemove para cambiar cursor cuando está cerca de punto
    canvas.addEventListener('mousemove', (e)=>{
      if(!pointsEnabled) return;
      const r = canvas.getBoundingClientRect();
      const mouseScreenX = e.clientX - r.left;
      const mouseScreenY = e.clientY - r.top;
      const transform = getTransformState();
      const mouseCanvasX = (mouseScreenX - transform.panX) / transform.zoomLevel;
      const mouseCanvasY = (mouseScreenY - transform.panY) / transform.zoomLevel;
      // obtener dimensiones de la pieza actual si está disponible
      const currentPiece = window.popupEditar && window.popupEditar.getCurrentPiece ? window.popupEditar.getCurrentPiece() : null;
      const origW = currentPiece ? (currentPiece._originalW || 600) : 600;
      const origH = currentPiece ? (currentPiece._originalH || 400) : 400;
      const nearest = getNearestPoint(mouseCanvasX, mouseCanvasY, getControlPoints(origW, origH), magnetDistance / transform.zoomLevel);
      canvas.style.cursor = nearest ? 'crosshair' : 'default';
    });
  }

  // Exportar en ambos namespaces para compatibilidad
  const api = { toggle, isEnabled, setEnabled, getControlPoints, getNearestPoint, drawControlPoints, magnetizePosition, init };
  Object.assign(window.P_puntos, api);
  Object.assign(window.PH_puntos, api);
})();
