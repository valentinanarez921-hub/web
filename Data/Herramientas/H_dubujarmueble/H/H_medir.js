// H_medir.js - v2.0
// Sistema de medición con panel integrado
(function () {

    // Protección: si ya se ejecutó, no hacer nada
    if (window._medirLoaded) return;
    window._medirLoaded = true;

    console.log("H_medir cargado.");

    // Obtener botón de medir del HTML
    let botonMedir = document.getElementById('tool-medir');
    if (!botonMedir) {
        console.error("Botón tool-medir no encontrado en el HTML");
        return;
    }

    console.log("Botón medir encontrado:", botonMedir);

    // Estado de opciones activas
    let opcionesActivas = {};
    let midiendo = false;
    let puntosSeleccionados = [];
    const mediciones = []; // Array para almacenar todas las mediciones
    let esquinaIndicadorActual = null; // Guardar esquina cercana actual para recalcular en zoom
    let actualizarMedicionesAnimate = null; // Para rastrear el animationFrame

    // Opciones de medición
    const opcionesMedida = [
        { label: '📍 Medir Puntos', valor: 'puntos', descripcion: 'Click de punta a punta' },
        { label: '📏 Medir Borde', valor: 'borde', descripcion: 'De borde a borde' },
        { label: '✏️ Medir Libre', valor: 'libre', descripcion: 'Línea libre' }
    ];

    // Inicializar estado
    opcionesMedida.forEach(op => {
        opcionesActivas[op.valor] = false;
    });

    // Helper: obtener escala y offset del Grid (igual que en piezas_cuadricula.js)
    function getScale() { 
        return window.Grid?.scale() || 1; 
    }
    function getOffset() { 
        return window.Grid?.offset() || { x: 0, y: 0 }; 
    }

    // Helper: convertir coordenadas de grid a píxeles (igual que en piezas_cuadricula.js)
    function gridToPixel(x, y) {
        const scale = getScale();
        const offset = getOffset();
        return {
            x: x * scale + offset.x,
            y: y * scale + offset.y
        };
    }

    // Helper: convertir coordenadas de píxeles a grid (inverso de gridToPixel)
    function pixelToGrid(screenX, screenY, gridArea) {
        const rect = gridArea.getBoundingClientRect();
        const scale = getScale();
        const offset = getOffset();
        return {
            x: (screenX - rect.left - offset.x) / scale,
            y: (screenY - rect.top - offset.y) / scale
        };
    }

    // Inicializar con el primer modo de medición (Medir Puntos)
    opcionesActivas['puntos'] = false; // comenzar desactivado

    // Crear capa para las mediciones (SVG)
    let svgMediciones = document.getElementById('svg-mediciones');
    if (!svgMediciones) {
        svgMediciones = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgMediciones.id = 'svg-mediciones';
        svgMediciones.style.position = 'absolute';
        svgMediciones.style.top = '0';
        svgMediciones.style.left = '0';
        svgMediciones.style.width = '100%';
        svgMediciones.style.height = '100%';
        svgMediciones.style.pointerEvents = 'none';
        svgMediciones.style.zIndex = '50';
        svgMediciones.style.overflow = 'visible';
        
        const gridArea = document.getElementById('gridArea');
        if (gridArea) {
            gridArea.style.position = 'relative';
            gridArea.appendChild(svgMediciones);
            
            // Crear contenedor de transformación para el SVG (para manejar offset y zoom)
            const svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            svgGroup.id = 'svg-mediciones-group';
            svgMediciones.appendChild(svgGroup);
        }
    }
    function obtenerPuntos(pieza) {
        const x = parseFloat(pieza.dataset.x) || 0;
        const y = parseFloat(pieza.dataset.y) || 0;
        const w = parseFloat(pieza.dataset.w) || 1;
        const h = parseFloat(pieza.dataset.h) || 1;
        let rotation = parseFloat(pieza.dataset.rotation) || 0;
        
        rotation = ((rotation % 360) + 360) % 360;
        
        const cx = x + w / 2;
        const cy = y + h / 2;
        
        if (rotation === 0 || Math.abs(rotation) < 0.001) {
            return [
                { x: x, y: y, tipo: 'esquina' },
                { x: x + w, y: y, tipo: 'esquina' },
                { x: x, y: y + h, tipo: 'esquina' },
                { x: x + w, y: y + h, tipo: 'esquina' }
            ];
        }
        
        const rad = rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const rotar = (px, py) => {
            const dx = px - cx;
            const dy = py - cy;
            return {
                x: cx + dx * cos - dy * sin,
                y: cy + dx * sin + dy * cos
            };
        };
        
        return [
            rotar(x, y),
            rotar(x + w, y),
            rotar(x, y + h),
            rotar(x + w, y + h)
        ].map(p => ({ ...p, tipo: 'esquina' }));
    }

    // CAMBIAR MODO DE MEDICIÓN
    function cambiarModo() {
        console.log('Modo de medición actualizado:', opcionesActivas);
        
        // Verificar si alguna opción está activa
        const algunaActiva = Object.values(opcionesActivas).some(v => v);
        midiendo = algunaActiva;
        puntosSeleccionados = [];
        
        if (midiendo) {
            // Desactivar selección de piezas cuando entra en modo medir
            if (window.ToggleSelection) {
                window.ToggleSelection.desactivar();
            }
            
            crearIndicador();
            setupListenersMedicion();
        } else {
            removeListenersMedicion();
            limpiarMediciones();
            limpiarPuntosTemporal();
            
            // Reactivar selección de piezas cuando sale del modo medir
            if (window.ToggleSelection) {
                window.ToggleSelection.activar();
            }
        }
    }

    // LÓGICA: Medir Puntos (de punta a punta automático)
    function iniciarMedidaPuntos(punto1, punto2) {
        const distancia = Math.sqrt(
            Math.pow(punto2.x - punto1.x, 2) + 
            Math.pow(punto2.y - punto1.y, 2)
        );
        
        dibujarLinea(punto1, punto2, distancia, '#0080ff');
        return distancia;
    }

    // LÓGICA: Medir Borde (de borde a borde)
    function iniciarMedidaBorde(punto1, punto2) {
        const distancia = Math.sqrt(
            Math.pow(punto2.x - punto1.x, 2) + 
            Math.pow(punto2.y - punto1.y, 2)
        );
        
        dibujarLinea(punto1, punto2, distancia, '#ff9800');
        return distancia;
    }

    // LÓGICA: Medir Libre (línea libre del usuario)
    function iniciarMedidaLibre(punto1, punto2) {
        const distancia = Math.sqrt(
            Math.pow(punto2.x - punto1.x, 2) + 
            Math.pow(punto2.y - punto1.y, 2)
        );
        
        dibujarLinea(punto1, punto2, distancia, '#4caf50');
        return distancia;
    }

    // Dibujar línea de medición
    function dibujarLinea(p1, p2, distancia, color) {
        // Convertir de grid a píxeles (igual que las piezas)
        const pos1 = gridToPixel(p1.x, p1.y);
        const pos2 = gridToPixel(p2.x, p2.y);
        
        // Crear grupo para la medición
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Guardar datos originales en grid para poder recalcular en zoom
        g.setAttribute('data-p1x', p1.x);
        g.setAttribute('data-p1y', p1.y);
        g.setAttribute('data-p2x', p2.x);
        g.setAttribute('data-p2y', p2.y);
        g.setAttribute('data-color', color);
        g.setAttribute('data-distancia', distancia.toFixed(2));
        
        // Línea
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', pos1.x);
        line.setAttribute('y1', pos1.y);
        line.setAttribute('x2', pos2.x);
        line.setAttribute('y2', pos2.y);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '6 4');
        line.setAttribute('opacity', '0.8');
        g.appendChild(line);
        
        // Puntos
        const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle1.setAttribute('cx', pos1.x);
        circle1.setAttribute('cy', pos1.y);
        circle1.setAttribute('r', '3');
        circle1.setAttribute('fill', color);
        g.appendChild(circle1);
        
        const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle2.setAttribute('cx', pos2.x);
        circle2.setAttribute('cy', pos2.y);
        circle2.setAttribute('r', '3');
        circle2.setAttribute('fill', color);
        g.appendChild(circle2);
        
        // Texto con distancia
        const midX = (pos1.x + pos2.x) / 2;
        const midY = (pos1.y + pos2.y) / 2;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY - 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', color);
        text.setAttribute('font-size', '12px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('background', 'white');
        text.textContent = `${distancia.toFixed(2)}`;
        g.appendChild(text);
        
        // Añadir al grupo del SVG (no directamente al SVG)
        const svgGroup = document.getElementById('svg-mediciones-group');
        if (svgGroup) {
            svgGroup.appendChild(g);
        } else {
            svgMediciones.appendChild(g);
        }
        mediciones.push(g);
    }

    // Limpiar todas las mediciones
    function limpiarMediciones() {
        mediciones.forEach(m => m.remove());
        mediciones.length = 0;
    }

    // Eliminar una medición específica
    function eliminarMedicion(grupoMedicion) {
        grupoMedicion.remove();
        const idx = mediciones.indexOf(grupoMedicion);
        if (idx > -1) {
            mediciones.splice(idx, 1);
        }
    }

    // Manejador de click derecho para eliminar mediciones
    function handleContextMenuMedicion(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Obtener el elemento clickeado
        let elemento = e.target;
        let grupoMedicion = null;
        
        // Buscar si es parte de una medición (grupo)
        while (elemento && elemento !== svgMediciones) {
            // Verificar si es un grupo de medición (contiene data-p1x)
            if (elemento.hasAttribute && elemento.hasAttribute('data-p1x')) {
                grupoMedicion = elemento;
                break;
            }
            elemento = elemento.parentElement;
        }
        
        // Si encontramos una medición, eliminarla
        if (grupoMedicion) {
            eliminarMedicion(grupoMedicion);
            console.log('Medición eliminada');
        }
    }

    // Setup listeners de medición
    function setupListenersMedicion() {
        const gridArea = document.getElementById('gridArea');
        if (gridArea) {
            gridArea.addEventListener('click', handleClickMedicion);
            gridArea.addEventListener('mousemove', handleMouseMoveMedicion);
            gridArea.addEventListener('mouseleave', handleMouseLeaveMedicion);
            // Agregar listener de zoom para recalcular indicador
            gridArea.addEventListener('wheel', handleZoomMedicion, true);
        }
        
        // Agregar listener de click derecho para eliminar mediciones
        if (svgMediciones) {
            svgMediciones.addEventListener('contextmenu', handleContextMenuMedicion);
        }
        
        // Actualizar mediciones continuamente (cada frame) para seguir los cambios de offset/zoom
        actualizarMedicionesAnimate = requestAnimationFrame(actualizarMedicionesFrame);
    }

    // Remove listeners de medición
    function removeListenersMedicion() {
        const gridArea = document.getElementById('gridArea');
        if (gridArea) {
            gridArea.removeEventListener('click', handleClickMedicion);
            gridArea.removeEventListener('mousemove', handleMouseMoveMedicion);
            gridArea.removeEventListener('mouseleave', handleMouseLeaveMedicion);
            gridArea.removeEventListener('wheel', handleZoomMedicion, true);
        }
        
        // Remover listener de click derecho
        if (svgMediciones) {
            svgMediciones.removeEventListener('contextmenu', handleContextMenuMedicion);
        }
        
        // Detener actualización continua
        if (actualizarMedicionesAnimate) {
            cancelAnimationFrame(actualizarMedicionesAnimate);
            actualizarMedicionesAnimate = null;
        }
    }

    // Actualizar posiciones de mediciones cada frame (para seguir zoom/pan)
    function actualizarMedicionesFrame() {
        if (midiendo) {
            recalcularMediciones();
            actualizarMedicionesAnimate = requestAnimationFrame(actualizarMedicionesFrame);
        }
    }

    // Crear indicador visual
    function crearIndicador() {
        if (document.getElementById('medir-snap-indicator')) return;
        
        const gridArea = document.getElementById('gridArea');
        if (!gridArea) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'medir-snap-indicator';
        indicator.style.position = 'absolute';
        indicator.style.width = '12px';
        indicator.style.height = '12px';
        indicator.style.background = '#0080ff';
        indicator.style.border = '2px solid white';
        indicator.style.borderRadius = '50%';
        indicator.style.boxShadow = '0 0 4px #0080ff';
        indicator.style.display = 'none';
        indicator.style.zIndex = '100';
        indicator.style.pointerEvents = 'none';
        indicator.style.transform = 'translate(-50%, -50%)';
        gridArea.appendChild(indicator);
    }

    // Obtener todas las esquinas de todas las piezas
    function obtenerTodasLasEsquinas() {
        const esquinas = [];
        const piezas = document.querySelectorAll('.pieza-dibujada');
        
        console.log('Total de piezas encontradas:', piezas.length);
        
        piezas.forEach((pieza, idx) => {
            const puntos = obtenerPuntos(pieza);
            console.log(`Pieza ${idx} (${pieza.id}):`, puntos);
            puntos.forEach(punto => {
                esquinas.push({
                    x: punto.x,
                    y: punto.y,
                    piezaId: pieza.id
                });
            });
        });
        
        console.log('Total esquinas detectadas:', esquinas.length);
        return esquinas;
    }

    // Handle mouse move para detectar esquinas cercanas
    function handleMouseMoveMedicion(e) {
        if (!midiendo) return;
        
        const gridArea = document.getElementById('gridArea');
        const indicator = document.getElementById('medir-snap-indicator');
        
        if (!gridArea || !indicator) return;
        
        // Convertir coordenadas de pantalla a grid
        const posGrid = pixelToGrid(e.clientX, e.clientY, gridArea);
        const px = posGrid.x;
        const py = posGrid.y;
        
        const tolerancia = 2.5; // Tolerancia en unidades de grid
        const esquinas = obtenerTodasLasEsquinas();
        
        // Buscar esquina más cercana dentro de la tolerancia
        let esquinaCercana = null;
        let distanciaMin = tolerancia;
        
        esquinas.forEach(esquina => {
            const distancia = Math.sqrt(
                Math.pow(esquina.x - px, 2) + 
                Math.pow(esquina.y - py, 2)
            );
            
            if (distancia < distanciaMin) {
                distanciaMin = distancia;
                esquinaCercana = esquina;
            }
        });
        
        // Mostrar o esconder indicador
        if (esquinaCercana) {
            // Guardar la esquina actual para poder recalcularla si hay zoom
            esquinaIndicadorActual = esquinaCercana;
            
            // Convertir esquina de grid a píxeles (igual que las piezas)
            const pos = gridToPixel(esquinaCercana.x, esquinaCercana.y);
            indicator.style.left = pos.x + 'px';
            indicator.style.top = pos.y + 'px';
            indicator.style.display = 'block';
        } else {
            esquinaIndicadorActual = null;
            indicator.style.display = 'none';
        }
    }

    // Handle mouse leave para esconder indicador
    function handleMouseLeaveMedicion(e) {
        esquinaIndicadorActual = null;
        const indicator = document.getElementById('medir-snap-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Handle click para medición CON SNAP automático
    function handleClickMedicion(e) {
        if (!midiendo) return;
        
        const gridArea = document.getElementById('gridArea');
        
        // Convertir coordenadas de pantalla a grid
        const posGrid = pixelToGrid(e.clientX, e.clientY, gridArea);
        const px = posGrid.x;
        const py = posGrid.y;
        
        const tolerancia = 2.5; // Tolerancia para enganchar - AUMENTADA
        const esquinas = obtenerTodasLasEsquinas();
        
        // Buscar esquina más cercana dentro de la tolerancia
        let esquinaCercana = null;
        let distanciaMin = tolerancia;
        
        esquinas.forEach(esquina => {
            const distancia = Math.sqrt(
                Math.pow(esquina.x - px, 2) + 
                Math.pow(esquina.y - py, 2)
            );
            
            if (distancia < distanciaMin) {
                distanciaMin = distancia;
                esquinaCercana = esquina;
            }
        });
        
        // Si encontró esquina cercana, usarla; sino, usar click directo
        const puntoFinal = esquinaCercana || { x: px, y: py };
        
        puntosSeleccionados.push(puntoFinal);
        
        // Dibujar punto de selección temporal
        dibujarPuntoTemporal(puntoFinal);
        
        // Si tenemos 2 puntos, realizar medición
        if (puntosSeleccionados.length === 2) {
            const p1 = puntosSeleccionados[0];
            const p2 = puntosSeleccionados[1];
            
            // Ejecutar los modos activos
            if (opcionesActivas.puntos) {
                iniciarMedidaPuntos(p1, p2);
            }
            if (opcionesActivas.borde) {
                iniciarMedidaBorde(p1, p2);
            }
            if (opcionesActivas.libre) {
                iniciarMedidaLibre(p1, p2);
            }
            
            // Resetear para nueva medición
            puntosSeleccionados = [];
            limpiarPuntosTemporal();
        }
    }

    // Handle zoom para recalcular posición del indicador y mediciones
    function handleZoomMedicion(e) {
        if (!midiendo) return;
        
        // Esperar un frame para que el Grid haya actualizado escala y offset
        requestAnimationFrame(() => {
            const indicator = document.getElementById('medir-snap-indicator');
            
            // Recalcular indicador
            if (indicator && indicator.style.display === 'block' && esquinaIndicadorActual) {
                const pos = gridToPixel(esquinaIndicadorActual.x, esquinaIndicadorActual.y);
                indicator.style.left = pos.x + 'px';
                indicator.style.top = pos.y + 'px';
            }
            
            // Recalcular todas las mediciones con la nueva escala
            recalcularMediciones();
        });
    }

    // Dibujar punto temporal de selección
    function dibujarPuntoTemporal(punto) {
        // Convertir de grid a píxeles (igual que las piezas)
        const pos = gridToPixel(punto.x, punto.y);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pos.x);
        circle.setAttribute('cy', pos.y);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#0080ff');
        circle.setAttribute('class', 'punto-temporal-medicion');
        circle.setAttribute('opacity', '0.6');
        // Guardar coordenadas en grid para recalcular en zoom
        circle.setAttribute('data-gx', punto.x);
        circle.setAttribute('data-gy', punto.y);
        
        const svgGroup = document.getElementById('svg-mediciones-group');
        if (svgGroup) {
            svgGroup.appendChild(circle);
        } else {
            svgMediciones.appendChild(circle);
        }
    }

    // Limpiar puntos temporales
    function limpiarPuntosTemporal() {
        const puntos = svgMediciones.querySelectorAll('.punto-temporal-medicion');
        puntos.forEach(p => p.remove());
        
        // También limpiar del grupo si existe
        const svgGroup = document.getElementById('svg-mediciones-group');
        if (svgGroup) {
            const puntosGrupo = svgGroup.querySelectorAll('.punto-temporal-medicion');
            puntosGrupo.forEach(p => p.remove());
        }
    }

    // Recalcular posiciones de todas las mediciones (para zoom)
    function recalcularMediciones() {
        // Recalcular mediciones guardadas
        mediciones.forEach(g => {
            const p1x = parseFloat(g.getAttribute('data-p1x'));
            const p1y = parseFloat(g.getAttribute('data-p1y'));
            const p2x = parseFloat(g.getAttribute('data-p2x'));
            const p2y = parseFloat(g.getAttribute('data-p2y'));
            const color = g.getAttribute('data-color');
            const distancia = g.getAttribute('data-distancia');
            
            if (!isNaN(p1x) && !isNaN(p1y) && !isNaN(p2x) && !isNaN(p2y)) {
                // Convertir grid a píxeles con la nueva escala/offset
                const pos1 = gridToPixel(p1x, p1y);
                const pos2 = gridToPixel(p2x, p2y);
                
                // Actualizar línea
                const line = g.querySelector('line');
                if (line) {
                    line.setAttribute('x1', pos1.x);
                    line.setAttribute('y1', pos1.y);
                    line.setAttribute('x2', pos2.x);
                    line.setAttribute('y2', pos2.y);
                }
                
                // Actualizar círculos
                const circles = g.querySelectorAll('circle');
                if (circles[0]) {
                    circles[0].setAttribute('cx', pos1.x);
                    circles[0].setAttribute('cy', pos1.y);
                }
                if (circles[1]) {
                    circles[1].setAttribute('cx', pos2.x);
                    circles[1].setAttribute('cy', pos2.y);
                }
                
                // Actualizar texto
                const text = g.querySelector('text');
                if (text) {
                    const midX = (pos1.x + pos2.x) / 2;
                    const midY = (pos1.y + pos2.y) / 2;
                    text.setAttribute('x', midX);
                    text.setAttribute('y', midY - 5);
                }
            }
        });
        
        // Recalcular puntos temporales
        const puntosTemporales = svgMediciones.querySelectorAll('.punto-temporal-medicion');
        puntosTemporales.forEach(circle => {
            const gx = parseFloat(circle.getAttribute('data-gx'));
            const gy = parseFloat(circle.getAttribute('data-gy'));
            if (!isNaN(gx) && !isNaN(gy)) {
                const pos = gridToPixel(gx, gy);
                circle.setAttribute('cx', pos.x);
                circle.setAttribute('cy', pos.y);
            }
        });
    }

    // Toggle del botón de medición (activar/desactivar)
    botonMedir.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Alternar el estado de medición
        const midiendoActualmente = Object.values(opcionesActivas).some(v => v);
        
        if (!midiendoActualmente) {
            // Activar modo de medición (Medir Puntos por defecto)
            opcionesActivas['puntos'] = true;
            botonMedir.classList.add('activo');
        } else {
            // Desactivar modo de medición
            opcionesActivas['puntos'] = false;
            botonMedir.classList.remove('activo');
        }
        
        cambiarModo();
    });

    // Exponer funciones globales
    window.Medir = {
        activar: (modo) => {
            opcionesActivas[modo] = true;
            cambiarModo();
        },
        desactivar: (modo) => {
            opcionesActivas[modo] = false;
        },
        limpiar: limpiarMediciones,
        getActivos: () => opcionesActivas
    };

})();
