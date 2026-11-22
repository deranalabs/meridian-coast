// Hidden package rules: how many, what one pays, who reaches one, and the collected set as a save keeps it.
import { receive } from './wallet.js';

export const PACKAGE_COUNT = 20;
export const PACKAGE_PAY = 150;

/** How near counts as through it: an arm's reach on foot, half a car's width and a little more at the wheel. */
const REACH_ON_FOOT = 1.4;
const REACH_DRIVING = 2.8;

/** The indices of the packages found so far. */
export function createFound() {
  return new Set();
}

/** Take the first unfound spot within reach of `who` {x, z, driving} and pay for it; its index, or -1. */
export function collectAt(spots, found, who, wallet) {
  const reach = who.driving ? REACH_DRIVING : REACH_ON_FOOT;
  for (let index = 0; index < spots.length; index += 1) {
    if (found.has(index)) continue;
    const dx = spots[index].x - who.x;
    const dz = spots[index].z - who.z;
    if (dx * dx + dz * dz >= reach * reach) continue;
    found.add(index);
    receive(wallet, PACKAGE_PAY);
    return index;
  }
  return -1;
}

/** Any value read from a save as a sorted list of real package indices, each once. */
export function cleanFound(raw) {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((index) => Number.isInteger(index) && index >= 0 && index < PACKAGE_COUNT);
  return [...new Set(valid)].sort((a, b) => a - b);
}

/** Replace what is found with what a save holds. */
export function restoreFound(found, raw) {
  found.clear();
  for (const index of cleanFound(raw)) found.add(index);
}
