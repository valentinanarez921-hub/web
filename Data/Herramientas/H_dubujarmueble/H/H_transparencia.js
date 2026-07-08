(function () {
  const botonAlpha = document.getElementById("tool-alpha");
  if (!botonAlpha) return;

  // default alpha
  window.DefaultPieceAlpha = window.DefaultPieceAlpha || 0.8;

  // Opciones de transparencia (reducidas)
  const opcionesTransparencia = [
    { label: "100%", valor: 1.0 },
    { label: "75%", valor: 0.75 },
    { label: "50%", valor: 0.5 },
    { label: "25%", valor: 0.25 },
    { label: "0%", valor: 0.0 },
  ];

  // Crear contenedor principal
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.display = "none";
  container.style.flexDirection = "row";
  container.style.background = "#fff";
  container.style.border = "1px solid #ddd";
  container.style.borderRadius = "6px";
  container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
  container.style.zIndex = 99999;
  container.style.pointerEvents = "auto";
  container.style.padding = "6px";
  container.style.gap = "8px";
  container.style.minHeight = "150px";
  container.style.width = "115px";

  // Contenedor izquierdo: Slider vertical
  const leftContainer = document.createElement("div");
  leftContainer.style.display = "flex";
  leftContainer.style.flexDirection = "column";
  leftContainer.style.alignItems = "center";
  leftContainer.style.gap = "8px";
  leftContainer.style.height = "100%";

  const sliderLabel = document.createElement("div");
  sliderLabel.style.fontSize = "11px";
  sliderLabel.style.fontWeight = "bold";
  sliderLabel.style.color = "#333";
  sliderLabel.style.writingMode = "horizontal-tb";
  sliderLabel.textContent = "Personalizado";
  leftContainer.appendChild(sliderLabel);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.value = Math.round(window.DefaultPieceAlpha * 100);
  slider.style.width = "6px";
  slider.style.height = "120px";
  slider.style.cursor = "pointer";
  slider.style.writingMode = "bt-lr";
  slider.style.WebkitAppearance = "slider-vertical";
  slider.style.appearance = "slider-vertical";

  leftContainer.appendChild(slider);

  const sliderValue = document.createElement("div");
  sliderValue.style.fontSize = "12px";
  sliderValue.style.fontWeight = "bold";
  sliderValue.style.color = "#0080ff";
  sliderValue.style.textAlign = "center";
  sliderValue.style.minWidth = "35px";
  sliderValue.textContent = slider.value + "%";
  leftContainer.appendChild(sliderValue);

  container.appendChild(leftContainer);

  // Contenedor derecho: Dropdown
  const rightContainer = document.createElement("div");
  rightContainer.style.display = "flex";
  rightContainer.style.flexDirection = "column";
  rightContainer.style.gap = "8px";
  rightContainer.style.flex = "1";

  // Crear dropdown
  const dropdownLabel = document.createElement("div");
  dropdownLabel.style.fontSize = "12px";
  dropdownLabel.style.fontWeight = "bold";
  dropdownLabel.style.color = "#333";
  dropdownLabel.textContent = "Presets:";
  rightContainer.appendChild(dropdownLabel);

  const dropdown = document.createElement("div");
  dropdown.style.display = "flex";
  dropdown.style.flexDirection = "column";
  dropdown.style.gap = "2px";

  // Crear opciones del dropdown
  opcionesTransparencia.forEach((opcion) => {
    const item = document.createElement("div");
    item.textContent = opcion.label;
    item.style.padding = "4px 6px";
    item.style.cursor = "pointer";
    item.style.fontSize = "11px";
    item.style.whiteSpace = "nowrap";
    item.style.borderRadius = "3px";
    item.style.border = "none";
    item.style.textAlign = "center";

    // Marcar la opción actual
    if (Math.abs(opcion.valor - window.DefaultPieceAlpha) < 0.05) {
      item.style.background = "#e3f2fd";
      item.style.fontWeight = "bold";
      item.style.color = "#0080ff";
    } else {
      item.style.background = "#f9f9f9";
      item.style.color = "#333";
    }

    item.addEventListener("mouseenter", () => {
      if (item.style.background !== "#e3f2fd") {
        item.style.background = "#f0f0f0";
      }
    });

    item.addEventListener("mouseleave", () => {
      if (item.style.background !== "#e3f2fd") {
        item.style.background = "#f9f9f9";
      }
    });

    item.addEventListener("click", () => {
      establecerTransparencia(opcion.valor);
      slider.value = Math.round(opcion.valor * 100);
    });

    dropdown.appendChild(item);
  });

  rightContainer.appendChild(dropdown);
  container.appendChild(rightContainer);

  document.body.appendChild(container);

  window.closeTransparencyPanel = function () {
    if (container.style.display !== "none") {
      container.style.display = "none";
    }
  };

  function establecerTransparencia(valor) {
    window.DefaultPieceAlpha = valor;
    sliderValue.textContent = Math.round(valor * 100) + "%";

    // Aplicar transparencia a piezas seleccionadas
    if (window.Seleccion && window.Seleccion.piezas) {
      window.Seleccion.piezas.forEach((p) => {
        if (p.querySelector("svg")) {
          const paths = p.querySelectorAll("svg path");
          const hex =
            p.dataset.colorHex ||
            getComputedStyle(p).backgroundColor ||
            "#ffffff";
          const hexClean = normalizeColorToHex(hex);
          if (paths.length > 0) {
            paths[0].setAttribute("fill", hexToRgba(hexClean, valor));
          }
          if (window.updateSvgPieceColor) {
            window.updateSvgPieceColor(p, hexToRgba(hexClean, valor), valor);
          }
        } else {
          const hex =
            p.dataset.colorHex ||
            getComputedStyle(p).backgroundColor ||
            "#ffffff";
          const hexClean = normalizeColorToHex(hex);
          p.style.background = hexToRgba(hexClean, valor);
        }
      });
    }

    actualizarBoton();
  }

  function actualizarBoton() {
    const porcentaje = Math.round(window.DefaultPieceAlpha * 100);
    botonAlpha.title = `Transparencia: ${porcentaje}%`;
  }

  function posicionarContainer() {
    const rect = botonAlpha.getBoundingClientRect();
    container.style.left = rect.left + "px";
    container.style.top = rect.bottom + 8 + "px";
  }

  window.addEventListener("resize", () => {
    if (container.style.display !== "none") posicionarContainer();
  });

  botonAlpha.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (container.style.display === "none" || container.style.display === "") {
      if (typeof window.closePerspectivePanel === "function") {
        window.closePerspectivePanel();
      }
      posicionarContainer();
      container.style.display = "flex";
    } else {
      container.style.display = "none";
    }
  });

  // Slider input
  slider.addEventListener("input", (ev) => {
    const valor = parseInt(ev.target.value) / 100;
    sliderValue.textContent = ev.target.value + "%";
    establecerTransparencia(valor);
  });

  // Cerrar container si clickean fuera
  document.addEventListener("click", (ev) => {
    const target = ev.target;
    if (container.style.display === "none") return;
    if (container.contains(target)) return;
    if (botonAlpha.contains(target)) return;
    container.style.display = "none";
  });

  actualizarBoton();

  // Helpers
  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    const rgbMatch = String(hex).match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(",").map((s) => s.trim());
      return {
        r: parseInt(parts[0]) || 0,
        g: parseInt(parts[1]) || 0,
        b: parseInt(parts[2]) || 0,
      };
    }
    let h = String(hex).replace("#", "").trim();
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.substr(0, 2), 16),
      g: parseInt(h.substr(2, 2), 16),
      b: parseInt(h.substr(4, 2), 16),
    };
  }

  function normalizeColorToHex(input) {
    if (!input) return "#ffffff";
    if (String(input).trim().startsWith("#")) return input;
    const m = String(input).match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(",").map((s) => s.trim());
      const r = parseInt(parts[0]) || 0;
      const g = parseInt(parts[1]) || 0;
      const b = parseInt(parts[2]) || 0;
      return rgbToHex(r, g, b);
    }
    return "#ffffff";
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((v) => {
          const s = Number(v).toString(16);
          return s.length === 1 ? "0" + s : s;
        })
        .join("")
    );
  }
})();
