// WebGL renderer setup and frame stats: capped pixel ratio, shadows, draw-call and FPS counters.
import * as THREE from '../../vendor/three.module.min.js';

export const MAX_PIXEL_RATIO = 1.5;

/** Create the renderer on `canvas`; stats.frame(dt) is called once per presented frame. */
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;

  const stats = {
    drawCalls: 0,
    triangles: 0,
    fps: 0,
    frameMs: 0,
    frames: 0,
    elapsed: 0,
    begin() {
      renderer.info.reset();
    },
    end(dt) {
      stats.drawCalls = renderer.info.render.calls;
      stats.triangles = renderer.info.render.triangles;
      stats.frames += 1;
      stats.elapsed += dt;
      stats.frameMs = stats.frameMs * 0.9 + dt * 1000 * 0.1;
      if (stats.elapsed >= 0.5) {
        stats.fps = stats.frames / stats.elapsed;
        stats.frames = 0;
        stats.elapsed = 0;
      }
    },
  };

  return {
    renderer,
    stats,
    /** Drawing-buffer size in device pixels, after the pixel-ratio cap. */
    resize(width, height) {
      renderer.setSize(width, height, false);
      const ratio = renderer.getPixelRatio();
      return { width: Math.floor(width * ratio), height: Math.floor(height * ratio) };
    },
  };
}
