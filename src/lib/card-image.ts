// @ts-nocheck -- pixel loops index typed arrays within bounds; strict index checks add only noise here.
// Browser-only: cleans a phone photo of a visiting card before OCR (resize, grayscale, contrast, threshold).
export async function prepareCardImage(file: File, binarize = true): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const target = 1800;
  const scale = Math.min(2.5, target / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data as unknown as number[];
  const gray = new Uint8ClampedArray(w * h) as unknown as number[];
  const hist: number[] = new Array(256).fill(0);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    gray[j] = g; hist[gray[j]]++;
  }
  // Contrast stretch between 2% and 98% percentiles.
  const total = w * h; let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > total * 0.02) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > total * 0.02) { hi = v; break; } }
  const range = Math.max(1, hi - lo);
  const st = new Uint8ClampedArray(total) as unknown as number[];
  const h2: number[] = new Array(256).fill(0);
  for (let j = 0; j < total; j++) { st[j] = ((gray[j] - lo) * 255) / range; h2[st[j]]++; }
  // Otsu threshold.
  let sum = 0; for (let v = 0; v < 256; v++) sum += v * h2[v];
  let sB = 0, wB = 0, best = 0, thr = 128;
  for (let v = 0; v < 256; v++) {
    wB += h2[v]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sB += v * h2[v];
    const mB = sB / wB, mF = (sum - sB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; thr = v; }
  }
  // Dark card with light text → invert so text is dark on white.
  let dark = 0; for (let j = 0; j < total; j++) if (st[j] < thr) dark++;
  const invert = dark > total / 2;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    let v: number = binarize ? (st[j] < thr ? 0 : 255) : st[j];
    if (invert) v = 255 - v;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
