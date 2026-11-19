// Side activity registry: repeatable jobs that run on the mission machine and pay respect toward the ranks.
import { CAUSEWAY_SPRINT } from './street-race.js';
import { RASK_CABS } from './taxi.js';

/** Activity definitions; each is `repeat` and `activity`, numbered from 101 so story jobs sort first. */
export const ACTIVITIES = Object.freeze([CAUSEWAY_SPRINT, RASK_CABS]);
