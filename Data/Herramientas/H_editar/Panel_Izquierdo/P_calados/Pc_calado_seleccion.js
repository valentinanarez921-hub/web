// Pc_calado_seleccion.js - Permitir seleccionar, editar y eliminar calados
(function(){
  window.Pc_calado_seleccion = window.Pc_calado_seleccion || {};

  let getState = ()=>({ holes: [] });
  let setState = ()=>{};
  let drawPreview = ()=>{};
  let saveToHistory = ()=>{};
  
  let selectedHoleIndex = -1;
  let canvas = null;

  window.Pc_calado_seleccion.init = function(opts){
    if(!opts) return;
    if(typeof opts.getState === 'function') getState = opts.getState;
    if(typeof opts.setState === 'function') setState = opts.setState;
    if(typeof opts.drawPreview === 'function') drawPreview = opts.drawPreview;
    if(typeof opts.saveToHistory === 'function') saveToHistory = opts.saveToHistory;
    if(opts.canvas) canvas = opts.canvas;

    if(!canvas) return;

    // Click en canvas para seleccionar calados
    canvas.addEventListener('click', (e)=>{
      const exactMode = window.Pc_calado_medido && window.Pc_calado_medido.isExactMode ? window.Pc_calado_medido.isExactMode() : false;
      if(!exactMode) return; // solo permitir selección en modo exacto

      const r = canvas.getBoundingClientRect();
      const canvasX = e.clientX - r.left;
      const canvasY = e.clientY - r.top;

      const state = getState() || { holes: [] };
      if(!state.holes || !state.holes.length) return;

      const _panX = window.editar_cuadricula && window.editar_cuadricula.getPanX ? window.editar_cuadricula.getPanX() : 0;
      const _panY = window.editar_cuadricula && window.editar_cuadricula.getPanY ? window.editar_cuadricula.getPanY() : 0;
      const _zoom = window.editar_cuadricula && window.editar_cuadricula.getZoomLevel ? window.editar_cuadricula.getZoomLevel() : 1;
      const currentPiece = window.popupEditar && window.popupEditar.getCurrentPiece ? window.popupEditar.getCurrentPiece() : null;
      // IMPORTANTE: Usar origW/origH del estado (almacenado con el calado), NO de currentPiece
      const origW = state.origW || (currentPiece ? (currentPiece._originalW || 100) : 100);
      const origH = state.origH || (currentPiece ? (currentPiece._originalH || 100) : 100);

      // Convertir coordenadas del click a espacio de pieza
      // Invertir: primero destranslate, luego descale
      const piecePixelX = (canvasX - _panX) / _zoom;
      const piecePixelY = (canvasY - _panY) / _zoom;
      const pieceX = piecePixelX / origW;
      const pieceY = piecePixelY / origH;
      
      console.log('Pc_calado_seleccion click: state.origW=' + state.origW + ' currentPiece._originalW=' + (currentPiece ? currentPiece._originalW : 'null') + ' using origW=' + origW + ' pieceX=' + pieceX.toFixed(4));

      // Buscar qué hole contiene el click
      let clickedIndex = -1;
      state.holes.forEach((hole, idx) => {
        const points = hole.points || (Array.isArray(hole) ? hole : []);
        if(!points || !points.length) return;
        
        // Log de bounds del calado
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        
        const isInside = isPointInPolygon(pieceX, pieceY, points);
        console.log('Checking hole', idx, 'bounds:', {minX, maxX, minY, maxY}, 'click pieceX:', pieceX.toFixed(4), 'click pieceY:', pieceY.toFixed(4), 'isInside:', isInside);
        if(isInside) {
          clickedIndex = idx;
        }
      });

      if(clickedIndex >= 0){
        selectedHoleIndex = clickedIndex;
        populateEditForm(state.holes[clickedIndex], clickedIndex);
        showDeleteButton();
        // Resetear preview para que se recree el snapshot con el nuevo calado seleccionado
        if(window.Pc_calado_medido && window.Pc_calado_medido.resetPreview) window.Pc_calado_medido.resetPreview();
        // Notificar a Pc_calado_medido que se seleccionó un calado
        if(window.Pc_calado_medido && window.Pc_calado_medido.setSelectedHoleIndex) {
          window.Pc_calado_medido.setSelectedHoleIndex(clickedIndex);
        }
        // Habilitar inputs de forma explícita
        if(window.Pc_calado_medido && window.Pc_calado_medido.setInputsEnabled) {
          console.log('Canvas click: habilitando inputs para calado seleccionado');
          window.Pc_calado_medido.setInputsEnabled(true);
        }
        // Actualizar botón después de un delay
        setTimeout(() => {
          if(window.Pc_calado_medido && window.Pc_calado_medido.updateButtonStyle) {
            window.Pc_calado_medido.updateButtonStyle();
          }
        }, 50);
      } else {
        selectedHoleIndex = -1;
        hideDeleteButton();
        // Notificar a Pc_calado_medido que se deseleccionó
        if(window.Pc_calado_medido && window.Pc_calado_medido.setSelectedHoleIndex) {
          window.Pc_calado_medido.setSelectedHoleIndex(-1);
        }
        if(window.Pc_calado_medido && window.Pc_calado_medido.setInputsEnabled) {
          window.Pc_calado_medido.setInputsEnabled(false);
        }
        if(window.Pc_calado_medido && window.Pc_calado_medido.updateButtonStyle) {
          window.Pc_calado_medido.updateButtonStyle();
        }
      }
      
      drawPreview();
    });
  };

  // Algoritmo point-in-polygon
  function isPointInPolygon(px, py, poly){
    let inside = false;
    for(let i=0, j=poly.length-1; i<poly.length; j=i++){
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }

  function populateEditForm(hole, idx){
    if(!hole) return;
    const points = hole.points || (Array.isArray(hole) ? hole : []);
    if(!points || points.length < 4) return;
    const currentPiece = window.popupEditar && window.popupEditar.getCurrentPiece ? window.popupEditar.getCurrentPiece() : null;
    const origW = currentPiece ? (currentPiece._originalW || 100) : 100;
    const origH = currentPiece ? (currentPiece._originalH || 100) : 100;
    
    const cutExactX = document.getElementById('cut-exact-x');
    const cutExactY = document.getElementById('cut-exact-y');
    const cutExactW = document.getElementById('cut-exact-w');
    const cutExactH = document.getElementById('cut-exact-h');
    const cornerTL = document.getElementById('cut-corner-tl');
    const cornerTR = document.getElementById('cut-corner-tr');
    const cornerBL = document.getElementById('cut-corner-bl');
    const cornerBR = document.getElementById('cut-corner-br');

    // Calcular bounding box del rectángulo
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    points.forEach(pt => {
      if(pt.x < minX) minX = pt.x;
      if(pt.x > maxX) maxX = pt.x;
      if(pt.y < minY) minY = pt.y;
      if(pt.y > maxY) maxY = pt.y;
    });

    // Convertir a cotas (píxeles desde bordes)
    const left = Math.round(minX * origW);
    const top = Math.round(minY * origH);
    const right = Math.round((1 - maxX) * origW);
    const bottom = Math.round((1 - maxY) * origH);
    
    // Calcular dimensiones en píxeles para validar radios
    const widthPx = origW - left - right;
    const heightPx = origH - top - bottom;
    const maxRadius = Math.min(widthPx, heightPx);

    // Setear flag para evitar que applyPreview cree un calado duplicado
    if(window.Pc_calado_medido && window.Pc_calado_medido.setPopulatingForm) {
      window.Pc_calado_medido.setPopulatingForm(true);
    }
    
    // Cotas en nuevo orden: Superior, Inferior, Izquierda, Derecha
    if(cutExactY) cutExactY.value = top;
    if(cutExactH) cutExactH.value = bottom;
    if(cutExactX) cutExactX.value = left;
    if(cutExactW) cutExactW.value = right;
    
    // Poblar radios de esquinas si existen en el agujero, validándolos contra el tamaño
    const radios = (hole.radios || hole.radios === undefined) ? (hole.radios || { tl: 0, tr: 0, bl: 0, br: 0 }) : { tl: 0, tr: 0, bl: 0, br: 0 };
    const limitedTL = Math.min(radios.tl || 0, maxRadius);
    const limitedTR = Math.min(radios.tr || 0, maxRadius);
    const limitedBL = Math.min(radios.bl || 0, maxRadius);
    const limitedBR = Math.min(radios.br || 0, maxRadius);
    
    console.log('populateEditForm: radios loaded=', radios);
    
    if(cornerTL) cornerTL.value = limitedTL;
    if(cornerTR) cornerTR.value = limitedTR;
    if(cornerBL) cornerBL.value = limitedBL;
    if(cornerBR) cornerBR.value = limitedBR;
    
    console.log('populateEditForm: radios set in UI');
    if(window.Pc_calado_medido && window.Pc_calado_medido.setPopulatingForm) {
      window.Pc_calado_medido.setPopulatingForm(false);
    }
  }

  function showDeleteButton(){
    const btnDelete = document.getElementById('cut-exact-delete');
    if(btnDelete) btnDelete.style.display = 'flex';
  }

  function hideDeleteButton(){
    const btnDelete = document.getElementById('cut-exact-delete');
    if(btnDelete) btnDelete.style.display = 'none';
  }

  window.Pc_calado_seleccion.selectHole = (idx) => {
    selectedHoleIndex = idx;
    // Mostrar botón de eliminar cuando se selecciona un calado
    showDeleteButton();
    // Notificar a Pc_calado_medido que se seleccionó un calado
    if(window.Pc_calado_medido && window.Pc_calado_medido.setSelectedHoleIndex) {
      window.Pc_calado_medido.setSelectedHoleIndex(idx);
      // Habilitar inputs cuando se selecciona un calado
      if(window.Pc_calado_medido && window.Pc_calado_medido.setInputsEnabled) {
        window.Pc_calado_medido.setInputsEnabled(true);
      }
      // Actualizar estilo del botón después de un pequeño delay para asegurar que el formulario se ha actualizado
      setTimeout(() => {
        if(window.Pc_calado_medido && window.Pc_calado_medido.updateButtonStyle) {
          window.Pc_calado_medido.updateButtonStyle();
        }
      }, 50);
    }
  };
  window.Pc_calado_seleccion.getSelectedIndex = () => selectedHoleIndex;
  window.Pc_calado_seleccion.clearSelection = () => {
    selectedHoleIndex = -1;
    hideDeleteButton();
    // Notificar a Pc_calado_medido que se deseleccionó
    if(window.Pc_calado_medido && window.Pc_calado_medido.setSelectedHoleIndex) {
      window.Pc_calado_medido.setSelectedHoleIndex(-1);
    }
    // Deshabilitar inputs cuando se deselecciona
    if(window.Pc_calado_medido && window.Pc_calado_medido.setInputsEnabled) {
      window.Pc_calado_medido.setInputsEnabled(false);
    }
    if(window.Pc_calado_medido && window.Pc_calado_medido.updateButtonStyle) {
      window.Pc_calado_medido.updateButtonStyle();
    }
  };

})();
