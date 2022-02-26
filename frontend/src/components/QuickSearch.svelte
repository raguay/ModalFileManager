<div id="quickSearch" 
     style="left: {position}px;" 
>
  <input type='text' 
         bind:this={qsInputDOM}
         bind:value={qsInput} 
         on:keydown={processKey}
         on:input={processInput}
         on:blur={(e) => { exitQS(); }}
         style="background-color: {localTheme.textColor};
                text-color: {localTheme.backgroundColor};"
  />
</div>

<style>
  #quickSearch {
    position: absolute;
    display: flex;
    flex-direction: row;
    margin: 0px;
    padding: 0px;
    border: 0px solid transparent;
    height: 30px;
    max-height: 30px;
    min-height: 30px;
    width: 100px;
    max-width: 100px;
    min-width: 100px;
    bottom: 0px;
    z-index: 100;
    user-select: none;
    text-decoration: none;
  }

  #quickSearch input {
    outline-color: transparent;
    margin: auto;
    padding: 0px;
    width: 100px;
    border: 3px solid transparent;
    border-radius: 5px;
  }
</style>

<script> 
  import { onMount, beforeUpdate, createEventDispatcher, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { currentCursor } from '../stores/currentCursor.js';
  import { theme } from '../stores/theme.js';
  import { keyProcess } from '../stores/keyProcess.js';

  const dispatch = createEventDispatcher();

  export let rightDOM;
  export let leftDOM;
  export let leftEntries;
  export let rightEntries;

  let qsInput = '';
  let qsInputDOM = null;
  let cursor = null;
  let localTheme = null;
  let position = null;
  let origEntries = null;

  beforeUpdate(() => {
    if(cursor === null) {
      getDefaults();
    }
  });

  afterUpdate(() => {
    if(qsInputDOM !== null) {
      qsInputDOM.focus();
    }
  })

  onMount(() => {
    if(cursor.pane === 'left') {
      position = leftDOM.clientWidth - 100;
    } else {
      position = rightDOM.clientWidth + leftDOM.clientWidth - 85;
    }
  });

  function getDefaults() {
    cursor = get(currentCursor);
    localTheme = get( theme );
    keyProcess.set(false);
    origEntries = usingEntry(leftEntries, rightEntries);
  }

  function usingEntry(leftE, rightE) {
    if(cursor.pane === 'left') {
      return(leftE);
    } else {
      return(rightE);
    }
  }

  function exitQS(skip) {
    if(typeof skip === 'undefined') skip = false;
    cursor = null;
    dispatch('closeQuickSearch',{
      skip: skip
    });
  }

  function processKey(e) {
    const key = e.key;

    // 
    // If the Enter key, quit the quick search.
    //
    if(key === 'Escape') {
      e.preventDefault();
      exitQS(false);
    } else if(key === 'Enter') {
      e.preventDefault();
      exitQS(true);
    }
  }

  function processInput(e) {
    if(cursor === null) {
      getDefaults();    
    }

    //
    // filter the entries by the quick search ignoring case.
    // 
    var entries = origEntries;
    entries = entries.filter(item => item.name.toLowerCase().includes(qsInput.toLowerCase()));

    // 
    // Send to the panel only if there are some entries to see.
    // 
    if(entries.length > 0) {
      dispatch('changeEntries', {
        pane: cursor.pane,
        entries: entries
      });
    }
  }
</script>
