import { writable } from 'svelte/store';

export const saved = writable({
  qs: null,
  lockqs: false
});

