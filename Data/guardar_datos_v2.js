/* guardar_datos_v2.js - Sistema de múltiples proyectos */

(function () {
  console.log("📦 Inicializando guardar_datos_v2.js...");
  console.log("🔍 window.__miPlantilla existe:", !!window.__miPlantilla);

  const STORAGE_KEY = "plantillaProyectos";
  const COPIA_RECUPERACION_KEY = "copia-recuperacion"; // 🆕 Clave para copia de recuperación
  let proyectoActual = null;

  // Bandera global para auto-mostrar piezas en popup
  window.shouldAutoShowPiezas = false;

  /**
   * Obtiene todos los proyectos guardados
   */
  function obtenerTodosLosProyectos() {
    const datosStr = localStorage.getItem(STORAGE_KEY);
    if (!datosStr) {
      return { proyectos: [] };
    }
    try {
      return JSON.parse(datosStr);
    } catch (e) {
      console.error("Error parseando proyectos:", e);
      return { proyectos: [] };
    }
  }

  /**
   * Guarda los datos del dibujo (todas las piezas dibujadas)
   */
  function capturarDibujoMueble() {
    const gridArea = document.getElementById("gridArea");
    if (!gridArea) {
      console.warn("⚠️ gridArea no encontrado");
      return { piezas: [] };
    }

    const piezas = [];
    const todasLasPiezas = gridArea.querySelectorAll(".pieza-dibujada");
    console.log("📦 Capturando", todasLasPiezas.length, "piezas dibujadas");

    todasLasPiezas.forEach((pieza, idx) => {
      const piezaData = {
        id: pieza.id,
        x: parseFloat(pieza.dataset.x) || 0,
        y: parseFloat(pieza.dataset.y) || 0,
        width:
          parseFloat(pieza.dataset.width) ||
          parseFloat(pieza.style.width) ||
          100,
        height:
          parseFloat(pieza.dataset.height) ||
          parseFloat(pieza.style.height) ||
          100,
        rotacion: parseFloat(pieza.dataset.rotacion) || 0,
        color: pieza.dataset.color || "",
        visible: pieza.dataset.visible !== "false" ? true : false, // Guardar estado de visibilidad
        className: pieza.className,
        nombre: pieza.querySelector(".nombre-pieza")?.innerText || "",
        innerHTML: pieza.innerHTML,
        style: {
          width: pieza.style.width,
          height: pieza.style.height,
          left: pieza.style.left,
          top: pieza.style.top,
          position: pieza.style.position,
          transform: pieza.style.transform,
          backgroundColor: pieza.style.backgroundColor,
          borderRadius: pieza.style.borderRadius,
          opacity: pieza.style.opacity,
          zIndex: pieza.style.zIndex,
        },
        attributes: {}, // Guardar atributos data- con sus nombres originales
      };

      // Capturar todos los atributos data- con sus nombres originales
      for (let attr of pieza.attributes) {
        if (attr.name.startsWith("data-")) {
          const dataKey = attr.name; // Preservar el nombre completo con guiones
          piezaData.attributes[dataKey] = attr.value;
        }
      }

      piezas.push(piezaData);
      console.log(
        `  ✓ Pieza ${idx}: ${pieza.id} en (${piezaData.x}, ${piezaData.y})`,
      );
    });

    console.log("✅ Total de piezas capturadas:", piezas.length);
    return {
      timestamp: Date.now(),
      piezas: piezas,
      cantidadPiezas: piezas.length,
    };
  }

  /**
   * Captura datos A4
   */
  function capturarDatosA4() {
    try {
      if (!window.__miPlantilla) {
        console.warn("⚠️ window.__miPlantilla no está disponible aún");
        return null;
      }
      if (typeof window.__miPlantilla.guardarDatosA4 !== "function") {
        console.warn("⚠️ guardarDatosA4 no es una función");
        return null;
      }
      const datosA4 = window.__miPlantilla.guardarDatosA4();
      console.log(
        "✓ Datos A4 capturados:",
        datosA4 ? datosA4.modulos.length + " módulos" : "ninguno",
      );
      return datosA4;
    } catch (error) {
      console.error("❌ Error capturando A4:", error);
      return null;
    }
  }

  /**
   * Guarda proyecto actual con nuevo nombre
   */
  function guardarProyectoNuevo(nombreProyecto) {
    if (!nombreProyecto || nombreProyecto.trim() === "") {
      return { exito: false, mensaje: "El nombre no puede estar vacío" };
    }

    try {
      const datosA4 = capturarDatosA4();
      const datosDrawing = capturarDibujoMueble();

      const nuevoProyecto = {
        nombre: nombreProyecto.trim(),
        timestamp: Date.now(),
        datosA4: datosA4 || { modulos: [], timestamp: Date.now() },
        datosDrawing: datosDrawing || { piezas: [], timestamp: Date.now() },
      };

      const proyectos = obtenerTodosLosProyectos();

      // Verificar si ya existe un proyecto con ese nombre
      const indiceExistente = proyectos.proyectos.findIndex(
        (p) => p.nombre === nombreProyecto.trim(),
      );

      if (indiceExistente !== -1) {
        // Reemplazar proyecto existente
        proyectos.proyectos[indiceExistente] = nuevoProyecto;
        proyectoActual = nombreProyecto.trim();
      } else {
        // Agregar nuevo proyecto
        proyectos.proyectos.push(nuevoProyecto);
        proyectoActual = nombreProyecto.trim();
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(proyectos));
      // persistir proyecto actual para restauración en recarga
      if (proyectoActual)
        localStorage.setItem("proyecto-actual", proyectoActual);
      actualizarIndicadorProyecto();

      return {
        exito: true,
        mensaje: `✓ Proyecto "${nombreProyecto.trim()}" guardado`,
        datosGuardados: {
          modulosA4: datosA4 && datosA4.modulos ? datosA4.modulos.length : 0,
          piezasDibujo:
            datosDrawing && datosDrawing.piezas
              ? datosDrawing.piezas.length
              : 0,
        },
      };
    } catch (error) {
      console.error("Error al guardar proyecto:", error);
      return {
        exito: false,
        mensaje: "Error al guardar: " + error.message,
      };
    }
  }

  /**
   * Carga un proyecto por nombre
   */
  function cargarProyecto(nombreProyecto) {
    const proyectos = obtenerTodosLosProyectos();
    const proyecto = proyectos.proyectos.find(
      (p) => p.nombre === nombreProyecto,
    );

    if (!proyecto) {
      return { exito: false, mensaje: "Proyecto no encontrado" };
    }

    const mensajes = [];

    // Cargar A4
    if (
      proyecto.datosA4 &&
      window.__miPlantilla &&
      typeof window.__miPlantilla.cargarDatosA4 === "function"
    ) {
      try {
        // Temporalmente guardar los datos
        const tempA4Str = localStorage.getItem("datosPlantillaA4");
        localStorage.setItem(
          "datosPlantillaA4",
          JSON.stringify(proyecto.datosA4),
        );
        window.__miPlantilla.cargarDatosA4();
        mensajes.push("✓ Tabla A4 cargada");
      } catch (err) {
        console.error("Error cargando A4:", err);
        mensajes.push("✗ Error cargando A4");
      }
    }

    // Cargar Dibujo
    if (proyecto.datosDrawing && proyecto.datosDrawing.piezas) {
      try {
        const gridArea = document.getElementById("gridArea");
        if (gridArea) {
          console.log(
            "🗑️ Limpiando",
            gridArea.querySelectorAll(".pieza-dibujada").length,
            "piezas anteriores",
          );
          gridArea
            .querySelectorAll(".pieza-dibujada")
            .forEach((p) => p.remove());

          console.log(
            "📥 Restaurando",
            proyecto.datosDrawing.piezas.length,
            "piezas guardadas",
          );

          for (const piezaData of proyecto.datosDrawing.piezas) {
            const pieza = document.createElement("div");

            // IMPORTANTE: Asegurar que tenga la clase pieza-dibujada
            pieza.className = "pieza-dibujada"; // Siempre usar esta clase
            pieza.id = piezaData.id;
            pieza.style.position = "absolute";

            // Aplicar estilos críticos
            pieza.style.border = "1px solid #333"; // Border oscuro como las piezas nuevas
            pieza.style.boxSizing = "border-box";
            pieza.style.background = "#ffffffcc";

            pieza.dataset.x = piezaData.x;
            pieza.dataset.y = piezaData.y;
            pieza.style.left = piezaData.x + "px";
            pieza.style.top = piezaData.y + "px";

            if (piezaData.style.width)
              pieza.style.width = piezaData.style.width;
            if (piezaData.style.height)
              pieza.style.height = piezaData.style.height;
            if (piezaData.style.transform)
              pieza.style.transform = piezaData.style.transform;
            if (piezaData.style.backgroundColor)
              pieza.style.backgroundColor = piezaData.style.backgroundColor;
            if (piezaData.style.borderRadius)
              pieza.style.borderRadius = piezaData.style.borderRadius;
            if (piezaData.style.opacity)
              pieza.style.opacity = piezaData.style.opacity;
            if (piezaData.style.zIndex)
              pieza.style.zIndex = piezaData.style.zIndex;

            // Restaurar atributos data- usando setAttribute (preserva guiones)
            if (piezaData.attributes) {
              for (const [attrName, attrValue] of Object.entries(
                piezaData.attributes,
              )) {
                pieza.setAttribute(attrName, attrValue);
              }
            }

            // Determinar nombre de pieza guardado (fallback a módulo solo si no hay nombre real)
            const nombrePiezaGuardado = (() => {
              if (piezaData.nombre) return piezaData.nombre;
              if (pieza.dataset.nombre) return pieza.dataset.nombre;
              if (piezaData && piezaData.innerHTML) {
                const temp = document.createElement("div");
                temp.innerHTML = piezaData.innerHTML;
                const savedNombre =
                  temp.querySelector(".nombre-pieza")?.innerText;
                if (savedNombre && savedNombre.trim())
                  return savedNombre.trim();
              }
              return pieza.dataset.modulo || "Sin nombre";
            })();

            // Guardar el nombre real en un data-attribute para futuras restauraciones
            if (nombrePiezaGuardado) {
              pieza.dataset.nombre = nombrePiezaGuardado;
            }

            // Regenerar divs de nombre y medidas
            const nombreDiv = document.createElement("div");
            nombreDiv.className = "nombre-pieza";
            nombreDiv.innerText = nombrePiezaGuardado;

            const medidasDiv = document.createElement("div");
            medidasDiv.className = "pieza-medidas";

            // Usar los datos restaurados para generar el texto de medidas
            const m1 = parseFloat(pieza.dataset.m1) || 1;
            const m2 = parseFloat(pieza.dataset.m2) || 1;
            const m3 = pieza.dataset.m3 ? parseFloat(pieza.dataset.m3) : null;
            const persp = pieza.dataset.displayPersp || "superior";
            const cantoM1 = parseInt(pieza.dataset.cantoNumMed1) || 0;
            const cantoM2 = parseInt(pieza.dataset.cantoNumMed2) || 0;

            // Generar texto de medidas (usando la misma lógica que piezas_cuadricula.js)
            function getCantoIndicator(cantoCount) {
              if (cantoCount === 0) return "";
              if (cantoCount === 1) return " •";
              if (cantoCount === 2) return " ••";
              return "";
            }

            let medidasText = `${m1} × ${m2}`;
            if (persp === "frontal") {
              const height = m3 !== null && m3 !== undefined ? m3 : "-";
              const cantoIndicator = getCantoIndicator(cantoM1);
              medidasText = `${m1} × ${height}${cantoIndicator}`;
            } else if (persp === "superior") {
              const cantoIndicator = getCantoIndicator(cantoM1);
              medidasText = `${m1} × ${m2}${cantoIndicator}`;
            } else if (persp === "lateral") {
              const height = m3 !== null && m3 !== undefined ? m3 : "-";
              const cantoIndicator = getCantoIndicator(cantoM2);
              medidasText = `${m2} × ${height}${cantoIndicator}`;
            }

            medidasDiv.innerText = medidasText;

            // Limpiar el contenido anterior si existe y agregar los divs nuevos
            pieza.innerHTML = "";
            pieza.appendChild(nombreDiv);
            pieza.appendChild(medidasDiv);
            console.log("✅ Pieza restaurada con medidas:", {
              medidasText,
              innerHTML: pieza.innerHTML,
            });

            // Restaurar estado de visibilidad
            if (piezaData.visible === false) {
              pieza.dataset.visible = "false";
              pieza.style.display = "none";
            } else {
              pieza.dataset.visible = "true";
              pieza.style.display = "flex";
            }

            gridArea.appendChild(pieza);
            console.log(
              `  ✓ Pieza restaurada: ${pieza.id} (visible: ${piezaData.visible})`,
            );
          }

          // Llamar a las funciones de actualización después de restaurar
          console.log("🔄 Ejecutando actualizarPiezas()...");
          if (window.Cuadricula?.actualizarPiezas) {
            window.Cuadricula.actualizarPiezas();
          }

          // Aplicar estado de detalles vigente
          if (window.ToggleDetalles) {
            console.log("🔄 Aplicando ToggleDetalles...");
            window.ToggleDetalles.aplicar();
          }

          // Bandera para auto-mostrar piezas cuando se abre el popup
          window.shouldAutoShowPiezas = true;
          console.log(
            "🚩 shouldAutoShowPiezas = true (mostrar piezas al abrir popup)",
          );

          // Notificar al panel derecho para que reconstrua su lista de piezas
          if (
            window.ActualizarPanelDerecho &&
            typeof window.ActualizarPanelDerecho === "function"
          ) {
            try {
              window.ActualizarPanelDerecho();
              console.log("🔄 ActualizarPanelDerecho() ejecutado");
            } catch (err) {
              console.warn(
                "⚠️ Error al ejecutar ActualizarPanelDerecho():",
                err,
              );
              window.dispatchEvent(new Event("cuadricula-actualizada"));
              console.log(
                "🔔 Evento cuadricula-actualizada despachado como fallback",
              );
            }
          } else {
            // Fallback: despachar evento que el panel escucha
            window.dispatchEvent(new Event("cuadricula-actualizada"));
            console.log("🔔 Evento cuadricula-actualizada despachado");
          }

          // Ajustar vista de la cuadrícula para que todas las piezas visibles queden dentro de la ventana
          try {
            const gridAreaForFit = document.getElementById("gridArea");
            if (gridAreaForFit) {
              const piezas = Array.from(
                gridAreaForFit.querySelectorAll(".pieza-dibujada"),
              ).filter((p) => p.dataset.visible !== "false");

              if (piezas.length > 0) {
                let minX = Infinity,
                  minY = Infinity,
                  maxX = -Infinity,
                  maxY = -Infinity;
                piezas.forEach((p) => {
                  const x = parseFloat(p.dataset.x) || 0;
                  const y = parseFloat(p.dataset.y) || 0;
                  const w =
                    parseFloat(p.dataset.w) || parseFloat(p.style.width) || 1;
                  const h =
                    parseFloat(p.dataset.h) || parseFloat(p.style.height) || 1;
                  minX = Math.min(minX, x);
                  minY = Math.min(minY, y);
                  maxX = Math.max(maxX, x + w);
                  maxY = Math.max(maxY, y + h);
                });

                const bbox = { minX, minY, maxX, maxY };
                if (
                  window.Grid &&
                  typeof window.Grid.fitToBoundingBox === "function"
                ) {
                  window.Grid.fitToBoundingBox(bbox, 40);
                } else if (
                  window.Grid &&
                  typeof window.Grid.setOffset === "function"
                ) {
                  // Fallback: centrar sin escalar
                  const gw =
                    document.getElementById("gridWrapper")?.clientWidth || 800;
                  const gh =
                    document.getElementById("gridWrapper")?.clientHeight || 600;
                  const padding = 40;
                  const spanW = Math.max(1, bbox.maxX - bbox.minX);
                  const spanH = Math.max(1, bbox.maxY - bbox.minY);
                  const scaleEstimate = Math.min(
                    (gw - padding * 2) / spanW,
                    (gh - padding * 2) / spanH,
                  );
                  const offsetX = Math.round(
                    padding - bbox.minX * scaleEstimate,
                  );
                  const offsetY = Math.round(
                    padding - bbox.minY * scaleEstimate,
                  );
                  window.Grid.setOffset({ x: offsetX, y: offsetY });
                }
              }
            }
          } catch (err) {
            console.warn("⚠️ Error ajustando vista de la cuadrícula:", err);
          }

          mensajes.push(
            "✓ Dibujo cargado (" +
              proyecto.datosDrawing.piezas.length +
              " piezas)",
          );
        } else {
          console.warn("⚠️ gridArea no encontrado para restaurar dibujo");
          mensajes.push("⚠️ gridArea no encontrado");
        }
      } catch (err) {
        console.error("❌ Error cargando dibujo:", err);
        mensajes.push("✗ Error cargando dibujo: " + err.message);
      }
    } else {
      console.log("ℹ️ No hay datos de dibujo para restaurar");
    }

    proyectoActual = nombreProyecto;
    // persistimos el proyecto actual
    if (proyectoActual) localStorage.setItem("proyecto-actual", proyectoActual);
    actualizarIndicadorProyecto();

    return {
      exito: true,
      mensaje: `✓ Proyecto "${nombreProyecto}" cargado`,
      mensajes: mensajes,
    };
  }

  /**
   * Borra un proyecto
   */
  function borrarProyecto(nombreProyecto) {
    const proyectos = obtenerTodosLosProyectos();
    const indice = proyectos.proyectos.findIndex(
      (p) => p.nombre === nombreProyecto,
    );

    if (indice === -1) {
      return { exito: false, mensaje: "Proyecto no encontrado" };
    }

    proyectos.proyectos.splice(indice, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proyectos));

    if (proyectoActual === nombreProyecto) {
      proyectoActual = null;
      actualizarIndicadorProyecto();
    }

    return { exito: true, mensaje: `✓ Proyecto "${nombreProyecto}" eliminado` };
  }

  /**
   * Muestra modal para nombrar y guardar proyecto
   */
  function mostrarModalGuardarProyecto() {
    console.log("📝 Abriendo modal de guardar...");
    const proyectos = obtenerTodosLosProyectos();
    console.log("📦 Proyectos existentes:", proyectos.proyectos.length);

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";

    const modal = document.createElement("div");
    modal.style.background = "#fff";
    modal.style.borderRadius = "8px";
    modal.style.padding = "30px";
    modal.style.maxWidth = "500px";
    modal.style.width = "90%";
    modal.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";

    const titulo = document.createElement("h2");
    titulo.textContent = "💾 Guardar Proyecto";
    titulo.style.marginTop = "0";
    titulo.style.marginBottom = "20px";
    titulo.style.color = "#333";
    modal.appendChild(titulo);

    // Input para nombre
    const labelNombre = document.createElement("label");
    labelNombre.style.display = "block";
    labelNombre.style.marginBottom = "8px";
    labelNombre.style.fontWeight = "bold";
    labelNombre.textContent = "Nombre del proyecto:";
    modal.appendChild(labelNombre);

    const inputNombre = document.createElement("input");
    inputNombre.type = "text";
    inputNombre.placeholder = "Ej: Mi Proyecto, Cocina 2024, etc.";
    inputNombre.style.width = "100%";
    inputNombre.style.padding = "10px";
    inputNombre.style.marginBottom = "15px";
    inputNombre.style.border = "1px solid #ddd";
    inputNombre.style.borderRadius = "4px";
    inputNombre.style.boxSizing = "border-box";
    inputNombre.style.fontSize = "14px";
    inputNombre.value = proyectoActual || "";
    modal.appendChild(inputNombre);

    // Sugerencias de proyectos existentes
    if (proyectos.proyectos.length > 0) {
      const labelSugerencias = document.createElement("div");
      labelSugerencias.style.marginBottom = "12px";
      labelSugerencias.style.fontSize = "12px";
      labelSugerencias.style.color = "#666";
      labelSugerencias.innerHTML = "<strong>Proyectos existentes:</strong>";
      modal.appendChild(labelSugerencias);

      const divSugerencias = document.createElement("div");
      divSugerencias.style.marginBottom = "15px";
      divSugerencias.style.display = "flex";
      divSugerencias.style.flexWrap = "wrap";
      divSugerencias.style.gap = "8px";

      proyectos.proyectos.forEach((p) => {
        const tag = document.createElement("button");
        tag.textContent = p.nombre;
        tag.style.padding = "6px 12px";
        tag.style.background = "#f0f0f0";
        tag.style.border = "1px solid #ddd";
        tag.style.borderRadius = "4px";
        tag.style.cursor = "pointer";
        tag.style.fontSize = "12px";
        tag.style.transition = "all 0.2s";

        tag.addEventListener("mouseenter", () => {
          tag.style.background = "#0096ff";
          tag.style.color = "white";
          tag.style.borderColor = "#0096ff";
        });

        tag.addEventListener("mouseleave", () => {
          tag.style.background = "#f0f0f0";
          tag.style.color = "#333";
          tag.style.borderColor = "#ddd";
        });

        tag.addEventListener("click", (e) => {
          e.preventDefault();
          inputNombre.value = p.nombre;
          inputNombre.focus();
        });

        divSugerencias.appendChild(tag);
      });

      modal.appendChild(divSugerencias);
    }

    // Info
    const info = document.createElement("div");
    info.style.background = "#f9f9f9";
    info.style.padding = "12px";
    info.style.borderRadius = "4px";
    info.style.marginBottom = "20px";
    info.style.fontSize = "13px";
    info.style.color = "#666";
    info.innerHTML = `
      <div>📋 Módulos A4: <strong id="info-a4">0</strong></div>
      <div>🖼️ Piezas dibujadas: <strong id="info-dibujo">0</strong></div>
    `;
    modal.appendChild(info);

    // Obtener referencias a los elementos después de agregarlos
    const infoA4El = info.querySelector("#info-a4");
    const infoDibujoEl = info.querySelector("#info-dibujo");

    // Actualizar info cuando cambia el input
    const actualizarInfo = () => {
      const proyectos = obtenerTodosLosProyectos();
      const nombreActual = inputNombre.value.trim();
      const proyectoExistente = proyectos.proyectos.find(
        (p) => p.nombre === nombreActual,
      );

      let modulosA4 = 0;
      let piezasDibujo = 0;

      if (proyectoExistente) {
        modulosA4 =
          proyectoExistente.datosA4 && proyectoExistente.datosA4.modulos
            ? proyectoExistente.datosA4.modulos.length
            : 0;
        piezasDibujo =
          proyectoExistente.datosDrawing &&
          proyectoExistente.datosDrawing.piezas
            ? proyectoExistente.datosDrawing.piezas.length
            : 0;
      } else {
        // Capturar datos actuales
        const datosA4 = capturarDatosA4();
        const datosDrawing = capturarDibujoMueble();
        modulosA4 = datosA4 && datosA4.modulos ? datosA4.modulos.length : 0;
        piezasDibujo =
          datosDrawing && datosDrawing.piezas ? datosDrawing.piezas.length : 0;
      }

      if (infoA4El) infoA4El.textContent = modulosA4;
      if (infoDibujoEl) infoDibujoEl.textContent = piezasDibujo;
    };

    inputNombre.addEventListener("input", actualizarInfo);
    inputNombre.addEventListener("change", actualizarInfo);
    actualizarInfo();

    // Botones
    const botonesContainer = document.createElement("div");
    botonesContainer.style.display = "flex";
    botonesContainer.style.gap = "10px";

    const btnGuardar = document.createElement("button");
    btnGuardar.textContent = "💾 Guardar";
    btnGuardar.style.flex = "1";
    btnGuardar.style.padding = "12px";
    btnGuardar.style.background = "#28a745";
    btnGuardar.style.color = "white";
    btnGuardar.style.border = "none";
    btnGuardar.style.borderRadius = "4px";
    btnGuardar.style.cursor = "pointer";
    btnGuardar.style.fontSize = "14px";
    btnGuardar.style.fontWeight = "bold";

    btnGuardar.addEventListener("click", () => {
      const nombre = inputNombre.value.trim();
      if (!nombre) {
        alert("⚠️ Por favor, ingresa un nombre para el proyecto");
        return;
      }

      const resultado = guardarProyectoNuevo(nombre);
      overlay.remove();

      if (resultado.exito) {
        mostrarNotificacionGuardado(resultado);
      } else {
        alert("Error: " + resultado.mensaje);
      }
    });

    botonesContainer.appendChild(btnGuardar);

    const btnCancelar = document.createElement("button");
    btnCancelar.textContent = "Cancelar";
    btnCancelar.style.flex = "1";
    btnCancelar.style.padding = "12px";
    btnCancelar.style.background = "#6c757d";
    btnCancelar.style.color = "white";
    btnCancelar.style.border = "none";
    btnCancelar.style.borderRadius = "4px";
    btnCancelar.style.cursor = "pointer";
    btnCancelar.style.fontSize = "14px";

    btnCancelar.addEventListener("click", () => {
      overlay.remove();
    });

    botonesContainer.appendChild(btnCancelar);
    modal.appendChild(botonesContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    inputNombre.focus();
    inputNombre.select();

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /**
   * Muestra modal para cargar proyecto
   */
  function mostrarModalCargarProyecto() {
    const proyectos = obtenerTodosLosProyectos();

    if (proyectos.proyectos.length === 0) {
      alert("❌ No hay proyectos guardados");
      return;
    }

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";

    const modal = document.createElement("div");
    modal.style.background = "#fff";
    modal.style.borderRadius = "8px";
    modal.style.padding = "30px";
    modal.style.maxWidth = "600px";
    modal.style.width = "90%";
    modal.style.maxHeight = "70vh";
    modal.style.overflow = "auto";
    modal.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";

    const titulo = document.createElement("h2");
    titulo.textContent = "⬆️ Cargar Proyecto";
    titulo.style.marginTop = "0";
    titulo.style.marginBottom = "20px";
    titulo.style.color = "#333";
    modal.appendChild(titulo);

    const contenedor = document.createElement("div");
    contenedor.style.display = "grid";
    contenedor.style.gap = "10px";

    proyectos.proyectos.forEach((proyecto, indice) => {
      const card = document.createElement("div");
      card.style.border = "1px solid #ddd";
      card.style.borderRadius = "6px";
      card.style.padding = "15px";
      card.style.background = "#f9f9f9";
      card.style.cursor = "pointer";
      card.style.transition = "all 0.2s";
      card.style.display = "flex";
      card.style.justifyContent = "space-between";
      card.style.alignItems = "center";

      card.addEventListener("mouseenter", () => {
        card.style.background = "#e8f4f8";
        card.style.borderColor = "#0096ff";
      });

      card.addEventListener("mouseleave", () => {
        card.style.background = "#f9f9f9";
        card.style.borderColor = "#ddd";
      });

      const info = document.createElement("div");
      const fecha = new Date(proyecto.timestamp).toLocaleString("es-ES");
      const modulosCount =
        proyecto.datosA4 && proyecto.datosA4.modulos
          ? proyecto.datosA4.modulos.length
          : 0;
      const piezasCount =
        proyecto.datosDrawing && proyecto.datosDrawing.piezas
          ? proyecto.datosDrawing.piezas.length
          : 0;
      info.innerHTML = `
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${proyecto.nombre}</div>
        <div style="font-size: 12px; color: #666;">
          📅 ${fecha} | 
          📋 ${modulosCount} módulos | 
          🖼️ ${piezasCount} piezas
        </div>
      `;
      card.appendChild(info);

      const btnCargar = document.createElement("button");
      btnCargar.textContent = "↓";
      btnCargar.style.padding = "8px 12px";
      btnCargar.style.background = "#0096ff";
      btnCargar.style.color = "white";
      btnCargar.style.border = "none";
      btnCargar.style.borderRadius = "4px";
      btnCargar.style.cursor = "pointer";
      btnCargar.style.fontSize = "16px";
      btnCargar.style.minWidth = "40px";

      btnCargar.addEventListener("click", (e) => {
        e.stopPropagation();
        const confirmar = confirm(
          `¿Cargar proyecto "${proyecto.nombre}"?\nSe reemplazarán los datos actuales.`,
        );
        if (confirmar) {
          const resultado = cargarProyecto(proyecto.nombre);
          overlay.remove();
          mostrarNotificacionCarga(resultado);
        }
      });

      card.appendChild(btnCargar);
      contenedor.appendChild(card);
    });

    modal.appendChild(contenedor);

    const btnCerrar = document.createElement("button");
    btnCerrar.textContent = "Cerrar";
    btnCerrar.style.width = "100%";
    btnCerrar.style.padding = "12px";
    btnCerrar.style.background = "#6c757d";
    btnCerrar.style.color = "white";
    btnCerrar.style.border = "none";
    btnCerrar.style.borderRadius = "4px";
    btnCerrar.style.cursor = "pointer";
    btnCerrar.style.fontSize = "14px";
    btnCerrar.style.marginTop = "20px";

    btnCerrar.addEventListener("click", () => {
      overlay.remove();
    });

    modal.appendChild(btnCerrar);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /**
   * Muestra modal para gestionar proyectos
   */
  function mostrarModalGestionarProyectos() {
    const proyectos = obtenerTodosLosProyectos();

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";

    const modal = document.createElement("div");
    modal.style.background = "#fff";
    modal.style.borderRadius = "8px";
    modal.style.padding = "30px";
    modal.style.maxWidth = "600px";
    modal.style.width = "90%";
    modal.style.maxHeight = "70vh";
    modal.style.overflow = "auto";
    modal.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";

    const titulo = document.createElement("h2");
    titulo.textContent = "🗂️ Gestionar Proyectos";
    titulo.style.marginTop = "0";
    titulo.style.marginBottom = "20px";
    titulo.style.color = "#333";
    modal.appendChild(titulo);

    if (proyectos.proyectos.length === 0) {
      const vacio = document.createElement("p");
      vacio.textContent = "❌ No hay proyectos guardados";
      vacio.style.color = "#999";
      vacio.style.textAlign = "center";
      modal.appendChild(vacio);
    } else {
      const contenedor = document.createElement("div");
      contenedor.style.display = "grid";
      contenedor.style.gap = "10px";

      proyectos.proyectos.forEach((proyecto) => {
        const card = document.createElement("div");
        card.style.border = "1px solid #ddd";
        card.style.borderRadius = "6px";
        card.style.padding = "15px";
        card.style.background = "#f9f9f9";
        card.style.display = "flex";
        card.style.justifyContent = "space-between";
        card.style.alignItems = "center";

        const info = document.createElement("div");
        const fecha = new Date(proyecto.timestamp).toLocaleString("es-ES");
        const modulosCount =
          proyecto.datosA4 && proyecto.datosA4.modulos
            ? proyecto.datosA4.modulos.length
            : 0;
        const piezasCount =
          proyecto.datosDrawing && proyecto.datosDrawing.piezas
            ? proyecto.datosDrawing.piezas.length
            : 0;
        info.innerHTML = `
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${proyecto.nombre}</div>
          <div style="font-size: 12px; color: #666;">
            📅 ${fecha} | 
            📋 ${modulosCount} módulos | 
            🖼️ ${piezasCount} piezas
          </div>
        `;
        card.appendChild(info);

        const btnBorrar = document.createElement("button");
        btnBorrar.textContent = "🗑️";
        btnBorrar.style.padding = "8px 12px";
        btnBorrar.style.background = "#dc3545";
        btnBorrar.style.color = "white";
        btnBorrar.style.border = "none";
        btnBorrar.style.borderRadius = "4px";
        btnBorrar.style.cursor = "pointer";
        btnBorrar.style.fontSize = "16px";
        btnBorrar.style.minWidth = "40px";

        btnBorrar.addEventListener("click", () => {
          if (
            confirm(
              `¿Borrar proyecto "${proyecto.nombre}"?\nNo se puede deshacer.`,
            )
          ) {
            const resultado = borrarProyecto(proyecto.nombre);
            if (resultado.exito) {
              mostrarNotificacionBorrado([resultado.mensaje]);
              // Recargar modal
              overlay.remove();
              mostrarModalGestionarProyectos();
            }
          }
        });

        card.appendChild(btnBorrar);
        contenedor.appendChild(card);
      });

      modal.appendChild(contenedor);
    }

    const btnCerrar = document.createElement("button");
    btnCerrar.textContent = "Cerrar";
    btnCerrar.style.width = "100%";
    btnCerrar.style.padding = "12px";
    btnCerrar.style.background = "#6c757d";
    btnCerrar.style.color = "white";
    btnCerrar.style.border = "none";
    btnCerrar.style.borderRadius = "4px";
    btnCerrar.style.cursor = "pointer";
    btnCerrar.style.fontSize = "14px";
    btnCerrar.style.marginTop = "20px";

    btnCerrar.addEventListener("click", () => {
      overlay.remove();
    });

    modal.appendChild(btnCerrar);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /**
   * Actualiza el indicador del proyecto actual
   */
  function actualizarIndicadorProyecto() {
    const indicador = document.getElementById("proyecto-actual-label");
    if (indicador) {
      if (proyectoActual) {
        indicador.textContent = `Proyecto: "${proyectoActual}"`;
        indicador.style.color = "#0096ff";
      } else {
        indicador.textContent = "Sin proyecto activo";
        indicador.style.color = "#999";
      }
    }
  }

  /**
   * 🆕 Guarda una copia de recuperación automática (ÚNICA)
   * No usa nombres de proyectos, solo sobrescribe la copia anterior
   */
  function guardarCopiaRecuperacion() {
    try {
      const datosA4 = capturarDatosA4();
      const datosDrawing = capturarDibujoMueble();

      const copia = {
        nombre: "Copia Automática de Recuperación",
        timestamp: Date.now(),
        datosA4: datosA4 || { modulos: [], timestamp: Date.now() },
        datosDrawing: datosDrawing || { piezas: [], timestamp: Date.now() },
      };

      localStorage.setItem(COPIA_RECUPERACION_KEY, JSON.stringify(copia));
      console.log(
        "✅ Copia de recuperación guardada:",
        new Date().toLocaleTimeString(),
      );

      return {
        exito: true,
        mensaje: "Copia de recuperación guardada",
      };
    } catch (error) {
      console.error("❌ Error al guardar copia de recuperación:", error);
      return {
        exito: false,
        mensaje: "Error al guardar copia: " + error.message,
      };
    }
  }

  /**
   * 🆕 Carga la copia de recuperación automática
   */
  function cargarCopiaRecuperacion() {
    const datosStr = localStorage.getItem(COPIA_RECUPERACION_KEY);

    if (!datosStr) {
      console.log("ℹ️ No hay copia de recuperación disponible");
      return null;
    }

    try {
      const copia = JSON.parse(datosStr);
      console.log(
        "📥 Cargando copia de recuperación del:",
        new Date(copia.timestamp).toLocaleString(),
      );

      const mensajes = [];

      // Cargar A4
      if (
        copia.datosA4 &&
        window.__miPlantilla &&
        typeof window.__miPlantilla.cargarDatosA4 === "function"
      ) {
        try {
          localStorage.setItem(
            "datosPlantillaA4",
            JSON.stringify(copia.datosA4),
          );
          window.__miPlantilla.cargarDatosA4();
          mensajes.push("✓ Tabla A4 cargada");
        } catch (err) {
          console.error("Error cargando A4:", err);
          mensajes.push("✗ Error cargando A4");
        }
      }

      // Cargar Dibujo
      if (copia.datosDrawing && copia.datosDrawing.piezas) {
        try {
          const gridArea = document.getElementById("gridArea");
          if (gridArea) {
            gridArea
              .querySelectorAll(".pieza-dibujada")
              .forEach((p) => p.remove());

            for (const piezaData of copia.datosDrawing.piezas) {
              const pieza = document.createElement("div");
              pieza.className = "pieza-dibujada";
              pieza.id = piezaData.id;
              pieza.innerHTML = piezaData.innerHTML;
              pieza.style.position = "absolute";
              pieza.style.border = "1px solid #333";
              pieza.style.boxSizing = "border-box";
              pieza.style.background = "#ffffffcc";

              pieza.dataset.x = piezaData.x;
              pieza.dataset.y = piezaData.y;
              pieza.style.left = piezaData.x + "px";
              pieza.style.top = piezaData.y + "px";

              if (piezaData.style.width)
                pieza.style.width = piezaData.style.width;
              if (piezaData.style.height)
                pieza.style.height = piezaData.style.height;
              if (piezaData.style.transform)
                pieza.style.transform = piezaData.style.transform;
              if (piezaData.style.backgroundColor)
                pieza.style.backgroundColor = piezaData.style.backgroundColor;
              if (piezaData.style.borderRadius)
                pieza.style.borderRadius = piezaData.style.borderRadius;
              if (piezaData.style.opacity)
                pieza.style.opacity = piezaData.style.opacity;
              if (piezaData.style.zIndex)
                pieza.style.zIndex = piezaData.style.zIndex;

              if (piezaData.attributes) {
                for (const [attrName, attrValue] of Object.entries(
                  piezaData.attributes,
                )) {
                  pieza.setAttribute(attrName, attrValue);
                }
              }

              if (piezaData.visible === false) {
                pieza.dataset.visible = "false";
                pieza.style.display = "none";
              } else {
                pieza.dataset.visible = "true";
                pieza.style.display = "flex";
              }

              gridArea.appendChild(pieza);
            }

            if (window.actualizarPiezas) {
              window.actualizarPiezas();
            }

            if (window.ToggleDetalles) {
              window.ToggleDetalles.aplicar();
            }

            window.shouldAutoShowPiezas = true;

            if (
              window.ActualizarPanelDerecho &&
              typeof window.ActualizarPanelDerecho === "function"
            ) {
              try {
                window.ActualizarPanelDerecho();
              } catch (err) {
                window.dispatchEvent(new Event("cuadricula-actualizada"));
              }
            } else {
              window.dispatchEvent(new Event("cuadricula-actualizada"));
            }

            mensajes.push(
              "✓ Dibujo cargado (" +
                copia.datosDrawing.piezas.length +
                " piezas)",
            );
          }
        } catch (err) {
          console.error("❌ Error cargando dibujo:", err);
          mensajes.push("✗ Error cargando dibujo");
        }
      }

      return {
        exito: true,
        mensaje: "Copia de recuperación cargada",
        mensajes: mensajes,
      };
    } catch (error) {
      console.error("❌ Error al cargar copia de recuperación:", error);
      return null;
    }
  }

  /**
   * Notificaciones
   */
  function mostrarNotificacionGuardado(resultado) {
    const notif = document.createElement("div");
    notif.style.position = "fixed";
    notif.style.top = "20px";
    notif.style.right = "20px";
    notif.style.background = "#28a745";
    notif.style.color = "white";
    notif.style.padding = "15px 20px";
    notif.style.borderRadius = "4px";
    notif.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    notif.style.zIndex = "99999";
    notif.style.maxWidth = "300px";
    notif.style.fontSize = "14px";
    notif.textContent =
      resultado.mensaje +
      ` (${resultado.datosGuardados.modulosA4} módulos, ${resultado.datosGuardados.piezasDibujo} piezas)`;

    document.body.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = "0";
      notif.style.transition = "opacity 0.3s ease";
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  function mostrarNotificacionCarga(resultado) {
    const notif = document.createElement("div");
    notif.style.position = "fixed";
    notif.style.top = "20px";
    notif.style.right = "20px";
    notif.style.background = "#0096ff";
    notif.style.color = "white";
    notif.style.padding = "15px 20px";
    notif.style.borderRadius = "4px";
    notif.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    notif.style.zIndex = "99999";
    notif.style.maxWidth = "300px";
    notif.style.fontSize = "14px";
    notif.textContent = resultado.mensaje;

    document.body.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = "0";
      notif.style.transition = "opacity 0.3s ease";
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  function mostrarNotificacionBorrado(mensajes) {
    const notif = document.createElement("div");
    notif.style.position = "fixed";
    notif.style.top = "20px";
    notif.style.right = "20px";
    notif.style.background = "#dc3545";
    notif.style.color = "white";
    notif.style.padding = "15px 20px";
    notif.style.borderRadius = "4px";
    notif.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    notif.style.zIndex = "99999";
    notif.style.maxWidth = "300px";
    notif.style.fontSize = "14px";
    notif.textContent = mensajes.join("\n");

    document.body.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = "0";
      notif.style.transition = "opacity 0.3s ease";
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  // Exponer funciones globales
  window.GuardarDatos = {
    guardarProyectoNuevo,
    cargarProyecto,
    borrarProyecto,
    obtenerTodosLosProyectos,
    mostrarModalGuardarProyecto,
    mostrarModalCargarProyecto,
    mostrarModalGestionarProyectos,
    obtenerProyectoActual: () => proyectoActual, // 🆕 Exponer proyecto actual
    guardarCopiaRecuperacion,
    cargarCopiaRecuperacion,
  };

  // Listeners para los botones
  document.addEventListener("DOMContentLoaded", () => {
    console.log("🎯 DOMContentLoaded - Buscando botones...");
    const btnGuardar = document.getElementById("guardarTodo");
    const btnCargar = document.getElementById("cargarTodo");
    const btnGestionar = document.getElementById("gestionarTodo");

    console.log(
      "🔘 Botones encontrados - Guardar:",
      !!btnGuardar,
      "Cargar:",
      !!btnCargar,
      "Gestionar:",
      !!btnGestionar,
    );

    if (btnGuardar) {
      btnGuardar.addEventListener("click", (e) => {
        console.log("💾 Click en guardar");
        e.preventDefault();
        mostrarModalGuardarProyecto();
      });
    }

    if (btnCargar) {
      btnCargar.addEventListener("click", (e) => {
        console.log("⬆️ Click en cargar");
        e.preventDefault();
        mostrarModalCargarProyecto();
      });
    }

    if (btnGestionar) {
      btnGestionar.addEventListener("click", (e) => {
        console.log("🗂️ Click en gestionar");
        e.preventDefault();
        mostrarModalGestionarProyectos();
      });
    }

    // Al iniciar la página, intentar restaurar el último proyecto activo o la copia de recuperación
    try {
      const ultimo = localStorage.getItem("proyecto-actual");
      if (ultimo) {
        console.log("🔁 Restaurando último proyecto:", ultimo);
        const resultado = cargarProyecto(ultimo);
        if (resultado && resultado.exito) {
          mostrarNotificacionCarga(resultado);
        }
      } else {
        // si no hay proyecto activo, intentar cargar copia de recuperación
        const copia = localStorage.getItem(COPIA_RECUPERACION_KEY);
        if (copia) {
          console.log(
            "🔁 Cargando copia de recuperación automática al iniciar",
          );
          const res = cargarCopiaRecuperacion();
          if (res && res.exito) mostrarNotificacionCarga(res);
        }
      }
    } catch (err) {
      console.warn("⚠️ Error restaurando estado al inicio:", err);
    }
  });
})();
