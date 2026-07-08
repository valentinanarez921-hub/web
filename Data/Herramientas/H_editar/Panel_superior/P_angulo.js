// P_angulo.js - Lógica de cortes en esquina con desplazamiento y giro
(function () {
  window.P_angulo = window.P_angulo || {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeCornerDefinition(value) {
    if (typeof value === "number") {
      return { shift: value, rotate: 0 };
    }

    if (value && typeof value === "object") {
      return {
        shift: parseInt(value.shift ?? value.offset ?? 0, 10) || 0,
        rotate: parseInt(value.rotate ?? value.girar ?? 0, 10) || 0,
      };
    }

    return { shift: 0, rotate: 0 };
  }

  function normalizeAngleState(state) {
    const nextState = state ? Object.assign({}, state) : {};
    nextState.angles = nextState.angles || {};
    ["tl", "tr", "br", "bl"].forEach((corner) => {
      nextState.angles[corner] = normalizeCornerDefinition(
        nextState.angles[corner],
      );
    });
    return nextState;
  }

  function getCornerDefinition(state, corner) {
    const normalized = normalizeAngleState(state);
    return normalized.angles[corner] || { shift: 0, rotate: 0 };
  }

  function getCornerDistances(width, height, state, corner) {
    const item = getCornerDefinition(state, corner);
    const shift = Math.abs(parseInt(item.shift, 10) || 0);
    const maxShift = Math.max(0, Math.min(width, height));
    const safeShift = clamp(shift, 0, maxShift);

    switch (corner) {
      case "tl":
        return { x: safeShift, y: safeShift };
      case "tr":
        return { x: width - safeShift, y: safeShift };
      case "br":
        return { x: width - safeShift, y: height - safeShift };
      case "bl":
        return { x: safeShift, y: height - safeShift };
      default:
        return { x: 0, y: 0 };
    }
  }

  function rotatePoint(point, pivot, degrees) {
    const angle = (degrees * Math.PI) / 180;
    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;
    return {
      x: pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle),
    };
  }

  function intersectLineWithEdge(line, edge) {
    const { x1, y1, x2, y2 } = line;
    if (edge.type === "top") {
      if (Math.abs(y2 - y1) < 1e-6) return { x: x1, y: edge.y };
      const t = (edge.y - y1) / (y2 - y1);
      return { x: x1 + (x2 - x1) * t, y: edge.y };
    }
    if (edge.type === "bottom") {
      if (Math.abs(y2 - y1) < 1e-6) return { x: x1, y: edge.y };
      const t = (edge.y - y1) / (y2 - y1);
      return { x: x1 + (x2 - x1) * t, y: edge.y };
    }
    if (edge.type === "left") {
      if (Math.abs(x2 - x1) < 1e-6) return { x: edge.x, y: y1 };
      const t = (edge.x - x1) / (x2 - x1);
      return { x: edge.x, y: y1 + (y2 - y1) * t };
    }
    if (edge.type === "right") {
      if (Math.abs(x2 - x1) < 1e-6) return { x: edge.x, y: y1 };
      const t = (edge.x - x1) / (x2 - x1);
      return { x: edge.x, y: y1 + (y2 - y1) * t };
    }
    return { x: x1, y: y1 };
  }

  function getCornerPoints(width, height, state, corner) {
    const item = getCornerDefinition(state, corner);
    const shift = Math.abs(parseInt(item.shift, 10) || 0);
    const rotate = parseInt(item.rotate, 10) || 0;
    const maxShift = Math.max(0, Math.min(width, height));
    const safeShift = clamp(shift, 0, maxShift);

    const basePoints = {
      tl: [
        { x: safeShift, y: 0 },
        { x: 0, y: safeShift },
      ],
      tr: [
        { x: width - safeShift, y: 0 },
        { x: width, y: safeShift },
      ],
      br: [
        { x: width - safeShift, y: height },
        { x: width, y: height - safeShift },
      ],
      bl: [
        { x: safeShift, y: height },
        { x: 0, y: height - safeShift },
      ],
    }[corner] || [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];

    const pivot = {
      tl: { x: 0, y: 0 },
      tr: { x: width, y: 0 },
      br: { x: width, y: height },
      bl: { x: 0, y: height },
    }[corner] || { x: 0, y: 0 };

    const rotatedPoints = basePoints.map((point) =>
      rotatePoint(point, pivot, rotate),
    );
    const line = {
      x1: rotatedPoints[0].x,
      y1: rotatedPoints[0].y,
      x2: rotatedPoints[1].x,
      y2: rotatedPoints[1].y,
    };

    switch (corner) {
      case "tl":
        return [
          intersectLineWithEdge(line, { type: "top", y: 0 }),
          intersectLineWithEdge(line, { type: "left", x: 0 }),
        ];
      case "tr":
        return [
          intersectLineWithEdge(line, { type: "top", y: 0 }),
          intersectLineWithEdge(line, { type: "right", x: width }),
        ];
      case "br":
        return [
          intersectLineWithEdge(line, { type: "bottom", y: height }),
          intersectLineWithEdge(line, { type: "right", x: width }),
        ];
      case "bl":
        return [
          intersectLineWithEdge(line, { type: "bottom", y: height }),
          intersectLineWithEdge(line, { type: "left", x: 0 }),
        ];
      default:
        return [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ];
    }
  }

  function getShapePoints(width, height, state) {
    const tl = getCornerPoints(width, height, state, "tl");
    const tr = getCornerPoints(width, height, state, "tr");
    const br = getCornerPoints(width, height, state, "br");
    const bl = getCornerPoints(width, height, state, "bl");

    const points = [];
    const addPoint = (point) => {
      if (!point) return;
      const lastPoint = points[points.length - 1];
      if (!lastPoint || lastPoint.x !== point.x || lastPoint.y !== point.y) {
        points.push(point);
      }
    };

    addPoint({ x: tl[0].x, y: tl[0].y });
    addPoint({ x: tr[0].x, y: tr[0].y });
    addPoint({ x: tr[1].x, y: tr[1].y });
    addPoint({ x: br[1].x, y: br[1].y });
    addPoint({ x: br[0].x, y: br[0].y });
    addPoint({ x: bl[0].x, y: bl[0].y });
    addPoint({ x: bl[1].x, y: bl[1].y });
    addPoint({ x: tl[1].x, y: tl[1].y });
    addPoint({ x: tl[0].x, y: tl[0].y });

    return points;
  }

  function getPathData(width, height, state) {
    const points = getShapePoints(width, height, state);
    if (!points.length) return "";

    const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
    points.slice(1).forEach((point) => {
      commands.push(`L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
    });
    commands.push("Z");
    return commands.join(" ");
  }

  window.P_angulo.normalizeState = normalizeAngleState;
  window.P_angulo.getCornerDefinition = getCornerDefinition;
  window.P_angulo.getCornerPoints = getCornerPoints;
  window.P_angulo.getShapePoints = getShapePoints;
  window.P_angulo.getPathData = getPathData;

  window.P_angulo.init = function (opts) {
    if (!opts) return;

    const angleShift = opts.angleShift || opts.angleValue;
    const angleRotate = opts.angleRotate;
    const angleCorner = opts.angleCorner;
    const drawPreview = opts.drawPreview;
    const getState = opts.getState;
    const setState = opts.setState;

    if (!angleCorner || !getState || !setState) return;

    const boundKey = "__pAnguloBound";
    if (
      (angleShift && angleShift[boundKey]) ||
      (angleRotate && angleRotate[boundKey]) ||
      (angleCorner && angleCorner[boundKey])
    ) {
      const corner = angleCorner.value || "tl";
      const state = normalizeAngleState(getState());
      const current = state.angles[corner] || { shift: 0, rotate: 0 };
      if (angleShift) angleShift.value = current.shift || 0;
      if (angleRotate) angleRotate.value = current.rotate || 0;
      return;
    }

    const applyCurrentValue = () => {
      const corner = angleCorner.value || "tl";
      const state = normalizeAngleState(getState());
      const current = state.angles[corner] || { shift: 0, rotate: 0 };
      const nextShift = parseInt(angleShift ? angleShift.value : 0, 10) || 0;
      const nextRotate = parseInt(angleRotate ? angleRotate.value : 0, 10) || 0;
      current.shift = nextShift;
      current.rotate = nextRotate;
      state.angles[corner] = current;
      setState(state);
      if (typeof drawPreview === "function") drawPreview();
    };

    const syncControls = () => {
      const corner = angleCorner.value || "tl";
      const state = normalizeAngleState(getState());
      const current = state.angles[corner] || { shift: 0, rotate: 0 };
      if (angleShift) angleShift.value = current.shift || 0;
      if (angleRotate) angleRotate.value = current.rotate || 0;
    };

    if (angleShift) {
      angleShift.addEventListener("input", (e) => {
        e.stopPropagation();
        applyCurrentValue();
      });
    }

    if (angleRotate) {
      angleRotate.addEventListener("input", (e) => {
        e.stopPropagation();
        applyCurrentValue();
      });
    }

    if (angleCorner) {
      angleCorner.addEventListener("change", (e) => {
        e.stopPropagation();
        syncControls();
      });
    }

    if (angleShift) angleShift[boundKey] = true;
    if (angleRotate) angleRotate[boundKey] = true;
    if (angleCorner) angleCorner[boundKey] = true;

    syncControls();
  };
})();
