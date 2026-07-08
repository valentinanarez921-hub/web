(function(){
  // H_texto.js - añadir textos en la cuadricula como piezas
  const btn = document.getElementById('tool-text');
  const gridArea = document.getElementById('gridArea');
  if (!btn || !gridArea) return;

  function getScale(){ return window.Grid?.scale() || 1; }
  function getOffset(){ return window.Grid?.offset() || {x:0,y:0}; }

  function crearTexto() {
    const t = document.createElement('div');
    t.className = 'pieza-dibujada pieza-texto';
    t.style.position = 'absolute';
    t.style.display = 'flex';
    t.style.alignItems = 'center';
    t.style.justifyContent = 'center';
    t.style.background = 'transparent';
    t.style.border = '1px dashed rgba(0,0,0,0.2)';
    t.style.cursor = 'text';

    // Centrar en vista
    const scale = getScale();
    const offset = getOffset();
    const gridRect = gridArea.getBoundingClientRect();
    const centerX = (gridRect.width / 2 - 60 - offset.x) / scale;
    const centerY = (gridRect.height / 2 - 20 - offset.y) / scale;

    // Guardamos m1/m2 como tamaño base en UNIDADES DE GRID - VALORES PERSISTENTES
    const baseW = 300; // unidad de grid
    const baseH = 150; // unidad de grid
    t.dataset.m1 = baseW;
    t.dataset.m2 = baseH;
    t.dataset.m3 = '';
    t.dataset.x = centerX;
    t.dataset.y = centerY;

    // Contenido editable
    const span = document.createElement('div');
    span.contentEditable = 'true';
    span.className = 'texto-contenido';
    span.innerText = 'Texto';
    span.style.padding = '4px';
    span.style.pointerEvents = 'auto';
    span.style.userSelect = 'text';

    t.appendChild(span);

    // prevenir overflow del texto al escalar
    t.style.overflow = 'hidden';
    t.style.boxSizing = 'border-box';
    span.style.width = '100%';
    span.style.height = '100%';
    span.style.display = 'flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    span.style.overflow = 'hidden';
    span.style.boxSizing = 'border-box';
    span.style.wordBreak = 'break-word';

    // Crear handles
    const hCorner = document.createElement('div');
    hCorner.className = 'handle handle-corner';
    const hMidR = document.createElement('div');
    hMidR.className = 'handle handle-mid-right';
    const hMidB = document.createElement('div');
    hMidB.className = 'handle handle-mid-bottom';

    [hCorner,hMidR,hMidB].forEach(h=>{
      h.style.position = 'absolute';
      h.style.width = '40px';
      h.style.height = '40px';
      h.style.background = 'transparent';
      h.style.borderRadius = '6px';
      h.style.cursor = 'nwse-resize';
      h.style.zIndex = 10;
      h.style.pointerEvents = 'auto';
      h.style.display = 'flex';
      h.style.alignItems = 'center';
      h.style.justifyContent = 'center';

      const dot = document.createElement('div');
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.background = '#007bff';
      dot.style.borderRadius = '2px';
      dot.style.pointerEvents = 'none';
      h.appendChild(dot);

      t.appendChild(h);
    });

    // posicionamiento de handles relativo
    function posicionarHandles() {
      const handleOffset = -20;
      hCorner.style.left = handleOffset + 'px';
      hCorner.style.top = handleOffset + 'px';
      hMidR.style.right = handleOffset + 'px';
      hMidR.style.top = 'calc(50% - 20px)';
      hMidB.style.left = 'calc(50% - 20px)';
      hMidB.style.bottom = handleOffset + 'px';
    }

    gridArea.appendChild(t);

    // Aplicar dimensiones: m1/m2 son persistentes (grid units), se multiplican por scale
    function aplicarDims(){
      const scale = getScale();
      const m1 = parseFloat(t.dataset.m1) || baseW;
      const m2 = parseFloat(t.dataset.m2) || baseH;
      const pxW = m1 * scale;
      const pxH = m2 * scale;
      
      t.dataset.w = m1;
      t.dataset.h = m2;
      t.style.width = pxW + 'px';
      t.style.height = pxH + 'px';
      
      const x = parseFloat(t.dataset.x) || 0;
      const y = parseFloat(t.dataset.y) || 0;
      const offset = getOffset();
      t.style.left = (x * scale + offset.x) + 'px';
      t.style.top  = (y * scale + offset.y) + 'px';
      posicionarHandles();
    }

    // mantener font-size dentro del contenedor cuando cambie su tamaño (zoom/resize)
    const ro = new ResizeObserver(() => {
      try {
        const ch = t.clientHeight || (parseFloat(t.style.height) || 0);
        const computedFont = Math.max(10, Math.floor(ch * 0.7));
        span.style.fontSize = computedFont + 'px';
        posicionarHandles();
      } catch(e) { /* ignore */ }
    });
    ro.observe(t);

    t._posicionarHandles = posicionarHandles;
    t._aplicarDims = aplicarDims;
    aplicarDims();

    // Resize handlers
    let resizing = null;
    let startX=0,startY=0,startM1=0,startM2=0;

    function onPointerDownHandle(ev){
      ev.stopPropagation(); ev.preventDefault();
      window._textResizing = true;
      const h = ev.currentTarget || ev.target;
      if (h.className.includes('corner')) resizing = 'corner';
      else if (h.className.includes('right')) resizing = 'right';
      else resizing = 'bottom';
      startX = ev.clientX; startY = ev.clientY;
      startM1 = parseFloat(t.dataset.m1) || baseW;
      startM2 = parseFloat(t.dataset.m2) || baseH;
      document.addEventListener('pointermove', onPointerMoveHandle);
      document.addEventListener('pointerup', onPointerUpHandle);
    }
    
    function onPointerMoveHandle(e){
      // Calcular delta desde posición inicial (sin pointer lock)
      const scale = getScale();
      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;
      
      if (resizing === 'right') {
        const newM1 = Math.max(10, startM1 + deltaX);
        t.dataset.m1 = newM1;
      } else if (resizing === 'bottom') {
        const newM2 = Math.max(5, startM2 + deltaY);
        t.dataset.m2 = newM2;
      } else {
        const newM1 = Math.max(10, startM1 + deltaX);
        const newM2 = Math.max(5, startM2 + deltaY);
        t.dataset.m1 = newM1;
        t.dataset.m2 = newM2;
      }
      aplicarDims();
    }
    
    function onPointerUpHandle(){
      document.removeEventListener('pointermove', onPointerMoveHandle);
      document.removeEventListener('pointerup', onPointerUpHandle);
      resizing = null;
      window._textResizing = false;
    }

    hCorner.style.cursor = 'nwse-resize';
    hMidR.style.cursor = 'e-resize';
    hMidB.style.cursor = 's-resize';
    hCorner.addEventListener('pointerdown', onPointerDownHandle);
    hMidR.addEventListener('pointerdown', onPointerDownHandle);
    hMidB.addEventListener('pointerdown', onPointerDownHandle);

    // mostrar handles sólo cuando la pieza está seleccionada
    [hCorner, hMidR, hMidB].forEach(h => { h.style.display = 'none'; });
    const classObserver = new MutationObserver(() => {
      const visible = t.classList.contains('pieza-seleccionada');
      [hCorner, hMidR, hMidB].forEach(h => { h.style.display = visible ? 'flex' : 'none'; });
    });
    classObserver.observe(t, { attributes: true, attributeFilter: ['class'] });
    const initiallyVisible = t.classList.contains('pieza-seleccionada');
    [hCorner, hMidR, hMidB].forEach(h => { h.style.display = initiallyVisible ? 'flex' : 'none'; });

    span.addEventListener('dblclick', (e)=>{ span.focus(); });

    return t;
  }

  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    const created = crearTexto();
    if (window.Seleccion) {
      window.Seleccion.limpiar();
      created.classList.add('pieza-seleccionada');
      window.Seleccion.piezas.add(created);
    }
  });

  window.HTexto = { 
    crearTexto,
    actualizarHandlesTextos: function() {
      gridArea.querySelectorAll('.pieza-texto').forEach(t => {
        if (t._posicionarHandles) t._posicionarHandles();
      });
    }
  };
})();
