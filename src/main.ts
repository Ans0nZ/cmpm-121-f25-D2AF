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
      <button class="sticker-btn" data-emoji="😂"  type="button">😂</button>
      <button class="sticker-btn" data-emoji="👌"  type="button">👌</button>
      <button class="sticker-btn" data-emoji="✌️"  type="button">✌️</button>
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
//step 6 pen status
const THIN = 2;
const THICK = 8;
let currentWidth = THIN; // default pen width
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#222";

//step 6 thin%thick buttom
const thinBtn = document.getElementById("thin-btn") as HTMLButtonElement;
const thickBtn = document.getElementById("thick-btn") as HTMLButtonElement;

function selectTool(width: number) {
  currentWidth = width;

  thinBtn.classList.toggle("selectedTool", width === THIN);
  thickBtn.classList.toggle("selectedTool", width === THICK);

  // notify tool change
  canvas.dispatchEvent(new CustomEvent("tool-moved"));
}

thinBtn.addEventListener("click", () => selectTool(THIN));
thickBtn.addEventListener("click", () => selectTool(THICK));

selectTool(currentWidth);

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

//Step 7: tool preview object
interface PreviewDrawable {
  set(x: number, y: number): void; // preview center
  draw(ctx: CanvasRenderingContext2D): void;
  clear?(): void;
}

// step 7 create tool preview
function createToolPreview(getWidth: () => number): PreviewDrawable {
  let pos: Point | null = null;

  return {
    set(x: number, y: number) {
      pos = { x, y };
    },
    clear() {
      pos = null;
    },
    draw(ctx: CanvasRenderingContext2D) {
      if (!pos) return;

      const r = Math.max(3, getWidth() / 2 * 3);
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);

      //
      const prevAlpha = ctx.globalAlpha;
      const prevDash = ctx.getLineDash();
      const prevWidth = ctx.lineWidth;
      const prevStyle = ctx.strokeStyle;

      ctx.globalAlpha = 1.0;
      ctx.getLineDash();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#0e021bff";

      ctx.stroke();

      // 还原
      ctx.setLineDash(prevDash);
      ctx.globalAlpha = prevAlpha;
      ctx.lineWidth = prevWidth;
      ctx.strokeStyle = prevStyle;

      ctx.restore();
    },
  };
}

const strokes: DisplayCommand[] = []; // store the "dots"
let currentStroke: DisplayCommand | null = null; // current dot

const redoStack: DisplayCommand[] = [];

const preview = createToolPreview(() => currentWidth);

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
  currentStroke = createMarkerLine(currentWidth);
  strokes.push(currentStroke);
  currentStroke.drag!(x, y);

  //clearing
  redoStack.length = 0;

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getPos(e);
  //step 7 display preview
  if (drawing && currentStroke) {
    currentStroke.drag!(x, y);
    canvas.dispatchEvent(new CustomEvent("drawing-changed"));
  } else {
    preview.set(x, y);
    canvas.dispatchEvent(new CustomEvent("tool-moved"));
  }
});

// prevent drawing out of canvas
canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentStroke = null;
});

canvas.addEventListener("mouseleave", () => {
  drawing = false;
  currentStroke = null;
  // step 7 clear preview
  preview.clear?.();
  canvas.dispatchEvent(new CustomEvent("tool-moved"));
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

// step 7 redraw preview
canvas.addEventListener("tool-moved", redraw);

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

  // step 7 draw preview
  if (!drawing) {
    preview.draw(ctx);
  }
}

clearBtn.addEventListener("click", () => {
  strokes.length = 0;
  redoStack.length = 0;
  currentStroke = null;

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});
