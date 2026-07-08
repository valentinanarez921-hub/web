// papelera.js
(function () {
  const btnDelete = document.getElementById("tool-delete");
  if (!btnDelete) return;

  btnDelete.addEventListener("click", () => {
    // Primero, permitir que CrearLinea borre su selección si existe
    try {
      if (
        window.CrearLinea &&
        typeof window.CrearLinea.eliminarSeleccion === "function"
      ) {
        window.CrearLinea.eliminarSeleccion();
      }
    } catch (e) {}

    if (!window.Seleccion || !window.Seleccion.piezas) return;

    // eliminamos todas las piezas seleccionadas (incluye líneas si fueron añadidas a Seleccion)
    window.Seleccion.piezas.forEach((p) => {
      if (p.parentElement) p.parentElement.removeChild(p);
    });

    // limpiamos la selección
    window.Seleccion.limpiar();

    if (
      window.Cuadricula &&
      typeof window.Cuadricula.normalizeZIndices === "function"
    ) {
      window.Cuadricula.normalizeZIndices();
    }

    // actualizar la cuadricula visualmente
    if (window.Cuadricula?.actualizarPiezas) {
      window.Cuadricula.actualizarPiezas();
    }

    // Actualizar panel derecho
    if (window.ActualizarPanelDerecho) {
      window.ActualizarPanelDerecho();
    }
  });
})();
