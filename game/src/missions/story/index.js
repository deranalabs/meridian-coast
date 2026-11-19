// Story mission registry: every playable mission definition, in story order.
import { LANTERN_RUN } from './m1-lantern-run.js';
import { SALT_AND_CHROME } from './m2-salt-and-chrome.js';
import { WHITE_VAN } from './m3-white-van.js';
import { HEADLINE } from './m4-headline.js';
import { HILL_FAVOUR } from './m5-hill-favour.js';
import { TARP_RUN } from './m6-tarp-run.js';
import { TIDE_TABLES } from './m7-tide-tables.js';
import { GILDED_TIDE } from './m8-gilded-tide.js';

/** Mission definitions in story order; each story/mN-*.js file exports one and is listed here. */
export const STORY_MISSIONS = Object.freeze([LANTERN_RUN, SALT_AND_CHROME, WHITE_VAN, HEADLINE, HILL_FAVOUR,
  TARP_RUN, TIDE_TABLES, GILDED_TIDE]);
