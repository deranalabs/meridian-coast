// Wardrobe: hair and hats, tops, bottoms, outerwear, shoes and accessories as attachable pieces per bone.
import * as THREE from '../../vendor/three.module.min.js';
import { loft, inflate, sliceRings } from './loft.js';
import { PROFILES, piece } from './bodyparts.js';
import { PART, SLOT, COLOUR } from '../palette.js';
import { composeMatrix } from '../core/meshbuilder.js';

export const HAIR_STYLES = ['crop', 'buzz', 'long', 'ponytail', 'bun', 'afro', 'curls', 'cap', 'beanie', 'sunhat'];
export const TOPS = ['tee', 'tank', 'longsleeve', 'hoodie', 'shirt', 'polo', 'sweater', 'crop'];
export const BOTTOMS = ['jeans', 'shorts', 'skirt', 'cargo', 'joggers', 'longskirt'];
export const OUTERWEAR = ['bomber', 'denim', 'blazer', 'vest', 'windbreaker'];
export const SHOES = ['hitops', 'sneakers', 'boots', 'sandals', 'loafers'];
export const ACCESSORIES = ['sunglasses', 'backpack', 'bag', 'chain'];
/** Variant id meaning "nothing in this slot". */
export const NONE = 99;

const ARMS = [[PART.upperArmL, PART.forearmL, 1], [PART.upperArmR, PART.forearmR, -1]];
const LEGS = [[PART.thighL, PART.shinL], [PART.thighR, PART.shinR]];

function placed(geometry, position, rotation = [0, 0, 0], scale = 1) {
  geometry.applyMatrix4(composeMatrix(position, rotation, scale));
  return geometry;
}

function shell(profile, y0, y1, factor, extra, options = {}) {
  return loft(inflate(sliceRings(profile, y0, y1), factor, extra), { segments: 9, ...options });
}

function hairPieces(out) {
  const slot = SLOT.hair;
  const add = (variant, geometry, channel = COLOUR.hair, rough = 0.85) => {
    out.push(piece(geometry, PART.head, slot, variant, channel, rough));
  };
  const cap = (extra, from = 0.115) => {
    const rings = sliceRings(PROFILES.head, from, 0.24).map(([y, rx, rz, cx, cz]) => [y, rx, rz, cx ?? 0,
      (cz ?? 0) - 0.012 * (1 - (y - from) / (0.24 - from))]);
    return loft(inflate(rings, 1.0, extra), { segments: 11, capStart: false });
  };
  HAIR_STYLES.forEach((style, variant) => {
    if (style === 'crop') add(variant, cap(0.009));
    if (style === 'buzz') add(variant, cap(0.004, 0.125));
    if (style === 'long') {
      add(variant, cap(0.012, 0.1));
      const drape = loft([[0.2, 0.095, 0.1], [0.08, 0.1, 0.1], [-0.08, 0.11, 0.08]], { arc: Math.PI * 1.1 });
      add(variant, placed(drape, [0, 0, -0.012], [0, Math.PI, 0]));
    }
    if (style === 'ponytail') {
      add(variant, cap(0.009));
      add(variant, placed(loft([[0, 0.025, 0.025], [-0.08, 0.03, 0.03], [-0.2, 0.012, 0.014]], { segments: 8 }),
        [0, 0.19, -0.1], [-0.5, 0, 0]));
    }
    if (style === 'bun') {
      add(variant, cap(0.008));
      add(variant, placed(new THREE.SphereGeometry(0.045, 10, 8), [0, 0.235, -0.06]));
    }
    if (style === 'afro') add(variant, placed(new THREE.SphereGeometry(0.135, 14, 10), [0, 0.165, -0.015], [0, 0, 0],
      [1, 0.9, 1.02]), COLOUR.hair, 0.95);
    if (style === 'curls') {
      add(variant, cap(0.012));
      for (let k = 0; k < 9; k += 1) {
        const angle = (k / 9) * Math.PI * 2;
        add(variant, placed(new THREE.SphereGeometry(0.032, 7, 5), [Math.cos(angle) * 0.06, 0.225,
          Math.sin(angle) * 0.065 - 0.01]), COLOUR.hair, 0.95);
      }
    }
    if (style === 'cap') {
      add(variant, cap(0.014, 0.15), COLOUR.accent, 0.7);
      add(variant, placed(new THREE.CylinderGeometry(0.095, 0.095, 0.008, 14, 1, false, -Math.PI / 2, Math.PI),
        [0, 0.162, 0.07], [0.12, 0, 0], [1, 1, 0.9]), COLOUR.accent, 0.7);
      add(variant, cap(0.006, 0.11));
    }
    if (style === 'beanie') {
      add(variant, cap(0.016, 0.13), COLOUR.accent, 0.95);
      add(variant, placed(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 14, 1, true), [0, 0.15, -0.006]),
        COLOUR.accent, 0.95);
    }
    if (style === 'sunhat') {
      add(variant, placed(new THREE.CylinderGeometry(0.09, 0.1, 0.09, 14), [0, 0.235, -0.008]), COLOUR.accent, 0.9);
      add(variant, placed(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 18), [0, 0.19, -0.008]), COLOUR.accent, 0.9);
      add(variant, cap(0.006, 0.12));
    }
  });
}

