// H_perspectivas.js
(function () {
  // Protección: si ya se ejecutó, no hacer nada
  if (window._perspectivasLoaded) return;
  window._perspectivasLoaded = true;

  console.log("H_perspectivas cargado.");

  // Obtener botón de perspectiva del HTML
  let botonPerspectiva = document.getElementById("tool-persp");
  if (!botonPerspectiva) {
    console.error("Botón tool-persp no encontrado en el HTML");
    return;
  }

  // Opciones de perspectiva
  const opcionesPerspectiva = [
    { label: "Frontal", valor: "frontal" },
    { label: "Superior", valor: "superior" },
    { label: "Lateral", valor: "lateral" },
  ];

  // Crear contenedor del dropdown
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.display = "none";
  container.style.flexDirection = "column";
  container.style.background = "#fff";
  container.style.border = "1px solid #ddd";
  container.style.borderRadius = "6px";
  container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
  container.style.zIndex = "99999";
  container.style.pointerEvents = "auto";
  container.style.padding = "8px";
  container.style.gap = "2px";
  container.style.minWidth = "120px";
  container.style.left = "0";
  container.style.top = "0";

  // Crear opciones
  opcionesPerspectiva.forEach((opcion) => {
    const item = document.createElement("div");
    item.textContent = opcion.label;
    item.style.padding = "6px 10px";
    item.style.cursor = "pointer";
    item.style.fontSize = "12px";
    item.style.color = "#333";
    item.style.userSelect = "none";
    item.style.borderRadius = "3px";
    item.style.border = "none";
    item.style.textAlign = "center";
    item.style.transition = "background 0.15s";

    // Marcar opción actual
    if (opcion.valor === (window.Perspectiva || "frontal")) {
      item.style.background = "#e3f2fd";
      item.style.fontWeight = "bold";
      item.style.color = "#0080ff";
    }

    item.addEventListener("mouseenter", () => {
      if (item.style.background !== "#e3f2fd") {
        item.style.background = "#f5f5f5";
      }
    });

    item.addEventListener("mouseleave", () => {
      if (item.style.background !== "#e3f2fd") {
        item.style.background = "transparent";
      }
    });

    item.addEventListener("click", () => {
      setPerspectiva(opcion.valor);

      // Actualizar visual de opciones
      container.querySelectorAll("div").forEach((div) => {
        div.style.background = "transparent";
        div.style.fontWeight = "normal";
        div.style.color = "#333";
      });
      item.style.background = "#e3f2fd";
      item.style.fontWeight = "bold";
      item.style.color = "#0080ff";

      container.style.display = "none";
    });

    container.appendChild(item);
  });

  document.body.appendChild(container);

  window.closePerspectivePanel = function () {
    if (container.style.display !== "none") {
      container.style.display = "none";
    }
  };

  // CAMBIAR PERSPECTIVA GLOBAL
  function setPerspectiva(p) {
    window.Perspectiva = p;
    botonPerspectiva.title = `Perspectiva: ${p.charAt(0).toUpperCase() + p.slice(1)}`;

    // Limpiar todo el contenido anterior (i, svg, img)
    botonPerspectiva.innerHTML = "";

    // Crear un contenedor para el icono con posición ajustable
    const contenedor = document.createElement("div");
    contenedor.style.display = "flex";
    contenedor.style.alignItems = "center";
    contenedor.style.justifyContent = "center";
    contenedor.style.width = "12px";
    contenedor.style.height = "12px";
    contenedor.style.position = "relative";

    if (p === "superior") {
      // Cargar SVG desde archivo
      const svgImg = document.createElement("img");
      svgImg.src = "./img/icono tapado copia.svg";
      svgImg.style.width = "14px";
      svgImg.style.height = "13px";
      svgImg.style.objectFit = "contain";
      svgImg.style.flexShrink = "0";
      svgImg.style.position = "absolute";
      svgImg.style.top = "0px"; // Ajusta este valor: negativos suben, positivos bajan
      svgImg.style.left = "0px"; // Ajusta este valor: negativos van izquierda, positivos derecha
      contenedor.appendChild(svgImg);
    } else if (p === "frontal") {
      // Crear icono fa-cube espejado
      const icono = document.createElement("i");
      icono.className = "fas fa-cube";
      icono.style.transform = "scaleX(-1)";
      icono.style.flexShrink = "0";
      icono.style.position = "absolute";
      icono.style.top = "0px"; // Ajusta este valor: negativos suben, positivos bajan
      icono.style.left = "0px"; // Ajusta este valor: negativos van izquierda, positivos derecha
      contenedor.appendChild(icono);
    } else {
      // Lateral: icono fa-cube normal
      const icono = document.createElement("i");
      icono.className = "fas fa-cube";
      icono.style.flexShrink = "0";
      icono.style.position = "absolute";
      icono.style.top = "0px"; // Ajusta este valor: negativos suben, positivos bajan
      icono.style.left = "0px"; // Ajusta este valor: negativos van izquierda, positivos derecha
      contenedor.appendChild(icono);
    }

    botonPerspectiva.appendChild(contenedor);

    // Sincronizar select si existe
    const selView = document.getElementById("tool-view");
    if (selView) {
      if (p === "frontal") selView.value = "front";
      else if (p === "superior") selView.value = "top";
      else if (p === "lateral") selView.value = "side";
    }

    // Emitir evento global
    try {
      window.dispatchEvent(
        new CustomEvent("perspective-changed", { detail: { perspective: p } }),
      );
    } catch (e) {}
  }

  function posicionarContainer() {
    const rect = botonPerspectiva.getBoundingClientRect();
    container.style.left = rect.left + "px";
    container.style.top = rect.bottom + 8 + "px";
  }

  // Toggle del dropdown
  botonPerspectiva.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (container.style.display === "none" || container.style.display === "") {
      if (typeof window.closeTransparencyPanel === "function") {
        window.closeTransparencyPanel();
      }
      posicionarContainer();
      container.style.display = "flex";
    } else {
      container.style.display = "none";
    }
  });

  // Cerrar al hacer click fuera
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target) && e.target !== botonPerspectiva) {
      container.style.display = "none";
    }
  });

  // Actualizar posición al redimensionar
  window.addEventListener("resize", () => {
    if (container.style.display !== "none") {
      posicionarContainer();
    }
  });

  // Vista inicial
  setPerspectiva("frontal");

  // Exponer la función
  window.Perspectivas = {
    set: setPerspectiva,
  };
})();
