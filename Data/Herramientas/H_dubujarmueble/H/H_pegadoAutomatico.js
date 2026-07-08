// H_pegadoAutomatico.js
(function () {
  console.log("H_pegadoAutomatico cargado.");

  // -------------------------------------
  // MODO PEGAR
  // -------------------------------------
  window.ModoPegar = false;
  const boton = document.getElementById("tool-snap");
  const estadoSpan = document.getElementById("snap-state");
  // tolerancia base en píxeles (se convertirá a unidades de grid según el zoom)
  const snapTolerancePx = 15; // px para enganchar fácil
  const releaseTolerance = 2; // px para liberar snap (en px)

  function getSnapToleranceGrid() {
    const scale = window.Grid?.scale?.() || 1;
    // Convertir una distancia en píxeles de pantalla a unidades de grid
    return Math.max(0.1, snapTolerancePx / Math.max(0.0001, scale));
  }

  function eventToGridPoint(e) {
    if (!e || typeof e.clientX !== "number") return null;
    const gridArea = document.getElementById("gridArea");
    if (!gridArea) return null;
    const rect = gridArea.getBoundingClientRect();
    const scale = window.Grid?.scale?.() || 1;
    const offset = window.Grid?.offset?.() || { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
    };
  }

  function distancePointToMouse(point, mouse) {
    if (!mouse) return Infinity;
    const dx = point.x - mouse.x;
    const dy = point.y - mouse.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  if (boton) {
    boton.classList.remove("activo");
    if (estadoSpan) estadoSpan.textContent = ""; // "OFF"
    boton.addEventListener("click", () => {
      window.ModoPegar = !window.ModoPegar;
      boton.classList.toggle("activo", window.ModoPegar);
      if (estadoSpan) estadoSpan.textContent = window.ModoPegar ? "" : ""; // "ON" : "OFF"
    });
  }

  // -------------------------------------
  // CREAR GUIAS
  // -------------------------------------
  (function crearGuias() {
    const grid = document.getElementById("gridArea");
    if (!grid) return;

    if (!document.getElementById("snap-line-x")) {
      const gx = document.createElement("div");
      gx.id = "snap-line-x";
      grid.appendChild(gx);
    }
    if (!document.getElementById("snap-line-y")) {
      const gy = document.createElement("div");
      gy.id = "snap-line-y";
      grid.appendChild(gy);
    }
  })();

  let snapGuideX = null;
  let snapGuideY = null;
  let lastDragDx = 0;
  let lastDragDy = 0;

  function mostrarGuiaX(x) {
    const g = document.getElementById("snap-line-x");
    if (!g) return;
    const scale = window.Grid?.scale() || 1;
    const offset = window.Grid?.offset() || { x: 0, y: 0 };
    g.style.left = x * scale + offset.x + "px";
    g.style.display = "block";
  }

  function mostrarGuiaY(y) {
    const g = document.getElementById("snap-line-y");
    if (!g) return;
    const scale = window.Grid?.scale() || 1;
    const offset = window.Grid?.offset() || { x: 0, y: 0 };
    g.style.top = y * scale + offset.y + "px";
    g.style.display = "block";
  }

  function ocultarGuias() {
    snapGuideX = null;
    snapGuideY = null;
    const gx = document.getElementById("snap-line-x");
    const gy = document.getElementById("snap-line-y");
    if (gx) gx.style.display = "none";
    if (gy) gy.style.display = "none";
  }

  // Helper functions para rotación
  function getCornerPoints(pieza) {
    const x = parseFloat(pieza.dataset.x) || 0;
    const y = parseFloat(pieza.dataset.y) || 0;
    const w = parseFloat(pieza.dataset.w) || 1;
    const h = parseFloat(pieza.dataset.h) || 1;
    let rotation = parseFloat(pieza.dataset.rotation) || 0;
    const mirror = pieza.dataset.mirror === "left" ? -1 : 1;

    rotation = ((rotation % 360) + 360) % 360;

    const cx = x + w / 2;
    const cy = y + h / 2;

    if ((rotation === 0 || Math.abs(rotation) < 0.001) && mirror === 1) {
      return {
        tl: { x: x, y: y },
        tr: { x: x + w, y: y },
        bl: { x: x, y: y + h },
        br: { x: x + w, y: y + h },
      };
    }

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    function transformPoint(px, py) {
      const dx = px - cx;
      const dy = py - cy;
      const mirroredX = cx + dx * mirror;
      return {
        x: cx + (mirroredX - cx) * cos - dy * sin,
        y: cy + (mirroredX - cx) * sin + dy * cos,
      };
    }

    return {
      tl: transformPoint(x, y),
      tr: transformPoint(x + w, y),
      bl: transformPoint(x, y + h),
      br: transformPoint(x + w, y + h),
    };
  }

  // Helper para encontrar el punto más cercano en un segmento de línea
  function closestPointOnSegment(px, py, x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const wx = px - x1;
    const wy = py - y1;
    const c1 = vx * wx + vy * wy;
    const c2 = vx * vx + vy * vy;
    let t = 0;
    if (c2 > 0) t = Math.max(0, Math.min(1, c1 / c2));
    const cx = x1 + t * vx;
    const cy = y1 + t * vy;
    const dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
    return { x: cx, y: cy, dist };
  }

  function getBoundingBox(corners) {
    const xs = [corners.tl.x, corners.tr.x, corners.bl.x, corners.br.x].filter(
      (x) => !isNaN(x) && isFinite(x),
    );
    const ys = [corners.tl.y, corners.tr.y, corners.bl.y, corners.br.y].filter(
      (y) => !isNaN(y) && isFinite(y),
    );

    if (xs.length === 0 || ys.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  function distancePointToPoint(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  // -------------------------------------
  // FUNCION SNAP
  // -------------------------------------
  window.PegarAotrasPiezas = function (pieza, mouseEvent) {
    if (!window.ModoPegar) {
      ocultarGuias();
      return false;
    }
    const todas = [...document.querySelectorAll(".pieza-dibujada")].filter(
      (p) => p.dataset.visible !== "false",
    );
    if (!pieza) return false;

    let gx = parseFloat(pieza.dataset.x) || 0;
    let gy = parseFloat(pieza.dataset.y) || 0;
    let gw = parseFloat(pieza.dataset.w) || 1;
    let gh = parseFloat(pieza.dataset.h) || 1;

    // Centro de mi pieza
    const cx = gx + gw / 2;
    const cy = gy + gh / 2;
    const mousePos = eventToGridPoint(mouseEvent) || { x: cx, y: cy };

    // Obtener corners rotados de mi pieza
    const piezaCorners = getCornerPoints(pieza);
    const piezaBBox = getBoundingBox(piezaCorners);

    let snappedX = null,
      snappedY = null,
      snapped = false;
    const tol = getSnapToleranceGrid();
    const cornerTolerance = tol * 1.5;
    const overlap = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;
    const candidates = [];

    function clamp(value, min, max) {
      return Math.max(min, Math.min(value, max));
    }

    function addCandidate(dx, dy, target, snapX, snapY, score, maxDistance) {
      const candidateScore =
        typeof score === "number"
          ? score
          : distancePointToMouse(target, mousePos);
      const threshold = typeof maxDistance === "number" ? maxDistance : tol;
      if (candidateScore <= threshold) {
        candidates.push({
          score: candidateScore,
          dx,
          dy,
          target,
          snapX,
          snapY,
        });
      }
    }

    for (const otra of todas) {
      if (otra === pieza) continue;

      const ox = parseFloat(otra.dataset.x) || 0;
      const oy = parseFloat(otra.dataset.y) || 0;
      const ow = parseFloat(otra.dataset.w) || 1;
      const oh = parseFloat(otra.dataset.h) || 1;

      // Obtener corners rotados de la otra pieza
      const otraCorners = getCornerPoints(otra);
      const otraBBox = getBoundingBox(otraCorners);

      const bboxOverlapX = overlap(
        piezaBBox.minX,
        piezaBBox.maxX,
        otraBBox.minX,
        otraBBox.maxX,
      );
      const bboxOverlapY = overlap(
        piezaBBox.minY,
        piezaBBox.maxY,
        otraBBox.minY,
        otraBBox.maxY,
      );

      // SNAP DE BORDES - usando bounding boxes
      if (Math.abs(piezaBBox.maxX - otraBBox.minX) <= tol && bboxOverlapY) {
        const target = {
          x: otraBBox.minX,
          y: clamp(mousePos.y, otraBBox.minY, otraBBox.maxY),
        };
        addCandidate(
          otraBBox.minX - piezaBBox.maxX,
          0,
          target,
          otraBBox.minX,
          null,
          distancePointToMouse(target, mousePos),
          tol * 1.5,
        );
      }
      if (Math.abs(piezaBBox.minX - otraBBox.maxX) <= tol && bboxOverlapY) {
        const target = {
          x: otraBBox.maxX,
          y: clamp(mousePos.y, otraBBox.minY, otraBBox.maxY),
        };
        addCandidate(
          otraBBox.maxX - piezaBBox.minX,
          0,
          target,
          otraBBox.maxX,
          null,
          distancePointToMouse(target, mousePos),
          tol * 1.5,
        );
      }
      if (Math.abs(piezaBBox.maxY - otraBBox.minY) <= tol && bboxOverlapX) {
        const target = {
          x: clamp(mousePos.x, otraBBox.minX, otraBBox.maxX),
          y: otraBBox.minY,
        };
        addCandidate(
          0,
          otraBBox.minY - piezaBBox.maxY,
          target,
          null,
          otraBBox.minY,
          distancePointToMouse(target, mousePos),
          tol * 1.5,
        );
      }
      if (Math.abs(piezaBBox.minY - otraBBox.maxY) <= tol && bboxOverlapX) {
        const target = {
          x: clamp(mousePos.x, otraBBox.minX, otraBBox.maxX),
          y: otraBBox.maxY,
        };
        addCandidate(
          0,
          otraBBox.maxY - piezaBBox.minY,
          target,
          null,
          otraBBox.maxY,
          distancePointToMouse(target, mousePos),
          tol * 1.5,
        );
      }

      const misEsquinas = [
        piezaCorners.tl,
        piezaCorners.tr,
        piezaCorners.bl,
        piezaCorners.br,
      ];
      const otrasEsquinas = [
        otraCorners.tl,
        otraCorners.tr,
        otraCorners.bl,
        otraCorners.br,
      ];
      for (const miEsquina of misEsquinas) {
        for (const otraEsquina of otrasEsquinas) {
          const cornerDistance = distancePointToPoint(miEsquina, otraEsquina);
          if (cornerDistance <= cornerTolerance) {
            const dx = otraEsquina.x - miEsquina.x;
            const dy = otraEsquina.y - miEsquina.y;
            const mouseDist = Math.min(
              distancePointToMouse(miEsquina, mousePos),
              distancePointToMouse(otraEsquina, mousePos),
            );
            addCandidate(
              dx,
              dy,
              otraEsquina,
              otraEsquina.x,
              otraEsquina.y,
              mouseDist,
            );
          }
        }
      }
    }

    if (candidates.length) {
      candidates.sort((a, b) => a.score - b.score);
      const best = candidates[0];
      gx += best.dx;
      gy += best.dy;
      snapped = true;
      snappedX = best.snapX !== null ? best.snapX : best.target.x;
      snappedY = best.snapY !== null ? best.snapY : best.target.y;
    }

    pieza.dataset.x = gx;
    pieza.dataset.y = gy;

    // ===== SNAP A LINEAS =====
    // Buscar líneas y permitir snap hacia ellas
    const todas_lineas = [...document.querySelectorAll(".linea-creada")];
    for (const linea of todas_lineas) {
      try {
        const p1x = parseFloat(linea.getAttribute("data-p1x"));
        const p1y = parseFloat(linea.getAttribute("data-p1y"));
        const p2x = parseFloat(linea.getAttribute("data-p2x"));
        const p2y = parseFloat(linea.getAttribute("data-p2y"));

        if (
          !isFinite(p1x) ||
          !isFinite(p1y) ||
          !isFinite(p2x) ||
          !isFinite(p2y)
        )
          continue;

        // Actualizar bbox con la posición actual
        pieza.dataset.x = gx;
        pieza.dataset.y = gy;
        const currentCorners = getCornerPoints(pieza);
        const currentBBox = getBoundingBox(currentCorners);

        // Buscar el mejor snap (más cercano)
        let bestSnapDx = 0;
        let bestSnapDy = 0;
        let bestSnapX = null;
        let bestSnapY = null;
        let minSnapDist = tol;

        // Detectar si la línea es principalmente vertical u horizontal
        const dx = Math.abs(p2x - p1x);
        const dy = Math.abs(p2y - p1y);
        const isVertical = dx < dy; // más alto que ancho
        const isHorizontal = dy < dx; // más ancho que alto

        // 1) Chequear snap con endpoints de la línea
        const endpoints = [
          { x: p1x, y: p1y },
          { x: p2x, y: p2y },
        ];

        for (const endpoint of endpoints) {
          // Derecha pega con punto X
          const distRight = Math.abs(currentBBox.maxX - endpoint.x);
          if (
            distRight <= minSnapDist &&
            endpoint.y >= currentBBox.minY - tol &&
            endpoint.y <= currentBBox.maxY + tol
          ) {
            minSnapDist = distRight;
            bestSnapDx = endpoint.x - currentBBox.maxX;
            bestSnapX = endpoint.x;
          }

          // Izquierda pega con punto X
          const distLeft = Math.abs(currentBBox.minX - endpoint.x);
          if (
            distLeft <= minSnapDist &&
            endpoint.y >= currentBBox.minY - tol &&
            endpoint.y <= currentBBox.maxY + tol
          ) {
            minSnapDist = distLeft;
            bestSnapDx = endpoint.x - currentBBox.minX;
            bestSnapX = endpoint.x;
          }

          // Abajo pega con punto Y
          const distBottom = Math.abs(currentBBox.maxY - endpoint.y);
          if (
            distBottom <= minSnapDist &&
            endpoint.x >= currentBBox.minX - tol &&
            endpoint.x <= currentBBox.maxX + tol
          ) {
            minSnapDist = distBottom;
            bestSnapDy = endpoint.y - currentBBox.maxY;
            bestSnapY = endpoint.y;
          }

          // Arriba pega con punto Y
          const distTop = Math.abs(currentBBox.minY - endpoint.y);
          if (
            distTop <= minSnapDist &&
            endpoint.x >= currentBBox.minX - tol &&
            endpoint.x <= currentBBox.maxX + tol
          ) {
            minSnapDist = distTop;
            bestSnapDy = endpoint.y - currentBBox.minY;
            bestSnapY = endpoint.y;
          }
        }

        // 2) Chequear snap con el segmento de la línea si es vertical
        if (isVertical) {
          const lineX = (p1x + p2x) / 2; // coordenada X promedio
          const minLineY = Math.min(p1y, p2y);
          const maxLineY = Math.max(p1y, p2y);

          // Derecha de pieza a línea vertical
          const distRight = Math.abs(currentBBox.maxX - lineX);
          if (
            distRight <= minSnapDist &&
            !(currentBBox.maxY < minLineY || currentBBox.minY > maxLineY)
          ) {
            minSnapDist = distRight;
            bestSnapDx = lineX - currentBBox.maxX;
            bestSnapX = lineX;
          }

          // Izquierda de pieza a línea vertical
          const distLeft = Math.abs(currentBBox.minX - lineX);
          if (
            distLeft <= minSnapDist &&
            !(currentBBox.maxY < minLineY || currentBBox.minY > maxLineY)
          ) {
            minSnapDist = distLeft;
            bestSnapDx = lineX - currentBBox.minX;
            bestSnapX = lineX;
          }
        }

        // 3) Chequear snap con el segmento de la línea si es horizontal
        if (isHorizontal) {
          const lineY = (p1y + p2y) / 2; // coordenada Y promedio
          const minLineX = Math.min(p1x, p2x);
          const maxLineX = Math.max(p1x, p2x);

          // Abajo de pieza a línea horizontal
          const distBottom = Math.abs(currentBBox.maxY - lineY);
          if (
            distBottom <= minSnapDist &&
            !(currentBBox.maxX < minLineX || currentBBox.minX > maxLineX)
          ) {
            minSnapDist = distBottom;
            bestSnapDy = lineY - currentBBox.maxY;
            bestSnapY = lineY;
          }

          // Arriba de pieza a línea horizontal
          const distTop = Math.abs(currentBBox.minY - lineY);
          if (
            distTop <= minSnapDist &&
            !(currentBBox.maxX < minLineX || currentBBox.minX > maxLineX)
          ) {
            minSnapDist = distTop;
            bestSnapDy = lineY - currentBBox.minY;
            bestSnapY = lineY;
          }
        }

        // Aplicar el mejor snap si lo hay
        if (bestSnapDx !== 0 || bestSnapDy !== 0) {
          gx += bestSnapDx;
          gy += bestSnapDy;
          if (bestSnapX !== null) snappedX = bestSnapX;
          if (bestSnapY !== null) snappedY = bestSnapY;
          snapped = true;
        }
      } catch (ex) {
        // ignorar errores en líneas
      }
    }

    // actualizar dataset y guias
    pieza.dataset.x = gx;
    pieza.dataset.y = gy;
    snapGuideX = snappedX;
    snapGuideY = snappedY;

    if (snappedX !== null) mostrarGuiaX(snappedX);
    if (snappedY !== null) mostrarGuiaY(snappedY);

    if (!snapped) ocultarGuias();
    if (window.Cuadricula?.actualizarPiezas)
      window.Cuadricula.actualizarPiezas();

    return snapped;
  };

  // -------------------------------------
  // DRAG CON SNAP CORREGIDO
  // -------------------------------------
  (function () {
    const grid = document.getElementById("gridArea");
    if (!grid) return;

    let dragging = false;
    let piezasArr = [];
    let startMouseX = 0,
      startMouseY = 0;
    let startPositions = new Map();

    grid.addEventListener("mousedown", (e) => {
      const pieza = e.target.closest(".pieza-dibujada");
      if (!pieza) return;
      dragging = true;

      // Marcar que el arrastre se inició sobre una pieza
      try {
        window._dragOrigin = "piece";
      } catch (e) {}

      piezasArr = Array.from(window.Seleccion?.piezas || [pieza]);
      startMouseX = e.clientX;
      startMouseY = e.clientY;

      piezasArr.forEach((p) => {
        startPositions.set(p, {
          x: parseFloat(p.dataset.x) || 0,
          y: parseFloat(p.dataset.y) || 0,
        });
      });

      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;

      const scale = window.Grid?.scale() || 1;
      const dx = (e.clientX - startMouseX) / scale;
      const dy = (e.clientY - startMouseY) / scale;

      // Guardar el último movimiento para detectar dirección
      lastDragDx = dx;
      lastDragDy = dy;

      piezasArr.forEach((p) => {
        const start = startPositions.get(p) || { x: 0, y: 0 };
        let newX = start.x + dx;
        let newY = start.y + dy;
        p.dataset.x = newX;
        p.dataset.y = newY;
      });

      // Aplicar snap solo a la pieza principal si el arrastre originó en una pieza
      if (
        window.ModoPegar &&
        piezasArr.length > 0 &&
        (window._dragOrigin === undefined || window._dragOrigin === "piece")
      ) {
        window.PegarAotrasPiezas(piezasArr[0], e);
      } else {
        ocultarGuias();
      }

      if (window.Cuadricula?.actualizarPiezas)
        window.Cuadricula.actualizarPiezas();
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      piezasArr = [];
      startPositions.clear();
      ocultarGuias();
      try {
        delete window._dragOrigin;
      } catch (e) {}
    });
  })();
})();