function sleeves(out, slot, variant, channel, upperTo, foreTo, factor, extra, rough) {
  for (const [upper, fore] of ARMS) {
    out.push(piece(shell(PROFILES.upperArm, 0.02, upperTo, factor, extra, { capStart: false, capEnd: false }),
      upper, slot, variant, channel, rough));
    out.push(piece(placed(new THREE.SphereGeometry(0.06 + extra * 0.8, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      [0, -0.012, 0]), upper, slot,
      variant, channel, rough));
    if (foreTo !== null) {
      out.push(piece(shell(PROFILES.forearm, 0.015, foreTo, factor, extra, { capStart: false, capEnd: false }),
        fore, slot, variant, channel, rough));
    }
  }
}

function bodyShell(out, slot, variant, channel, factor, extra, rough, { abdomen = true, hem = 0.0 } = {}) {
  out.push(piece(shell(PROFILES.torso, -0.01, 0.26, factor, extra, { capStart: false }), PART.torso, slot, variant,
    channel, rough));
  if (abdomen) {
    out.push(piece(shell(PROFILES.abdomen, -0.02, 0.2, factor, extra, { capStart: false, capEnd: false }),
      PART.abdomen, slot, variant, channel, rough));
    out.push(piece(shell(PROFILES.pelvis, hem, 0.08, factor, extra + 0.004, { capStart: false, capEnd: false }),
      PART.pelvis, slot, variant, channel, rough));
  }
}

function collar(out, slot, variant, channel, radius, height) {
  out.push(piece(placed(new THREE.CylinderGeometry(radius * 0.9, radius, height, 14, 1, true), [0, 0.268, -0.006]),
    PART.torso, slot, variant, channel, 0.7));
}

function topPieces(out) {
  const slot = SLOT.top;
  TOPS.forEach((style, variant) => {
    const c = COLOUR.top;
    if (style === 'tee') {
      bodyShell(out, slot, variant, c, 1.0, 0.008, 0.85);
      sleeves(out, slot, variant, c, -0.13, null, 1.18, 0.006, 0.85);
    }
    if (style === 'tank') {
      bodyShell(out, slot, variant, c, 1.0, 0.007, 0.85);
      collar(out, slot, variant, COLOUR.topTrim, 0.07, 0.012);
    }
    if (style === 'longsleeve' || style === 'sweater') {
      const extra = style === 'sweater' ? 0.016 : 0.008;
      bodyShell(out, slot, variant, c, 1.02, extra, 0.95);
      sleeves(out, slot, variant, c, -0.28, -0.235, 1.05, extra, 0.95);
      if (style === 'sweater') {
        out.push(piece(shell(PROFILES.pelvis, -0.02, 0.02, 1.04, extra + 0.006, { capStart: false, capEnd: false }),
          PART.pelvis, slot, variant, COLOUR.topTrim, 0.95));
      }
    }
    if (style === 'hoodie') {
      bodyShell(out, slot, variant, c, 1.05, 0.016, 0.95);
      sleeves(out, slot, variant, c, -0.28, -0.24, 1.08, 0.014, 0.95);
      const hood = loft([[0.22, 0.1, 0.09], [0.3, 0.11, 0.1], [0.36, 0.08, 0.07]], { arc: Math.PI * 1.2 });
      out.push(piece(placed(hood, [0, 0, -0.03], [0, Math.PI, 0]), PART.torso, slot, variant, c, 0.95));
      out.push(piece(placed(new THREE.BoxGeometry(0.17, 0.08, 0.02), [0, 0.08, 0.104]), PART.abdomen, slot, variant,
        COLOUR.topTrim, 0.95));
    }
    if (style === 'shirt' || style === 'polo') {
      bodyShell(out, slot, variant, c, 1.02, 0.009, 0.8);
      sleeves(out, slot, variant, c, -0.15, null, 1.2, 0.006, 0.8);
      collar(out, slot, variant, COLOUR.topTrim, 0.072, 0.03);
      out.push(piece(placed(new THREE.BoxGeometry(0.02, 0.24, 0.006), [0, 0.13, 0.117]), PART.torso, slot, variant,
        COLOUR.topTrim, 0.7));
    }
    if (style === 'crop') {
      out.push(piece(shell(PROFILES.torso, 0.03, 0.26, 1.0, 0.008, { capStart: false }), PART.torso, slot, variant, c,
        0.85));
      sleeves(out, slot, variant, c, -0.1, null, 1.15, 0.006, 0.85);
    }
  });
}

function legs(out, slot, variant, channel, thighTo, shinTo, factor, extra, rough) {
  for (const [thigh, shin] of LEGS) {
    out.push(piece(shell(PROFILES.thigh, 0.03, thighTo, factor, extra, { capStart: false, capEnd: false }), thigh,
      slot, variant, channel, rough));
    if (shinTo !== null) {
      out.push(piece(shell(PROFILES.shin, 0.015, shinTo, factor, extra, { capStart: false, capEnd: false }), shin,
        slot, variant, channel, rough));
    }
  }
}

function bottomPieces(out) {
  const slot = SLOT.bottom;
  BOTTOMS.forEach((style, variant) => {
    const c = COLOUR.bottom;
    out.push(piece(shell(PROFILES.pelvis, -0.125, 0.06, 1.0, 0.012), PART.pelvis, slot, variant, c, 0.85));
    out.push(piece(shell(PROFILES.pelvis, 0.055, 0.078, 1.0, 0.016, { capStart: false, capEnd: false }), PART.pelvis,
      slot, variant, COLOUR.accent, 0.5));
    if (style === 'jeans') legs(out, slot, variant, c, -0.44, -0.39, 1.0, 0.014, 0.88);
    if (style === 'cargo') {
      legs(out, slot, variant, c, -0.44, -0.39, 1.06, 0.016, 0.9);
      for (const thigh of [PART.thighL, PART.thighR]) {
        const side = thigh === PART.thighL ? 1 : -1;
        out.push(piece(placed(new THREE.BoxGeometry(0.03, 0.12, 0.1), [side * 0.085, -0.22, 0]), thigh, slot, variant,
          c, 0.9));
      }
    }
    if (style === 'joggers') legs(out, slot, variant, c, -0.44, -0.38, 1.05, 0.016, 0.95);
    if (style === 'shorts') legs(out, slot, variant, c, -0.21, null, 1.18, 0.012, 0.85);
    if (style === 'skirt' || style === 'longskirt') {
      const length = style === 'skirt' ? -0.36 : -0.62;
      const flare = style === 'skirt' ? 0.22 : 0.27;
      const skirt = loft([[0.05, 0.16, 0.11], [-0.1, 0.18, 0.13], [length, flare, flare * 0.85]],
        { segments: 16, capStart: false, capEnd: false });
      out.push(piece(skirt, PART.pelvis, slot, variant, c, 0.8));
    }
  });
}

function outerPieces(out) {
  const slot = SLOT.outer;
  OUTERWEAR.forEach((style, variant) => {
    const c = COLOUR.outer;
    if (style === 'bomber' || style === 'windbreaker') {
      const extra = style === 'bomber' ? 0.034 : 0.022;
      bodyShell(out, slot, variant, c, 1.1, extra, 0.78, { hem: -0.01 });
      out.push(piece(shell(PROFILES.pelvis, -0.02, 0.03, 1.08, extra + 0.006, { capStart: false, capEnd: false }),
        PART.pelvis, slot, variant, c, 0.95));
      sleeves(out, slot, variant, c, -0.3, -0.31, 1.22, extra * 0.8, 0.78);
      for (const [, fore] of ARMS) {
        out.push(piece(shell(PROFILES.forearm, -0.29, -0.31, 1.05, extra * 0.75, { capStart: false, capEnd: false }),
          fore, slot, variant, COLOUR.outerLining, 0.7));
      }
      collar(out, slot, variant, COLOUR.outerLining, 0.085, 0.045);
      out.push(piece(placed(new THREE.CylinderGeometry(0.098, 0.104, 0.03, 14, 1, true), [0, 0.29, -0.008]),
        PART.torso, slot, variant, c, 0.9));
      out.push(piece(placed(new THREE.BoxGeometry(0.008, 0.27, 0.006), [0, 0.12, 0.148]), PART.torso, slot, variant,
        COLOUR.accent, 0.3, 0.9));
      out.push(piece(placed(new THREE.BoxGeometry(0.008, 0.2, 0.006), [0, 0.09, 0.132]), PART.abdomen, slot, variant,
        COLOUR.accent, 0.3, 0.9));
      if (style === 'bomber') {
        for (const side of [-1, 1]) {
          const flap = new THREE.BoxGeometry(0.012, 0.09, 0.05);
          const pocket = placed(flap, [side * 0.17, 0.08, 0.07], [0, side * 0.5, 0]);
          out.push(piece(pocket, PART.abdomen, slot, variant, COLOUR.outerLining, 0.6));
        }
      } else {
        const hood = loft([[0.24, 0.1, 0.09], [0.3, 0.11, 0.1], [0.35, 0.08, 0.07]], { arc: Math.PI * 1.1 });
        out.push(piece(placed(hood, [0, 0, -0.04], [0, Math.PI, 0]), PART.torso, slot, variant, c, 0.6));
      }
    }
    if (style === 'denim' || style === 'blazer') {
      bodyShell(out, slot, variant, c, 1.04, 0.02, style === 'denim' ? 0.85 : 0.6, { hem: -0.07 });
      sleeves(out, slot, variant, c, -0.29, -0.245, 1.08, 0.016, 0.85);
      collar(out, slot, variant, c, 0.09, 0.04);
      for (const side of [-1, 1]) {
        out.push(piece(placed(new THREE.BoxGeometry(0.05, 0.2, 0.01), [side * 0.05, 0.16, 0.13], [0, 0, side * 0.35]),
          PART.torso, slot, variant, style === 'blazer' ? COLOUR.outer : COLOUR.outerLining, 0.7));
      }
    }
    if (style === 'vest') {
      bodyShell(out, slot, variant, c, 1.08, 0.03, 0.55, { hem: -0.02 });
      for (let k = 0; k < 4; k += 1) {
        out.push(piece(placed(new THREE.CylinderGeometry(0.205, 0.205, 0.008, 14, 1, true), [0, 0.04 + k * 0.06, 0],
          [0, 0, 0], [1, 1, 0.66]), PART.torso, slot, variant, COLOUR.outerLining, 0.6));
      }
    }
  });
}

function shoeProfile(style) {
  const shape = new THREE.Shape();
  const top = style === 'hitops' || style === 'boots' ? 0.1 : style === 'sandals' ? -0.03 : 0.02;
  shape.moveTo(-0.055, -0.045);
  shape.lineTo(0.17, -0.045);
  shape.quadraticCurveTo(0.205, -0.042, 0.2, -0.015);
  shape.quadraticCurveTo(0.17, 0.02, 0.07, 0.03);
  shape.lineTo(0.035, top);
  shape.lineTo(-0.05, top);
  shape.quadraticCurveTo(-0.07, -0.01, -0.055, -0.045);
  return shape;
}

function extrudeSide(shape, width, bevel) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 3,
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2, 0, 0);
  geometry.deleteAttribute('uv');
  return geometry;
}

