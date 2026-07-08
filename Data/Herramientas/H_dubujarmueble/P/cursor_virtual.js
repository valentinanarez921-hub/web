(function() {
  const gridArea = document.getElementById("gridArea");
  if (!gridArea) return;

  // CURSOR VIRTUAL (Cruceta tipo crosshair)
  const cursorVirtual = document.createElement("div");
  cursorVirtual.style.position = "fixed";
  cursorVirtual.style.pointerEvents = "none";
  cursorVirtual.style.zIndex = "999999";
  cursorVirtual.style.display = "none";
  cursorVirtual.style.transform = "translate(-50%, -50%)";
  cursorVirtual.style.width = "20px";
  cursorVirtual.style.height = "20px";
  cursorVirtual.style.willChange = "transform";
  
  // Crear cruceta con dos divs (líneas delgadas)
  const lineH = document.createElement("div");
  lineH.style.position = "absolute";
  lineH.style.left = "2px";
  lineH.style.top = "50%";
  lineH.style.width = "16px";
  lineH.style.height = "1px";
  lineH.style.backgroundColor = "black";
  lineH.style.transform = "translateY(-50%)";
  lineH.style.pointerEvents = "none";
  
  const lineV = document.createElement("div");
  lineV.style.position = "absolute";
  lineV.style.left = "50%";
  lineV.style.top = "2px";
  lineV.style.width = "1px";
  lineV.style.height = "16px";
  lineV.style.backgroundColor = "black";
  lineV.style.transform = "translateX(-50%)";
  lineV.style.pointerEvents = "none";
  
  cursorVirtual.appendChild(lineH);
  cursorVirtual.appendChild(lineV);

  document.body.appendChild(cursorVirtual);

  let pointerX = 0;
  let pointerY = 0;

  // --- AL ENTRAR ---
  gridArea.addEventListener("mouseenter", (e) => {
    cursorVirtual.style.display = "block";
    pointerX = e.clientX;
    pointerY = e.clientY;

    cursorVirtual.style.left = pointerX + "px";
    cursorVirtual.style.top = pointerY + "px";
  });

  // --- AL SALIR ---
  gridArea.addEventListener("mouseleave", () => {
    cursorVirtual.style.display = "none";
  });

  // --- MOVIMIENTO NORMAL ---
  gridArea.addEventListener("mousemove", (e) => {
    const rect = gridArea.getBoundingClientRect();

    // LIMITAR DENTRO DEL GRID
    pointerX = Math.max(rect.left, Math.min(e.clientX, rect.right));
    pointerY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));

    cursorVirtual.style.left = pointerX + "px";
    cursorVirtual.style.top = pointerY + "px";
    // Exponer estado del cursor virtual para otras herramientas
    window.CursorVirtual = window.CursorVirtual || {};
    window.CursorVirtual.x = pointerX;
    window.CursorVirtual.y = pointerY;
    window.CursorVirtual.elem = cursorVirtual;
  });

  // --- SIEMPRE OCULTAMOS EL CURSOR REAL ---
  gridArea.style.cursor = "none";

  // actualizar coordenadas tambien en mouseenter para exponerlas
  gridArea.addEventListener('mouseenter', (e)=>{
    window.CursorVirtual = window.CursorVirtual || {};
    window.CursorVirtual.x = pointerX;
    window.CursorVirtual.y = pointerY;
    window.CursorVirtual.elem = cursorVirtual;
  });

  // ocultar cuando se sale
  gridArea.addEventListener('mouseleave', ()=>{
    if(window.CursorVirtual){ window.CursorVirtual.visible = false; }
  });

})();
