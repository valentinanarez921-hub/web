// seleccionar.js
(function () {
  const gridArea = document.getElementById("gridArea");
  const toolMouse = document.getElementById("tool-mouse");

  if (!gridArea || !toolMouse) {
    console.warn("herramientas_seleccion: faltan elementos del DOM");
    return;
  }

  let seleccion = new Set();
  let seleccionActiva = false;

  let marco = null;
  let startX = 0,
    startY = 0;
  let pointerX = 0,
    pointerY = 0;
  let isDraggingMarco = false;

  let arrastrandoPieza = false;
  let piezaInicial = null;

  const clipboard = {
    items: [],
    copiedAt: 0,
  };

  function isEditableTarget(target) {
    if (!target) return false;
    const tag = target.tagName?.toLowerCase();
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      target.isContentEditable
    );
  }

  function generatePieceId() {
    return (
      "pieza_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  function clonePieceForClipboard(pieza) {
    const clone = pieza.cloneNode(true);
    clone.removeAttribute("id");
    clone.classList.remove("pieza-seleccionada");
    clone.dataset.visible = clone.dataset.visible || "true";
    return clone;
  }

  function selectPiezas(piezas) {
    limpiarSeleccion();
    piezas.forEach((pieza) => {
      pieza.classList.add("pieza-seleccionada");
      seleccion.add(pieza);
    });
  }

  function copySelectionToClipboard() {
    if (seleccion.size === 0) return;
    clipboard.items = Array.from(seleccion).map(clonePieceForClipboard);
    clipboard.copiedAt = Date.now();
    console.log(`Seleccion copiada: ${clipboard.items.length} piezas`);
  }

  function pasteClipboard() {
    if (!clipboard.items.length) return;

    if (window.Seleccion && typeof window.Seleccion.limpiar === "function") {
      window.Seleccion.limpiar();
    }

    const existing = Array.from(gridArea.querySelectorAll(".pieza-dibujada"));
    const maxZ = existing.reduce(
      (max, p) => Math.max(max, parseInt(p.style.zIndex) || 0),
      0,
    );

    const newPieces = clipboard.items.map((item, index) => {
      const clone = item.cloneNode(true);
      clone.id = generatePieceId();
      clone.classList.remove("pieza-seleccionada");
      clone.dataset.visible = clone.dataset.visible || "true";
      clone.style.position = "absolute";
      clone.style.zIndex = String(maxZ + index + 1);
      gridArea.appendChild(clone);
      return clone;
    });

    if (!seleccionActiva) {
      activarSeleccion();
    }
    selectPiezas(newPieces);

    if (window.Cuadricula?.actualizarPiezas) {
      window.Cuadricula.actualizarPiezas();
    }
    if (
      window.Cuadricula &&
      typeof window.Cuadricula.normalizeZIndices === "function"
    ) {
      window.Cuadricula.normalizeZIndices();
    }

    window.dispatchEvent(
      new CustomEvent("clipboard-paste", {
        detail: { count: newPieces.length },
      }),
    );

    return newPieces;
  }

  function duplicateSelection() {
    if (seleccion.size === 0) return;
    copySelectionToClipboard();
    pasteClipboard();
  }

  function applyPieceTransform(pieza) {
    const rotation = parseFloat(pieza.dataset.rotation) || 0;
    const mirror = pieza.dataset.mirror === "left" ? -1 : 1;
    pieza.style.transform = `scaleX(${mirror}) rotate(${rotation}deg)`;
  }

  function reflectSelection(direction) {
    const selected = Array.from(seleccion);
    if (selected.length === 0) return;
    selected.forEach((pieza) => {
      pieza.dataset.mirror = direction;
      applyPieceTransform(pieza);
    });
    if (window.Cuadricula?.actualizarPiezas) {
      window.Cuadricula.actualizarPiezas();
    }
  }

  // ------------------------
  // HELPERS
  // ------------------------
  function getScale() {
    return window.Grid?.scale() || 1;
  }
  function getOffset() {
    return window.Grid?.offset() || { x: 0, y: 0 };
  }

  function screenToGrid(clientX, clientY) {
    const s = getScale();
    const o = getOffset();
    return {
      gx: (clientX - o.x) / s,
      gy: (clientY - o.y) / s,
    };
  }

  function gridToScreen(gx, gy) {
    const s = getScale();
    const o = getOffset();
    const rect = gridArea.getBoundingClientRect();
    return {
      x: rect.left + gx * s + o.x,
      y: rect.top + gy * s + o.y,
    };
  }

  function activarSeleccion() {
    seleccionActiva = true;
    toolMouse.classList.add("activo");
  }

  function desactivarSeleccion() {
    seleccionActiva = false;
    limpiarSeleccion();
    toolMouse.classList.remove("activo");
  }

  function limpiarSeleccion() {
    seleccion.forEach((p) => p.classList.remove("pieza-seleccionada"));
    seleccion.clear();
  }

  function seleccionarPieza(pieza, agregar = false) {
    if (!agregar) limpiarSeleccion();
    pieza.classList.add("pieza-seleccionada");
    seleccion.add(pieza);
  }

  // ------------------------
  // MOUSE DOWN
  // ------------------------
  gridArea.addEventListener("mousedown", (e) => {
    const pieza = e.target.closest(".pieza-dibujada");

    if (!seleccionActiva || e.button !== 0) return;

    // Si estamos redimensionando texto, no hacer nada
    if (window._textResizing) return;

    // ---- ARRASTRAR PIEZA ----
    if (pieza) {
      // No permitir interacción con piezas ocultas
      if (pieza.dataset.visible === "false") {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Si el movimiento está bloqueado, solo seleccionar sin arrastrar
      if (window._bloquearMovimientoPiezas) {
        if (!seleccion.has(pieza)) {
          seleccionarPieza(pieza, e.shiftKey);
        }
        return;
      }

      arrastrandoPieza = true;
      piezaInicial = pieza;

      if (!seleccion.has(pieza)) {
        seleccionarPieza(pieza, e.shiftKey);
      }

      // Guardar posiciones iniciales en coordenadas de grid
      seleccion.forEach((p) => {
        p._gridStartX = parseFloat(p.dataset.x) || 0;
        p._gridStartY = parseFloat(p.dataset.y) || 0;
      });

      return;
    }

    // ---- MARCO DE SELECCIÓN ----
    startX = e.clientX;
    startY = e.clientY;
    pointerX = startX;
    pointerY = startY;
    isDraggingMarco = true;

    if (!e.shiftKey) {
      limpiarSeleccion();
      try {
        if (
          window.CrearLinea &&
          typeof window.CrearLinea.limpiarSeleccion === "function"
        )
          window.CrearLinea.limpiarSeleccion();
      } catch (ex) {}
    }

    if (marco) {
      marco.remove();
      marco = null;
    }

    marco = document.createElement("div");
    marco.className = "marco-seleccion";
    document.body.appendChild(marco);

    marco.style.left = startX + "px";
    marco.style.top = startY + "px";

    // ---- BLOQUEAR CURSOR REAL ----
    gridArea.requestPointerLock();
  });

  // ------------------------
  // MOUSE MOVE
  // ------------------------
  document.addEventListener("mousemove", (e) => {
    if (!arrastrandoPieza && !isDraggingMarco) return;

    const movementX = e.movementX;
    const movementY = e.movementY;

    // ---- ARRASTRAR PIEZAS ----
    if (arrastrandoPieza) {
      const scale = getScale();
      const offset = getOffset();
      const dx = movementX / scale;
      const dy = movementY / scale;

      seleccion.forEach((p) => {
        // Actualizar coordenadas de grid (no píxeles)
        let currentX = parseFloat(p.dataset.x) || 0;
        let currentY = parseFloat(p.dataset.y) || 0;

        currentX += dx;
        currentY += dy;

        p.dataset.x = currentX;
        p.dataset.y = currentY;

        // APLICAR SNAP A LÍNEAS Y PIEZAS (con coordenadas de grid)
        if (window.PegarAotrasPiezas) {
          window.PegarAotrasPiezas(p, e);
        }
      });

      if (window.Cuadricula?.actualizarPiezas)
        window.Cuadricula.actualizarPiezas();

      return;
    }

    // ---- MARCO ----
    if (isDraggingMarco && marco) {
      pointerX += movementX;
      pointerY += movementY;

      const gridRect = gridArea.getBoundingClientRect();

      // BLOQUEAR DENTRO DEL GRID
      pointerX = Math.max(gridRect.left, Math.min(pointerX, gridRect.right));
      pointerY = Math.max(gridRect.top, Math.min(pointerY, gridRect.bottom));
      startX = Math.max(gridRect.left, Math.min(startX, gridRect.right));
      startY = Math.max(gridRect.top, Math.min(startY, gridRect.bottom));

      const x = Math.min(pointerX, startX);
      const y = Math.min(pointerY, startY);
      const w = Math.abs(pointerX - startX);
      const h = Math.abs(pointerY - startY);

      marco.style.left = x + "px";
      marco.style.top = y + "px";
      marco.style.width = w + "px";
      marco.style.height = h + "px";

      const rect = marco.getBoundingClientRect();

      gridArea.querySelectorAll(".pieza-dibujada").forEach((p) => {
        const pRect = p.getBoundingClientRect();
        const dentro =
          pRect.left < rect.right &&
          pRect.right > rect.left &&
          pRect.top < rect.bottom &&
          pRect.bottom > rect.top;

        if (dentro) {
          p.classList.add("pieza-seleccionada");
          seleccion.add(p);
        } else {
          p.classList.remove("pieza-seleccionada");
          seleccion.delete(p);
        }
      });

      // Seleccionar lineas (SVG) que intersecten el marco usando intersección geométrica
      try {
        const lines = gridArea.querySelectorAll(".linea-creada");
        if (lines && lines.length && window.CrearLinea) {
          // helper: segment intersection tests
          function _onSeg(a, b, c) {
            return Math.min(a, b) <= c && c <= Math.max(a, b);
          }
          function _orient(ax, ay, bx, by, cx, cy) {
            return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
          }
          function _segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
            const o1 = _orient(x1, y1, x2, y2, x3, y3);
            const o2 = _orient(x1, y1, x2, y2, x4, y4);
            const o3 = _orient(x3, y3, x4, y4, x1, y1);
            const o4 = _orient(x3, y3, x4, y4, x2, y2);
            if (o1 === 0 && _onSeg(x1, x2, x3) && _onSeg(y1, y2, y3))
              return true;
            if (o2 === 0 && _onSeg(x1, x2, x4) && _onSeg(y1, y2, y4))
              return true;
            if (o3 === 0 && _onSeg(x3, x4, x1) && _onSeg(y3, y4, y1))
              return true;
            if (o4 === 0 && _onSeg(x3, x4, x2) && _onSeg(y3, y4, y2))
              return true;
            return o1 * o2 < 0 && o3 * o4 < 0;
          }
          function segmentIntersectsRect(x1, y1, x2, y2, rect, tolOverride) {
            // Primero: intersección estricta (sin tolerancia)
            // endpoints inside
            if (
              x1 >= rect.left &&
              x1 <= rect.right &&
              y1 >= rect.top &&
              y1 <= rect.bottom
            )
              return true;
            if (
              x2 >= rect.left &&
              x2 <= rect.right &&
              y2 >= rect.top &&
              y2 <= rect.bottom
            )
              return true;
            // rect edges
            if (
              _segIntersect(
                x1,
                y1,
                x2,
                y2,
                rect.left,
                rect.top,
                rect.right,
                rect.top,
              )
            )
              return true;
            if (
              _segIntersect(
                x1,
                y1,
                x2,
                y2,
                rect.right,
                rect.top,
                rect.right,
                rect.bottom,
              )
            )
              return true;
            if (
              _segIntersect(
                x1,
                y1,
                x2,
                y2,
                rect.left,
                rect.bottom,
                rect.right,
                rect.bottom,
              )
            )
              return true;
            if (
              _segIntersect(
                x1,
                y1,
                x2,
                y2,
                rect.left,
                rect.top,
                rect.left,
                rect.bottom,
              )
            )
              return true;

            // Si no hay intersección estricta, comprobar distancia mínima entre el segmento y el rect
            const tol = typeof tolOverride === "number" ? tolOverride : 6; // px, tolerancia alrededor de la línea (no del rect)

            function pointToRectDist(px, py, rect) {
              const dx = Math.max(rect.left - px, 0, px - rect.right);
              const dy = Math.max(rect.top - py, 0, py - rect.bottom);
              return Math.hypot(dx, dy);
            }
            function pointToSegDist(px, py, x1, y1, x2, y2) {
              const vx = x2 - x1;
              const vy = y2 - y1;
              const wx = px - x1;
              const wy = py - y1;
              const c1 = vx * wx + vy * wy;
              const c2 = vx * vx + vy * vy;
              let t = 0;
              if (c2 > 0) t = Math.max(0, Math.min(1, c1 / c2));
              const projx = x1 + t * vx;
              const projy = y1 + t * vy;
              return Math.hypot(px - projx, py - projy);
            }

            // comprobar distancia de los extremos al rect
            if (pointToRectDist(x1, y1, rect) <= tol) return true;
            if (pointToRectDist(x2, y2, rect) <= tol) return true;
            // comprobar esquinas del rect hacia el segmento
            const corners = [
              { x: rect.left, y: rect.top },
              { x: rect.right, y: rect.top },
              { x: rect.right, y: rect.bottom },
              { x: rect.left, y: rect.bottom },
            ];
            for (let i = 0; i < corners.length; i++) {
              const c = corners[i];
              if (pointToSegDist(c.x, c.y, x1, y1, x2, y2) <= tol) return true;
            }

            return false;
          }

          lines.forEach((l) => {
            try {
              let intersects = false;
              // 1) Intentar usar coordenadas en grid almacenadas en el grupo (data-p1x, data-p1y, etc.)
              const p1gx = parseFloat(
                l.getAttribute && l.getAttribute("data-p1x"),
              );
              const p1gy = parseFloat(
                l.getAttribute && l.getAttribute("data-p1y"),
              );
              const p2gx = parseFloat(
                l.getAttribute && l.getAttribute("data-p2x"),
              );
              const p2gy = parseFloat(
                l.getAttribute && l.getAttribute("data-p2y"),
              );
              let usedCoords = false;
              if (
                !isNaN(p1gx) &&
                !isNaN(p1gy) &&
                !isNaN(p2gx) &&
                !isNaN(p2gy)
              ) {
                try {
                  const p1 = gridToScreen(p1gx, p1gy);
                  const p2 = gridToScreen(p2gx, p2gy);
                  var x1 = p1.x,
                    y1 = p1.y,
                    x2 = p2.x,
                    y2 = p2.y;
                  usedCoords = true;
                } catch (e) {
                  usedCoords = false;
                }
              }

              // 2) Fallback: leer atributos x1,y1,x2,y2 del elemento SVG (.linea-core)
              if (!usedCoords) {
                const lineEl =
                  l.querySelector &&
                  (l.querySelector(".linea-core") || l.querySelector("line"));
                if (lineEl) {
                  const tx1 = parseFloat(lineEl.getAttribute("x1"));
                  const ty1 = parseFloat(lineEl.getAttribute("y1"));
                  const tx2 = parseFloat(lineEl.getAttribute("x2"));
                  const ty2 = parseFloat(lineEl.getAttribute("y2"));
                  if (
                    isFinite(tx1) &&
                    isFinite(ty1) &&
                    isFinite(tx2) &&
                    isFinite(ty2)
                  ) {
                    // Si el elemento pertenece a un SVG, convertir punto SVG -> pantalla usando getScreenCTM
                    const svg =
                      lineEl.ownerSVGElement ||
                      (lineEl.closest && lineEl.closest("svg"));
                    if (
                      svg &&
                      typeof svg.createSVGPoint === "function" &&
                      svg.getScreenCTM
                    ) {
                      try {
                        const p1 = svg.createSVGPoint();
                        p1.x = tx1;
                        p1.y = ty1;
                        const sp1 = p1.matrixTransform(svg.getScreenCTM());
                        const p2 = svg.createSVGPoint();
                        p2.x = tx2;
                        p2.y = ty2;
                        const sp2 = p2.matrixTransform(svg.getScreenCTM());
                        x1 = sp1.x;
                        y1 = sp1.y;
                        x2 = sp2.x;
                        y2 = sp2.y;
                        usedCoords = true;
                      } catch (e) {
                        x1 = tx1;
                        y1 = ty1;
                        x2 = tx2;
                        y2 = ty2;
                        usedCoords = true;
                      }
                    } else {
                      x1 = tx1;
                      y1 = ty1;
                      x2 = tx2;
                      y2 = ty2;
                      usedCoords = true;
                    }
                  }
                }
              }

              if (usedCoords) {
                // Calcular tolerancia basada en la 'hit' line si existe (usamos mitad del stroke-width como tolerancia)
                let tol = 6;
                try {
                  const hit = l.querySelector && l.querySelector(".linea-hit");
                  if (hit) {
                    let sw = parseFloat(
                      hit.getAttribute && hit.getAttribute("stroke-width"),
                    );
                    if (!isFinite(sw)) {
                      try {
                        sw = parseFloat(
                          window.getComputedStyle(hit).strokeWidth,
                        );
                      } catch (e) {}
                    }
                    if (isFinite(sw)) tol = Math.max(3, sw / 2);
                  }
                } catch (e) {}
                intersects = segmentIntersectsRect(x1, y1, x2, y2, rect, tol);
              }
              // fallback: group bbox if line coords unavailable
              // No fallback por bbox: usar exclusivamente la intersección geométrica y la tolerancia alrededor de la traza
              // (el uso de getBoundingClientRect causaba selecciones cuando el marco tocaba áreas vacías del SVG)

              if (intersects) {
                try {
                  window.CrearLinea.seleccionarElemento(l, true);
                } catch (ex) {}
              } else {
                try {
                  window.CrearLinea.deseleccionarElemento(l);
                } catch (ex) {}
              }
            } catch (ex) {}
          });
        }
      } catch (ex) {
        console.warn("seleccionar marco: error al procesar lineas", ex);
      }
    }
  });

  // ------------------------
  // MOUSE UP
  // ------------------------
  document.addEventListener("mouseup", () => {
    arrastrandoPieza = false;
    isDraggingMarco = false;

    if (marco) {
      marco.remove();
      marco = null;
    }

    // SALIR DE POINTER LOCK
    if (document.pointerLockElement === gridArea) {
      document.exitPointerLock();
    }
  });

  // ------------------------
  // ESC POINTER LOCK
  // ------------------------
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== gridArea) {
      isDraggingMarco = false;
    }
  });

  // ------------------------
  // BOTÓN SELECCIÓN
  // ------------------------
  toolMouse.addEventListener("click", () => {
    if (seleccionActiva) desactivarSeleccion();
    else activarSeleccion();
  });

  const toolDuplicate = document.getElementById("tool-duplicate");
  const toolMirrorLeft = document.getElementById("tool-mirror-left");
  const toolMirrorRight = document.getElementById("tool-mirror-right");

  if (toolDuplicate) {
    toolDuplicate.addEventListener("click", (e) => {
      e.stopPropagation();
      duplicateSelection();
    });
  }

  if (toolMirrorLeft) {
    toolMirrorLeft.addEventListener("click", (e) => {
      e.stopPropagation();
      reflectSelection("left");
    });
  }

  if (toolMirrorRight) {
    toolMirrorRight.addEventListener("click", (e) => {
      e.stopPropagation();
      reflectSelection("right");
    });
  }

  document.addEventListener("keydown", (e) => {
    if (isEditableTarget(e.target)) return;
    if (!(e.ctrlKey || e.metaKey)) return;

    const key = e.key.toLowerCase();
    if (key === "c") {
      copySelectionToClipboard();
      e.preventDefault();
    }
    if (key === "v") {
      pasteClipboard();
      e.preventDefault();
    }
    if (key === "d") {
      duplicateSelection();
      e.preventDefault();
    }
  });

  activarSeleccion();

  window.Seleccion = {
    piezas: seleccion,
    limpiar: limpiarSeleccion,
    copy: copySelectionToClipboard,
    paste: pasteClipboard,
    duplicate: duplicateSelection,
    reflectLeft: () => reflectSelection("left"),
    reflectRight: () => reflectSelection("right"),
  };

  window.ToggleSelection = {
    activar: activarSeleccion,
    desactivar: desactivarSeleccion,
    isActive: function () {
      return !!seleccionActiva;
    },
  };
})();
