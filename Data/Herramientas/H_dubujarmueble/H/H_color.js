// colorear_piezas.js
(function () {

  const botonColor = document.getElementById("tool-color");
  if (!botonColor) return;
  
  // Helpers: convertir hex a rgba
  function hexToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    // si es rgb(...) o rgba(...)
    const rgbMatch = String(hex).match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map(s=>s.trim());
      return { r: parseInt(parts[0])||0, g: parseInt(parts[1])||0, b: parseInt(parts[2])||0 };
    }
    // limpiar '#'
    let h = String(hex).replace('#','').trim();
    if (h.length === 3) h = h.split('').map(c=>c+c).join('');
    if (h.length !== 6) return null;
    return { r: parseInt(h.substr(0,2),16), g: parseInt(h.substr(2,2),16), b: parseInt(h.substr(4,2),16) };
  }

  function rgbToHex(r,g,b){
    return '#'+[r,g,b].map(v=>{ const s = Number(v).toString(16); return s.length===1? '0'+s : s; }).join('');
  }

  function normalizeColorToHex(input) {
    // si ya es hex
    if (!input) return '#ffffff';
    if (String(input).trim().startsWith('#')) return input;
    const m = String(input).match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(s=>s.trim());
      const r = parseInt(parts[0])||0; const g = parseInt(parts[1])||0; const b = parseInt(parts[2])||0;
      return rgbToHex(r,g,b);
    }
    return '#ffffff';
  }

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.style.opacity = "1";
  colorInput.style.display = 'none';
  colorInput.style.position = "absolute";
  colorInput.style.width = "32px";
  colorInput.style.height = "32px";
  colorInput.style.pointerEvents = "auto";
  document.body.appendChild(colorInput);

  let paletaAbierta = false;
  let bloqueoReApertura = false;
  // default alpha for pieces (0..1)
  window.DefaultPieceAlpha = 0.8;

  // Sistema de historial de colores
  const MAX_COLORES_HISTORIAL = 10;
  let coloresHistorial = JSON.parse(localStorage.getItem('coloresHistorial') || '[]');
  
  // Crear menú de colores recientes
  const menuColoresRecientes = document.createElement('div');
  menuColoresRecientes.id = 'menu-colores-recientes';
  menuColoresRecientes.style.position = 'absolute';
  menuColoresRecientes.style.display = 'none';
  menuColoresRecientes.style.flexDirection = 'column';
  menuColoresRecientes.style.background = '#fff';
  menuColoresRecientes.style.border = '1px solid #ccc';
  menuColoresRecientes.style.borderRadius = '6px';
  menuColoresRecientes.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  menuColoresRecientes.style.zIndex = '99999';
  menuColoresRecientes.style.pointerEvents = 'auto';
  menuColoresRecientes.style.padding = '6px';
  menuColoresRecientes.style.gap = '4px';
  menuColoresRecientes.style.minWidth = '20px';
  // Altura mínima para acomodar 10 colores: 10 * 20.2px + 9 gaps * 4px + padding 6px * 2
  menuColoresRecientes.style.minHeight = '240px';
  document.body.appendChild(menuColoresRecientes);

  // Inicializar el menú con los colores guardados
  actualizarMenuColoresRecientes();

  // Función para verificar si hay piezas seleccionadas
  function verificarSeleccion() {
    const piezasSeleccionadas = document.querySelectorAll('.pieza-seleccionada').length > 0;
    
    if (piezasSeleccionadas) {
      botonColor.disabled = false;
      botonColor.style.opacity = '1';
      botonColor.style.cursor = 'pointer';
      botonColor.title = 'Paleta de colores';
    } else {
      botonColor.disabled = true;
      botonColor.style.opacity = '0.5';
      botonColor.style.cursor = 'not-allowed';
      botonColor.title = 'Selecciona al menos una pieza';
      // Si la paleta estaba abierta, cerrarla
      if (paletaAbierta) {
        cerrarPaleta();
      }
    }
  }

  // Verificar selección al cargar
  verificarSeleccion();

  // Observar cambios en el DOM para detectar cambios de selección
  const observer = new MutationObserver(() => {
    verificarSeleccion();
  });

  const gridArea = document.getElementById("gridArea");
  if (gridArea) {
    observer.observe(gridArea, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
  }

  // Agregar color al historial
  function agregarColorAlHistorial(color) {
    // Normalizar el color a hex
    const colorHex = normalizeColorToHex(color);
    
    // Remover si ya existe (para evitar duplicados)
    coloresHistorial = coloresHistorial.filter(c => normalizeColorToHex(c) !== colorHex);
    
    // Agregar al principio
    coloresHistorial.unshift(colorHex);
    
    // Limitar a MAX_COLORES_HISTORIAL
    if (coloresHistorial.length > MAX_COLORES_HISTORIAL) {
      coloresHistorial.pop();
    }
    
    // Guardar en localStorage
    localStorage.setItem('coloresHistorial', JSON.stringify(coloresHistorial));
    
    // Actualizar menú
    actualizarMenuColoresRecientes();
  }

  // Actualizar el menú de colores recientes
  function actualizarMenuColoresRecientes() {
    menuColoresRecientes.innerHTML = '';
    
    if (coloresHistorial.length === 0) {
      // Mostrar placeholder cuando no hay colores
      const placeholder = document.createElement('div');
      placeholder.style.width = '47px';
      placeholder.style.height = '47px';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.color = '#ccc';
      placeholder.style.fontSize = '12px';
      placeholder.style.textAlign = 'center';
      placeholder.style.padding = '5px';
      placeholder.textContent = 'Sin\ncolores';
      menuColoresRecientes.appendChild(placeholder);
      return;
    }
    
    coloresHistorial.forEach(color => {
      const botonColor = document.createElement('button');
      botonColor.style.width = '20.2px';
      botonColor.style.height = '20.2px';
      botonColor.style.border = '1px solid #999';
      botonColor.style.borderRadius = '4px';
      botonColor.style.background = color;
      botonColor.style.cursor = 'pointer';
      botonColor.style.padding = '0';
      botonColor.style.transition = 'transform 0.2s, box-shadow 0.2s';
      botonColor.title = color;
      
      // Hover effect
      botonColor.addEventListener('mouseenter', () => {
        botonColor.style.transform = 'scale(1.1)';
        botonColor.style.boxShadow = '0 0 6px rgba(0,0,0,0.3)';
      });
      
      botonColor.addEventListener('mouseleave', () => {
        botonColor.style.transform = 'scale(1)';
        botonColor.style.boxShadow = 'none';
      });
      
      // Al hacer click en un color reciente, aplicarlo
      botonColor.addEventListener('click', (e) => {
        e.stopPropagation();
        aplicarColor(color);
      });
      
      menuColoresRecientes.appendChild(botonColor);
    });
  }

  // Slider de transparencia movido a H_transparencia.js

  function aplicarColor(color) {
    if (!window.Seleccion || !window.Seleccion.piezas) return;
    const alpha = window.DefaultPieceAlpha || 1;
    window.Seleccion.piezas.forEach(p => {
      // preferimos guardar el hex en dataset para futuras operaciones
      try { p.dataset.colorHex = color; } catch(e){}
      
      // Check if pieza has SVG (edited piece)
      if(p.querySelector('svg path')) {
        // Update SVG color directly - find first path (fill path)
        const paths = p.querySelectorAll('svg path');
        if(paths.length > 0) {
          paths[0].setAttribute('fill', hexToRgba(color, alpha));
        }
        const svgParent = p.querySelector('svg');
        if(svgParent) svgParent.style.opacity = alpha;
        // Also call global update if available
        if(window.updateSvgPieceColor) {
          window.updateSvgPieceColor(p, hexToRgba(color, alpha), alpha);
        }
      }
      // Si la pieza es texto, aplicamos color al contenido textual
      else if (p.classList.contains('pieza-texto')) {
        const texto = p.querySelector('.texto-contenido');
        if (texto) {
          try { texto.dataset.colorHex = color; } catch(e){}
          texto.style.color = hexToRgba(color, alpha);
        } else {
          // fallback al color del elemento si no encuentra el span
          p.style.color = hexToRgba(color, alpha);
        }
      }
      // Normal piece: update background
      else {
        p.style.background = hexToRgba(color, alpha);
      }
    });
  }

  colorInput.addEventListener("input", (e) => {
    // al cambiar color, aplicar al seleccionado con el alpha actual
    aplicarColor(e.target.value);
  });

  // Función para cerrar la paleta
  function cerrarPaleta() {
    paletaAbierta = false;
    colorInput.style.display = 'none';
    menuColoresRecientes.style.display = 'none';
    botonColor.classList.remove('activo');
    
    // Permitir movimiento de piezas nuevamente
    window._bloquearMovimientoPiezas = false;
  }

  // Detectar cuando se cierra la paleta nativa (sin interacción del usuario)
  colorInput.addEventListener("change", (e) => {
    // Guardar color al historial
    if (e.target.value) {
      agregarColorAlHistorial(e.target.value);
    }
    // La paleta se cerró, desactivar el botón
    cerrarPaleta();
  });

  // Detectar cuando se cierra la paleta nativa sin cambiar color (ej: presionar Escape)
  colorInput.addEventListener("cancel", (e) => {
    cerrarPaleta();
  });

  // Detectar cuando la ventana pierde el foco (ej: tocando barra de Windows)
  window.addEventListener("blur", (e) => {
    if (paletaAbierta) {
      cerrarPaleta();
    }
  });

  // Detectar click derecho para cerrar la paleta
  document.addEventListener("contextmenu", (e) => {
    if (paletaAbierta) {
      cerrarPaleta();
    }
  });

  // Detectar cuando se activa pointer lock (pan/movimiento de cuadrícula)
  document.addEventListener("pointerlockchange", (e) => {
    if (paletaAbierta) {
      cerrarPaleta();
    }
  });

  // Detectar clicks fuera de la paleta para cerrarla
  document.addEventListener("click", (e) => {
    if (paletaAbierta && e.target !== botonColor && e.target !== colorInput && !botonColor.contains(e.target) && !colorInput.contains(e.target) && !menuColoresRecientes.contains(e.target)) {
      cerrarPaleta();
    }
  });

  // Detectar zoom/wheel para cerrar la paleta
  document.addEventListener("wheel", (e) => {
    if (paletaAbierta) {
      cerrarPaleta();
    }
  }, { passive: true });

  // Detectar clicks en el gridArea para cerrar la paleta
  if (gridArea) {
    gridArea.addEventListener("mousedown", (e) => {
      if (paletaAbierta) {
        cerrarPaleta();
      }
    }, true);
  }

  // mantenemos la paleta abierta/visible controlada por el botón

  // Usamos pointerdown en vez de click para evitar el re-open al soltar el mouse
  botonColor.addEventListener("pointerdown", (e) => {
    // evita comportamientos por defecto que puedan interferir (opcional)
    e.preventDefault();

    // No hacer nada si el botón está deshabilitado
    if (botonColor.disabled || bloqueoReApertura) return;

    const rect = botonColor.getBoundingClientRect();
    colorInput.style.left = rect.left + "px";
    colorInput.style.top = (rect.bottom + 8) + "px";

    if (!paletaAbierta) {
      paletaAbierta = true;
      colorInput.style.display = 'block';
      botonColor.classList.add('activo');
      
      // Mostrar el menú de colores recientes a la derecha
      menuColoresRecientes.style.display = 'flex';
      menuColoresRecientes.style.left = (rect.left + rect.width + 193) + "px";
      menuColoresRecientes.style.top = (rect.bottom + 8) + "px";
      
      // Bloquear movimiento de piezas, pero permitir selección
      window._bloquearMovimientoPiezas = true;
      
      // intentar abrir la paleta nativa
      try {
        setTimeout(() => { colorInput.click(); }, 0);
      } catch(e) {}
      // breve bloqueo para evitar re-open accidental
      bloqueoReApertura = true;
      setTimeout(() => { bloqueoReApertura = false; }, 150);
    } else {
      paletaAbierta = false;
      colorInput.style.display = 'none';
      menuColoresRecientes.style.display = 'none';
      botonColor.classList.remove('activo');
      
      // Permitir movimiento de piezas nuevamente
      window._bloquearMovimientoPiezas = false;
      
      bloqueoReApertura = true;
      setTimeout(() => { bloqueoReApertura = false; }, 150);
    }
  });

  // adicional: si querés que clicks con la rueda/doble toque no causen problemas,
  // podés bloquear también el evento click por seguridad:
  botonColor.addEventListener("click", (e) => {
    // impedir que el click estándar interfiera con pointerdown toggle
    e.preventDefault();
  });


  // El slider de transparencia ahora se gestiona en H_transparencia.js
})();
