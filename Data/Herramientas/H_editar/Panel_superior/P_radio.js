// P_radio.js - Lógica de radios de esquinas
(function(){
  window.P_radio = window.P_radio || {};
  
  window.P_radio.init = function(opts){
    if(!opts) return;
    
    const radiusValue = opts.radiusValue;
    const radiusCorner = opts.radiusCorner;
    const radiusDisplay = opts.radiusDisplay;
    const btnRevertir = opts.btnRevertir;
    const drawPreview = opts.drawPreview;
    const getState = opts.getState;
    const setState = opts.setState;
    
    if(!radiusValue || !radiusCorner) return;
    
    // Listener en el input de radio
    radiusValue.addEventListener('input', (e)=>{
      e.stopPropagation();
      const corner = radiusCorner.value;
      const state = getState();
      state.radii = state.radii || {};
      state.radii[corner] = parseInt(radiusValue.value, 10) || 0;
      setState(state);
      if(radiusDisplay){
        radiusDisplay.textContent = radiusValue.value;
      }
      drawPreview();
    });
    
    // Listener en el select de esquina
    radiusCorner.addEventListener('change', (e)=>{
      e.stopPropagation();
      const c = radiusCorner.value;
      const state = getState();
      radiusValue.value = state.radii[c] || 0;
      if(radiusDisplay){
        radiusDisplay.textContent = radiusValue.value;
      }
    });
    
    // Botón de revertir (poner en 0)
    if(btnRevertir){
      btnRevertir.addEventListener('click', (e)=>{
        e.stopPropagation();
        const corner = radiusCorner.value || 'tl';
        const state = getState();
        state.radii = state.radii || {};
        state.radii[corner] = 0;
        setState(state);
        radiusValue.value = 0;
        if(radiusDisplay){
          radiusDisplay.textContent = '0';
        }
        drawPreview();
      });
    }
  };
})();
