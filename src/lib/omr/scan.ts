// OMR scanning engine — pure JS/canvas, no external CV library.
// Pipeline:
//   1. load photo → canvas (downscaled)
//   2. grayscale + threshold → binary "dark" mask
//   3. find the 4 corner registration marks (largest dark blob per corner)
//   4. solve the homography sheet-mm → image-px from the 4 mark centers
//   5. sample every bubble's fill ratio at its exact layout position
//   6. decide marked / blank / ambiguous per question and per ID digit

import { OmrExam } from "@/types/exam";
import { MARKS, ORIENT_MARK, BUBBLE_R, idBubble, questionBubble } from "@/lib/omr/layout";

export interface OmrScanRaw {
  studentNumber: string;      // "" digits that were readable, in order
  answers: number[];          // per question: choice index, -1 blank, -2 ambiguous
  markQuality: number;        // 0..1 how well the corner marks were found
  debug?: {
    threshold: number;
    corners: { x: number; y: number }[];
    rotation: number;         // index of winning rotation (0=0°,1=90°,2=180°,3=270°)
    orientDot: number;
    sampleRatios: number[];   // fill ratios of the first question's choices
  };
}

const MAX_DIM = 1700;

export async function scanAnswerSheet(file: File | Blob, exam: OmrExam): Promise<OmrScanRaw> {
  const img = await loadImage(file);
  const { data, w, h } = drawToCanvas(img);

  const gray = toGray(data, w, h);
  const thr = otsu(gray);
  const dark = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) dark[i] = gray[i] < thr ? 1 : 0;

  // --- find corner marks ---
  const corners = findCornerMarks(dark, w, h);
  if (!corners) throw new Error("لم يتم العثور على علامات المحاذاة الأربع — صوّر الورقة كاملة بإضاءة جيدة");

  // --- resolve orientation ---
  // Four identical corner squares are rotationally ambiguous: an upside-down
  // photo still yields a valid homography. Try all 4 rotation assignments and
  // keep the one where the orientation anchor (next to the sheet's TL mark)
  // actually reads dark.
  const src = MARKS.map((m) => [m.x, m.y] as [number, number]);
  // image corners in [TL,TR,BL,BR] order → sheet corners under each rotation
  const ROTATIONS: number[][] = [
    [0, 1, 2, 3], // 0°
    [1, 3, 0, 2], // 90°  (sheet TL appears at image TR)
    [3, 2, 1, 0], // 180°
    [2, 0, 3, 1], // 270°
  ];
  let H: number[] | null = null;
  let bestDot = 0;
  let bestRotation = -1;
  for (let ri = 0; ri < ROTATIONS.length; ri++) {
    const perm = ROTATIONS[ri];
    const dst = perm.map((i) => [corners[i].x, corners[i].y] as [number, number]);
    let Hc: number[];
    try { Hc = solveHomography(src, dst); } catch { continue; }
    const dot = sampleSquare(dark, w, h, Hc, ORIENT_MARK.x, ORIENT_MARK.y, ORIENT_MARK.size * 0.35);
    if (dot > bestDot) { bestDot = dot; H = Hc; bestRotation = ri; }
  }
  if (!H || bestDot < 0.5) {
    throw new Error("تعذّر تحديد اتجاه الورقة — تأكد أن المربع الصغير بجانب علامة الزاوية ظاهر");
  }

  // --- sample bubbles ---
  const fillAt = (mmX: number, mmY: number): number => {
    // sample a disc of radius 0.72*r in sheet space
    let darkCount = 0, total = 0;
    const steps = 6;
    for (let dy = -steps; dy <= steps; dy++) {
      for (let dx = -steps; dx <= steps; dx++) {
        const rx = (dx / steps) * BUBBLE_R * 0.72;
        const ry = (dy / steps) * BUBBLE_R * 0.72;
        if (rx * rx + ry * ry > BUBBLE_R * BUBBLE_R * 0.52) continue;
        const [px, py] = applyH(H, mmX + rx, mmY + ry);
        const ix = Math.round(px), iy = Math.round(py);
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
        total++;
        if (dark[iy * w + ix]) darkCount++;
      }
    }
    return total > 0 ? darkCount / total : 0;
  };

  // student number
  let studentNumber = "";
  for (let col = 0; col < exam.studentIdDigits; col++) {
    const ratios: number[] = [];
    for (let d = 0; d <= 9; d++) {
      const p = idBubble(exam, col, d);
      ratios.push(fillAt(p.x, p.y));
    }
    const digit = pickOne(ratios);
    studentNumber += digit >= 0 ? String(digit) : "؟";
  }

  // answers
  const answers: number[] = [];
  for (let q = 0; q < exam.questionCount; q++) {
    const ratios: number[] = [];
    for (let c = 0; c < exam.choiceCount; c++) {
      const p = questionBubble(exam, q, c);
      ratios.push(fillAt(p.x, p.y));
    }
    answers.push(pickOne(ratios));
  }

  const debugRatios: number[] = [];
  for (let c = 0; c < exam.choiceCount; c++) {
    const p = questionBubble(exam, 0, c);
    debugRatios.push(fillAt(p.x, p.y));
  }

  return {
    studentNumber, answers, markQuality: bestDot,
    debug: { threshold: thr, corners, rotation: bestRotation, orientDot: bestDot, sampleRatios: debugRatios },
  };
}

