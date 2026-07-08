
      const STORAGE_KEY = "plantillaProyectos";
      const SETTINGS_KEY = "optimizadorCutSettings";
      let proyectoCargado = null;
      let piezas = [];
      let ultimoResultado = null;
      let ultimoOptimizationParams = null;

      function obtenerProyectos() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        try {
          return JSON.parse(raw).proyectos || [];
        } catch (err) {
          return [];
        }
      }

      function obtenerConfiguracionOptimizador() {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch (err) {
          return null;
        }
      }

      function guardarConfiguracionOptimizador(config) {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(config || {}));
        } catch (err) {
          console.warn(
            "No fue posible guardar la configuración del optimizador.",
            err,
          );
        }
      }

      function cargarConfiguracionOptimizador() {
        const config = obtenerConfiguracionOptimizador();
        if (!config) return;

        const panelWidth = document.getElementById("panelWidth");
        const panelHeight = document.getElementById("panelHeight");
        const panelCount = document.getElementById("panelCount");
        const sawThickness = document.getElementById("sawThickness");
        const strategyMode = document.getElementById("strategyMode");
        const orientationMode = document.getElementById("orientationMode");
        const cutStrategy = document.getElementById("cutStrategy");
        const preferCuts = document.getElementById("preferCuts");
        const reassignCount = document.getElementById("reassignCount");

        if (config.panelWidth != null) panelWidth.value = config.panelWidth;
        if (config.panelHeight != null) panelHeight.value = config.panelHeight;
        if (config.panelCount != null) panelCount.value = config.panelCount;
        if (config.sawThickness != null)
          sawThickness.value = config.sawThickness;
        if (config.strategyMode != null)
          strategyMode.value = config.strategyMode;
        if (config.orientationMode != null)
          orientationMode.value = config.orientationMode;
        if (config.cutStrategy != null) cutStrategy.value = config.cutStrategy;
        if (config.preferCuts != null) preferCuts.checked = config.preferCuts;
        if (config.reassignCount != null)
          reassignCount.value = config.reassignCount;
      }

      function iniciarPersistenciaOptimizador() {
        const fields = [
          "panelWidth",
          "panelHeight",
          "panelCount",
          "sawThickness",
          "strategyMode",
          "orientationMode",
          "cutStrategy",
          "reassignCount",
        ];
        fields.forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.addEventListener("change", () => {
            saveCurrentOptimizerSettings();
          });
        });

        const preferCutsCheckbox = document.getElementById("preferCuts");
        if (preferCutsCheckbox) {
          preferCutsCheckbox.addEventListener("change", () => {
            saveCurrentOptimizerSettings();
          });
        }

        // Toggle advanced options with smooth animation
        const toggle = document.getElementById("toggleAdvanced");
        const advanced = document.getElementById("advancedOptions");
        if (toggle && advanced) {
          toggle.addEventListener("click", () => {
            const isOpen = advanced.classList.contains("open");
            if (isOpen) {
              advanced.classList.remove("open");
              toggle.classList.remove("open");
            } else {
              advanced.classList.add("open");
              toggle.classList.add("open");
            }
          });
        }
      }

      function saveCurrentOptimizerSettings() {
        const config = {
          panelWidth: document.getElementById("panelWidth").value,
          panelHeight: document.getElementById("panelHeight").value,
          panelCount: document.getElementById("panelCount").value,
          sawThickness: document.getElementById("sawThickness").value,
          strategyMode: document.getElementById("strategyMode").value,
          orientationMode: document.getElementById("orientationMode").value,
          cutStrategy: document.getElementById("cutStrategy").value,
          preferCuts: document.getElementById("preferCuts").checked,
          reassignCount: document.getElementById("reassignCount").value,
        };
        guardarConfiguracionOptimizador(config);
      }

      function parseSize(value) {
        if (value == null) return 0;
        if (typeof value === "number") return value;
        const n = parseFloat(
          String(value).replace(",", ".").replace("px", "").trim(),
        );
        return Number.isFinite(n) ? n : 0;
      }

      function getPieceAttribute(pieza, name) {
        if (!pieza || !pieza.attributes) return null;
        return (
          pieza.attributes[`data-${name}`] ||
          pieza.attributes[`data-${name.toLowerCase()}`] ||
          null
        );
      }

      function parseStyleSize(value) {
        if (value == null) return 0;
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const match = value.match(/([0-9]+(?:\.[0-9]+)?)(?:px)?/i);
          if (match) return parseSize(match[1]);
        }
        return 0;
      }

      function parsePieceNameFromHTML(html) {
        if (!html) return null;
        const temp = document.createElement("div");
        temp.innerHTML = html;
        return (
          temp.querySelector(".nombre-pieza")?.innerText?.trim() ||
          temp.querySelector(".pieza-nombre")?.innerText?.trim() ||
          null
        );
      }

      function getPieceDimensions(pieza) {
        // Si es un objeto JSON de datosA4, usa width/height directos
        if (
          typeof pieza.width === "number" &&
          typeof pieza.height === "number"
        ) {
          console.log(
            "  ✓ Usando width/height directo del JSON:",
            pieza.width,
            "x",
            pieza.height,
          );
          return {
            width: pieza.width,
            height: pieza.height,
            m1: 0,
            m2: 0,
            m3: 0,
            persp: "superior",
          };
        }

        console.warn(
          "  ! Pieza sin width/height numérico directo. Integrando atributos:",
          {
            width: pieza.width,
            height: pieza.height,
            tipo_width: typeof pieza.width,
            tipo_height: typeof pieza.height,
            attributes: pieza.attributes,
          },
        );

        const m1 = parseSize(
          getPieceAttribute(pieza, "m1") || getPieceAttribute(pieza, "med1"),
        );
        const m2 = parseSize(
          getPieceAttribute(pieza, "m2") || getPieceAttribute(pieza, "med2"),
        );
        const m3 = parseSize(getPieceAttribute(pieza, "m3"));
        const widthAttr = parseSize(getPieceAttribute(pieza, "w"));
        const heightAttr = parseSize(getPieceAttribute(pieza, "h"));
        const persp = (
          getPieceAttribute(pieza, "displaypersp") ||
          getPieceAttribute(pieza, "display-persp") ||
          getPieceAttribute(pieza, "persp") ||
          getPieceAttribute(pieza, "displayPersp") ||
          "superior"
        ).toLowerCase();

        // Para optimización siempre usar m1 como largo (width) y m2 como ancho (height).
        // Ignorar m3 (profundidad) en el cálculo de cabe en panel.
        let width = 0;
        let height = 0;

        if (m1 && m2) {
          width = m1;
          height = m2;
        }

        // Si no hay m1/m2, caer a los atributos de visualización (w/h)
        if ((!width || !height) && (widthAttr || heightAttr)) {
          if (!width && widthAttr) width = widthAttr;
          if (!height && heightAttr) height = heightAttr;
        }

        // Último recurso: atributos style/width/height y atributos serializados
        if ((!width || !height) && pieza) {
          try {
            if (pieza.style) {
              const styleW = parseStyleSize(pieza.style.width || "");
              const styleH = parseStyleSize(pieza.style.height || "");
              if (!width && styleW) width = styleW;
              if (!height && styleH) height = styleH;
            }

            if ((!width || !height) && pieza.attributes) {
              const attrW = parseSize(
                getPieceAttribute(pieza, "width") ||
                  getPieceAttribute(pieza, "W"),
              );
              const attrH = parseSize(
                getPieceAttribute(pieza, "height") ||
                  getPieceAttribute(pieza, "H"),
              );
              if (!width && attrW) width = attrW;
              if (!height && attrH) height = attrH;
            }
          } catch (err) {
            console.warn(
              "Optimizador: error leyendo estilos/atributos de pieza",
              err,
            );
          }
        }

        return {
          width: width || 0,
          height: height || 0,
          m1: m1 || 0,
          m2: m2 || 0,
          m3: m3 || 0,
          persp,
        };
      }

      function extraerPiezasA4(proyecto) {
        if (
          proyecto &&
          proyecto.datosA4 &&
          Array.isArray(proyecto.datosA4.modulos) &&
          proyecto.datosA4.modulos.length > 0
        ) {
          const lista = [];
          proyecto.datosA4.modulos.forEach((mod, modIdx) => {
            if (!mod || !Array.isArray(mod.filas)) return;

            mod.filas.forEach((fila, idx) => {
              const name =
                fila.nombre ||
                fila.nombreVal ||
                `mod-${modIdx + 1}-fila-${idx + 1}`;
              const width = parseSize(fila.med1 || fila.m1 || fila.w);
              const height = parseSize(fila.med2 || fila.m2 || fila.h);
              let qty = parseInt(fila.cantidad, 10);
              if (!Number.isFinite(qty) || qty <= 0) qty = 1;
              if (width <= 0 || height <= 0) {
                console.warn(
                  "Optimizador: fila de módulo sin dimensiones válidas:",
                  { mod: mod.nombre || modIdx, fila: idx + 1, fila },
                );
                return;
              }
              for (let n = 0; n < qty; n++) {
                lista.push({
                  id:
                    `mod-${modIdx + 1}-fila-${idx + 1}` +
                    (qty > 1 ? `#${n + 1}` : ""),
                  name,
                  width,
                  height,
                  original: fila,
                });
              }
            });
          });

          console.log(
            "Optimizador: Extraídas desde modulos A4",
            lista.length,
            "piezas (contando cantidades)",
          );
          return lista;
        }

        // 2) Fallback: paginasPiezas (wrappers exportados)
        if (
          Array.isArray(proyecto.datosA4.paginasPiezas) &&
          proyecto.datosA4.paginasPiezas.length > 0
        ) {
          const paginasConPiezas = proyecto.datosA4.paginasPiezas;
          const totalPiezasGuardadas = paginasConPiezas.reduce(
            (sum, p) => sum + (p.piezas?.length || 0),
            0,
          );
          console.log(
            "Optimizador: Encontradas",
            paginasConPiezas.length,
            "páginas con",
            totalPiezasGuardadas,
            "piezas totales (paginasPiezas)",
          );

          const lista = [];
          paginasConPiezas.forEach((pagina, pageIndex) => {
            if (!Array.isArray(pagina.piezas)) return;
            pagina.piezas.forEach((pieza, index) => {
              const name =
                parsePieceNameFromHTML(pieza.innerHTML) ||
                getPieceAttribute(pieza, "nombre") ||
                getPieceAttribute(pieza, "name") ||
                pieza.id ||
                `página-${pageIndex + 1}-pieza-${index + 1}`;
              const dims = getPieceDimensions(pieza);
              if (dims.width <= 0 || dims.height <= 0) return;

              // Determinar cantidad: múltiples fuentes posibles
              let qty = 1;
              const q1 =
                getPieceAttribute(pieza, "cantidad") ||
                getPieceAttribute(pieza, "qty");
              const q2 =
                pieza.attributes &&
                (pieza.attributes["data-cantidad"] ||
                  pieza.attributes["data-qty"] ||
                  pieza.attributes["cantidad"] ||
                  pieza.attributes["qty"]);
              const qVal = q1 || q2 || null;
              if (qVal != null) {
                const parsed = parseInt(
                  String(qVal).replace(/[^0-9\-]/g, ""),
                  10,
                );
                if (Number.isFinite(parsed) && parsed > 0) qty = parsed;
              }

              for (let n = 0; n < qty; n++) {
                lista.push({
                  id:
                    (pieza.id || `página-${pageIndex + 1}-pieza-${index + 1}`) +
                    (qty > 1 ? `#${n + 1}` : ""),
                  name,
                  width: dims.width,
                  height: dims.height,
                  original: pieza,
                });
              }
            });
          });

          console.log(
            "Optimizador: Extraídas",
            lista.length,
            "piezas A4 con dimensiones válidas (paginasPiezas)",
          );
          return lista;
        }

        // 3) Último recurso: no hay datos A4 útiles
        console.log(
          "Optimizador: No hay datos A4 útiles (modulos ni paginasPiezas)",
        );
        return [];
      }

      function extraerPiezas(proyecto) {
        const piezasA4 = extraerPiezasA4(proyecto);
        if (piezasA4.length > 0) {
          return piezasA4;
        }

        if (
          !proyecto ||
          !proyecto.datosDrawing ||
          !Array.isArray(proyecto.datosDrawing.piezas)
        )
          return [];

        const lista = proyecto.datosDrawing.piezas
          .map((pieza, index) => {
            const name =
              parsePieceNameFromHTML(pieza.innerHTML) ||
              getPieceAttribute(pieza, "nombre") ||
              getPieceAttribute(pieza, "name") ||
              pieza.id ||
              `pieza-${index + 1}`;
            const dims = getPieceDimensions(pieza);
            return {
              id: pieza.id || `pieza-${index + 1}`,
              name,
              width: dims.width,
              height: dims.height,
              original: pieza,
            };
          })
          .filter((p) => p.width > 0 && p.height > 0);
        return lista;
      }

      function mostrarInfoProyecto() {
        const info = document.getElementById("projectInfo");
        const piezasInfo = document.getElementById("piecesInfo");
        if (!proyectoCargado) {
          info.style.display = "none";
          piezasInfo.style.display = "none";
          return;
        }

        info.style.display = "block";
        info.textContent = `Proyecto cargado: ${proyectoCargado.nombre} · ${piezas.length} piezas con dimensiones disponibles.`;

        piezasInfo.style.display = "block";
        piezasInfo.innerHTML = `
          <h3>Lista de piezas</h3>
          <p style="margin:0 0 12px;">Estas piezas se usarán para optimizar los paneles.</p>
          <table>
            <thead>
              <tr><th>#</th><th>Nombre</th><th>Ancho</th><th>Alto</th></tr>
            </thead>
            <tbody>
              ${piezas.map((pieza, index) => `<tr><td>${index + 1}</td><td>${pieza.name}</td><td>${pieza.width}</td><td>${pieza.height}</td></tr>`).join("")}
            </tbody>
          </table>
        `;
      }

      function cargarProyectoOptimizador(nombreProyecto) {
        const proyectos = obtenerProyectos();
        const proyecto = proyectos.find((p) => p.nombre === nombreProyecto);
        if (!proyecto) {
          alert("Proyecto no encontrado. Revisa el nombre exacto.");
          return;
        }

        proyectoCargado = proyecto;
        piezas = extraerPiezas(proyectoCargado);
        if (proyectoCargado?.datosA4?.wrappers?.length > 0) {
          console.log(
            "Optimizador: cargando piezas desde datosA4 para proyecto",
            nombreProyecto,
          );
        } else {
          console.log(
            "Optimizador: cargando piezas desde datosDrawing para proyecto",
            nombreProyecto,
          );
        }
        ultimoResultado = null;
        ultimoOptimizationParams = null;
        if (piezas.length === 0) {
          alert(
            "El proyecto no contiene piezas con ancho/alto válidos para optimizar.",
          );
        }
        mostrarInfoProyecto();
        document.getElementById("resultsSection").style.display = "none";
      }

      function mostrarModalCargarProyectoOptimizador() {
        const proyectos = obtenerProyectos();
        if (proyectos.length === 0) {
          alert(
            "No hay proyectos guardados. Guarda primero en Crear Plantilla.",
          );
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
        modal.style.borderRadius = "12px";
        modal.style.padding = "26px";
        modal.style.maxWidth = "720px";
        modal.style.width = "90%";
        modal.style.maxHeight = "80vh";
        modal.style.overflow = "auto";
        modal.style.boxShadow = "0 4px 26px rgba(0,0,0,0.25)";

        const titulo = document.createElement("h2");
        titulo.textContent = "⬆️ Cargar Proyecto";
        titulo.style.marginTop = "0";
        titulo.style.marginBottom = "18px";
        titulo.style.color = "#333";
        modal.appendChild(titulo);

        const descripcion = document.createElement("p");
        descripcion.textContent =
          "Selecciona el proyecto guardado para cargar sus piezas en el optimizador.";
        descripcion.style.marginBottom = "18px";
        descripcion.style.color = "#555";
        modal.appendChild(descripcion);

        const contenedor = document.createElement("div");
        contenedor.style.display = "grid";
        contenedor.style.gap = "12px";

        proyectos.forEach((proyecto) => {
          const card = document.createElement("div");
          card.style.border = "1px solid #ddd";
          card.style.borderRadius = "10px";
          card.style.padding = "16px";
          card.style.background = "#f7f9fc";
          card.style.display = "flex";
          card.style.justifyContent = "space-between";
          card.style.alignItems = "center";
          card.style.gap = "12px";
          card.style.cursor = "pointer";

          const info = document.createElement("div");
          const fecha = new Date(proyecto.timestamp).toLocaleString("es-ES");
          info.innerHTML = `
            <div style="font-weight:700; font-size:16px; margin-bottom:6px;">${proyecto.nombre}</div>
            <div style="font-size:13px; color:#555;">${fecha}</div>
          `;
          card.appendChild(info);

          const btnCargar = document.createElement("button");
          btnCargar.textContent = "Cargar";
          btnCargar.style.padding = "10px 16px";
          btnCargar.style.border = "none";
          btnCargar.style.borderRadius = "8px";
          btnCargar.style.background = "#0096ff";
          btnCargar.style.color = "white";
          btnCargar.style.cursor = "pointer";
          btnCargar.style.fontWeight = "700";

          btnCargar.addEventListener("click", (event) => {
            event.stopPropagation();
            cargarProyectoOptimizador(proyecto.nombre);
            overlay.remove();
          });

          card.addEventListener("click", () => {
            cargarProyectoOptimizador(proyecto.nombre);
            overlay.remove();
          });

          card.appendChild(btnCargar);
          contenedor.appendChild(card);
        });

        modal.appendChild(contenedor);

        const btnCerrar = document.createElement("button");
        btnCerrar.textContent = "Cerrar";
        btnCerrar.style.marginTop = "22px";
        btnCerrar.style.width = "100%";
        btnCerrar.style.padding = "12px";
        btnCerrar.style.background = "#6c757d";
        btnCerrar.style.color = "white";
        btnCerrar.style.border = "none";
        btnCerrar.style.borderRadius = "10px";
        btnCerrar.style.cursor = "pointer";
        btnCerrar.style.fontSize = "15px";

        btnCerrar.addEventListener("click", () => overlay.remove());
        modal.appendChild(btnCerrar);

        overlay.appendChild(modal);
        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) overlay.remove();
        });

        document.body.appendChild(overlay);
      }

      function crearPanel(panelWidth, panelHeight, orientation = "vertical") {
        return {
          piezas: [],
          freeRects: [{ x: 0, y: 0, width: panelWidth, height: panelHeight }],
          width: panelWidth,
          height: panelHeight,
          orientation,
        };
      }

      function pruneFreeRects(rects) {
        return rects.filter((rect, index) => {
          if (!rect || rect.width <= 0 || rect.height <= 0) return false;
          return !rects.some((other, otherIndex) => {
            if (index === otherIndex) return false;
            return (
              other.x <= rect.x &&
              other.y <= rect.y &&
              other.x + other.width >= rect.x + rect.width &&
              other.y + other.height >= rect.y + rect.height
            );
          });
        });
      }

      function getPanelCutLines(panel) {
        const verticals = new Set([0, Number(panel.width) || 0]);
        const horizontals = new Set([0, Number(panel.height) || 0]);
        if (!panel || !Array.isArray(panel.piezas)) {
          return { verticals, horizontals };
        }
        panel.piezas.forEach((pieza) => {
          const x = Number(pieza.x) || 0;
          const y = Number(pieza.y) || 0;
          const width = Number(pieza.width) || 0;
          const height = Number(pieza.height) || 0;
          if (x >= 0 && x <= panel.width) verticals.add(x);
          if (x + width >= 0 && x + width <= panel.width)
            verticals.add(x + width);
          if (y >= 0 && y <= panel.height) horizontals.add(y);
          if (y + height >= 0 && y + height <= panel.height)
            horizontals.add(y + height);
        });
        return { verticals, horizontals };
      }

      function countNewCutsForPlacement(rect, width, height, panel) {
        const { verticals, horizontals } = getPanelCutLines(panel);
        let extraCuts = 0;
        if (rect.x > 0 && !verticals.has(rect.x)) extraCuts += 1;
        if (rect.x + width < panel.width && !verticals.has(rect.x + width))
          extraCuts += 1;
        if (rect.y > 0 && !horizontals.has(rect.y)) extraCuts += 1;
        if (rect.y + height < panel.height && !horizontals.has(rect.y + height))
          extraCuts += 1;
        return extraCuts;
      }

      function getOrientationOptions(pieza, panel) {
        const normal = {
          width: pieza.width,
          height: pieza.height,
          rotated: false,
          priority: panel.orientation === "horizontal" ? 0.1 : 0,
        };
        const rotated = {
          width: pieza.height,
          height: pieza.width,
          rotated: true,
          priority: panel.orientation === "vertical" ? 0.1 : 0,
        };

        if (panel.orientation === "vertical") {
          return [normal, rotated];
        }
        if (panel.orientation === "horizontal") {
          return [rotated, normal];
        }
        return [normal, rotated];
      }

      function simulatePlacement(pieza, panel, sawThickness, preferCuts) {
        const orientaciones = getOrientationOptions(pieza, panel);
        let bestPlacement = null;
        let bestScore = Infinity;
        const rects = panel.freeRects || [];

        for (const { width, height, rotated, priority } of orientaciones) {
          if (width > panel.width || height > panel.height) continue;

          for (const rect of rects) {
            if (width <= rect.width && height <= rect.height) {
              const waste = rect.width * rect.height - width * height;
              const rightWidth = rect.width - width - sawThickness;
              const bottomHeight = rect.height - height - sawThickness;
              const fragments = [];
              if (rightWidth > 0) fragments.push(rightWidth * rect.height);
              if (bottomHeight > 0) fragments.push(width * bottomHeight);
              const fragmentationPenalty =
                fragments.reduce((sum, area) => sum + 5000 / (area + 1), 0) +
                Math.max(0, (fragments.length - 1) * 1200);
              let score =
                waste +
                fragmentationPenalty +
                rect.x * 0.001 +
                rect.y * 0.0001 +
                (rotated ? 0.1 : 0) +
                (priority || 0);
              if (preferCuts) {
                const extraCuts = countNewCutsForPlacement(
                  rect,
                  width,
                  height,
                  panel,
                );
                score += extraCuts * 1200;
              }
              if (score < bestScore) {
                bestScore = score;
                bestPlacement = {
                  rect,
                  x: rect.x,
                  y: rect.y,
                  width,
                  height,
                  rotated,
                  score,
                };
              }
            }
          }
        }

        return bestPlacement;
      }

      function generateFreeRectsFromCut(
        rect,
        pieceWidth,
        pieceHeight,
        sawThickness,
        cutStrategy = "vertical",
      ) {
        const rightWidth = rect.width - pieceWidth - sawThickness;
        const bottomHeight = rect.height - pieceHeight - sawThickness;
        const newRects = [];

        if (cutStrategy === "vertical") {
          // Vertical priority: right first, then bottom
          if (rightWidth > 0) {
            newRects.push({
              x: rect.x + pieceWidth + sawThickness,
              y: rect.y,
              width: rightWidth,
              height: rect.height,
            });
          }
          if (bottomHeight > 0) {
            newRects.push({
              x: rect.x,
              y: rect.y + pieceHeight + sawThickness,
              width: pieceWidth,
              height: bottomHeight,
            });
          }
        } else if (cutStrategy === "horizontal") {
          // Horizontal priority: bottom first, then right
          if (bottomHeight > 0) {
            newRects.push({
              x: rect.x,
              y: rect.y + pieceHeight + sawThickness,
              width: rect.width,
              height: bottomHeight,
            });
          }
          if (rightWidth > 0) {
            newRects.push({
              x: rect.x + pieceWidth + sawThickness,
              y: rect.y,
              width: rightWidth,
              height: pieceHeight,
            });
          }
        } else {
          // Mixed: choose a single non-overlapping guillotine split.
          if (rightWidth >= bottomHeight) {
            if (rightWidth > 0) {
              newRects.push({
                x: rect.x + pieceWidth + sawThickness,
                y: rect.y,
                width: rightWidth,
                height: rect.height,
              });
            }
            if (bottomHeight > 0) {
              newRects.push({
                x: rect.x,
                y: rect.y + pieceHeight + sawThickness,
                width: pieceWidth,
                height: bottomHeight,
              });
            }
          } else {
            if (bottomHeight > 0) {
              newRects.push({
                x: rect.x,
                y: rect.y + pieceHeight + sawThickness,
                width: rect.width,
                height: bottomHeight,
              });
            }
            if (rightWidth > 0) {
              newRects.push({
                x: rect.x + pieceWidth + sawThickness,
                y: rect.y,
                width: rightWidth,
                height: pieceHeight,
              });
            }
          }
        }

        return newRects;
      }

      function intentarColocar(
        pieza,
        panel,
        panelWidth,
        panelHeight,
        sawThickness,
        preferCuts,
        cutStrategy = "vertical",
      ) {
        const bestPlacement = simulatePlacement(
          pieza,
          panel,
          sawThickness,
          preferCuts,
        );
        if (!bestPlacement) {
          return false;
        }

        const placed = {
          ...pieza,
          x: bestPlacement.x,
          y: bestPlacement.y,
          panel: panel.index,
          width: bestPlacement.width,
          height: bestPlacement.height,
          rotated: bestPlacement.rotated,
        };
        panel.piezas.push(placed);

        const rect = bestPlacement.rect;
        const newRects = generateFreeRectsFromCut(
          rect,
          bestPlacement.width,
          bestPlacement.height,
          sawThickness,
          cutStrategy,
        );

        const rects = panel.freeRects || [];
        const index = rects.indexOf(rect);
        if (index >= 0) {
          rects.splice(index, 1, ...newRects);
        } else {
          rects.push(...newRects);
        }

        panel.freeRects = pruneFreeRects(rects);
        return true;
      }

      function optimizar(
        piezas,
        panelWidth,
        panelHeight,
        panelCount,
        sawThickness,
        strategy = "maxside",
        orientation = "vertical",
        initialPanels = null,
        preferCuts = false,
        cutStrategy = "vertical",
      ) {
        if (piezas.length === 0) {
          return {
            exito: false,
            mensaje: "No hay piezas válidas para optimizar.",
          };
        }
        // Normalizar dimensiones numéricas y detectar piezas que no encajan
        const piezasNorm = piezas.map((p) => ({
          ...p,
          width: Number(p.width) || 0,
          height: Number(p.height) || 0,
        }));

        const skipped = [];
        const piezasFiltradas = piezasNorm.filter((p) => {
          const w = p.width;
          const h = p.height;
          const fitsNormal = w <= panelWidth && h <= panelHeight;
          const fitsRot = h <= panelWidth && w <= panelHeight;
          if (!fitsNormal && !fitsRot) {
            skipped.push({ id: p.id, name: p.name, width: w, height: h });
            return false;
          }
          return true;
        });

        if (piezasFiltradas.length === 0) {
          return {
            exito: false,
            mensaje:
              "No hay piezas que quepan en los paneles con las dimensiones dadas.",
            skipped,
          };
        }

        let piezasOrdenadas = [...piezasFiltradas];
        // Estrategias de ordenamiento
        if (strategy === "fixed") {
          // mantener el orden tal cual fueron dadas
          piezasOrdenadas = [...piezasFiltradas];
        } else if (strategy === "maxside") {
          piezasOrdenadas.sort(
            (a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height),
          );
        } else if (strategy === "area") {
          piezasOrdenadas.sort(
            (a, b) => b.width * b.height - a.width * a.height,
          );
        } else if (strategy === "minside") {
          piezasOrdenadas.sort(
            (a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height),
          );
        } else if (strategy === "width") {
          piezasOrdenadas.sort((a, b) => b.width - a.width);
        } else if (strategy === "perimeter") {
          piezasOrdenadas.sort(
            (a, b) => (b.width + b.height) * 2 - (a.width + a.height) * 2,
          );
        } else if (strategy === "optimal") {
          piezasOrdenadas = orderPiecesOptimal(piezasOrdenadas);
        } else if (strategy === "random") {
          piezasOrdenadas.sort(() => Math.random() - 0.5);
        }
        // Si se proveen paneles iniciales (resultado previo parcial), úsalos como punto de partida
        const panels = initialPanels
          ? // deep clone ligero para freeRects y piezas
            initialPanels.map((p) => ({
              index: p.index,
              width: p.width,
              height: p.height,
              orientation: p.orientation,
              freeRects: p.freeRects
                ? p.freeRects.map((r) => ({
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height,
                  }))
                : [{ x: 0, y: 0, width: p.width, height: p.height }],
              piezas: p.piezas ? p.piezas.slice() : [],
            }))
          : [];

        for (const pieza of piezasOrdenadas) {
          let bestPanel = null;
          let bestPlacement = null;

          for (const panel of panels) {
            const placement = simulatePlacement(
              pieza,
              panel,
              sawThickness,
              preferCuts,
            );
            if (!placement) continue;
            if (
              !bestPlacement ||
              placement.score < bestPlacement.score ||
              (placement.score === bestPlacement.score &&
                panel.piezas.length < bestPanel.piezas.length)
            ) {
              bestPlacement = placement;
              bestPanel = panel;
            }
          }

          if (bestPanel) {
            intentarColocar(
              pieza,
              bestPanel,
              panelWidth,
              panelHeight,
              sawThickness,
              preferCuts,
              cutStrategy,
            );
            continue;
          }

          if (panels.length >= panelCount) {
            return {
              exito: false,
              mensaje:
                "No entran piezas en los paneles configurados. Ajusta la cantidad o las dimensiones de los paneles.",
              panels,
              skipped,
            };
          }

          let orientationsToTry = [];
          if (orientation === "mixed") {
            orientationsToTry = ["mixed"];
          } else {
            orientationsToTry = [orientation];
          }

          let placedInNew = false;
          for (const tryOrient of orientationsToTry) {
            const nuevoPanel = crearPanel(panelWidth, panelHeight, tryOrient);
            nuevoPanel.index = panels.length + 1;
            if (
              intentarColocar(
                pieza,
                nuevoPanel,
                panelWidth,
                panelHeight,
                sawThickness,
                preferCuts,
                cutStrategy,
              )
            ) {
              panels.push(nuevoPanel);
              placedInNew = true;
              break;
            }
          }
          if (!placedInNew) {
            // si no entra incluso en un panel vacío, marcar como skipped y continuar
            skipped.push({
              id: pieza.id,
              name: pieza.name,
              width: pieza.width,
              height: pieza.height,
            });
            continue;
          }
        }

        return {
          exito: true,
          mensaje: `Piezas optimizadas en ${panels.length} de ${panelCount} paneles.`,
          panels,
          skipped,
        };
      }

      function clonePanelForOptimization(panel) {
        return {
          index: panel.index,
          width: panel.width,
          height: panel.height,
          orientation: panel.orientation || "vertical",
          freeRects: panel.freeRects
            ? panel.freeRects.map((rect) => ({
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              }))
            : [{ x: 0, y: 0, width: panel.width, height: panel.height }],
          piezas: panel.piezas ? panel.piezas.slice() : [],
        };
      }

      function optimizarPorPaneles(
        piezas,
        panelWidth,
        panelHeight,
        panelCount,
        sawThickness,
        strategy,
        orientation,
        preferCuts,
        cutStrategy,
      ) {
        const remainingPieces = [...piezas];
        const panels = [];

        for (let panelIndex = 1; panelIndex <= panelCount; panelIndex += 1) {
          if (remainingPieces.length === 0) break;

          const firstPass = optimizar(
            remainingPieces,
            panelWidth,
            panelHeight,
            1,
            sawThickness,
            strategy,
            orientation,
            null,
            preferCuts,
            cutStrategy,
          );

          if (
            !firstPass ||
            !Array.isArray(firstPass.panels) ||
            firstPass.panels.length === 0
          ) {
            break;
          }

          const panel = firstPass.panels[0];
          panel.index = panelIndex;

          let placedIds = new Set(panel.piezas.map((p) => p.id));
          let remaining = remainingPieces.filter((p) => !placedIds.has(p.id));

          for (let iter = 0; iter < 2 && remaining.length > 0; iter += 1) {
            const refill = optimizar(
              remaining,
              panelWidth,
              panelHeight,
              1,
              sawThickness,
              strategy,
              orientation,
              [clonePanelForOptimization(panel)],
              preferCuts,
              cutStrategy,
            );

            if (
              !refill ||
              !Array.isArray(refill.panels) ||
              refill.panels.length === 0
            ) {
              break;
            }

            const updatedPanel = refill.panels[0];
            if (!updatedPanel) break;
            updatedPanel.index = panelIndex;

            const newPlacedIds = new Set(updatedPanel.piezas.map((p) => p.id));
            const nextRemaining = remaining.filter(
              (p) => !newPlacedIds.has(p.id),
            );

            panel.freeRects = updatedPanel.freeRects;
            panel.piezas = updatedPanel.piezas;

            if (nextRemaining.length === remaining.length) {
              break;
            }

            remaining = nextRemaining;
          }

          panels.push(panel);
          remainingPieces.splice(0, remainingPieces.length, ...remaining);
        }

        const skipped = remainingPieces
          .filter((p) => {
            const fitsNormal = p.width <= panelWidth && p.height <= panelHeight;
            const fitsRot = p.height <= panelWidth && p.width <= panelHeight;
            return !fitsNormal && !fitsRot;
          })
          .map((p) => ({
            id: p.id,
            name: p.name,
            width: p.width,
            height: p.height,
          }));

        return {
          exito: panels.length > 0,
          mensaje: `Piezas optimizadas en ${panels.length} de ${panelCount} paneles.`,
          panels,
          skipped,
        };
      }

      function computeWaste(result, panelWidth, panelHeight) {
        if (!result || !result.panels) return Infinity;
        const usedArea = result.panels.reduce((acc, panel) => {
          return (
            acc +
            panel.piezas.reduce(
              (a, p) => a + (Number(p.width) || 0) * (Number(p.height) || 0),
              0,
            )
          );
        }, 0);
        const panelsArea =
          (result.panels.length || 0) * panelWidth * panelHeight;
        return panelsArea - usedArea;
      }

      function computePanelCuts(panel) {
        if (
          !panel ||
          !Array.isArray(panel.piezas) ||
          panel.piezas.length === 0
        ) {
          return 0;
        }

        const verticalCuts = new Set();
        const horizontalCuts = new Set();
        const panelWidth = Number(panel.width) || 0;
        const panelHeight = Number(panel.height) || 0;

        for (const pieza of panel.piezas) {
          const x = Number(pieza.x) || 0;
          const y = Number(pieza.y) || 0;
          const width = Number(pieza.width) || 0;
          const height = Number(pieza.height) || 0;
          const right = x + width;
          const bottom = y + height;

          if (x > 0 && x < panelWidth) verticalCuts.add(x);
          if (right > 0 && right < panelWidth) verticalCuts.add(right);
          if (y > 0 && y < panelHeight) horizontalCuts.add(y);
          if (bottom > 0 && bottom < panelHeight) horizontalCuts.add(bottom);
        }

        return verticalCuts.size + horizontalCuts.size;
      }

      function computeTotalCuts(result) {
        if (!result || !result.panels) return 0;
        return result.panels.reduce(
          (acc, panel) => acc + computePanelCuts(panel),
          0,
        );
      }

      function computePanelArea(panel) {
        if (!panel || !panel.piezas) return 0;
        return panel.piezas.reduce(
          (acc, pieza) =>
            acc + (Number(pieza.width) || 0) * (Number(pieza.height) || 0),
          0,
        );
      }

      function computeTotalArea(result) {
        if (!result || !result.panels) return 0;
        return result.panels.reduce(
          (acc, panel) => acc + computePanelArea(panel),
          0,
        );
      }

      function buildPreviousPlacementMap(lastResult) {
        const map = new Map();
        if (!lastResult || !Array.isArray(lastResult.panels)) return map;
        lastResult.panels.forEach((panel) => {
          if (!Array.isArray(panel.piezas)) return;
          panel.piezas.forEach((pieza, index) => {
            map.set(pieza.id, {
              previousPanel: Number(panel.index) || 0,
              previousIndex: index,
              area: Number(pieza.width || 0) * Number(pieza.height || 0),
            });
          });
        });
        return map;
      }

      function orderPiecesForReoptimization(piezas, lastResult) {
        const placementMap = buildPreviousPlacementMap(lastResult);
        return [...piezas].sort((a, b) => {
          const aInfo = placementMap.get(a.id) || {
            previousPanel: 0,
            area: 0,
          };
          const bInfo = placementMap.get(b.id) || {
            previousPanel: 0,
            area: 0,
          };

          if (aInfo.previousPanel !== bInfo.previousPanel) {
            return bInfo.previousPanel - aInfo.previousPanel;
          }
          if (aInfo.area !== bInfo.area) {
            return bInfo.area - aInfo.area;
          }
          return (aInfo.previousIndex || 0) - (bInfo.previousIndex || 0);
        });
      }

      function orderPiecesOptimal(piezas) {
        const groups = {};
        for (const pieza of piezas) {
          const w = Math.min(pieza.width, pieza.height);
          const h = Math.max(pieza.width, pieza.height);
          const key = `${w}x${h}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(pieza);
        }

        const sortedKeys = Object.keys(groups).sort((a, b) => {
          const [aw, ah] = a.split("x").map(Number);
          const [bw, bh] = b.split("x").map(Number);
          if (ah !== bh) return bh - ah;
          return aw - bw;
        });

        return sortedKeys.flatMap((key) =>
          groups[key].sort((a, b) => {
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;
            if (areaA !== areaB) return areaB - areaA;
            if (a.width !== b.width) return b.width - a.width;
            return b.height - a.height;
          }),
        );
      }

      function parseOrientationFromStrategy(strategy) {
        if (!strategy || typeof strategy !== "string") return null;
        const parts = strategy.split("/").map((part) => part.trim());
        if (parts.length >= 2) {
          const orientationPart = parts[1];
          if (["vertical", "horizontal", "mixed"].includes(orientationPart)) {
            return orientationPart;
          }
        }
        return null;
      }

      function arraysMatch(a = [], b = []) {
        if (a.length !== b.length) return false;
        const sortedA = [...a].slice().sort();
        const sortedB = [...b].slice().sort();
        return sortedA.every((value, index) => value === sortedB[index]);
      }

      function isRepeatedOptimization(
        piezas,
        panelWidth,
        panelHeight,
        panelCount,
        sawThickness,
        strategyMode,
        orientationMode,
        cutStrategyMode,
      ) {
        if (!ultimoOptimizationParams) return false;
        if (
          ultimoOptimizationParams.panelWidth !== panelWidth ||
          ultimoOptimizationParams.panelHeight !== panelHeight ||
          ultimoOptimizationParams.panelCount !== panelCount ||
          ultimoOptimizationParams.sawThickness !== sawThickness ||
          ultimoOptimizationParams.strategyMode !== strategyMode ||
          ultimoOptimizationParams.orientationMode !== orientationMode ||
          ultimoOptimizationParams.cutStrategyMode !== cutStrategyMode
        ) {
          return false;
        }
        const currentIds = piezas.map((p) => p.id || "");
        return arraysMatch(currentIds, ultimoOptimizationParams.pieceIds);
      }

      const DEFAULT_EXHAUSTIVE_TIMEOUT_MS = 5000;
      const DEFAULT_EXHAUSTIVE_MAX_NODES = 100000;

      async function exhaustiveSearchAllOrders(
        piezas,
        panelWidth,
        panelHeight,
        panelCount,
        sawThickness,
        orientation,
        preferCuts,
        cutStrategy,
        timeoutMs = DEFAULT_EXHAUSTIVE_TIMEOUT_MS,
        maxNodes = DEFAULT_EXHAUSTIVE_MAX_NODES,
      ) {
        const n = piezas.length;
        if (n === 0) {
          return {
            exito: false,
            mensaje: "No hay piezas para la búsqueda exhaustiva.",
          };
        }

        const used = new Array(n).fill(false);
        const order = new Array(n);
        let nodes = 0;
        let best = null;
        const start = Date.now();
        const yieldEvery = 500;
        const timeSliceMs = 15;

        function isTimeUp() {
          return Date.now() - start > timeoutMs || nodes >= maxNodes;
        }

        function evaluateFullOrder(ord) {
          nodes++;
          const permPieces = ord.map((idx) => piezas[idx]);
          // run optimizar with strategy 'fixed' to respect order
          const r = optimizar(
            permPieces,
            panelWidth,
            panelHeight,
            panelCount,
            sawThickness,
            "fixed",
            orientation,
            null,
            preferCuts,
            cutStrategy,
          );
          if (!r || !r.exito) return;
          const panelsUsed = r.panels ? r.panels.length : Infinity;
          const waste = computeWaste(r, panelWidth, panelHeight);
          const cuts = computeTotalCuts(r);
          const frag = (r.panels || []).reduce(
            (acc, p) => acc + (p.freeRects || []).length,
            0,
          );
          const key = [panelsUsed, waste, cuts, frag];
          if (!best) best = { r, key, nodes };
          else {
            const b = best.key;
            if (
              key[0] < b[0] ||
              (key[0] === b[0] && key[1] < b[1]) ||
              (key[0] === b[0] && key[1] === b[1] && key[2] < b[2]) ||
              (key[0] === b[0] &&
                key[1] === b[1] &&
                key[2] === b[2] &&
                key[3] < b[3])
            ) {
              best = { r, key, nodes };
            }
          }
        }

        return new Promise((resolve) => {
          const stack = [{ pos: 0, nextIndex: 0 }];

          function processChunk() {
            const chunkStart = Date.now();
            while (stack.length > 0 && !isTimeUp()) {
              const frame = stack[stack.length - 1];
              const pos = frame.pos;

              if (pos === n) {
                evaluateFullOrder(order.slice());
                stack.pop();
                if (stack.length > 0) {
                  const prevPos = stack[stack.length - 1].pos;
                  used[order[prevPos]] = false;
                }
                continue;
              }

              if (frame.nextIndex >= n) {
                stack.pop();
                if (stack.length > 0) {
                  const prevPos = stack[stack.length - 1].pos;
                  used[order[prevPos]] = false;
                }
                continue;
              }

              const i = frame.nextIndex++;
              if (used[i]) {
                continue;
              }

              used[i] = true;
              order[pos] = i;
              stack.push({ pos: pos + 1, nextIndex: 0 });

              if (
                nodes > 0 &&
                nodes % yieldEvery === 0 &&
                Date.now() - chunkStart > timeSliceMs
              ) {
                return setTimeout(processChunk, 0);
              }
            }

            if (best) {
              resolve(best.r);
            } else {
              resolve({
                exito: false,
                mensaje:
                  "No se encontró solución exhaustiva dentro de límites.",
              });
            }
          }

          processChunk();
        });
      }

      async function runMultipleAttempts(
        piezas,
        panelWidth,
        panelHeight,
        panelCount,
        sawThickness,
        strategyMode = "auto",
        orientationMode = "auto",
        preferCuts = false,
        reassignCount = 2,
        cutStrategyMode = "auto",
        exhaustiveTimeoutMs = DEFAULT_EXHAUSTIVE_TIMEOUT_MS,
        exhaustiveMaxNodes = DEFAULT_EXHAUSTIVE_MAX_NODES,
      ) {
        const sourcePiezas = isRepeatedOptimization(
          piezas,
          panelWidth,
          panelHeight,
          panelCount,
          sawThickness,
          strategyMode,
          orientationMode,
          cutStrategyMode,
        )
          ? orderPiecesForReoptimization(piezas, ultimoResultado)
          : [...piezas];

        const dimensionVariants = [
          {
            width: panelWidth,
            height: panelHeight,
            prefix: "",
            swapped: false,
          },
        ];
        if (orientationMode === "auto" && panelWidth !== panelHeight) {
          dimensionVariants.push({
            width: panelHeight,
            height: panelWidth,
            prefix: "swapped-dims / ",
            swapped: true,
          });
        }

        const normalizeSwappedResult = (result) => {
          if (
            !result ||
            !result.exito ||
            !Array.isArray(result.panels) ||
            panelWidth === panelHeight
          ) {
            return result;
          }

          const normalizedPanels = result.panels.map((panel) => ({
            ...panel,
            width: panel.height,
            height: panel.width,
            orientation:
              panel.orientation === "vertical"
                ? "horizontal"
                : panel.orientation === "horizontal"
                  ? "vertical"
                  : panel.orientation,
            freeRects: panel.freeRects
              ? panel.freeRects.map((rect) => ({
                  x: rect.y,
                  y: rect.x,
                  width: rect.height,
                  height: rect.width,
                }))
              : panel.freeRects,
            piezas: panel.piezas
              ? panel.piezas.map((pieza) => ({
                  ...pieza,
                  x: pieza.y,
                  y: pieza.x,
                  width: pieza.height,
                  height: pieza.width,
                  rotated:
                    typeof pieza.rotated === "boolean"
                      ? !pieza.rotated
                      : pieza.rotated,
                }))
              : panel.piezas,
          }));

          return { ...result, panels: normalizedPanels };
        };

        const runAttemptsForDimensions = async (
          currentPanelWidth,
          currentPanelHeight,
          strategyPrefix,
          allowPreviousResult,
          isSwapped,
        ) => {
          const strategies =
            strategyMode === "auto"
              ? [
                  "optimal",
                  "maxside",
                  "area",
                  "width",
                  "perimeter",
                  "minside",
                  "random",
                ]
              : [strategyMode];
          const orientations =
            orientationMode === "auto"
              ? ["vertical", "horizontal", "mixed"]
              : orientationMode === "mixed"
                ? ["mixed"]
                : [orientationMode];
          const cutStrategies =
            cutStrategyMode === "auto"
              ? ["vertical", "horizontal", "mixed"]
              : [cutStrategyMode];
          const attempts = [];

          if (
            allowPreviousResult &&
            isRepeatedOptimization(
              piezas,
              currentPanelWidth,
              currentPanelHeight,
              panelCount,
              sawThickness,
              strategyMode,
              orientationMode,
              cutStrategyMode,
            ) &&
            ultimoResultado &&
            ultimoResultado.exito
          ) {
            attempts.push({
              strategy: `${strategyPrefix}previous-result`,
              result: isSwapped
                ? normalizeSwappedResult(ultimoResultado)
                : ultimoResultado,
            });
          }

          if (
            allowPreviousResult &&
            isRepeatedOptimization(
              piezas,
              currentPanelWidth,
              currentPanelHeight,
              panelCount,
              sawThickness,
              strategyMode,
              orientationMode,
              cutStrategyMode,
            ) &&
            ultimoResultado &&
            Array.isArray(ultimoResultado.panels)
          ) {
            try {
              const prevPanels = ultimoResultado.panels || [];
              if (prevPanels.length > 1) {
                const lastK = Math.min(reassignCount || 2, prevPanels.length);
                const keepCount = Math.max(0, prevPanels.length - lastK);
                const initialPanels = prevPanels
                  .slice(0, keepCount)
                  .map((p) => ({
                    index: p.index,
                    width: p.width,
                    height: p.height,
                    orientation: p.orientation || "vertical",
                    freeRects: p.freeRects
                      ? p.freeRects.map((r) => ({
                          x: r.x,
                          y: r.y,
                          width: r.width,
                          height: r.height,
                        }))
                      : [{ x: 0, y: 0, width: p.width, height: p.height }],
                    piezas: p.piezas ? p.piezas.slice() : [],
                  }));

                const remainingPieces = piezas.filter(
                  (p) =>
                    !initialPanels.some((ip) =>
                      (ip.piezas || []).some((pp) => pp.id === p.id),
                    ),
                );

                const reassignStrategy =
                  strategyMode === "auto" ? "maxside" : strategyMode;
                const reassignOrientation =
                  orientationMode === "auto"
                    ? "mixed"
                    : orientationMode === "mixed"
                      ? "mixed"
                      : orientationMode;
                const reassignCutStrategy =
                  cutStrategyMode === "auto" ? "vertical" : cutStrategyMode;
                const r = optimizar(
                  remainingPieces,
                  currentPanelWidth,
                  currentPanelHeight,
                  panelCount,
                  sawThickness,
                  reassignStrategy,
                  reassignOrientation,
                  initialPanels,
                  preferCuts,
                  reassignCutStrategy,
                );
                attempts.push({
                  strategy: `${strategyPrefix}reassign-last${lastK}`,
                  result: isSwapped ? normalizeSwappedResult(r) : r,
                });
              }
            } catch (err) {
              console.warn("Reassign attempt failed:", err);
            }
          }

          for (const orientation of orientations) {
            for (const s of strategies) {
              for (const cutStrat of cutStrategies) {
                if (s === "exhaustive") {
                  const r = await exhaustiveSearchAllOrders(
                    sourcePiezas,
                    currentPanelWidth,
                    currentPanelHeight,
                    panelCount,
                    sawThickness,
                    orientation,
                    preferCuts || s === "optimal",
                    cutStrat,
                    exhaustiveTimeoutMs,
                    exhaustiveMaxNodes,
                  );
                  attempts.push({
                    strategy: `${strategyPrefix}${s} / ${orientation} / cut:${cutStrat}`,
                    result: isSwapped ? normalizeSwappedResult(r) : r,
                  });
                } else {
                  const globalResult = optimizar(
                    sourcePiezas,
                    currentPanelWidth,
                    currentPanelHeight,
                    panelCount,
                    sawThickness,
                    s,
                    orientation,
                    null,
                    preferCuts || s === "optimal",
                    cutStrat,
                  );
                  attempts.push({
                    strategy: `${strategyPrefix}${s} / ${orientation} / cut:${cutStrat}`,
                    result: isSwapped
                      ? normalizeSwappedResult(globalResult)
                      : globalResult,
                  });

                  if (strategyMode === "auto" && panelCount > 1) {
                    const panelByPanelResult = optimizarPorPaneles(
                      sourcePiezas,
                      currentPanelWidth,
                      currentPanelHeight,
                      panelCount,
                      sawThickness,
                      s,
                      orientation,
                      preferCuts || s === "optimal",
                      cutStrat,
                    );
                    attempts.push({
                      strategy: `${strategyPrefix}${s} / ${orientation} / cut:${cutStrat} / panel-by-panel`,
                      result: isSwapped
                        ? normalizeSwappedResult(panelByPanelResult)
                        : panelByPanelResult,
                    });
                  }
                }
              }
            }
          }

          return attempts;
        };

        let attempts = [];
        for (const [index, variant] of dimensionVariants.entries()) {
          const variantAttempts = await runAttemptsForDimensions(
            variant.width,
            variant.height,
            variant.prefix,
            index === 0,
            variant.swapped,
          );
          attempts = attempts.concat(variantAttempts);
        }

        // Si ya tenemos un resultado previo con los mismos parámetros, conservarlo como opción base.
        if (
          isRepeatedOptimization(
            piezas,
            panelWidth,
            panelHeight,
            panelCount,
            sawThickness,
            strategyMode,
            orientationMode,
            cutStrategyMode,
          ) &&
          ultimoResultado &&
          ultimoResultado.exito
        ) {
          attempts.push({
            strategy: "previous-result",
            result: ultimoResultado,
          });
        }

        // Si hay un resultado previo con los mismos parámetros, intentar reubicar
        if (
          isRepeatedOptimization(
            piezas,
            panelWidth,
            panelHeight,
            panelCount,
            sawThickness,
            strategyMode,
            orientationMode,
            cutStrategyMode,
          ) &&
          ultimoResultado &&
          Array.isArray(ultimoResultado.panels)
        ) {
          try {
            const prevPanels = ultimoResultado.panels || [];
            if (prevPanels.length > 1) {
              const lastK = Math.min(reassignCount || 2, prevPanels.length);
              const keepCount = Math.max(0, prevPanels.length - lastK);
              const initialPanels = prevPanels.slice(0, keepCount).map((p) => ({
                index: p.index,
                width: p.width,
                height: p.height,
                orientation: p.orientation || "vertical",
                freeRects: p.freeRects
                  ? p.freeRects.map((r) => ({
                      x: r.x,
                      y: r.y,
                      width: r.width,
                      height: r.height,
                    }))
                  : [{ x: 0, y: 0, width: p.width, height: p.height }],
                piezas: p.piezas ? p.piezas.slice() : [],
              }));

              // piezas que estaban en los últimos paneles y que intentaremos reubicar
              const tailPiecesIds = prevPanels
                .slice(keepCount)
                .flatMap((p) => (p.piezas || []).map((x) => x.id));
              const remainingPieces = piezas.filter(
                (p) =>
                  !initialPanels.some((ip) =>
                    (ip.piezas || []).some((pp) => pp.id === p.id),
                  ),
              );

              // ejecutar optimizar usando initialPanels como inicio
              const reassignStrategy =
                strategyMode === "auto" ? "maxside" : strategyMode;
              const reassignOrientation =
                orientationMode === "auto"
                  ? "mixed"
                  : orientationMode === "mixed"
                    ? "mixed"
                    : orientationMode;
              const r = optimizar(
                remainingPieces,
                panelWidth,
                panelHeight,
                panelCount,
                sawThickness,
                reassignStrategy,
                reassignOrientation,
                initialPanels,
                preferCuts,
                cutStrategyMode === "auto" ? "vertical" : cutStrategyMode,
              );
              attempts.push({ strategy: `reassign-last${lastK}`, result: r });
            }
          } catch (err) {
            // si falla, seguir con los intentos normales
            console.warn("Reassign attempt failed:", err);
          }
        }

        const compareAttemptResults = (a, b) => {
          if (a.exito && !b.exito) return -1;
          if (!a.exito && b.exito) return 1;
          const aPanels = a.panels ? a.panels.length : Infinity;
          const bPanels = b.panels ? b.panels.length : Infinity;
          if (aPanels !== bPanels) return aPanels - bPanels;
          const aSkipped = a.skipped ? a.skipped.length : 0;
          const bSkipped = b.skipped ? b.skipped.length : 0;
          if (aSkipped !== bSkipped) return aSkipped - bSkipped;
          const aWaste = computeWaste(a, panelWidth, panelHeight);
          const bWaste = computeWaste(b, panelWidth, panelHeight);
          if (aWaste !== bWaste) return aWaste - bWaste;
          return computeTotalCuts(a) - computeTotalCuts(b);
        };

        const autoReassignFromResult = (baseResult) => {
          if (
            !baseResult ||
            !baseResult.exito ||
            !Array.isArray(baseResult.panels) ||
            baseResult.panels.length <= 1
          ) {
            return null;
          }

          const prevPanels = baseResult.panels;
          const lastK = Math.min(reassignCount || 2, prevPanels.length);
          const keepCount = Math.max(0, prevPanels.length - lastK);
          const initialPanels = prevPanels.slice(0, keepCount).map((p) => ({
            index: p.index,
            width: p.width,
            height: p.height,
            orientation: p.orientation || "vertical",
            freeRects: p.freeRects
              ? p.freeRects.map((r) => ({
                  x: r.x,
                  y: r.y,
                  width: r.width,
                  height: r.height,
                }))
              : [{ x: 0, y: 0, width: p.width, height: p.height }],
            piezas: p.piezas ? p.piezas.slice() : [],
          }));

          const remainingPieces = piezas.filter(
            (p) =>
              !initialPanels.some((ip) =>
                (ip.piezas || []).some((pp) => pp.id === p.id),
              ),
          );

          const reassignStrategy =
            strategyMode === "auto" ? "maxside" : strategyMode;
          const reassignOrientation =
            orientationMode === "auto"
              ? "mixed"
              : orientationMode === "mixed"
                ? "mixed"
                : orientationMode;
          const reassignCutStrategy =
            cutStrategyMode === "auto" ? "vertical" : cutStrategyMode;

          const reassignResult = optimizar(
            remainingPieces,
            panelWidth,
            panelHeight,
            panelCount,
            sawThickness,
            reassignStrategy,
            reassignOrientation,
            initialPanels,
            preferCuts,
            reassignCutStrategy,
          );
          if (reassignResult && reassignResult.exito) {
            reassignResult.strategy = `auto-reassign-last${lastK}`;
            return reassignResult;
          }
          return null;
        };

        if (strategyMode === "auto" && attempts.length > 0) {
          attempts.sort((A, B) => compareAttemptResults(A.result, B.result));
          let currentBest = attempts[0].result;
          const maxAutoReassignRuns = 3;

          for (let iter = 0; iter < maxAutoReassignRuns; iter += 1) {
            const nextResult = autoReassignFromResult(currentBest);
            if (!nextResult) break;

            const comparison = compareAttemptResults(nextResult, currentBest);
            if (comparison < 0) {
              nextResult.strategy = `auto-reassign-loop${iter + 1}`;
              attempts.push({
                strategy: nextResult.strategy,
                result: nextResult,
              });
              currentBest = nextResult;
            } else {
              break;
            }
          }
        }

        if (strategyMode === "auto" && attempts.length > 0) {
          attempts.sort((A, B) => compareAttemptResults(A.result, B.result));
          let best = attempts[0];
          if (best.result && best.result.exito) {
            const reorderedPiezas = orderPiecesForReoptimization(
              piezas,
              best.result,
            );
            if (
              reorderedPiezas &&
              reorderedPiezas.length === piezas.length &&
              best.result.panels &&
              best.result.panels.length > 0
            ) {
              const retryOrientation =
                orientationMode === "auto" ? "mixed" : orientationMode;
              const retryCutStrategy =
                cutStrategyMode === "auto" ? "vertical" : cutStrategyMode;
              const retryStrategy = "fixed";

              const retryResult = optimizar(
                reorderedPiezas,
                panelWidth,
                panelHeight,
                panelCount,
                sawThickness,
                retryStrategy,
                retryOrientation,
                null,
                preferCuts,
                retryCutStrategy,
              );

              if (retryResult && retryResult.exito) {
                const comparison = compareAttemptResults(
                  retryResult,
                  best.result,
                );
                if (comparison < 0) {
                  retryResult.strategy = `reorder-from-${best.strategy}`;
                  attempts.push({
                    strategy: retryResult.strategy,
                    result: retryResult,
                  });
                  best = {
                    strategy: retryResult.strategy,
                    result: retryResult,
                  };
                }
              }
            }
          }
        }

        // Elegir la mejor: preferir exito con menos panels; luego menos skipped; luego menor waste o menos cortes según la opción; finalmente usar cortes
        attempts.sort((A, B) => {
          const a = A.result;
          const b = B.result;

          // éxito previo
          if (a.exito && !b.exito) return -1;
          if (!a.exito && b.exito) return 1;

          const aPanels = a.panels ? a.panels.length : Infinity;
          const bPanels = b.panels ? b.panels.length : Infinity;
          if (aPanels !== bPanels) return aPanels - bPanels;

          const aSkipped = a.skipped ? a.skipped.length : 0;
          const bSkipped = b.skipped ? b.skipped.length : 0;
          if (aSkipped !== bSkipped) return aSkipped - bSkipped;

          const aCuts = computeTotalCuts(a);
          const bCuts = computeTotalCuts(b);
          if (preferCuts && aCuts !== bCuts) return aCuts - bCuts;

          const aWaste = computeWaste(a, panelWidth, panelHeight);
          const bWaste = computeWaste(b, panelWidth, panelHeight);
          if (aWaste !== bWaste) return aWaste - bWaste;

          return aCuts - bCuts;
        });

        // devolver el mejor resultado y su estrategia
        const best = attempts[0];
        return { ...best.result, strategy: best.strategy };
      }

      function mostrarResultados(resultado) {
        const section = document.getElementById("resultsSection");
        const message = document.getElementById("resultsMessage");
        const panelContainer = document.getElementById("panelsResult");

        section.style.display = "block";
        panelContainer.innerHTML = "";
        message.textContent = resultado.mensaje;
        message.style.background = resultado.exito ? "#e6f4ea" : "#ffe6e6";
        message.style.color = resultado.exito ? "#1b5e20" : "#9d1c1c";

        if (resultado.strategy) {
          const strategyNote = document.createElement("div");
          strategyNote.style.marginTop = "8px";
          strategyNote.style.fontSize = "13px";
          strategyNote.style.color = "#334a6f";
          strategyNote.textContent = `Estrategia aplicada: ${resultado.strategy}`;
          message.appendChild(strategyNote);
        }

        const inputPanelWidth =
          parseFloat(document.getElementById("panelWidth").value) || 0;
        const inputPanelHeight =
          parseFloat(document.getElementById("panelHeight").value) || 0;
        const globalSummary = document.createElement("div");
        globalSummary.className = "summary-box";
        const totalArea = computeTotalArea(resultado);
        const totalCuts = computeTotalCuts(resultado);
        const totalPanelArea =
          (resultado.panels ? resultado.panels.length : 0) *
          inputPanelWidth *
          inputPanelHeight;
        const totalWaste = totalPanelArea - totalArea;
        globalSummary.innerHTML = `
          <strong>Resumen global</strong>
          <div style="margin-top:8px; display:grid; gap:8px; font-size:14px;">
            <div>Total paneles: ${resultado.panels.length}</div>
            <div>Área piezas: ${totalArea.toFixed(0)} mm²</div>
            <div>Área total paneles: ${totalPanelArea.toFixed(0)} mm²</div>
            <div>Desperdicio estimado: ${totalWaste.toFixed(0)} mm²</div>
            <div>Cortes estimados: ${totalCuts}</div>
          </div>
        `;
        panelContainer.appendChild(globalSummary);

        // Mostrar piezas saltadas (skipped) si las hay
        if (resultado.skipped && resultado.skipped.length > 0) {
          const skipDiv = document.createElement("div");
          skipDiv.className = "result-box";
          skipDiv.style.marginBottom = "12px";
          skipDiv.innerHTML = `<strong>Piezas omitidas (no caben en ningún panel):</strong><ul>${resultado.skipped
            .map(
              (s) =>
                `<li class="skipped-piece">${s.name || s.id} — ${s.width} x ${s.height}</li>`,
            )
            .join("")}</ul>`;
          panelContainer.appendChild(skipDiv);
        }

        const panels = resultado.panels || [];
        if (panels.length === 0) {
          const empty = document.createElement("div");
          empty.className = "status-message";
          empty.textContent = "No se generaron paneles.";
          panelContainer.appendChild(empty);
          return;
        }

        // NAVIGATION UI
        let currentIndex = 0;
        const nav = document.createElement("div");
        nav.style.display = "flex";
        nav.style.justifyContent = "space-between";
        nav.style.alignItems = "center";
        nav.style.marginBottom = "10px";

        const btnPrev = document.createElement("button");
        btnPrev.textContent = "◀ Anterior";
        btnPrev.className = "btn-secondary";
        btnPrev.style.padding = "8px 12px";

        const label = document.createElement("div");
        label.style.fontWeight = "700";
        label.textContent = `Panel 1 de ${panels.length}`;

        const btnNext = document.createElement("button");
        btnNext.textContent = "Siguiente ▶";
        btnNext.className = "btn-secondary";
        btnNext.style.padding = "8px 12px";

        nav.appendChild(btnPrev);
        nav.appendChild(label);
        nav.appendChild(btnNext);
        panelContainer.appendChild(nav);

        const singleWrapper = document.createElement("div");
        panelContainer.appendChild(singleWrapper);

        function renderPanelAt(idx) {
          singleWrapper.innerHTML = "";
          const panel = panels[idx];
          label.textContent = `Panel ${idx + 1} de ${panels.length}`;

          const panelHtml = document.createElement("div");
          panelHtml.className = "panel-card";
          panelHtml.innerHTML = `
            <h3>Panel ${panel.index}</h3>
            <p>Utilizado: ${panel.piezas.length} piezas</p>
          `;

          const panelWidth = parseFloat(
            document.getElementById("panelWidth").value,
          );
          const panelHeight = parseFloat(
            document.getElementById("panelHeight").value,
          );

          const visualScale = Math.min(700 / panelWidth, 380 / panelHeight, 1);
          const drawingWidth = Math.round(panelWidth * visualScale);
          const drawingHeight = Math.round(panelHeight * visualScale);

          const visualCard = document.createElement("div");
          visualCard.className = "panel-visual";
          visualCard.innerHTML = `
            <div class="panel-visual-label">Panel ${panel.index}: ${panelWidth} x ${panelHeight} mm</div>
            <div class="panel-drawing" style="width: ${drawingWidth + 4}px; height: ${drawingHeight + 4}px;">
              <div class="panel-drawing-inner" style="width: ${drawingWidth}px; height: ${drawingHeight}px;">
              </div>
            </div>
          `;

          const drawingInner = visualCard.querySelector(".panel-drawing-inner");
          if (Array.isArray(panel.freeRects)) {
            panel.freeRects.forEach((rect) => {
              if (!rect || rect.width <= 0 || rect.height <= 0) return;
              const wasteDiv = document.createElement("div");
              wasteDiv.className = "waste-rect";
              wasteDiv.style.left = `${Math.round(rect.x * visualScale)}px`;
              wasteDiv.style.top = `${Math.round(rect.y * visualScale)}px`;
              wasteDiv.style.width = `${Math.max(1, Math.round(rect.width * visualScale))}px`;
              wasteDiv.style.height = `${Math.max(1, Math.round(rect.height * visualScale))}px`;
              drawingInner.appendChild(wasteDiv);
            });
          }
          panel.piezas.forEach((pieza) => {
            const piezaDiv = document.createElement("div");
            piezaDiv.className = "piece-block";
            const pieceWidth = Math.max(
              1,
              Math.round(pieza.width * visualScale),
            );
            const pieceHeight = Math.max(
              1,
              Math.round(pieza.height * visualScale),
            );
            const left = Math.round(pieza.x * visualScale);
            const top = Math.round(pieza.y * visualScale);
            const overflowsRight = left + pieceWidth > drawingWidth;
            const overflowsBottom = top + pieceHeight > drawingHeight;
            if (overflowsRight || overflowsBottom) {
              piezaDiv.classList.add("overflow-piece");
            }
            piezaDiv.style.left = `${left}px`;
            piezaDiv.style.top = `${top}px`;
            piezaDiv.style.width = `${pieceWidth}px`;
            piezaDiv.style.height = `${pieceHeight}px`;
            // mostrar nombre y medidas (ancho × alto) dentro del bloque visual
            const nameEl = document.createElement("div");
            nameEl.className = "opt-name";
            nameEl.textContent = pieza.name || "";
            nameEl.style.position = "absolute";
            nameEl.style.top = "50%";
            nameEl.style.left = "50%";

            const widthLabel = document.createElement("div");
            widthLabel.className = "opt-edge-label opt-width-label";
            widthLabel.textContent = `${pieza.width}`;

            const heightLabel = document.createElement("div");
            heightLabel.className = "opt-edge-label opt-height-label";
            heightLabel.textContent = `${pieza.height}`;

            // decidir orientación del nombre según relación ancho/alto
            if (pieceWidth >= pieceHeight) {
              nameEl.classList.add("opt-name-horizontal");
              // horizontal: ocupar ancho, centrar y asegurar rotación 0
              nameEl.style.transform = "translate(-50%, -50%) rotate(0deg)";
              nameEl.style.writingMode = "";
              nameEl.style.textOrientation = "";
              nameEl.style.width = "calc(100% - 6px)";
              nameEl.style.height = "";
            } else {
              nameEl.classList.add("opt-name-vertical");
              // vertical: use writing-mode and reserve height instead of width
              nameEl.style.transform = "translate(-50%, -50%)";
              nameEl.style.writingMode = "vertical-rl";
              nameEl.style.textOrientation = "sideways";
              nameEl.style.width = "auto";
              nameEl.style.height = "calc(100% - 8px)";
            }

            // append labels first so we can measure collisions, then name
            piezaDiv.appendChild(widthLabel);
            piezaDiv.appendChild(heightLabel);
            piezaDiv.appendChild(nameEl);
            drawingInner.appendChild(piezaDiv);

            // after layout: set label font-sizes. Measurements use a fixed font size
            // so they remain consistent across todas las piezas.
            const pieceLongest = Math.max(pieceWidth, pieceHeight);
            const fixedLabelFont = 11;
            // hide name only for very small pieces, but keep measurement labels constant
            if (pieceLongest < 28) {
              nameEl.style.display = "none";
              widthLabel.style.fontSize = fixedLabelFont + "px";
              heightLabel.style.fontSize = fixedLabelFont + "px";
              piezaDiv.appendChild(nameEl);
            } else {
              // set fixed label font size and dynamic name size
              const nameBase = Math.max(
                8,
                Math.min(12, Math.round(pieceLongest / 8)),
              );
              nameEl.style.fontSize = nameBase + "px";
              widthLabel.style.fontSize = fixedLabelFont + "px";
              heightLabel.style.fontSize = fixedLabelFont + "px";

              setTimeout(() => {
                try {
                  // ensure name is rendered so we can measure it
                  nameEl.style.display = "";
                  // ensure labels are visually prioritized and reset inline positioning to defaults
                  widthLabel.style.zIndex = 4;
                  heightLabel.style.zIndex = 4;
                  nameEl.style.zIndex = 3;
                  // reset width label inline styles (defaults from CSS)
                  widthLabel.style.top = "1px";
                  widthLabel.style.left = "50%";
                  widthLabel.style.transform = "translate(-50%, 0)";
                  widthLabel.style.right = "";
                  // reset height label inline styles (defaults from CSS)
                  heightLabel.style.left = "100%";
                  heightLabel.style.right = "";
                  heightLabel.style.top = "50%";
                  heightLabel.style.transform =
                    "translate(0, -50%) rotate(90deg)";
                  heightLabel.style.transformOrigin = "top left";

                  const overlaps = (a, b) =>
                    !(
                      a.right <= b.left ||
                      a.left >= b.right ||
                      a.bottom <= b.top ||
                      a.top >= b.bottom
                    );

                  let rectW = widthLabel.getBoundingClientRect();
                  let rectH = heightLabel.getBoundingClientRect();
                  let rectName = nameEl.getBoundingClientRect();
                  const piezaRect = piezaDiv.getBoundingClientRect();
                  const pad = 6; // reserved padding inside piece

                  // determine orientation-specific padding: vertical names need less horizontal padding
                  const isVerticalName =
                    nameEl.classList.contains("opt-name-vertical");
                  const padX = isVerticalName ? 2 : pad; // horizontal padding
                  const padY = isVerticalName ? 0 : pad; // vertical padding: vertical names should be centered more precisely

                  // Do NOT shrink font: check with base font size and hide if it doesn't fit
                  const curSize =
                    parseInt(window.getComputedStyle(nameEl).fontSize, 10) ||
                    nameBase;
                  const fitsBounds = (r) =>
                    r.left >= piezaRect.left + padX &&
                    r.right <= piezaRect.right - padX &&
                    r.top >= piezaRect.top + padY &&
                    r.bottom <= piezaRect.bottom - padY;

                  // debug: initial metrics
                  console.log("Optimizador:nameCheck START", {
                    piece: [pieza.width, pieza.height],
                    px: [pieceWidth, pieceHeight],
                    nameFont: curSize,
                  });

                  // measure once with base font
                  rectName = nameEl.getBoundingClientRect();

                  // final check: try to nudge offending labels before hiding
                  rectW = widthLabel.getBoundingClientRect();
                  rectH = heightLabel.getBoundingClientRect();
                  rectName = nameEl.getBoundingClientRect();

                  // If vertical piece and name overlaps the height label, nudge label.
                  if (pieceWidth < pieceHeight && overlaps(rectName, rectH)) {
                    heightLabel.style.left = "100%";
                    heightLabel.style.right = "";
                    heightLabel.style.transform =
                      "translate(0, -50%) rotate(90deg)";
                    heightLabel.style.transformOrigin = "top left";
                    rectH = heightLabel.getBoundingClientRect();
                    rectName = nameEl.getBoundingClientRect();
                  }

                  // Recenter the vertical height label after rotation if it moved.
                  const labelCenterY = rectH.top + rectH.height / 2;
                  const pieceCenterY = piezaRect.top + piezaRect.height / 2;
                  const verticalShift = Math.round(pieceCenterY - labelCenterY);
                  if (verticalShift !== 0) {
                    heightLabel.style.top = `calc(50% + ${verticalShift}px)`;
                    rectH = heightLabel.getBoundingClientRect();
                    rectName = nameEl.getBoundingClientRect();
                  }

                  const isHorizontal = nameEl.classList.contains(
                    "opt-name-horizontal",
                  );

                  if (isHorizontal && overlaps(rectName, rectW)) {
                    nameEl.style.display = "none";
                    rectName = nameEl.getBoundingClientRect();
                  } else if (!isHorizontal && overlaps(rectName, rectW)) {
                    const topLabelBottom = rectW.bottom - piezaRect.top;
                    const gap = 2;
                    const availableHeight = Math.max(
                      0,
                      piezaRect.height - topLabelBottom - gap,
                    );
                    if (availableHeight > 0) {
                      nameEl.style.height = `${availableHeight}px`;
                      nameEl.style.top = `${
                        topLabelBottom + gap + availableHeight / 2
                      }px`;
                      nameEl.style.overflow = "hidden";
                      nameEl.style.textOverflow = "ellipsis";
                      nameEl.style.whiteSpace = "nowrap";
                      rectName = nameEl.getBoundingClientRect();
                    } else {
                      nameEl.style.display = "none";
                      rectName = nameEl.getBoundingClientRect();
                    }
                  }

                  // final decision: if still overlaps labels or doesn't fit, hide name (measurements keep priority)
                  // Measurements have priority over the name: treat any overlap with
                  // width/height labels as effective overlap and hide the name.
                  const isEdgeH =
                    rectH.right <= rectName.left ||
                    rectH.left >= rectName.right;
                  const isEdgeW = false;

                  // permitir superposición con etiquetas alineadas al borde sólo si la
                  // etiqueta entera queda fuera del área ocupada por el nombre.
                  const effectiveOverlapsH =
                    overlaps(rectName, rectH) && !isEdgeH;
                  const effectiveOverlapsW = overlaps(rectName, rectW);

                  const reason = {
                    overlapsW: overlaps(rectName, rectW),
                    overlapsH: overlaps(rectName, rectH),
                    effectiveOverlapsH,
                    effectiveOverlapsW,
                    fits: fitsBounds(rectName),
                    finalFont: curSize,
                    nameRect: rectName,
                    widthRect: rectW,
                    heightRect: rectH,
                    isEdgeH,
                    isEdgeW,
                  };

                  if (isHorizontal) {
                    // Hide horizontal name if it effectively overlaps the width or height labels
                    if (
                      reason.effectiveOverlapsW ||
                      reason.effectiveOverlapsH
                    ) {
                      nameEl.style.display = "none";
                      console.log(
                        "Optimizador:nameCheck HIDE (horiz overlap)",
                        reason,
                      );
                    } else {
                      // show and clip if it doesn't fully fit
                      nameEl.style.display = "";
                      if (!reason.fits) {
                        nameEl.style.overflow = "hidden";
                        nameEl.style.textOverflow = "ellipsis";
                        nameEl.style.whiteSpace = "nowrap";
                        nameEl.style.width = "calc(100% - 12px)";
                        console.log("Optimizador:nameCheck SHOW-CLIP", reason);
                      } else {
                        console.log("Optimizador:nameCheck SHOW", reason);
                      }
                    }
                  } else {
                    if (
                      reason.effectiveOverlapsW ||
                      reason.effectiveOverlapsH ||
                      !reason.fits
                    ) {
                      nameEl.style.display = "none";
                      console.log("Optimizador:nameCheck HIDE", reason);
                    } else {
                      nameEl.style.display = "";
                      console.log("Optimizador:nameCheck SHOW", reason);
                    }
                  }

                  // if labels overlap each other, nudge them apart slightly but keep the height label on the border
                  if (overlaps(rectW, rectH)) {
                    widthLabel.style.top = "6px";
                    heightLabel.style.left = "100%";
                    heightLabel.style.right = "";
                    heightLabel.style.transformOrigin = "top left";
                  }
                } catch (e) {
                  console.warn("Optimizador: error midiendo etiquetas:", e);
                }
              }, 0);
            }
          });

          const table = document.createElement("table");
          table.innerHTML = `
            <thead>
              <tr><th>#</th><th>Nombre</th><th>Ancho</th><th>Alto</th><th>X</th><th>Y</th></tr>
            </thead>
            <tbody></tbody>
          `;
          const tbody = table.querySelector("tbody");
          panel.piezas.forEach((pieza, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${index + 1}</td>
              <td>${pieza.name}</td>
              <td>${pieza.width}</td>
              <td>${pieza.height}</td>
              <td>${pieza.x}</td>
              <td>${pieza.y}</td>
            `;
            tbody.appendChild(tr);
          });

          const piecesDetails = document.createElement("details");
          piecesDetails.style.marginTop = "16px";
          piecesDetails.style.border = "1px solid #d8e2ef";
          piecesDetails.style.borderRadius = "10px";
          piecesDetails.style.padding = "12px";
          piecesDetails.style.backgroundColor = "#f9fbff";
          piecesDetails.open = false;

          const piecesSummary = document.createElement("summary");
          piecesSummary.style.fontWeight = "700";
          piecesSummary.style.cursor = "pointer";
          piecesSummary.style.fontSize = "15px";
          piecesSummary.style.color = "#0d3b66";
          piecesSummary.textContent = "Piezas del panel";

          piecesDetails.appendChild(piecesSummary);
          piecesDetails.appendChild(table);

          const panelDisplay = document.createElement("div");
          panelDisplay.className = "panel-display";

          const panelLeft = document.createElement("div");
          panelLeft.appendChild(visualCard);
          panelLeft.appendChild(piecesDetails);

          const panelRight = document.createElement("div");
          panelRight.className = "panel-info";
          const panelArea = computePanelArea(panel);
          const panelCuts = computePanelCuts(panel);
          const panelSummary = document.createElement("div");
          panelSummary.className = "panel-summary";
          panelSummary.innerHTML = `
            <strong>Resumen del panel</strong>
            <div style="margin-top:10px; display:grid; gap:8px; font-size:14px;">
              <div>Área piezas: ${panelArea.toFixed(0)} mm²</div>
              <div>Desperdicio estimado: ${(panelWidth * panelHeight - panelArea).toFixed(0)} mm²</div>
              <div>Cortes estimados: ${panelCuts}</div>
              <div>Orientación: ${panel.orientation || "auto"}</div>
              <div>Piezas en panel: ${panel.piezas.length}</div>
            </div>
          `;
          panelRight.appendChild(panelSummary);
          panelDisplay.appendChild(panelLeft);
          panelDisplay.appendChild(panelRight);
          panelHtml.appendChild(panelDisplay);
          singleWrapper.appendChild(panelHtml);
        }

        btnPrev.addEventListener("click", () => {
          if (currentIndex > 0) {
            currentIndex -= 1;
            renderPanelAt(currentIndex);
          }
        });
        btnNext.addEventListener("click", () => {
          if (currentIndex < panels.length - 1) {
            currentIndex += 1;
            renderPanelAt(currentIndex);
          }
        });

        // render inicial
        renderPanelAt(0);
      }

      document
        .getElementById("btnLoadProject")
        .addEventListener("click", mostrarModalCargarProyectoOptimizador);
      document
        .getElementById("btnAdvancedHelp")
        .addEventListener("click", mostrarPanelAyudaAvanzada);
      iniciarPersistenciaOptimizador();
      cargarConfiguracionOptimizador();
      document
        .getElementById("btnOptimize")
        .addEventListener("click", async () => {
          const panelWidth = parseFloat(
            document.getElementById("panelWidth").value,
          );
          const panelHeight = parseFloat(
            document.getElementById("panelHeight").value,
          );
          const panelCount = parseInt(
            document.getElementById("panelCount").value,
            10,
          );
          const sawThickness = parseFloat(
            document.getElementById("sawThickness").value,
          );
          const reassignCount =
            parseInt(document.getElementById("reassignCount").value, 10) || 2;
          const exhaustiveTimeoutMs =
            parseInt(
              document.getElementById("exhaustiveTimeoutMs").value,
              10,
            ) || DEFAULT_EXHAUSTIVE_TIMEOUT_MS;
          const exhaustiveMaxNodes =
            parseInt(document.getElementById("exhaustiveMaxNodes").value, 10) ||
            DEFAULT_EXHAUSTIVE_MAX_NODES;

          if (!proyectoCargado) {
            alert("Carga primero un proyecto antes de optimizar.");
            return;
          }
          if (!panelWidth || !panelHeight || !panelCount || panelCount < 1) {
            alert("Completa las dimensiones y la cantidad de paneles.");
            return;
          }

          const strategyMode = document.getElementById("strategyMode").value;
          const orientationMode =
            document.getElementById("orientationMode").value;
          const cutStrategyMode = document.getElementById("cutStrategy").value;
          const preferCuts = document.getElementById("preferCuts").checked;
          const btn = document.getElementById("btnOptimize");
          const originalHtml = btn.innerHTML;
          btn.disabled = true;
          btn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Optimizing...';

          // Ejecutar (puede ser costoso)
          setTimeout(async () => {
            try {
              const resultado = await runMultipleAttempts(
                piezas,
                panelWidth,
                panelHeight,
                panelCount,
                isNaN(sawThickness) ? 0 : sawThickness,
                strategyMode,
                orientationMode,
                preferCuts,
                reassignCount,
                cutStrategyMode,
                exhaustiveTimeoutMs,
                exhaustiveMaxNodes,
              );
              mostrarResultados(resultado);
              saveCurrentOptimizerSettings();
              if (resultado.exito) {
                ultimoResultado = resultado;
                ultimoOptimizationParams = {
                  panelWidth,
                  panelHeight,
                  panelCount,
                  sawThickness: isNaN(sawThickness) ? 0 : sawThickness,
                  strategyMode,
                  orientationMode,
                  cutStrategyMode,
                  pieceIds: piezas.map((p) => p.id || ""),
                };
              }
            } finally {
              btn.disabled = false;
              btn.innerHTML = originalHtml;
            }
          }, 50);
        });

      function mostrarPanelAyudaAvanzada() {
        const overlay = document.createElement("div");
        overlay.className = "help-overlay";

        const panel = document.createElement("div");
        panel.className = "help-panel";
        panel.innerHTML = `
          <h2>Ayuda: Opciones avanzadas</h2>
          <p>Estas opciones influyen en cómo el optimizador coloca las piezas y genera los cortes. Abre cada sección para ver el significado de cada parámetro.</p>
          <details open>
            <summary>Estrategia de optimización</summary>
            <dl>
              <dt>Automática</dt>
              <dd>Prueba varias estrategias internas y elige la mejor según los paneles usados, desperdicio y cortes.</dd>
              <dt>Optimal</dt>
              <dd>Ordena las piezas por grupos de dimensiones similares para mejorar la compactación.</dd>
              <dt>Maxside</dt>
              <dd>Coloca primero las piezas con el lado mayor más largo, útil para piezas grandes.</dd>
              <dt>Area</dt>
              <dd>Coloca primero las piezas con mayor superficie.</dd>
              <dt>Width</dt>
              <dd>Coloca primero las piezas más anchas.</dd>
              <dt>Minside</dt>
              <dd>Coloca primero las piezas con menor lado más corto, útil para reducir fragmentación.</dd>
              <dt>Random</dt>
              <dd>Orden aleatorio de piezas; sirve para explorar soluciones alternativas.</dd>
            </dl>
          </details>
          <details>
            <summary>Orientación del piezas</summary>
            <dl>
              <dt>Auto</dt>
              <dd>Prueba vertical, horizontal y mixta para hallar la mejor orientación según las piezas.</dd>
              <dt>Vertical</dt>
              <dd>Prioriza piezas sin rotar.</dd>
              <dt>Horizontal</dt>
              <dd>Prioriza rotar piezas cuando el panel se utiliza en orientación horizontal.</dd>
              <dt>Mixta</dt>
              <dd>Permite ambas orientaciones sin preferencia fija.</dd>
            </dl>
          </details>
          <details>
            <summary>Estrategia de corte</summary>
            <dl>
              <dt>Auto</dt>
              <dd>Prueba los tres métodos de corte y elige el que genere mejor resultado.</dd>
              <dt>Vertical</dt>
              <dd>Hace primero el corte vertical (franja derecha) y luego el corte horizontal sobre el resto.</dd>
              <dt>Horizontal</dt>
              <dd>Hace primero el corte horizontal (franja inferior) y luego el corte vertical sobre el resto.</dd>
              <dt>Mixta</dt>
              <dd>Elige dinámicamente el esquema de corte según el espacio disponible para minimizar solapamientos.</dd>
            </dl>
          </details>
          <details>
            <summary>Preferir menos cortes</summary>
            <p>Activa una penalización extra cuando una pieza genera cortes nuevos en el panel. El optimizador tratará de usar menos cortes adicionales aunque el desperdicio sea algo mayor.</p>
          </details>
          <details>
            <summary>Espesor de sierra</summary>
            <p>Define el ancho que ocupa cada línea de corte. Ese valor se resta de los espacios restantes al calcular las zonas libres tras colocar una pieza.</p>
          </details>
          <details>
            <summary>Reubicar últimos N</summary>
            <p>Intenta reubicar las piezas de los últimos paneles generados, manteniendo el resto del resultado. Es útil para mejorar el ajuste sin rehacer todo desde cero.</p>
          </details>
          <button class="btn-secondary" id="btnCloseHelp">Cerrar ayuda</button>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        const closeButton = panel.querySelector("#btnCloseHelp");
        closeButton.addEventListener("click", () => overlay.remove());
        overlay.addEventListener("click", (event) => {
          if (event.target === overlay) overlay.remove();
        });
      }

      // Reubicar últimos N paneles manual
      document.getElementById("btnReassign").addEventListener("click", () => {
        if (
          !ultimoResultado ||
          !Array.isArray(ultimoResultado.panels) ||
          ultimoResultado.panels.length === 0
        ) {
          alert(
            "No hay un resultado previo para reubicar. Ejecuta primero una optimización.",
          );
          return;
        }
        const panelWidth = parseFloat(
          document.getElementById("panelWidth").value,
        );
        const panelHeight = parseFloat(
          document.getElementById("panelHeight").value,
        );
        const panelCount = parseInt(
          document.getElementById("panelCount").value,
          10,
        );
        const sawThickness = parseFloat(
          document.getElementById("sawThickness").value,
        );
        const reassignCount =
          parseInt(document.getElementById("reassignCount").value, 10) || 2;

        const prevPanels = ultimoResultado.panels || [];
        const lastK = Math.min(reassignCount, prevPanels.length);
        const keepCount = Math.max(0, prevPanels.length - lastK);
        const initialPanels = prevPanels.slice(0, keepCount).map((p) => ({
          index: p.index,
          width: p.width,
          height: p.height,
          orientation: p.orientation || "vertical",
          freeRects: p.freeRects
            ? p.freeRects.map((r) => ({
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
              }))
            : [{ x: 0, y: 0, width: p.width, height: p.height }],
          piezas: p.piezas ? p.piezas.slice() : [],
        }));

        const remainingPieces = piezas.filter(
          (p) =>
            !initialPanels.some((ip) =>
              (ip.piezas || []).some((pp) => pp.id === p.id),
            ),
        );

        const totalPiezasReubicar = remainingPieces.length;
        const piezasEnPanelesMantenidos = initialPanels.reduce(
          (acc, p) => acc + (p.piezas ? p.piezas.length : 0),
          0,
        );

        console.log(
          `Reubicación: ${lastK} panel(es) a reubicar, ${keepCount} panel(es) fijos, ${totalPiezasReubicar} piezas a reubicar, ${piezasEnPanelesMantenidos} piezas mantenidas.`,
        );

        const prevStrategy =
          parseOrientationFromStrategy(ultimoResultado.strategy) || "mixed";
        const strategyMode = document.getElementById("strategyMode").value;
        const orientationMode =
          document.getElementById("orientationMode").value;
        const cutStrategyMode = document.getElementById("cutStrategy").value;
        const preferCuts = document.getElementById("preferCuts").checked;
        const resultado = optimizar(
          remainingPieces,
          panelWidth,
          panelHeight,
          panelCount,
          isNaN(sawThickness) ? 0 : sawThickness,
          strategyMode === "auto" ? "maxside" : strategyMode,
          orientationMode === "auto" ? prevStrategy : orientationMode,
          initialPanels,
          preferCuts,
          cutStrategyMode === "auto" ? "vertical" : cutStrategyMode,
        );
        if (resultado.exito && !resultado.strategy) {
          resultado.strategy = `reassign-last${lastK}(${totalPiezasReubicar} piezas)`;
        }
        mostrarResultados(resultado);
        saveCurrentOptimizerSettings();
        if (resultado.exito) {
          ultimoResultado = resultado;
          ultimoOptimizationParams = {
            panelWidth,
            panelHeight,
            panelCount,
            sawThickness: isNaN(sawThickness) ? 0 : sawThickness,
            strategyMode,
            orientationMode,
            cutStrategyMode,
            pieceIds: piezas.map((p) => p.id || ""),
          };
        }
      });
    