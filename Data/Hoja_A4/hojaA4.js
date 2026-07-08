/* copia.js - paginado A4 por filas (módulo fijo + contenedores por hoja), edición por POPUP */

(function () {
  // helpers
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const templates = document.getElementById("templates");
  const addA4Btn = document.getElementById("add-block");
  const removeA4Btn = document.getElementById("remove-last");
  const printBtn = document.getElementById("imprimir");
  const pdfBtn = document.getElementById("exportarPDF");

  // base DOM
  const firstTemplateBlock = document.querySelector(".template-block");
  const sidePanel = firstTemplateBlock.querySelector(".side-panel");
  const createModuloBtn = sidePanel.querySelector(".create-modulo");
  const moduloInput = sidePanel.querySelector(".modulo-nombre");
  const modulosList = sidePanel.querySelector("#modulos-list");
  const moduloActualSpan = sidePanel.querySelector(".modulo-actual");
  const datosModulo = sidePanel.querySelector(".datos-modulo");
  const acceptBtn = sidePanel.querySelector(".btn.accept");
  const backModuloBtn = sidePanel.querySelector(".back-modulo");

  // cuadro y lados (marco lateral)
  const cuadro = sidePanel.querySelector(".cuadro");
  const ladoEls = {
    top: cuadro.querySelector(".lado.top"),
    right: cuadro.querySelector(".lado.right"),
    bottom: cuadro.querySelector(".lado.bottom"),
    left: cuadro.querySelector(".lado.left"),
  };

  // canto mode elements
  const cantoGraficoDiv = sidePanel.querySelector("#canto-grafico");
  const cantoNumericoDiv = sidePanel.querySelector("#canto-numerico"); // puede ser null si no existe
  const toggleCantoModeBtn = sidePanel.querySelector("#toggle-canto-mode");
  const cantoNumMed1 = sidePanel.querySelector(".canto-num-med1");
  const cantoNumMed2 = sidePanel.querySelector(".canto-num-med2");
  let cantoMode = "numerico"; // 'grafico' or 'numerico'

  // Inicializar modo numérico desde el inicio
  if (cantoGraficoDiv) cantoGraficoDiv.style.display = "none";
  if (cantoNumericoDiv) cantoNumericoDiv.style.display = "block";
  cantoNumMed1.disabled = false;
  cantoNumMed2.disabled = false;
  toggleCantoModeBtn.textContent = "Modo gráfico";

  // inputs
  const cantidadInput = sidePanel.querySelector(".cantidad");
  const med1Input = sidePanel.querySelector(".med1");
  const med2Input = sidePanel.querySelector(".med2");
  const profundidadInput = sidePanel.querySelector(".profundidad-tabla");
  const nombreInput = sidePanel.querySelector(".nombre-tabla");
  const notasInput = sidePanel.querySelector(".ficha-input.notas");

  // counters
  const nameCounter = sidePanel.querySelector(".name-counter");
  const noteCounter = sidePanel.querySelector(".note-counter");
  const nameWarning = sidePanel.querySelector(".name-warning");
  const noteWarning = sidePanel.querySelector(".note-warning");

  // container of pages (A4)
  const a4PagesContainer = firstTemplateBlock.querySelector(".a4-pages");

  // modules index
  // entry = { name, headerEl, containers: [{el, pageEl}], createdAt }
  const modulesIndex = new Map();

  const A4_MARGIN_BOTTOM = 20; // px safe margin for calculations
  const DEFAULT_ROW_HEIGHT = 34; // approx px height of a row - used when measurement fails

  /* ----------------- UTIL: crear página A4 ----------------- */
  function createA4Page() {
    const pageNumber = a4PagesContainer.children.length + 1;
    const a4 = document.createElement("div");
    a4.className = "a4-sheet";
    a4.dataset.page = String(pageNumber);
    a4.innerHTML = `
      <div class="a4-content">
        <div class="a4-left"><strong>Nombre proyecto</strong></div>
        <div class="a4-right-draw"><em class="draw-hint">Área para dibujo (AQUÍ)</em></div>
      </div>
    `;
    a4PagesContainer.appendChild(a4);
    return a4;
  }

  /* ----------------- UTIL: encontrar página disponible ----------------- */
  // Intentamos encontrar una A4 con espacio >= neededHeight, comparando desde su contenido superior.
  function getAvailableA4ForHeight(neededHeight = 60) {
    for (const page of a4PagesContainer.children) {
      // compute used height inside the A4:
      const topRect = page.querySelector(".a4-content").getBoundingClientRect();
      const pageRect = page.getBoundingClientRect();

      // find last container element inside this page (.modulo-datos or .modulo-marco) to calculate used
      const lastContainer = page.querySelector(
        ":scope > .modulo-datos:last-of-type, :scope > .modulo-marco:last-of-type",
      );
      let used;
      if (lastContainer) {
        const lastRect = lastContainer.getBoundingClientRect();
        used = Math.max(
          lastRect.bottom - pageRect.top,
          topRect.bottom - pageRect.top,
        );
      } else {
        used = topRect.bottom - pageRect.top;
      }

      const available = page.clientHeight - A4_MARGIN_BOTTOM - used;
      if (available >= neededHeight) return page;
    }
    // si ninguna tiene espacio -> crear nueva
    return createA4Page();
  }

  /* ----------------- UTIL: crear encabezado del módulo (permanece en su hoja) ----------------- */
  function createModuleHeaderOnPage(modName, pageEl) {
    const moduloMarco = document.createElement("div");
    moduloMarco.className = "modulo-marco";
    moduloMarco.dataset.modulo = modName;

    const tituloRow = document.createElement("div");
    tituloRow.className = "modulo-titulo-row";
    tituloRow.innerHTML = `
      <h4 style="margin:0">${escapeHtml(modName)}</h4>
      <div class="module-title-actions">
        <button class="btn ghost btn-delete-module" title="Eliminar módulo"><i class="fas fa-trash-alt"></i></button>
      </div>
    `;
    moduloMarco.appendChild(tituloRow);

    const headers = document.createElement("div");
    headers.className = "modulo-headers";
    headers.innerHTML = buildModuleHeadersHtml();
    moduloMarco.appendChild(headers);

    pageEl.appendChild(moduloMarco);

    // eliminar módulo: borrar header y todos sus containers (en todas las A4)
    tituloRow
      .querySelector(".btn-delete-module")
      .addEventListener("click", () => {
        if (!confirm(`Eliminar módulo "${modName}" y todas sus filas?`)) return;
        const entry = modulesIndex.get(modName);
        if (!entry) return;
        // remove header
        entry.headerEl.remove();
        // remove all containers
        entry.containers.forEach((c) => c.el.remove());
        modulesIndex.delete(modName);
        const node = modulosList.querySelector(
          `[data-modulo="${CSS.escape(modName)}"]`,
        );
        if (node) node.remove();
      });

    return moduloMarco;
  }

  function buildModuleHeadersHtml() {
    const base = ["Cant", "largo", "ancho", "prof", "Nombre"];
    const ladosHtml = "<div>Lados</div>";
    const others = "<div>Notas</div>";
    return (
      base.map((b) => `<div>${escapeHtml(b)}</div>`).join("\n") +
      "\n" +
      ladosHtml +
      "\n" +
      others
    );
  }

  function updateAllModuleHeaders() {
    const headersEls = document.querySelectorAll(".modulo-headers");
    headersEls.forEach((h) => {
      h.innerHTML = buildModuleHeadersHtml();
    });
  }

  /* ----------------- UTIL: crear un contenedor de filas en una página para un módulo ----------------- */
  function createContainerOnPage(pageEl, modName) {
    const cont = document.createElement("div");
    cont.className = "modulo-datos";
    cont.dataset.modulo = modName;
    // leave it empty; filas se anexan aquí
    pageEl.appendChild(cont);
    return cont;
  }

  /* ----------------- UTIL: escape (seguro para innerText/HTML mínimo) ----------------- */
  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  }

  /* ----------------- UTIL: asegurar que exista module entry ----------------- */
  function ensureModule(modName) {
    if (modulesIndex.has(modName)) return modulesIndex.get(modName);

    // crear en la primera página con espacio
    const page = getAvailableA4ForHeight(140);
    const headerEl = createModuleHeaderOnPage(modName, page);

    // crear el primer contenedor (en la misma página)
    const firstContEl = createContainerOnPage(page, modName);

    const entry = {
      name: modName,
      headerEl,
      containers: [{ el: firstContEl, pageEl: page }],
      createdAt: Date.now(),
    };

    modulesIndex.set(modName, entry);
    addModuleToSidebar(modName);

    return entry;
  }

  /* ----------------- Agregar modulo a la lista lateral ----------------- */
  function addModuleToSidebar(modName) {
    if (modulosList.querySelector(`[data-modulo="${CSS.escape(modName)}"]`))
      return;
    const item = document.createElement("div");
    item.className = "modulo-item";
    item.dataset.modulo = modName;
    item.innerHTML = `
      <div style="flex:1">${escapeHtml(modName)}</div>
      <div style="display:flex;gap:6px">
        <button class="btn ghost btn-use-module" title="Seleccionar módulo"><i class="fas fa-check"></i></button>
        <button class="btn ghost btn-scroll-module" title="Ir al módulo"><i class="fas fa-arrow-down"></i></button>
      </div>
    `;
    modulosList.appendChild(item);

    item.querySelector(".btn-use-module").addEventListener("click", () => {
      moduloActual = modName;
      moduloActualSpan.textContent = modName;
      datosModulo.style.display = "block";
    });

    item.querySelector(".btn-scroll-module").addEventListener("click", () => {
      const info = modulesIndex.get(modName);
      if (!info) return;
      // scroll to header (the header stays on first page)
      info.headerEl.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ----------------- Reset cuadro lateral ----------------- */
  function resetCuadroLocal() {
    Object.values(ladoEls).forEach((l) => l.classList.remove("active"));
  }

  cuadro.addEventListener("click", (e) => {
    const rect = cuadro.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const zone = 8;
    if (y < zone) ladoEls.top.classList.toggle("active");
    else if (y > rect.height - zone) ladoEls.bottom.classList.toggle("active");
    else if (x < zone) ladoEls.left.classList.toggle("active");
    else if (x > rect.width - zone) ladoEls.right.classList.toggle("active");

    // sync to numeric mode
    syncGraficoToNumerico();
  });

  /* Funciones para sincronizar modo gráfico y numérico */
  function syncGraficoToNumerico() {
    let med1Count = 0,
      med2Count = 0;
    // Med1 = top + bottom
    if (ladoEls.top.classList.contains("active")) med1Count++;
    if (ladoEls.bottom.classList.contains("active")) med1Count++;
    // Med2 = left + right
    if (ladoEls.left.classList.contains("active")) med2Count++;
    if (ladoEls.right.classList.contains("active")) med2Count++;

    cantoNumMed1.value = med1Count;
    cantoNumMed2.value = med2Count;
  }

  function syncNumericoToGrafico() {
    resetCuadroLocal();
    const med1 = parseInt(cantoNumMed1.value) || 0;
    const med2 = parseInt(cantoNumMed2.value) || 0;

    // Med1 = top + bottom
    if (med1 >= 1) ladoEls.top.classList.add("active");
    if (med1 >= 2) ladoEls.bottom.classList.add("active");

    // Med2 = left + right
    if (med2 >= 1) ladoEls.left.classList.add("active");
    if (med2 >= 2) ladoEls.right.classList.add("active");
  }

  // Toggle button para cambiar modo
  toggleCantoModeBtn.addEventListener("click", () => {
    if (cantoMode === "grafico") {
      cantoMode = "numerico";
      cantoGraficoDiv.style.display = "none";
      if (cantoNumericoDiv) cantoNumericoDiv.style.display = "block";
      syncGraficoToNumerico();
      toggleCantoModeBtn.textContent = "Modo gráfico";
      // Habilitar campos de canto numéricos en la tabla
      cantoNumMed1.disabled = false;
      cantoNumMed2.disabled = false;
      updateAllModuleHeaders();
      updateAllRowsSides();
    } else {
      cantoMode = "grafico";
      cantoGraficoDiv.style.display = "block";
      if (cantoNumericoDiv) cantoNumericoDiv.style.display = "none";
      syncNumericoToGrafico();
      toggleCantoModeBtn.textContent = "Modo numérico";
      // Bloquear campos de canto numéricos en la tabla
      cantoNumMed1.disabled = true;
      cantoNumMed2.disabled = true;
      updateAllModuleHeaders();
      updateAllRowsSides();
    }
  });

  // Validar que CantL y CantA solo acepten 0, 1, 2
  const validarCantoNumerico = (input) => {
    let val = input.value;
    if (val !== "" && (isNaN(val) || val < 0 || val > 2)) {
      input.value = "";
    }
  };

  // Sync cuando cambian los inputs numéricos (siempre, no solo en modo numérico)
  // Validar pero NO aplicar inmediatamente: aplicar cambios solo al presionar Enter
  cantoNumMed1.addEventListener("input", () => {
    validarCantoNumerico(cantoNumMed1);
    // marcar como pendiente (puede usarse para UI si se desea)
    cantoNumMed1.classList.add("pending-canto");
  });
  cantoNumMed2.addEventListener("input", () => {
    validarCantoNumerico(cantoNumMed2);
    cantoNumMed2.classList.add("pending-canto");
  });

  // Aplicar valores numéricos al presionar Enter (sin crear la fila)
  const applyCantoNumerico = (inputEl) => {
    validarCantoNumerico(inputEl);
    syncNumericoToGrafico();
    updateAllModuleHeaders();
    updateAllRowsSides();
    inputEl.classList.remove("pending-canto");
    // opcional: perder foco
    try {
      inputEl.blur();
    } catch (e) {}
  };

  cantoNumMed1.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      applyCantoNumerico(cantoNumMed1);
    }
  });
  cantoNumMed2.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      applyCantoNumerico(cantoNumMed2);
    }
  });

  // counters
  nombreInput.addEventListener("input", () => {
    if (nombreInput.value.length > 15) {
      nombreInput.value = nombreInput.value.slice(0, 15);
      nameWarning.style.display = "inline";
    } else nameWarning.style.display = "none";
    nameCounter.textContent = nombreInput.value.length + "/15";
  });
  notasInput.addEventListener("input", () => {
    if (notasInput.value.length > 20) {
      notasInput.value = notasInput.value.slice(0, 20);
      noteWarning.style.display = "inline";
    } else noteWarning.style.display = "none";
    noteCounter.textContent = notasInput.value.length + "/20";
  });

  // Función para agregar bloqueo con Shift+clic
  function addLockToggle(input) {
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        input.classList.toggle("locked");
      }
    });
    input.addEventListener("click", (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        input.classList.toggle("locked");
      }
    });
  }

  function limitarCampo(input, max) {
    if (!input) return;
    input.addEventListener("input", () => {
      if (input.value.length >= max) {
        input.classList.add("at-limit");
      } else {
        input.classList.remove("at-limit");
      }
    });
  }

  // Agregar bloqueo a todos los campos
  addLockToggle(cantidadInput);
  addLockToggle(med1Input);
  addLockToggle(med2Input);
  addLockToggle(profundidadInput);
  addLockToggle(nombreInput);
  addLockToggle(notasInput);

  limitarCampo(cantidadInput, 5);
  limitarCampo(med1Input, 5);
  limitarCampo(med2Input, 5);
  limitarCampo(profundidadInput, 5);
  limitarCampo(nombreInput, 15);
  limitarCampo(notasInput, 20);

  // Enter en campo módulo nombre ejecuta Crear módulo
  moduloInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      createModuloBtn.click();
    }
  });

  // Enter en cualquier campo ejecuta Aceptar
  const enterToAccept = (input) => {
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && input !== notasInput) {
        e.preventDefault();
        acceptBtn.click();
      }
    });
  };
  // Para textarea, solo Ctrl+Enter o Cmd+Enter
  notasInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      acceptBtn.click();
    }
  });

  enterToAccept(cantidadInput);
  enterToAccept(med1Input);
  enterToAccept(med2Input);
  enterToAccept(profundidadInput);
  enterToAccept(nombreInput);
  enterToAccept(notasInput);

  // NAVEGACIÓN CON TAB: crear ciclo entre campos
  // Orden: Cantidad → Largo → Ancho → CantL (si modo numérico) → CantA (si modo numérico) → Profundidad → Nombre
  // Notas NO está en el bucle

  const getTabFieldsOrder = () => {
    const fields = [
      cantidadInput, // 0 - Cantidad
      med1Input, // 1 - Largo
      med2Input, // 2 - Ancho
    ];

    // Agregar campos numéricos si están habilitados (modo numérico activo)
    if (cantoMode === "numerico" && !cantoNumMed1.disabled) {
      fields.push(cantoNumMed1); // 3 - CantL (Cantidad Largo)
      fields.push(cantoNumMed2); // 4 - CantA (Cantidad Ancho)
    }

    // Resto de campos
    fields.push(profundidadInput); // 5 o 3 - Profundidad
    fields.push(nombreInput); // 6 o 4 - Nombre

    return fields;
  };

  const handleTabNavigation = (e) => {
    if (e.key !== "Tab") return;

    e.preventDefault();

    const tabFieldsOrder = getTabFieldsOrder();
    const currentIndex = tabFieldsOrder.indexOf(e.target);
    if (currentIndex === -1) return; // No es uno de nuestros campos

    let nextIndex;
    if (e.shiftKey) {
      // Shift+Tab: ir al anterior
      nextIndex =
        (currentIndex - 1 + tabFieldsOrder.length) % tabFieldsOrder.length;
    } else {
      // Tab: ir al siguiente
      nextIndex = (currentIndex + 1) % tabFieldsOrder.length;
    }

    const nextField = tabFieldsOrder[nextIndex];
    nextField.focus();
    nextField.select();
  };

  // Agregar listener a todos los campos posibles
  const allPossibleFields = [
    cantidadInput,
    med1Input,
    med2Input,
    cantoNumMed1,
    cantoNumMed2,
    profundidadInput,
    nombreInput,
  ];
  allPossibleFields.forEach((field) => {
    if (field) {
      field.addEventListener("keydown", handleTabNavigation);
    }
  });

  /* ----------------- Crear Módulo desde panel ----------------- */
  let moduloActual = null;
  createModuloBtn.addEventListener("click", () => {
    const nombre = (moduloInput.value || "").trim();
    if (!nombre) return alert("Por favor, ingresa un nombre para el módulo");

    // ensureModule crea header + primer contenedor
    ensureModule(nombre);

    moduloActual = nombre;
    moduloActualSpan.textContent = nombre;
    datosModulo.style.display = "block";
    moduloInput.value = "";
  });

  backModuloBtn.addEventListener("click", () => {
    moduloActual = null;
    moduloActualSpan.textContent = "-";
    datosModulo.style.display = "none";
  });

  /* ----------------- Crear fila dentro de un módulo (gestión de paginado) ----------------- */
  function createRowElement(data) {
    const { cantidad, med1, med2, material, nombreVal, checkedSides } = data;
    const rowId = "r" + Date.now() + Math.floor(Math.random() * 1000);
    const row = document.createElement("div");
    row.className = "embedded-right-row";
    row.dataset.rowId = rowId;

    // Guardar datos de canto en el dataset
    if (cantoMode === "numerico" && cantoNumMed1 && cantoNumMed2) {
      row.dataset.cantoNumMed1 = cantoNumMed1.value || "0";
      row.dataset.cantoNumMed2 = cantoNumMed2.value || "0";
    } else {
      row.dataset.cantoNumMed1 = "0";
      row.dataset.cantoNumMed2 = "0";
    }

    row.innerHTML = `
      <div class="icon-col">
        <button class="trash-btn-row" title="Eliminar fila"><i class="fas fa-trash-alt"></i></button>
        <button class="edit-btn-row" title="Editar fila"><i class="fas fa-pencil-alt"></i></button>
      </div>
      <div class="er-qty">${escapeHtml(cantidad || "-")}</div>
      <div class="er-med1">${escapeHtml(med1 || "-")}</div>
      <div class="er-med2">${escapeHtml(med2 || "-")}</div>
      <div class="er-material">${escapeHtml(material || "-")}</div>
      <div class="er-nombre">${escapeHtml((nombreVal || "-").slice(0, 15))}</div>
      <div class="er-sides">
        ${buildRowSidesHtml(checkedSides)}
      </div>
    `;

    // handlers for trash/edit will be attached by the caller after append (so size calc sees real DOM)
    return row;
  }

  // Construye el HTML para la celda de lados en una fila, dependiendo del modo
  function buildRowSidesHtml(checkedSides = []) {
    try {
      if (cantoMode === "numerico" && cantoNumMed1 && cantoNumMed2) {
        const m1 = Math.max(0, parseInt(cantoNumMed1.value) || 0);
        const m2 = Math.max(0, parseInt(cantoNumMed2.value) || 0);
        // Mostrar solo las combinaciones seleccionadas; si no hay ninguna, mostrar la combinacion actual m1xm2
        const allowed = new Set();
        for (let i = m1; i >= 0; i--)
          for (let j = 0; j <= m2; j++) allowed.add(`${i}x${j}`);
        const toShow =
          Array.isArray(checkedSides) && checkedSides.length > 0
            ? checkedSides.filter((s) => allowed.has(s))
            : [`${m1}x${m2}`];

        // Always render numeric cells with the same box size and border (transparent by default)
        const parts = toShow.map((key) => {
          const explicitlySelected = checkedSides.includes(key);
          const bg = explicitlySelected
            ? "background:crimson;"
            : "background:transparent;";
          const border = explicitlySelected
            ? "1px solid #ccc"
            : "1px solid transparent";
          return `<div class="lado-numeric" data-side="${escapeHtml(key)}" style="box-sizing:border-box;width:30px;height:20px;line-height:20px;margin:1px;border:${border};display:inline-flex;align-items:center;justify-content:center;${bg}">${escapeHtml(key)}</div>`;
        });
        return `<div class="lado-numeric-grid" style="display:flex;flex-wrap:wrap;align-items:flex-start;">${parts.join("")}</div>`;
      }
    } catch (e) {
      // fallthrough
    }
    // modo grafico por defecto (4 lados)
    return `
      <div class="lado-mini">
        <div class="lado top" style="${checkedSides.includes("top") ? "background:crimson;" : ""}"></div>
        <div class="lado bottom" style="${checkedSides.includes("bottom") ? "background:crimson;" : ""}"></div>
        <div class="lado left" style="${checkedSides.includes("left") ? "background:crimson;" : ""}"></div>
        <div class="lado right" style="${checkedSides.includes("right") ? "background:crimson;" : ""}"></div>
      </div>`;
  }

  // Actualiza todas las filas existentes para reflejar el modo actual (grafico o numerico)
  function updateAllRowsSides() {
    const rows = document.querySelectorAll(".embedded-right-row");
    rows.forEach((r) => {
      // intentar preservar la selección existente
      const prev = [];
      // si hay elementos numericos
      r.querySelectorAll(".lado-numeric[data-side]").forEach((n) => {
        if (n.style.background && n.style.background !== "transparent")
          prev.push(n.getAttribute("data-side"));
      });
      // si hay lados graficos
      ["top", "bottom", "left", "right"].forEach((k) => {
        const el = r.querySelector(`.er-sides .lado.${k}`);
        if (el && el.style.background && el.style.background !== "transparent")
          prev.push(k);
      });
      // Si estamos en modo numerico, filtrar las selecciones previas para mantener solo
      // las combinaciones que existen en la cuadrícula actual (por ejemplo '2x2').
      let filteredPrev = prev;
      try {
        if (cantoMode === "numerico" && cantoNumMed1 && cantoNumMed2) {
          const m1 = Math.max(0, parseInt(cantoNumMed1.value) || 0);
          const m2 = Math.max(0, parseInt(cantoNumMed2.value) || 0);
          const allowed = new Set();
          for (let i = m1; i >= 0; i--) {
            for (let j = 0; j <= m2; j++) {
              allowed.add(`${i}x${j}`);
            }
          }
          filteredPrev = prev.filter((p) => allowed.has(p));
        }
      } catch (e) {
        filteredPrev = prev;
      }

      const newHtml = buildRowSidesHtml(filteredPrev);
      const container = r.querySelector(".er-sides");
      if (container) container.innerHTML = newHtml;
    });
  }

  // calcula espacio disponible en la página para una nueva fila dado el contenedor actual
  function containerHasRoom(containerEl, neededHeight) {
    try {
      const pageEl = containerEl.closest(".a4-sheet");
      const pageRect = pageEl.getBoundingClientRect();
      // used height = bottom of last element inside page - page top
      // prefer to check last child of page
      const last = pageEl.querySelector(
        ":scope > .modulo-datos:last-of-type, :scope > .modulo-marco:last-of-type",
      );
      let used = 0;
      if (last) {
        const r = last.getBoundingClientRect();
        used = r.bottom - pageRect.top;
      } else {
        const topRect = pageEl
          .querySelector(".a4-content")
          .getBoundingClientRect();
        used = topRect.bottom - pageRect.top;
      }
      const available = pageEl.clientHeight - A4_MARGIN_BOTTOM - used;
      return available >= neededHeight;
    } catch (e) {
      // si falla (por ejemplo en SSR/medidas todavía no aplicadas), devolvemos true para no bloquear
      return true;
    }
  }

  // crea un nuevo contenedor para el módulo en la page indicada y lo registra
  function addContainerToModuleOnPage(entry, pageEl) {
    const contEl = createContainerOnPage(pageEl, entry.name);
    entry.containers.push({ el: contEl, pageEl });
    return contEl;
  }

  // mueve filas de los MÓDULOS POSTERIORES en la página, de forma gradual hacia la siguiente
  function moveFollowingModuleRowsToNextPage(entry, pageEl, targetHeight) {
    // encontrar todos los módulos en esta página
    const headers = Array.from(
      pageEl.querySelectorAll(":scope > .modulo-marco"),
    );
    const currentModuleIndex = headers.findIndex(
      (h) => h.dataset.modulo === entry.name,
    );

    if (currentModuleIndex === -1) return null;

    // obtener módulos que vienen DESPUÉS
    const followingHeaders = headers.slice(currentModuleIndex + 1);
    if (followingHeaders.length === 0) return null;

    // crear o encontrar página siguiente
    let nextPage = null;
    const pages = Array.from(a4PagesContainer.children);
    const currentPageIndex = pages.indexOf(pageEl);
    if (currentPageIndex < pages.length - 1) {
      nextPage = pages[currentPageIndex + 1];
    } else {
      nextPage = createA4Page();
    }

    // mover filas de los módulos posteriores de abajo hacia arriba
    for (let h = followingHeaders.length - 1; h >= 0; h--) {
      const headerEl = followingHeaders[h];
      const modName = headerEl.dataset.modulo;
      const followingEntry = modulesIndex.get(modName);

      if (!followingEntry) continue;

      // obtener contenedores de este módulo en esta página
      const containersInPage = followingEntry.containers.filter(
        (c) => c.pageEl === pageEl,
      );

      // mover filas desde el final una a una
      for (let i = containersInPage.length - 1; i >= 0; i--) {
        const containerInPage = containersInPage[i];
        const rows = Array.from(
          containerInPage.el.querySelectorAll(".embedded-right-row"),
        );

        for (let j = rows.length - 1; j >= 0; j--) {
          const row = rows[j];

          // clonar y mover a la siguiente página
          const clonedRow = row.cloneNode(true);

          // crear o encontrar contenedor en la siguiente página
          let nextContainerObj = followingEntry.containers.find(
            (c) => c.pageEl === nextPage,
          );
          if (!nextContainerObj) {
            const newCont = createContainerOnPage(
              nextPage,
              followingEntry.name,
            );
            followingEntry.containers.push({ el: newCont, pageEl: nextPage });
            nextContainerObj = { el: newCont, pageEl: nextPage };
          }

          // insertar al inicio del contenedor en la siguiente página
          if (nextContainerObj.el.firstChild) {
            nextContainerObj.el.insertBefore(
              clonedRow,
              nextContainerObj.el.firstChild,
            );
          } else {
            nextContainerObj.el.appendChild(clonedRow);
          }
          wireRowHandlers(clonedRow, followingEntry);

          // remover original
          row.remove();

          // verificar si ahora hay espacio en la página original para el módulo que estamos editando
          if (
            containerHasRoom(
              entry.containers.find((c) => c.pageEl === pageEl)?.el,
              targetHeight,
            )
          ) {
            return nextPage;
          }
        }
      }

      // si se movieron todas las filas del módulo posterior, mover su header también ANTES de sus piezas
      if (
        followingEntry.containers.filter(
          (c) =>
            c.pageEl === pageEl &&
            c.el.querySelectorAll(".embedded-right-row").length === 0,
        ).length > 0
      ) {
        const headerToMove = followingEntry.headerEl;
        if (headerToMove.closest(".a4-sheet") === pageEl) {
          headerToMove.remove();
          // insertar el header ANTES del primer contenedor del módulo en la siguiente página
          const firstContainerInNextPage = followingEntry.containers.find(
            (c) => c.pageEl === nextPage,
          );
          if (firstContainerInNextPage && firstContainerInNextPage.el) {
            // insertar JUSTO ANTES del contenedor en el DOM
            firstContainerInNextPage.el.parentNode.insertBefore(
              headerToMove,
              firstContainerInNextPage.el,
            );
          } else {
            nextPage.appendChild(headerToMove);
          }
        }
      }
    }

    return nextPage;
  }

  // mueve filas del módulo actual de forma gradual
  function moveModuleRowsToNextPage(entry, pageEl, targetHeight) {
    // obtener todos los contenedores del módulo en esta página
    const containersInPage = entry.containers.filter(
      (c) => c.pageEl === pageEl,
    );
    if (containersInPage.length === 0) return null;

    // crear o encontrar página siguiente
    let nextPage = null;
    const pages = Array.from(a4PagesContainer.children);
    const currentPageIndex = pages.indexOf(pageEl);
    if (currentPageIndex < pages.length - 1) {
      nextPage = pages[currentPageIndex + 1];
    } else {
      nextPage = createA4Page();
    }

    // mover filas de abajo hacia arriba hasta liberar espacio
    for (let i = containersInPage.length - 1; i >= 0; i--) {
      const containerInPage = containersInPage[i];
      const rows = Array.from(
        containerInPage.el.querySelectorAll(".embedded-right-row"),
      );

      // mover filas desde el final una a una
      for (let j = rows.length - 1; j >= 0; j--) {
        const row = rows[j];

        // clonar y mover a la siguiente página
        const clonedRow = row.cloneNode(true);

        // crear o encontrar contenedor en la siguiente página
        let nextContainerObj = entry.containers.find(
          (c) => c.pageEl === nextPage,
        );
        if (!nextContainerObj) {
          const newCont = createContainerOnPage(nextPage, entry.name);
          entry.containers.push({ el: newCont, pageEl: nextPage });
          nextContainerObj = { el: newCont, pageEl: nextPage };
        }

        // insertar al inicio del contenedor en la siguiente página (para mantener orden)
        if (nextContainerObj.el.firstChild) {
          nextContainerObj.el.insertBefore(
            clonedRow,
            nextContainerObj.el.firstChild,
          );
        } else {
          nextContainerObj.el.appendChild(clonedRow);
        }
        wireRowHandlers(clonedRow, entry);

        // remover original
        row.remove();

        // verificar si ahora hay espacio en la página original
        if (containerHasRoom(containersInPage[i].el, targetHeight)) {
          return nextPage;
        }
      }
    }

    // si se movieron todas las filas del módulo, mover el header también ANTES de sus piezas
    if (
      entry.containers.filter(
        (c) =>
          c.pageEl === pageEl &&
          c.el.querySelectorAll(".embedded-right-row").length === 0,
      ).length > 0
    ) {
      const headerEl = entry.headerEl;
      if (headerEl.closest(".a4-sheet") === pageEl) {
        headerEl.remove();
        // insertar el header ANTES del primer contenedor del módulo en la siguiente página
        const firstContainerInNextPage = entry.containers.find(
          (c) => c.pageEl === nextPage,
        );
        if (
          firstContainerInNextPage &&
          firstContainerInNextPage.el.parentNode
        ) {
          firstContainerInNextPage.el.parentNode.insertBefore(
            headerEl,
            firstContainerInNextPage.el,
          );
        } else {
          nextPage.appendChild(headerEl);
        }
      }
    }

    return nextPage;
  }

  // agrega una fila al módulo (interna): decide en qué contenedor/hoja colocarla
  // Prioriza siempre la página donde está el header del módulo
  function appendRowToModule(
    entry,
    rowEl,
    approxRowHeight = DEFAULT_ROW_HEIGHT,
  ) {
    // obtener la página del header del módulo
    const headerPageEl = entry.headerEl.closest(".a4-sheet");

    // buscar si existe contenedor en la página del header
    let headerContainerObj = entry.containers.find(
      (c) => c.pageEl === headerPageEl,
    );

    // si existe y tiene espacio, agregar ahí
    if (
      headerContainerObj &&
      containerHasRoom(headerContainerObj.el, approxRowHeight)
    ) {
      headerContainerObj.el.appendChild(rowEl);
      wireRowHandlers(rowEl, entry);
      return headerContainerObj;
    }

    // si hay contenedor en la página del header pero NO tiene espacio
    if (
      headerContainerObj &&
      !containerHasRoom(headerContainerObj.el, approxRowHeight)
    ) {
      // primero intentar mover filas de MÓDULOS POSTERIORES a la siguiente página
      moveFollowingModuleRowsToNextPage(entry, headerPageEl, approxRowHeight);

      // ahora reintentar si hay espacio
      if (containerHasRoom(headerContainerObj.el, approxRowHeight)) {
        headerContainerObj.el.appendChild(rowEl);
        wireRowHandlers(rowEl, entry);
        return headerContainerObj;
      }

      // si aun así no hay espacio, mover filas del módulo actual
      moveModuleRowsToNextPage(entry, headerPageEl, approxRowHeight);

      // reintentar nuevamente
      if (containerHasRoom(headerContainerObj.el, approxRowHeight)) {
        headerContainerObj.el.appendChild(rowEl);
        wireRowHandlers(rowEl, entry);
        return headerContainerObj;
      }
    }

    // si no hay contenedor en la página del header, crear uno
    if (!headerContainerObj) {
      headerContainerObj = createContainerOnPage(headerPageEl, entry.name);
      entry.containers.unshift({
        el: headerContainerObj,
        pageEl: headerPageEl,
      });
    }

    if (containerHasRoom(headerContainerObj, approxRowHeight)) {
      headerContainerObj.appendChild(rowEl);
      wireRowHandlers(rowEl, entry);
      return { el: headerContainerObj, pageEl: headerPageEl };
    }

    // si aun así no hay espacio, mover filas del módulo
    moveModuleRowsToNextPage(entry, headerPageEl, approxRowHeight);

    if (containerHasRoom(headerContainerObj, approxRowHeight)) {
      headerContainerObj.appendChild(rowEl);
      wireRowHandlers(rowEl, entry);
      return { el: headerContainerObj, pageEl: headerPageEl };
    }

    // si todavía no hay espacio, crear nueva página para este módulo
    const newPage = createA4Page();
    const newCont = addContainerToModuleOnPage(entry, newPage);
    newCont.appendChild(rowEl);
    wireRowHandlers(rowEl, entry);
    return { el: newCont, pageEl: newPage };
  }

  // redistribuye las filas de un módulo desde el primer contenedor, rellenando las páginas
  function redistributeRows(entry) {
    // recopilar todas las filas actuales
    const allRows = [];
    entry.containers.forEach((cont) => {
      Array.from(cont.el.querySelectorAll(".embedded-right-row")).forEach(
        (row) => {
          allRows.push(row.cloneNode(true));
        },
      );
    });

    // limpiar todos los contenedores
    entry.containers.forEach((cont) => {
      // remover todas las filas, pero mantener el contenedor
      Array.from(cont.el.querySelectorAll(".embedded-right-row")).forEach(
        (row) => row.remove(),
      );
    });

    // remover contenedores vacíos (excepto el primero)
    for (let i = entry.containers.length - 1; i > 0; i--) {
      entry.containers[i].el.remove();
    }
    entry.containers = entry.containers.slice(0, 1);

    // redistribuir filas empezando desde el primer contenedor
    allRows.forEach((row) => {
      const rowHeight =
        Math.ceil(row.getBoundingClientRect().height) + 6 || DEFAULT_ROW_HEIGHT;
      appendRowToModule(entry, row, rowHeight);
    });

    // después de redistribuir este módulo, intentar traer módulos posteriores de vuelta si hay espacio
    redistributeFollowingModules();
  }

  // intenta traer módulos posteriores de vuelta a páginas anteriores si hay espacio
  // Sube gradualmente, fila por fila, con el header subiendo primero
  function redistributeFollowingModules() {
    const allEntries = Array.from(modulesIndex.values());
    let changedAny = false;

    for (let i = 0; i < allEntries.length - 1; i++) {
      const currentEntry = allEntries[i];
      const nextEntry = allEntries[i + 1];

      // obtener la página donde está el header del módulo actual
      const currentHeaderPage = currentEntry.headerEl.closest(".a4-sheet");
      if (!currentHeaderPage) continue;

      // obtener la página donde está el header del siguiente módulo
      const nextHeaderPage = nextEntry.headerEl.closest(".a4-sheet");
      if (!nextHeaderPage) continue;

      // buscar piezas del módulo siguiente que estén en páginas POSTERIORES a donde está el header
      // (puede que el header ya esté en una página anterior, pero las piezas atrapadas en posteriores)
      let firstRowToMove = null;
      let pageWithRow = null;
      let containerWithRow = null;

      for (const container of nextEntry.containers) {
        // buscar en contenedores que NO estén en la página actual (currentHeaderPage)
        // para encontrar piezas que necesiten subir
        if (container.pageEl === currentHeaderPage) continue;

        // buscar la primera pieza en este contenedor
        const row = container.el.querySelector(".embedded-right-row");
        if (row) {
          firstRowToMove = row;
          pageWithRow = container.pageEl;
          containerWithRow = container;
          break;
        }
      }

      // si no hay piezas atrapadas, no hacer nada
      if (!firstRowToMove) continue;

      // CALCULAR: ¿hay espacio en la página anterior para esta pieza?
      const rowHeight =
        Math.ceil(firstRowToMove.getBoundingClientRect().height) + 6 ||
        DEFAULT_ROW_HEIGHT;
      const lastContainerInCurrentPage = currentEntry.containers
        .filter((c) => c.pageEl === currentHeaderPage)
        .slice(-1)[0];

      if (!lastContainerInCurrentPage) continue;

      // Determinar cuánto espacio se necesita
      let spaceNeeded = rowHeight;
      if (nextEntry.headerEl.closest(".a4-sheet") !== currentHeaderPage) {
        // Si el header NO está en la página anterior, necesitamos espacio para header + pieza
        const headerHeight =
          Math.ceil(nextEntry.headerEl.getBoundingClientRect().height) + 6 ||
          40;
        spaceNeeded = headerHeight + rowHeight;
      }

      // Verificar si hay espacio
      if (!containerHasRoom(lastContainerInCurrentPage.el, spaceNeeded)) {
        // no hay espacio suficiente
        continue;
      }

      // HAY ESPACIO! Vamos a subir la pieza
      changedAny = true;

      // PASO 1: Si el header no está en la página anterior, traerlo
      if (nextEntry.headerEl.closest(".a4-sheet") !== currentHeaderPage) {
        // hay espacio, traer el header
        nextEntry.headerEl.remove();
        // insertar ANTES del primer contenedor del módulo en la página actual
        const firstContainerInCurrentPage = nextEntry.containers.find(
          (c) => c.pageEl === currentHeaderPage,
        );
        if (firstContainerInCurrentPage) {
          firstContainerInCurrentPage.el.parentNode.insertBefore(
            nextEntry.headerEl,
            firstContainerInCurrentPage.el,
          );
        } else {
          currentHeaderPage.appendChild(nextEntry.headerEl);
        }
      }

      // PASO 2: Crear o encontrar el contenedor en la página anterior
      let containerInCurrentPage = nextEntry.containers.find(
        (c) => c.pageEl === currentHeaderPage,
      );
      if (!containerInCurrentPage) {
        const newCont = createContainerOnPage(
          currentHeaderPage,
          nextEntry.name,
        );
        nextEntry.containers.push({ el: newCont, pageEl: currentHeaderPage });
        containerInCurrentPage =
          nextEntry.containers[nextEntry.containers.length - 1];
      }

      // PASO 3: Clonar y mover la pieza
      const clonedRow = firstRowToMove.cloneNode(true);
      containerInCurrentPage.el.appendChild(clonedRow);
      wireRowHandlers(clonedRow, nextEntry);

      // PASO 4: Remover la pieza original
      firstRowToMove.remove();

      // PASO 5: Si el contenedor quedó vacío, eliminarlo
      if (
        containerWithRow &&
        containerWithRow.el.querySelectorAll(".embedded-right-row").length === 0
      ) {
        const containerIndex = nextEntry.containers.findIndex(
          (c) => c === containerWithRow,
        );
        if (containerIndex > 0) {
          // nunca eliminar el primer contenedor
          containerWithRow.el.remove();
          nextEntry.containers.splice(containerIndex, 1);
        }
      }

      // Salir del loop principal después de mover UNA pieza
      break;
    }

    // si hubo cambios, verificar de nuevo para subir la siguiente fila
    if (changedAny) {
      redistributeFollowingModules();
    }
  }

  // agrega eventos a los botones de la fila (eliminar/editar)
  function wireRowHandlers(rowEl, entry) {
    // posicionar iconos fuera (si tu CSS los deja), pero igualmente aseguramos el zIndex
    const iconCol = rowEl.querySelector(".icon-col");
    if (iconCol) {
      iconCol.style.zIndex = 999999;
    }

    const trashBtn = rowEl.querySelector(".trash-btn-row");
    const editBtn = rowEl.querySelector(".edit-btn-row");

    if (trashBtn) {
      trashBtn.addEventListener("click", () => {
        if (!confirm("Eliminar esta fila?")) return;
        rowEl.remove();
        // redistribuir filas después de eliminar
        redistributeRows(entry);
      });
    }

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        openEditPopup(rowEl);
      });
    }

    // toggles de lados (soporte grafico y numerico)
    const sidesContainer = rowEl.querySelector(".er-sides");
    if (sidesContainer) {
      sidesContainer.addEventListener("click", (ev) => {
        const num = ev.target.closest(".lado-numeric");
        if (num) {
          // En modo numerico no permitir toggle por click directo; la combinacion por defecto
          // se mantiene y solo se puede cambiar vía editar (popup) o por lógica explícita.
          if (cantoMode === "numerico") return;

          // toggle selection style: background + border when selected, none when unselected
          if (num.style.background && num.style.background !== "transparent") {
            num.style.background = "transparent";
            num.style.border = "1px solid transparent";
          } else {
            num.style.background = "crimson";
            num.style.border = "1px solid #ccc";
          }
          return;
        }

        const graf = ev.target.closest(".er-sides .lado");
        if (graf) {
          if (graf.style.background && graf.style.background !== "transparent")
            graf.style.background = "transparent";
          else graf.style.background = "crimson";
        }
      });
    }
  }

  /* ----------------- POPUP: abrir modal de edición ----------------- */
  function openEditPopup(rowEl) {
    // parse current values
    const curQty = rowEl.querySelector(".er-qty").textContent.trim();
    const curM1 = rowEl.querySelector(".er-med1").textContent.trim();
    const curM2 = rowEl.querySelector(".er-med2").textContent.trim();
    const curMat = rowEl.querySelector(".er-material").textContent.trim();
    const curNom = rowEl.querySelector(".er-nombre").textContent.trim();
    const sides = {
      top: !!rowEl.querySelector('.er-sides .lado.top[style*="crimson"]'),
      bottom: !!rowEl.querySelector('.er-sides .lado.bottom[style*="crimson"]'),
      left: !!rowEl.querySelector('.er-sides .lado.left[style*="crimson"]'),
      right: !!rowEl.querySelector('.er-sides .lado.right[style*="crimson"]'),
    };

    // build modal
    const overlay = document.createElement("div");
    overlay.className = "edit-overlay";
    overlay.style.position = "fixed";
    overlay.style.left = 0;
    overlay.style.top = 0;
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.zIndex = 99999;
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const dialog = document.createElement("div");
    dialog.className = "edit-dialog";
    dialog.style.width = "92vw";
    dialog.style.maxWidth = "900px";
    dialog.style.maxHeight = "92vh";
    dialog.style.overflow = "auto";
    dialog.style.background = "#fff";
    dialog.style.borderRadius = "8px";
    dialog.style.padding = "16px";
    dialog.style.boxSizing = "border-box";
    dialog.style.position = "relative";

    dialog.innerHTML = `
      <h3 style="margin-top:0">Editar fila</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label>Cantidad<br><input type="number" id="popup-qty" value="${curQty === "-" ? "" : curQty}" style="width:100%;padding:6px"></label>
        </div>
        <div>
          <label>Nombre<br><input type="text" id="popup-nom" maxlength="15" value="${curNom === "-" ? "" : curNom}" style="width:100%;padding:6px"></label>
        </div>
        <div>
          <label>Medida 1<br><input type="text" id="popup-m1" maxlength="10" value="${curM1 === "-" ? "" : curM1}" style="width:100%;padding:6px"></label>
        </div>
        <div>
          <label>prof<br><input type="text" id="popup-mat" maxlength="10" value="${curMat === "-" ? "" : curMat}" style="width:100%;padding:6px"></label>
        </div>
        <div style="grid-column:1 / 3;">
          <label>Medida 2<br><input type="text" id="popup-m2" maxlength="10" value="${curM2 === "-" ? "" : curM2}" style="width:100%;padding:6px"></label>
        </div>
      </div>

      <hr>

      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="flex:1">
          <label>Notas<br><textarea id="popup-notes" rows="3" style="width:100%;padding:6px"></textarea></label>
        </div>
        <div style="width:260px">
          <label style="display:block;margin-bottom:6px"><strong>Editar cantos (clic sobre el lado)</strong></label>
          <div id="popup-cuadro" style="width:220px;height:220px;border:1px solid #000;position:relative;margin-top:6px">
            <div class="popup-lado top" style="position:absolute;top:0;left:0;right:0;height:6px;background:${sides.top ? "crimson" : "transparent"}"></div>
            <div class="popup-lado right" style="position:absolute;top:0;right:0;width:6px;height:100%;background:${sides.right ? "crimson" : "transparent"}"></div>
            <div class="popup-lado bottom" style="position:absolute;bottom:0;left:0;right:0;height:6px;background:${sides.bottom ? "crimson" : "transparent"}"></div>
            <div class="popup-lado left" style="position:absolute;top:0;left:0;width:6px;height:100%;background:${sides.left ? "crimson" : "transparent"}"></div>
          </div>
          <div style="font-size:12px;margin-top:6px;color:#666">Clic cerca del borde para alternar cada canto.</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button id="popup-cancel" class="btn ghost">Cancelar</button>
        <button id="popup-save" class="btn">Guardar</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // wire popup cuadro toggles
    const popupCuadro = dialog.querySelector("#popup-cuadro");
    popupCuadro.tabIndex = 0; // Hacer que sea focusable

    const popupSides = {
      top: dialog.querySelector(".popup-lado.top"),
      right: dialog.querySelector(".popup-lado.right"),
      bottom: dialog.querySelector(".popup-lado.bottom"),
      left: dialog.querySelector(".popup-lado.left"),
    };

    function togglePopupSide(sideEl) {
      if (sideEl.style.background === "crimson")
        sideEl.style.background = "transparent";
      else sideEl.style.background = "crimson";
    }

    popupCuadro.addEventListener("click", (e) => {
      const rect = popupCuadro.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const zone = 16;
      if (y < zone) togglePopupSide(popupSides.top);
      else if (y > rect.height - zone) togglePopupSide(popupSides.bottom);
      else if (x < zone) togglePopupSide(popupSides.left);
      else if (x > rect.width - zone) togglePopupSide(popupSides.right);
    });

    // MANEJO DE TAB: ciclar entre campos en orden específico
    // Orden: Cantidad → Largo (m1) → Ancho (m2) → Material (mat) → Nombre (nom)
    // Luego vuelve a Cantidad
    const tabOrder = [
      dialog.querySelector("#popup-qty"), // Cantidad
      dialog.querySelector("#popup-m1"), // Largo
      dialog.querySelector("#popup-m2"), // Ancho
      dialog.querySelector("#popup-mat"), // Material
      dialog.querySelector("#popup-nom"), // Nombre
    ];

    console.log("🔄 Tab order inicializado con", tabOrder.length, "campos");

    // Función para navegar con Tab
    const navegarTab = (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();

        const activeEl = document.activeElement;
        const currentIndex = tabOrder.indexOf(activeEl);
        console.log("📍 Current element:", activeEl.id, "Index:", currentIndex);

        let nextIndex;
        if (e.shiftKey) {
          // Shift+Tab: ir al anterior
          nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
        } else {
          // Tab: ir al siguiente
          nextIndex = (currentIndex + 1) % tabOrder.length;
        }

        console.log(
          "➡️ Moving to index:",
          nextIndex,
          "Element:",
          tabOrder[nextIndex].id,
        );

        const nextInput = tabOrder[nextIndex];
        nextInput.focus();
        nextInput.select();
      }
    };

    // Agregar evento a todos los inputs
    tabOrder.forEach((input, idx) => {
      if (!input) {
        console.warn("⚠️ Input en índice", idx, "es null");
        return;
      }
      input.addEventListener("keydown", navegarTab);
      console.log("✅ Agregado keydown a", input.id);
    });

    // Agregar evento a la cuadrícula también
    popupCuadro.addEventListener("keydown", navegarTab);
    console.log("✅ Agregado keydown a popupCuadro");

    // ENFOCAR el primer campo automáticamente cuando se abre el modal
    console.log("⏱️ Enfocando primer campo...");
    const primerInput = tabOrder[0];
    primerInput.focus();
    primerInput.select();
    console.log("✅ Primer campo enfocado:", primerInput.id);

    // CANCEL: close overlay and DO NOT change row
    dialog.querySelector("#popup-cancel").addEventListener("click", () => {
      overlay.remove();
    });

    // SAVE: update row DOM and close
    dialog.querySelector("#popup-save").addEventListener("click", () => {
      const newQty = dialog.querySelector("#popup-qty").value || "-";
      const newNom = (dialog.querySelector("#popup-nom").value || "-").slice(
        0,
        15,
      );
      const newM1 = dialog.querySelector("#popup-m1").value || "-";
      const newM2 = dialog.querySelector("#popup-m2").value || "-";
      const newMat = dialog.querySelector("#popup-mat").value || "-";
      const newNotes = dialog.querySelector("#popup-notes").value || "";

      const newSides = {
        top: popupSides.top.style.background === "crimson",
        bottom: popupSides.bottom.style.background === "crimson",
        left: popupSides.left.style.background === "crimson",
        right: popupSides.right.style.background === "crimson",
      };

      // update row content (preserve the element, do not recreate wrapper)
      rowEl.querySelector(".er-qty").textContent = newQty;
      rowEl.querySelector(".er-med1").textContent = newM1;
      rowEl.querySelector(".er-med2").textContent = newM2;
      rowEl.querySelector(".er-material").textContent = newMat;
      rowEl.querySelector(".er-nombre").textContent = newNom;

      // update mini-cuartito styles
      const sideEls = rowEl.querySelectorAll(".er-sides .lado");
      sideEls.forEach((el) => {
        el.style.background = "transparent";
      });
      if (newSides.top)
        rowEl.querySelector(".er-sides .lado.top").style.background = "crimson";
      if (newSides.bottom)
        rowEl.querySelector(".er-sides .lado.bottom").style.background =
          "crimson";
      if (newSides.left)
        rowEl.querySelector(".er-sides .lado.left").style.background =
          "crimson";
      if (newSides.right)
        rowEl.querySelector(".er-sides .lado.right").style.background =
          "crimson";

      // optionally store notes in dataset for later (not visible)
      rowEl.dataset.notes = newNotes;

      overlay.remove();

      // redistribuir filas después de editar (por si cambió el tamaño y hay espacio en páginas anteriores)
      const moduloName = moduloActual;
      const entry = modulesIndex.get(moduloName);
      if (entry) {
        redistributeRows(entry);
      }
    });
  }

  /* ----------------- Botón ACEPTAR: agregar fila a módulo seleccionado ----------------- */
  acceptBtn.addEventListener("click", () => {
    if (!moduloActual)
      return alert("Por favor, crea o selecciona un módulo primero");

    const cantidad = cantidadInput.value || "";
    const med1 = med1Input.value || "";
    const med2 = med2Input.value || "";
    const material = profundidadInput.value || "";
    const nombreVal = nombreInput.value || "";

    const checkedSides = [];
    if (cantoMode === "numerico" && cantoNumMed1 && cantoNumMed2) {
      // No preseleccionar la combinacion por defecto; se mostrará pero sin estilo de seleccion.
    } else {
      if (ladoEls.top.classList.contains("active")) checkedSides.push("top");
      if (ladoEls.right.classList.contains("active"))
        checkedSides.push("right");
      if (ladoEls.bottom.classList.contains("active"))
        checkedSides.push("bottom");
      if (ladoEls.left.classList.contains("active")) checkedSides.push("left");
    }

    const entry = ensureModule(moduloActual);

    // crear fila DOM (sin attach aún)
    const rowEl = createRowElement({
      cantidad,
      med1,
      med2,
      material,
      nombreVal,
      checkedSides,
    });

    // en la práctica, medir la altura de la fila requiere haberla anexado al DOM;
    // strategy: añadir provisionalmente a un contenedor (o al body offscreen) para medir,
    // pero aquí usaremos un pequeño truco: anexamos temporeramente al último contenedor para medir.
    // Si no hay contenedor, crear uno en la página del header.
    if (!entry.containers.length) {
      // crear contenedor en la página donde está el header
      const headerPage =
        entry.headerEl.closest(".a4-sheet") || getAvailableA4ForHeight(120);
      addContainerToModuleOnPage(entry, headerPage);
    }

    // append temporal para medir
    const lastContainerObj = entry.containers[entry.containers.length - 1];
    lastContainerObj.el.appendChild(rowEl);

    // measure row height
    let rowHeight = DEFAULT_ROW_HEIGHT;
    try {
      const r = rowEl.getBoundingClientRect();
      rowHeight = Math.ceil(r.height) + 6; // añadir padding pequeño
    } catch (e) {
      rowHeight = DEFAULT_ROW_HEIGHT;
    }

    // if there's not enough space in that container, remove row and append via appendRowToModule
    // (appendRowToModule hará crear nuevo contenedor y página si corresponde)
    if (!containerHasRoom(lastContainerObj.el, rowHeight)) {
      // remove provisional
      rowEl.remove();
      appendRowToModule(entry, rowEl, rowHeight);
    } else {
      // ya quedó en el último contenedor; aseguramos handlers
      wireRowHandlers(rowEl, entry);
    }

    // reset inputs (solo si no están bloqueados)
    resetCuadroLocal();
    if (!cantidadInput.classList.contains("locked")) cantidadInput.value = 1;
    if (!med1Input.classList.contains("locked")) med1Input.value = "";
    if (!med2Input.classList.contains("locked")) med2Input.value = "";
    if (!profundidadInput.classList.contains("locked"))
      profundidadInput.value = "";
    if (!nombreInput.classList.contains("locked")) nombreInput.value = "";
    if (!notasInput.classList.contains("locked")) notasInput.value = "";
    nameCounter.textContent = "0/15";
    noteCounter.textContent = "0/20";
  });

  /* ----------------- Controles A4 (agregar/eliminar pagina) ----------------- */
  addA4Btn.addEventListener("click", () => createA4Page());
  removeA4Btn.addEventListener("click", () => {
    const pages = Array.from(a4PagesContainer.children);
    if (pages.length > 1) {
      // eliminar última página: mover cualquier contenedor que quede dentro de esa página a una nueva página
      const lastPage = pages[pages.length - 1];
      // remove containers safely
      const containers = Array.from(lastPage.querySelectorAll(".modulo-datos"));
      containers.forEach((c) => c.remove());
      lastPage.remove();
    }
  });

  /* ----------------- Optimizar proyecto activo ----------------- */
  printBtn.addEventListener("click", () => {
    try {
      if (
        window.GuardarDatos &&
        typeof window.GuardarDatos.obtenerProyectoActual === "function"
      ) {
        const proyectoActivo = window.GuardarDatos.obtenerProyectoActual();
        const nombreProyecto = proyectoActivo || "Proyecto actual";
        if (
          window.GuardarDatos &&
          typeof window.GuardarDatos.guardarProyectoNuevo === "function"
        ) {
          window.GuardarDatos.guardarProyectoNuevo(nombreProyecto);
        }
      }
    } catch (error) {
      console.warn(
        "No se pudo guardar el proyecto activo antes de optimizar:",
        error,
      );
    }

    window.location.href = "Optimizador.html";
  });

  /* ----------------- Export to PDF (html2pdf) - sólo A4 con canvas para wrappers ----------------- */
  pdfBtn.addEventListener("click", () => {
    const a4Pages = Array.from(a4PagesContainer.children);
    console.log(
      "📄 Encontrados",
      a4Pages.length,
      "páginas A4 para exportar a PDF",
    );

    // Crear PDF
    const jsPDFConstructor = window.jspdf.jsPDF;
    const pdf = new jsPDFConstructor({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Procesar cada página A4
    const processPages = async () => {
      for (let pageIdx = 0; pageIdx < a4Pages.length; pageIdx++) {
        const a4Page = a4Pages[pageIdx];

        console.log(`📄 Procesando página ${pageIdx + 1}`);

        if (pageIdx > 0) {
          pdf.addPage();
        }

        try {
          const pageCanvas = await html2canvas(a4Page, {
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
            allowTaint: true,
            useCORS: true,
            foreignObjectRendering: false,
          });

          const imgData = pageCanvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          console.log(`✅ Página ${pageIdx + 1} agregada al PDF`);
        } catch (error) {
          console.error(`❌ Error capturando página ${pageIdx + 1}:`, error);
        }
      }

      // Guardar PDF
      pdf.save("plantilla-A4.pdf");
      console.log("✅ PDF exported successfully");
    };

    processPages().catch((err) => {
      console.error("❌ PDF export error:", err);
      alert("Error al generar PDF: " + err);
    });
  });

  /* ----------------- Vista Previa PDF ----------------- */
  const vistaPreviaBtn = document.getElementById("vistaPreviaPDF");

  vistaPreviaBtn.addEventListener("click", () => {
    // Crear modal de vista previa
    const modal = document.createElement("div");
    modal.id = "vistaPreviaModal";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;

    // Header del modal
    const header = document.createElement("div");
    header.style.cssText = `
      width: 90%;
      max-width: 900px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      color: white;
    `;
    header.innerHTML = `
      <h2 style="margin:0;">Vista Previa PDF</h2>
      <button id="cerrarVistaPrevia" style="
        background: #e74c3c;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      ">✕ Cerrar</button>
    `;

    // Contenedor de páginas
    const contenido = document.createElement("div");
    contenido.style.cssText = `
      width: 90%;
      max-width: 900px;
      max-height: 70vh;
      overflow-y: auto;
      background: white;
      padding: 20px;
      border-radius: 10px;
    `;

    // Clonar las páginas A4 para la vista previa
    const clonePages = a4PagesContainer.cloneNode(true);
    clonePages.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 20px;
      align-items: center;
    `;

    // Procesar los dibujos en las páginas clonadas (igual que en exportarPDF)
    const dibujosWrappers = clonePages.querySelectorAll(".dibujo-wrapper");
    dibujosWrappers.forEach((wrapper, idx) => {
      const allWrappers = document.querySelectorAll(".dibujo-wrapper");
      const originalWrapper = allWrappers[idx];

      if (!originalWrapper) return;

      const origContenedorInterno = originalWrapper.querySelector(
        '[data-contenedor-interno="true"]',
      );
      if (!origContenedorInterno) return;

      const origPiezas =
        origContenedorInterno.querySelectorAll(".pieza-dibujada");
      if (origPiezas.length === 0) return;

      const origWidth =
        parseFloat(origContenedorInterno.dataset.originalWidth) || 3896;
      const origHeight =
        parseFloat(origContenedorInterno.dataset.originalHeight) || 2179;
      const zoomLevel = parseFloat(originalWrapper.dataset.zoomLevel) || 1;
      const wrapperWidth = originalWrapper.offsetWidth;
      const wrapperHeight = originalWrapper.offsetHeight;

      const computedStyle = window.getComputedStyle(originalWrapper);
      const padding = parseFloat(computedStyle.paddingTop) || 8;
      const borderWidth = parseFloat(computedStyle.borderTopWidth) || 2;
      const totalPaddingBorder = (padding + borderWidth) * 2;

      const availableWidth = wrapperWidth - totalPaddingBorder;
      const availableHeight = wrapperHeight - totalPaddingBorder;

      const scaleX = availableWidth / origWidth;
      const scaleY = availableHeight / origHeight;
      const baseScale = Math.min(scaleX, scaleY);
      const finalScale = baseScale * zoomLevel;

      const clonedContenedorInterno = wrapper.querySelector(
        '[data-contenedor-interno="true"]',
      );
      if (!clonedContenedorInterno) return;

      // Guardar los valores originales ANTES de modificar el clon
      const origWrapperStyle = window.getComputedStyle(originalWrapper);
      const origContenedorInternoStyle = window.getComputedStyle(
        origContenedorInterno,
      );

      // Buscar el segundo contenedor interno (el que tiene data-original-width)
      const origContenedorInterno2 = origContenedorInterno.querySelector(
        "[data-original-width][data-original-height]",
      );

      // Guardar el transform original del contenedor interno secundario
      let origTransform = "";
      let origTransformOrigin = "";
      let origContenedorTop = "";
      let origContenedorLeft = "";

      if (origContenedorInterno2) {
        // Obtener transform del segundo contenedor interno (el que tiene data-original-width)
        const origContenedorInterno2Style = window.getComputedStyle(
          origContenedorInterno2,
        );
        origTransform =
          origContenedorInterno2.style.transform ||
          origContenedorInterno2Style.transform ||
          origContenedorInterno2.style.cssText.match(
            /transform:\s*([^;]+)/,
          )?.[1] ||
          "";
        origTransformOrigin =
          origContenedorInterno2.style.transformOrigin ||
          origContenedorInterno2Style.transformOrigin;
        origContenedorTop = origContenedorInterno2.style.top || "";
        origContenedorLeft = origContenedorInterno2.style.left || "";
      } else {
        // Fallback al primer contenedor
        origTransform =
          origContenedorInterno.style.transform ||
          origContenedorInternoStyle.transform;
        origTransformOrigin =
          origContenedorInterno.style.transformOrigin ||
          origContenedorInternoStyle.transformOrigin;
        origContenedorTop =
          origContenedorInterno.style.top || origContenedorInternoStyle.top;
        origContenedorLeft =
          origContenedorInterno.style.left || origContenedorInternoStyle.left;
      }

      // Preservar la posición original del wrapper
      wrapper.style.position =
        originalWrapper.style.position ||
        origWrapperStyle.position ||
        wrapper.style.position ||
        "absolute";
      if (originalWrapper.style.left || origWrapperStyle.left) {
        wrapper.style.left =
          originalWrapper.style.left || origWrapperStyle.left;
      }
      if (originalWrapper.style.top || origWrapperStyle.top) {
        wrapper.style.top = originalWrapper.style.top || origWrapperStyle.top;
      }
      wrapper.style.right =
        originalWrapper.style.right ||
        origWrapperStyle.right ||
        wrapper.style.right ||
        "auto";
      wrapper.style.bottom =
        originalWrapper.style.bottom ||
        origWrapperStyle.bottom ||
        wrapper.style.bottom ||
        "auto";
      wrapper.style.margin =
        originalWrapper.style.margin ||
        origWrapperStyle.margin ||
        wrapper.style.margin ||
        "10px auto";
      wrapper.style.transform =
        originalWrapper.style.transform ||
        origWrapperStyle.transform ||
        wrapper.style.transform ||
        "none";
      wrapper.style.maxWidth = "100%";
      wrapper.style.maxHeight = "100%";
      wrapper.style.display = "block";
      wrapper.style.zIndex =
        originalWrapper.style.zIndex ||
        origWrapperStyle.zIndex ||
        wrapper.style.zIndex ||
        "auto";

      // Preservar el segundo contenedor interno si existe
      const clonedContenedorInterno2 = clonedContenedorInterno.querySelector(
        "[data-original-width][data-original-height]",
      );

      // En lugar de modificar las piezas, simplemente clonar todo el contenido interno
      // Esto preserva la posición exacta del dibujo
      if (clonedContenedorInterno2) {
        // El segundo contenedor interno ya tiene la estructura correcta
        // Solo necesitamos limpiar las piezas y volver a agregarlas con sus posiciones originales
        clonedContenedorInterno2.innerHTML = "";

        // Agregar las piezas con sus posiciones originales (sin escalar)
        origPiezas.forEach((origPieza) => {
          const piezaClon = origPieza.cloneNode(true);
          // Preservar las posiciones originales de las piezas
          piezaClon.style.position = "absolute";
          piezaClon.style.pointerEvents = "none";

          clonedContenedorInterno2.appendChild(piezaClon);
        });
      } else {
        // Si no existe el segundo contenedor, clonar todo el contenido
        clonedContenedorInterno.innerHTML = origContenedorInterno.innerHTML;
      }

      // Usar dimensiones originales para preservar la posición
      clonedContenedorInterno.style.width = origWidth + "px";
      clonedContenedorInterno.style.height = origHeight + "px";
      clonedContenedorInterno.style.position = "absolute";
      clonedContenedorInterno.style.top = "50%";
      clonedContenedorInterno.style.left = "50%";
      clonedContenedorInterno.style.transform = "translate(-50%, -50%)";

      const toolbar = wrapper.querySelector("[data-toolbar]");
      if (toolbar) {
        toolbar.style.display = "none";
      }
    });

    contenido.appendChild(clonePages);
    modal.appendChild(header);
    modal.appendChild(contenido);
    document.body.appendChild(modal);

    // Cerrar modal
    document
      .getElementById("cerrarVistaPrevia")
      .addEventListener("click", () => {
        modal.remove();
      });

    // Cerrar al hacer click fuera del contenido
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  });

  // init: ensure page
  if (a4PagesContainer.children.length === 0) createA4Page();

  /* ==================== FUNCIÓN DE GUARDADO A4 ==================== */
  function guardarDatosA4() {
    const datosA4 = {
      timestamp: Date.now(),
      modulos: [],
      paginas: [],
      wrappers: [], // 🆕 Guardar wrappers exportados
    };

    // Guardar información de cada módulo
    for (const [moduleName, entry] of modulesIndex.entries()) {
      const moduloData = {
        nombre: moduleName,
        createdAt: entry.createdAt,
        filas: [],
      };

      // Buscar todas las filas del módulo en todos los contenedores
      for (const containerObj of entry.containers) {
        const filas = Array.from(
          containerObj.el.querySelectorAll(".embedded-right-row"),
        );
        filas.forEach((fila) => {
          const qty = fila.querySelector(".er-qty")?.textContent.trim() || "-";
          const med1 =
            fila.querySelector(".er-med1")?.textContent.trim() || "-";
          const med2 =
            fila.querySelector(".er-med2")?.textContent.trim() || "-";
          const material =
            fila.querySelector(".er-material")?.textContent.trim() || "-";
          const nombre =
            fila.querySelector(".er-nombre")?.textContent.trim() || "-";
          const checkedSides = [];
          // modo grafico: detectar top/bottom/left/right
          if (fila.querySelector('.er-sides .lado.top[style*="crimson"]'))
            checkedSides.push("top");
          if (fila.querySelector('.er-sides .lado.bottom[style*="crimson"]'))
            checkedSides.push("bottom");
          if (fila.querySelector('.er-sides .lado.left[style*="crimson"]'))
            checkedSides.push("left");
          if (fila.querySelector('.er-sides .lado.right[style*="crimson"]'))
            checkedSides.push("right");
          // modo numerico: detectar celdas numericas seleccionadas
          const numericCells = Array.from(
            fila.querySelectorAll(".er-sides .lado-numeric[data-side]"),
          );
          numericCells.forEach((nc) => {
            const bg = (nc.style.background || "").toString();
            if (bg && bg.indexOf("crimson") !== -1) {
              const key = nc.getAttribute("data-side");
              if (key) checkedSides.push(key);
            }
          });
          const notes = fila.dataset.notes || "";

          moduloData.filas.push({
            cantidad: qty,
            med1: med1,
            med2: med2,
            material: material,
            nombre: nombre,
            lados: checkedSides,
            notas: notes,
          });
        });
      }

      datosA4.modulos.push(moduloData);
    }

    // 🆕 Guardar wrappers exportados en cada página A4
    const allPages = Array.from(a4PagesContainer.children);
    allPages.forEach((pageEl, pageIdx) => {
      const wrappersList = Array.from(
        pageEl.querySelectorAll(".dibujo-wrapper"),
      );
      wrappersList.forEach((wrapper, wrapperIdx) => {
        const contenedorInterno =
          wrapper.querySelector(
            "[data-original-width][data-original-height]",
          ) || wrapper.querySelector('[data-contenedor-interno="true"]');
        if (!contenedorInterno) return;

        const piezas = Array.from(
          contenedorInterno.querySelectorAll(".pieza-dibujada"),
        ).map((pieza) => {
          const attributes = {};
          for (const attr of pieza.attributes) {
            if (
              attr.name !== "class" &&
              attr.name !== "id" &&
              attr.name !== "style"
            ) {
              attributes[attr.name] = attr.value;
            }
          }

          const piezaContainer =
            pieza.closest("[data-pieza-export-wrapper='true']") ||
            pieza.parentElement;

          return {
            id: pieza.id,
            x: parseFloat(pieza.style.left) || 0,
            y: parseFloat(pieza.style.top) || 0,
            width: parseInt(pieza.style.width) || 100,
            height: parseInt(pieza.style.height) || 100,
            className: pieza.className,
            innerHTML: pieza.innerHTML,
            styleCssText: pieza.style.cssText,
            transform: pieza.style.transform || "",
            transformOrigin: pieza.style.transformOrigin || "center center",
            wrapperLeft: parseFloat(piezaContainer?.style.left) || 0,
            wrapperTop: parseFloat(piezaContainer?.style.top) || 0,
            wrapperWidth: parseFloat(piezaContainer?.style.width) || 0,
            wrapperHeight: parseFloat(piezaContainer?.style.height) || 0,
            attributes: attributes,
          };
        });

        datosA4.wrappers.push({
          pageIdx: pageIdx,
          wrapperIdx: wrapperIdx,
          zoomLevel: parseFloat(wrapper.dataset.zoomLevel) || 1,
          isApplied: wrapper.dataset.isApplied === "true",
          wrapperWidth: Math.round(wrapper.offsetWidth),
          wrapperHeight: Math.round(wrapper.offsetHeight),
          contentOffsetX: parseFloat(wrapper._contentOffsetX || 0) || 0,
          contentOffsetY: parseFloat(wrapper._contentOffsetY || 0) || 0,
          style: {
            position:
              wrapper.style.position ||
              wrapper.dataset.dragPosition ||
              "relative",
            left: wrapper.style.left || wrapper.dataset.dragLeft || "",
            top: wrapper.style.top || wrapper.dataset.dragTop || "",
            margin: wrapper.style.margin || "0",
          },
          contenedorInterno: {
            originalWidth:
              parseFloat(contenedorInterno.dataset.originalWidth) || 0,
            originalHeight:
              parseFloat(contenedorInterno.dataset.originalHeight) || 0,
          },
          piezas: piezas,
        });
      });
    });

    // 🆕 Guardar TODAS las piezas de cada página A4 (no solo las de wrappers)
    datosA4.paginasPiezas = [];
    allPages.forEach((pageEl, pageIdx) => {
      const a4RightDraw = pageEl.querySelector(".a4-right-draw");
      if (!a4RightDraw) {
        console.warn(`  ⚠️ Página ${pageIdx}: No se encontró .a4-right-draw`);
        return;
      }

      // Debugging: ver qué hay en a4RightDraw
      console.log(`  Página ${pageIdx}: Elementos en a4RightDraw:`, {
        wrappers: a4RightDraw.querySelectorAll(".dibujo-wrapper").length,
        divs: a4RightDraw.querySelectorAll("div").length,
        piezas_directas: a4RightDraw.querySelectorAll(".pieza-dibujada").length,
        children: a4RightDraw.children.length,
        html_length: a4RightDraw.innerHTML.length,
      });

      // Intentar buscar piezas de varias formas
      let todasLasPiezas = [];

      // Opción 1: Buscar dentro de wrappers
      const wrappers = Array.from(
        a4RightDraw.querySelectorAll(".dibujo-wrapper"),
      );
      console.log(
        `  Página ${pageIdx}: Encontrados ${wrappers.length} wrappers`,
      );

      wrappers.forEach((wrapper) => {
        const contenedorInterno =
          wrapper.querySelector(
            "[data-original-width][data-original-height]",
          ) || wrapper.querySelector('[data-contenedor-interno="true"]');

        if (contenedorInterno) {
          const piezasDelWrapper = Array.from(
            contenedorInterno.querySelectorAll(".pieza-dibujada"),
          );
          console.log(
            `    Wrapper: Encontradas ${piezasDelWrapper.length} piezas en contenedorInterno`,
          );
          todasLasPiezas.push(...piezasDelWrapper);
        }
      });

      // Opción 2: Si no hay wrappers, buscar piezas directas
      if (todasLasPiezas.length === 0) {
        console.log(
          `  Página ${pageIdx}: Buscando piezas directas en a4RightDraw...`,
        );
        todasLasPiezas = Array.from(
          a4RightDraw.querySelectorAll(".pieza-dibujada"),
        );
        console.log(
          `  Página ${pageIdx}: Encontradas ${todasLasPiezas.length} piezas directas`,
        );
      }

      const piezasData = todasLasPiezas.map((pieza) => {
        const attributes = {};
        for (const attr of pieza.attributes) {
          if (
            attr.name !== "class" &&
            attr.name !== "id" &&
            attr.name !== "style"
          ) {
            attributes[attr.name] = attr.value;
          }
        }

        return {
          id: pieza.id,
          x: parseFloat(pieza.style.left) || 0,
          y: parseFloat(pieza.style.top) || 0,
          width: parseInt(pieza.style.width) || 100,
          height: parseInt(pieza.style.height) || 100,
          className: pieza.className,
          innerHTML: pieza.innerHTML,
          styleCssText: pieza.style.cssText,
          attributes: attributes,
        };
      });

      datosA4.paginasPiezas.push({
        pageIdx: pageIdx,
        piezas: piezasData,
      });
    });

    console.log(
      "💾 Guardando",
      datosA4.wrappers.length,
      "wrappers exportados y",
      datosA4.paginasPiezas.reduce((sum, p) => sum + p.piezas.length, 0),
      "piezas totales de páginas",
    );

    // Guardar en localStorage
    localStorage.setItem("datosPlantillaA4", JSON.stringify(datosA4));
    return datosA4;
  }

  /* ==================== FUNCIÓN DE CARGA A4 ==================== */
  function cargarDatosA4() {
    const datosStr = localStorage.getItem("datosPlantillaA4");
    if (!datosStr) {
      console.warn("No hay datos guardados para cargar");
      return null;
    }

    try {
      const datosA4 = JSON.parse(datosStr);

      // Limpiar módulos existentes
      modulesIndex.clear();
      modulosList.innerHTML = "";

      // Limpiar páginas A4 y crear nueva inicial
      while (a4PagesContainer.children.length > 1) {
        a4PagesContainer.children[
          a4PagesContainer.children.length - 1
        ].remove();
      }

      // Limpiar contenedores de la primera página
      const firstPage = a4PagesContainer.children[0];
      const containersToRemove = Array.from(
        firstPage.querySelectorAll(".modulo-marco, .modulo-datos"),
      );
      containersToRemove.forEach((c) => c.remove());

      // Limpiar wrappers de la primera página
      const wrappersToRemove = Array.from(
        firstPage.querySelectorAll(".dibujo-wrapper"),
      );
      wrappersToRemove.forEach((w) => w.remove());

      // Cargar cada módulo
      for (const moduloData of datosA4.modulos) {
        const entry = ensureModule(moduloData.nombre);

        // Cargar cada fila del módulo
        for (const filaData of moduloData.filas) {
          const rowEl = createRowElement({
            cantidad: filaData.cantidad,
            med1: filaData.med1,
            med2: filaData.med2,
            material: filaData.material,
            nombreVal: filaData.nombre,
            checkedSides: filaData.lados || [],
          });

          // Guardar notas en dataset
          if (filaData.notas) {
            rowEl.dataset.notes = filaData.notas;
          }

          // Agregar la fila al módulo
          appendRowToModule(entry, rowEl);
        }
      }

      // 🆕 Cargar wrappers exportados
      if (datosA4.wrappers && datosA4.wrappers.length > 0) {
        console.log(
          "📥 Restaurando",
          datosA4.wrappers.length,
          "wrappers exportados",
        );

        datosA4.wrappers.forEach((wrapperData) => {
          const pageIdx = wrapperData.pageIdx;
          const allPages = Array.from(a4PagesContainer.children);

          // Crear páginas si no existen
          while (allPages.length <= pageIdx) {
            createA4Page();
            allPages.push(
              a4PagesContainer.children[a4PagesContainer.children.length - 1],
            );
          }

          const pageEl = allPages[pageIdx];
          const a4RightDraw = pageEl.querySelector(".a4-right-draw");

          if (!a4RightDraw) {
            console.warn("⚠️ No se encontró .a4-right-draw en página", pageIdx);
            return;
          }

          // Recrear wrapper
          const wrapper = document.createElement("div");
          const isApplied = wrapperData.isApplied === true;
          wrapper.className = `dibujo-wrapper ${isApplied ? "applied" : "editing"}`;
          wrapper.style.position = wrapperData.style?.position || "relative";
          wrapper.style.width = wrapperData.wrapperWidth + "px";
          wrapper.style.height = wrapperData.wrapperHeight + "px";
          wrapper.style.margin = wrapperData.style?.margin || "0";
          wrapper.style.padding = "0";
          wrapper.style.backgroundColor = wrapperData.isApplied
            ? "transparent"
            : "#f5f5f5";
          wrapper.style.border = wrapperData.isApplied
            ? "none"
            : "1px solid #c8c8c8";
          wrapper.style.borderRadius = wrapperData.isApplied ? "0" : "6px";
          wrapper.style.boxShadow = wrapperData.isApplied
            ? "none"
            : "0 2px 8px rgba(0,0,0,0.08)";
          wrapper.style.overflow = "visible";
          wrapper.style.cursor = "grab";
          wrapper.dataset.isDibujoExportado = "true";
          wrapper.dataset.isApplied = wrapperData.isApplied.toString();
          wrapper.dataset.zoomLevel = wrapperData.zoomLevel.toString();
          wrapper.dataset.contentOffsetX = (
            wrapperData.contentOffsetX || 0
          ).toString();
          wrapper.dataset.contentOffsetY = (
            wrapperData.contentOffsetY || 0
          ).toString();
          wrapper._contentOffsetX = parseFloat(wrapperData.contentOffsetX || 0);
          wrapper._contentOffsetY = parseFloat(wrapperData.contentOffsetY || 0);
          wrapper.style.zIndex = "10";
          wrapper.style.pointerEvents = "auto";

          if (wrapperData.style?.left) {
            wrapper.style.left = wrapperData.style.left;
            wrapper.dataset.dragLeft = wrapperData.style.left;
          }
          if (wrapperData.style?.top) {
            wrapper.style.top = wrapperData.style.top;
            wrapper.dataset.dragTop = wrapperData.style.top;
          }
          if (wrapperData.style?.position) {
            wrapper.dataset.dragPosition = wrapperData.style.position;
          }

          // Si el wrapper se movió, aseguramos que use absolute para preservar coordenadas
          if (
            (wrapperData.style?.left || wrapperData.style?.top) &&
            wrapper.style.position !== "absolute"
          ) {
            wrapper.style.position = "absolute";
          }

          // Crear contenedores
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
          contenedorPiezas.dataset.contenedorPiezas = "true";

          const contenedorInterno = document.createElement("div");
          contenedorInterno.style.position = "absolute";
          contenedorInterno.style.width =
            wrapperData.contenedorInterno.originalWidth + "px";
          contenedorInterno.style.height =
            wrapperData.contenedorInterno.originalHeight + "px";
          contenedorInterno.style.transformOrigin = "center center";
          contenedorInterno.dataset.originalWidth =
            wrapperData.contenedorInterno.originalWidth.toString();
          contenedorInterno.dataset.originalHeight =
            wrapperData.contenedorInterno.originalHeight.toString();
          contenedorInterno.dataset.contenedorInterno = "true";
          contenedorInterno.style.background = "transparent";
          contenedorInterno.style.top = "50%";
          contenedorInterno.style.left = "50%";
          contenedorInterno.style.margin = "0";
          contenedorInterno.style.transform = "translate(-50%, -50%) scale(1)";

          // Restaurar piezas
          wrapperData.piezas.forEach((piezaData) => {
            const piezaContainer = document.createElement("div");
            piezaContainer.dataset.piezaExportWrapper = "true";
            piezaContainer.style.position = "absolute";
            piezaContainer.style.left = (piezaData.wrapperLeft || 0) + "px";
            piezaContainer.style.top = (piezaData.wrapperTop || 0) + "px";
            piezaContainer.style.width =
              (piezaData.wrapperWidth || piezaData.width || 100) + "px";
            piezaContainer.style.height =
              (piezaData.wrapperHeight || piezaData.height || 100) + "px";
            piezaContainer.style.pointerEvents = "none";
            piezaContainer.style.overflow = "visible";

            const piezaClon = document.createElement("div");
            piezaClon.className = piezaData.className;
            piezaClon.id = piezaData.id;
            piezaClon.innerHTML = piezaData.innerHTML;
            piezaClon.style.cssText = piezaData.styleCssText || "";
            piezaClon.style.position = "absolute";
            piezaClon.style.left = piezaData.x + "px";
            piezaClon.style.top = piezaData.y + "px";
            piezaClon.style.width = piezaData.width + "px";
            piezaClon.style.height = piezaData.height + "px";
            piezaClon.style.pointerEvents = "none";
            piezaClon.style.transform = piezaData.transform || "";
            piezaClon.style.transformOrigin =
              piezaData.transformOrigin || "center center";

            if (piezaData.attributes) {
              for (const [attrName, attrValue] of Object.entries(
                piezaData.attributes,
              )) {
                piezaClon.setAttribute(attrName, attrValue);
              }
            }

            piezaContainer.appendChild(piezaClon);
            contenedorInterno.appendChild(piezaContainer);
          });

          contenedorPiezas.appendChild(contenedorInterno);
          wrapper.appendChild(contenedorPiezas);

          let exportContainer = pageEl.querySelector(".a4-exported-drawings");
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
            pageEl.appendChild(exportContainer);
          }
          exportContainer.appendChild(wrapper);

          const scheduleWrapperRestore = (attempts = 0) => {
            const restoreFn =
              window.ExportarDibujo &&
              typeof window.ExportarDibujo.restoreWrapper === "function"
                ? window.ExportarDibujo.restoreWrapper
                : null;

            if (restoreFn) {
              restoreFn(wrapper);
              return;
            }

            if (attempts < 8) {
              setTimeout(() => scheduleWrapperRestore(attempts + 1), 250);
            } else {
              console.warn(
                "⚠️ No se pudo restaurar el wrapper exportado tras varios intentos",
              );
            }
          };

          scheduleWrapperRestore();

          console.log(
            "✅ Wrapper",
            wrapperData.wrapperIdx,
            "restaurado en página",
            pageIdx,
          );
        });

        const scheduleGlobalRestore = (attempts = 0) => {
          const restoreAllFn =
            window.ExportarDibujo &&
            typeof window.ExportarDibujo.restoreAll === "function"
              ? window.ExportarDibujo.restoreAll
              : null;

          if (restoreAllFn) {
            restoreAllFn();
            return;
          }

          if (attempts < 8) {
            setTimeout(() => scheduleGlobalRestore(attempts + 1), 250);
          } else {
            console.warn(
              "⚠️ No se pudo ejecutar restoreAll tras cargar wrappers",
            );
          }
        };

        scheduleGlobalRestore();
        // Notificar a H_exportar.js que los wrappers han sido añadidos al DOM
        try {
          document.dispatchEvent(new Event("wrappers-restored"));
        } catch (err) {
          console.warn("⚠️ Error despachando wrappers-restored:", err);
        }
      }

      return datosA4;
    } catch (err) {
      console.error("Error al cargar datos A4:", err);
      return null;
    }
  }

  // expose helpers for debugging
  window.__miPlantilla = {
    createA4Page,
    ensureModule,
    modulesIndex,
    guardarDatosA4,
    cargarDatosA4,
  };
})();
