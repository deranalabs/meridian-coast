// Full-map palette: a half-size copy of the shared city canvas recoloured for daylight, a bright sea and warm land.
const SIZE = 1024;
// Sea pixels are pulled toward this turquoise; everything else is lifted toward white, red most, blue least.
const SEA = [52, 176, 222];
const LIFT = [0.54, 0.45, 0.3];

/** The city canvas (dark minimap colours) repainted for the full-map screen; the original is left untouched. */
export function sunnyCanvas(base) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(base, 0, 0, SIZE, SIZE);
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    if (g > r + 30 && b > g) {
      // Water: keep its shading (shallows are lighter) but in a clear Gulf blue.
      const shade = 0.92 + (g - 92) / 255;
      px[i] = Math.min(255, SEA[0] * shade);
      px[i + 1] = Math.min(255, SEA[1] * shade);
      px[i + 2] = Math.min(255, SEA[2] * shade);
    } else {
      px[i] = 255 - (255 - r) * (1 - LIFT[0]);
      px[i + 1] = 255 - (255 - g) * (1 - LIFT[1]);
      px[i + 2] = 255 - (255 - b) * (1 - LIFT[2]);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