function shoePieces(out) {
  const slot = SLOT.shoes;
  SHOES.forEach((style, variant) => {
    for (const bone of [PART.shoeL, PART.shoeR]) {
      if (style === 'sandals') {
        const foot = loft([[0.0, 0.04, 0.04], [-0.04, 0.045, 0.06, 0, 0.03], [-0.055, 0.04, 0.1, 0, 0.07]],
          { segments: 8 });
        out.push(piece(foot, bone, slot, variant, COLOUR.skin, 0.55));
      } else {
        const upper = extrudeSide(shoeProfile(style), style === 'boots' ? 0.085 : 0.075, 0.012);
        out.push(piece(upper, bone, slot, variant, COLOUR.shoe, style === 'loafers' ? 0.35 : 0.7));
      }
      const sole = new THREE.Shape();
      sole.moveTo(-0.07, -0.072);
      sole.lineTo(0.205, -0.072);
      sole.quadraticCurveTo(0.225, -0.06, 0.21, -0.045);
      sole.lineTo(-0.07, -0.045);
      sole.closePath();
      const thick = style === 'hitops' || style === 'sneakers' || style === 'boots';
      const soleGeometry = extrudeSide(sole, 0.088, thick ? 0.006 : 0.003);
      if (!thick) soleGeometry.scale(1, 0.6, 1);
      out.push(piece(soleGeometry, bone, slot, variant, COLOUR.shoeSole, 0.85));
      if (style === 'sandals') {
        out.push(piece(placed(new THREE.BoxGeometry(0.1, 0.012, 0.03), [0, -0.035, 0.09]), bone, slot, variant,
          COLOUR.shoe, 0.6));
      }
      if (style === 'hitops' || style === 'sneakers') {
        const side = bone === PART.shoeL ? 1 : -1;
        out.push(piece(placed(new THREE.BoxGeometry(0.004, 0.025, 0.09), [side * 0.05, -0.012, 0.05], [0.3, 0, 0]),
          bone, slot, variant, COLOUR.accent, 0.5));
      }
    }
  });
}

