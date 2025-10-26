import "./style.css";

document.body.innerHTML = `
  <header>
    <h1 id="app-title">CMPM 121 — My App</h1>
  </header>
  <main>
    <canvas id="game-canvas" class="game-canvas" width="256" height="256"></canvas>
    <div class="toolbar">
      <button id="thin-btn"  type="button">Thin</button>
      <button id="thick-btn" type="button">Thick</button>
      <button id="undo-btn" type="button">Undo</button>
      <button id="redo-btn" type="button">Redo</button>
      <button id="clear-btn" type="button">Clear</button>
    </div>
  </main>
`;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

//step 2 clear function
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;

//step 4 undo&redo buttom
const undoBtn = document.getElementById("undo-btn") as HTMLButtonElement;
const redoBtn = document.getElementById("redo-btn") as HTMLButtonElement;

// types of pen
ctx.lineWidth = 4;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#222";

// --- Step 3: display list data ---
type Point = { x: number; y: number };

//step 5: command interface
interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
  drag?(x: number, y: number): void;
}

function createMarkerLine(width: number): DisplayCommand {
  const points: Point[] = [];

  return {
    drag(x: number, y: number) {
      points.push({ x, y });
    },

    display(ctx: CanvasRenderingContext2D) {
      if (points.length < 2) return;

      const prevWidth = ctx.lineWidth;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      ctx.lineWidth = prevWidth;
    },
  };
}

const strokes: DisplayCommand[] = []; // store the "dots"
let currentStroke: DisplayCommand | null = null; // current dot

const redoStack: DisplayCommand[] = [];

// drawing
let drawing = false;
function getPos(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

// mouse event
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const { x, y } = getPos(e);

  //step 3
  currentStroke = createMarkerLine(ctx.lineWidth);
  strokes.push(currentStroke);
  currentStroke.drag!(x, y);

  //clearing
  redoStack.length = 0;

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing || !currentStroke) return;
  const { x, y } = getPos(e);

  currentStroke.drag!(x, y);

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});

// prevent drawing out of canvas
canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentStroke = null;
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
  currentStroke = null;
});

// step 4: undo / redo
undoBtn.addEventListener("click", () => {
  if (strokes.length === 0) return;
  const undone = strokes.pop()!;
  redoStack.push(undone);
  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});

redoBtn.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const restored = redoStack.pop()!;
  strokes.push(restored);
  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});

//step 3 redraw
canvas.addEventListener("drawing-changed", redraw);

//step 4 disable redo/undo buttom
canvas.addEventListener("drawing-changed", updateButtons);

function updateButtons() {
  undoBtn.disabled = strokes.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}
updateButtons();

function redraw() {
  // clear out the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // redraw
  for (const stroke of strokes) {
    stroke.display(ctx);
  }
}

clearBtn.addEventListener("click", () => {
  strokes.length = 0;
  redoStack.length = 0;
  currentStroke = null;

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});
