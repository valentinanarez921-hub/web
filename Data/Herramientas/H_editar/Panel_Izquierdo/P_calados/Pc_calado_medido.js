// Pc_calado_medido.js - Módulo para calados a medidas exactas
(function(){
  window.Pc_calado_medido = window.Pc_calado_medido || {};

  let exactMode = false;
  let getState = ()=>({ holes: [] });
  let setState = ()=>{};
  let drawPreview = ()=>{};
  let saveToHistory = ()=>{};
  let previewActive = false;
  let savedHolesSnapshot = null;
  let isPopulatingForm = false;
  let selectedHoleIndex = -1;
  let hasChanges = false;

  window.Pc_calado_medido.init = function(opts){
    if(!opts) return;
    if(typeof opts.getState === 'function') getState = opts.getState;
    if(typeof opts.setState === 'function') setState = opts.setState;
    if(typeof opts.drawPreview === 'function') drawPreview = opts.drawPreview;
    if(typeof opts.saveToHistory === 'function') saveToHistory = opts.saveToHistory;

    const cutExact = document.getElementById('cut-exact');
    const cutExactPanel = document.getElementById('cut-exact-panel');
    const cutExactX = document.getElementById('cut-exact-x');
    const cutExactY = document.getElementById('cut-exact-y');
    const cutExactW = document.getElementById('cut-exact-w');
    const cutExactH = document.getElementById('cut-exact-h');
    const cutCreate = document.getElementById('cut-create');
    const cutCancel = document.getElementById('cut-exact-cancel');
    const cornerTL = document.getElementById('cut-corner-tl');
    const cornerTR = document.getElementById('cut-corner-tr');
    const cornerBL = document.getElementById('cut-corner-bl');
    const cornerBR = document.getElementById('cut-corner-br');
    
    // Validación: advertir si faltan elementos
    console.log('Pc_calado_medido.init: elementos encontrados -', {
      cutExact: !!cutExact, cutExactPanel: !!cutExactPanel,
      cutExactX: !!cutExactX, cutExactY: !!cutExactY, cutExactW: !!cutExactW, cutExactH: !!cutExactH,
      cutCreate: !!cutCreate, cutCancel: !!cutCancel,
      cornerTL: !!cornerTL, cornerTR: !!cornerTR, cornerBL: !!cornerBL, cornerBR: !!cornerBR
    });
    
    // Función para actualizar el estilo del botón de crear calado
    function updateButtonStyle(){
      if(!cutCreate) return;
      
      if(selectedHoleIndex < 0){
        // No hay calado seleccionado: Azul con icono +
        cutCreate.style.background = '#007bff';
        cutCreate.innerHTML = '<i class="fas fa-plus"></i>';
        cutCreate.title = 'Crear calado';
      } else if(hasChanges){
        // Calado seleccionado CON cambios: Verde encendido con tick
        cutCreate.style.background = '#28a745';
        cutCreate.innerHTML = '<i class="fas fa-check"></i>';
        cutCreate.title = 'Guardar cambios';
      } else {
        // Calado seleccionado SIN cambios: Verde apagado con tick
        cutCreate.style.background = '#5cb85c';
        cutCreate.innerHTML = '<i class="fas fa-check"></i>';
        cutCreate.title = 'Calado guardado';
      }
    }

    // Función para habilitar/deshabilitar los inputs de medidas y radios
    function setInputsEnabled(enable){
      console.log('setInputsEnabled called with enable=', enable);
      const inputs = [cutExactX, cutExactY, cutExactW, cutExactH, cornerTL, cornerTR, cornerBL, cornerBR];
      inputs.forEach(inp => {
        if(inp) {
          inp.disabled = !enable;
          // También remover/agregar el atributo HTML disabled
          if(enable){
            inp.removeAttribute('disabled');
          } else {
            inp.setAttribute('disabled', 'disabled');
          }
          console.log('Input', inp.id, 'disabled set to', inp.disabled, 'attribute removed:', enable);
        }
      });
    }

    // Botón medidas exactas
    if(cutExact){
      // iniciar con panel vacío si no está activado
      if(cutExactPanel && !exactMode) cutExactPanel.classList.add('empty');

      cutExact.addEventListener('click', (e)=>{
        e.stopPropagation();
        exactMode = !exactMode;
        if(exactMode){
          // pedir a P_calados que establezca modo 'exact' (desactiva otros botones)
          if(window.P_calados && window.P_calados.setCutMode) window.P_calados.setCutMode('exact');
          // Asegurar que cut-lines y cut-freehand estén desactivados
          const cutLines = document.getElementById('cut-lines');
          const cutFreehand = document.getElementById('cut-freehand');
          if(cutLines) cutLines.classList.remove('activo');
          if(cutFreehand) cutFreehand.classList.remove('activo');
          if(cutExact) cutExact.classList.add('activo');
          if(cutExactPanel) cutExactPanel.classList.remove('empty');
        } else {
          // volver a modo por defecto (mano libre)
          if(window.P_calados && window.P_calados.setCutMode) window.P_calados.setCutMode('freehand');
          if(cutExact) cutExact.classList.remove('activo');
          if(cutExactPanel) cutExactPanel.classList.add('empty');
        }
      });
    }

    // Escuchar cambios de modo global para mantener el panel sincronizado
    document.addEventListener('cutmodechange', (ev)=>{
      const mode = ev && ev.detail && ev.detail.mode ? ev.detail.mode : null;
      exactMode = (mode === 'exact');
      if(cutExact) cutExact.classList.toggle('activo', exactMode);
      if(cutExactPanel) {
        if(exactMode) cutExactPanel.classList.remove('empty'); else cutExactPanel.classList.add('empty');
      }
    });

    // Botón para agregar rectángulo exacto
    // Estado local para preview
    
    // Inicializar el estilo del botón
    updateButtonStyle();

    function computeRectFromCotas(){
      // Las cotas son en píxeles, convertir a valores normalizados (0-1)
      const currentPiece = window.popupEditar && window.popupEditar.getCurrentPiece ? window.popupEditar.getCurrentPiece() : null;
      if(!currentPiece){
        console.warn('Pc_calado_medido.computeRectFromCotas: no currentPiece available');
        return null;
      }
      const origW = currentPiece._originalW || 100;
      const origH = currentPiece._originalH || 100;
      
      const left = Math.max(0, parseFloat(cutExactX.value || 0));
      const top = Math.max(0, parseFloat(cutExactY.value || 0));
      const right = Math.max(0, parseFloat(cutExactW.value || 0));
      const bottom = Math.max(0, parseFloat(cutExactH.value || 0));
      
      console.log('computeRectFromCotas: raw cotas - left=', left, 'top=', top, 'right=', right, 'bottom=', bottom);
      
      // Convertir cotas (píxeles desde bordes) a posición y tamaño normalizados
      // Clamp cotas independientemente - cada una se limita al tamaño disponible
      const clampedLeft = Math.min(left, origW);
      const clampedRight = Math.min(right, origW);  // cota derecha independiente de izquierda
      const clampedTop = Math.min(top, origH);
      const clampedBottom = Math.min(bottom, origH);  // cota inferior independiente de superior

      const x = clampedLeft / origW;  // posición X desde izquierda
      const y = clampedTop / origH;   // posición Y desde arriba
      const w = Math.max(0, (origW - clampedLeft - clampedRight) / origW);  // ancho = ancho total - izq - der
      const h = Math.max(0, (origH - clampedTop - clampedBottom) / origH);  // alto = alto total - sup - inf

      console.log('computeRectFromCotas: normalized - x=', x, 'y=', y, 'w=', w, 'h=', h);
      return { x, y, w, h };
    }

    function buildRectArray(values){
      return [
        { x: values.x, y: values.y },
        { x: values.x + values.w, y: values.y },
        { x: values.x + values.w, y: values.y + values.h },
        { x: values.x, y: values.y + values.h }
      ];
    }

    function getRadios(){
      const tl = parseFloat(cornerTL.value || 0);
      const tr = parseFloat(cornerTR.value || 0);
      const bl = parseFloat(cornerBL.value || 0);
      const br = parseFloat(cornerBR.value || 0);
      return { tl, tr, bl, br };
    }

    function buildRectWithRadios(values, radios){
      const points = buildRectArray(values);
      console.log('buildRectWithRadios: creating object with points=', points.length, 'radios=', radios);
      return { points: points, radios: radios };
    }

    function validateAndLimitRadios(values, radios){
      // Calcular el radio máximo permitido basado en las dimensiones del calado
      const currentPiece = window.popupEditar && window.popupEditar.getCurrentPiece ? window.popupEditar.getCurrentPiece() : null;
      const origW = currentPiece ? (currentPiece._originalW || 100) : 100;
      const origH = currentPiece ? (currentPiece._originalH || 100) : 100;
      
      // Convertir dimensiones normalizadas a píxeles
      const widthPx = values.w * origW;
      const heightPx = values.h * origH;
      
      let tl = parseFloat(radios.tl || 0);
      let tr = parseFloat(radios.tr || 0);
      let bl = parseFloat(radios.bl || 0);
      let br = parseFloat(radios.br || 0);
      
      // Cada radio no puede exceder el mínimo entre ancho y alto del calado
      const maxRadius = Math.min(widthPx, heightPx);
      tl = Math.min(tl, maxRadius);
      tr = Math.min(tr, maxRadius);
      bl = Math.min(bl, maxRadius);
      br = Math.min(br, maxRadius);
      
      // Validar y corregir sobreposiciones en cada lado
      // Lado izquierdo: TL + BL no debe exceder el alto
      if(tl + bl > heightPx){
        const excess = (tl + bl) - heightPx;
        tl = Math.max(0, tl - excess / 2);
        bl = Math.max(0, bl - excess / 2);
      }
      
      // Lado derecho: TR + BR no debe exceder el alto
      if(tr + br > heightPx){
        const excess = (tr + br) - heightPx;
        tr = Math.max(0, tr - excess / 2);
        br = Math.max(0, br - excess / 2);
      }
      
      // Lado superior: TL + TR no debe exceder el ancho
      if(tl + tr > widthPx){
        const excess = (tl + tr) - widthPx;
        tl = Math.max(0, tl - excess / 2);
        tr = Math.max(0, tr - excess / 2);
      }
      
      // Lado inferior: BL + BR no debe exceder el ancho
      if(bl + br > widthPx){
        const excess = (bl + br) - widthPx;
        bl = Math.max(0, bl - excess / 2);
        br = Math.max(0, br - excess / 2);
      }
      
      const limitedRadios = { tl, tr, bl, br };
      
      // Actualizar los inputs visuales si fueron limitados (con validación de existencia)
      if(limitedRadios.tl !== radios.tl && cornerTL) cornerTL.value = limitedRadios.tl.toFixed(1);
      if(limitedRadios.tr !== radios.tr && cornerTR) cornerTR.value = limitedRadios.tr.toFixed(1);
      if(limitedRadios.bl !== radios.bl && cornerBL) cornerBL.value = limitedRadios.bl.toFixed(1);
      if(limitedRadios.br !== radios.br && cornerBR) cornerBR.value = limitedRadios.br.toFixed(1);
      
      return limitedRadios;
    }

    function applyPreview(){
      // No aplicar preview si se está poblando el form
      if(isPopulatingForm) {
        console.log('applyPreview: skipped (isPopulatingForm)');
        return;
      }
      // Solo en modo exacto
      if(!exactMode) {
        console.log('applyPreview: skipped (not exactMode)');
        return;
      }
      
      console.log('applyPreview: starting');
      const vals = computeRectFromCotas();
      console.log('applyPreview: computeRectFromCotas returned', vals);
      
      if(!vals || vals.w <= 0 || vals.h <= 0) {
        console.log('applyPreview: invalid size, skipping');
        return;
      }
      
      let radios = getRadios();
      console.log('applyPreview: radios before validation', radios);
      radios = validateAndLimitRadios(vals, radios);
      console.log('applyPreview: radios after validation', radios);
      
      const rect = buildRectWithRadios(vals, radios);
      console.log('applyPreview: built rect with radios');
      
      const state = getState() || { holes: [] };
      const selectedIdx = window.Pc_calado_seleccion && window.Pc_calado_seleccion.getSelectedIndex ? window.Pc_calado_seleccion.getSelectedIndex() : -1;
      
      console.log('applyPreview: selectedIdx=', selectedIdx, 'previewActive=', previewActive);
      
      // Si hay selección, hacer snapshot solo la primera vez (cuando aún no estamos editando ese)
      if(selectedIdx >= 0 && !previewActive){
        savedHolesSnapshot = JSON.parse(JSON.stringify(state.holes || []));
        previewActive = true;
        console.log('applyPreview: snapshot created, previewActive=true');
      }
      
      let previewHoles;
      if(selectedIdx >= 0 && previewActive){
        // Si hay uno seleccionado, actualizar ese basándose en el snapshot original
        previewHoles = JSON.parse(JSON.stringify(savedHolesSnapshot || []));
        previewHoles[selectedIdx] = rect;
        console.log('applyPreview: updating selected hole at index', selectedIdx);
      } else if(selectedIdx < 0 && !previewActive){
        // Si no hay selección, hacer snapshot de holes actuales para preview de calado nuevo
        savedHolesSnapshot = JSON.parse(JSON.stringify(state.holes || []));
        previewActive = true;
        previewHoles = JSON.parse(JSON.stringify(state.holes || []));
        previewHoles.push(rect);
        console.log('applyPreview: creating new hole preview, total holes=', previewHoles.length);
      } else if(selectedIdx < 0 && previewActive){
        // Continuar actualizando el preview del calado nuevo
        previewHoles = JSON.parse(JSON.stringify(savedHolesSnapshot || []));
        previewHoles.push(rect);
        console.log('applyPreview: updating new hole preview, total holes=', previewHoles.length);
      } else {
        console.log('applyPreview: no condition matched, skipping');
        return;
      }
      
      console.log('applyPreview: calling setState with', previewHoles.length, 'holes');
      setState(Object.assign({}, state, { holes: previewHoles }));
      
      // Mostrar botón cancelar y forzar redraw
      if(cutCancel) try{ cutCancel.style.display = 'block'; }catch(e){}
      
      if(typeof drawPreview === 'function') {
        console.log('applyPreview: calling drawPreview()');
        try{ 
          drawPreview(); 
          console.log('applyPreview: drawPreview() succeeded');
        }catch(e){ 
          console.error('drawPreview error:', e);
          console.error('Stack:', e.stack);
        }
      } else {
        console.warn('applyPreview: drawPreview function not available');
      }
    }

    function clearPreview(){
      if(!previewActive) return;
      const state = getState() || { holes: [] };
      setState(Object.assign({}, state, { holes: savedHolesSnapshot || [] }));
      previewActive = false;
      savedHolesSnapshot = null;
      if(typeof drawPreview === 'function') drawPreview();
    }

    // Botón para crear calado en tiempo real (confirma el preview)
    if(cutCreate){
      console.log('Pc_calado_medido: cut-create button found, attaching event listener');
      cutCreate.addEventListener('click', handleCutCreate);
    } else {
      console.warn('Pc_calado_medido: cut-create button NOT FOUND');
    }
    
    function handleCutCreate(e){
      e.stopPropagation();
      console.log('=== cutCreate CLICKED ===');
        try {
          const vals = computeRectFromCotas();
          console.log('cutCreate: computeRectFromCotas returned', vals);
          
          if(!vals || vals.w <= 0 || vals.h <= 0){
            console.warn('cutCreate: invalid size', vals);
            alert('Las distancias derecha e inferior deben permitir un tamaño positivo');
            return;
          }
          
          let radios = getRadios();
          console.log('cutCreate: radios before validation', radios);
          radios = validateAndLimitRadios(vals, radios);
          console.log('cutCreate: radios after validation', radios);
          
          const rect = buildRectWithRadios(vals, radios);
          console.log('cutCreate: built rect', rect);
          
          const state = getState() || { holes: [] };
          console.log('cutCreate: current state holes count=', (state.holes||[]).length);
          
          const selectedIdx = window.Pc_calado_seleccion && window.Pc_calado_seleccion.getSelectedIndex ? window.Pc_calado_seleccion.getSelectedIndex() : -1;
          console.log('cutCreate: selectedIdx=', selectedIdx);
          
          let isCreatingNew = false;
          
          if(selectedIdx >= 0){
            console.log('cutCreate: updating existing hole at index', selectedIdx);
            // Actualizar calado existente - reemplazar con nuevo objeto completo
            // rect ya tiene formato {points: [...], radios: {...}} desde buildRectWithRadios()
            state.holes[selectedIdx] = rect;
            console.log('cutCreate: updated existing hole');
          } else {
            console.log('cutCreate: creating NEW hole');
            // Crear nuevo calado
            state.holes.push(rect);
            console.log('cutCreate: new hole created, total holes=', state.holes.length);
            isCreatingNew = true;
          }
          
          console.log('cutCreate: calling setState with', state.holes.length, 'holes');
          setState(state);
          console.log('cutCreate: setState completed');
          
          if(typeof saveToHistory === 'function') {
            console.log('cutCreate: saving to history');
            saveToHistory(state);
          }
          
          if(typeof drawPreview === 'function') {
            console.log('cutCreate: calling drawPreview()');
            drawPreview();
            console.log('cutCreate: drawPreview() completed');
          } else {
            console.error('cutCreate: drawPreview NOT AVAILABLE');
          }
          
          // Reset del estado de cambios
          hasChanges = false;
          
          // Si es NUEVO calado: seleccionar para permitir edición inmediata
          if(isCreatingNew){
            const newIdx = (state.holes || []).length - 1;
            if(window.Pc_calado_seleccion && window.Pc_calado_seleccion.selectHole) {
              window.Pc_calado_seleccion.selectHole(newIdx);
            }
            selectedHoleIndex = newIdx;
            setInputsEnabled(true);
            console.log('cutCreate: nuevo calado creado y seleccionado para edición');
          } else {
            // Si está ACTUALIZANDO existente: deseleccionar después de guardar
            console.log('cutCreate: deseleccionando calado actualizado');
            
            // Establecer selectedHoleIndex a -1 localmente PRIMERO
            selectedHoleIndex = -1;
            hasChanges = false;
            previewActive = false;
            savedHolesSnapshot = null;
            
            // Limpiar campos ANTES de redibujar para que no aparezcan las cotas
            if(cutExactX) cutExactX.value = '0';
            if(cutExactY) cutExactY.value = '0';
            if(cutExactW) cutExactW.value = '0';
            if(cutExactH) cutExactH.value = '0';
            if(cornerTL) cornerTL.value = '0';
            if(cornerTR) cornerTR.value = '0';
            if(cornerBL) cornerBL.value = '0';
            if(cornerBR) cornerBR.value = '0';
            
            // Deshabilitar inputs
            setInputsEnabled(false);
            
            // Limpiar la selección en Pc_calado_seleccion
            if(window.Pc_calado_seleccion && window.Pc_calado_seleccion.clearSelection) {
              window.Pc_calado_seleccion.clearSelection();
            }
            
            // Redibujar DESPUÉS de limpiar todo para que desaparezcan las cotas
            if(typeof drawPreview === 'function') {
              console.log('cutCreate: redibujando después de deseleccionar');
              drawPreview();
            }
            
            console.log('cutCreate: calado actualizado y deseleccionado - cotas limpias');
          }
          
          updateButtonStyle();
          previewActive = false;
          savedHolesSnapshot = null;
          console.log('=== cutCreate COMPLETED SUCCESSFULLY ===');
        } catch(err) {
          console.error('=== cutCreate ERROR ===');
          console.error('Error:', err);
          console.error('Stack:', err.stack);
        }
      }

    // Botón Eliminar: elimina el calado seleccionado
    const cutExactDelete = document.getElementById('cut-exact-delete');
    if(cutExactDelete){
      cutExactDelete.addEventListener('click', (e)=>{
        e.stopPropagation();
        const selectedIdx = window.Pc_calado_seleccion && window.Pc_calado_seleccion.getSelectedIndex ? window.Pc_calado_seleccion.getSelectedIndex() : -1;
        if(selectedIdx < 0) return;
        const state = getState() || { holes: [] };
        state.holes.splice(selectedIdx, 1);
        setState(state);
        if(typeof saveToHistory === 'function') saveToHistory(state);
        if(typeof drawPreview === 'function') drawPreview();
        if(window.Pc_calado_seleccion && window.Pc_calado_seleccion.clearSelection) {
          window.Pc_calado_seleccion.clearSelection();
        }
        // Reset del estado de cambios después de eliminar
        hasChanges = false;
        selectedHoleIndex = -1;
        
        // Limpiar los campos de cotas
        if(cutExactX) cutExactX.value = '0';
        if(cutExactY) cutExactY.value = '0';
        if(cutExactW) cutExactW.value = '0';
        if(cutExactH) cutExactH.value = '0';
        if(cornerTL) cornerTL.value = '0';
        if(cornerTR) cornerTR.value = '0';
        if(cornerBL) cornerBL.value = '0';
        if(cornerBR) cornerBR.value = '0';
        
        // Deshabilitar inputs después de eliminar
        setInputsEnabled(false);
        updateButtonStyle();
      });
    }

    // Cancelar: restaurar snapshot previo si existe (o eliminar último agregado)
    if(cutCancel){
      cutCancel.addEventListener('click', (e)=>{
        e.stopPropagation();
        const state = getState() || { holes: [] };
        if(savedHolesSnapshot){
          setState(Object.assign({}, state, { holes: savedHolesSnapshot }));
        } else {
          // si no hay snapshot, eliminar último hole
          if(state.holes && state.holes.length) state.holes.pop();
          setState(state);
        }
        if(typeof drawPreview === 'function') drawPreview();
        cutCancel.style.display = 'none';
        previewActive = false;
        savedHolesSnapshot = null;
        // Reset del estado de cambios
        hasChanges = false;
        selectedHoleIndex = -1;
        setInputsEnabled(false);
        updateButtonStyle();
      });
    }

    // Inputs: preview en tiempo real
    [cutExactX, cutExactY, cutExactW, cutExactH, cornerTL, cornerTR, cornerBL, cornerBR].forEach(inp => {
      if(inp) inp.addEventListener('input', (ev)=>{
        console.log('Pc_calado_medido input changed:', inp.id, '=', inp.value);
        try{ 
          // Si hay un calado seleccionado, marcar como con cambios
          if(selectedHoleIndex >= 0){
            hasChanges = true;
            updateButtonStyle();
          }
          
          const vals = computeRectFromCotas();
          console.log('computeRectFromCotas returned:', vals);
          
          if(!exactMode) {
            console.log('Not in exactMode, skipping preview');
            return;
          }
          
          applyPreview();
          console.log('applyPreview() called successfully');
        }catch(e){ 
          console.error('Pc_calado_medido.input error:', e);
          console.error('Stack:', e.stack);
        }
      });
    });
    
    // Exportar funciones al final de init para que tengan acceso al scope
    window.Pc_calado_medido.updateButtonStyle = updateButtonStyle;
    window.Pc_calado_medido.setInputsEnabled = setInputsEnabled;
  };

  window.Pc_calado_medido.isExactMode = () => exactMode;
  window.Pc_calado_medido.setExactMode = (mode) => { exactMode = mode; };
  window.Pc_calado_medido.isPreviewActive = () => previewActive;
  window.Pc_calado_medido.resetPreview = () => {
    previewActive = false;
    savedHolesSnapshot = null;
  };
  window.Pc_calado_medido.setPopulatingForm = (flag) => { isPopulatingForm = flag; };
  window.Pc_calado_medido.setSelectedHoleIndex = (idx) => {
    selectedHoleIndex = idx;
    hasChanges = false;
    // Se llamará updateButtonStyle desde Pc_calado_seleccion después de actualizar
  };
  window.Pc_calado_medido.resetButtonState = () => {
    selectedHoleIndex = -1;
    hasChanges = false;
  };

})();
