/* H_exportar.js - Exportar dibujo a la hoja A4 */
(function () {
  console.log("📦 Inicializando H_exportar.js...");

  // Esperar a que el DOM esté listo y reintentar si el botón no existe
  function initExport() {
    const toolExportBtn = document.getElementById("tool-export");

    if (!toolExportBtn) {
      console.warn("⚠️ No se encontró #tool-export, reintentando...");
      setTimeout(initExport, 500);
      return;
    }

    toolExportBtn.addEventListener("click", exportarDibujo);
    console.log("✅ Listener de exportación agregado al botón");
  }

  function getPieceCornerPoints(pieza) {
    const x = parseFloat(pieza.dataset.x) || 0;
    const y = parseFloat(pieza.dataset.y) || 0;
    const w = parseFloat(pieza.dataset.w) || parseInt(pieza.style.width) || 0;
    const h = parseFloat(pieza.dataset.h) || parseInt(pieza.style.height) || 0;
    const rotation = parseFloat(pieza.dataset.rotation) || 0;
    const mirror = pieza.dataset.mirror === "left" ? -1 : 1;
    const cx = x + w / 2;
    const cy = y + h / 2;

    const corners = [
      { x, y },
      { x: x + w, y },
      { x, y: y + h },
      { x: x + w, y: y + h },
    ];

    if ((rotation === 0 || !isFinite(rotation)) && mirror === 1) {
      return {
        tl: corners[0],
        tr: corners[1],
        bl: corners[2],
        br: corners[3],
      };
    }

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    function transformPoint(pt) {
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const mirroredX = cx + dx * mirror;
      return {
        x: cx + (mirroredX - cx) * cos - dy * sin,
        y: cy + (mirroredX - cx) * sin + dy * cos,
      };
    }

    return {
      tl: transformPoint(corners[0]),
      tr: transformPoint(corners[1]),
      bl: transformPoint(corners[2]),
      br: transformPoint(corners[3]),
    };
  }

  function getPieceBoundingBox(pieza) {
    const corners = getPieceCornerPoints(pieza);
    const xs = [corners.tl.x, corners.tr.x, corners.bl.x, corners.br.x];
    const ys = [corners.tl.y, corners.tr.y, corners.bl.y, corners.br.y];
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  function getExportedPieceTransform(pieza) {
    const rotation = parseFloat(pieza.dataset.rotation) || 0;
    const mirror = pieza.dataset.mirror === "left" ? -1 : 1;
    return `scaleX(${mirror}) rotate(${rotation}deg)`;
  }

  // Iniciar cuando el documento esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExport);
  } else {
    initExport();
  }

  /**
   * Exporta el dibujo actual (gridArea) a la hoja A4
   */
  function exportarDibujo() {
    console.log("🎨 Iniciando exportación de dibujo...");

    const gridArea = document.getElementById("gridArea");
    const a4RightDraw = document.querySelector(".a4-right-draw");
    const a4Sheet = a4RightDraw?.closest(".a4-sheet");

    if (!gridArea) {
      alert("❌ No se encontró el área de dibujo");
      return;
    }

    if (!a4RightDraw || !a4Sheet) {
      alert("❌ No se encontró el área de exportación en la hoja A4");
      return;
    }

    try {
      // Solo exportar las piezas actualmente seleccionadas
      const piezas = Array.from(
        gridArea.querySelectorAll(".pieza-dibujada.pieza-seleccionada"),
      );

      if (piezas.length === 0) {
        alert("⚠️ Nada seleccionado para exportar");
        return;
      }

      console.log(
        "📦 Encontradas",
        piezas.length,
        "piezas seleccionadas para exportar",
      );

      // Obtener bounds del dibujo actual
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      piezas.forEach((pieza) => {
        const bounds = getPieceBoundingBox(pieza);
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      });

      console.log("📐 Bounds:", { minX, minY, maxX, maxY });

      // Calcular dimensiones del dibujo
      const dibujoWidth = maxX - minX;
      const dibujoHeight = maxY - minY;
      console.log(
        "📐 Dimensiones originales del dibujo:",
        dibujoWidth,
        "x",
        dibujoHeight,
      );

      // Calcular tamaño del wrapper basado en el dibujo (máximo 250x200 visible)
      // Esto NO es el tamaño máximo absoluto, sino el tamaño que ocupará el dibujo escalado
      const maxVisibleWidth = 250;
      const maxVisibleHeight = 200;
      const aspectRatio = dibujoWidth / dibujoHeight;

      let wrapperWidth = maxVisibleWidth;
      let wrapperHeight = maxVisibleWidth / aspectRatio;

      if (wrapperHeight > maxVisibleHeight) {
        wrapperHeight = maxVisibleHeight;
        wrapperWidth = maxVisibleHeight * aspectRatio;
      }

      // Agregar padding y border al tamaño final del wrapper
      wrapperWidth += 16 + 4; // padding 8*2 + border 2*2
      wrapperHeight += 16 + 4;

      console.log(
        "📦 Tamaño calculado del wrapper (final):",
        wrapperWidth,
        "x",
        wrapperHeight,
      );

      // Crear contenedor escalable que ocupa todo el espacio disponible
      const contenedorPiezas = document.createElement("div");
      contenedorPiezas.style.position = "absolute";
      contenedorPiezas.style.top = "0";
      contenedorPiezas.style.left = "0";
      contenedorPiezas.style.width = "100%";
      contenedorPiezas.style.height = "100%";
      contenedorPiezas.style.display = "flex";
      contenedorPiezas.style.alignItems = "center";
      contenedorPiezas.style.justifyContent = "center";
      contenedorPiezas.style.userSelect = "none";
      contenedorPiezas.style.overflow = "hidden";

      // Contenedor interno que se escalará con transform
      const contenedorInterno = document.createElement("div");
      contenedorInterno.style.position = "absolute";
      contenedorInterno.style.width = dibujoWidth + "px";
      contenedorInterno.style.height = dibujoHeight + "px";
      contenedorInterno.style.transformOrigin = "center center";
      contenedorInterno.dataset.originalWidth = dibujoWidth.toString();
      contenedorInterno.dataset.originalHeight = dibujoHeight.toString();
      contenedorInterno.dataset.contenedorInterno = "true";
      console.log(
        "📦 Asignando dimensiones al contenedorInterno:",
        "width=" + dibujoWidth,
        "height=" + dibujoHeight,
      );
      contenedorInterno.style.background = "transparent";
      contenedorInterno.style.top = "50%";
      contenedorInterno.style.left = "50%";
      contenedorInterno.style.margin = "0";
      contenedorInterno.style.transform = "translate(-50%, -50%) scale(1)"; // Se calculará después

      // Copiar piezas CON LAS POSICIONES ORIGINALES (sin escalar)
      piezas.forEach((pieza) => {
        const piezaClon = pieza.cloneNode(true);

        const w =
          parseFloat(pieza.dataset.w) || parseInt(pieza.style.width) || 100;
        const h =
          parseFloat(pieza.dataset.h) || parseInt(pieza.style.height) || 100;
        const bounds = getPieceBoundingBox(pieza);
        const x = bounds.minX - minX;
        const y = bounds.minY - minY;
        const bboxWidth = bounds.maxX - bounds.minX;
        const bboxHeight = bounds.maxY - bounds.minY;
        const piezaX = parseFloat(pieza.dataset.x) || 0;
        const piezaY = parseFloat(pieza.dataset.y) || 0;

        const piezaWrapper = document.createElement("div");
        piezaWrapper.dataset.piezaExportWrapper = "true";
        piezaWrapper.style.position = "absolute";
        piezaWrapper.style.left = x + "px";
        piezaWrapper.style.top = y + "px";
        piezaWrapper.style.width = bboxWidth + "px";
        piezaWrapper.style.height = bboxHeight + "px";
        piezaWrapper.style.pointerEvents = "none";
        piezaWrapper.style.overflow = "visible";

        piezaClon.style.position = "absolute";
        piezaClon.style.left = piezaX - bounds.minX + "px";
        piezaClon.style.top = piezaY - bounds.minY + "px";
        piezaClon.style.width = w + "px";
        piezaClon.style.height = h + "px";
        const originalTransform = pieza.style.transform?.trim();
        const computedTransform = window.getComputedStyle(pieza).transform;
        piezaClon.style.transform =
          originalTransform && originalTransform !== "none"
            ? originalTransform
            : computedTransform && computedTransform !== "none"
              ? computedTransform
              : getExportedPieceTransform(pieza);
        piezaClon.style.transformOrigin = "center center";
        piezaClon.style.cursor = "default";
        piezaClon.classList.remove("pieza-seleccionada", "seleccionada");

        // Hacer no interactivo el clon
        piezaClon.removeAttribute("data-selected");
        piezaClon.style.pointerEvents = "none";

        piezaWrapper.appendChild(piezaClon);
        contenedorInterno.appendChild(piezaWrapper);
      });

      contenedorPiezas.appendChild(contenedorInterno);

      const wrapper = document.createElement("div");
      wrapper.className = "dibujo-wrapper editing";
      wrapper.style.position = "relative";
      wrapper.style.width = Math.round(wrapperWidth) + "px";
      wrapper.style.height = Math.round(wrapperHeight) + "px";
      wrapper.style.margin = "0";
      wrapper.style.padding = "0";
      wrapper.style.backgroundColor = "#f5f5f5";
      wrapper.style.border = "1px solid #c8c8c8";
      wrapper.style.borderRadius = "6px";
      wrapper.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
      wrapper.style.overflow = "visible";
      wrapper.style.cursor = "grab";
      wrapper.dataset.isDibujoExportado = "true";
      wrapper.dataset.isApplied = "false"; // Estado: aplicado o en edición
      wrapper.dataset.zoomLevel = "1"; // Nivel de zoom inicial
      wrapper.dataset.contentOffsetX = "0";
      wrapper.dataset.contentOffsetY = "0";
      wrapper._contentOffsetX = 0;
      wrapper._contentOffsetY = 0;
      wrapper.style.zIndex = "10";
      wrapper.style.position = "relative";
      wrapper.style.pointerEvents = "auto";
      if (a4Sheet) {
        a4Sheet.style.zIndex = "1";
      }

      wrapper.appendChild(contenedorPiezas);

      // Guardar referencia directa para acceso rápido
      wrapper._contenedorInterno = contenedorInterno;

      // Crear barra de herramientas (se ocultará cuando se aplique)
      const toolbar = document.createElement("div");
      toolbar.className = "dibujo-toolbar";
      toolbar.style.position = "absolute";
      toolbar.style.top = "3px";
      toolbar.style.right = "3px";
      toolbar.style.display = "flex";
      toolbar.style.gap = "4px";
      toolbar.style.zIndex = "101";
      toolbar.dataset.toolbar = true;

      // Botón de tick para aplicar
      const btnApply = document.createElement("button");
      btnApply.textContent = "✓";
      btnApply.title = "Aplicar";
      btnApply.style.width = "22px";
      btnApply.style.height = "22px";
      btnApply.style.padding = "0";
      btnApply.style.fontSize = "16px";
      btnApply.style.borderRadius = "3px";
      btnApply.style.border = "1px solid #090";
      btnApply.style.backgroundColor = "#0f0";
      btnApply.style.color = "#009900";
      btnApply.style.cursor = "pointer";
      btnApply.style.transition = "all 0.2s";
      btnApply.style.fontWeight = "bold";
      btnApply.addEventListener("mouseenter", () => {
        btnApply.style.backgroundColor = "#0d0";
        btnApply.style.borderColor = "#060";
      });
      btnApply.addEventListener("mouseleave", () => {
        btnApply.style.backgroundColor = "#0f0";
        btnApply.style.borderColor = "#090";
      });
      btnApply.addEventListener("click", (e) => {
        e.stopPropagation();
        aplicarDibujo(wrapper);
      });

      // Botón para resizing
      const btnResize = document.createElement("button");
      btnResize.textContent = "⧂";
      btnResize.title = "Redimensionar";
      btnResize.style.width = "22px";
      btnResize.style.height = "22px";
      btnResize.style.padding = "2px";
      btnResize.style.fontSize = "14px";
      btnResize.style.borderRadius = "3px";
      btnResize.style.border = "1px solid #999";
      btnResize.style.backgroundColor = "#f0f0f0";
      btnResize.style.cursor = "pointer";
      btnResize.style.transition = "all 0.2s";
      btnResize.addEventListener("mouseenter", () => {
        btnResize.style.backgroundColor = "#e0e0e0";
      });
      btnResize.addEventListener("mouseleave", () => {
        btnResize.style.backgroundColor = "#f0f0f0";
      });
      btnResize.addEventListener("click", (e) => {
        e.stopPropagation();
        iniciarRedimensionamiento(wrapper, e);
      });

      // Botón para zoom +
      const btnZoomIn = document.createElement("button");
      btnZoomIn.textContent = "+";
      btnZoomIn.title = "Zoom +";
      btnZoomIn.style.width = "22px";
      btnZoomIn.style.height = "22px";
      btnZoomIn.style.padding = "0";
      btnZoomIn.style.fontSize = "16px";
      btnZoomIn.style.borderRadius = "3px";
      btnZoomIn.style.border = "1px solid #0066ff";
      btnZoomIn.style.backgroundColor = "#e6f2ff";
      btnZoomIn.style.color = "#0066ff";
      btnZoomIn.style.cursor = "pointer";
      btnZoomIn.style.transition = "all 0.2s";
      btnZoomIn.style.fontWeight = "bold";
      btnZoomIn.addEventListener("mouseenter", () => {
        btnZoomIn.style.backgroundColor = "#cce5ff";
        btnZoomIn.style.borderColor = "#0044cc";
      });
      btnZoomIn.addEventListener("mouseleave", () => {
        btnZoomIn.style.backgroundColor = "#e6f2ff";
        btnZoomIn.style.borderColor = "#0066ff";
      });
      btnZoomIn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Bloquear si el dibujo está aplicado
        if (wrapper.dataset.isApplied === "true") {
          console.log("🔒 Zoom IN bloqueado - dibujo aplicado");
          return;
        }
        // Bloquear completamente si se está arrastrando
        if (wrapper._isMovingContent) {
          console.log("🔒 Zoom IN bloqueado - en arrastre");
          return;
        }
        aplicarZoom(wrapper, 0.1);
      });

      // Guardar referencia al botón de zoom in para deshabilitar durante arrastre
      wrapper._btnZoomIn = btnZoomIn;

      // Botón para zoom -
      const btnZoomOut = document.createElement("button");
      btnZoomOut.textContent = "−";
      btnZoomOut.title = "Zoom −";
      btnZoomOut.style.width = "22px";
      btnZoomOut.style.height = "22px";
      btnZoomOut.style.padding = "0";
      btnZoomOut.style.fontSize = "16px";
      btnZoomOut.style.borderRadius = "3px";
      btnZoomOut.style.border = "1px solid #ff6600";
      btnZoomOut.style.backgroundColor = "#fff0e6";
      btnZoomOut.style.color = "#ff6600";
      btnZoomOut.style.cursor = "pointer";
      btnZoomOut.style.transition = "all 0.2s";
      btnZoomOut.style.fontWeight = "bold";
      btnZoomOut.addEventListener("mouseenter", () => {
        btnZoomOut.style.backgroundColor = "#ffe6cc";
        btnZoomOut.style.borderColor = "#dd5500";
      });
      btnZoomOut.addEventListener("mouseleave", () => {
        btnZoomOut.style.backgroundColor = "#fff0e6";
        btnZoomOut.style.borderColor = "#ff6600";
      });
      btnZoomOut.addEventListener("click", (e) => {
        e.stopPropagation();
        // Bloquear si el dibujo está aplicado
        if (wrapper.dataset.isApplied === "true") {
          console.log("🔒 Zoom OUT bloqueado - dibujo aplicado");
          return;
        }
        // Bloquear completamente si se está arrastrando
        if (wrapper._isMovingContent) {
          console.log("🔒 Zoom OUT bloqueado - en arrastre");
          return;
        }
        aplicarZoom(wrapper, -0.1);
      });

      // Guardar referencia al botón de zoom out para deshabilitar durante arrastre
      wrapper._btnZoomOut = btnZoomOut;

      // Botón para mover a la siguiente hoja
      const btnNextSheet = document.createElement("button");
      btnNextSheet.textContent = "↓";
      btnNextSheet.title = "Mover a la siguiente hoja";
      btnNextSheet.style.width = "22px";
      btnNextSheet.style.height = "22px";
      btnNextSheet.style.padding = "0";
      btnNextSheet.style.fontSize = "14px";
      btnNextSheet.style.borderRadius = "3px";
      btnNextSheet.style.border = "1px solid #666";
      btnNextSheet.style.backgroundColor = "#f7f7f7";
      btnNextSheet.style.cursor = "pointer";
      btnNextSheet.style.transition = "all 0.2s";
      btnNextSheet.addEventListener("mouseenter", () => {
        btnNextSheet.style.backgroundColor = "#ececec";
      });
      btnNextSheet.addEventListener("mouseleave", () => {
        btnNextSheet.style.backgroundColor = "#f7f7f7";
      });
      btnNextSheet.addEventListener("click", (e) => {
        e.stopPropagation();
        moverWrapperASiguienteHoja(wrapper);
      });

      const btnPrevSheet = document.createElement("button");
      btnPrevSheet.textContent = "↑";
      btnPrevSheet.title = "Mover a la hoja anterior";
      btnPrevSheet.style.width = "22px";
      btnPrevSheet.style.height = "22px";
      btnPrevSheet.style.padding = "0";
      btnPrevSheet.style.fontSize = "14px";
      btnPrevSheet.style.borderRadius = "3px";
      btnPrevSheet.style.border = "1px solid #666";
      btnPrevSheet.style.backgroundColor = "#f7f7f7";
      btnPrevSheet.style.cursor = "pointer";
      btnPrevSheet.style.transition = "all 0.2s";
      btnPrevSheet.addEventListener("mouseenter", () => {
        btnPrevSheet.style.backgroundColor = "#ececec";
      });
      btnPrevSheet.addEventListener("mouseleave", () => {
        btnPrevSheet.style.backgroundColor = "#f7f7f7";
      });
      btnPrevSheet.addEventListener("click", (e) => {
        e.stopPropagation();
        moverWrapperAHojaAnterior(wrapper);
      });

      // Botón para centrar el dibujo dentro del marco
      const btnCenter = document.createElement("button");
      btnCenter.textContent = "◎";
      btnCenter.title = "Centrar dibujo";
      btnCenter.style.width = "22px";
      btnCenter.style.height = "22px";
      btnCenter.style.padding = "0";
      btnCenter.style.fontSize = "14px";
      btnCenter.style.borderRadius = "3px";
      btnCenter.style.border = "1px solid #666";
      btnCenter.style.backgroundColor = "#f7f7f7";
      btnCenter.style.cursor = "pointer";
      btnCenter.style.transition = "all 0.2s";
      btnCenter.addEventListener("mouseenter", () => {
        btnCenter.style.backgroundColor = "#ececec";
      });
      btnCenter.addEventListener("mouseleave", () => {
        btnCenter.style.backgroundColor = "#f7f7f7";
      });
      btnCenter.addEventListener("click", (e) => {
        e.stopPropagation();
        centrarDibujoEnMarco(wrapper);
      });

      // Botón para eliminar
      const btnDelete = document.createElement("button");
      btnDelete.textContent = "✕";
      btnDelete.title = "Eliminar";
      btnDelete.style.width = "22px";
      btnDelete.style.height = "22px";
      btnDelete.style.padding = "0";
      btnDelete.style.fontSize = "16px";
      btnDelete.style.borderRadius = "3px";
      btnDelete.style.border = "1px solid #999";
      btnDelete.style.backgroundColor = "#fff";
      btnDelete.style.color = "#d00";
      btnDelete.style.cursor = "pointer";
      btnDelete.style.transition = "all 0.2s";
      btnDelete.addEventListener("mouseenter", () => {
        btnDelete.style.backgroundColor = "#ffeeee";
        btnDelete.style.color = "#a00";
      });
      btnDelete.addEventListener("mouseleave", () => {
        btnDelete.style.backgroundColor = "#fff";
        btnDelete.style.color = "#d00";
      });
      btnDelete.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("¿Eliminar este dibujo exportado?")) {
          wrapper.remove();
          console.log("✓ Dibujo eliminado");
        }
      });

      toolbar.appendChild(btnApply);
      toolbar.appendChild(btnZoomIn);
      toolbar.appendChild(btnZoomOut);
      toolbar.appendChild(btnResize);
      toolbar.appendChild(btnNextSheet);
      toolbar.appendChild(btnPrevSheet);
      toolbar.appendChild(btnCenter);
      toolbar.appendChild(btnDelete);
      wrapper.appendChild(toolbar);

      // Hacer que el dibujo sea movible
      hacerMovible(wrapper);

      // Nota: El zoom con ruedita fue removido porque causaba conflictos durante el arrastre
      // Usa los botones +/- en la toolbar para controlar el zoom de forma segura

      // No se elimina el dibujo anterior; permitimos múltiples exportaciones independientes.
      // Cada exportación crea un nuevo wrapper dentro de la hoja A4.
      // Si deseas eliminar un dibujo, usa el botón ✕ en la toolbar de ese dibujo.

      // Limpiar el hint inicial solo si existe.
      const hint = a4RightDraw.querySelector(".draw-hint");
      if (hint) {
        hint.remove();
      }

      // Crear o reutilizar un contenedor fijo en la hoja para exportaciones
      let exportContainer = a4Sheet.querySelector(".a4-exported-drawings");
      if (!exportContainer) {
        exportContainer = document.createElement("div");
        exportContainer.className = "a4-exported-drawings";
        exportContainer.style.position = "absolute";
        exportContainer.style.top = "10px";
        exportContainer.style.right = "10px";
        exportContainer.style.display = "flex";
        exportContainer.style.flexDirection = "column";
        exportContainer.style.alignItems = "flex-end";
        exportContainer.style.gap = "10px";
        exportContainer.style.pointerEvents = "auto";
        exportContainer.style.zIndex = "2";
        a4Sheet.appendChild(exportContainer);
      }

      exportContainer.appendChild(wrapper);

      // Calcular escala después de que el wrapper esté en el DOM
      setTimeout(() => {
        const contenedorInternoElm = wrapper.querySelector(
          '[data-contenedor-interno="true"]',
        );
        if (contenedorInternoElm) {
          // Resetear zoom a 1.0 (sin zoom)
          wrapper.dataset.zoomLevel = "1.0";
          calcularYAplicarEscala(wrapper, contenedorInternoElm);
          console.log("✓ Escala inicial calculada - Zoom resetado a 1.0");
        } else {
          console.warn(
            "⚠️ No se encontró contenedor interno para escala inicial",
          );
        }
      }, 50);

      console.log("✅ Dibujo exportado correctamente");
      alert(
        "✓ Dibujo exportado a la hoja. Puedes arrastrarlo, redimensionarlo y eliminarlo.",
      );
    } catch (error) {
      console.error("❌ Error en exportarDibujo:", error);
      alert("❌ Error al exportar: " + error.message);
    }
  }

  /**
   * Calcula la escala para que el dibujo quepa en el área disponible
   */
  function getScaleForExport(ancho, alto) {
    if (ancho <= 0 || alto <= 0) return 1;
    const maxAncho = 220;
    const maxAlto = 170;
    const escalaAncho = maxAncho / ancho;
    const escalaAlto = maxAlto / alto;
    return Math.min(escalaAncho, escalaAlto, 1);
  }

  function moverWrapperASiguienteHoja(wrapper) {
    if (!wrapper) return;

    const currentSheet = wrapper.closest(".a4-sheet");
    if (!currentSheet) return;

    const pagesContainer =
      currentSheet.closest(".a4-pages") ||
      document.querySelector(".template-block .a4-pages");
    if (!pagesContainer) return;

    const sheets = Array.from(
      pagesContainer.querySelectorAll(":scope > .a4-sheet"),
    );
    const currentIndex = sheets.indexOf(currentSheet);
    let nextSheet = sheets[currentIndex + 1];

    if (!nextSheet) {
      const newPage = document.createElement("div");
      newPage.className = "a4-sheet";
      newPage.dataset.page = String(sheets.length + 1);
      newPage.innerHTML = `
        <div class="a4-content">
          <div class="a4-left"><strong>Nombre proyecto</strong></div>
          <div class="a4-right-draw"><em class="draw-hint">Área para dibujo (AQUÍ)</em></div>
        </div>
      `;
      pagesContainer.appendChild(newPage);
      nextSheet = newPage;
    }

    let currentExportContainer = currentSheet.querySelector(
      ".a4-exported-drawings",
    );
    let nextExportContainer = nextSheet.querySelector(".a4-exported-drawings");

    if (!nextExportContainer) {
      nextExportContainer = document.createElement("div");
      nextExportContainer.className = "a4-exported-drawings";
      nextExportContainer.style.position = "absolute";
      nextExportContainer.style.top = "10px";
      nextExportContainer.style.right = "10px";
      nextExportContainer.style.display = "flex";
      nextExportContainer.style.flexDirection = "column";
      nextExportContainer.style.alignItems = "flex-end";
      nextExportContainer.style.gap = "10px";
      nextExportContainer.style.pointerEvents = "auto";
      nextExportContainer.style.zIndex = "2";
      nextSheet.appendChild(nextExportContainer);
    }

    if (currentExportContainer?.contains(wrapper)) {
      currentExportContainer.removeChild(wrapper);
    }

    nextExportContainer.appendChild(wrapper);
    wrapper.style.zIndex = "10";
    nextSheet.style.zIndex = "1";
    currentSheet.style.zIndex = "1";
  }

  function moverWrapperAHojaAnterior(wrapper) {
    if (!wrapper) return;

    const currentSheet = wrapper.closest(".a4-sheet");
    if (!currentSheet) return;

    const pagesContainer =
      currentSheet.closest(".a4-pages") ||
      document.querySelector(".template-block .a4-pages");
    if (!pagesContainer) return;

    const sheets = Array.from(
      pagesContainer.querySelectorAll(":scope > .a4-sheet"),
    );
    const currentIndex = sheets.indexOf(currentSheet);
    if (currentIndex <= 0) return;

    const prevSheet = sheets[currentIndex - 1];
    if (!prevSheet) return;

    let currentExportContainer = currentSheet.querySelector(
      ".a4-exported-drawings",
    );
    let prevExportContainer = prevSheet.querySelector(".a4-exported-drawings");

    if (!prevExportContainer) {
      prevExportContainer = document.createElement("div");
      prevExportContainer.className = "a4-exported-drawings";
      prevExportContainer.style.position = "absolute";
      prevExportContainer.style.top = "10px";
      prevExportContainer.style.right = "10px";
      prevExportContainer.style.display = "flex";
      prevExportContainer.style.flexDirection = "column";
      prevExportContainer.style.alignItems = "flex-end";
      prevExportContainer.style.gap = "10px";
      prevExportContainer.style.pointerEvents = "auto";
      prevExportContainer.style.zIndex = "2";
      prevSheet.appendChild(prevExportContainer);
    }

    if (currentExportContainer?.contains(wrapper)) {
      currentExportContainer.removeChild(wrapper);
    }

    prevExportContainer.appendChild(wrapper);
    wrapper.style.zIndex = "10";
    prevSheet.style.zIndex = "1";
    currentSheet.style.zIndex = "1";
  }

  function centrarDibujoEnMarco(wrapper) {
    if (!wrapper) return;

    wrapper._contentOffsetX = 0;
    wrapper._contentOffsetY = 0;
    wrapper.dataset.contentOffsetX = "0";
    wrapper.dataset.contentOffsetY = "0";

    const contenedorInterno =
      wrapper._contenedorInterno ||
      wrapper.querySelector('[data-contenedor-interno="true"]');

    if (contenedorInterno) {
      calcularYAplicarEscala(wrapper, contenedorInterno);
    }
  }

  /**
   * Aplica el dibujo: oculta controles y permite vista limpia
   */
  function aplicarDibujo(wrapper) {
    wrapper.dataset.isApplied = "true";

    // Ocultar toolbar pero mantener su espacio para no cambiar el tamaño del wrapper
    const toolbar = wrapper.querySelector("[data-toolbar]");
    if (toolbar) {
      toolbar.style.visibility = "hidden";
      toolbar.style.pointerEvents = "none";
    }

    // Deshabilitar botones de zoom
    if (wrapper._btnZoomIn) wrapper._btnZoomIn.disabled = true;
    if (wrapper._btnZoomOut) wrapper._btnZoomOut.disabled = true;

    // Mantener padding y border para preservar tamaño exacto del wrapper
    wrapper.classList.remove("editing");
    wrapper.classList.add("applied");
    wrapper.style.cursor = "pointer";

    // El contenedor interno mantiene sus propiedades de escala
    // No modificamos width/height para no romper el escalado

    // Remover listeners de movimiento
    if (wrapper.hacerMovibleHandler) {
      wrapper.removeEventListener("mousedown", wrapper.hacerMovibleHandler);
    }
    if (wrapper.handleMouseMove_internal) {
      wrapper.removeEventListener(
        "mousemove",
        wrapper.handleMouseMove_internal,
      );
    }
    if (wrapper.handleMouseMove) {
      document.removeEventListener("mousemove", wrapper.handleMouseMove);
    }
    if (wrapper.handleMouseUp) {
      document.removeEventListener("mouseup", wrapper.handleMouseUp);
    }

    // Agregar listener para doble clic para volver a editar
    const applyClickListener = (e) => {
      if (e.target.closest("button")) return;
      if (e.detail < 2) return;
      restablecerDibujo(wrapper);
    };
    wrapper._applyClickListener = applyClickListener;
    wrapper.addEventListener("dblclick", applyClickListener);

    console.log("✓ Dibujo aplicado - vista limpia activada");
  }

  /**
   * Restaura los controles del dibujo
   */
  function restablecerDibujo(wrapper) {
    wrapper.dataset.isApplied = "false";

    // Mostrar toolbar restaurando visibilidad
    const toolbar = wrapper.querySelector("[data-toolbar]");
    if (toolbar) {
      toolbar.style.visibility = "visible";
      toolbar.style.pointerEvents = "auto";
    }

    // Restaurar borde y estilo de edición
    wrapper.classList.remove("applied");
    wrapper.classList.add("editing");
    wrapper.style.cursor = "grab";

    // Restaurar el contenedor interno
    const contenedorInterno = wrapper.querySelector(
      '[data-contenedor-interno="true"]',
    );
    if (contenedorInterno) {
      const origWidth = parseFloat(contenedorInterno.dataset.originalWidth);
      const origHeight = parseFloat(contenedorInterno.dataset.originalHeight);
      contenedorInterno.style.width = origWidth + "px";
      contenedorInterno.style.height = origHeight + "px";

      // Recalcular escala
      calcularYAplicarEscala(wrapper, contenedorInterno);
    }

    // REMOVER TODOS LOS LISTENERS ANTIGUOS DE FORMA SEGURA
    if (wrapper.handleMouseMove) {
      document.removeEventListener("mousemove", wrapper.handleMouseMove);
    }
    if (wrapper.handleMouseUp) {
      document.removeEventListener("mouseup", wrapper.handleMouseUp);
    }
    if (wrapper.handleContentMouseMove) {
      document.removeEventListener("mousemove", wrapper.handleContentMouseMove);
    }
    if (wrapper.hacerMovibleHandler) {
      wrapper.removeEventListener("mousedown", wrapper.hacerMovibleHandler);
    }
    if (wrapper.handleMouseMove_internal) {
      wrapper.removeEventListener(
        "mousemove",
        wrapper.handleMouseMove_internal,
      );
    }
    if (wrapper.handleContentMove) {
      wrapper.removeEventListener("mousedown", wrapper.handleContentMove);
    }
    if (wrapper.handleWheel) {
      wrapper.removeEventListener("wheel", wrapper.handleWheel);
    }

    // Remover listener de click que fue añadido en aplicarDibujo
    wrapper.removeEventListener("click", wrapper._applyClickListener);

    // Habilitar botones de zoom nuevamente
    if (wrapper._btnZoomIn) wrapper._btnZoomIn.disabled = false;
    if (wrapper._btnZoomOut) wrapper._btnZoomOut.disabled = false;

    // Restaurar listeners
    hacerMovible(wrapper);

    console.log("✓ Dibujo restaurado - controles visibles nuevamente");
  }

  /**
   * Aplica zoom al dibujo exportado
   * @param {HTMLElement} wrapper - El elemento wrapper del dibujo
   * @param {number} delta - Cambio en el nivel de zoom (ej: 0.1 para aumentar, -0.1 para disminuir)
   */
  function aplicarZoom(wrapper, delta) {
    // Bloquear si el dibujo está aplicado
    if (wrapper.dataset.isApplied === "true") {
      return;
    }
    // BLOQUEAR ABSOLUTAMENTE si se está moviendo el contenido con click derecho
    if (wrapper._isMovingContent) {
      console.log(
        "🔒 aplicarZoom bloqueada completamente - movimiento en progreso",
      );
      return;
    }

    const currentZoom = parseFloat(wrapper.dataset.zoomLevel) || 1;
    let newZoom = currentZoom + delta;

    // Limitar el zoom entre 0.2x y 3x
    newZoom = Math.max(0.2, Math.min(3, newZoom));

    wrapper.dataset.zoomLevel = newZoom.toFixed(2);

    // Recalcular y aplicar la escala con el nuevo zoom
    const contenedorInterno =
      wrapper._contenedorInterno ||
      wrapper.querySelector('[data-contenedor-interno="true"]');
    calcularYAplicarEscala(wrapper, contenedorInterno);

    console.log("🔍 Zoom ajustado: " + newZoom.toFixed(2) + "x");
  }

  /**
   * Calcula y aplica la escala del contenedor interno basado en el tamaño del wrapper
   */
  function calcularYAplicarEscala(wrapper, contenedorInterno) {
    // 🔒 BLOQUEAR COMPLETAMENTE mientras se está moviendo el contenido
    if (wrapper._isMovingContent) {
      console.log(
        "🔒 calcularYAplicarEscala bloqueada - movimiento en progreso",
      );
      return;
    }

    // Usar referencia guardada o parámetro
    if (!contenedorInterno && wrapper._contenedorInterno) {
      contenedorInterno = wrapper._contenedorInterno;
      console.log("🔍 Usando referencia guardada _contenedorInterno");
    }

    // Buscar el contenedor si no se encontró
    if (!contenedorInterno) {
      contenedorInterno = wrapper.querySelector(
        '[data-contenedor-interno="true"]',
      );
      console.log(
        "🔍 Buscando con querySelector - encontrado:",
        !!contenedorInterno,
      );
    }

    if (!contenedorInterno) {
      console.warn("⚠️ No se encontró contenedor interno en absoluto");
      return;
    }

    // Leer los datos de dimensiones originales
    const origWidthStr = contenedorInterno.dataset.originalWidth;
    const origHeightStr = contenedorInterno.dataset.originalHeight;

    console.log(
      "🔍 Debug - dataset.originalWidth:",
      origWidthStr,
      "dataset.originalHeight:",
      origHeightStr,
    );

    const origWidth = parseFloat(origWidthStr);
    const origHeight = parseFloat(origHeightStr);

    // Obtener estilos calculados reales
    const computedStyle = window.getComputedStyle(wrapper);
    const padding = parseFloat(computedStyle.paddingTop) || 8;
    const borderWidth = parseFloat(computedStyle.borderTopWidth) || 2;

    const totalPaddingBorder = (padding + borderWidth) * 2;
    const availableWidth = wrapper.offsetWidth - totalPaddingBorder;
    const availableHeight = wrapper.offsetHeight - totalPaddingBorder;

    console.log(
      "📐 Wrapper interior: " +
        availableWidth.toFixed(0) +
        "x" +
        availableHeight.toFixed(0) +
        "px, Original: " +
        origWidth.toFixed(0) +
        "x" +
        origHeight.toFixed(0) +
        "px",
    );

    if (
      origWidth <= 0 ||
      origHeight <= 0 ||
      availableWidth <= 0 ||
      availableHeight <= 0 ||
      isNaN(origWidth) ||
      isNaN(origHeight)
    ) {
      console.warn(
        "⚠️ Dimensiones inválidas - origWidth:" +
          origWidth +
          " origHeight:" +
          origHeight,
      );
      return;
    }

    const scaleX = availableWidth / origWidth;
    const scaleY = availableHeight / origHeight;
    const baseScale = Math.min(scaleX, scaleY);

    // Considerar el nivel de zoom
    let zoomLevel = parseFloat(wrapper.dataset.zoomLevel) || 1;

    // Si estamos arrastrando, usar el zoom congelado para evitar cambios
    if (wrapper._isMovingContent && wrapper._frozenZoomLevel) {
      zoomLevel = wrapper._frozenZoomLevel;
      console.log("🔒 Usando zoom congelado durante arrastre:", zoomLevel);
    }

    const finalScale = baseScale * zoomLevel;

    // Obtener los offsets de movimiento del contenido
    const offsetX = wrapper._contentOffsetX || 0;
    const offsetY = wrapper._contentOffsetY || 0;

    console.log(
      "📏 ScaleX: " +
        scaleX.toFixed(4) +
        " | ScaleY: " +
        scaleY.toFixed(4) +
        " | Base: " +
        baseScale.toFixed(4) +
        " | Zoom: " +
        zoomLevel.toFixed(2) +
        " | Final: " +
        finalScale.toFixed(4),
    );

    // Aplicar la escala con transform, incluyendo los offsets de movimiento
    contenedorInterno.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${finalScale})`;

    console.log(
      "✅ Escala aplicada: " +
        finalScale.toFixed(4) +
        " | Offset: (" +
        offsetX +
        "px, " +
        offsetY +
        "px)",
    );
  }

  /**
   * Hace que un elemento sea movible con drag y se escale al cambiar tamaño
   */
  function actualizarPosicionArrastre(wrapper) {
    if (wrapper.style.left) {
      wrapper.dataset.dragLeft = wrapper.style.left;
    }
    if (wrapper.style.top) {
      wrapper.dataset.dragTop = wrapper.style.top;
    }
    if (wrapper.style.position) {
      wrapper.dataset.dragPosition = wrapper.style.position;
    }
  }

  function hacerMovible(wrapper) {
    let isMoving = false;
    let startX = 0;
    let startY = 0;
    let isMovingContent = false;
    let contentStartX = 0;
    let contentStartY = 0;

    // Inicializar offsets para el movimiento del contenido sin borrar un estado ya restaurado
    const savedOffsetX = parseFloat(
      wrapper.dataset.contentOffsetX || wrapper._contentOffsetX || 0,
    );
    const savedOffsetY = parseFloat(
      wrapper.dataset.contentOffsetY || wrapper._contentOffsetY || 0,
    );
    wrapper._contentOffsetX = Number.isFinite(savedOffsetX) ? savedOffsetX : 0;
    wrapper._contentOffsetY = Number.isFinite(savedOffsetY) ? savedOffsetY : 0;
    wrapper._isMovingContent = false;

    const hacerMovibleHandler = (e) => {
      // Solo responder a click izquierdo
      if (e.button !== 0) return;

      if (e.target.closest("button")) {
        return;
      }

      isMoving = true;

      // Asegurar que el wrapper sea absolute
      if (wrapper.style.position !== "absolute") {
        wrapper.style.position = "absolute";
        // Usar la posición actual en viewport
        const wrapperRect = wrapper.getBoundingClientRect();
        const parent = wrapper.offsetParent || document.body;
        const parentRect = parent.getBoundingClientRect();
        wrapper.style.left = wrapperRect.left - parentRect.left + "px";
        wrapper.style.top = wrapperRect.top - parentRect.top + "px";
        wrapper.style.margin = "0";
        actualizarPosicionArrastre(wrapper);
      }

      // Guardar la posición inicial en coordenadas viewport (no relativas)
      startX = e.clientX;
      startY = e.clientY;

      wrapper.style.cursor = "grabbing";
      wrapper.style.opacity = "0.95";
      wrapper.style.zIndex = "1000";
      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isMoving) return;

      const parent = wrapper.offsetParent || document.body;
      const parentRect = parent.getBoundingClientRect();

      // Calcular delta en viewport
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Convertir delta a coordenadas del offsetParent
      const currentLeft = parseFloat(wrapper.style.left) || 0;
      const currentTop = parseFloat(wrapper.style.top) || 0;

      wrapper.style.left = currentLeft + deltaX + "px";
      wrapper.style.top = currentTop + deltaY + "px";
      wrapper.style.margin = "0";
      actualizarPosicionArrastre(wrapper);

      // Actualizar los puntos de inicio para el siguiente movimiento
      startX = e.clientX;
      startY = e.clientY;
    };

    const handleMouseUp = () => {
      if (isMoving) {
        isMoving = false;
        wrapper.style.cursor = "grab";
        wrapper.style.opacity = "1";
        actualizarPosicionArrastre(wrapper);
      }
      if (isMovingContent) {
        isMovingContent = false;
        wrapper._isMovingContent = false;
        wrapper._frozenZoomLevel = undefined;
        wrapper._frozenTransform = undefined;
        wrapper.style.cursor = "grab";

        // Habilitar botones de zoom nuevamente después del arrastre
        if (wrapper._btnZoomIn) wrapper._btnZoomIn.disabled = false;
        if (wrapper._btnZoomOut) wrapper._btnZoomOut.disabled = false;

        console.log("🔓 Transform descongelado - botones rehabilitados");
      }
    };

    const handleMouseMove_internal = (e) => {
      if (!isMoving && !e.target.closest("button")) {
        if (e.offsetX >= 0 && e.offsetY >= 0) {
          wrapper.style.cursor = "grab";
        }
      }
    };

    // Handler para mover el contenido con click derecho
    const handleContentMove = (e) => {
      if (e.button !== 2) return; // Solo click derecho
      if (e.target.closest("button")) return;

      // Bloquear el movimiento del contenido si el dibujo está aplicado
      if (wrapper.dataset.isApplied === "true") {
        return;
      }

      isMovingContent = true;
      wrapper._isMovingContent = true;

      // Congelar el zoom para que no cambie durante el arrastre
      wrapper._frozenZoomLevel = parseFloat(wrapper.dataset.zoomLevel) || 1;

      // CRÍTICO: Guardar el transform actual ANTES de arrastrar
      // para que no pueda cambiar durante el movimiento
      const contenedorInterno = wrapper._contenedorInterno;
      if (contenedorInterno) {
        wrapper._frozenTransform = contenedorInterno.style.transform;
        console.log(
          "🔒 Transform congelado durante arrastre:",
          wrapper._frozenTransform,
        );
      }

      contentStartX = e.clientX;
      contentStartY = e.clientY;
      wrapper.style.cursor = "grabbing";

      // Deshabilitar botones de zoom durante el arrastre
      if (wrapper._btnZoomIn) wrapper._btnZoomIn.disabled = true;
      if (wrapper._btnZoomOut) wrapper._btnZoomOut.disabled = true;

      e.preventDefault();
    };

    const handleContentMouseMove = (e) => {
      if (!isMovingContent) return;

      const deltaX = e.clientX - contentStartX;
      const deltaY = e.clientY - contentStartY;

      // Obtener el zoom actual para hacer el movimiento inversamente proporcional
      const zoomLevel =
        wrapper._frozenZoomLevel || parseFloat(wrapper.dataset.zoomLevel) || 1;

      // Dividir el movimiento por el zoom para que sea más controlado
      wrapper._contentOffsetX += deltaX / zoomLevel;
      wrapper._contentOffsetY += deltaY / zoomLevel;

      // Permitir un rango mucho mayor de movimiento para click derecho
      const maxOffset = Math.max(
        1000,
        Math.min(wrapper.offsetWidth, wrapper.offsetHeight) * 2.5,
      );
      wrapper._contentOffsetX = Math.max(
        -maxOffset,
        Math.min(maxOffset, wrapper._contentOffsetX),
      );
      wrapper._contentOffsetY = Math.max(
        -maxOffset,
        Math.min(maxOffset, wrapper._contentOffsetY),
      );

      wrapper.dataset.contentOffsetX = wrapper._contentOffsetX.toFixed(2);
      wrapper.dataset.contentOffsetY = wrapper._contentOffsetY.toFixed(2);

      contentStartX = e.clientX;
      contentStartY = e.clientY;

      // CRÍTICO: Actualizar SOLO la posición, preservando el scale congelado
      const contenedorInterno = wrapper._contenedorInterno;
      if (contenedorInterno && wrapper._frozenTransform) {
        // Extraer solo el scale del transform congelado y aplicar nuevas posiciones
        // Buscar el patrón "scale(...)" en el transform congelado
        const scaleMatch = wrapper._frozenTransform.match(/scale\(([\d.]+)\)/);
        const frozenScale = scaleMatch ? scaleMatch[1] : zoomLevel;

        // Crear nuevo transform que actualiza SOLO la traducción
        contenedorInterno.style.transform = `translate(calc(-50% + ${wrapper._contentOffsetX}px), calc(-50% + ${wrapper._contentOffsetY}px)) scale(${frozenScale})`;
      }
    };

    wrapper.addEventListener("mousedown", hacerMovibleHandler);
    wrapper.addEventListener("contextmenu", (e) => {
      // Prevenir el menú contextual habitual
      if (!e.target.closest("button")) {
        e.preventDefault();
      }
    });
    wrapper.addEventListener("mousedown", handleContentMove);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousemove", handleContentMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    wrapper.addEventListener("mousemove", handleMouseMove_internal);

    // Handler para rueda del ratón - zoom con scroll
    const handleWheel = (e) => {
      // Bloquear zoom si el dibujo está aplicado
      if (wrapper.dataset.isApplied === "true") {
        return;
      }
      // No permitir zoom si está en proceso de arrastre
      if (wrapper._isMovingContent) {
        return;
      }

      e.preventDefault();

      // Determinar dirección: arriba = zoom in, abajo = zoom out
      const delta = e.deltaY > 0 ? -0.05 : 0.05;

      aplicarZoom(wrapper, delta);
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });

    // Guardar handlers para poder removerlos después
    wrapper.hacerMovibleHandler = hacerMovibleHandler;
    wrapper.handleMouseMove = handleMouseMove;
    wrapper.handleMouseUp = handleMouseUp;
    wrapper.handleMouseMove_internal = handleMouseMove_internal;
    wrapper.handleContentMove = handleContentMove;
    wrapper.handleContentMouseMove = handleContentMouseMove;
    wrapper.handleWheel = handleWheel;
  }

  /**
   * Adjunta controles interactivos y eventos a un wrapper restaurado desde storage
   */
  function restoreExportedWrapper(wrapper) {
    if (!wrapper || wrapper._interactiveRestored) return;
    wrapper._interactiveRestored = true;

    const contenedorInterno = wrapper.querySelector(
      '[data-contenedor-interno="true"]',
    );
    if (!contenedorInterno) {
      console.warn(
        "⚠️ No se encontró el contenedor interno en el wrapper restaurado",
      );
      return;
    }

    wrapper._contenedorInterno = contenedorInterno;
    const savedOffsetX = parseFloat(
      wrapper.dataset.contentOffsetX || wrapper._contentOffsetX || 0,
    );
    const savedOffsetY = parseFloat(
      wrapper.dataset.contentOffsetY || wrapper._contentOffsetY || 0,
    );
    wrapper._contentOffsetX = Number.isFinite(savedOffsetX) ? savedOffsetX : 0;
    wrapper._contentOffsetY = Number.isFinite(savedOffsetY) ? savedOffsetY : 0;
    wrapper._isMovingContent = false;
    wrapper._frozenZoomLevel = undefined;
    wrapper._frozenTransform = undefined;

    const existingToolbar = wrapper.querySelector("[data-toolbar]");
    if (existingToolbar) existingToolbar.remove();

    const toolbar = document.createElement("div");
    toolbar.className = "dibujo-toolbar";
    toolbar.style.position = "absolute";
    toolbar.style.top = "3px";
    toolbar.style.right = "3px";
    toolbar.style.display = "flex";
    toolbar.style.gap = "4px";
    toolbar.style.zIndex = "101";
    toolbar.dataset.toolbar = true;

    const btnApply = document.createElement("button");
    btnApply.textContent = "✓";
    btnApply.title = "Aplicar";
    btnApply.style.width = "22px";
    btnApply.style.height = "22px";
    btnApply.style.padding = "0";
    btnApply.style.fontSize = "16px";
    btnApply.style.borderRadius = "3px";
    btnApply.style.border = "1px solid #090";
    btnApply.style.backgroundColor = "#0f0";
    btnApply.style.color = "#009900";
    btnApply.style.cursor = "pointer";
    btnApply.style.transition = "all 0.2s";
    btnApply.style.fontWeight = "bold";
    btnApply.addEventListener("mouseenter", () => {
      btnApply.style.backgroundColor = "#0d0";
      btnApply.style.borderColor = "#060";
    });
    btnApply.addEventListener("mouseleave", () => {
      btnApply.style.backgroundColor = "#0f0";
      btnApply.style.borderColor = "#090";
    });
    btnApply.addEventListener("click", (e) => {
      e.stopPropagation();
      aplicarDibujo(wrapper);
    });

    const btnResize = document.createElement("button");
    btnResize.textContent = "⧂";
    btnResize.title = "Redimensionar";
    btnResize.style.width = "22px";
    btnResize.style.height = "22px";
    btnResize.style.padding = "2px";
    btnResize.style.fontSize = "14px";
    btnResize.style.borderRadius = "3px";
    btnResize.style.border = "1px solid #999";
    btnResize.style.backgroundColor = "#f0f0f0";
    btnResize.style.cursor = "pointer";
    btnResize.style.transition = "all 0.2s";
    btnResize.addEventListener("mouseenter", () => {
      btnResize.style.backgroundColor = "#e0e0e0";
    });
    btnResize.addEventListener("mouseleave", () => {
      btnResize.style.backgroundColor = "#f0f0f0";
    });
    btnResize.addEventListener("click", (e) => {
      e.stopPropagation();
      iniciarRedimensionamiento(wrapper, e);
    });

    const btnZoomIn = document.createElement("button");
    btnZoomIn.textContent = "+";
    btnZoomIn.title = "Zoom +";
    btnZoomIn.style.width = "22px";
    btnZoomIn.style.height = "22px";
    btnZoomIn.style.padding = "0";
    btnZoomIn.style.fontSize = "16px";
    btnZoomIn.style.borderRadius = "3px";
    btnZoomIn.style.border = "1px solid #0066ff";
    btnZoomIn.style.backgroundColor = "#e6f2ff";
    btnZoomIn.style.color = "#0066ff";
    btnZoomIn.style.cursor = "pointer";
    btnZoomIn.style.transition = "all 0.2s";
    btnZoomIn.style.fontWeight = "bold";
    btnZoomIn.addEventListener("mouseenter", () => {
      btnZoomIn.style.backgroundColor = "#cce5ff";
      btnZoomIn.style.borderColor = "#0044cc";
    });
    btnZoomIn.addEventListener("mouseleave", () => {
      btnZoomIn.style.backgroundColor = "#e6f2ff";
      btnZoomIn.style.borderColor = "#0066ff";
    });
    btnZoomIn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (wrapper.dataset.isApplied === "true") return;
      if (wrapper._isMovingContent) return;
      aplicarZoom(wrapper, 0.1);
    });

    wrapper._btnZoomIn = btnZoomIn;

    const btnZoomOut = document.createElement("button");
    btnZoomOut.textContent = "−";
    btnZoomOut.title = "Zoom −";
    btnZoomOut.style.width = "22px";
    btnZoomOut.style.height = "22px";
    btnZoomOut.style.padding = "0";
    btnZoomOut.style.fontSize = "16px";
    btnZoomOut.style.borderRadius = "3px";
    btnZoomOut.style.border = "1px solid #ff6600";
    btnZoomOut.style.backgroundColor = "#fff0e6";
    btnZoomOut.style.color = "#ff6600";
    btnZoomOut.style.cursor = "pointer";
    btnZoomOut.style.transition = "all 0.2s";
    btnZoomOut.style.fontWeight = "bold";
    btnZoomOut.addEventListener("mouseenter", () => {
      btnZoomOut.style.backgroundColor = "#ffe6cc";
      btnZoomOut.style.borderColor = "#dd5500";
    });
    btnZoomOut.addEventListener("mouseleave", () => {
      btnZoomOut.style.backgroundColor = "#fff0e6";
      btnZoomOut.style.borderColor = "#ff6600";
    });
    btnZoomOut.addEventListener("click", (e) => {
      e.stopPropagation();
      if (wrapper.dataset.isApplied === "true") return;
      if (wrapper._isMovingContent) return;
      aplicarZoom(wrapper, -0.1);
    });

    wrapper._btnZoomOut = btnZoomOut;

    const btnNextSheet = document.createElement("button");
    btnNextSheet.textContent = "↓";
    btnNextSheet.title = "Mover a la siguiente hoja";
    btnNextSheet.style.width = "22px";
    btnNextSheet.style.height = "22px";
    btnNextSheet.style.padding = "0";
    btnNextSheet.style.fontSize = "14px";
    btnNextSheet.style.borderRadius = "3px";
    btnNextSheet.style.border = "1px solid #666";
    btnNextSheet.style.backgroundColor = "#f7f7f7";
    btnNextSheet.style.cursor = "pointer";
    btnNextSheet.style.transition = "all 0.2s";
    btnNextSheet.addEventListener("mouseenter", () => {
      btnNextSheet.style.backgroundColor = "#ececec";
    });
    btnNextSheet.addEventListener("mouseleave", () => {
      btnNextSheet.style.backgroundColor = "#f7f7f7";
    });
    btnNextSheet.addEventListener("click", (e) => {
      e.stopPropagation();
      moverWrapperASiguienteHoja(wrapper);
    });

    const btnPrevSheet = document.createElement("button");
    btnPrevSheet.textContent = "↑";
    btnPrevSheet.title = "Mover a la hoja anterior";
    btnPrevSheet.style.width = "22px";
    btnPrevSheet.style.height = "22px";
    btnPrevSheet.style.padding = "0";
    btnPrevSheet.style.fontSize = "14px";
    btnPrevSheet.style.borderRadius = "3px";
    btnPrevSheet.style.border = "1px solid #666";
    btnPrevSheet.style.backgroundColor = "#f7f7f7";
    btnPrevSheet.style.cursor = "pointer";
    btnPrevSheet.style.transition = "all 0.2s";
    btnPrevSheet.addEventListener("mouseenter", () => {
      btnPrevSheet.style.backgroundColor = "#ececec";
    });
    btnPrevSheet.addEventListener("mouseleave", () => {
      btnPrevSheet.style.backgroundColor = "#f7f7f7";
    });
    btnPrevSheet.addEventListener("click", (e) => {
      e.stopPropagation();
      moverWrapperAHojaAnterior(wrapper);
    });

    const btnCenter = document.createElement("button");
    btnCenter.textContent = "◎";
    btnCenter.title = "Centrar dibujo";
    btnCenter.style.width = "22px";
    btnCenter.style.height = "22px";
    btnCenter.style.padding = "0";
    btnCenter.style.fontSize = "14px";
    btnCenter.style.borderRadius = "3px";
    btnCenter.style.border = "1px solid #666";
    btnCenter.style.backgroundColor = "#f7f7f7";
    btnCenter.style.cursor = "pointer";
    btnCenter.style.transition = "all 0.2s";
    btnCenter.addEventListener("mouseenter", () => {
      btnCenter.style.backgroundColor = "#ececec";
    });
    btnCenter.addEventListener("mouseleave", () => {
      btnCenter.style.backgroundColor = "#f7f7f7";
    });
    btnCenter.addEventListener("click", (e) => {
      e.stopPropagation();
      centrarDibujoEnMarco(wrapper);
    });

    const btnDelete = document.createElement("button");
    btnDelete.textContent = "✕";
    btnDelete.title = "Eliminar";
    btnDelete.style.width = "22px";
    btnDelete.style.height = "22px";
    btnDelete.style.padding = "0";
    btnDelete.style.fontSize = "16px";
    btnDelete.style.borderRadius = "3px";
    btnDelete.style.border = "1px solid #999";
    btnDelete.style.backgroundColor = "#fff";
    btnDelete.style.color = "#d00";
    btnDelete.style.cursor = "pointer";
    btnDelete.style.transition = "all 0.2s";
    btnDelete.addEventListener("mouseenter", () => {
      btnDelete.style.backgroundColor = "#ffeeee";
      btnDelete.style.color = "#a00";
    });
    btnDelete.addEventListener("mouseleave", () => {
      btnDelete.style.backgroundColor = "#fff";
      btnDelete.style.color = "#d00";
    });
    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("¿Eliminar este dibujo exportado?")) {
        wrapper.remove();
      }
    });

    toolbar.appendChild(btnApply);
    toolbar.appendChild(btnZoomIn);
    toolbar.appendChild(btnZoomOut);
    toolbar.appendChild(btnResize);
    toolbar.appendChild(btnNextSheet);
    toolbar.appendChild(btnPrevSheet);
    toolbar.appendChild(btnCenter);
    toolbar.appendChild(btnDelete);

    wrapper.appendChild(toolbar);

    wrapper.style.pointerEvents = "auto";
    wrapper.style.cursor = "grab";
    wrapper.style.zIndex = "10";

    if (wrapper.dataset.isApplied === "true") {
      aplicarDibujo(wrapper);
    } else {
      restablecerDibujo(wrapper);
      // Garantizar que el wrapper quede movible después de restaurar
      if (!wrapper.hacerMovibleHandler) {
        hacerMovible(wrapper);
      }
    }

    // Asegurar estilo visual del estado actual del wrapper tras restaurar
    wrapper.classList.toggle("applied", wrapper.dataset.isApplied === "true");
    wrapper.classList.toggle("editing", wrapper.dataset.isApplied !== "true");

    if (contenedorInterno) {
      calcularYAplicarEscala(wrapper, contenedorInterno);
    }
  }

  function restoreExistingExportedWrappers() {
    const wrappers = document.querySelectorAll(".dibujo-wrapper");
    wrappers.forEach((wrapper) => {
      if (!wrapper.dataset?.isDibujoExportado) return;
      restoreExportedWrapper(wrapper);
    });
  }

  window.ExportarDibujo = {
    exportar: exportarDibujo,
    restoreWrapper: restoreExportedWrapper,
    restoreAll: restoreExistingExportedWrappers,
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      restoreExistingExportedWrappers,
    );
  } else {
    requestAnimationFrame(restoreExistingExportedWrappers);
  }

  // Escuchar evento personalizado para restaurar wrappers bajo demanda
  document.addEventListener("wrappers-restored", () => {
    try {
      restoreExistingExportedWrappers();
    } catch (err) {
      console.warn("⚠️ Error al procesar wrappers-restored:", err);
    }
  });

  /**
   * Inicia el redimensionamiento del wrapper y escala el contenido
   */
  function iniciarRedimensionamiento(wrapper, clickEvent) {
    console.log(
      "🔄 Iniciando redimensionamiento - posición wrapper:",
      wrapper.offsetWidth,
      "x",
      wrapper.offsetHeight,
    );

    const startWidth = wrapper.offsetWidth;
    const startHeight = wrapper.offsetHeight;
    const startX = clickEvent.clientX;
    const startY = clickEvent.clientY;

    // Usar referencia guardada
    let contenedorInterno = wrapper._contenedorInterno;
    if (!contenedorInterno) {
      console.warn("⚠️ No se encontró _contenedorInterno, buscando...");
      contenedorInterno = wrapper.querySelector(
        '[data-contenedor-interno="true"]',
      );
    }

    if (!contenedorInterno) {
      console.warn("⚠️ No se encontró contenedor interno en absoluto");
      return;
    }

    console.log("✓ Resize iniciado: startX=" + startX + ", startY=" + startY);

    // Marcar que estamos resizeando
    let isResizing = true;

    wrapper.style.cursor = "se-resize";
    wrapper.style.userSelect = "none";
    document.body.style.userSelect = "none";

    const onMouseMove = (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newWidth = Math.max(120, startWidth + deltaX);
      const newHeight = Math.max(100, startHeight + deltaY);

      wrapper.style.width = newWidth + "px";
      wrapper.style.height = newHeight + "px";

      // Recalcular escala dinámicamente mientras se redimensiona
      calcularYAplicarEscala(wrapper, contenedorInterno);
    };

    const onMouseUp = () => {
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      wrapper.style.cursor = "grab";
      wrapper.style.userSelect = "auto";
      document.body.style.userSelect = "auto";

      console.log(
        "✓ Redimensionamiento completado - nuevo tamaño: " +
          wrapper.offsetWidth +
          "x" +
          wrapper.offsetHeight,
      );
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    clickEvent.preventDefault();
    clickEvent.stopPropagation();
  }

  console.log("✅ H_exportar.js inicializado");
})();
