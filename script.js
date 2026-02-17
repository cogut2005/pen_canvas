const board = document.getElementById("board");
const paperCanvas = document.getElementById("paperCanvas");
const drawCanvas = document.getElementById("drawCanvas");
const paperSelect = document.getElementById("paperType");
const penStyleSelect = document.getElementById("penStyle");
const penToolBtn = document.getElementById("penTool");
const eraserToolBtn = document.getElementById("eraserTool");
const penSizeInput = document.getElementById("penSize");
const eraserSizeInput = document.getElementById("eraserSize");
const penSizeLabel = document.getElementById("penSizeLabel");
const eraserSizeLabel = document.getElementById("eraserSizeLabel");
const clearBtn = document.getElementById("clearCanvas");
const copyBtn = document.getElementById("copyCanvas");
const statusMessage = document.getElementById("statusMessage");
const customColor = document.getElementById("customColor");
const swatches = [...document.querySelectorAll(".swatch")];

const paperCtx = paperCanvas.getContext("2d");
const drawCtx = drawCanvas.getContext("2d");

const penStyles = {
  fine: { widthBoost: 0, alpha: 1 },
  marker: { widthBoost: 3, alpha: 0.75 },
  brush: { widthBoost: 1, alpha: 0.9 },
};

const state = {
  paper: "blank",
  tool: "pen",
  color: "#101010",
  penSize: Number(penSizeInput.value),
  eraserSize: Number(eraserSizeInput.value),
  penStyle: penStyleSelect.value,
  isDrawing: false,
  lastPoint: null,
};

function setStatus(text) {
  statusMessage.textContent = text;
}

function resizeCanvases() {
  const rect = board.getBoundingClientRect();
  const dpr = Math.max(window.devicePixelRatio || 1, 1);

  let snapshot = null;
  if (drawCanvas.width > 0 && drawCanvas.height > 0) {
    snapshot = document.createElement("canvas");
    snapshot.width = drawCanvas.width;
    snapshot.height = drawCanvas.height;
    snapshot.getContext("2d").drawImage(drawCanvas, 0, 0);
  }

  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));

  for (const canvas of [paperCanvas, drawCanvas]) {
    canvas.width = width;
    canvas.height = height;
  }

  paperCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";

  drawPaper();

  if (snapshot) {
    drawCtx.drawImage(
      snapshot,
      0,
      0,
      snapshot.width,
      snapshot.height,
      0,
      0,
      rect.width,
      rect.height
    );
  }
}

function drawPaper() {
  const rect = board.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  paperCtx.clearRect(0, 0, w, h);
  paperCtx.fillStyle = "#fefcf8";
  paperCtx.fillRect(0, 0, w, h);

  if (state.paper === "blank") return;

  if (state.paper === "lined") {
    const gap = 30;
    paperCtx.strokeStyle = "rgba(38, 83, 127, 0.30)";
    paperCtx.lineWidth = 1;
    paperCtx.beginPath();
    for (let y = gap; y < h; y += gap) {
      paperCtx.moveTo(0, y + 0.5);
      paperCtx.lineTo(w, y + 0.5);
    }
    paperCtx.stroke();
    return;
  }

  if (state.paper === "squared") {
    const size = 24;
    paperCtx.strokeStyle = "rgba(25, 108, 81, 0.22)";
    paperCtx.lineWidth = 1;
    paperCtx.beginPath();

    for (let x = size; x < w; x += size) {
      paperCtx.moveTo(x + 0.5, 0);
      paperCtx.lineTo(x + 0.5, h);
    }

    for (let y = size; y < h; y += size) {
      paperCtx.moveTo(0, y + 0.5);
      paperCtx.lineTo(w, y + 0.5);
    }

    paperCtx.stroke();
  }
}

function activateTool(nextTool) {
  state.tool = nextTool;
  penToolBtn.classList.toggle("active", nextTool === "pen");
  eraserToolBtn.classList.toggle("active", nextTool === "eraser");
  drawCanvas.style.cursor = nextTool === "eraser" ? "cell" : "crosshair";
}

function setColor(nextColor) {
  state.color = nextColor;
  customColor.value = nextColor;
  swatches.forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.color.toLowerCase() === nextColor.toLowerCase());
  });
}

