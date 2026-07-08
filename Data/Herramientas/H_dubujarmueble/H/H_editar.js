(function () {
  const toolEditar = document.getElementById("tool-editar");
  const gridArea = document.getElementById("gridArea");
  if (!toolEditar || !gridArea) return;

  // Referencias DOM
  const popup = document.getElementById("popup-editar");
  const closeBtn = document.getElementById("editar-close");
  const applyBtn = document.getElementById("editar-apply");
  const cancelBtn = document.getElementById("editar-cancel");
  const canvas = document.getElementById("edit-canvas");

  const toolRadius = document.getElementById("editar-tool-radius");
  const toolAngle = document.getElementById("editar-tool-angle");
  const toolCut = document.getElementById("editar-tool-cut");
  const toolPoints = document.getElementById("editar-tool-points");
  const btnRevertir = document.getElementById("editar-revertir");

  const radiusControls = document.getElementById("radius-controls");
  const angleControls = document.getElementById("angle-controls");
  const cutControls = document.getElementById("cut-controls");

  const radiusCorner = document.getElementById("radius-corner");
  const radiusValue = document.getElementById("radius-value");
  const radiusDisplay = document.getElementById("radius-display");
  const angleCorner = document.getElementById("angle-corner");
  const angleValue = document.getElementById("angle-value");
  const cutClear = document.getElementById("cut-clear");

  let editMode = false;

  // Inicializar módulos externos
  const initModules = function () {
    // primero: popupeditar.js debe estar inicializado
    if (!window.popupEditar || typeof window.popupEditar.init !== "function")
      return;

    const popupOpts = {
      popup,
      closeBtn,
      applyBtn,
      cancelBtn,
      canvas,
      radiusValue,
      radiusCorner,
      angleValue,
      angleCorner,
      radiusControls,
      angleControls,
      cutControls,
      gridArea,
      currentCut: [],
    };
    window.popupEditar.init(popupOpts);

    // Registrar callback para desactivar modo edición al cancelar/cerrar popup
    window.popupEditar.onClose = () => {
      editMode = false;
      toolEditar.classList.remove("activo");
    };

    // Esperar a que popupEditar esté listo antes de iniciar otros módulos
    setTimeout(() => {
      // P_radio.js
      if (window.P_radio && typeof window.P_radio.init === "function") {
        const radioOpts = {
          radiusValue,
          radiusCorner,
          radiusDisplay,
          btnRevertir,
          drawPreview: () => {
            if (window.popupEditar && window.popupEditar.drawPreview) {
              window.popupEditar.drawPreview();
            }
          },
          getState: () => {
            return window.popupEditar && window.popupEditar.getState
              ? window.popupEditar.getState()
              : {};
          },
          setState: (state) => {
            if (window.popupEditar && window.popupEditar.setState) {
              window.popupEditar.setState(state);
            }
          },
        };
        window.P_radio.init(radioOpts);
      }

      // P_calados.js
      if (window.P_calados && typeof window.P_calados.init === "function") {
        const caladosOpts = {
          cutClear,
          drawPreview: () => {
            if (window.popupEditar && window.popupEditar.drawPreview) {
              window.popupEditar.drawPreview();
            }
          },
          getState: () => {
            return window.popupEditar && window.popupEditar.getState
              ? window.popupEditar.getState()
              : {};
          },
          setState: (state) => {
            if (window.popupEditar && window.popupEditar.setState) {
              window.popupEditar.setState(state);
            }
          },
        };
        window.P_calados.init(caladosOpts);
      }

      // Pc_calado_medido.js (nuevo módulo para medidas exactas)
      if (
        window.Pc_calado_medido &&
        typeof window.Pc_calado_medido.init === "function"
      ) {
        const exactMeasuresOpts = {
          drawPreview: () => {
            if (window.popupEditar && window.popupEditar.drawPreview) {
              window.popupEditar.drawPreview();
            }
          },
          getState: () => {
            return window.popupEditar && window.popupEditar.getState
              ? window.popupEditar.getState()
              : {};
          },
          setState: (state) => {
            if (window.popupEditar && window.popupEditar.setState) {
              window.popupEditar.setState(state);
            }
          },
          saveToHistory: (state) => {
            if (window.P_calados && window.P_calados.saveToHistory) {
              window.P_calados.saveToHistory(state);
            }
          },
        };
        window.Pc_calado_medido.init(exactMeasuresOpts);
      }

      // Pc_calado_seleccion - selección y edición de calados en modo exacto
      if (
        window.Pc_calado_seleccion &&
        typeof window.Pc_calado_seleccion.init === "function"
      ) {
        try {
          window.Pc_calado_seleccion.init({
            canvas: document.getElementById("edit-canvas"),
            getState: () =>
              window.popupEditar && window.popupEditar.getState
                ? window.popupEditar.getState()
                : {},
            setState: (s) => {
              if (window.popupEditar && window.popupEditar.setState)
                window.popupEditar.setState(s);
            },
            drawPreview: () => {
              if (window.popupEditar && window.popupEditar.drawPreview)
                window.popupEditar.drawPreview();
            },
            saveToHistory: (s) => {
              if (window.P_calados && window.P_calados.saveToHistory)
                window.P_calados.saveToHistory(s);
            },
          });
        } catch (e) {
          console.warn("Pc_calado_seleccion init failed", e);
        }
      }
    }, 10);
  };

  // Llamar a init cuando los módulos estén disponibles
  initModules();

  // Toggle del botón de edición
  toolEditar.addEventListener("click", () => {
    editMode = !editMode;
    toolEditar.classList.toggle("activo", editMode);

    if (editMode) {
      // Limpiar selección en otro modo si existe
      if (window.Seleccion && window.Seleccion.limpiar) {
        window.Seleccion.limpiar();
      }
    } else {
      // Cerrar popup al desactivar modo edición
      if (window.popupEditar && window.popupEditar.closePopup) {
        window.popupEditar.closePopup();
      }
    }
  });

  // Abrir popup al clickear una pieza en modo edición
  gridArea.addEventListener("click", (e) => {
    if (!editMode) return;
    const pieza = e.target.closest(".pieza-dibujada");
    if (!pieza) return;

    // Seleccionar solo esta pieza
    document
      .querySelectorAll(".pieza-dibujada")
      .forEach((p) => p.classList.remove("pieza-seleccionada"));
    pieza.classList.add("pieza-seleccionada");

    // Abrir popup
    if (window.popupEditar && window.popupEditar.openPopupForPiece) {
      window.popupEditar.openPopupForPiece(pieza);
    }
  });

  // Intercept color/alpha changes from H_color.js
  window.aplicarColorEditar = function (piezas, color) {
    piezas.forEach((p) => {
      const svg = p.querySelector("svg path");
      if (svg) svg.setAttribute("fill", color);
    });
  };

  // Monitor selection changes to disable perspective button if edited piece is selected
  function checkAndDisablePerspectiveButton() {
    const toolView = document.getElementById("tool-view");
    if (!toolView) return;

    let hasEditedPiece = false;
    if (window.Seleccion && window.Seleccion.piezas) {
      window.Seleccion.piezas.forEach((p) => {
        if (p.querySelector("svg")) {
          hasEditedPiece = true;
        }
      });
    }

    if (hasEditedPiece) {
      toolView.disabled = true;
      toolView.style.opacity = "0.5";
      toolView.style.cursor = "not-allowed";
    } else {
      toolView.disabled = false;
      toolView.style.opacity = "1";
      toolView.style.cursor = "pointer";
    }
  }

  const selectionObserver = setInterval(() => {
    checkAndDisablePerspectiveButton();
  }, 300);
})();
