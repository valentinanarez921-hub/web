/* guardar_datos.js - Funciones para guardar y cargar toda la plantilla (A4 + Dibujo) */

(function () {
  
  /**
   * Guarda los datos del dibujo (todas las piezas dibujadas)
   */
  function guardarDibujoMueble() {
    const gridArea = document.getElementById('gridArea');
    if (!gridArea) {
      console.warn('guardar_datos.js: No se encontró gridArea');
      return { piezas: [] };
    }

    const piezas = [];
    const todasLasPiezas = gridArea.querySelectorAll('.pieza-dibujada');

    todasLasPiezas.forEach(pieza => {
      const piezaData = {
        id: pieza.id,
        x: parseFloat(pieza.dataset.x) || 0,
        y: parseFloat(pieza.dataset.y) || 0,
        width: parseFloat(pieza.dataset.width) || parseFloat(pieza.style.width) || 100,
        height: parseFloat(pieza.dataset.height) || parseFloat(pieza.style.height) || 100,
        rotacion: parseFloat(pieza.dataset.rotacion) || 0,
        color: pieza.dataset.color || '',
        className: pieza.className,
        innerHTML: pieza.innerHTML,
        style: {
          width: pieza.style.width,
          height: pieza.style.height,
          transform: pieza.style.transform,
          backgroundColor: pieza.style.backgroundColor,
          borderRadius: pieza.style.borderRadius,
          opacity: pieza.style.opacity,
          zIndex: pieza.style.zIndex
        },
        // Guardar todos los dataset (propiedades data-*)
        dataset: {}
      };

      // Guardar todos los atributos data-*
      for (let [key, value] of Object.entries(pieza.dataset)) {
        piezaData.dataset[key] = value;
      }

      // Guardar todos los atributos del elemento
      for (let attr of pieza.attributes) {
        if (attr.name.startsWith('data-')) {
          piezaData.dataset[attr.name.substring(5)] = attr.value;
        }
      }

      piezas.push(piezaData);
    });

    const dibujoData = {
      timestamp: Date.now(),
      piezas: piezas,
      cantidadPiezas: piezas.length
    };

    localStorage.setItem('datosPlantillaDrawing', JSON.stringify(dibujoData));
    return dibujoData;
  }

  /**
   * Carga los datos del dibujo desde localStorage
   */
  function cargarDibujoMueble() {
    const gridArea = document.getElementById('gridArea');
    if (!gridArea) {
      console.warn('guardar_datos.js: No se encontró gridArea al cargar');
      return null;
    }

    const datosStr = localStorage.getItem('datosPlantillaDrawing');
    if (!datosStr) {
      console.warn('No hay datos de dibujo guardados para cargar');
      return null;
    }

    try {
      const dibujoData = JSON.parse(datosStr);
      
      // Limpiar piezas existentes
      gridArea.querySelectorAll('.pieza-dibujada').forEach(p => p.remove());

      // Recrear cada pieza
      for (const piezaData of dibujoData.piezas) {
        const pieza = document.createElement('div');
        pieza.className = piezaData.className;
        pieza.id = piezaData.id;
        pieza.innerHTML = piezaData.innerHTML;
        pieza.style.position = 'absolute';

        // Restaurar posición
        pieza.dataset.x = piezaData.x;
        pieza.dataset.y = piezaData.y;
        pieza.style.left = piezaData.x + 'px';
        pieza.style.top = piezaData.y + 'px';

        // Restaurar dimensiones
        if (piezaData.style.width) pieza.style.width = piezaData.style.width;
        if (piezaData.style.height) pieza.style.height = piezaData.style.height;

        // Restaurar transformaciones
        if (piezaData.style.transform) pieza.style.transform = piezaData.style.transform;
        if (piezaData.style.backgroundColor) pieza.style.backgroundColor = piezaData.style.backgroundColor;
        if (piezaData.style.borderRadius) pieza.style.borderRadius = piezaData.style.borderRadius;
        if (piezaData.style.opacity) pieza.style.opacity = piezaData.style.opacity;
        if (piezaData.style.zIndex) pieza.style.zIndex = piezaData.style.zIndex;

        // Restaurar dataset
        for (const [key, value] of Object.entries(piezaData.dataset)) {
          pieza.dataset[key] = value;
        }

        // Agregar al gridArea
        gridArea.appendChild(pieza);
      }

      return dibujoData;
    } catch (err) {
      console.error('Error al cargar datos de dibujo:', err);
      return null;
    }
  }

  /**
   * Guarda todos los datos (A4 + Dibujo)
   */
  function guardarTodosLosDatos() {
    const resultado = {
      timestamp: Date.now(),
      a4: null,
      dibujo: null,
      mensajes: []
    };

    // Guardar datos A4
    if (window.__miPlantilla && typeof window.__miPlantilla.guardarDatosA4 === 'function') {
      try {
        resultado.a4 = window.__miPlantilla.guardarDatosA4();
        resultado.mensajes.push('✓ Datos A4 guardados');
      } catch (err) {
        console.error('Error guardando A4:', err);
        resultado.mensajes.push('✗ Error guardando A4: ' + err.message);
      }
    } else {
      resultado.mensajes.push('⚠ No se encontró función de guardado A4');
    }

    // Guardar datos del dibujo
    try {
      resultado.dibujo = guardarDibujoMueble();
      resultado.mensajes.push('✓ Dibujo guardado (' + resultado.dibujo.piezas.length + ' piezas)');
    } catch (err) {
      console.error('Error guardando dibujo:', err);
      resultado.mensajes.push('✗ Error guardando dibujo: ' + err.message);
    }

    // Guardar resumen en localStorage
    localStorage.setItem('datosPlantillaResumen', JSON.stringify({
      timestamp: resultado.timestamp,
      modulosA4: resultado.a4 ? resultado.a4.modulos.length : 0,
      piezasDibujo: resultado.dibujo ? resultado.dibujo.piezas.length : 0,
      mensajes: resultado.mensajes
    }));

    return resultado;
  }

  /**
   * Carga todos los datos (A4 + Dibujo)
   */
  function cargarTodosLosDatos() {
    const resultado = {
      timestamp: Date.now(),
      a4: null,
      dibujo: null,
      mensajes: []
    };

    // Cargar datos A4
    if (window.__miPlantilla && typeof window.__miPlantilla.cargarDatosA4 === 'function') {
      try {
        resultado.a4 = window.__miPlantilla.cargarDatosA4();
        if (resultado.a4) {
          resultado.mensajes.push('✓ Datos A4 cargados');
        } else {
          resultado.mensajes.push('⚠ No hay datos A4 guardados');
        }
      } catch (err) {
        console.error('Error cargando A4:', err);
        resultado.mensajes.push('✗ Error cargando A4: ' + err.message);
      }
    } else {
      resultado.mensajes.push('⚠ No se encontró función de carga A4');
    }

    // Cargar datos del dibujo
    try {
      resultado.dibujo = cargarDibujoMueble();
      if (resultado.dibujo) {
        resultado.mensajes.push('✓ Dibujo cargado (' + resultado.dibujo.piezas.length + ' piezas)');
      } else {
        resultado.mensajes.push('⚠ No hay datos de dibujo guardados');
      }
    } catch (err) {
      console.error('Error cargando dibujo:', err);
      resultado.mensajes.push('✗ Error cargando dibujo: ' + err.message);
    }

    return resultado;
  }

  /**
   * Muestra notificación de guardado
   */
  function mostrarNotificacionGuardado(resultado) {
    const mensaje = resultado.mensajes.join('\n');
    
    // Crear notificación visual
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.top = '20px';
    notif.style.right = '20px';
    notif.style.background = '#28a745';
    notif.style.color = 'white';
    notif.style.padding = '15px 20px';
    notif.style.borderRadius = '4px';
    notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    notif.style.zIndex = '99999';
    notif.style.maxWidth = '300px';
    notif.style.whiteSpace = 'pre-wrap';
    notif.style.fontSize = '14px';
    notif.style.fontFamily = 'monospace';
    notif.textContent = 'Plantilla guardada\n' + mensaje;

    document.body.appendChild(notif);

    // Remover después de 3 segundos
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 3000);

    console.log('Guardado completado:', resultado);
  }

  /**
   * Muestra notificación de carga
   */
  function mostrarNotificacionCarga(resultado) {
    const mensaje = resultado.mensajes.join('\n');
    
    // Crear notificación visual
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.top = '20px';
    notif.style.right = '20px';
    notif.style.background = '#0096ff';
    notif.style.color = 'white';
    notif.style.padding = '15px 20px';
    notif.style.borderRadius = '4px';
    notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    notif.style.zIndex = '99999';
    notif.style.maxWidth = '300px';
    notif.style.whiteSpace = 'pre-wrap';
    notif.style.fontSize = '14px';
    notif.style.fontFamily = 'monospace';
    notif.textContent = 'Plantilla cargada\n' + mensaje;

    document.body.appendChild(notif);

    // Remover después de 3 segundos
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 3000);

    console.log('Carga completada:', resultado);
  }

  /**
   * Obtiene información sobre los guardados existentes
   */
  function obtenerInfoGuardados() {
    const info = {
      datosPlantillaA4: localStorage.getItem('datosPlantillaA4') ? JSON.parse(localStorage.getItem('datosPlantillaA4')) : null,
      datosPlantillaDrawing: localStorage.getItem('datosPlantillaDrawing') ? JSON.parse(localStorage.getItem('datosPlantillaDrawing')) : null,
      datosPlantillaResumen: localStorage.getItem('datosPlantillaResumen') ? JSON.parse(localStorage.getItem('datosPlantillaResumen')) : null
    };
    return info;
  }

  /**
   * Borra guardados seleccionados
   */
  function borrarGuardadosSeleccionados(tiposABorrar) {
    const mensajes = [];
    
    if (tiposABorrar.includes('a4')) {
      localStorage.removeItem('datosPlantillaA4');
      mensajes.push('✓ Guardado A4 eliminado');
    }
    
    if (tiposABorrar.includes('dibujo')) {
      localStorage.removeItem('datosPlantillaDrawing');
      mensajes.push('✓ Guardado Dibujo eliminado');
    }
    
    if (tiposABorrar.includes('resumen')) {
      localStorage.removeItem('datosPlantillaResumen');
    }
    
    // Si se borraron todos, agregar mensaje general
    if (tiposABorrar.includes('a4') && tiposABorrar.includes('dibujo')) {
      mensajes.unshift('Guardado completamente eliminado');
    }
    
    return mensajes;
  }

  /**
   * Muestra modal para gestionar y borrar guardados
   */
  function mostrarModalGestionarGuardados() {
    const info = obtenerInfoGuardados();
    
    // Crear overlay y modal
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';
    
    const modal = document.createElement('div');
    modal.style.background = '#fff';
    modal.style.borderRadius = '8px';
    modal.style.padding = '30px';
    modal.style.maxWidth = '500px';
    modal.style.width = '90%';
    modal.style.maxHeight = '80vh';
    modal.style.overflow = 'auto';
    modal.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    // Encabezado
    const titulo = document.createElement('h2');
    titulo.textContent = 'Gestionar Guardados';
    titulo.style.marginTop = '0';
    titulo.style.marginBottom = '20px';
    titulo.style.color = '#333';
    modal.appendChild(titulo);
    
    // Contenedor de guardados
    const contenedor = document.createElement('div');
    contenedor.style.marginBottom = '20px';
    
    // Verificar si hay guardados
    const hayGuardados = info.datosPlantillaA4 || info.datosPlantillaDrawing;
    
    if (!hayGuardados) {
      const vacio = document.createElement('p');
      vacio.textContent = '❌ No hay guardados para mostrar';
      vacio.style.color = '#999';
      vacio.style.textAlign = 'center';
      vacio.style.padding = '20px';
      contenedor.appendChild(vacio);
    } else {
      // Info del guardado
      const resumen = info.datosPlantillaResumen;
      const card = document.createElement('div');
      card.style.border = '1px solid #ddd';
      card.style.borderRadius = '6px';
      card.style.padding = '15px';
      card.style.marginBottom = '15px';
      card.style.background = '#f9f9f9';
      
      // Encabezado de la tarjeta
      const cardTitle = document.createElement('div');
      cardTitle.style.fontWeight = 'bold';
      cardTitle.style.marginBottom = '10px';
      cardTitle.style.fontSize = '16px';
      cardTitle.textContent = '📦 Guardado Actual';
      card.appendChild(cardTitle);
      
      // Detalles
      const detalles = document.createElement('div');
      detalles.style.fontSize = '14px';
      detalles.style.color = '#666';
      detalles.style.lineHeight = '1.6';
      
      if (resumen) {
        const fecha = new Date(resumen.timestamp).toLocaleString('es-ES');
        detalles.innerHTML = `
          <div>📅 <strong>Guardado:</strong> ${fecha}</div>
          <div>📋 <strong>Módulos A4:</strong> ${resumen.modulosA4}</div>
          <div>🖼️ <strong>Piezas dibujadas:</strong> ${resumen.piezasDibujo}</div>
        `;
      }
      
      card.appendChild(detalles);
      contenedor.appendChild(card);
      
      // Checkboxes para seleccionar qué borrar
      const selectContainer = document.createElement('div');
      selectContainer.style.marginTop = '20px';
      selectContainer.style.padding = '15px';
      selectContainer.style.background = '#f0f0f0';
      selectContainer.style.borderRadius = '6px';
      
      const selectLabel = document.createElement('div');
      selectLabel.style.fontWeight = 'bold';
      selectLabel.style.marginBottom = '12px';
      selectLabel.textContent = '🗑️ Selecciona qué borrar:';
      selectContainer.appendChild(selectLabel);
      
      // Checkbox A4
      const checkA4 = document.createElement('label');
      checkA4.style.display = 'block';
      checkA4.style.marginBottom = '10px';
      checkA4.style.cursor = 'pointer';
      checkA4.style.userSelect = 'none';
      
      const inputA4 = document.createElement('input');
      inputA4.type = 'checkbox';
      inputA4.id = 'check-a4';
      inputA4.style.marginRight = '8px';
      inputA4.disabled = !info.datosPlantillaA4;
      
      checkA4.appendChild(inputA4);
      const labelA4 = document.createElement('span');
      labelA4.textContent = `Tabla A4 (${info.datosPlantillaA4 ? resumen.modulosA4 + ' módulos' : 'vacío'})`;
      labelA4.style.color = !info.datosPlantillaA4 ? '#ccc' : '#333';
      checkA4.appendChild(labelA4);
      selectContainer.appendChild(checkA4);
      
      // Checkbox Dibujo
      const checkDibujo = document.createElement('label');
      checkDibujo.style.display = 'block';
      checkDibujo.style.marginBottom = '10px';
      checkDibujo.style.cursor = 'pointer';
      checkDibujo.style.userSelect = 'none';
      
      const inputDibujo = document.createElement('input');
      inputDibujo.type = 'checkbox';
      inputDibujo.id = 'check-dibujo';
      inputDibujo.style.marginRight = '8px';
      inputDibujo.disabled = !info.datosPlantillaDrawing;
      
      checkDibujo.appendChild(inputDibujo);
      const labelDibujo = document.createElement('span');
      labelDibujo.textContent = `Dibujo (${info.datosPlantillaDrawing ? resumen.piezasDibujo + ' piezas' : 'vacío'})`;
      labelDibujo.style.color = !info.datosPlantillaDrawing ? '#ccc' : '#333';
      checkDibujo.appendChild(labelDibujo);
      selectContainer.appendChild(checkDibujo);
      
      contenedor.appendChild(selectContainer);
      
      // Botones de acción
      const botonesContainer = document.createElement('div');
      botonesContainer.style.display = 'flex';
      botonesContainer.style.gap = '10px';
      botonesContainer.style.marginTop = '20px';
      
      // Botón Borrar Todo
      const btnBorrarTodo = document.createElement('button');
      btnBorrarTodo.textContent = '🗑️ Borrar TODO';
      btnBorrarTodo.style.flex = '1';
      btnBorrarTodo.style.padding = '10px';
      btnBorrarTodo.style.background = '#dc3545';
      btnBorrarTodo.style.color = 'white';
      btnBorrarTodo.style.border = 'none';
      btnBorrarTodo.style.borderRadius = '4px';
      btnBorrarTodo.style.cursor = 'pointer';
      btnBorrarTodo.style.fontSize = '14px';
      btnBorrarTodo.style.fontWeight = 'bold';
      
      btnBorrarTodo.addEventListener('click', () => {
        if (confirm('⚠️ ¿Estás seguro de que quieres borrar TODOS los guardados? No se puede deshacer.')) {
          const mensajes = borrarGuardadosSeleccionados(['a4', 'dibujo', 'resumen']);
          overlay.remove();
          mostrarNotificacionBorrado(mensajes);
        }
      });
      
      botonesContainer.appendChild(btnBorrarTodo);
      
      // Botón Borrar Seleccionados
      const btnBorrar = document.createElement('button');
      btnBorrar.textContent = 'Borrar Seleccionados';
      btnBorrar.style.flex = '1';
      btnBorrar.style.padding = '10px';
      btnBorrar.style.background = '#ff9800';
      btnBorrar.style.color = 'white';
      btnBorrar.style.border = 'none';
      btnBorrar.style.borderRadius = '4px';
      btnBorrar.style.cursor = 'pointer';
      btnBorrar.style.fontSize = '14px';
      btnBorrar.style.fontWeight = 'bold';
      
      btnBorrar.addEventListener('click', () => {
        const tiposABorrar = [];
        if (inputA4.checked) tiposABorrar.push('a4');
        if (inputDibujo.checked) tiposABorrar.push('dibujo');
        
        if (tiposABorrar.length === 0) {
          alert('⚠️ Selecciona al menos un elemento para borrar');
          return;
        }
        
        if (confirm('¿Estás seguro de que quieres borrar los elementos seleccionados?')) {
          const mensajes = borrarGuardadosSeleccionados(tiposABorrar);
          overlay.remove();
          mostrarNotificacionBorrado(mensajes);
        }
      });
      
      botonesContainer.appendChild(btnBorrar);
      
      contenedor.appendChild(botonesContainer);
    }
    
    modal.appendChild(contenedor);
    
    // Botón Cerrar
    const btnCerrar = document.createElement('button');
    btnCerrar.textContent = 'Cerrar';
    btnCerrar.style.width = '100%';
    btnCerrar.style.padding = '12px';
    btnCerrar.style.background = '#6c757d';
    btnCerrar.style.color = 'white';
    btnCerrar.style.border = 'none';
    btnCerrar.style.borderRadius = '4px';
    btnCerrar.style.cursor = 'pointer';
    btnCerrar.style.fontSize = '14px';
    btnCerrar.style.marginTop = '10px';
    
    btnCerrar.addEventListener('click', () => {
      overlay.remove();
    });
    
    modal.appendChild(btnCerrar);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Cerrar al hacer clic fuera del modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  /**
   * Muestra notificación de borrado
   */
  function mostrarNotificacionBorrado(mensajes) {
    const mensaje = mensajes.join('\n');
    
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.top = '20px';
    notif.style.right = '20px';
    notif.style.background = '#dc3545';
    notif.style.color = 'white';
    notif.style.padding = '15px 20px';
    notif.style.borderRadius = '4px';
    notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    notif.style.zIndex = '99999';
    notif.style.maxWidth = '300px';
    notif.style.whiteSpace = 'pre-wrap';
    notif.style.fontSize = '14px';
    notif.style.fontFamily = 'monospace';
    notif.textContent = 'Guardados eliminados\n' + mensaje;

    document.body.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  // Exponer funciones globales
  window.GuardarDatos = {
    guardarTodosLosDatos,
    cargarTodosLosDatos,
    guardarDibujoMueble,
    cargarDibujoMueble,
    mostrarNotificacionGuardado,
    mostrarNotificacionCarga,
    mostrarModalGestionarGuardados,
    obtenerInfoGuardados,
    borrarGuardadosSeleccionados
  };

  // Listeners para los botones de guardar, cargar y gestionar
  document.addEventListener('DOMContentLoaded', () => {
    const btnGuardar = document.getElementById('guardarTodo');
    const btnCargar = document.getElementById('cargarTodo');
    const btnGestionar = document.getElementById('gestionarTodo');
    
    if (btnGuardar) {
      btnGuardar.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Cambiar icono/aspecto del botón mientras se guarda
        const iconoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        // Ejecutar guardado
        setTimeout(() => {
          const resultado = guardarTodosLosDatos();
          mostrarNotificacionGuardado(resultado);

          // Restaurar botón
          btnGuardar.innerHTML = iconoOriginal;
          btnGuardar.disabled = false;
        }, 300);
      });
    }

    if (btnCargar) {
      btnCargar.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Mostrar confirmación
        const confirmar = confirm('¿Cargar plantilla guardada? Se reemplazarán los datos actuales.');
        if (!confirmar) return;

        // Cambiar icono/aspecto del botón mientras se carga
        const iconoOriginal = btnCargar.innerHTML;
        btnCargar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        btnCargar.disabled = true;

        // Ejecutar carga
        setTimeout(() => {
          const resultado = cargarTodosLosDatos();
          mostrarNotificacionCarga(resultado);

          // Restaurar botón
          btnCargar.innerHTML = iconoOriginal;
          btnCargar.disabled = false;
        }, 300);
      });
    }

    if (btnGestionar) {
      btnGestionar.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarModalGestionarGuardados();
      });
    }
  });

})();
