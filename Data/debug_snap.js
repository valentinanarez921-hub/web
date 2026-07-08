// Debug script para probar snap a líneas
(function() {
  // Interceptar PegarAotrasPiezas para ver si se llama
  const originalPegar = window.PegarAotrasPiezas;
  window.PegarAotrasPiezas = function(pieza) {
    console.log('🔧 PegarAotrasPiezas LLAMADO - pieza:', pieza?.id || pieza?.dataset?.piezaId, 'ModoPegar:', window.ModoPegar);
    const lines = Array.from(document.querySelectorAll('.linea-creada'));
    console.log('🔧 Líneas detectadas:', lines.length, lines.map(l => ({
      p1x: l.getAttribute('data-p1x'),
      p1y: l.getAttribute('data-p1y'),
      p2x: l.getAttribute('data-p2x'),
      p2y: l.getAttribute('data-p2y')
    })));
    return originalPegar.call(this, pieza);
  };
  
  console.log('✅ Debug interceptor instalado');
})();
