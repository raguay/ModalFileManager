<script>
  import { onMount } from "svelte";
  import { theme } from "../stores/theme.js";
  import { keyProcess } from "../stores/keyProcess.js";
  import { currentCursor } from "../stores/currentCursor.js";
  import { saved } from "../stores/saved.js";
  import { skipKey } from "../stores/skipKey.js";

  let { Entries = $bindable(), open = $bindable(), position } = $props();

  let qsInput = $state("");
  let qsInputDOM = $state(null);
  let origEntries = null;

  onMount(() => {
    if (origEntries === null) {
      $keyProcess = false;
      origEntries = Entries;
    }
  });

  $effect(() => {
    console.log("$keyProcess:  ", $keyProcess);
  });

  $effect(() => {
    if (qsInputDOM !== null) {
      qsInputDOM.focus();
    }
  });

  function exitQS(skip) {
    if (typeof skip === "undefined") skip = false;
    origEntries = null;
    open = false;
    $keyProcess = true;
    $currentCursor.entry = Entries[0];
    $currentCursor.index = 0;
    $skipKey = skip;
  }

  function processKey(e) {
    const key = e.key;

    //
    // If the Enter key, quit the quick search.
    //
    if (key === "Escape") {
      e.preventDefault();
      exitQS(false);
    } else if (key === "Enter") {
      e.preventDefault();
      exitQS(true);
    }
  }

  function processInput() {
    $saved.qs = qsInput.toLowerCase();

    //
    // filter the entries by the quick search ignoring case.
    //
    Entries = origEntries.filter((item) => {
      return item.name.toLowerCase().includes($saved.qs);
    });
  }
</script>

<div id="quickSearch" style="left: {position}px;">
  <input
    type="text"
    bind:this={qsInputDOM}
    bind:value={qsInput}
    onkeydown={processKey}
    oninput={processInput}
    onblur={() => {
      exitQS();
    }}
    style="background-color: {$theme.textColor};
                text-color: {$theme.backgroundColor};"
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
    bottom: 30px;
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
