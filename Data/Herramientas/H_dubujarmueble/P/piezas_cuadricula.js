// piezas_cuadricula.js
(function () {
  const gridArea = document.getElementById("gridArea");
  if (!gridArea) return;

  function getScale() {
    return window.Grid?.scale() || 1;
  }
  function getOffset() {
    return window.Grid?.offset() || { x: 0, y: 0 };
  }

  function agregarPieza(p) {
    const pieza = document.createElement("div");
    pieza.className = "pieza-dibujada";
    pieza.style.position = "absolute";

    // ASIGNAR ID ÚNICO A LA PIEZA
    pieza.id =
      "pieza_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    console.log("Pieza creada con ID:", pieza.id);

    // Visibilidad por defecto (visible)
    pieza.dataset.visible = "true";

    // POSICIÓN CENTRADA EN LA VISTA
    const scale = getScale();
    const offset = getOffset();
    const gridRect = gridArea.getBoundingClientRect();
    const centerX = (gridRect.width / 2 - 60 - offset.x) / scale;
    const centerY = (gridRect.height / 2 - 20 - offset.y) / scale;

    pieza.dataset.x = centerX;
    pieza.dataset.y = centerY;

    // GUARDAR MÓDULO
    if (p.modulo) {
      pieza.dataset.modulo = p.modulo;
    }

    // Guardar nombre real de la pieza para restauración correcta
    const nombrePieza = p.nombre || "";
    if (nombrePieza) {
      pieza.dataset.nombre = nombrePieza;
    }

    // MEDIDAS
    const m1 = Math.max(parseFloat(p.med1) || 1, 1);
    const m2 = Math.max(parseFloat(p.med2) || 1, 1);
    // medida3: intentamos extraer número del campo 'material' (si el usuario lo ingresa como medida)
    let m3 = null;
    if (p.material !== undefined && p.material !== null) {
      const maybe = parseFloat(String(p.material).replace(",", "."));
      if (!isNaN(maybe)) m3 = Math.max(maybe, 1);
    }
    // guardamos las medidas originales y usaremos la perspectiva global para dibujar
    pieza.dataset.m1 = m1;
    pieza.dataset.m2 = m2;
    pieza.dataset.m3 = m3 === null ? "" : String(m3);

    // Guardar material
    pieza.dataset.material = p.material || "-";

    // Por defecto, cada pieza guarda su propia perspectiva de visualización.
    // Requerimiento: nuevas piezas se añaden con perspectiva "superior".
    pieza.dataset.displayPersp = "superior";
    const initialPersp =
      pieza.dataset.displayPersp || window.Perspectiva || "frontal";
    const dims = computeDisplayDimsFromDataset({
      m1,
      m2,
      m3,
      persp: initialPersp,
    });
    pieza.dataset.w = dims.w;
    pieza.dataset.h = dims.h;

    // ESTILOS
    pieza.style.background = "#ffffffcc";
    pieza.style.border = "1px solid #333";
    pieza.style.borderRadius = "0px";
    pieza.style.display = "flex";
    pieza.style.flexDirection = "column";
    pieza.style.alignItems = "center";
    pieza.style.justifyContent = "center";
    pieza.style.cursor = "default"; // no move

    // Asignar z-index a la capa más alta existente + 1
    const maxZ = Array.from(
      gridArea.querySelectorAll(".pieza-dibujada"),
    ).reduce((max, p) => Math.max(max, parseInt(p.style.zIndex) || 0), 0);
    pieza.style.zIndex = maxZ + 1;

    // NOMBRE Y MEDIDAS
    const nombreDiv = document.createElement("div");
    nombreDiv.className = "nombre-pieza";
    nombreDiv.innerText = nombrePieza;

    const medidasDiv = document.createElement("div");
    medidasDiv.className = "pieza-medidas";
    medidasDiv.innerText = formatMedidasText({
      m1,
      m2,
      m3,
      persp: pieza.dataset.displayPersp || window.Perspectiva || "frontal",
    });

    pieza.appendChild(nombreDiv);
    pieza.appendChild(medidasDiv);

    gridArea.appendChild(pieza);
    actualizarPiezas();

    // Dispara evento para actualizar panel derecho
    window.dispatchEvent(new CustomEvent("cuadricula-actualizada"));

    // Aplicar estado de detalles vigente
    if (window.ToggleDetalles) {
      window.ToggleDetalles.aplicar();
    }
  }

  function actualizarPiezas() {
    const scale = getScale();
    const offset = getOffset();
    gridArea.querySelectorAll(".pieza-dibujada").forEach((p) => {
      // TEXTOS: usar su lógica especial
      if (p.classList.contains("pieza-texto")) {
        if (p._aplicarDims) p._aplicarDims();
        return;
      }

      // PIEZAS NORMALES:
      const x = parseFloat(p.dataset.x) || 0;
      const y = parseFloat(p.dataset.y) || 0;
      const m1 = parseFloat(p.dataset.m1) || 1;
      const m2 = parseFloat(p.dataset.m2) || 1;
      const m3 = p.dataset.m3 ? parseFloat(p.dataset.m3) : null;

      // usamos la perspectiva asignada a cada pieza (si no tiene, fallback a global)
      const persp = p.dataset.displayPersp || window.Perspectiva || "frontal";
      const dims = computeDisplayDimsFromDataset({ m1, m2, m3, persp });

      p.dataset.w = dims.w;
      p.dataset.h = dims.h;

      p.style.width = dims.w * scale + "px";
      p.style.height = dims.h * scale + "px";
      p.style.left = x * scale + offset.x + "px";
      p.style.top = y * scale + offset.y + "px";

      // actualizar texto de medidas según la perspectiva de la pieza
      const md = p.querySelector(".pieza-medidas");
      if (md) md.innerText = formatMedidasText({ m1, m2, m3, persp });
    });
  }

  // escuchar cambios de perspectiva global: solo afectará a piezas seleccionadas (excepto textos)
  window.addEventListener("perspective-changed", (ev) => {
    const newPersp = ev?.detail?.perspective || window.Perspectiva || "frontal";
    const selectedPiezas = gridArea.querySelectorAll(
      ".pieza-dibujada.pieza-seleccionada:not(.pieza-texto)",
    );
    selectedPiezas.forEach((pieza) => {
      try {
        // asignar la nueva perspectiva sólo a las piezas seleccionadas (no textos)
        pieza.dataset.displayPersp = newPersp;
        actualizarPiezaIndividual(pieza);
      } catch (e) {
        console.warn("Error al actualizar pieza seleccionada", e);
      }
    });
  });

  // función para actualizar solo una pieza según perspectiva actual
  function actualizarPiezaIndividual(piezaEl) {
    const scale = getScale();
    const offset = getOffset();
    const x = parseFloat(piezaEl.dataset.x) || 0;
    const y = parseFloat(piezaEl.dataset.y) || 0;
    const m1 = parseFloat(piezaEl.dataset.m1) || 1;
    const m2 = parseFloat(piezaEl.dataset.m2) || 1;
    const m3 = piezaEl.dataset.m3 ? parseFloat(piezaEl.dataset.m3) : null;

    const persp = window.Perspectiva || "frontal";
    const dims = computeDisplayDimsFromDataset({ m1, m2, m3, persp });

    piezaEl.dataset.w = dims.w;
    piezaEl.dataset.h = dims.h;

    piezaEl.style.width = dims.w * scale + "px";
    piezaEl.style.height = dims.h * scale + "px";
    piezaEl.style.left = x * scale + offset.x + "px";
    piezaEl.style.top = y * scale + offset.y + "px";

    // actualizar texto de medidas según la perspectiva
    const md = piezaEl.querySelector(".pieza-medidas");
    if (md) md.innerText = formatMedidasText({ m1, m2, m3, persp });
  }

  // Helpers: calcular dimensiones de visualización según perspectiva
  function computeDisplayDimsFromDataset({ m1, m2, m3, persp }) {
    let w = m1;
    let h = m2;
    if (persp === "frontal") {
      w = m1;
      h = m3 !== null && m3 !== undefined ? m3 : m2;
    } else if (persp === "superior") {
      w = m1;
      h = m2;
    } else if (persp === "lateral") {
      w = m2;
      h = m3 !== null && m3 !== undefined ? m3 : m1;
    }
    return {
      w: Math.max(parseFloat(w) || 1, 1),
      h: Math.max(parseFloat(h) || 1, 1),
    };
  }

  function formatMedidasText({ m1, m2, m3, persp }) {
    if (persp === "frontal")
      return `${m1} × ${m3 !== null && m3 !== undefined ? m3 : "-"} (frontal)`;
    if (persp === "superior") return `${m1} × ${m2} (superior)`;
    if (persp === "lateral")
      return `${m2} × ${m3 !== null && m3 !== undefined ? m3 : "-"} (lateral)`;
    return `${m1} × ${m2}`;
  }

  function normalizeZIndices() {
    const piezas = Array.from(gridArea.querySelectorAll(".pieza-dibujada"));
    piezas
      .sort((a, b) => {
        const za = parseInt(a.style.zIndex) || 0;
        const zb = parseInt(b.style.zIndex) || 0;
        return za - zb;
      })
      .forEach((pieza, index) => {
        pieza.style.zIndex = index + 1;
      });
  }

  window.Cuadricula = {
    agregarPieza,
    actualizarPiezas,
    normalizeZIndices,
  };

  if (window.ToggleDetalles) window.ToggleDetalles.aplicar();
})();