function accessoryPieces(out) {
  const slot = SLOT.accessory;
  ACCESSORIES.forEach((style, variant) => {
    if (style === 'sunglasses') {
      for (const side of [-1, 1]) {
        out.push(piece(placed(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 10), [side * 0.032, 0.138, 0.1],
          [Math.PI / 2, 0, 0], [1.2, 1, 0.9]), PART.head, slot, variant, COLOUR.detail, 0.05, 0.6));
      }
      out.push(piece(placed(new THREE.BoxGeometry(0.17, 0.008, 0.008), [0, 0.15, 0.095]), PART.head, slot, variant,
        COLOUR.accent, 0.3, 0.8));
    }
    if (style === 'backpack') {
      const pack = loft([[0.0, 0.11, 0.05], [0.12, 0.13, 0.06], [0.25, 0.1, 0.045]], { segments: 10 });
      out.push(piece(placed(pack, [0, -0.02, -0.15]), PART.torso, slot, variant, COLOUR.accent, 0.75));
      for (const side of [-1, 1]) {
        out.push(piece(placed(new THREE.BoxGeometry(0.03, 0.28, 0.012), [side * 0.09, 0.13, 0.112], [0.1, 0, 0]),
          PART.torso, slot, variant, COLOUR.accent, 0.75));
      }
    }
    if (style === 'bag') {
      out.push(piece(placed(new THREE.BoxGeometry(0.06, 0.18, 0.24), [-0.2, 0.0, 0.0]), PART.pelvis, slot, variant,
        COLOUR.accent, 0.5));
      out.push(piece(placed(new THREE.TorusGeometry(0.2, 0.007, 4, 18, Math.PI), [-0.05, 0.12, 0], [0, 0, 0.7]),
        PART.torso, slot, variant, COLOUR.accent, 0.5));
    }
    if (style === 'chain') {
      out.push(piece(placed(new THREE.TorusGeometry(0.075, 0.006, 5, 18), [0, 0.255, 0.035], [1.25, 0, 0]),
        PART.torso, slot, variant, COLOUR.accent, 0.2, 1));
    }
  });
}

/** Every wardrobe piece of every variant; the crowd shader shows only the variants a character wears. */
export function buildWardrobePieces() {
  const out = [];
  hairPieces(out);
  topPieces(out);
  bottomPieces(out);
  outerPieces(out);
  shoePieces(out);
  accessoryPieces(out);
  return out;
}
