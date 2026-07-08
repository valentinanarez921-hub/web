// panel_piezas_cuadricula.js
// Panel derecho: mostrar piezas dibujadas en la cuadrícula agrupadas por módulo
(function () {
  const popupRight = document.getElementById("popup-right");
  if (!popupRight) return;

  // Crear estructura del panel derecho
  function crearPanelDerecho() {
    popupRight.innerHTML = `
      <div id="right-panel-content" style="display: flex; flex-direction: column; gap: 8px;">
        <h4 style="margin: 0; font-size: 13px;">Piezas en cuadrícula</h4>
        <div id="modulos-cuadricula-list" style="display: flex; flex-direction: column; gap: 6px;">
          <!-- Aquí aparecerán los módulos con piezas dibujadas -->
        </div>
      </div>
    `;
  }

  // Actualizar panel derecho cuando cambian las piezas en la cuadrícula
  function actualizarPanelDerecho() {
    const gridArea = document.getElementById("gridArea");
    if (!gridArea) {
      console.error("gridArea no encontrado");
      return;
    }

    const contenedor = document.getElementById("modulos-cuadricula-list");
    if (!contenedor) return;

    const scrollPosition = popupRight.scrollTop;

    // Guardar estado de módulos abiertos antes de limpiar
    const estadoModulos = {};
    contenedor.querySelectorAll("[data-modulo-nombre]").forEach((el) => {
      const nombreModulo = el.dataset.moduloNombre;
      const lista = el.querySelector(".modulo-lista");
      estadoModulos[nombreModulo] = lista && lista.style.display !== "none";
    });

    contenedor.innerHTML = "";

    // Agrupar piezas por módulo
    const piezasPorModulo = {};
    const piezasDiajadas = gridArea.querySelectorAll(".pieza-dibujada");

    if (piezasDiajadas.length === 0) {
      contenedor.innerHTML =
        '<em style="font-size: 11px; color: #999;">Sin piezas dibujadas</em>';
      return;
    }

    piezasDiajadas.forEach((pieza) => {
      const nombreModulo = pieza.dataset.modulo || "Sin módulo";
      if (!piezasPorModulo[nombreModulo]) {
        piezasPorModulo[nombreModulo] = [];
      }
      piezasPorModulo[nombreModulo].push(pieza);
    });

    // Crear elementos para cada módulo
    Object.keys(piezasPorModulo).forEach((modulo) => {
      const piezas = piezasPorModulo[modulo];

      // Contenedor del módulo
      const moduloDiv = document.createElement("div");
      moduloDiv.dataset.moduloNombre = modulo;
      moduloDiv.style.border = "1px solid #ddd";
      moduloDiv.style.borderRadius = "4px";
      moduloDiv.style.background = "#fafafa";
      moduloDiv.style.cursor = "pointer";
      moduloDiv.style.marginBottom = "6px";
      moduloDiv.style.overflow = "hidden";

      // Encabezado del módulo (clickeable)
      const encabezado = document.createElement("div");
      encabezado.style.padding = "8px 10px";
      encabezado.style.fontWeight = "bold";
      encabezado.style.fontSize = "12px";
      encabezado.style.display = "flex";
      encabezado.style.alignItems = "center";
      encabezado.style.justifyContent = "space-between";
      encabezado.style.userSelect = "none";
      encabezado.style.background = "#f0f0f0";
      encabezado.style.color = "#333";
      encabezado.style.cursor = "pointer";
      encabezado.textContent = `${modulo} (${piezas.length})`;

      // Flecha desplegable
      const flecha = document.createElement("span");
      flecha.textContent = "▼";
      flecha.style.fontSize = "10px";
      flecha.style.color = "#666";
      flecha.style.transition = "transform 0.2s";
      encabezado.appendChild(flecha);

      // Lista de piezas (oculta por defecto)
      const listaPiezas = document.createElement("div");
      listaPiezas.className = "modulo-lista";
      // Para módulos nuevos, mostrar por defecto. Para existentes, restaurar estado
      const mostrarPorDefecto = !(modulo in estadoModulos);
      listaPiezas.style.display =
        estadoModulos[modulo] !== false &&
        (mostrarPorDefecto || estadoModulos[modulo])
          ? "flex"
          : "none";
      listaPiezas.style.flexDirection = "column";
      listaPiezas.style.padding = "4px 0";
      listaPiezas.style.borderTop = "1px solid #e0e0e0";
      listaPiezas.style.background = "#fff";

      // Evitar que clics en la lista cierren el panel
      listaPiezas.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Agrupar piezas por nombre+medidas para contar duplicados
      const piezasAgrupadas = {};
      piezas.forEach((pieza) => {
        const nombrePieza =
          pieza.querySelector(".nombre-pieza")?.innerText || "Pieza";
        const med1 = pieza.dataset.m1 || "";
        const med2 = pieza.dataset.m2 || "";
        const piezaKey = `${nombrePieza}_${med1}_${med2}`;

        if (!piezasAgrupadas[piezaKey]) {
          piezasAgrupadas[piezaKey] = [];
        }
        piezasAgrupadas[piezaKey].push(pieza);
      });

      // Crear items para CADA pieza individual, pero mostrar el contador total
      piezas.forEach((pieza) => {
        const nombrePieza =
          pieza.querySelector(".nombre-pieza")?.innerText || "Pieza";
        const med1 = pieza.dataset.m1 || "";
        const med2 = pieza.dataset.m2 || "";
        const piezaKey = `${nombrePieza}_${med1}_${med2}`;
        const material = pieza.dataset.material || "-";
        const piezaId = pieza.id; // Guardar ID antes de crear listeners

        // VALIDACIÓN: Si ya existe un item con este piezaId, no crear duplicado
        if (document.querySelector(`[data-pieza-id="${piezaId}"]`)) {
          console.log(`Item ya existe para pieza ${piezaId}, saltando...`);
          return;
        }

        console.log(
          `Creando item para pieza: ${nombrePieza}, piezaId: ${piezaId}`,
        );

        // Contar total de piezas iguales
        const totalPiezasIguales = piezasAgrupadas[piezaKey].length;

        const itemPieza = document.createElement("div");
        itemPieza.dataset.piezaKey = piezaKey;
        itemPieza.dataset.piezaId = piezaId;
        console.log(
          `itemPieza.dataset.piezaId asignado a: ${itemPieza.dataset.piezaId}`,
        );

        itemPieza.style.padding = "6px 10px";
        itemPieza.style.fontSize = "11px";
        itemPieza.style.borderBottom = "1px solid #f0f0f0";
        itemPieza.style.display = "flex";
        itemPieza.style.alignItems = "center";
        itemPieza.style.justifyContent = "space-between";
        itemPieza.style.cursor = "pointer";
        itemPieza.style.background = "#fff";
        itemPieza.style.transition = "background 0.1s";
        itemPieza.style.userSelect = "none";

        const nombreSpan = document.createElement("span");
        nombreSpan.style.fontSize = "11px";
        nombreSpan.style.flex = "1";

        const nombreStrong = document.createElement("strong");
        nombreStrong.textContent = nombrePieza;
        nombreStrong.style.fontWeight = "700";

        const restInfo = document.createElement("span");
        restInfo.textContent = ` ${totalPiezasIguales}× (${med1}×${med2}) - ${material}`;

        nombreSpan.appendChild(nombreStrong);
        nombreSpan.appendChild(restInfo);
        itemPieza.appendChild(nombreSpan);

        // Contenedor de botones
        const botonesDiv = document.createElement("div");
        botonesDiv.style.display = "flex";
        botonesDiv.style.gap = "4px";
        botonesDiv.style.alignItems = "center";

        // Botón subir capa
        const btnSubir = document.createElement("button");
        btnSubir.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btnSubir.title = "Subir capa";
        btnSubir.style.background = "none";
        btnSubir.style.border = "none";
        btnSubir.style.color = "#0080ff";
        btnSubir.style.cursor = "pointer";
        btnSubir.style.padding = "2px 4px";
        btnSubir.style.fontSize = "10px";
        btnSubir.addEventListener("click", (e) => {
          e.stopPropagation();
          const piezaActual = document.getElementById(
            itemPieza.dataset.piezaId,
          );
          if (!piezaActual) return;

          const gridArea = document.getElementById("gridArea");
          if (!gridArea) return;

          const currentZ = parseInt(piezaActual.style.zIndex) || 1;
          const maxZ = gridArea.querySelectorAll(".pieza-dibujada").length;

          // Si ya está en la capa máxima, no hacer nada
          if (currentZ >= maxZ) return;

          // Buscar la pieza que está en currentZ + 1
          let piezaIntercambio = null;
          gridArea.querySelectorAll(".pieza-dibujada").forEach((p) => {
            if (parseInt(p.style.zIndex) === currentZ + 1) {
              piezaIntercambio = p;
            }
          });

          // Intercambiar z-index
          if (piezaIntercambio) {
            piezaIntercambio.style.zIndex = currentZ;
          }
          piezaActual.style.zIndex = currentZ + 1;

          // Seleccionar esta pieza y deseleccionar otras
          gridArea
            .querySelectorAll(".pieza-dibujada.pieza-seleccionada")
            .forEach((p) => {
              p.classList.remove("pieza-seleccionada");
            });
          piezaActual.classList.add("pieza-seleccionada");

          // Actualizar label de capa de este item
          capaLabel.textContent = String(currentZ + 1);

          // Reordenar en el panel y sincronizar
          actualizarPanelDerecho();
          sincronizarSeleccion();
        });
        botonesDiv.appendChild(btnSubir);

        const capaLabel = document.createElement("span");
        const piezaActualInicial = document.getElementById(piezaId);
        const zInicial = piezaActualInicial
          ? parseInt(piezaActualInicial.style.zIndex) || 1
          : 1;
        capaLabel.textContent = String(zInicial);
        capaLabel.title = "Capa actual";
        capaLabel.style.display = "inline-flex";
        capaLabel.style.alignItems = "center";
        capaLabel.style.justifyContent = "center";
        capaLabel.style.minWidth = "28px";
        capaLabel.style.padding = "2px 4px";
        capaLabel.style.fontSize = "10px";
        capaLabel.style.color = "#333";
        capaLabel.style.background = "#f5f5f5";
        capaLabel.style.borderRadius = "4px";
        botonesDiv.appendChild(capaLabel);

        // Botón bajar capa
        const btnBajar = document.createElement("button");
        btnBajar.innerHTML = '<i class="fas fa-arrow-down"></i>';
        btnBajar.title = "Bajar capa";
        btnBajar.style.background = "none";
        btnBajar.style.border = "none";
        btnBajar.style.color = "#0080ff";
        btnBajar.style.cursor = "pointer";
        btnBajar.style.padding = "2px 4px";
        btnBajar.style.fontSize = "10px";
        btnBajar.addEventListener("click", (e) => {
          e.stopPropagation();
          const piezaActual = document.getElementById(
            itemPieza.dataset.piezaId,
          );
          if (!piezaActual) return;

          const gridArea = document.getElementById("gridArea");
          if (!gridArea) return;

          const currentZ = parseInt(piezaActual.style.zIndex) || 1;

          // Si ya está en la capa mínima (1), no hacer nada
          if (currentZ <= 1) return;

          // Buscar la pieza que está en currentZ - 1
          let piezaIntercambio = null;
          gridArea.querySelectorAll(".pieza-dibujada").forEach((p) => {
            if (parseInt(p.style.zIndex) === currentZ - 1) {
              piezaIntercambio = p;
            }
          });

          // Intercambiar z-index
          if (piezaIntercambio) {
            piezaIntercambio.style.zIndex = currentZ;
          }
          piezaActual.style.zIndex = currentZ - 1;

          // Seleccionar esta pieza y deseleccionar otras
          gridArea
            .querySelectorAll(".pieza-dibujada.pieza-seleccionada")
            .forEach((p) => {
              p.classList.remove("pieza-seleccionada");
            });
          piezaActual.classList.add("pieza-seleccionada");

          // Actualizar label de capa de este item
          capaLabel.textContent = String(currentZ - 1);

          // Reordenar en el panel y sincronizar
          actualizarPanelDerecho();
          sincronizarSeleccion();
        });
        botonesDiv.appendChild(btnBajar);

        // Botón ocultar/mostrar (ojo)
        const btnOcultar = document.createElement("button");
        const piezaActualParaOjo = document.getElementById(piezaId);
        const esVisible = piezaActualParaOjo
          ? piezaActualParaOjo.dataset.visible !== "false"
          : true;
        btnOcultar.innerHTML = esVisible
          ? '<i class="fas fa-eye"></i>'
          : '<i class="fas fa-eye-slash"></i>';
        btnOcultar.title = esVisible ? "Ocultar pieza" : "Mostrar pieza";
        btnOcultar.style.background = "none";
        btnOcultar.style.border = "none";
        btnOcultar.style.color = esVisible ? "#666" : "#999";
        btnOcultar.style.cursor = "pointer";
        btnOcultar.style.padding = "2px 4px";
        btnOcultar.style.fontSize = "10px";
        btnOcultar.addEventListener("click", (e) => {
          e.stopPropagation();
          const piezaActual = document.getElementById(
            itemPieza.dataset.piezaId,
          );
          if (!piezaActual) return;

          const esVisibleActualmente = piezaActual.dataset.visible !== "false";

          if (esVisibleActualmente) {
            // Ocultar pieza
            piezaActual.style.display = "none";
            piezaActual.dataset.visible = "false";
            btnOcultar.innerHTML = '<i class="fas fa-eye-slash"></i>';
            btnOcultar.title = "Mostrar pieza";
            btnOcultar.style.color = "#999";
            console.log(`✓ Pieza ${piezaActual.id} ocultada`);
          } else {
            // Mostrar pieza
            piezaActual.style.display = "flex";
            piezaActual.dataset.visible = "true";
            btnOcultar.innerHTML = '<i class="fas fa-eye"></i>';
            btnOcultar.title = "Ocultar pieza";
            btnOcultar.style.color = "#666";
            console.log(`✓ Pieza ${piezaActual.id} mostrada`);
          }

          // Actualizar icono del botón
          actualizarPanelDerecho();
        });
        botonesDiv.appendChild(btnOcultar);

        // Botón eliminar
        const btnEliminar = document.createElement("button");
        btnEliminar.innerHTML = '<i class="fas fa-trash"></i>';
        btnEliminar.title = "Eliminar pieza";
        btnEliminar.style.background = "none";
        btnEliminar.style.border = "none";
        btnEliminar.style.color = "#dc3545";
        btnEliminar.style.cursor = "pointer";
        btnEliminar.style.padding = "2px 4px";
        btnEliminar.style.fontSize = "10px";
        btnEliminar.addEventListener("click", (e) => {
          e.stopPropagation();
          const piezaActual = document.getElementById(
            itemPieza.dataset.piezaId,
          );
          if (piezaActual) {
            piezaActual.remove();
          }
          if (
            window.Cuadricula &&
            typeof window.Cuadricula.normalizeZIndices === "function"
          ) {
            window.Cuadricula.normalizeZIndices();
          }
          actualizarPanelDerecho();
        });
        botonesDiv.appendChild(btnEliminar);

        itemPieza.appendChild(botonesDiv);

        // Los event listeners se manejan aquí directamente
        itemPieza.addEventListener("click", (e) => {
          // Si es click en un botón, ignorar la selección
          if (e.target.closest("button")) {
            return;
          }

          const piezaId = itemPieza.dataset.piezaId;
          const gridArea = document.getElementById("gridArea");
          if (!gridArea) return;

          const pieza = document.getElementById(piezaId);
          if (!pieza) {
            console.error("No encontrada pieza con ID:", piezaId);
            return;
          }

          // Toggle selección
          if (pieza.classList.contains("pieza-seleccionada")) {
            pieza.classList.remove("pieza-seleccionada");
          } else {
            // Deseleccionar otros
            gridArea
              .querySelectorAll(".pieza-dibujada.pieza-seleccionada")
              .forEach((p) => {
                p.classList.remove("pieza-seleccionada");
              });
            pieza.classList.add("pieza-seleccionada");
          }

          // Sincronizar visual
          sincronizarSeleccion();
        });

        listaPiezas.appendChild(itemPieza);
      });

      // Evento para desplegar/contraer
      encabezado.addEventListener("click", () => {
        const estaAbierto = listaPiezas.style.display !== "none";
        listaPiezas.style.display = estaAbierto ? "none" : "flex";
        listaPiezas.style.flexDirection = "column";
        flecha.style.transform = estaAbierto
          ? "rotate(0deg)"
          : "rotate(-90deg)";
        flecha.style.transition = "transform 0.2s";
      });

      // Restaurar estado de la flecha si estaba abierto
      if (estadoModulos[modulo]) {
        flecha.style.transform = "rotate(-90deg)";
      }

      // ORDENAR ITEMS POR Z-INDEX (de mayor a menor, arriba los de capa más alta)
      const itemsArray = Array.from(listaPiezas.children);
      itemsArray.sort((itemA, itemB) => {
        const piezaA = document.getElementById(itemA.dataset.piezaId);
        const piezaB = document.getElementById(itemB.dataset.piezaId);
        const zA = parseInt(piezaA?.style.zIndex) || 0;
        const zB = parseInt(piezaB?.style.zIndex) || 0;
        return zB - zA; // Mayor z-index primero (arriba)
      });

      // Reconstruir la lista ordenada
      itemsArray.forEach((item) => {
        listaPiezas.appendChild(item);
      });

      moduloDiv.appendChild(encabezado);
      moduloDiv.appendChild(listaPiezas);
      contenedor.appendChild(moduloDiv);
    });

    popupRight.scrollTop = scrollPosition;

    // NO sincronizar aquí - dejar que los listeners se encarguen
  }

  // Inicializar
  crearPanelDerecho();
  actualizarPanelDerecho();

  // Event delegation: Delegación de eventos para todo el panel
  const popup = document.getElementById("popup-right");
  if (popup) {
    console.log("popup-right: listeners inicializados");

    // Mouseover/out para visual feedback (estos eventos se propagan)
    popup.addEventListener("mouseover", (e) => {
      const itemPieza = e.target.closest("[data-pieza-id]");
      if (!itemPieza) return;

      const piezaId = itemPieza.dataset.piezaId;
      const pieza = document.getElementById(piezaId);
      if (!pieza) return;

      // Visual feedback
      if (itemPieza.dataset.isSelected !== "true") {
        itemPieza.style.background = "#f0f0f0";
      }
      pieza.style.outline = "2px solid #666";
    });

    popup.addEventListener("mouseout", (e) => {
      const itemPieza = e.target.closest("[data-pieza-id]");
      if (!itemPieza) return;

      const piezaId = itemPieza.dataset.piezaId;
      const pieza = document.getElementById(piezaId);
      if (!pieza) return;

      // Restaurar visual
      if (itemPieza.dataset.isSelected !== "true") {
        itemPieza.style.background = "#fff";
      }
      pieza.style.outline = "none";
    });
  }

  // Sincronizar selección: cuando se selecciona en la cuadrícula, actualizar panel
  function sincronizarSeleccion() {
    const gridArea = document.getElementById("gridArea");
    if (!gridArea) return;

    // PRIMERO: Limpiar todos los items del panel - usar el mismo selector
    const todosLosItems = document.querySelectorAll(
      ".modulo-lista div[data-pieza-id]",
    );
    console.log("sincronizarSeleccion: limpiando items:", todosLosItems.length);

    todosLosItems.forEach((item) => {
      item.style.setProperty("background", "#fff", "important");
      item.style.outline = "none";
      item.dataset.isSelected = "false";
      // Forzar repintado
      void item.offsetHeight;
    });

    // SEGUNDO: Marcar solo los que están seleccionados en la cuadrícula
    gridArea
      .querySelectorAll(".pieza-dibujada.pieza-seleccionada")
      .forEach((piezaSeleccionada) => {
        const piezaId = piezaSeleccionada.id;
        const itemMatch = document.querySelector(
          `[data-pieza-id="${piezaId}"]`,
        );
        if (itemMatch) {
          itemMatch.style.setProperty("background", "#d4d4d4", "important");
          itemMatch.dataset.isSelected = "true";
          // Forzar repintado
          void itemMatch.offsetHeight;
        }
      });
  }

  // Usar MutationObserver para detectar cambios en las clases de las piezas
  const gridArea = document.getElementById("gridArea");
  if (gridArea) {
    const observer = new MutationObserver((mutations) => {
      // Verificar si alguna mutación es sobre la clase "pieza-seleccionada"
      let hayChangioEnSeleccion = false;
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "class" &&
          mutation.target.classList &&
          mutation.target.classList.contains("pieza-dibujada")
        ) {
          hayChangioEnSeleccion = true;
        }
      });

      // Si hay cambio en selección, actualizar el panel
      if (hayChangioEnSeleccion) {
        console.log(
          "MutationObserver detectó cambio en selección - sincronizando",
        );
        // Usar setTimeout para evitar bucles infinitos
        setTimeout(() => {
          sincronizarSeleccion();
        }, 50);
      }
    });

    // Observar cambios en todos los elementos dentro de gridArea
    observer.observe(gridArea, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
    });
  }

  // Listener para deseleccionar cuando se toca área vacía - usar delegación en document
  document.addEventListener(
    "click",
    (e) => {
      const gridArea = document.getElementById("gridArea");
      if (!gridArea) return;

      // Verificar si el clic está dentro de gridArea
      if (gridArea.contains(e.target)) {
        // Si el clic NO es en una pieza (.pieza-dibujada), deseleccionar todo
        if (!e.target.closest(".pieza-dibujada")) {
          // Deseleccionar todas las piezas en la cuadrícula
          gridArea
            .querySelectorAll(".pieza-dibujada.pieza-seleccionada")
            .forEach((pieza) => {
              pieza.classList.remove("pieza-seleccionada");
              pieza.style.outline = "none";
            });
          // El MutationObserver se encargará de actualizar el panel automáticamente
        }
      }
    },
    true,
  ); // Usar captura para garantizar que se ejecute antes que otros listeners

  // También escuchar cuando se selecciona una pieza en la cuadrícula directamente
  document.addEventListener(
    "mousedown",
    (e) => {
      const gridArea = document.getElementById("gridArea");
      if (!gridArea) return;

      if (gridArea.contains(e.target) && e.target.closest(".pieza-dibujada")) {
        // El MutationObserver se encargará de actualizar el panel automáticamente
      }
    },
    true,
  ); // Usar captura

  // Escuchar cambios en la cuadrícula
  window.addEventListener("cuadricula-actualizada", actualizarPanelDerecho);

  // Exportar función para actualizar desde otros scripts
  window.ActualizarPanelDerecho = actualizarPanelDerecho;
})();
