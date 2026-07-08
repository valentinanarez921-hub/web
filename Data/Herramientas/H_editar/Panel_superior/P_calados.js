// P_calados.js - Lógica de calados (cortes) y canvas drawing
(function(){
  window.P_calados = window.P_calados || {};
  
  window.P_calados.init = function(opts){
    if(!opts) return;
    
    const cutClear = opts.cutClear;
    const drawPreview = opts.drawPreview;
    const getState = opts.getState;
    const setState = opts.setState;
    
    if(!cutClear) return;
    
    // Estado local para undo/redo y modos
    let history = []; // historial de states
    let historyIndex = -1; // índice actual en el historial
    // modo actual: siempre 'exact'
    let cutMode = 'exact';
    
    const cutUndo = document.getElementById('cut-undo');
    const cutRedo = document.getElementById('cut-redo');
    
    // Guardar en historial cuando cambia estado
    function saveToHistory(state) {
      historyIndex++;
      history = history.slice(0, historyIndex); // eliminar elementos adelante si había redo
      history.push(JSON.parse(JSON.stringify(state)));
      updateUndoRedoButtons();
    }
    
    // Actualizar estado visual de botones undo/redo
    function updateUndoRedoButtons() {
      if(cutUndo) cutUndo.disabled = historyIndex <= 0;
      if(cutRedo) cutRedo.disabled = historyIndex >= history.length - 1;
    }
    
    // Botón de limpiar trazos
    cutClear.addEventListener('click', (e)=>{
      e.stopPropagation();
      const state = getState();
      state.holes = [];
      setState(state);
      saveToHistory(state);
      drawPreview();
    });
    
    // Botón undo
    if(cutUndo) {
      cutUndo.addEventListener('click', (e)=>{
        e.stopPropagation();
        if(historyIndex > 0) {
          historyIndex--;
          setState(JSON.parse(JSON.stringify(history[historyIndex])));
          updateUndoRedoButtons();
          drawPreview();
        }
      });
    }
    
    // Botón redo
    if(cutRedo) {
      cutRedo.addEventListener('click', (e)=>{
        e.stopPropagation();
        if(historyIndex < history.length - 1) {
          historyIndex++;
          setState(JSON.parse(JSON.stringify(history[historyIndex])));
          updateUndoRedoButtons();
          drawPreview();
        }
      });
    }
    
    // Función para cambiar modo de corte y actualizar clases
    function setCutMode(mode){
      if(mode !== 'exact') return;
      cutMode = mode;
      // Notificar a otros módulos que el modo cambió
      try{ document.dispatchEvent(new CustomEvent('cutmodechange', { detail: { mode: cutMode } })); }catch(e){}
    }

    // Inicializar historial con estado actual
    const initialState = getState();
    saveToHistory(initialState);

    // Asegurar que los botones reflejen el modo inicial
    setCutMode(cutMode);
    
    // Exportar métodos para que popupEditar pueda guardar en historial
    window.P_calados.saveToHistory = saveToHistory;
    window.P_calados.getFreehandMode = () => false; // Siempre exact, nunca freehand
    window.P_calados.setCutMode = setCutMode;
  };
})();
