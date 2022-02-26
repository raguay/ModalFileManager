import { writable } from 'svelte/store';

export const leftDir = writable({
  fileSystemType: 'local',
  fileSystem: null,
  path: ''
});

