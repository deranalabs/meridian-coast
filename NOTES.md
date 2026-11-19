# Meridian Coast — notes after recording 1 (foundation and look)

Meridian Coast is an original open-world crime game set in **Port Meridian**, a sun-soaked coastal city at
dusk. The player is **Ilo Rask** (oversized olive bomber with orange lining, cream hi-tops). It runs from the
static files in `game/` (three.js r170 vendored as `game/vendor/three.module.min.js`, everything else written
here). No build step, no network, no image or audio files: every texture is painted on a canvas at load time.

## What exists

**Renderer and post** (`game/src/render/`)
- `renderer.js`: WebGL renderer, pixel ratio capped at 1.5, shadows, draw-call/FPS/frame-time stats.
- `post.js`: own post chain on core three: MSAA HDR target, 6-level mip bloom (13-tap down, tent up),
  contrast-adaptive sharpen, ACES fit, pink/violet split grade, contrast curve, vignette, film grain, sRGB.
- `dynamicres.js`: dynamic resolution (3D render scale 0.6–1.0 from measured frame time).
- `sky.js` (procedural dusk/night sky, sun disc, cirrus, stars), `environment.js` (PMREM env map of the sky,
  a dark ground and neon glints, so asphalt puddles and car paint reflect), `lighting.js` (low sun with a
  texel-snapped shadow box, hemisphere fill, rim light, character key light), `fog.js` (layered height haze plus
  distance fog installed into three's shader chunks), `timeofday.js` (dusk and night presets), `textures.js`.

**City** (`game/src/world/`)
- `districts.js`, `layout.js`, `roadgraph.js`, `geometry2d.js`, `heightfield.js`: four districts with their own
  block size, road width, heights and styles — **Neon Mile** (downtown towers, 16 m avenues), **Palmetto Beach**
  (pastel low hotels, boardwalk, beach), **Harbor Row** (warehouses, quay, piers, cranes), **Calder Heights**
  (hillside old town on a 30 m slope, gable roofs, winding switchback road, hill stairs). Plus the **Meridian
  Diagonal** avenue cutting Neon Mile, **Solano Park**, the **Gull Key Causeway** to an island.
- Landmarks: **Gull Key lighthouse** with a sweeping beam, **Meridian Bowl** stadium, **Marlin Crown** casino tower
  (`casino.js`, `landmarks.js`, `harbor.js`, `promenade.js`).
- Buildings (`buildings.js`, `buildingkit.js`, `facades.js`, `facadematerial.js`): podium, body, setback and
  crown per lot (parapets, cornices, gable roofs, lit glass caps). One 8x4 facade atlas (albedo, emissive,
  tint/roughness/metal) tiled in the shader with `textureGrad`; grime from noise; per-window lighting from a hash.
  The whole skyline (casino included) is **one draw call**.
- Streets: one terrain mesh blending asphalt/grass/sand with wet puddles (`terrain.js`, `surfaces.js`), raised
  sidewalk slabs with district pavers and kerb stones (`sidewalks.js`), road paint with dashed and double lines,
  crosswalks, stop lines, arrows, manholes and grates (`roads.js`), water (`water.js`).
- Props (`props.js`, `propmodels.js`, `propmaterial.js`, `instancing.js`): 25 instanced types (lamps, traffic
  lights, hydrants, bins, signs, benches, meters, news boxes, bollards, planters, palms, trees, AC units, water
  tanks, antennas, containers, bus shelters, umbrellas, loungers, lifeguard towers, awnings, billboards...),
  distance-culled on the CPU. Every block gets lamps, greenery, clutter, corner signals or signs (8+ per block).
- Neon signs and billboards (`signs.js`) with original words and ads; lamp halos, lamp light pools and coloured
  light spill from shops and neon on the pavement (`lightpools.js`).

**People** (`game/src/actors/`)
- `rig.js`: 17-part rig (the brief lists 16 parts; the 17th is an **abdomen** spine joint between pelvis and
  torso), 1.75 m at 7.3 heads (tested), five builds. `bodyparts.js` + `loft.js`: lofted anatomy, face details.
- `wardrobe.js`: 10 hair/hat styles, 8 tops, 6 bottoms, 5 outerwear (Ilo's bomber), 5 shoes, 4 accessories.
- `animation.js`: idle, walk, run, aim, flee, sit, enter and exit car, with eased cross-fades.
- `crowdmesh.js`: every character in **one instanced draw**; bones, variants and colours come from a float data
  texture, unworn variants collapse. `appearance.js` (district palettes, Ilo), `characters.js`, `pedestrians.js`.
- `player.js`: walk/run/aim on foot, E to take the nearest car (traffic releases it), drive, E to get out.

**Vehicles** (`game/src/vehicles/`): `carmodels.js` (coupe, sedan, pickup from bevelled extruded side profiles
with arches, tinted reflective glass, lit lamps, trim, five-spoke wheels), `carmaterial.js` (clear-coated paint),
`fleet.js` (one draw per type plus one for all wheels), `driving.js` (throttle, brakes, speed-sensitive steering,
handbrake drift, wall and water collisions), `traffic.js` (lane-keeping AI with junction curves and queuing),
`smoke.js` (tyre smoke), `camera.js` (low close chase camera, over-the-shoulder foot camera).

**HUD** (`game/src/ui/`): speedometer, rotating minimap with landmark blips and district name, cash, health,
one-line radio (`radio.js`, R cycles stations), car hint, title screen.

**Shared**: `palette.js` (district accents, factions, skin tones, units, part/slot/colour names), `game.js`
(assembly and one step/draw), `main.js` (loop, shot harness, `window.__meridian.getState()`), `shots.js`.

## Controls
Enter start · WASD / arrows move or drive · Shift run · Q aim · mouse look (click to lock) · E enter/exit car ·
Space handbrake · R radio.

## Shots and tests
- `node tests/browser.mjs --shots [--nohud]`: renders `?shot=drive|foot|title&seed=1` to `screenshots/`
  (1280x800 JPEG under 256 KiB); `--nohud` also writes HUD-less copies to `tmp/look/`.
- `node tests/browser.mjs --perf [--scale=1] [--dpr=N]`: live drive scene at 1440x900, real GPU.
- `node tests/look.mjs`: look metrics; `node tests/play.mjs`: gameplay smoke test (title, walk, take a car,
  drive, handbrake, stop, exit; fails on console errors); `node tests/lint.mjs`: header comments, 120 columns.
- `node --test tests/*.test.mjs game/src/**/*.test.js`: 22 unit tests (layout, geometry, road graph connectivity,
  driving, collisions, rig proportions, animation blending, dynamic resolution, look metrics). All pass.
- Debug scenes not in the screenshots: `?shot=cast` (character line-up), `?shot=aerial`; `&hide=<name>` hides
  scene parts; `window.__meridian.getMeshBudget()` lists triangles per mesh.

## Look-test numbers (768x480, final screenshots)
| shot | HUD | gradEnergy | flatBlocks | colors | brightShare | meanSat |
|---|---|---|---|---|---|---|
| 1-drive (cover) | on | 6.63 | 0.319 | 112 | 0.45 % | 0.479 |
| 1-drive (cover) | off | 5.80 | 0.382 | 103 | 0.27 % | 0.492 |
| 2-foot | on | 4.24 | 0.461 | 109 | 1.08 % | 0.488 |
| 2-foot | off | 3.79 | 0.478 | 112 | 1.04 % | 0.496 |
| 3-title | (no HUD) | 5.00 | 0.488 | 127 | 0.91 % | 0.372 |

Targets met: cover flatBlocks with the HUD (0.319 ≤ 0.33). **Not met**: cover gradEnergy (6.6 vs 7.5), colors
(112 vs 150), brightShare (0.45 % vs 1.5–4 %), meanSat (0.479 vs ≤ 0.47, just over); foot gradEnergy (4.2 vs
6.5) and flatBlocks (0.46 vs 0.40). Why: the scenes are dusk and night with one deliberate pink-violet palette,
large smooth areas (sky, asphalt, glass) and highlights compressed by ACES. Brighter, busier, more varied frames
would meet the numbers, but would trade away the look. Things that did help: thinner haze, a neutral ambient,
sharpening, grain, light spill and restaged cameras (cover gradEnergy went from 4.6 to 6.6, colors from 111 to
112, flatBlocks from 0.41 to 0.32). Next ideas: rain-wet reflections of real lights, more street clutter and
decals, and denser windows near the camera.

## Draw calls and FPS (drive scene, headless Chrome, `--use-angle=metal --ignore-gpu-blocklist`)
GPU: Apple M1 (ANGLE Metal), 1440x900 at device pixel ratio 1.5 (2160x1350 canvas).
- Draw calls: **61** per frame in the live drive scene (63–67 in the screenshot scenes). That includes the
  shadow pass and the 13 post passes; the budget is 150.
- FPS with dynamic resolution: **59.7 FPS** (16.7 ms, vsync-limited), render scale settling at 0.8–0.9.
- FPS pinned at full scale (`--scale=1`): **57.9 FPS** (17.2 ms) on the last run. Earlier runs measured 53.1 and
  about 43 FPS: this fanless laptop throttles as it warms, so expect ±10 % between runs.

## What is untested
- Sound: no audio yet (WebAudio planned for a later recording); the radio is a display only.
- Pointer-lock mouse look and aiming were not exercised by the automated tests; Q aim has no weapon yet.
- Not exercised: traffic over long sessions, the causeway, the hill road, and the stairs at speed. Pedestrians do not
  react to cars yet (the flee clip exists). Nothing tested on GPUs other than the M1.
- The minimap's large base canvas costs memory on low-end machines (2048²).

## Known issues
- The stadium plaza shows a strong puddle pattern from above; pavement puddles are a single noise layer.
- Character faces read as simple shapes beyond a few metres; hands are mitten-shaped.
- Car interiors are not modelled (the glass is opaque and tinted).
- `game/` keeps the unit tests next to the modules; the page never loads them.
