// H_rotar.js - Rotar piezas 90 grados
(function () {
  const toolRotate = document.getElementById("tool-rotate");
  const gridArea = document.getElementById("gridArea");

  if (!toolRotate || !gridArea) {
    console.warn("H_rotar: faltan elementos del DOM (tool-rotate o gridArea)");
    return;
  }

  // Función para rotar una pieza; si se pasa targetRotation aplica ese valor exacto
  function getPieceTransform(pieza) {
    const rotation = parseFloat(pieza.dataset.rotation) || 0;
    const mirror = pieza.dataset.mirror === "left" ? -1 : 1;
    return `scaleX(${mirror}) rotate(${rotation}deg)`;
  }

  function applyPieceTransform(pieza) {
    pieza.style.transform = getPieceTransform(pieza);
  }

  function rotatePieza(pieza, targetRotation = null, disableAnimation = false) {
    if (!pieza) return;

    // Guardar medidas originales la PRIMERA VEZ que se rota
    if (!pieza.dataset.m1_original) {
      pieza.dataset.m1_original = pieza.dataset.m1;
      pieza.dataset.m2_original = pieza.dataset.m2;
      console.log(
        `H_rotar: Guardadas medidas originales m1=${pieza.dataset.m1_original}, m2=${pieza.dataset.m2_original}`,
      );
    }

    // Guardar estado de calados ORIGINAL la primera vez (antes de cualquier rotación)
    if (!pieza._holesOriginal && pieza.dataset.edit) {
      try {
        pieza._holesOriginal = JSON.parse(pieza.dataset.edit);
        console.log(
          `H_rotar: Guardado _holesOriginal con ${pieza._holesOriginal.holes?.length || 0} calados`,
        );
      } catch (e) {
        pieza._holesOriginal = null;
      }
    }

    if (disableAnimation) {
      if (pieza.style.transition && pieza.style.transition.includes("rotate")) {
        pieza.style.transition = pieza.style.transition
          .split(",")
          .map((segment) => segment.trim())
          .filter((segment) => !segment.startsWith("rotate"))
          .join(", ");
      }
    } else if (
      !pieza.style.transition ||
      !pieza.style.transition.includes("rotate")
    ) {
      pieza.style.transition = "rotate 0.4s ease-in-out";
    }

    let rotation = parseFloat(pieza.dataset.rotation) || 0;
    if (typeof targetRotation === "number" && !Number.isNaN(targetRotation)) {
      if (targetRotation === 360) {
        rotation = 360;
      } else {
        rotation = ((targetRotation % 360) + 360) % 360;
      }
    } else {
      rotation = (rotation + 90) % 360;
    }
    pieza.dataset.rotation = rotation;

    applyPieceTransform(pieza);

    console.log(`H_rotar: Pieza rotada ${rotation}°`);

    // Forzar actualización de dimensiones inmediatamente
    if (
      window.Cuadricula &&
      typeof window.Cuadricula.actualizarPiezas === "function"
    ) {
      window.Cuadricula.actualizarPiezas();
    }
  }

  // Función auxiliar para aplicar la rotación guardada
  function applyStoredRotation(pieza) {
    const rotation = parseFloat(pieza.dataset.rotation) || 0;
    if (rotation !== 0) {
      pieza.style.rotate = `${rotation}deg`;
      pieza.style.transform = `rotate(${rotation}deg)`;
      console.log(`H_rotar: Re-aplicando rotación guardada ${rotation}°`);
    }
  }

  // ===== CRITICAL FIX =====
  // Interceptar actualizarPiezas() para preservar rotación durante drag
  if (
    window.Cuadricula &&
    typeof window.Cuadricula.actualizarPiezas === "function"
  ) {
    const originalActualizarPiezas = window.Cuadricula.actualizarPiezas;

    window.Cuadricula.actualizarPiezas = function () {
      // Llamar a la función original
      originalActualizarPiezas.call(this);

      // DESPUÉS de actualizar: re-aplicar la rotación/mirror CSS para que persista
      gridArea.querySelectorAll(".pieza-dibujada").forEach((pieza) => {
        applyPieceTransform(pieza);
      });
    };
    console.log(
      "H_rotar: actualizarPiezas interceptado para preservar rotación",
    );
  }

  // Crear panel de rotación precisa
  const rotationPanel = document.createElement("div");
  rotationPanel.id = "rotation-panel";
  rotationPanel.style.position = "absolute";
  rotationPanel.style.minWidth = "220px";
  rotationPanel.style.padding = "10px";
  rotationPanel.style.background = "#ffffff";
  rotationPanel.style.border = "1px solid #ccc";
  rotationPanel.style.borderRadius = "6px";
  rotationPanel.style.boxShadow = "0 8px 18px rgba(0,0,0,0.12)";
  rotationPanel.style.zIndex = "9999";
  rotationPanel.style.display = "none";
  rotationPanel.style.fontFamily = "Arial, sans-serif";
  rotationPanel.style.fontSize = "13px";

  rotationPanel.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: 700;">Rotación precisa</div>
    <label style="display:block; margin-bottom: 6px; color:#333;">Grados (decimales permitidos)</label>
    <input id="rotation-input" type="number" step="0.1" style="width:100%; box-sizing:border-box; padding: 8px 10px; border:1px solid #ccc; border-radius:4px; margin-bottom:8px;" />
    <div style="display:flex; gap:6px; margin-bottom:10px;">
      <button id="rotation-minus" type="button" style="flex:1; padding: 8px 10px; border:none; border-radius:4px; background:#f0f0f0; color:#333; cursor:pointer;">-45°</button>
      <button id="rotation-plus" type="button" style="flex:1; padding: 8px 10px; border:none; border-radius:4px; background:#007bff; color:#fff; cursor:pointer;">+45°</button>
    </div>
    <label style="display:block; margin-bottom: 6px; color:#333;">Barra de rotación 0–360°</label>
    <input id="rotation-slider" type="range" min="0" max="360" step="1" value="0" style="width:100%; margin-bottom:12px;" />
  `;
  document.body.appendChild(rotationPanel);

  const rotationInput = rotationPanel.querySelector("#rotation-input");
  const rotationSlider = rotationPanel.querySelector("#rotation-slider");
  const rotationPlus = rotationPanel.querySelector("#rotation-plus");
  const rotationMinus = rotationPanel.querySelector("#rotation-minus");

  function setSelectionRotation(value, saveHistory = false) {
    const selected = Array.from(
      gridArea.querySelectorAll(".pieza-seleccionada"),
    );
    if (selected.length === 0) return;

    let normalized = value;
    if (normalized === 360) {
      normalized = 360;
    } else {
      normalized = ((normalized % 360) + 360) % 360;
    }

    selected.forEach((pieza) => rotatePieza(pieza, normalized));
    rotationInput.value = normalized.toFixed(1);
    rotationSlider.value = Math.round(normalized);

    if (
      saveHistory &&
      window.P_calados &&
      typeof window.P_calados.saveToHistory === "function"
    ) {
      const estado = window.P_calados.getState
        ? window.P_calados.getState()
        : {};
      window.P_calados.saveToHistory(estado);
    }
  }

  function openRotatePanel() {
    const selected = Array.from(
      gridArea.querySelectorAll(".pieza-seleccionada"),
    );
    if (selected.length === 0) {
      console.warn("H_rotar: no hay piezas seleccionadas");
      alert("Selecciona al menos una pieza para rotar");
      return;
    }

    const rotationValues = selected.map(
      (pieza) => parseFloat(pieza.dataset.rotation) || 0,
    );
    const allEqual = rotationValues.every((r) => r === rotationValues[0]);
    const currentRotation = allEqual ? rotationValues[0] : 0;
    rotationInput.value = allEqual ? currentRotation.toFixed(1) : "";
    rotationInput.placeholder = "0.0";
    rotationSlider.value = Math.round(currentRotation);

    const rect = toolRotate.getBoundingClientRect();
    rotationPanel.style.top = `${rect.bottom + window.scrollY + 8}px`;
    rotationPanel.style.left = `${Math.max(8, rect.left + window.scrollX - 60)}px`;
    rotationPanel.style.display = "block";
    rotationInput.focus();
    rotationInput.select();
  }

  function closeRotatePanel() {
    rotationPanel.style.display = "none";
  }

  rotationInput.addEventListener("input", () => {
    const value = parseFloat(rotationInput.value);
    if (!Number.isNaN(value)) {
      setSelectionRotation(value, false);
    }
  });

  rotationSlider.addEventListener("input", () => {
    const value = parseFloat(rotationSlider.value);
    if (!Number.isNaN(value)) {
      const selected = Array.from(
        gridArea.querySelectorAll(".pieza-seleccionada"),
      );
      if (selected.length === 0) return;
      const normalized = value === 360 ? 360 : ((value % 360) + 360) % 360;
      selected.forEach((pieza) => rotatePieza(pieza, normalized, true));
      rotationInput.value = normalized.toFixed(1);
    }
  });

  rotationPlus.addEventListener("click", () => {
    const current = parseFloat(rotationInput.value) || 0;
    setSelectionRotation(current + 45, false);
  });

  rotationMinus.addEventListener("click", () => {
    const current = parseFloat(rotationInput.value) || 0;
    setSelectionRotation(current - 45, false);
  });

  rotationPanel.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", (event) => {
    if (!rotationPanel.contains(event.target) && event.target !== toolRotate) {
      closeRotatePanel();
    }
  });

  toolRotate.addEventListener("click", (e) => {
    e.stopPropagation();
    openRotatePanel();
  });

  // Exportar función para uso externo
  // Función PÚBLICA para obtener puntos del calado
  // Los puntos están SIEMPRE en escala de canvas (600x400), sin importar la rotación
  // Esta función simplemente devuelve los puntos tal cual están guardados
  function getTransformedCaladoState(pieza) {
    if (!pieza || !pieza.dataset.edit) return null;

    try {
      return JSON.parse(pieza.dataset.edit);
    } catch (e) {
      console.warn("H_rotar: Error al leer calados", e);
      return null;
    }
  }

  window.H_rotar = {
    rotatePieza: rotatePieza,
    rotateSelection: function () {
      const piezasSeleccionadas = gridArea.querySelectorAll(
        ".pieza-seleccionada",
      );
      piezasSeleccionadas.forEach(rotatePieza);
    },
    rotarPiezaByElement: function (element) {
      rotatePieza(element);
    },
    getTransformedCaladoState: getTransformedCaladoState,
  };

  console.log("H_rotar cargado correctamente");
})();
