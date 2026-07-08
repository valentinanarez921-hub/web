// popupcuadricula.js
(function () {

  function init() {
    const gridWrapper = document.getElementById("gridWrapper");
    const gridArea = document.getElementById("gridArea");

    if (!gridWrapper || !gridArea) {
      console.warn("popupcuadricula: grid no lista, reintentando...");
      setTimeout(init, 200);
      return;
    }

    console.log("popupcuadricula: OK — cuadrícula lista.");

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    const minScale = 0.0001;
    const maxScale = 100000;

    function drawGrid() {
      const size = 40 * scale;
      gridArea.style.backgroundSize = `${size}px ${size}px`;
      gridArea.style.backgroundPosition = `${offsetX}px ${offsetY}px`;

      if (window.Cuadricula?.actualizarPiezas)
        window.Cuadricula.actualizarPiezas();
    }

    // ZOOM
    gridWrapper.addEventListener("wheel", (e) => {
      // No hacer zoom si el usuario está editando la longitud inline (evitar zoom accidental al usar la rueda encima del input)
      if (document.activeElement && document.activeElement.id === 'inline-length-input') {
        // Devolver para permitir que el input reciba la rueda (cambie su valor) sin zoom del grid
        return;
      }

      e.preventDefault();
      const rect = gridWrapper.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const oldScale = scale;
      // usar zoom multiplicativo para permitir escalas muy pequeñas/grandes
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.max(minScale, Math.min(maxScale, scale * factor));

      offsetX = cursorX - ((cursorX - offsetX) * (scale / oldScale));
      offsetY = cursorY - ((cursorY - offsetY) * (scale / oldScale));

      drawGrid();
    }, { passive: false });

    // MOVER CUADRÍCULA (click derecho + pointer lock)
    gridArea.addEventListener("pointerdown", (e) => {
      if (e.button === 2) {
        e.preventDefault();
        isPanning = true;
        gridArea.requestPointerLock();
      }
    });

    document.addEventListener("pointermove", (e) => {
      if (!isPanning) return;
      offsetX += e.movementX;
      offsetY += e.movementY;
      drawGrid();
    });

    document.addEventListener("pointerup", () => {
      if (isPanning) {
        isPanning = false;
        if (document.pointerLockElement === gridArea) {
          document.exitPointerLock();
        }
      }
    });

    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement !== gridArea) {
        isPanning = false;
      }
    });

    // Inicialización visual
    gridArea.style.backgroundImage =
      "linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)";

    drawGrid();

    window.Grid = {
      scale: () => scale,
      offset: () => ({ x: offsetX, y: offsetY }),
      setOffset: (o) => { offsetX = o.x; offsetY = o.y; drawGrid(); }
    };
    // Exponer funciones para controlar escala y ajustar vista a bounds
    window.Grid.setScale = (newScale) => {
      scale = Math.max(minScale, Math.min(maxScale, newScale));
      drawGrid();
    };

    window.Grid.fitToBoundingBox = (bbox, padding = 40) => {
      try {
        // Si está activo el flag para suprimir auto-fit, ignorar
        if (window.Grid && window.Grid._suppressAutoFit) {
          console.log('fitToBoundingBox suprimido por _suppressAutoFit');
          return;
        }
        if (!bbox || typeof bbox.minX === 'undefined') return;
        const gw = gridWrapper.clientWidth;
        const gh = gridWrapper.clientHeight;
        const availW = Math.max(10, gw - padding * 2);
        const availH = Math.max(10, gh - padding * 2);
        const spanW = Math.max(1, (bbox.maxX - bbox.minX));
        const spanH = Math.max(1, (bbox.maxY - bbox.minY));
        let targetScale = Math.min(availW / spanW, availH / spanH);
        // Evitar escalas extremas al ajustar bounding box (protección contra medidas/objetos gigantes)
        const minVisualScale = 0.02; // no hacer zoom fuera de esta escala minima (2%)
        const maxVisualScale = 200;  // tope superior razonable
        targetScale = Math.max(minScale, Math.min(maxScale, targetScale));
        // Además limitar el cambio relativo respecto a la escala actual para evitar saltos drásticos
        const relativeMin = Math.max(minVisualScale, scale * 0.02);
        const relativeMax = Math.min(maxVisualScale, scale * 50);
        targetScale = Math.max(relativeMin, Math.min(relativeMax, targetScale));
        // Aplicar escala y calcular offset para que bbox.min esté en padding
        scale = targetScale;
        offsetX = Math.round(padding - bbox.minX * scale);
        offsetY = Math.round(padding - bbox.minY * scale);
        drawGrid();
        console.log('🔎 Grid ajustado para mostrar bounding box', bbox, 'scale=', scale, 'offset=', {x: offsetX, y: offsetY});
      } catch (err) {
        console.warn('Error en fitToBoundingBox:', err);
      }
    };
  }

  init();
  document.addEventListener("contextmenu", (e) => e.preventDefault());

})();
