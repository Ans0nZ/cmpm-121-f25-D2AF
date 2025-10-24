import "./style.css";

document.body.innerHTML = `
  <header>
    <h1 id="app-title">CMPM 121 — My App</h1>
  </header>
  <main>
    <canvas id="game-canvas" class="game-canvas" width="256" height="256"></canvas>
    <div class="toolbar">
      <button id="clear-btn" type="button">Clear</button>
    </div>
  </main>
`;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

//step 2 clear function
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;

// types of pen
ctx.lineWidth = 4;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#222";

// --- Step 3: display list data ---
type Point = { x: number; y: number };
let strokes: Point[][] = []; // store the "dots"
let currentStroke: Point[] | null = null; // current dot

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
  currentStroke = [];
  strokes.push(currentStroke);
  currentStroke.push({ x, y });

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const { x, y } = getPos(e);

  currentStroke.push({ x, y });

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

//step 3 redraw
canvas.addEventListener("drawing-changed", redraw);

function redraw() {
  // clear out the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // redraw
  for (const stroke of strokes) {
    if (stroke.length < 2) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }
}

clearBtn.addEventListener("click", () => {
  strokes.length = 0;
  currentStroke = null;

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});
