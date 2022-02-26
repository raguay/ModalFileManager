//
// KeyProcess
//
// Description:
//                When true, keypresses will be processed for functionality. Otherwise, 
//                they will be treated as standard typing.
//

import { writable } from 'svelte/store';

export const keyProcess = writable(true);