function setStrokeStyle() {
  if (state.tool === "eraser") {
    drawCtx.globalCompositeOperation = "destination-out";
    drawCtx.strokeStyle = "rgba(0,0,0,1)";
    drawCtx.lineWidth = state.eraserSize;
    return;
  }

  const style = penStyles[state.penStyle] || penStyles.fine;
  drawCtx.globalCompositeOperation = "source-over";
  drawCtx.strokeStyle = hexToRgba(state.color, style.alpha);
  drawCtx.lineWidth = Math.max(1, state.penSize + style.widthBoost);
}

function hexToRgba(hex, alpha) {
  const valid = hex.replace("#", "");
  const full = valid.length === 3
    ? valid.split("").map((n) => n + n).join("")
    : valid;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getPoint(event) {
  const rect = drawCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawSegment(from, to) {
  setStrokeStyle();
  drawCtx.beginPath();
  drawCtx.moveTo(from.x, from.y);
  drawCtx.lineTo(to.x, to.y);
  drawCtx.stroke();
}

function pointerDown(event) {
  drawCanvas.setPointerCapture(event.pointerId);
  state.isDrawing = true;
  state.lastPoint = getPoint(event);

  // Draw a tiny dot so taps produce visible marks.
  drawSegment(state.lastPoint, { x: state.lastPoint.x + 0.01, y: state.lastPoint.y + 0.01 });
}

function pointerMove(event) {
  if (!state.isDrawing || !state.lastPoint) return;
  const next = getPoint(event);
  drawSegment(state.lastPoint, next);
  state.lastPoint = next;
}

function pointerUp(event) {
  if (drawCanvas.hasPointerCapture(event.pointerId)) {
    drawCanvas.releasePointerCapture(event.pointerId);
  }
  state.isDrawing = false;
  state.lastPoint = null;
}

async function copyTransparentPng() {
  const blobPromise = new Promise((resolve) => drawCanvas.toBlob(resolve, "image/png"));

  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      // Keep `clipboard.write()` directly inside the click handler path.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
      setStatus("Copied: transparent PNG of your writing.");
      return;
    }
  } catch (error) {
    console.error(error);
  }

  try {
    const blob = await blobPromise;
    if (!blob) {
      setStatus("Could not create an image from the canvas.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `writing-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setStatus("Image clipboard copy is blocked in this browser. Downloaded transparent PNG instead.");
  } catch (error) {
    setStatus("Copy failed on this browser. Try Chrome/Edge, or use download.");
    console.error(error);
  }
}

paperSelect.addEventListener("change", () => {
  state.paper = paperSelect.value;
  drawPaper();
});

penStyleSelect.addEventListener("change", () => {
  state.penStyle = penStyleSelect.value;
});

penToolBtn.addEventListener("click", () => activateTool("pen"));
eraserToolBtn.addEventListener("click", () => activateTool("eraser"));

penSizeInput.addEventListener("input", () => {
  state.penSize = Number(penSizeInput.value);
  penSizeLabel.textContent = `Pen size: ${state.penSize}`;
});

eraserSizeInput.addEventListener("input", () => {
  state.eraserSize = Number(eraserSizeInput.value);
  eraserSizeLabel.textContent = `Eraser size: ${state.eraserSize}`;
});

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => setColor(swatch.dataset.color));
});

customColor.addEventListener("input", () => setColor(customColor.value));

clearBtn.addEventListener("click", () => {
  const rect = board.getBoundingClientRect();
  drawCtx.clearRect(0, 0, rect.width, rect.height);
  setStatus("Writing cleared.");
});

copyBtn.addEventListener("click", copyTransparentPng);

drawCanvas.addEventListener("pointerdown", pointerDown);
drawCanvas.addEventListener("pointermove", pointerMove);
drawCanvas.addEventListener("pointerup", pointerUp);
drawCanvas.addEventListener("pointercancel", pointerUp);
drawCanvas.addEventListener("pointerleave", pointerUp);

window.addEventListener("resize", resizeCanvases);

setColor(state.color);
activateTool("pen");
resizeCanvases();
