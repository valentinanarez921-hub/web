document.addEventListener("DOMContentLoaded", () => {

  const btnDibujar = document.getElementById("dibujarMueble");
  const popupDibujo = document.getElementById("popup-dibujo");
  const popupCerrar = popupDibujo.querySelector(".popup-close");

  if (!btnDibujar || !popupDibujo) return;

  // -------------------------
  // Cargar panel izquierdo con módulos reales
  // -------------------------
  function cargarPanelIzquierdoPopup() {
    const contenedor = document.getElementById("popup-left-list");
    if (!contenedor) return;

    contenedor.innerHTML = "";
    const modulos = document.querySelectorAll(".modulo-datos");

    if(modulos.length===0){ 
      contenedor.innerHTML="<em>No hay módulos creados aún.</em>"; 
      return; 
    }

    modulos.forEach(mod => {
      const nombreModulo = mod.dataset.modulo || "Sin nombre";
      
      // Contenedor principal del módulo
      const moduloBox = document.createElement("div");
      moduloBox.style.border = "1px solid #ddd";
      moduloBox.style.borderRadius = "4px";
      moduloBox.style.background = "#fafafa";
      moduloBox.style.marginBottom = "6px";
      moduloBox.style.overflow = "hidden";

      // Encabezado del módulo (desplegable)
      const encabezado = document.createElement("div");
      encabezado.style.padding = "8px 10px";
      encabezado.style.fontWeight = "bold";
      encabezado.style.fontSize = "12px";
      encabezado.style.cursor = "pointer";
      encabezado.style.background = "#f0f0f0";
      encabezado.style.display = "flex";
      encabezado.style.alignItems = "center";
      encabezado.style.justifyContent = "space-between";
      encabezado.style.userSelect = "none";
      encabezado.textContent = nombreModulo;

      // Flecha desplegable
      const flecha = document.createElement("span");
      flecha.textContent = "▼";
      flecha.style.fontSize = "10px";
      flecha.style.transition = "transform 0.2s";
      encabezado.appendChild(flecha);

      // Lista de piezas (oculta por defecto)
      const listaPiezas = document.createElement("div");
      listaPiezas.style.display = "none";
      listaPiezas.style.padding = "0";
      listaPiezas.style.background = "#fff";

      const piezas = mod.querySelectorAll(".embedded-right-row");
      
      if (piezas.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.style.padding = "6px 10px";
        emptyMsg.style.fontSize = "11px";
        emptyMsg.style.color = "#999";
        emptyMsg.textContent = "Sin piezas";
        listaPiezas.appendChild(emptyMsg);
      } else {
        piezas.forEach(pieza => {
          const qty = pieza.querySelector(".er-qty")?.innerText.trim() || "1";
          const m1 = pieza.querySelector(".er-med1")?.innerText.trim() || "-";
          const m2 = pieza.querySelector(".er-med2")?.innerText.trim() || "-";
          const mat = pieza.querySelector(".er-material")?.innerText.trim() || "-";
          const nom = pieza.querySelector(".er-nombre")?.innerText.trim() || "pieza";
          const miniNode = pieza.querySelector(".lado-mini");
          const mini = miniNode ? miniNode.outerHTML : "";

          const piezaItem = document.createElement("div");
          piezaItem.style.padding = "6px 10px";
          piezaItem.style.fontSize = "11px";
          piezaItem.style.borderBottom = "1px solid #f0f0f0";
          piezaItem.style.display = "flex";
          piezaItem.style.alignItems = "center";
          piezaItem.style.justifyContent = "space-between";
          piezaItem.style.background = "#fff";
          piezaItem.style.cursor = "pointer";
          piezaItem.style.transition = "background 0.1s";

          const piezaInfo = document.createElement("div");
          piezaInfo.style.flex = "1";
          piezaInfo.style.fontSize = "11px";
          
          const nombreStrong = document.createElement("strong");
          nombreStrong.textContent = nom;
          nombreStrong.style.fontWeight = "700";
          
          const restInfo = document.createElement("span");
          restInfo.textContent = ` ${qty}× (${m1}×${m2}) - ${mat}`;
          
          piezaInfo.appendChild(nombreStrong);
          piezaInfo.appendChild(restInfo);

          const btnAdd = document.createElement("button");
          btnAdd.className = "ppi-add";
          btnAdd.innerHTML = '<i class="fas fa-plus"></i>';
          btnAdd.style.background = "#28a745";
          btnAdd.style.border = "none";
          btnAdd.style.color = "#fff";
          btnAdd.style.cursor = "pointer";
          btnAdd.style.padding = "3px 8px";
          btnAdd.style.borderRadius = "3px";
          btnAdd.style.fontSize = "10px";

          btnAdd.addEventListener("click", () => {
            window.Cuadricula?.agregarPieza({
              nombre: nom,
              cantidad: qty,
              med1: m1,
              med2: m2,
              material: mat,
              lados: mini,
              modulo: nombreModulo
            });
            // Actualizar panel derecho
            if (window.ActualizarPanelDerecho) {
              window.ActualizarPanelDerecho();
            }
          });

          piezaItem.appendChild(piezaInfo);
          piezaItem.appendChild(btnAdd);
          listaPiezas.appendChild(piezaItem);
        });
      }

      // Evento para desplegar/contraer
      encabezado.addEventListener("click", () => {
        const estaAbierto = listaPiezas.style.display !== "none";
        listaPiezas.style.display = estaAbierto ? "none" : "block";
        flecha.style.transform = estaAbierto ? "rotate(0deg)" : "rotate(-90deg)";
      });

      moduloBox.appendChild(encabezado);
      moduloBox.appendChild(listaPiezas);
      contenedor.appendChild(moduloBox);
    });
  }

  // -------------------------
  // Abrir / Cerrar popup
  // -------------------------
  function abrirPopup() {
    popupDibujo.style.display = "flex";
    cargarPanelIzquierdoPopup();
  }

  function cerrarPopup() {
    popupDibujo.style.display = "none";
  }

  btnDibujar.addEventListener("click", abrirPopup);
  popupCerrar.addEventListener("click", cerrarPopup);
  popupDibujo.addEventListener("click", e => { if(e.target === popupDibujo) cerrarPopup(); });

});
