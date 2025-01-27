<script>
  import FileManager from "./components/FileManager.svelte";
  import Preferences from "./components/Preferences.svelte";
  import StatusLine from "./components/StatusLine.svelte";
  import TitleBar from "./components/TitleBar.svelte";
  import { shiftKey } from "./stores/shiftKey.js";
  import { ctrlKey } from "./stores/ctrlKey.js";
  import { metaKey } from "./stores/metaKey.js";
  import { altKey } from "./stores/altKey.js";
  import { skipKey } from "./stores/skipKey.js";
  import { key } from "./stores/key.js";
  import { processKey } from "./stores/processKey.js";
  import { keyProcess } from "./stores/keyProcess.js";

  let midSize = $state(null);
  let currentView = $state("filemanager");

  $effect(() => {
    midSize = window.innerHeight - 75;
  });
</script>

<svelte:window
  onkeydown={(e) => {
    $ctrlKey = e.ctrlKey;
    $shiftKey = e.shiftKey;
    $metaKey = e.metaKey;
    $altKey = e.altKey;
    $key = e.key;
    if (($skipKey && e.key === "Enter") || currentView !== "filemanager") {
      $keyProcess = true;
    } else {
      if ($keyProcess) {
        e.preventDefault();
        if ($processKey !== null) $processKey();
      }
    }
    $skipKey = false;
  }}
  onkeyup={(e) => {
    $ctrlKey = e.ctrlKey;
    $shiftKey = e.shiftKey;
    $metaKey = e.metaKey;
    $altKey = e.altKey;
  }}
  onresize={() => {
    midSize = window.innerHeight - 75;
  }}
  onbeforeunload={() => {
    window.go.main.App.Quit();
  }}
/>

<div id="bodyContainer">
  <TitleBar />

  <FileManager bind:view={currentView} mid={midSize} />

  <StatusLine />
</div>

{#if currentView === "preferences"}
  <Preferences bind:view={currentView} />
{/if}

<style>
  :global(body) {
    padding: 0px;
    margin: 0px;
    width: 100%;
    height: 100vh;
    user-select: none;
    overflow: hidden;
  }

  #bodyContainer {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    margin: 0px;
    padding: 0px;
    min-height: 100vh;
    min-width: 100%;
  }
</style>
