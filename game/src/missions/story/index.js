// Story mission registry: every playable mission definition, in story order.
import { LANTERN_RUN } from './m1-lantern-run.js';
import { SALT_AND_CHROME } from './m2-salt-and-chrome.js';
import { WHITE_VAN } from './m3-white-van.js';

/** Mission definitions in story order; each story/mN-*.js file exports one and is listed here. */
export const STORY_MISSIONS = Object.freeze([LANTERN_RUN, SALT_AND_CHROME, WHITE_VAN]);
