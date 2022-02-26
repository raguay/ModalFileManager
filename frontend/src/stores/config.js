import { writable, get } from 'svelte/store';

var confg = {
  configDir: '',
  localFS: {},
  configuration: {},
  commands: {},
  extensions: {},
  userEditor: ''
}

export const config = writable(confg);

