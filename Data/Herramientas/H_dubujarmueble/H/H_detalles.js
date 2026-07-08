// toggle_detalles.js
(function () {
  let btn = null;
  let gridArea = null;
  let estado = 0;

  const iconos = [
    "fa-eye", // estado 0 → todo visible
    "fa-ruler", // estado 1 → solo medidas
    "fa-user", // estado 2 → solo nombre
    "fa-eye-slash", // estado 3 → todo oculto
  ];

  const titulos = [
    "Mostrar nombre y medidas",
    "Mostrar solo medidas",
    "Mostrar solo nombre",
    "Ocultar nombre y medidas",
  ];

  function crearIcono() {
    const icon = document.createElement("i");
    icon.className = "fas " + iconos[estado];
    return icon;
  }

  function attachButtonListener() {
    if (!btn) return;

    btn.type = "button";
    btn.removeEventListener("click", onToggleDetalles);
    btn.addEventListener("click", onToggleDetalles);

    if (!btn.querySelector("i")) {
      btn.appendChild(crearIcono());
    }

    btn.title = titulos[estado];
    btn.setAttribute("aria-label", titulos[estado]);
  }

  function inicializar() {
    btn = document.getElementById("tool-toggle-detalles");
    gridArea = document.getElementById("gridArea");

    if (!btn) {
      console.warn("❌ H_detalles: tool-toggle-detalles no encontrado");
      return false;
    }

    if (!gridArea) {
      console.warn("❌ H_detalles: gridArea no encontrado");
      return false;
    }

    attachButtonListener();
    actualizarDetalles();
    observarNuevasPiezas();

    console.log("✅ H_detalles: inicializado correctamente");
    return true;
  }

  function onToggleDetalles() {
    estado = (estado + 1) % iconos.length;
    console.log(`🔄 H_detalles: estado cambió a ${estado} (${iconos[estado]})`);
    actualizarDetalles();
  }

  function actualizarDetalles() {
    if (!gridArea) {
      gridArea = document.getElementById("gridArea");
      if (!gridArea) {
        console.warn(
          "❌ H_detalles: gridArea no disponible en actualizarDetalles",
        );
        return;
      }
    }

    const mostrarNombre = estado === 0 || estado === 2;
    const mostrarMedidas = estado === 0 || estado === 1;

    gridArea.querySelectorAll(".pieza-dibujada").forEach((p) => {
      const nombre = p.querySelector(".nombre-pieza");
      const medidas = p.querySelector(".pieza-medidas");

      if (nombre) {
        nombre.style.display = mostrarNombre ? "block" : "none";
      }
      if (medidas) {
        medidas.style.display = mostrarMedidas ? "block" : "none";
      }
    });

    if (btn) {
      let icon = btn.querySelector("i");
      if (!icon) {
        icon = crearIcono();
        btn.appendChild(icon);
      } else {
        icon.className = "fas " + iconos[estado];
      }

      btn.title = titulos[estado];
      btn.setAttribute("aria-label", titulos[estado]);
      console.log(`🎨 H_detalles: icono actualizado a ${iconos[estado]}`);
    }
  }

  function observarNuevasPiezas() {
    if (!gridArea || !window.MutationObserver || window._HDetallesObserver)
      return;

    const observer = new MutationObserver((mutations) => {
      const shouldApply = mutations.some(
        (m) => m.addedNodes.length > 0 || m.type === "attributes",
      );
      if (shouldApply) {
        actualizarDetalles();
      }
    });

    observer.observe(gridArea, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    window._HDetallesObserver = observer;
  }

  function tryInitialize() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializar);
    }

    if (!inicializar()) {
      const maxRetries = 50;
      let retryCount = 0;
      const retryInterval = setInterval(() => {
        retryCount += 1;
        if (inicializar() || retryCount >= maxRetries) {
          clearInterval(retryInterval);
        }
      }, 100);
    }
  }

  tryInitialize();

  window.ToggleDetalles = {
    aplicar: actualizarDetalles,
    getEstado: () => estado,
    setEstado: (newEstado) => {
      estado = ((newEstado % iconos.length) + iconos.length) % iconos.length;
      actualizarDetalles();
    },
  };

  console.log("📦 H_detalles.js cargado");
})();
