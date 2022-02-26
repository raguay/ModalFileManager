import { writable, get } from 'svelte/store';
import { config } from '../stores/config.js';

var history = {
  histStore: [],
  addHistory: function(dir) {
    dir = new String(dir);
    var el = this.histStore.find(item => item.toLowerCase().includes(dir.toLowerCase()));
    if((typeof el === 'undefined')||(el === null)) {
      this.histStore.push(dir);
      this.saveHistory();
    }
  },
  searchHistory: function(pat) {
    return this.histStore.filter(item => item.toLowerCase().includes(pat.toLowerCase()));
  },
  saveHistory: async function() {
    const cfg = get(config);
    if((typeof cfg !== 'undefined')&&(cfg.configDir !== '')&&(typeof cfg.OS !== 'undefined')) {
      // 
      // Save the history. TODO
      //
      const hFile = await cfg.OS.appendPath(cfg.configDir, 'history.json');
      await cfg.OS.writeFile(hFile, JSON.stringify(this.histStore));
    }
  },
  loadHistory: async function() {
    const cfg = get(config);
    if((typeof cfg !== 'undefined')&&(cfg.configDir !== '')&&(typeof cfg.OS !== 'undefined')) {
      // 
      // load the history.
      //
      const hf = await cfg.OS.appendPath(cfg.configDir, 'history.json');
      if(await cfg.OS.fileExists(hf)) {
        try {
          const hFile = await cfg.OS.appendPath(cfg.configDir, 'history.json');
          this.histStore = await cfg.OS.readFile(hFile);
          this.histStore = JSON.parse(this.histStore);
        } catch(e) {
          //
          // Something was wrong with the history. Just forget it.
          //
          this.histStore = [];
        }
      } 
    }
  }
}

export const dirHistory = writable(history);

