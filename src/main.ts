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
      <span id="stickers-host"></span>
      <button id="add-sticker-btn" type="button">＋ Custom</button>
      <button id="undo-btn" type="button">Undo</button>
      <button id="redo-btn" type="button">Redo</button>
      <button id="clear-btn" type="button">Clear</button>
      <button id="export-btn" type="button">Export</button>
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

// step 10 export buttom
const exportBtn = document.getElementById("export-btn") as HTMLButtonElement;

//step 8
/*
const stickerBtns = document.querySelectorAll<HTMLButtonElement>(
  ".sticker-btn",
);
*/

// tool mode
const TOOL_MARKER = "marker" as const;
const TOOL_STICKER = "sticker" as const;
let currentTool: "marker" | "sticker" = TOOL_MARKER;

// sticker state
let currentSticker = "😂";
const currentStickerSize = 48;

// types of pen
//step 6 pen status
const THIN = 2;
const THICK = 8;
let currentWidth = THIN; // default pen width

// Step 9: data-driven stickers
const stickers: string[] = ["😂", "👌", "✌️"];
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#222";

//step 6 thin%thick buttom
const thinBtn = document.getElementById("thin-btn") as HTMLButtonElement;
const thickBtn = document.getElementById("thick-btn") as HTMLButtonElement;

// step 9 render sticker buttom
const stickersHost = document.getElementById(
  "stickers-host",
) as HTMLSpanElement;
const addStickerBtn = document.getElementById(
  "add-sticker-btn",
) as HTMLButtonElement;

function renderStickers() {
  stickersHost.innerHTML = stickers
    .map((s) =>
      `<button class="sticker-btn" data-emoji="${s}" type="button">${s}</button>`
    )
    .join("");
}
renderStickers();

// step 9: use event delegation to handle sticker button clicks
stickersHost.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("button.sticker-btn") as
    | HTMLButtonElement
    | null;
  if (!btn) return;

  currentTool = TOOL_STICKER;
  currentSticker = btn.dataset.emoji ?? stickers[0];

  preview = stickerPreview;
  canvas.dispatchEvent(new CustomEvent("tool-moved"));
});

addStickerBtn.addEventListener("click", () => {
  const value = prompt("Enter a sticker (emoji or short text):", "🙂");
  if (!value) return; // 取消或空串就不添加
  stickers.push(value); // 加入数据源
  renderStickers(); // 重新渲染按钮

  // 选中新贴纸并切到贴纸工具
  currentTool = TOOL_STICKER;
  currentSticker = value;
  preview = stickerPreview;
  canvas.dispatchEvent(new CustomEvent("tool-moved"));
});

function selectTool(width: number) {
  currentWidth = width;

  currentTool = TOOL_MARKER;
  thinBtn.classList.toggle("selectedTool", width === THIN);
  thickBtn.classList.toggle("selectedTool", width === THICK);

  preview = markerPreview;
  // notify tool change
  canvas.dispatchEvent(new CustomEvent("tool-moved"));
}

thinBtn.addEventListener("click", () => selectTool(THIN));
thickBtn.addEventListener("click", () => selectTool(THICK));

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

// step8: create sticker command
function createStickerCommand(emoji: string, size: number): DisplayCommand {
  let pos: Point | null = null;

  return {
    drag(x: number, y: number) {
      pos = { x, y };
    },
    display(ctx: CanvasRenderingContext2D) {
      if (!pos) return;
      const prev = {
        font: ctx.font,
        align: ctx.textAlign,
        base: ctx.textBaseline,
        alpha: ctx.globalAlpha,
        fill: ctx.fillStyle as string,
      };

      ctx.font =
        `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = "#000";
      ctx.fillText(emoji, pos.x, pos.y);

      ctx.font = prev.font;
      ctx.textAlign = prev.align;
      ctx.textBaseline = prev.base;
      ctx.globalAlpha = prev.alpha;
      ctx.fillStyle = prev.fill;
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

//step 8 create sticker preview
function createStickerPreview(
  getEmoji: () => string,
  getSize: () => number,
): PreviewDrawable {
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
      const emoji = getEmoji();
      const size = getSize();

      const prev = {
        font: ctx.font,
        align: ctx.textAlign,
        base: ctx.textBaseline,
        alpha: ctx.globalAlpha,
      };

      ctx.font =
        `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.6;
      ctx.fillText(emoji, pos.x, pos.y);

      ctx.font = prev.font;
      ctx.textAlign = prev.align;
      ctx.textBaseline = prev.base;
      ctx.globalAlpha = prev.alpha;
    },
  };
}

const strokes: DisplayCommand[] = []; // store the "dots"
let currentStroke: DisplayCommand | null = null; // current dot

const redoStack: DisplayCommand[] = [];

//const preview = createToolPreview(() => currentWidth);

//step 8 update preview tool when tool changed
const markerPreview = createToolPreview(() => currentWidth);
const stickerPreview = createStickerPreview(
  () => currentSticker,
  () => currentStickerSize,
);

let preview: PreviewDrawable = markerPreview;

selectTool(currentWidth);

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

  redoStack.length = 0;

  if (currentTool === "marker") {
    // 创建一个 marker 线条
    currentStroke = createMarkerLine(currentWidth);
    strokes.push(currentStroke);
    currentStroke.drag!(x, y);
  } else if (currentTool === "sticker") {
    currentStroke = createStickerCommand(currentSticker, currentStickerSize); // 传入 size，而不是 x
    strokes.push(currentStroke);
    currentStroke.drag!(x, y);
  }

  canvas.dispatchEvent(new CustomEvent("drawing-changed"));
});
/*
// step8: sticker tool selected
stickerBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentTool = TOOL_STICKER;
    currentSticker = btn.dataset.emoji ?? "😂";
    preview = stickerPreview;
    canvas.dispatchEvent(new CustomEvent("tool-moved"));
  });
});
*/

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

// step 10: export button
exportBtn.addEventListener("click", () => {
  const SCALE = 1024 / canvas.width; //  x4 in this case
  const out = document.createElement("canvas");
  out.width = 1024;
  out.height = 1024;
  const octx = out.getContext("2d");
  if (!octx) return;

  // white background
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, out.width, out.height);

  // copy from the main canvas context
  octx.lineCap = ctx.lineCap;
  octx.lineJoin = ctx.lineJoin;
  octx.strokeStyle = ctx.strokeStyle;

  octx.scale(SCALE, SCALE);

  for (const cmd of strokes) {
    cmd.display(octx);
  }

  // save to PNG
  const url = out.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "drawing-1024.png";
  // trigger download
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});
