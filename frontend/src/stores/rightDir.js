import { writable } from 'svelte/store';

export const rightDir = writable({
  fileSystemType: 'local',
  fileSystem: null,
  path: ''
});

