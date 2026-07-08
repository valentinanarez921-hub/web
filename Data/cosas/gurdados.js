// H_pegadoAutomatico.js
// -----------------------------------------------------
//     MODO PEGAR – ACTIVAR / DESACTIVAR
// -----------------------------------------------------
(function () {

  console.log("H_pegadoAutomatico cargado.");

  window.ModoPegar = false;

  const boton = document.getElementById("tool-snap");
  const estadoSpan = document.getElementById("snap-state");

  if (boton) {
    boton.classList.remove("activo");
    if (estadoSpan) estadoSpan.textContent = "OFF";

    boton.addEventListener("click", () => {
      window.ModoPegar = !window.ModoPegar;

      boton.classList.toggle("activo", window.ModoPegar);
      if (estadoSpan) estadoSpan.textContent = window.ModoPegar ? "ON" : "OFF";

      console.log("ModoPegar:", window.ModoPegar ? "ON" : "OFF");
    });
  }

  // -----------------------------------------------------
  // GUIAS
  // -----------------------------------------------------
  let snapGuideX = null;
  let snapGuideY = null;

  function mostrarGuiaX_grid(xGrid) {
    const g = document.getElementById("snap-line-x");
    const grid = document.getElementById("gridArea");
    if (!g || !grid) return;

    const scale = window.Grid?.scale() || 1;
    const offset = window.Grid?.offset() || { x: 0, y: 0 };

    const px = xGrid * scale + offset.x;

    g.style.display = "block";
    g.style.left = px + "px";
    g.style.top = "0px";
    g.style.height = grid.clientHeight + "px";
  }

  function mostrarGuiaY_grid(yGrid) {
    const g = document.getElementById("snap-line-y");
    const grid = document.getElementById("gridArea");
    if (!g || !grid) return;

    const scale = window.Grid?.scale() || 1;
    const offset = window.Grid?.offset() || { x: 0, y: 0 };

    const py = yGrid * scale + offset.y;

    g.style.display = "block";
    g.style.top = py + "px";
    g.style.left = "0px";
    g.style.width = grid.clientWidth + "px";
  }

  function ocultarGuias_grid() {
    snapGuideX = null;
    snapGuideY = null;

    const gx = document.getElementById("snap-line-x");
    const gy = document.getElementById("snap-line-y");
    if (gx) gx.style.display = "none";
    if (gy) gy.style.display = "none";
  }

  // -----------------------------------------------------
  //       PEGADO ENTRE PIEZAS (EXTERIOR + INTERIOR)
  // -----------------------------------------------------
  window.PegarAotrasPiezas = function (pieza, opts = {}) {

    if (!window.ModoPegar) {
        ocultarGuias_grid();
        return false;
    }

    const tolerancePx = opts.tolerancePx ?? 6;
    const scale = window.Grid?.scale() || 1;
    const offset = window.Grid?.offset() || { x: 0, y: 0 };

    const todas = [...document.querySelectorAll(".pieza-dibujada")];
    if (!pieza || !pieza.dataset) return false;

    let gx = parseFloat(pieza.dataset.x) || 0;
    let gy = parseFloat(pieza.dataset.y) || 0;
    let gw = parseFloat(pieza.dataset.w) || 1;
    let gh = parseFloat(pieza.dataset.h) || 1;

    const px1 = gx * scale + offset.x;
    const px2 = (gx + gw) * scale + offset.x;
    const py1 = gy * scale + offset.y;
    const py2 = (gy + gh) * scale + offset.y;

    snapGuideX = null;
    snapGuideY = null;

    let snapped = false;

    const overlap = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;

    for (const otra of todas) {
        if (otra === pieza) continue;

        const ogx = parseFloat(otra.dataset.x) || 0;
        const ogy = parseFloat(otra.dataset.y) || 0;
        const ogw = parseFloat(otra.dataset.w) || 1;
        const ogh = parseFloat(otra.dataset.h) || 1;

        const ox1 = ogx * scale + offset.x;
        const ox2 = (ogx + ogw) * scale + offset.x;
        const oy1 = ogy * scale + offset.y;
        const oy2 = (ogy + ogh) * scale + offset.y;

        // ----------------------------------------
        //        SNAP EXTERIOR (EL QUE YA TENÍAS)
        // ----------------------------------------
        if (Math.abs(px2 - ox1) <= tolerancePx && overlap(py1, py2, oy1, oy2)) {
            pieza.dataset.x = ogx - gw;
            snapGuideX = ogx;
            snapped = true;
        }

        if (Math.abs(px1 - ox2) <= tolerancePx && overlap(py1, py2, oy1, oy2)) {
            pieza.dataset.x = ogx + ogw;
            snapGuideX = ogx + ogw;
            snapped = true;
        }

        if (Math.abs(py2 - oy1) <= tolerancePx && overlap(px1, px2, ox1, ox2)) {
            pieza.dataset.y = ogy - gh;
            snapGuideY = ogy;
            snapped = true;
        }

        if (Math.abs(py1 - oy2) <= tolerancePx && overlap(px1, px2, ox1, ox2)) {
            pieza.dataset.y = ogy + ogh;
            snapGuideY = ogy + ogh;
            snapped = true;
        }

        // ----------------------------------------
        //              SNAP INTERIOR NUEVO
        // ----------------------------------------
        const piezaDentroX = gx > ogx && gx + gw < ogx + ogw;
        const piezaDentroY = gy > ogy && gy + gh < ogy + ogh;

        if (piezaDentroY) {
            // interior izquierda
            if (Math.abs(px1 - ox1) <= tolerancePx) {
                pieza.dataset.x = ogx;
                snapGuideX = ogx;
                snapped = true;
            }
            // interior derecha
            if (Math.abs(px2 - ox2) <= tolerancePx) {
                pieza.dataset.x = ogx + ogw - gw;
                snapGuideX = ogx + ogw;
                snapped = true;
            }
        }

        if (piezaDentroX) {
            // interior arriba
            if (Math.abs(py1 - oy1) <= tolerancePx) {
                pieza.dataset.y = ogy;
                snapGuideY = ogy;
                snapped = true;
            }
            // interior abajo
            if (Math.abs(py2 - oy2) <= tolerancePx) {
                pieza.dataset.y = ogy + ogh - gh;
                snapGuideY = ogy + ogh;
                snapped = true;
            }
        }
    }

    if (snapped) {
        if (window.Cuadricula?.actualizarPiezas) window.Cuadricula.actualizarPiezas();
    } else {
        ocultarGuias_grid();
    }

    return snapped;
  };

  // -----------------------------------------------------
  //     ACTUALIZAR PIEZAS + REDIBUJAR GUIAS
  // -----------------------------------------------------
  const prevActualizar = window.Cuadricula.actualizarPiezas;

  window.Cuadricula.actualizarPiezas = function () {
      prevActualizar();

      if (snapGuideX !== null) mostrarGuiaX_grid(snapGuideX);
      if (snapGuideY !== null) mostrarGuiaY_grid(snapGuideY);
  };

})();
