import { writable } from 'svelte/store';

export const currentCursor = writable({
  pane: 'right',
  entry: {}
});

