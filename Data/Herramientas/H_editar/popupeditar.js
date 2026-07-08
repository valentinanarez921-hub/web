// popupeditar.js - Lógica completa del popup, canvas y aplicación de cambios
(function () {
  window.popupEditar = window.popupEditar || {};

  window.popupEditar.init = function (opts) {
    if (!opts) return;

    const popup = opts.popup;
    const closeBtn = opts.closeBtn;
    const applyBtn = opts.applyBtn;
    const cancelBtn = opts.cancelBtn;
    const canvas = opts.canvas;
    const radiusValue = opts.radiusValue;
    const radiusCorner = opts.radiusCorner;
    const angleShift =
      opts.angleShift ||
      opts.angleValue ||
      document.getElementById("angle-value");
    const angleRotate =
      opts.angleRotate || document.getElementById("angle-rotate");
    const angleCorner =
      opts.angleCorner || document.getElementById("angle-corner");
    const radiusControls = opts.radiusControls;
    const angleControls = opts.angleControls;
    const cutControls = opts.cutControls;
    const gridArea = opts.gridArea;

    if (!popup || !canvas) return;

    const ctx = canvas.getContext("2d");

    let currentPiece = null;
    // Zoom/pan ahora gestionados por `window.editar_cuadricula`
    let minZoom = 0.0001; // permite piezas enormes (p.ej. 99999 -> zoom ~0.006)
    let maxZoom = 100000;

    let state = {
      radii: { tl: 0, tr: 0, br: 0, bl: 0 },
      angles: {
        tl: { shift: 0, rotate: 0 },
        tr: { shift: 0, rotate: 0 },
        br: { shift: 0, rotate: 0 },
        bl: { shift: 0, rotate: 0 },
      },
      holes: [],
    };
    if (window.P_angulo && window.P_angulo.init) {
      try {
        window.P_angulo.init({
          angleShift,
          angleRotate,
          angleCorner,
          drawPreview,
          getState: () => state,
          setState: (nextState) => {
            state =
              window.P_angulo && window.P_angulo.normalizeState
                ? window.P_angulo.normalizeState(nextState)
                : nextState;
          },
        });
      } catch (e) {
        console.warn("P_angulo init failed", e);
      }
    }

    // Inicializar módulo de renderizado de pieza
    if (window.editar_pieza_cuadricula && window.editar_pieza_cuadricula.init) {
      window.editar_pieza_cuadricula.init({
        canvas: canvas,
        getCurrentPiece: () => currentPiece,
        getState: () => state,
        getOpts: () => opts,
      });
    }
    // Inicializar módulo de cuadricula (zoom/pan)
    if (window.editar_cuadricula && window.editar_cuadricula.init) {
      try {
        window.editar_cuadricula.init({
          canvas: canvas,
          minZoom: minZoom,
          maxZoom: maxZoom,
          onChange: drawPreview,
        });
      } catch (e) {
        console.warn("editar_cuadricula init failed", e);
      }
    }
    // Inicializar módulo de puntos si existe
    if (window.P_puntos && window.P_puntos.init) {
      try {
        window.P_puntos.init({ canvas: canvas });
      } catch (e) {}
    }

    function updateSvgColor(pieza) {
      if (!pieza) return;
      const svg = pieza.querySelector("svg path");
      if (!svg) return;
      const bgColor = getComputedStyle(pieza).backgroundColor || "#ffffff";
      svg.setAttribute("fill", bgColor);
    }

    function setActiveTool(tool) {
      const toolRadius = document.getElementById("editar-tool-radius");
      const toolAngle = document.getElementById("editar-tool-angle");
      const toolCut = document.getElementById("editar-tool-cut");
      const toolPoints = document.getElementById("editar-tool-points");

      // Si se solicita activar 'points', hacerlo como overlay independiente
      if (tool === "points") {
        if (window.P_puntos && window.P_puntos.toggle) {
          window.P_puntos.toggle();
          const enabled =
            window.P_puntos && window.P_puntos.isEnabled
              ? window.P_puntos.isEnabled()
              : false;
          if (toolPoints) toolPoints.classList.toggle("activo", enabled);
        } else if (window.P_puntos && window.P_puntos.setEnabled) {
          window.P_puntos.setEnabled(true);
          if (toolPoints) toolPoints.classList.add("activo");
        }
        return;
      }

      // Limpiar estados "active" de los botones que controlan paneles (NO tocar toolPoints)
      if (toolRadius) toolRadius.classList.remove("activo");
      if (toolAngle) toolAngle.classList.remove("activo");
      if (toolCut) toolCut.classList.remove("activo");

      // Mostrar/ocultar paneles sólo para las herramientas que los usan
      if (tool === "radius") {
        radiusControls.style.display = "block";
        angleControls.style.display = "none";
        cutControls.style.display = "none";
        if (toolRadius) toolRadius.classList.add("activo");
        if (window.P_calados && window.P_calados.setCutMode)
          window.P_calados.setCutMode("freehand");
        return;
      }

      if (tool === "angle") {
        radiusControls.style.display = "none";
        angleControls.style.display = "block";
        cutControls.style.display = "none";
        if (toolAngle) toolAngle.classList.add("activo");
        if (window.P_calados && window.P_calados.setCutMode)
          window.P_calados.setCutMode("freehand");
        return;
      }

      if (tool === "cut") {
        radiusControls.style.display = "none";
        angleControls.style.display = "none";
        cutControls.style.display = "block";
        if (toolCut) toolCut.classList.add("activo");
        // Mostrar el panel de medidas exactas
        const exactPanel = document.getElementById("cut-exact-panel");
        if (exactPanel) exactPanel.style.display = "block";
        if (window.P_calados && window.P_calados.setCutMode)
          window.P_calados.setCutMode("exact");
        return;
      }

      // Para 'points' alternamos el estado de puntos (sin mostrar paneles)
      if (tool === "points") {
        // No ocultar paneles, solo alternar puntos como overlay
        if (window.P_puntos && window.P_puntos.toggle) {
          window.P_puntos.toggle();
          // Marcar el botón de puntos como activo/inactivo según estado
          const enabled =
            window.P_puntos && window.P_puntos.isEnabled
              ? window.P_puntos.isEnabled()
              : false;
          if (toolPoints) toolPoints.classList.toggle("activo", enabled);
        } else if (window.P_puntos && window.P_puntos.setEnabled) {
          // si no existe toggle, habilitar explícitamente
          window.P_puntos.setEnabled(true);
          if (toolPoints) toolPoints.classList.add("activo");
        }
        return;
      }

      // Si viene null u otro valor, ocultar todos los paneles
      radiusControls.style.display = "none";
      angleControls.style.display = "none";
      cutControls.style.display = "none";
      if (window.P_calados && window.P_calados.setCutMode)
        window.P_calados.setCutMode("freehand");
    }

    function drawPreview() {
      if (
        window.editar_pieza_cuadricula &&
        window.editar_pieza_cuadricula.drawPreview
      ) {
        return window.editar_pieza_cuadricula.drawPreview();
      }
    }

    function buildPiecePath(width, height, shapeState) {
      const normalizedState =
        window.P_angulo && window.P_angulo.normalizeState
          ? window.P_angulo.normalizeState(shapeState)
          : shapeState;

      if (window.P_angulo && window.P_angulo.getPathData) {
        return window.P_angulo.getPathData(width, height, normalizedState);
      }

      const r = shapeState?.radii || {};
      const tl = Math.min(r.tl || 0, width / 2, height / 2);
      const tr = Math.min(r.tr || 0, width / 2, height / 2);
      const br = Math.min(r.br || 0, width / 2, height / 2);
      const bl = Math.min(r.bl || 0, width / 2, height / 2);

      let d = "";
      d += `M ${tl} 0 `;
      d += `L ${width - tr} 0 `;
      if (tr > 0) d += `Q ${width} 0 ${width} ${tr} `;
      else d += `L ${width} 0 `;
      d += `L ${width} ${height - br} `;
      if (br > 0) d += `Q ${width} ${height} ${width - br} ${height} `;
      else d += `L ${width} ${height} `;
      d += `L ${bl} ${height} `;
      if (bl > 0) d += `Q 0 ${height} 0 ${height - bl} `;
      else d += `L 0 ${height} `;
      d += `L 0 ${tl} `;
      if (tl > 0) d += `Q 0 0 ${tl} 0 `;
      else d += `L 0 0 `;
      d += "Z";
      return d;
    }

    function openPopupForPiece(pieza) {
      currentPiece = pieza;
      pieza._originalW = parseFloat(pieza.dataset.w) || 100;
      pieza._originalH = parseFloat(pieza.dataset.h) || 100;

      state = {
        radii: { tl: 0, tr: 0, br: 0, bl: 0 },
        angles: {
          tl: { shift: 0, rotate: 0 },
          tr: { shift: 0, rotate: 0 },
          br: { shift: 0, rotate: 0 },
          bl: { shift: 0, rotate: 0 },
        },
        holes: [],
      };

      try {
        // Si la pieza tiene rotación, obtener los puntos transformados
        let raw = null;
        if (
          window.H_rotar &&
          typeof window.H_rotar.getTransformedCaladoState === "function"
        ) {
          const transformed = window.H_rotar.getTransformedCaladoState(pieza);
          if (transformed) {
            raw = JSON.stringify(transformed);
          }
        }
        // Si no hay transformación disponible, usar dataset.edit directamente
        if (!raw) {
          raw = pieza.dataset.edit || null;
        }

        if (raw) {
          const parsed = JSON.parse(raw);
          state = Object.assign({}, state, {
            radii: parsed.radii || state.radii,
            angles: parsed.angles || state.angles,
            holes: parsed.holes || [],
          });
          if (window.P_angulo && window.P_angulo.normalizeState) {
            state = window.P_angulo.normalizeState(state);
          }

          // Los puntos en dataset.edit están SIEMPRE en escala de canvas (600x400)
          // No necesitamos escalarlos - usarlos tal cual
        }
      } catch (e) {
        console.warn("error parsing edit data", e);
      }

      radiusValue.value = state.radii.tl || 0;
      radiusCorner.value = "tl";
      if (angleShift) angleShift.value = state.angles.tl.shift || 0;
      if (angleRotate) angleRotate.value = state.angles.tl.rotate || 0;
      if (angleCorner) angleCorner.value = "tl";

      if (document.getElementById("editar-tool-points")) {
        const tp = document.getElementById("editar-tool-points");
        const enabled =
          window.P_puntos && window.P_puntos.isEnabled
            ? window.P_puntos.isEnabled()
            : false;
        tp.classList.toggle("activo", !!enabled);
      }

      // Mostrar popup primero para que el contenedor tenga tamaño calculable
      popup.classList.add("show");

      // Esperar a que el DOM se renderice antes de ajustar canvas
      setTimeout(() => {
        requestAnimationFrame(() => {
          try {
            const gridContainer = document.getElementById("edit-grid");
            if (gridContainer) {
              const rect = gridContainer.getBoundingClientRect();
              const w = Math.max(100, Math.round(rect.width));
              const h = Math.max(100, Math.round(rect.height));
              canvas.width = w;
              canvas.height = h;
              canvas.style.width = "100%";
              canvas.style.height = "100%";
            } else {
              canvas.width = 600;
              canvas.height = 400;
              canvas.style.width = "100%";
              canvas.style.height = "100%";
            }
            // Re-centrar después de redimensionar
            if (
              window.editar_cuadricula &&
              window.editar_cuadricula.centerForPiece
            ) {
              window.editar_cuadricula.centerForPiece(
                pieza._originalW,
                pieza._originalH,
              );
            }
            drawPreview();
          } catch (e) {}
        });
      }, 50);
    }

    function closePopup() {
      popup.classList.remove("show");
      currentPiece = null;
      state.holes = state.holes || [];
      setActiveTool(null);
      // Notificar cierre para que quien haya abierto el editor pueda actualizar su estado
      try {
        if (
          window.popupEditar &&
          typeof window.popupEditar.onClose === "function"
        )
          window.popupEditar.onClose();
      } catch (e) {}
    }

    // Eventos del canvas
    let drawingCut = false;
    let currentCut = [];

    canvas.addEventListener("mousedown", (e) => {
      // Right-button panning handled by editar_cuadricula; here solo manejamos calado
      if (e.button === 2) return;
      const toolCut = document.getElementById("editar-tool-cut");
      // If exact-measures mode is active, don't start drawing here; selection module will handle clicks
      if (
        window.Pc_calado_medido &&
        window.Pc_calado_medido.isExactMode &&
        window.Pc_calado_medido.isExactMode()
      )
        return;
      if (!toolCut || !toolCut.classList.contains("activo")) return;
      const r = canvas.getBoundingClientRect();
      const canvasX = e.clientX - r.left;
      const canvasY = e.clientY - r.top;

      const origW = currentPiece ? currentPiece._originalW || 100 : 100;
      const origH = currentPiece ? currentPiece._originalH || 100 : 100;

      // Coordenadas en espacio de pieza (pixeles de pieza)
      const _panX =
        window.editar_cuadricula && window.editar_cuadricula.getPanX
          ? window.editar_cuadricula.getPanX()
          : 0;
      const _panY =
        window.editar_cuadricula && window.editar_cuadricula.getPanY
          ? window.editar_cuadricula.getPanY()
          : 0;
      const _zoom =
        window.editar_cuadricula && window.editar_cuadricula.getZoomLevel
          ? window.editar_cuadricula.getZoomLevel()
          : 1;
      const mousePieceX = (canvasX - _panX) / _zoom;
      const mousePieceY = (canvasY - _panY) / _zoom;

      let startX = mousePieceX / origW;
      let startY = mousePieceY / origH;

      // Magnetizar a punto si está activado (control points)
      if (
        window.P_puntos &&
        window.P_puntos.isEnabled &&
        window.P_puntos.isEnabled()
      ) {
        const magnetized = window.P_puntos.magnetizePosition(
          canvasX,
          canvasY,
          origW,
          origH,
        );
        startX = magnetized.x;
        startY = magnetized.y;
      }

      // Verificar si estamos en modo freehand o líneas
      const isFreehand =
        window.P_calados && window.P_calados.getFreehandMode
          ? window.P_calados.getFreehandMode()
          : true;

      if (isFreehand) {
        // Modo mano libre: iniciar dibujo continuo
        drawingCut = true;
        currentCut = [];
        currentCut.push({ x: startX, y: startY });
      } else {
        // Modo líneas: intentar snap al primer punto si existe
        if (!currentCut || currentCut.length === 0) {
          currentCut = [];
          currentCut.push({ x: startX, y: startY });
        } else {
          // Distancia en espacio de pieza (pixeles)
          const fp = currentCut[0];
          const fpX = fp.x * origW;
          const fpY = fp.y * origH;
          const dist = Math.hypot(fpX - mousePieceX, fpY - mousePieceY);
          const snapThresholdScreenPx = 10; // umbral visual en px
          const _zoom_local =
            window.editar_cuadricula && window.editar_cuadricula.getZoomLevel
              ? window.editar_cuadricula.getZoomLevel()
              : 1;
          const snapThresholdPiece = snapThresholdScreenPx / _zoom_local; // convertir a unidades de pieza
          if (dist <= snapThresholdPiece) {
            // Cerrar forma: si hay suficientes puntos
            const filteredCut = currentCut.filter(
              (pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1,
            );
            if (filteredCut.length >= 3) {
              state.holes.push(filteredCut);
              if (window.P_calados && window.P_calados.saveToHistory) {
                try {
                  window.P_calados.saveToHistory(state);
                } catch (e) {}
              }
            }
            currentCut = [];
            opts.currentCut = currentCut;
            drawPreview();
            return;
          } else {
            // No está cerca del inicio: añadir punto normal
            currentCut.push({ x: startX, y: startY });
          }
        }
      }

      opts.currentCut = currentCut;
      drawPreview();
    });

    canvas.addEventListener("mousemove", (e) => {
      if (
        window.editar_cuadricula &&
        window.editar_cuadricula.isPanning &&
        window.editar_cuadricula.isPanning()
      ) {
        // panning handled by editar_cuadricula
        drawPreview();
        return;
      }

      // If exact mode active, do not perform drawing mousemove actions
      if (
        window.Pc_calado_medido &&
        window.Pc_calado_medido.isExactMode &&
        window.Pc_calado_medido.isExactMode()
      )
        return;

      const r = canvas.getBoundingClientRect();
      const canvasX = e.clientX - r.left;
      const canvasY = e.clientY - r.top;
      const origW = currentPiece ? currentPiece._originalW || 100 : 100;
      const origH = currentPiece ? currentPiece._originalH || 100 : 100;

      const isFreehand =
        window.P_calados && window.P_calados.getFreehandMode
          ? window.P_calados.getFreehandMode()
          : true;

      // En modo líneas no dibujamos continuamente, pero sí mostramos cursor/indicador de snap
      if (!isFreehand) {
        const _panX =
          window.editar_cuadricula && window.editar_cuadricula.getPanX
            ? window.editar_cuadricula.getPanX()
            : 0;
        const _panY =
          window.editar_cuadricula && window.editar_cuadricula.getPanY
            ? window.editar_cuadricula.getPanY()
            : 0;
        const _zoom =
          window.editar_cuadricula && window.editar_cuadricula.getZoomLevel
            ? window.editar_cuadricula.getZoomLevel()
            : 1;
        const mousePieceX = (canvasX - _panX) / _zoom;
        const mousePieceY = (canvasY - _panY) / _zoom;
        let nearStart = false;
        if (currentCut && currentCut.length > 0) {
          const fp = currentCut[0];
          const fpX = fp.x * origW;
          const fpY = fp.y * origH;
          const dist = Math.hypot(fpX - mousePieceX, fpY - mousePieceY);
          const snapThresholdScreenPx = 10;
          const _zoom_local2 =
            window.editar_cuadricula && window.editar_cuadricula.getZoomLevel
              ? window.editar_cuadricula.getZoomLevel()
              : 1;
          const snapThresholdPiece = snapThresholdScreenPx / _zoom_local2;
          nearStart = dist <= snapThresholdPiece;
        }
        canvas.style.cursor = nearStart ? "pointer" : "crosshair";
        return;
      }

      // Modo mano libre: dibujar solo si estamos en proceso de dibujo
      if (!drawingCut) return;

      const _panX2 =
        window.editar_cuadricula && window.editar_cuadricula.getPanX
          ? window.editar_cuadricula.getPanX()
          : 0;
      const _panY2 =
        window.editar_cuadricula && window.editar_cuadricula.getPanY
          ? window.editar_cuadricula.getPanY()
          : 0;
      const _zoom2 =
        window.editar_cuadricula && window.editar_cuadricula.getZoomLevel
          ? window.editar_cuadricula.getZoomLevel()
          : 1;
      const x = (canvasX - _panX2) / _zoom2 / origW;
      const y = (canvasY - _panY2) / _zoom2 / origH;
      currentCut.push({ x, y });
      opts.currentCut = currentCut;
      drawPreview();
    });

    canvas.addEventListener("mouseup", (e) => {
      if (
        window.editar_cuadricula &&
        window.editar_cuadricula.isPanning &&
        window.editar_cuadricula.isPanning()
      ) {
        return;
      }
      // If exact mode active, ignore mouseup drawing handling
      if (
        window.Pc_calado_medido &&
        window.Pc_calado_medido.isExactMode &&
        window.Pc_calado_medido.isExactMode()
      )
        return;
      // Verificar si estamos en modo freehand o líneas
      const isFreehand =
        window.P_calados && window.P_calados.getFreehandMode
          ? window.P_calados.getFreehandMode()
          : true;

      if (isFreehand) {
        // Modo mano libre: finalizar dibujo continuo
        if (!drawingCut) return;
        drawingCut = false;
        if (currentCut.length > 2) {
          const filteredCut = currentCut.filter(
            (pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1,
          );
          if (filteredCut.length > 2) {
            state.holes.push(filteredCut);
            if (window.P_calados && window.P_calados.saveToHistory) {
              try {
                window.P_calados.saveToHistory(state);
              } catch (e) {}
            }
          }
        }
        currentCut = [];
        opts.currentCut = currentCut;
        drawPreview();
      } else {
        // Modo líneas: no hacer nada en mouseup, el punto ya fue agregado en mousedown
      }
    });

    // Doble click para cerrar forma en modo líneas
    canvas.addEventListener("dblclick", (e) => {
      const toolCut = document.getElementById("editar-tool-cut");
      if (!toolCut || !toolCut.classList.contains("activo")) return;

      // If exact mode active, ignore dblclick drawing
      if (
        window.Pc_calado_medido &&
        window.Pc_calado_medido.isExactMode &&
        window.Pc_calado_medido.isExactMode()
      )
        return;

      const isFreehand =
        window.P_calados && window.P_calados.getFreehandMode
          ? window.P_calados.getFreehandMode()
          : true;
      if (isFreehand || currentCut.length < 3) return; // Solo en modo líneas y con al menos 3 puntos

      // Agregar forma a los agujeros
      const filteredCut = currentCut.filter(
        (pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1,
      );
      if (filteredCut.length >= 3) {
        state.holes.push(filteredCut);
        if (window.P_calados && window.P_calados.saveToHistory) {
          try {
            window.P_calados.saveToHistory(state);
          } catch (e) {}
        }
      }

      currentCut = [];
      opts.currentCut = currentCut;
      drawPreview();
    });

    canvas.addEventListener("mouseleave", () => {
      if (
        window.editar_cuadricula &&
        window.editar_cuadricula.isPanning &&
        window.editar_cuadricula.isPanning()
      ) {
        // let editar_cuadricula handle panning state
      }
      if (drawingCut) {
        drawingCut = false;
        if (currentCut.length > 2) {
          const filteredCut = currentCut.filter(
            (pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1,
          );
          if (filteredCut.length > 2) {
            state.holes.push(filteredCut);
            if (window.P_calados && window.P_calados.saveToHistory) {
              try {
                window.P_calados.saveToHistory(state);
              } catch (e) {}
            }
          }
        }
        currentCut = [];
        opts.currentCut = currentCut;
        drawPreview();
      }
    });

    // wheel/contextmenu handled by editar_cuadricula

    // Botones y aplicación
    applyBtn.addEventListener("click", () => {
      if (!currentPiece) return;

      // Obtener color de fondo y asegurar que sea opaco (sin alpha)
      let currentBgColor =
        getComputedStyle(currentPiece).backgroundColor || "rgba(255,255,255,1)";
      const currentOpacity = getComputedStyle(currentPiece).opacity;
      // Normalizar: convertir 'transparent' o rgba(...,0) a blanco, y eliminar alpha si existe
      try {
        if (
          /transparent/i.test(currentBgColor) ||
          /rgba\([^\)]*,\s*0\s*\)/i.test(currentBgColor)
        ) {
          currentBgColor = "rgb(255,255,255)";
        } else {
          const m = currentBgColor.match(/rgba?\(([^)]+)\)/);
          if (m) {
            const parts = m[1].split(",").map((s) => s.trim());
            if (parts.length >= 3) {
              currentBgColor = `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
            }
          }
        }
      } catch (e) {
        /* ignore and keep value */
      }

      const origW = currentPiece._originalW || 100;
      const origH = currentPiece._originalH || 100;
      const d = buildPiecePath(origW, origH, state);

      const holePaths = (state.holes || [])
        .map((hole) => {
          // Manejar ambas estructuras: array de puntos o {points: [...], radios: {...}}
          let points = hole.points || hole;
          if (!points || points.length < 3) return "";
          const radios = hole.radios || { tl: 0, tr: 0, bl: 0, br: 0 };

          // Si hay radios, dibujar con esquinas redondeadas
          if (
            radios.tl > 0 ||
            radios.tr > 0 ||
            radios.br > 0 ||
            radios.bl > 0
          ) {
            const minX = Math.min(...points.map((p) => p.x)) * origW;
            const maxX = Math.max(...points.map((p) => p.x)) * origW;
            const minY = Math.min(...points.map((p) => p.y)) * origH;
            const maxY = Math.max(...points.map((p) => p.y)) * origH;

            let pathData = "";
            pathData += `M ${minX + radios.tl} ${minY} `;
            pathData += `L ${maxX - radios.tr} ${minY} `;
            if (radios.tr > 0)
              pathData += `Q ${maxX} ${minY} ${maxX} ${minY + radios.tr} `;
            else pathData += `L ${maxX} ${minY} `;
            pathData += `L ${maxX} ${maxY - radios.br} `;
            if (radios.br > 0)
              pathData += `Q ${maxX} ${maxY} ${maxX - radios.br} ${maxY} `;
            else pathData += `L ${maxX} ${maxY} `;
            pathData += `L ${minX + radios.bl} ${maxY} `;
            if (radios.bl > 0)
              pathData += `Q ${minX} ${maxY} ${minX} ${maxY - radios.bl} `;
            else pathData += `L ${minX} ${maxY} `;
            pathData += `L ${minX} ${minY + radios.tl} `;
            if (radios.tl > 0)
              pathData += `Q ${minX} ${minY} ${minX + radios.tl} ${minY} `;
            else pathData += `L ${minX} ${minY} `;
            pathData += "Z";
            return pathData;
          } else {
            // Sin radios, usar polígono simple
            const pts = points.map((p) => {
              const svgX = p.x * origW;
              const svgY = p.y * origH;
              return `${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
            });
            return `M ${pts.join(" L ")} Z`;
          }
        })
        .filter(Boolean);

      const holeStrokePaths = (state.holes || [])
        .map((hole) => {
          // Manejar ambas estructuras: array de puntos o {points: [...], radios: {...}}
          let points = hole.points || hole;
          if (!points || points.length < 2) return "";
          const radios = hole.radios || { tl: 0, tr: 0, bl: 0, br: 0 };

          // Si hay radios, dibujar contorno con esquinas redondeadas
          if (
            radios.tl > 0 ||
            radios.tr > 0 ||
            radios.br > 0 ||
            radios.bl > 0
          ) {
            const minX = Math.min(...points.map((p) => p.x)) * origW;
            const maxX = Math.max(...points.map((p) => p.x)) * origW;
            const minY = Math.min(...points.map((p) => p.y)) * origH;
            const maxY = Math.max(...points.map((p) => p.y)) * origH;

            let pathData = "";
            pathData += `M ${minX + radios.tl} ${minY} `;
            pathData += `L ${maxX - radios.tr} ${minY} `;
            if (radios.tr > 0)
              pathData += `Q ${maxX} ${minY} ${maxX} ${minY + radios.tr} `;
            else pathData += `L ${maxX} ${minY} `;
            pathData += `L ${maxX} ${maxY - radios.br} `;
            if (radios.br > 0)
              pathData += `Q ${maxX} ${maxY} ${maxX - radios.br} ${maxY} `;
            else pathData += `L ${maxX} ${maxY} `;
            pathData += `L ${minX + radios.bl} ${maxY} `;
            if (radios.bl > 0)
              pathData += `Q ${minX} ${maxY} ${minX} ${maxY - radios.bl} `;
            else pathData += `L ${minX} ${maxY} `;
            pathData += `L ${minX} ${minY + radios.tl} `;
            if (radios.tl > 0)
              pathData += `Q ${minX} ${minY} ${minX + radios.tl} ${minY} `;
            else pathData += `L ${minX} ${minY} `;
            pathData += "Z";
            return pathData;
          } else {
            // Sin radios, usar polígono simple
            const pts = points.map((p) => {
              const svgX = p.x * origW;
              const svgY = p.y * origH;
              return `${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
            });
            return `M ${pts.join(" L ")} Z`;
          }
        })
        .filter(Boolean);

      let svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${origW} ${origH}" overflow="visible" style="position:absolute; top:0; left:0; width:100%; height:100%; overflow:visible;">` +
        `<path d="${d} ${holePaths.join(" ")}" fill="${currentBgColor}" stroke="none" fill-rule="evenodd" />` +
        `<path d="${d}" fill="none" stroke="#000" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />`;

      holeStrokePaths.forEach((hp) => {
        svg += `<path d="${hp}" fill="none" stroke="#000" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />`;
      });
      svg += `</svg>`;

      const storedW = parseFloat(currentPiece.style.width);
      const storedH = parseFloat(currentPiece.style.height);

      const nombre =
        currentPiece.querySelector(".pieza-nombre")?.innerText || "";
      const medidas =
        currentPiece.querySelector(".pieza-medidas")?.innerText || "";

      currentPiece.style.position = "relative";
      currentPiece.style.overflow = "visible";

      currentPiece.innerHTML =
        svg +
        `<div class="pieza-nombre" style="position:relative; z-index:1;">${nombre}</div><div class="pieza-medidas" style="position:relative; z-index:1;">${medidas}</div>`;

      if (storedW) currentPiece.style.width = storedW + "px";
      if (storedH) currentPiece.style.height = storedH + "px";
      currentPiece.style.background = "transparent";
      currentPiece.style.border = "none";
      currentPiece.style.opacity = currentOpacity;

      // Los puntos en `state.holes` están en escala de canvas (600x400)
      // Guardarlos directamente sin transformación inversa
      // El sistema de rotación maneja la transformación visual en getTransformedCaladoState
      try {
        // Guardar también las dimensiones del canvas para regeneración del SVG
        state.origW = origW;
        state.origH = origH;
        const stateToSave = JSON.stringify(state);
        console.log("applyBtn: saving state to dataset.edit:", stateToSave);
        currentPiece.dataset.edit = stateToSave;

        // Guardar también en propiedades del elemento para acceso rápido
        currentPiece._originalW = origW;
        currentPiece._originalH = origH;

        // Actualizar _holesOriginal para mantenerlo sincronizado
        try {
          currentPiece._holesOriginal = JSON.parse(stateToSave);
        } catch (e) {
          // Silenciar
        }
      } catch (e) {
        console.warn(e);
      }

      // Al aplicar los cambios, desactivar el botón de editar si está activo
      const toolEditarBtn = document.getElementById("tool-editar");
      if (toolEditarBtn && toolEditarBtn.classList.contains("activo")) {
        // Simular click para que H_editar maneje el toggle y cierre del popup
        toolEditarBtn.click();
      } else {
        // Si no está activo por alguna razón, cerrar el popup manualmente
        closePopup();
      }

      // Deshabilitar inputs después de guardar cambios
      if (window.Pc_calado_medido && window.Pc_calado_medido.setInputsEnabled) {
        console.log(
          "applyBtn: deshabilitando inputs después de guardar cambios",
        );
        window.Pc_calado_medido.setInputsEnabled(false);
      }
      if (
        window.Pc_calado_medido &&
        window.Pc_calado_medido.updateButtonStyle
      ) {
        window.Pc_calado_medido.updateButtonStyle();
      }
    });

    cancelBtn.addEventListener("click", closePopup);
    closeBtn.addEventListener("click", closePopup);

    popup.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Listeners para los botones de herramientas
    const toolRadius = document.getElementById("editar-tool-radius");
    const toolAngle = document.getElementById("editar-tool-angle");
    const toolCut = document.getElementById("editar-tool-cut");
    const toolPoints = document.getElementById("editar-tool-points");

    if (toolRadius)
      toolRadius.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveTool("radius");
      });
    if (toolAngle)
      toolAngle.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveTool("angle");
      });
    if (toolCut)
      toolCut.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveTool("cut");
      });
    if (toolPoints)
      toolPoints.addEventListener("click", (e) => {
        e.stopPropagation();
        setActiveTool("points");
      });

    // Abrir popup al clickear pieza
    // Exportar referencias para otros módulos
    window.popupEditar.getState = () => state;
    window.popupEditar.setState = (newState) => {
      const normalized =
        window.P_angulo && window.P_angulo.normalizeState
          ? window.P_angulo.normalizeState(newState)
          : newState;
      state = Object.assign({}, state, normalized);
      state.angles = Object.assign({}, state.angles, normalized.angles || {});
      if (typeof drawPreview === "function") drawPreview();
    };
    window.popupEditar.getCurrentPiece = () => currentPiece;
    window.popupEditar.setActiveTool = setActiveTool;
    window.popupEditar.drawPreview = drawPreview;
    window.popupEditar.openPopupForPiece = openPopupForPiece;
    window.popupEditar.closePopup = closePopup;
    window.popupEditar.getZoomLevel = () =>
      window.editar_cuadricula && window.editar_cuadricula.getZoomLevel
        ? window.editar_cuadricula.getZoomLevel()
        : 1;
    window.popupEditar.getPanX = () =>
      window.editar_cuadricula && window.editar_cuadricula.getPanX
        ? window.editar_cuadricula.getPanX()
        : 0;
    window.popupEditar.getPanY = () =>
      window.editar_cuadricula && window.editar_cuadricula.getPanY
        ? window.editar_cuadricula.getPanY()
        : 0;
  };
})();