// mean darkness of a small square patch (sheet-mm space) under homography H
function sampleSquare(
  dark: Uint8Array, w: number, h: number,
  H: number[], mmX: number, mmY: number, halfSize: number,
): number {
  let darkCount = 0, total = 0;
  const steps = 5;
  for (let dy = -steps; dy <= steps; dy++) {
    for (let dx = -steps; dx <= steps; dx++) {
      const [px, py] = applyH(H, mmX + (dx / steps) * halfSize, mmY + (dy / steps) * halfSize);
      const ix = Math.round(px), iy = Math.round(py);
      if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
      total++;
      if (dark[iy * w + ix]) darkCount++;
    }
  }
  return total > 0 ? darkCount / total : 0;
}

// pick the single filled bubble: index, or -1 blank, -2 ambiguous
function pickOne(ratios: number[]): number {
  const FILL_MIN = 0.45;
  const MARGIN = 0.18;
  let best = -1, bestV = 0, second = 0;
  ratios.forEach((v, i) => {
    if (v > bestV) { second = bestV; bestV = v; best = i; }
    else if (v > second) second = v;
  });
  if (bestV < FILL_MIN) return -1;
  if (second >= FILL_MIN && bestV - second < MARGIN) return -2;
  return best;
}

// ---------- image helpers ----------

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تعذّر قراءة الصورة")); };
    img.src = url;
  });
}

function drawToCanvas(img: HTMLImageElement): { data: Uint8ClampedArray; w: number; h: number } {
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

function toGray(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const g = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < g.length; i++, p += 4) {
    g[i] = (data[p] * 3 + data[p + 1] * 6 + data[p + 2]) / 10;
  }
  return g;
}

function otsu(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; thr = t; }
  }
  return thr;
}

// ---------- registration marks ----------

interface Pt { x: number; y: number }

// find the largest dark blob near each corner (search window = 30% of dims)
function findCornerMarks(dark: Uint8Array, w: number, h: number): Pt[] | null {
  const win = { w: Math.floor(w * 0.3), h: Math.floor(h * 0.3) };
  const regions = [
    { x0: 0, y0: 0 },                              // TL
    { x0: w - win.w, y0: 0 },                      // TR
    { x0: 0, y0: h - win.h },                      // BL
    { x0: w - win.w, y0: h - win.h },              // BR
  ];
  const out: Pt[] = [];
  const visited = new Uint8Array(w * h);
  const minSize = (w * h) * 0.0002; // mark ≈ 0.16% of page area
  const maxSize = (w * h) * 0.02;

  for (const r of regions) {
    let best: { size: number; cx: number; cy: number } | null = null;
    for (let y = r.y0; y < r.y0 + win.h; y += 2) {
      for (let x = r.x0; x < r.x0 + win.w; x += 2) {
        const idx = y * w + x;
        if (!dark[idx] || visited[idx]) continue;
        // BFS flood fill — always consume the WHOLE blob, even oversized ones.
        // Breaking early would leave unvisited fragments of a huge background
        // blob that later get picked up as fake "marks".
        let size = 0, sx = 0, sy = 0;
        let minX = x, maxX = x, minY = y, maxY = y;
        const stack = [idx];
        visited[idx] = 1;
        while (stack.length) {
          const i = stack.pop()!;
          const iy = Math.floor(i / w), ix = i % w;
          size++; sx += ix; sy += iy;
          if (ix < minX) minX = ix; if (ix > maxX) maxX = ix;
          if (iy < minY) minY = iy; if (iy > maxY) maxY = iy;
          // 4-neighbours
          const nbs = [i - 1, i + 1, i - w, i + w];
          for (const n of nbs) {
            if (n < 0 || n >= dark.length || visited[n] || !dark[n]) continue;
            const ny = Math.floor(n / w), nx = n % w;
            if (nx < r.x0 || nx >= r.x0 + win.w || ny < r.y0 || ny >= r.y0 + win.h) continue;
            visited[n] = 1;
            stack.push(n);
          }
        }
        if (size <= minSize || size >= maxSize) continue;
        // shape check: registration marks are solid squares.
        const bw = maxX - minX + 1, bh = maxY - minY + 1;
        const aspect = bw / bh;
        const density = size / (bw * bh);
        if (aspect < 0.6 || aspect > 1.7 || density < 0.65) continue;
        if (!best || size > best.size) {
          best = { size, cx: sx / size, cy: sy / size };
        }
      }
    }
    if (!best) return null;
    out.push({ x: best.cx, y: best.cy });
  }
  return out;
}

// ---------- homography ----------

// Solve H (3x3, h33=1) such that dst ~ H * src for 4 point pairs.
function solveHomography(src: [number, number][], dst: [number, number][]): number[] {
  // build 8x9 system A * h = 0 → solve 8x8 with h33=1
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const hv = gaussianSolve(A, b);
  return [...hv, 1]; // h11..h32, h33=1
}

function gaussianSolve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // pivot
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const p = M[col][col];
    if (Math.abs(p) < 1e-10) throw new Error("تعذّر حساب المنظور — أعد التصوير");
    for (let c = col; c <= n; c++) M[col][c] /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

function applyH(H: number[], x: number, y: number): [number, number] {
  const d = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / d, (H[3] * x + H[4] * y + H[5]) / d];
}
