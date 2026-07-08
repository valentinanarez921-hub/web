// editar_pieza_cuadricula.js - renderizado de la pieza y estado de edición
(function () {
  window.editar_pieza_cuadricula = window.editar_pieza_cuadricula || {};

  let canvas = null;
  let ctx = null;
  let getCurrentPiece = () => null;
  let getState = () => ({
    radii: { tl: 0, tr: 0, br: 0, bl: 0 },
    angles: {},
    holes: [],
  });
  let getOpts = () => ({ currentCut: [] });

  window.editar_pieza_cuadricula.init = function (opts) {
    if (!opts) opts = {};
    canvas = opts.canvas || canvas;
    if (canvas) ctx = canvas.getContext("2d");
    if (typeof opts.getCurrentPiece === "function")
      getCurrentPiece = opts.getCurrentPiece;
    if (typeof opts.getState === "function") getState = opts.getState;
    if (typeof opts.getOpts === "function") getOpts = opts.getOpts;
  };

  window.editar_pieza_cuadricula.getState = function () {
    return getState();
  };
  window.editar_pieza_cuadricula.setState = function (s) {
    if (!s) return;
    const st = getState();
    Object.assign(st, s);
  };

  function getAngleDistance(width, height, angleValue) {
    const angle = parseInt(angleValue, 10) || 0;
    if (angle <= 0) return 0;
    const clamped = Math.max(0, Math.min(90, angle));
    const base = Math.max(1, Math.min(width, height));
    return Math.min(base, (base * clamped) / 90);
  }

  function drawShapePath(ctx, width, height, state) {
    const normalizedState =
      window.P_angulo && window.P_angulo.normalizeState
        ? window.P_angulo.normalizeState(state)
        : state;
    const points =
      window.P_angulo && window.P_angulo.getShapePoints
        ? window.P_angulo.getShapePoints(width, height, normalizedState)
        : [];

    if (points && points.length) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      return;
    }

    const r = normalizedState?.radii || {};
    const tl = Math.min(r.tl || 0, width / 2, height / 2);
    const tr = Math.min(r.tr || 0, width / 2, height / 2);
    const br = Math.min(r.br || 0, width / 2, height / 2);
    const bl = Math.min(r.bl || 0, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(tl, 0);
    ctx.lineTo(width - tr, 0);
    if (tr > 0) ctx.quadraticCurveTo(width, 0, width, tr);
    else ctx.lineTo(width, 0);
    ctx.lineTo(width, height - br);
    if (br > 0) ctx.quadraticCurveTo(width, height, width - br, height);
    else ctx.lineTo(width, height);
    ctx.lineTo(bl, height);
    if (bl > 0) ctx.quadraticCurveTo(0, height, 0, height - bl);
    else ctx.lineTo(0, height);
    ctx.lineTo(0, tl);
    if (tl > 0) ctx.quadraticCurveTo(0, 0, tl, 0);
    else ctx.lineTo(0, 0);
    ctx.closePath();
  }

  window.editar_pieza_cuadricula.drawPreview = function () {
    try {
      if (!canvas || !ctx) {
        console.error("drawPreview: canvas or ctx not available");
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const state = getState() || { radii: {}, angles: {}, holes: [] };
      const currentPiece = getCurrentPiece();

      // PASO 1: Limpiar canvas
      ctx.fillStyle = "#e8e8e8";
      ctx.fillRect(0, 0, w, h);

      // PASO 2: Transformaciones de pan/zoom
      ctx.save();
      const _panX =
        window.editar_cuadricula && window.editar_cuadricula.getPanX
          ? window.editar_cuadricula.getPanX()
          : 0;
      const _panY =
        window.editar_cuadricula && window.editar_cuadricula.getPanY
          ? window.editar_cuadricula.getPanY()
          : 0;
      const _zoom =
        window.editar_cuadricula && window.editar_cuadricula.getZoomLevel
          ? window.editar_cuadricula.getZoomLevel()
          : 1;
      ctx.translate(_panX, _panY);
      ctx.scale(_zoom, _zoom);

      // PASO 3: Dimensiones de pieza
      const origW = currentPiece ? currentPiece._originalW || 100 : 100;
      const origH = currentPiece ? currentPiece._originalH || 100 : 100;

      // PASO 4: Dibujar pieza blanca
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#757575ff";
      ctx.lineWidth = 1 / (_zoom || 1);
      drawShapePath(ctx, origW, origH, state);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.stroke();

      // PASO 5: Dibujar calados (cortes)
      // Función auxiliar para normalizar acceso a puntos del calado
      const getHolePoints = (hole) => {
        if (!hole) return [];
        if (hole.points) return hole.points; // Estructura: {points: [...], radios: {...}}
        if (Array.isArray(hole)) return hole; // Estructura: array de puntos con propiedad radios
        return [];
      };
      const getHoleRadios = (hole) => {
        if (!hole) return { tl: 0, tr: 0, bl: 0, br: 0 };
        return hole.radios || { tl: 0, tr: 0, bl: 0, br: 0 };
      };

      if (state.holes && state.holes.length > 0) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "black";

        state.holes.forEach((hole) => {
          const points = getHolePoints(hole);
          if (!points || !points.length) return;

          const radios = getHoleRadios(hole);

          ctx.beginPath();
          if (
            radios.tl > 0 ||
            radios.tr > 0 ||
            radios.br > 0 ||
            radios.bl > 0
          ) {
            const minX = Math.min(...points.map((p) => p.x)) * origW;
            const maxX = Math.max(...points.map((p) => p.x)) * origW;
            const minY = Math.min(...points.map((p) => p.y)) * origH;
            const maxY = Math.max(...points.map((p) => p.y)) * origH;

            ctx.moveTo(minX + radios.tl, minY);
            ctx.lineTo(maxX - radios.tr, minY);
            if (radios.tr > 0)
              ctx.quadraticCurveTo(maxX, minY, maxX, minY + radios.tr);
            else ctx.lineTo(maxX, minY);
            ctx.lineTo(maxX, maxY - radios.br);
            if (radios.br > 0)
              ctx.quadraticCurveTo(maxX, maxY, maxX - radios.br, maxY);
            else ctx.lineTo(maxX, maxY);
            ctx.lineTo(minX + radios.bl, maxY);
            if (radios.bl > 0)
              ctx.quadraticCurveTo(minX, maxY, minX, maxY - radios.bl);
            else ctx.lineTo(minX, maxY);
            ctx.lineTo(minX, minY + radios.tl);
            if (radios.tl > 0)
              ctx.quadraticCurveTo(minX, minY, minX + radios.tl, minY);
            else ctx.lineTo(minX, minY);
          } else {
            points.forEach((pt, i) => {
              if (i === 0) ctx.moveTo(pt.x * origW, pt.y * origH);
              else ctx.lineTo(pt.x * origW, pt.y * origH);
            });
          }
          ctx.closePath();
          ctx.fill();
        });
        ctx.globalCompositeOperation = "source-over";
      }

      // PASO 6: Dibujar contornos de calados
      ctx.globalCompositeOperation = "source-over";
      const selectedIdx =
        window.Pc_calado_seleccion &&
        window.Pc_calado_seleccion.getSelectedIndex
          ? window.Pc_calado_seleccion.getSelectedIndex()
          : -1;

      if (state.holes && state.holes.length > 0) {
        state.holes.forEach((hole, idx) => {
          const points = getHolePoints(hole);
          if (!points || points.length < 2) return;

          const radios = getHoleRadios(hole);

          ctx.beginPath();
          // Dibujar con radios si existen
          if (
            radios.tl > 0 ||
            radios.tr > 0 ||
            radios.br > 0 ||
            radios.bl > 0
          ) {
            const minX = Math.min(...points.map((p) => p.x)) * origW;
            const maxX = Math.max(...points.map((p) => p.x)) * origW;
            const minY = Math.min(...points.map((p) => p.y)) * origH;
            const maxY = Math.max(...points.map((p) => p.y)) * origH;

            ctx.moveTo(minX + radios.tl, minY);
            ctx.lineTo(maxX - radios.tr, minY);
            if (radios.tr > 0)
              ctx.quadraticCurveTo(maxX, minY, maxX, minY + radios.tr);
            else ctx.lineTo(maxX, minY);
            ctx.lineTo(maxX, maxY - radios.br);
            if (radios.br > 0)
              ctx.quadraticCurveTo(maxX, maxY, maxX - radios.br, maxY);
            else ctx.lineTo(maxX, maxY);
            ctx.lineTo(minX + radios.bl, maxY);
            if (radios.bl > 0)
              ctx.quadraticCurveTo(minX, maxY, minX, maxY - radios.bl);
            else ctx.lineTo(minX, maxY);
            ctx.lineTo(minX, minY + radios.tl);
            if (radios.tl > 0)
              ctx.quadraticCurveTo(minX, minY, minX + radios.tl, minY);
            else ctx.lineTo(minX, minY);
          } else {
            // Sin radios, dibujar rectángulo simple
            points.forEach((pt, i) => {
              const x = pt.x * origW,
                y = pt.y * origH;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
          }
          ctx.closePath();

          if (idx === selectedIdx) {
            ctx.strokeStyle = "#ff9800";
            ctx.lineWidth = 1 / (_zoom || 1);
          } else {
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1 / (_zoom || 1);
          }
          ctx.stroke();
        });
      }

      // PASO 6.5: Dibujar cotas dinámicas para el calado en edición (preview)
      const isExactMode =
        window.Pc_calado_medido && window.Pc_calado_medido.isExactMode
          ? window.Pc_calado_medido.isExactMode()
          : false;
      const isPreviewActive =
        window.Pc_calado_medido && window.Pc_calado_medido.isPreviewActive
          ? window.Pc_calado_medido.isPreviewActive()
          : false;

      if (
        isExactMode &&
        isPreviewActive &&
        state.holes &&
        state.holes.length > 0
      ) {
        // Dibujar cotas para el último calado (el que está en preview)
        const lastHole = state.holes[state.holes.length - 1];
        const lastPoints = getHolePoints(lastHole);
        if (lastPoints && lastPoints.length > 0) {
          const minX = Math.min(...lastPoints.map((p) => p.x)) * origW;
          const maxX = Math.max(...lastPoints.map((p) => p.x)) * origW;
          const minY = Math.min(...lastPoints.map((p) => p.y)) * origH;
          const maxY = Math.max(...lastPoints.map((p) => p.y)) * origH;

          const calW = Math.round(maxX - minX);
          const calH = Math.round(maxY - minY);
          const distIzq = Math.round(minX);
          const distDer = Math.round(origW - maxX);
          const distSup = Math.round(minY);
          const distInf = Math.round(origH - maxY);

          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = "#ff0000";
          ctx.fillStyle = "#ff0000";
          ctx.lineWidth = 1 / (_zoom || 1);
          ctx.font = 12 / (_zoom || 1) + "px Arial";
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";

          // Líneas discontinuas desde bordes del calado hacia bordes de la pieza
          ctx.setLineDash([5 / (_zoom || 1), 5 / (_zoom || 1)]);

          // Superior
          ctx.beginPath();
          ctx.moveTo((minX + maxX) / 2, 0);
          ctx.lineTo((minX + maxX) / 2, minY);
          ctx.stroke();

          // Inferior
          ctx.beginPath();
          ctx.moveTo((minX + maxX) / 2, maxY);
          ctx.lineTo((minX + maxX) / 2, origH);
          ctx.stroke();

          // Izquierda
          ctx.beginPath();
          ctx.moveTo(0, (minY + maxY) / 2);
          ctx.lineTo(minX, (minY + maxY) / 2);
          ctx.stroke();

          // Derecha
          ctx.beginPath();
          ctx.moveTo(maxX, (minY + maxY) / 2);
          ctx.lineTo(origW, (minY + maxY) / 2);
          ctx.stroke();

          // Texto de cotas exteriores
          ctx.setLineDash([]);
          ctx.fillStyle = "#ff0000";
          ctx.font = "bold " + 12 / (_zoom || 1) + "px Arial";

          // Cota superior (distancia del borde superior al calado)
          ctx.fillText(distSup + "px", (minX + maxX) / 2, minY / 2);

          // Cota inferior (distancia del calado al borde inferior)
          ctx.fillText(
            distInf + "px",
            (minX + maxX) / 2,
            maxY + (origH - maxY) / 2,
          );

          // Cota izquierda
          ctx.fillText(distIzq + "px", minX / 2, (minY + maxY) / 2);

          // Cota derecha
          ctx.fillText(
            distDer + "px",
            maxX + (origW - maxX) / 2,
            (minY + maxY) / 2,
          );

          // Cotas interiores (ancho x alto del calado)
          ctx.fillStyle = "#0066ff";
          ctx.font = "bold " + 14 / (_zoom || 1) + "px Arial";
          ctx.fillText(
            calW + "px",
            (minX + maxX) / 2,
            (minY + maxY) / 2 - 10 / (_zoom || 1),
          );
          ctx.fillText(
            calH + "px",
            (minX + maxX) / 2,
            (minY + maxY) / 2 + 10 / (_zoom || 1),
          );

          ctx.restore();
        }
      }

      // PASO 7: Restaurar transformaciones
      ctx.restore();

      // PASO 8: Los inputs de medidas exactas son controlados por Pc_calado_medido.js
      // No los tocamos aquí para no interferir con la selección de calados
    } catch (err) {
      console.error("=== drawPreview CRITICAL ERROR ===", err);
      try {
        ctx.restore();
      } catch (e) {}
      try {
        ctx.fillStyle = "#e8e8e8";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } catch (e) {}
    }
  };
})();
