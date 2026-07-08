// H_crear_linea.js - Versión Simplificada y Mejorada
(function () {
  if (window._crearLineaLoaded) return;
  window._crearLineaLoaded = true;

  console.log("✓ H_crear linea cargado - versión mejorada");

  // ===== CONFIGURACIÓN =====
  const CONFIG = {
    COLOR_LINEA: "#333333", // Color de líneas finales (gris oscuro)
    COLOR_PREVIEW: "#1e90ff", // Color del preview (azul)
    COLOR_SELECTED: "#ff6b00", // Color cuando está seleccionada (naranja)
    STROKE_WIDTH: 2.5, // Ancho de línea visible
    STROKE_PREVIEW: 2.5, // Ancho del preview
    STROKE_HIT: 16, // Ancho del área de hit (invisible)
    SNAP_TOLERANCE_PX: 20, // Tolerancia de snap en píxeles, constante frente a zoom
    CANCEL_DRAG_THRESHOLD: 1, // Píxeles de arrastre permitidos antes de cancelar (right-click)
  };

  // ===== ESTADO GLOBAL =====
  let activo = false;
  let inicializado = false;
  const lineas = [];
  const selectedLineas = new Set();

  let svgLayer = null;
  let svgGroup = null;
  let clickOverlay = null;

  // Estado del preview (modo creación)
  let previewStart = null;
  let previewGroup = null;
  let previewMode = false;
  let previewInputContainer = null;
  let previewInput = null;
  let angleInput = null;
  let customDistance = null; // Distancia personalizada si el usuario la edita
  let customAngle = null; // Ángulo personalizado si el usuario lo edita
  let angleFocused = false;
  let lastMousePos = null; // Última posición del mouse para Enter
  let hoverSnapMarker = null;
  let hoverSnapTarget = null;

  // Estado del drag
  let draggingLine = null;
  let dragStart = null;
  let dragInitial = null;
  let draggingEndpoint = null;
  let draggedEndpointIndex = null;

  // Estado del marco de selección
  let selectionBoxStart = null;
  let selectionBoxDiv = null;

  // Estado del right-click para cancelar preview
  let rightClickStart = null;
  let rightClickDragging = false;

  // ===== UTILIDADES =====
  function getScale() {
    return window.Grid?.scale?.() || 1;
  }

  function getOffset() {
    return window.Grid?.offset?.() || { x: 0, y: 0 };
  }

  function calculatePointFromAngle(angleDegrees, distance) {
    const radians = (angleDegrees * Math.PI) / 180;
    return {
      x: previewStart.x + Math.cos(radians) * distance,
      y: previewStart.y + Math.sin(radians) * distance,
    };
  }

  function gridToPixel(gx, gy) {
    const s = getScale();
    const o = getOffset();
    return {
      x: gx * s + o.x,
      y: gy * s + o.y,
    };
  }

  function pixelToGrid(sx, sy) {
    const gridArea = document.getElementById("gridArea");
    if (!gridArea) return { x: 0, y: 0 };

    const rect = gridArea.getBoundingClientRect();
    const s = getScale();
    const o = getOffset();

    return {
      x: (sx - rect.left - o.x) / s,
      y: (sy - rect.top - o.y) / s,
    };
  }

  // ===== SNAP A ESQUINAS / SEGMENTOS (piezas y lineas) =====
  function findNearbyCorner(
    gx,
    gy,
    tolerance = CONFIG.SNAP_TOLERANCE,
    excludeLineId = null,
  ) {
    // tolerance provisto en píxeles; convertir a unidades de grid
    const scale = getScale();
    // Usar tolerancia definida en píxeles y convertirla a unidades de grid
    const effectiveTolerancePx =
      typeof tolerance === "number" ? tolerance : CONFIG.SNAP_TOLERANCE_PX;
    const tolGrid = Math.max(
      0.1,
      effectiveTolerancePx / Math.max(0.0001, scale),
    );
    console.log(
      "🔧 findNearbyCorner tolGrid (grid units):",
      tolGrid,
      "scale:",
      scale,
    );

    console.log("🔍 findNearbyCorner:", {
      gx,
      gy,
      tolerance: effectiveTolerance,
      tolGrid,
      scale,
      excludeLineId,
    });

    // helpers
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
      const dist = Math.hypot(px - cx, py - cy);
      return { x: cx, y: cy, dist, t };
    }

    function getRotatedCorners(pieza) {
      const x = parseFloat(pieza.dataset.x) || 0;
      const y = parseFloat(pieza.dataset.y) || 0;
      const w = parseFloat(pieza.dataset.w) || 1;
      const h = parseFloat(pieza.dataset.h) || 1;
      let rotation = parseFloat(pieza.dataset.rotation) || 0;
      rotation = ((rotation % 360) + 360) % 360;
      const cx = x + w / 2;
      const cy = y + h / 2;
      if (Math.abs(rotation) < 0.0001) {
        // YA ESTÁN EN GRID COORDS
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
      function rot(px, py) {
        const dx = px - cx;
        const dy = py - cy;
        return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
      }
      return {
        tl: rot(x, y),
        tr: rot(x + w, y),
        bl: rot(x, y + h),
        br: rot(x + w, y + h),
      };
    }

    let best = null;
    let minDist = tolGrid;

    // 1) Piezas: esquinas y segmentos (bordes)
    const piezas = Array.from(
      document.querySelectorAll(".pieza-dibujada"),
    ).filter((p) => p.dataset.visible !== "false");
    console.log("📦 Piezas encontradas:", piezas.length);

    // Helper para convertir píxeles a grid
    function pixelToGrid2(sx, sy) {
      const gridArea = document.getElementById("gridArea");
      if (!gridArea) {
        console.log("⚠️  gridArea no encontrado");
        return { x: sx, y: sy };
      }
      const rect = gridArea.getBoundingClientRect();
      const s = window.Grid?.scale() || 1;
      const o = window.Grid?.offset() || { x: 0, y: 0 };
      const result = {
        x: (sx - rect.left - o.x) / s,
        y: (sy - rect.top - o.y) / s,
      };
      console.log("  pixelToGrid2:", {
        input: { sx, sy },
        rect: { left: rect.left, top: rect.top },
        offset: o,
        scale: s,
        result,
      });
      return result;
    }

    for (const pieza of piezas) {
      const corners = getRotatedCorners(pieza);
      const cornerList = [corners.tl, corners.tr, corners.br, corners.bl];
      console.log("🔸 Pieza corners (raw):", cornerList);

      // comprobar esquinas - YA ESTÁN EN GRID COORDS desde dataset
      for (const c of cornerList) {
        const d = Math.hypot(c.x - gx, c.y - gy);
        console.log(
          `   Esquina ${c.x.toFixed(2)},${c.y.toFixed(2)}: dist=${d.toFixed(2)}, tolGrid=${tolGrid.toFixed(2)}`,
        );
        if (d < minDist) {
          console.log("✅ Snap a esquina:", {
            esquina: c,
            distancia: d,
            tolGrid,
          });
          minDist = d;
          best = {
            x: c.x,
            y: c.y,
            sourceType: "pieza-corner",
          };
        }
      }

      // comprobar segmentos de borde - YA ESTÁN EN GRID COORDS desde dataset
      const segs = [
        [cornerList[0], cornerList[1]],
        [cornerList[1], cornerList[2]],
        [cornerList[2], cornerList[3]],
        [cornerList[3], cornerList[0]],
      ];
      for (const s of segs) {
        const seg1 = s[0],
          seg2 = s[1];
        const cp = closestPointOnSegment(
          gx,
          gy,
          seg1.x,
          seg1.y,
          seg2.x,
          seg2.y,
        );
        console.log(
          `   Borde ${seg1.x.toFixed(2)},${seg1.y.toFixed(2)} → ${seg2.x.toFixed(2)},${seg2.y.toFixed(2)}: dist=${cp.dist.toFixed(2)}, tolGrid=${tolGrid.toFixed(2)}`,
        );
        // Caso general: snap al punto más cercano en el segmento
        if (cp.dist < minDist) {
          console.log("✅ Snap a borde:", {
            punto: cp,
            distancia: cp.dist,
            tolGrid,
          });
          minDist = cp.dist;
          best = {
            x: cp.x,
            y: cp.y,
            sourceType: "pieza-edge",
          };
        }
        // Caso especial: si el segmento es casi vertical u horizontal,
        // permitir snap sobre cualquier punto del borde si la componente
        // perpendicular está dentro de tolerancia (esto ayuda a pegar
        // puntas de líneas verticales/horizontales a top/bottom/left/right).
        try {
          const dx = seg2.x - seg1.x;
          const dy = seg2.y - seg1.y;
          const segLen = Math.hypot(dx, dy) || 1;
          const ux = dx / segLen;
          const uy = dy / segLen;
          const axisTol = Math.max(tolGrid * 2.0, 2.0);
          // Detectar si el segmento es casi vertical (ux ~= 0) o casi horizontal (uy ~= 0)
          if (Math.abs(ux) < 0.1) {
            // segmento vertical: x aproximadamente constante
            const sx = seg1.x;
            const minY = Math.min(seg1.y, seg2.y);
            const maxY = Math.max(seg1.y, seg2.y);
            const projY = Math.max(minY, Math.min(maxY, gy));
            const dAxis = Math.hypot(gx - sx, gy - projY);
            if (dAxis < axisTol && dAxis < minDist) {
              console.log("✅ Snap a borde vertical (axis) punto:", {
                x: sx,
                y: projY,
                dAxis,
              });
              minDist = dAxis;
              best = { x: sx, y: projY };
            }
          } else if (Math.abs(uy) < 0.1) {
            // segmento horizontal: y aproximadamente constante
            const sy = seg1.y;
            const minX = Math.min(seg1.x, seg2.x);
            const maxX = Math.max(seg1.x, seg2.x);
            const projX = Math.max(minX, Math.min(maxX, gx));
            const dAxis = Math.hypot(gx - projX, gy - sy);
            if (dAxis < axisTol && dAxis < minDist) {
              console.log("✅ Snap a borde horizontal (axis) punto:", {
                x: projX,
                y: sy,
                dAxis,
              });
              minDist = dAxis;
              best = { x: projX, y: sy };
            }
          }
        } catch (e) {}
      }
    }

    // 2) Líneas existentes: endpoints y cualquier punto sobre el segmento
    const lines = Array.from(document.querySelectorAll(".linea-creada")).filter(
      (l) => l.id !== excludeLineId,
    );
    console.log("📐 Líneas encontradas:", lines.length);

    for (const l of lines) {
      try {
        const p1x = parseFloat(l.getAttribute("data-p1x"));
        const p1y = parseFloat(l.getAttribute("data-p1y"));
        const p2x = parseFloat(l.getAttribute("data-p2x"));
        const p2y = parseFloat(l.getAttribute("data-p2y"));
        if (isFinite(p1x) && isFinite(p1y) && isFinite(p2x) && isFinite(p2y)) {
          // endpoints
          const d1 = Math.hypot(p1x - gx, p1y - gy);
          if (d1 < minDist) {
            minDist = d1;
            best = {
              x: p1x,
              y: p1y,
              sourceType: "linea-endpoint",
              lineId: l.id,
              endpoint: 1,
            };
          }
          const d2 = Math.hypot(p2x - gx, p2y - gy);
          if (d2 < minDist) {
            minDist = d2;
            best = {
              x: p2x,
              y: p2y,
              sourceType: "linea-endpoint",
              lineId: l.id,
              endpoint: 2,
            };
          }
          // punto más cercano en segmento
          const cp = closestPointOnSegment(gx, gy, p1x, p1y, p2x, p2y);
          if (cp.dist < minDist) {
            minDist = cp.dist;
            best = {
              x: cp.x,
              y: cp.y,
              sourceType: "linea-segment",
              lineId: l.id,
            };
          }
        }
      } catch (ex) {}
    }

    console.log("🎯 findNearbyCorner resultado:", best);
    return best;
  }

  // ===== ESTILOS CSS =====
  function ensureStyles() {
    if (document.getElementById("linea-styles")) return;

    const css = `
      .linea-creada {
        cursor: move;
        pointer-events: auto;
      }
      
      .linea-creada .linea-hit {
        pointer-events: stroke;
        stroke-opacity: 0;
        cursor: move;
      }
      
      .linea-creada .linea-core {
        pointer-events: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      
      .linea-creada .linea-punto {
        display: none;
        pointer-events: auto;
        cursor: grab;
        transition: r 150ms ease;
      }
      
      .linea-creada.selected .linea-punto {
        display: inline;
      }
      
      .linea-creada .linea-punto:hover {
        r: 5 !important;
      }
      
      .linea-preview .linea-punto-start {
        display: inline;
      }
      .linea-preview .linea-punto-end {
        display: none;
      }
      .linea-preview.snap-target .linea-punto-end {
        display: inline;
      }
      
      /* Estados de selección */
      .linea-creada.selected .linea-hit {
        stroke-opacity: 0 !important;
        stroke-width: 18 !important;
      }
      
      .linea-creada.selected .linea-core {
        stroke: ${CONFIG.COLOR_SELECTED} !important;
        stroke-width: 3.5 !important;
      }
      
      .linea-creada.selected .linea-punto {
        fill: ${CONFIG.COLOR_SELECTED} !important;
        r: 5 !important;
        cursor: grab;
      }
      
      .linea-creada.selected .linea-punto:active {
        cursor: grabbing;
      }
      
      .linea-creada.selected .linea-texto {
        fill: ${CONFIG.COLOR_SELECTED} !important;
        font-weight: 700;
      }
      
      .linea-creada .linea-texto {
        pointer-events: none;
        user-select: none;
        font-weight: 600;
        font-size: 11px;
        display: none;
      }
      
      /* Mostrar texto solo cuando está seleccionada */
      .linea-creada.selected .linea-texto {
        display: block !important;
      }
      
      /* Preview */
      .linea-preview .linea-hit {
        stroke-opacity: 0 !important;
        pointer-events: none;
      }
      
      .linea-preview .linea-core {
        stroke-dasharray: none;
        opacity: 1;
      }
      
      /* Quitar flechas (spinners) del input de medida */
      .linea-measure-input::-webkit-outer-spin-button,
      .linea-measure-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .linea-measure-input {
        -moz-appearance: textfield;
        appearance: textfield;
      }
    `;

    const style = document.createElement("style");
    style.id = "linea-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ===== CREAR CAPA SVG =====
  function initSVGLayer() {
    let layer = document.getElementById("svg-lineas");
    if (layer) return layer;

    layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    layer.id = "svg-lineas";
    layer.setAttribute("background", "none");
    layer.setAttribute("fill", "none");
    layer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
      overflow: visible;
      background: transparent !important;
      background-color: transparent !important;
    `;

    const gridArea = document.getElementById("gridArea");
    if (gridArea) {
      gridArea.style.position = "relative";
      gridArea.appendChild(layer);
    }

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.id = "svg-lineas-group";
    g.setAttribute("fill", "none");
    layer.appendChild(g);

    svgLayer = layer;
    svgGroup = g;
    return layer;
  }

  // ===== DIBUJAR LÍNEA FINAL =====
  function dibujarLinea(p1, p2, distancia, color = CONFIG.COLOR_LINEA) {
    const pos1 = gridToPixel(p1.x, p1.y);
    const pos2 = gridToPixel(p2.x, p2.y);

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("linea-creada");
    g.setAttribute("data-p1x", p1.x);
    g.setAttribute("data-p1y", p1.y);
    g.setAttribute("data-p2x", p2.x);
    g.setAttribute("data-p2y", p2.y);
    g.setAttribute("data-dist", distancia.toFixed(2));
    g.setAttribute("data-color", color);

    // Hit (invisible, para capturar eventos)
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hit.classList.add("linea-hit");
    hit.setAttribute("x1", pos1.x);
    hit.setAttribute("y1", pos1.y);
    hit.setAttribute("x2", pos2.x);
    hit.setAttribute("y2", pos2.y);
    hit.setAttribute("stroke", color);
    hit.setAttribute("stroke-width", CONFIG.STROKE_HIT);
    g.appendChild(hit);

    // Línea visible
    const core = document.createElementNS("http://www.w3.org/2000/svg", "line");
    core.classList.add("linea-core");
    core.setAttribute("x1", pos1.x);
    core.setAttribute("y1", pos1.y);
    core.setAttribute("x2", pos2.x);
    core.setAttribute("y2", pos2.y);
    core.setAttribute("stroke", color);
    core.setAttribute("stroke-width", CONFIG.STROKE_WIDTH);
    g.appendChild(core);

    // Puntos terminales
    const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c1.classList.add("linea-punto");
    c1.setAttribute("cx", pos1.x);
    c1.setAttribute("cy", pos1.y);
    c1.setAttribute("r", "3");
    c1.setAttribute("fill", color);
    g.appendChild(c1);

    const c2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c2.classList.add("linea-punto");
    c2.setAttribute("cx", pos2.x);
    c2.setAttribute("cy", pos2.y);
    c2.setAttribute("r", "3");
    c2.setAttribute("fill", color);
    g.appendChild(c2);

    // Etiqueta de distancia
    const midX = (pos1.x + pos2.x) / 2;
    const midY = (pos1.y + pos2.y) / 2;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.classList.add("linea-texto");
    text.setAttribute("x", midX);
    text.setAttribute("y", midY - 6);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", color);
    text.textContent = distancia.toFixed(2);
    g.appendChild(text);

    svgGroup.appendChild(g);
    lineas.push(g);

    // Permitir interacción
    setupLineInteraction(g);

    console.log("✓ Línea creada", { p1, p2, dist: distancia.toFixed(2) });
    return g;
  }

  // ===== ACTUALIZAR POSICIONES (para pan/zoom) =====
  function updateLinePositions(lineEl) {
    const p1x = parseFloat(lineEl.getAttribute("data-p1x"));
    const p1y = parseFloat(lineEl.getAttribute("data-p1y"));
    const p2x = parseFloat(lineEl.getAttribute("data-p2x"));
    const p2y = parseFloat(lineEl.getAttribute("data-p2y"));

    const pos1 = gridToPixel(p1x, p1y);
    const pos2 = gridToPixel(p2x, p2y);

    const hit = lineEl.querySelector(".linea-hit");
    if (hit) {
      hit.setAttribute("x1", pos1.x);
      hit.setAttribute("y1", pos1.y);
      hit.setAttribute("x2", pos2.x);
      hit.setAttribute("y2", pos2.y);
    }

    const core = lineEl.querySelector(".linea-core");
    if (core) {
      core.setAttribute("x1", pos1.x);
      core.setAttribute("y1", pos1.y);
      core.setAttribute("x2", pos2.x);
      core.setAttribute("y2", pos2.y);
    }

    const circles = lineEl.querySelectorAll(".linea-punto");
    if (circles[0]) {
      circles[0].setAttribute("cx", pos1.x);
      circles[0].setAttribute("cy", pos1.y);
    }
    if (circles[1]) {
      circles[1].setAttribute("cx", pos2.x);
      circles[1].setAttribute("cy", pos2.y);
    }

    const text = lineEl.querySelector(".linea-texto");
    if (text) {
      const midX = (pos1.x + pos2.x) / 2;
      const midY = (pos1.y + pos2.y) / 2;
      text.setAttribute("x", midX);
      text.setAttribute("y", midY - 6);
      // Actualizar el valor de distancia mostrado
      const dist = parseFloat(lineEl.getAttribute("data-dist"));
      if (!isNaN(dist)) {
        text.textContent = dist.toFixed(2);
      }
    }
  }

  // ===== SELECCIÓN =====
  function selectLine(lineEl, clearOthers = true) {
    if (!lineEl) return;

    if (clearOthers) {
      selectedLineas.forEach((line) => line.classList.remove("selected"));
      selectedLineas.clear();
    }

    lineEl.classList.add("selected");
    selectedLineas.add(lineEl);
    console.log("✓ Línea seleccionada:", selectedLineas.size, "total");
  }

  function deselectLine(lineEl) {
    if (!lineEl) return;
    lineEl.classList.remove("selected");
    selectedLineas.delete(lineEl);
    console.log("✓ Línea deseleccionada:", selectedLineas.size, "total");
  }

  function clearSelection() {
    selectedLineas.forEach((line) => line.classList.remove("selected"));
    selectedLineas.clear();
  }

  // ===== MARCO DE SELECCIÓN =====
  function startSelectionBox(startPos) {
    selectionBoxStart = startPos;

    const gridArea = document.getElementById("gridArea");
    if (!gridArea) return;

    // No crear el div inmediatamente - esperar a que haya movimiento significativo
    console.log("→ Inicio potencial de marco de selección en:", startPos);
  }

  function updateSelectionBox(currentPos) {
    if (!selectionBoxStart) return;

    // Crear el div de selección solo si hay movimiento significativo (> 5px)
    const distance = Math.hypot(
      currentPos.x - selectionBoxStart.x,
      currentPos.y - selectionBoxStart.y,
    );
    if (distance < 5) return;

    // Si no existe aún, crearlo ahora
    if (!selectionBoxDiv) {
      const gridArea = document.getElementById("gridArea");
      if (!gridArea) return;

      selectionBoxDiv = document.createElement("div");
      selectionBoxDiv.style.cssText = `
        position: absolute;
        border: 2px dashed ${CONFIG.COLOR_PREVIEW};
        background: rgba(30, 144, 255, 0.1);
        pointer-events: none;
        z-index: 500;
      `;
      gridArea.appendChild(selectionBoxDiv);
      console.log("✓ Marco de selección iniciado");
    }

    const left = Math.min(selectionBoxStart.x, currentPos.x);
    const top = Math.min(selectionBoxStart.y, currentPos.y);
    const width = Math.abs(currentPos.x - selectionBoxStart.x);
    const height = Math.abs(currentPos.y - selectionBoxStart.y);

    selectionBoxDiv.style.left = left + "px";
    selectionBoxDiv.style.top = top + "px";
    selectionBoxDiv.style.width = width + "px";
    selectionBoxDiv.style.height = height + "px";
  }

  function finishSelectionBox(currentPos) {
    if (!selectionBoxStart || !selectionBoxDiv) {
      selectionBoxStart = null;
      if (selectionBoxDiv && selectionBoxDiv.parentNode) {
        selectionBoxDiv.remove();
      }
      selectionBoxDiv = null;
      return;
    }

    // Calcular el rectángulo final en coordenadas del viewport
    const viewportLeft = Math.min(selectionBoxStart.x, currentPos.x);
    const viewportTop = Math.min(selectionBoxStart.y, currentPos.y);
    const viewportRight = Math.max(selectionBoxStart.x, currentPos.x);
    const viewportBottom = Math.max(selectionBoxStart.y, currentPos.y);

    // Convertir a coordenadas de grid
    const topLeft = pixelToGrid(viewportLeft, viewportTop);
    const bottomRight = pixelToGrid(viewportRight, viewportBottom);

    const gridLeft = Math.min(topLeft.x, bottomRight.x);
    const gridTop = Math.min(topLeft.y, bottomRight.y);
    const gridRight = Math.max(topLeft.x, bottomRight.x);
    const gridBottom = Math.max(topLeft.y, bottomRight.y);

    // Seleccionar líneas dentro del rectángulo
    // Sólo si la herramienta de selección está activa
    if (
      window.ToggleSelection &&
      typeof window.ToggleSelection.isActive === "function" &&
      !window.ToggleSelection.isActive()
    ) {
      // Limpiar el div del marco y salir sin seleccionar
      if (selectionBoxDiv && selectionBoxDiv.parentNode)
        selectionBoxDiv.remove();
      selectionBoxStart = null;
      selectionBoxDiv = null;
      console.log(
        "→ Marco de selección ignorado porque la herramienta está desactivada",
      );
      return;
    }
    clearSelection();
    let selectedCount = 0;

    lineas.forEach((lineEl) => {
      const p1x = parseFloat(lineEl.getAttribute("data-p1x"));
      const p1y = parseFloat(lineEl.getAttribute("data-p1y"));
      const p2x = parseFloat(lineEl.getAttribute("data-p2x"));
      const p2y = parseFloat(lineEl.getAttribute("data-p2y"));

      // Verificar si algún punto está dentro del rectángulo
      const p1Inside =
        p1x >= gridLeft &&
        p1x <= gridRight &&
        p1y >= gridTop &&
        p1y <= gridBottom;
      const p2Inside =
        p2x >= gridLeft &&
        p2x <= gridRight &&
        p2y >= gridTop &&
        p2y <= gridBottom;

      if (p1Inside || p2Inside) {
        selectLine(lineEl, false);
        selectedCount++;
      }
    });

    // Limpiar el div del marco
    if (selectionBoxDiv && selectionBoxDiv.parentNode) {
      selectionBoxDiv.remove();
    }
    selectionBoxStart = null;
    selectionBoxDiv = null;

    console.log(
      "✓ Marco de selección completado:",
      selectedCount,
      "líneas seleccionadas",
    );
  }

  function deleteSelectedLines() {
    if (selectedLineas.size === 0) return;

    selectedLineas.forEach((line) => {
      line.remove();
      const idx = lineas.indexOf(line);
      if (idx > -1) lineas.splice(idx, 1);
    });

    selectedLineas.clear();
    console.log("✓ Líneas eliminadas");
  }

  // ===== PREVIEW (modo creación) =====
  function startPreview(start) {
    cancelPreview();

    // Validación: asegurar que svgGroup existe
    if (!svgGroup) {
      console.error("❌ svgGroup no existe! Inicializando SVG...");
      initSVGLayer();
    }

    if (!svgGroup) {
      console.error("❌ svgGroup aún es null después de initSVGLayer");
      return;
    }

    previewStart = start;
    previewMode = true;
    lastMousePos = start; // Inicializar con la posición inicial

    console.log("📦 startPreview - svgGroup:", svgGroup);

    // Crear grupo preview
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("linea-preview");
    g.setAttribute("data-start-x", start.x);
    g.setAttribute("data-start-y", start.y);
    g.setAttribute("fill", "none");
    g.style.pointerEvents = "none";

    // Hit
    const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hit.classList.add("linea-hit");
    hit.setAttribute("stroke", CONFIG.COLOR_PREVIEW);
    hit.setAttribute("stroke-width", CONFIG.STROKE_HIT);
    hit.setAttribute("stroke-linecap", "round");
    hit.setAttribute("stroke-linejoin", "round");
    hit.setAttribute("opacity", "0.3");
    g.appendChild(hit);

    // Línea visible
    const core = document.createElementNS("http://www.w3.org/2000/svg", "line");
    core.classList.add("linea-core");
    core.setAttribute("stroke", CONFIG.COLOR_PREVIEW);
    core.setAttribute("stroke-width", CONFIG.STROKE_PREVIEW);
    core.setAttribute("stroke-linecap", "round");
    core.setAttribute("stroke-linejoin", "round");
    core.setAttribute("opacity", "1");
    g.appendChild(core);

    // Puntos
    const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c1.classList.add("linea-punto");
    c1.setAttribute("r", "4");
    c1.setAttribute("fill", CONFIG.COLOR_PREVIEW);
    g.appendChild(c1);

    const c2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c2.classList.add("linea-punto");
    c2.setAttribute("r", "4");
    c2.setAttribute("fill", CONFIG.COLOR_PREVIEW);
    g.appendChild(c2);

    // Texto
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.classList.add("linea-texto");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", CONFIG.COLOR_PREVIEW);
    g.appendChild(text);

    svgGroup.appendChild(g);
    previewGroup = g;

    console.log(
      "✓ Preview iniciado en:",
      start,
      "previewGroup agregado:",
      previewGroup !== null,
    );

    // Crear input para editar la medida
    createMeasureInput();

    // Actualizar preview en la posición inicial
    updatePreview(start);

    console.log("✓ Preview iniciado en:", start);
  }

  function createMeasureInput() {
    if (previewInputContainer) previewInputContainer.remove();
    const container = document.createElement("div");
    // Añadir dentro de gridArea y usar position:absolute para alinear con gridToPixel
    container.style.cssText = `
      position: absolute;
      left: 0px;
      top: 0px;
      transform: translate(0, 0);
      z-index: 10000;
      background: transparent;
      border: none;
      padding: 0;
      pointer-events: auto;
      display: block;
    `;

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.min = "0";
    input.style.cssText = `
      width: 80px;
      padding: 4px 6px;
      border: 1px solid ${CONFIG.COLOR_PREVIEW};
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      color: ${CONFIG.COLOR_PREVIEW};
      text-align: center;
      background: white;
      outline: none;
    `;
    input.placeholder = "0.00";

    input.addEventListener("change", (e) => {
      e.stopPropagation();
      const val = parseFloat(input.value);
      customDistance = isNaN(val) || val === "" ? null : val;
      console.log("✓ Medida actualizada:", customDistance);
      if (previewStart) updatePreview(lastMousePos || previewStart);
    });

    input.addEventListener("input", (e) => {
      e.stopPropagation();
      const val = parseFloat(input.value);
      customDistance = isNaN(val) || val === "" ? null : val;
      if (previewStart) updatePreview(lastMousePos || previewStart);
    });

    const angleWrapper = document.createElement("div");
    angleWrapper.style.display = "flex";
    angleWrapper.style.gap = "4px";
    angleWrapper.style.alignItems = "center";

    const distanceInput = input;

    const angleInputField = document.createElement("input");
    angleInputField.type = "number";
    angleInputField.step = "0.1";
    angleInputField.style.cssText = `
      width: 60px;
      padding: 4px 6px;
      border: 1px solid ${CONFIG.COLOR_PREVIEW};
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      color: ${CONFIG.COLOR_PREVIEW};
      text-align: center;
      background: white;
      outline: none;
    `;
    angleInputField.placeholder = "áng";
    angleInputField.title = "Ángulo en grados";

    angleInputField.addEventListener("change", (e) => {
      e.stopPropagation();
      const val = parseFloat(angleInputField.value);
      customAngle =
        isNaN(val) || angleInputField.value === ""
          ? null
          : ((val % 360) + 360) % 360;
      if (customAngle !== null) {
        angleInputField.value = customAngle.toFixed(1);
      }
      console.log("✓ Ángulo actualizado:", customAngle);
      if (previewStart) updatePreview(lastMousePos || previewStart);
    });

    angleInputField.addEventListener("input", (e) => {
      e.stopPropagation();
      const val = parseFloat(angleInputField.value);
      customAngle =
        isNaN(val) || angleInputField.value === ""
          ? null
          : ((val % 360) + 360) % 360;
      if (previewStart) updatePreview(lastMousePos || previewStart);
    });

    angleInputField.addEventListener("focus", () => {
      angleFocused = true;
      if (customAngle === null && previewStart && lastMousePos) {
        const dx = lastMousePos.x - previewStart.x;
        const dy = lastMousePos.y - previewStart.y;
        const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        customAngle = ((currentAngle % 360) + 360) % 360;
        angleInputField.value = customAngle.toFixed(1);
      }
      if (previewStart) updatePreview(lastMousePos || previewStart);
      console.log("✓ Ángulo enfocado, mouse angle desactivado");
    });

    angleInputField.addEventListener("blur", () => {
      angleFocused = false;
      if (angleInputField.value === "" || angleInputField.value === null) {
        customAngle = null;
      }
      console.log("✓ Ángulo desenfocado");
    });

    angleInputField.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const valAngle = parseFloat(angleInputField.value);
        customAngle =
          isNaN(valAngle) || angleInputField.value === ""
            ? null
            : ((valAngle % 360) + 360) % 360;
        const valDist = parseFloat(distanceInput.value);
        customDistance =
          isNaN(valDist) || distanceInput.value === "" ? null : valDist;
        if (previewStart) {
          const currentDist =
            customDistance !== null
              ? customDistance
              : Math.hypot(
                  lastMousePos.x - previewStart.x,
                  lastMousePos.y - previewStart.y,
                );
          const angle =
            customAngle !== null
              ? customAngle
              : (Math.atan2(
                  lastMousePos.y - previewStart.y,
                  lastMousePos.x - previewStart.x,
                ) *
                  180) /
                Math.PI;
          const finalAngle = ((angle % 360) + 360) % 360;
          const endPoint = calculatePointFromAngle(finalAngle, currentDist);
          dibujarLinea(previewStart, endPoint, currentDist, CONFIG.COLOR_LINEA);
          startPreview(endPoint);
          console.log(
            "→ Línea creada por Enter en ángulo y continua otra línea",
          );
        }
      }
    });

    distanceInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const val = parseFloat(distanceInput.value);
        customDistance = isNaN(val) || distanceInput.value === "" ? null : val;
        if (previewStart && lastMousePos) {
          const calculatedDist = Math.hypot(
            lastMousePos.x - previewStart.x,
            lastMousePos.y - previewStart.y,
          );
          const finalDist =
            customDistance !== null ? customDistance : calculatedDist;
          const angle =
            customAngle !== null
              ? customAngle
              : (Math.atan2(
                  lastMousePos.y - previewStart.y,
                  lastMousePos.x - previewStart.x,
                ) *
                  180) /
                Math.PI;
          const finalAngle = ((angle % 360) + 360) % 360;
          const endPoint = calculatePointFromAngle(finalAngle, finalDist);
          dibujarLinea(previewStart, endPoint, finalDist, CONFIG.COLOR_LINEA);
          startPreview(endPoint);
          console.log("→ Línea creada por Enter y continua otra línea");
        }
      }
    });

    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    input.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    // Ocultar el texto SVG de la preview mientras se edita
    input.classList.add("linea-measure-input");
    input.addEventListener("focus", () => {
      if (previewGroup) {
        const text = previewGroup.querySelector(".linea-texto");
        if (text) text.style.display = "none";
      }
    });
    input.addEventListener("blur", () => {
      if (previewGroup) {
        const text = previewGroup.querySelector(".linea-texto");
        if (text) text.style.display = "";
      }
    });

    // Sólo añadir los inputs (sin etiqueta ni contenedor visible)
    angleWrapper.appendChild(distanceInput);
    angleWrapper.appendChild(angleInputField);
    container.appendChild(angleWrapper);
    const gridArea = document.getElementById("gridArea");
    if (gridArea) {
      // Asegurar que gridArea está posicionado (initSVGLayer ya lo hace)
      gridArea.appendChild(container);
    } else {
      // Fallback a body
      document.body.appendChild(container);
    }

    previewInputContainer = container;
    previewInput = distanceInput;
    angleInput = angleInputField;

    // Ocultar el texto SVG inmediatamente para que no aparezca detrás del input
    if (previewGroup) {
      const text = previewGroup.querySelector(".linea-texto");
      if (text) text.style.display = "none";
    }

    console.log("✓ Inputs de medida y ángulo creados y visibles");
    distanceInput.focus();
    distanceInput.select();
  }

  function updatePreview(point) {
    if (!previewGroup || !previewStart) {
      console.warn("⚠ updatePreview: previewGroup o previewStart no existen");
      return;
    }

    const rawDist = Math.hypot(
      point.x - previewStart.x,
      point.y - previewStart.y,
    );
    const currentAngle =
      (Math.atan2(point.y - previewStart.y, point.x - previewStart.x) * 180) /
      Math.PI;
    const normalizedAngle = ((currentAngle % 360) + 360) % 360;
    const distToUse = customDistance !== null ? customDistance : rawDist;
    const angleToUse = customAngle !== null ? customAngle : normalizedAngle;
    const targetPoint =
      customAngle !== null
        ? calculatePointFromAngle(angleToUse, distToUse)
        : point;

    const pos1 = gridToPixel(previewStart.x, previewStart.y);
    const pos2 = gridToPixel(targetPoint.x, targetPoint.y);

    const hit = previewGroup.querySelector(".linea-hit");
    if (hit) {
      hit.setAttribute("x1", pos1.x);
      hit.setAttribute("y1", pos1.y);
      hit.setAttribute("x2", pos2.x);
      hit.setAttribute("y2", pos2.y);
    }

    const core = previewGroup.querySelector(".linea-core");
    if (core) {
      core.setAttribute("x1", pos1.x);
      core.setAttribute("y1", pos1.y);
      core.setAttribute("x2", pos2.x);
      core.setAttribute("y2", pos2.y);
    }

    const circleStart = previewGroup.querySelector(".linea-punto-start");
    const circleEnd = previewGroup.querySelector(".linea-punto-end");
    if (circleStart) {
      circleStart.setAttribute("cx", pos1.x);
      circleStart.setAttribute("cy", pos1.y);
    }
    if (circleEnd) {
      circleEnd.setAttribute("cx", pos2.x);
      circleEnd.setAttribute("cy", pos2.y);
    }

    previewGroup.classList.toggle(
      "snap-target",
      point.sourceType === "linea-endpoint" ||
        point.sourceType === "pieza-corner",
    );

    const displayDist = distToUse;
    const text = previewGroup.querySelector(".linea-texto");
    if (text) {
      const midX = (pos1.x + pos2.x) / 2;
      const midY = (pos1.y + pos2.y) / 2;
      text.setAttribute("x", midX);
      text.setAttribute("y", midY - 6);
      text.textContent = displayDist.toFixed(2);
    }

    if (previewInputContainer && previewInputContainer.parentNode) {
      const offsetX = 16;
      const offsetY = -10;
      previewInputContainer.style.left = pos2.x + offsetX + "px";
      previewInputContainer.style.top = pos2.y + offsetY + "px";
      previewInputContainer.style.transform = "translate(0, 0)";
    }

    if (previewInput) {
      previewInput.value = displayDist.toFixed(2);
    }
    if (angleInput && !angleFocused && customAngle === null) {
      angleInput.value = normalizedAngle.toFixed(1);
    }
  }

  function removeHoverSnapMarker() {
    if (hoverSnapMarker) {
      hoverSnapMarker.remove();
      hoverSnapMarker = null;
      hoverSnapTarget = null;
    }
  }

  function createHoverSnapMarker() {
    if (!svgGroup) return;
    if (hoverSnapMarker) return hoverSnapMarker;
    const marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    marker.classList.add("linea-hover-snap-marker");
    marker.setAttribute("r", "6");
    marker.setAttribute("fill", "none");
    marker.setAttribute("stroke", "#ff6b00");
    marker.setAttribute("stroke-width", "2");
    marker.setAttribute("pointer-events", "none");
    svgGroup.appendChild(marker);
    hoverSnapMarker = marker;
    return marker;
  }

  function updateHoverSnapMarker(point) {
    if (!point || !hoverSnapMarker) return;
    const pixel = gridToPixel(point.x, point.y);
    hoverSnapMarker.setAttribute("cx", pixel.x);
    hoverSnapMarker.setAttribute("cy", pixel.y);
  }

  function cancelPreview() {
    if (previewGroup) {
      previewGroup.remove();
      previewGroup = null;
    }
    if (previewInputContainer) {
      previewInputContainer.remove();
      previewInputContainer = null;
      previewInput = null;
      angleInput = null;
    }
    removeHoverSnapMarker();
    removeHoverSnapMarker();
    previewStart = null;
    previewMode = false;
    customDistance = null;
    customAngle = null;
    angleFocused = false;
  }

  // ===== CONFIGURAR INTERACCIÓN DE LÍNEA =====
  function setupLineInteraction(lineEl) {
    const hit = lineEl.querySelector(".linea-hit");
    const circles = lineEl.querySelectorAll(".linea-punto");

    // Click para seleccionar
    const onClickLine = (e) => {
      // Solo permitir si la herramienta de selección está activa
      if (
        !window.ToggleSelection ||
        typeof window.ToggleSelection.isActive !== "function" ||
        !window.ToggleSelection.isActive()
      ) {
        e.stopPropagation();
        return;
      }
      e.stopPropagation();

      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      const isSelected = lineEl.classList.contains("selected");

      if (isSelected && isMultiSelect) {
        deselectLine(lineEl);
      } else if (!isMultiSelect) {
        clearSelection();
        selectLine(lineEl, false);
      } else {
        selectLine(lineEl, false);
      }
    };

    // Mousedown para drag de línea completa
    const onMouseDown = (e) => {
      // Solo permitir si la herramienta de selección está activa
      if (
        !window.ToggleSelection ||
        typeof window.ToggleSelection.isActive !== "function" ||
        !window.ToggleSelection.isActive()
      ) {
        return;
      }
      if (e.button !== 0) return;
      e.stopPropagation();

      // Seleccionar si no está seleccionada
      if (!lineEl.classList.contains("selected")) {
        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
        if (!isMulti) clearSelection();
        selectLine(lineEl, false);
      }

      // Iniciar drag
      draggingLine = lineEl;
      // Marcar que el arrastre se inició sobre una línea
      try {
        window._dragOrigin = "line";
      } catch (e) {}
      dragStart = pixelToGrid(e.clientX, e.clientY);
      dragInitial = {
        p1x: parseFloat(lineEl.getAttribute("data-p1x")),
        p1y: parseFloat(lineEl.getAttribute("data-p1y")),
        p2x: parseFloat(lineEl.getAttribute("data-p2x")),
        p2y: parseFloat(lineEl.getAttribute("data-p2y")),
      };
    };

    // Doble-clic para editar longitud
    const onDblClick = (e) => {
      e.stopPropagation();
      console.log("Doble-clic en línea - edición de longitud");
    };

    // Arrastrar endpoints
    const setupEndpointDrag = (circle, index) => {
      circle.style.cursor = "pointer";
      circle.addEventListener("mousedown", (e) => {
        // Solo permitir si la herramienta de selección está activa
        if (
          !window.ToggleSelection ||
          typeof window.ToggleSelection.isActive !== "function" ||
          !window.ToggleSelection.isActive()
        ) {
          return;
        }
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        // Seleccionar la línea
        if (!lineEl.classList.contains("selected")) {
          clearSelection();
          selectLine(lineEl, false);
        }

        // Marcar que el arrastre se inició sobre una línea (endpoint)
        try {
          window._dragOrigin = "line";
        } catch (e) {}

        draggingEndpoint = lineEl;
        draggedEndpointIndex = index;
        dragStart = pixelToGrid(e.clientX, e.clientY);
        dragInitial = {
          p1x: parseFloat(lineEl.getAttribute("data-p1x")),
          p1y: parseFloat(lineEl.getAttribute("data-p1y")),
          p2x: parseFloat(lineEl.getAttribute("data-p2x")),
          p2y: parseFloat(lineEl.getAttribute("data-p2y")),
        };

        console.log("→ Arrastrando endpoint", index === 0 ? "p1" : "p2");
      });
    };

    // Configurar endpoints como draggables
    if (circles[0]) setupEndpointDrag(circles[0], 0);
    if (circles[1]) setupEndpointDrag(circles[1], 1);

    if (hit) {
      hit.addEventListener("click", onClickLine);
      hit.addEventListener("mousedown", onMouseDown);
      hit.addEventListener("dblclick", onDblClick);
    } else {
      lineEl.addEventListener("click", onClickLine);
      lineEl.addEventListener("mousedown", onMouseDown);
      lineEl.addEventListener("dblclick", onDblClick);
    }
  }

  // ===== MANEJAR EVENTOS DE CREACIÓN =====
  function handleCrearLineaClick(gridPoint) {
    if (!activo) return;

    console.log("✓ handleCrearLineaClick llamado con:", gridPoint);

    // Preferir el target de hover si existe, para usar el mismo endpoint visual
    const snapTarget =
      window.ModoPegar && hoverSnapTarget ? hoverSnapTarget : null;
    const snapped =
      snapTarget ||
      (window.ModoPegar
        ? findNearbyCorner(gridPoint.x, gridPoint.y, 20)
        : null) ||
      gridPoint;

    if (!previewStart) {
      // Primer click: iniciar preview
      startPreview(snapped);
      console.log("→ Primer click, preview iniciado en", snapped);
      return;
    }

    // Segundo click: crear línea
    const calculatedDist = Math.hypot(
      snapped.x - previewStart.x,
      snapped.y - previewStart.y,
    );
    const finalDist = customDistance !== null ? customDistance : calculatedDist;
    const finalAngle =
      customAngle !== null
        ? customAngle
        : (Math.atan2(snapped.y - previewStart.y, snapped.x - previewStart.x) *
            180) /
          Math.PI;
    const normalizedFinalAngle = ((finalAngle % 360) + 360) % 360;
    const endPoint = calculatePointFromAngle(normalizedFinalAngle, finalDist);
    dibujarLinea(previewStart, endPoint, finalDist, CONFIG.COLOR_LINEA);

    // Continuar creando desde el extremo final de la línea nueva
    startPreview(endPoint);
    console.log("→ Línea creada y continua otra línea desde el extremo final");
  }

  // ===== INICIALIZACIÓN =====

  // Registrar mousemove GLOBALMENTE
  document.addEventListener("mousemove", (e) => {
    // Drag de endpoint
    if (draggingEndpoint && dragStart && dragInitial) {
      const current = pixelToGrid(e.clientX, e.clientY);
      const dx = current.x - dragStart.x;
      const dy = current.y - dragStart.y;

      if (draggedEndpointIndex === 0) {
        // Arrastrando p1
        let newP1x = dragInitial.p1x + dx;
        let newP1y = dragInitial.p1y + dy;

        // Intentar snap con tolerancia muy permisiva para líneas, excluyendo esta línea
        const snapped = window.ModoPegar
          ? findNearbyCorner(newP1x, newP1y, undefined, draggingEndpoint.id)
          : null;
        if (snapped) {
          console.log("✅ P1 snapped:", snapped);
          newP1x = snapped.x;
          newP1y = snapped.y;
        }

        draggingEndpoint.setAttribute("data-p1x", newP1x);
        draggingEndpoint.setAttribute("data-p1y", newP1y);
      } else {
        // Arrastrando p2
        let newP2x = dragInitial.p2x + dx;
        let newP2y = dragInitial.p2y + dy;

        // Intentar snap con tolerancia muy permisiva para líneas, excluyendo esta línea
        const snapped = window.ModoPegar
          ? findNearbyCorner(newP2x, newP2y, undefined, draggingEndpoint.id)
          : null;
        if (snapped) {
          console.log("✅ P2 snapped:", snapped);
          newP2x = snapped.x;
          newP2y = snapped.y;
        }

        draggingEndpoint.setAttribute("data-p2x", newP2x);
        draggingEndpoint.setAttribute("data-p2y", newP2y);
      }

      // Actualizar distancia
      const p1x = parseFloat(draggingEndpoint.getAttribute("data-p1x"));
      const p1y = parseFloat(draggingEndpoint.getAttribute("data-p1y"));
      const p2x = parseFloat(draggingEndpoint.getAttribute("data-p2x"));
      const p2y = parseFloat(draggingEndpoint.getAttribute("data-p2y"));
      const newDist = Math.hypot(p2x - p1x, p2y - p1y);
      draggingEndpoint.setAttribute("data-dist", newDist.toFixed(2));

      updateLinePositions(draggingEndpoint);
      return;
    }

    // Drag de línea completa
    if (draggingLine && dragStart && dragInitial) {
      const current = pixelToGrid(e.clientX, e.clientY);
      const dx = current.x - dragStart.x;
      const dy = current.y - dragStart.y;
      // Calcular nuevos extremos tras la traslación
      let newP1x = dragInitial.p1x + dx;
      let newP1y = dragInitial.p1y + dy;
      let newP2x = dragInitial.p2x + dx;
      let newP2y = dragInitial.p2y + dy;

      // Intentar snap para la línea completa: si algún extremo está cerca,
      // trasladar toda la línea por el delta necesario para que ese extremo
      // encaje, preservando la longitud de la línea.
      try {
        const tol = 30;
        const s1 = window.ModoPegar
          ? findNearbyCorner(newP1x, newP1y, tol, draggingLine.id)
          : null;
        const s2 = window.ModoPegar
          ? findNearbyCorner(newP2x, newP2y, tol, draggingLine.id)
          : null;

        if (s1 && !s2) {
          const dxs = s1.x - newP1x;
          const dys = s1.y - newP1y;
          newP1x += dxs;
          newP1y += dys;
          newP2x += dxs;
          newP2y += dys;
          console.log("✅ Line drag snapped by P1 delta:", { dxs, dys });
        } else if (s2 && !s1) {
          const dxs = s2.x - newP2x;
          const dys = s2.y - newP2y;
          newP1x += dxs;
          newP1y += dys;
          newP2x += dxs;
          newP2y += dys;
          console.log("✅ Line drag snapped by P2 delta:", { dxs, dys });
        } else if (s1 && s2) {
          const d1 = Math.hypot(s1.x - newP1x, s1.y - newP1y);
          const d2 = Math.hypot(s2.x - newP2x, s2.y - newP2y);
          if (d1 <= d2) {
            const dxs = s1.x - newP1x;
            const dys = s1.y - newP1y;
            newP1x += dxs;
            newP1y += dys;
            newP2x += dxs;
            newP2y += dys;
            console.log("✅ Line drag snapped by P1 (both) delta:", {
              dxs,
              dys,
            });
          } else {
            const dxs = s2.x - newP2x;
            const dys = s2.y - newP2y;
            newP1x += dxs;
            newP1y += dys;
            newP2x += dxs;
            newP2y += dys;
            console.log("✅ Line drag snapped by P2 (both) delta:", {
              dxs,
              dys,
            });
          }
        }
      } catch (ex) {
        /* ignore */
      }

      draggingLine.setAttribute("data-p1x", newP1x);
      draggingLine.setAttribute("data-p1y", newP1y);
      draggingLine.setAttribute("data-p2x", newP2x);
      draggingLine.setAttribute("data-p2y", newP2y);

      updateLinePositions(draggingLine);
      return;
    }

    // Preview en tiempo real
    if (previewMode && previewStart && previewGroup) {
      const pos = pixelToGrid(e.clientX, e.clientY);
      const snapped =
        (window.ModoPegar ? findNearbyCorner(pos.x, pos.y) : null) || pos;
      lastMousePos = snapped;
      updatePreview(snapped);
      return;
    }
  });

  // Registrar right-click/panning usando pointer events para soportar pointerlock
  document.addEventListener("pointerdown", (e) => {
    if (e.button === 2 && previewMode && activo) {
      rightClickStart = { x: e.clientX || 0, y: e.clientY || 0, acc: 0 };
      rightClickDragging = false;
      console.log(
        "→ Right pointerdown detectado, esperando movimiento (pointer) para decidir...",
      );
      return;
    }
  });

  // Usar pointermove (o pointerlock pointermove) y movementX/movementY para detectar arrastre
  document.addEventListener("pointermove", function trackRightPointerDrag(e) {
    if (!rightClickStart || !previewMode || !activo) return;

    const mx = typeof e.movementX === "number" ? e.movementX : 0;
    const my = typeof e.movementY === "number" ? e.movementY : 0;
    rightClickStart.acc += Math.hypot(mx, my);

    if (
      !rightClickDragging &&
      rightClickStart.acc > CONFIG.CANCEL_DRAG_THRESHOLD
    ) {
      rightClickDragging = true;
      console.log(
        "→ Arrastre detectado (pointer) acumulado " +
          rightClickStart.acc.toFixed(1) +
          "px — permitir panning",
      );
    }
  });

  // pointerup para cancelar preview si no hubo arrastre
  document.addEventListener("pointerup", (e) => {
    if (
      rightClickStart &&
      previewMode &&
      activo &&
      !rightClickDragging &&
      e.button === 2
    ) {
      cancelPreview();
      if (
        window.CrearLinea &&
        typeof window.CrearLinea.desactivar === "function"
      ) {
        window.CrearLinea.desactivar();
      }
      if (
        window.ToggleSelection &&
        typeof window.ToggleSelection.activar === "function"
      ) {
        window.ToggleSelection.activar();
      }
      console.log(
        "✓ Preview cancelado por right-click sin arrastre (pointer) y cambio a selección",
      );
    }
    rightClickStart = null;
    rightClickDragging = false;
  });

  // Registrar keydown GLOBALMENTE
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && previewMode) {
      cancelPreview();
      return;
    }

    // Delete/Backspace para eliminar seleccionadas
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selectedLineas.size > 0
    ) {
      e.preventDefault();
      deleteSelectedLines();
      return;
    }
  });

  // Registrar mouseup GLOBALMENTE
  document.addEventListener("mouseup", () => {
    if (draggingEndpoint) {
      draggingEndpoint = null;
      draggedEndpointIndex = null;
      console.log("✓ Endpoint soltado");
    }
    draggingLine = null;
    dragStart = null;
    dragInitial = null;
    try {
      delete window._dragOrigin;
    } catch (e) {}
  });

  function createClickOverlay() {
    if (clickOverlay) return;
    const gridArea = document.getElementById("gridArea");
    if (!gridArea) return;

    clickOverlay = document.createElement("div");
    clickOverlay.id = "crear-linea-overlay";
    clickOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      z-index: 59;
      display: none;
      cursor: crosshair;
      background: transparent !important;
      background-color: transparent !important;
    `;

    // Event listener para clicks en el overlay
    clickOverlay.addEventListener("click", (e) => {
      if (!activo) return;

      // Permitir clicks en piezas
      if (e.target.closest(".pieza-dibujada")) {
        return;
      }

      // No procesar click si estamos en marco de selección
      if (selectionBoxDiv) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      const pos = pixelToGrid(e.clientX, e.clientY);
      handleCrearLineaClick(pos);
    });

    clickOverlay.addEventListener("mousemove", (e) => {
      if (!activo) {
        removeHoverSnapMarker();
        return;
      }

      const pos = pixelToGrid(e.clientX, e.clientY);
      const snap = window.ModoPegar ? findNearbyCorner(pos.x, pos.y, 20) : null;

      if (previewStart) {
        if (snap && snap.sourceType === "linea-endpoint") {
          createHoverSnapMarker();
          updateHoverSnapMarker(snap);
          hoverSnapTarget = snap;
        } else {
          removeHoverSnapMarker();
        }

        if (selectionBoxStart && selectionBoxDiv) {
          updateSelectionBox({ x: e.clientX, y: e.clientY });
        }
        return;
      }

      if (snap && snap.sourceType === "linea-endpoint") {
        createHoverSnapMarker();
        updateHoverSnapMarker(snap);
        hoverSnapTarget = snap;
      } else {
        removeHoverSnapMarker();
      }

      if (selectionBoxStart && selectionBoxDiv) {
        updateSelectionBox({ x: e.clientX, y: e.clientY });
      }
    });

    // Eventos para marco de selección
    clickOverlay.addEventListener("mousedown", (e) => {
      if (!activo) return;
      if (
        e.target.closest(".pieza-dibujada") ||
        e.target.closest(".linea-creada")
      ) {
        return;
      }

      // No iniciar marco si estamos en preview mode
      if (previewMode) return;

      // Iniciar marco de selección
      startSelectionBox({ x: e.clientX, y: e.clientY });
    });

    clickOverlay.addEventListener("mousemove", (e) => {
      if (selectionBoxStart && selectionBoxDiv) {
        updateSelectionBox({ x: e.clientX, y: e.clientY });
      }
    });

    clickOverlay.addEventListener("mouseup", (e) => {
      if (selectionBoxStart && selectionBoxDiv) {
        finishSelectionBox({ x: e.clientX, y: e.clientY });
      }
    });

    gridArea.appendChild(clickOverlay);
    console.log("✓ Overlay creado y añadido al DOM");
  }

  function init() {
    // Esperar a que gridArea exista
    const checkAndInit = () => {
      const gridArea = document.getElementById("gridArea");
      if (!gridArea) {
        setTimeout(checkAndInit, 100);
        return;
      }

      ensureStyles();
      initSVGLayer();
      createClickOverlay();

      // Recalcular posiciones en cada frame (para pan/zoom)
      (function recalc() {
        lineas.forEach(updateLinePositions);
        requestAnimationFrame(recalc);
      })();

      // Marcar como inicializado
      inicializado = true;
      console.log("✓ Sistema de líneas inicializado correctamente");
    };

    checkAndInit();
  }

  // ===== API PÚBLICA =====
  window.CrearLinea = {
    activar() {
      if (!inicializado) {
        console.warn("⚠ Sistema aún no está inicializado, reintentando...");
        setTimeout(() => window.CrearLinea.activar(), 200);
        return;
      }

      activo = true;
      // Asegurar que el overlay existe y está visible
      if (!clickOverlay) createClickOverlay();
      if (clickOverlay) clickOverlay.style.display = "block";

      const btn = document.getElementById("tool-crear-linea");
      if (btn) btn.classList.add("activo");
      // Desactivar la herramienta de selección si existe
      try {
        if (
          window.ToggleSelection &&
          typeof window.ToggleSelection.desactivar === "function"
        )
          window.ToggleSelection.desactivar();
      } catch (e) {}
      console.log("✓ CrearLinea ACTIVADO - overlay visible");
    },

    desactivar() {
      if (!inicializado) return;

      activo = false;
      previewMode = false;
      cancelPreview();
      // Ocultar overlay
      if (clickOverlay) clickOverlay.style.display = "none";

      const btn = document.getElementById("tool-crear-linea");
      if (btn) btn.classList.remove("activo");
      console.log("✓ CrearLinea DESACTIVADO - overlay oculto");
    },

    listar() {
      return lineas.slice();
    },

    limpiarSeleccion() {
      clearSelection();
    },

    eliminarSeleccion() {
      deleteSelectedLines();
    },
    seleccionarElemento(el, agregar = true) {
      try {
        if (!el) return;
        const lineEl = el instanceof Element ? el : document.querySelector(el);
        if (!lineEl) return;
        // selectLine(lineEl, clearOthers)
        selectLine(lineEl, !agregar);
      } catch (e) {
        /* no-op */
      }
    },
    deseleccionarElemento(el) {
      try {
        if (!el) return;
        const lineEl = el instanceof Element ? el : document.querySelector(el);
        if (!lineEl) return;
        deselectLine(lineEl);
      } catch (e) {
        /* no-op */
      }
    },
  };

  // Alias para compatibilidad con otros scripts
  window.ToggleCrearLinea = window.CrearLinea;

  // ===== EVENTO DEL BOTÓN =====
  (function setupButton() {
    const setupButtonListener = () => {
      const btn = document.getElementById("tool-crear-linea");
      if (!btn) {
        // Reintentar en 100ms
        setTimeout(setupButtonListener, 100);
        return;
      }

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activo) {
          window.CrearLinea.desactivar();
        } else {
          window.CrearLinea.activar();
        }
      });

      console.log('✓ Botón "Crear Línea" vinculado correctamente');
    };

    setupButtonListener();
  })();

  // Inicializar cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
