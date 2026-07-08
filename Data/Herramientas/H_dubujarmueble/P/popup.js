/* popup.js - manejo robusto abrir/cerrar popup y cargar lista */
document.addEventListener("DOMContentLoaded", () => {

  const btnDibujar = document.getElementById("dibujarMueble");
  const popupDibujo = document.getElementById("popup-dibujo");
  // defensivo: puede no existir si el HTML cambió
  const popupCerrar = popupDibujo ? popupDibujo.querySelector(".popup-close") : null;

  if (!btnDibujar) {
    console.warn("popup.js: no se encontró #dibujarMueble en el DOM");
    return;
  }
  if (!popupDibujo) {
    console.warn("popup.js: no se encontró #popup-dibujo en el DOM");
    return;
  }
  if (!popupCerrar) {
    console.warn("popup.js: no se encontró .popup-close dentro de #popup-dibujo");
    // seguimos igual, solo el cierre por botón no se podrá usar
  }

  // función para abrir popup (usa clase .show si existe CSS)
  function abrirPopup() {
  popupDibujo.classList.add("show");
  popupDibujo.style.display = "flex";
  document.body.classList.add("popup-open"); // 🔒 bloquear scroll fondo

  // Auto-mostrar piezas si se cargó un proyecto con dibujos
  if (window.shouldAutoShowPiezas) {
    const gridArea = document.getElementById('gridArea');
    if (gridArea) {
      console.log('🎨 Auto-mostrando piezas cargadas...');
      gridArea.style.display = 'grid';
      gridArea.querySelectorAll('.pieza-dibujada').forEach(pieza => {
        pieza.style.display = 'flex';
      });
    }
    window.shouldAutoShowPiezas = false; // Solo una vez
    console.log('✓ shouldAutoShowPiezas desactivado');
  }

  if (typeof cargarPanelIzquierdoPopup === "function") {
    try { cargarPanelIzquierdoPopup(); } catch (err) { console.error(err); }
  }
}

function cerrarPopup() {
  popupDibujo.classList.remove("show");
  popupDibujo.style.display = "none";
  document.body.classList.remove("popup-open"); // 🔓 permitir scroll otra vez
}


  // Listener seguro
  btnDibujar.addEventListener("click", (e) => {
    e.preventDefault();
    abrirPopup();
  });

  if (popupCerrar) {
    popupCerrar.addEventListener("click", () => cerrarPopup());
  }

  // click fuera para cerrar
  popupDibujo.addEventListener("click", (e) => {
    if (e.target === popupDibujo) cerrarPopup();
  });

  

  console.log("popup.js -> inicializado correctamente");
});
