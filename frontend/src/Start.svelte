<script>
  import { onMount } from "svelte";
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

  let showComponent = "filemanager";
  let midSize = null;

  onMount(() => {
    midSize = window.innerHeight - 75;
  });

  function switchView(v) {
    showComponent = v.detail.view;
  }
</script>

<svelte:window
  on:keydown={(e) => {
    $ctrlKey = e.ctrlKey;
    $shiftKey = e.shiftKey;
    $metaKey = e.metaKey;
    $altKey = e.altKey;
    $key = e.key;
    if (($skipKey && e.key === "Enter") || showComponent !== "filemanager") {
      $keyProcess = true;
    } else {
      if ($keyProcess) {
        e.preventDefault();
        if ($processKey !== null) $processKey();
      }
    }
    $skipKey = false;
  }}
  on:keyup={(e) => {
    $ctrlKey = e.ctrlKey;
    $shiftKey = e.shiftKey;
    $metaKey = e.metaKey;
    $altKey = e.altKey;
  }}
  on:resize={() => {
    midSize = window.innerHeight - 75;
  }}
  on:beforeunload|preventDefault={() => {
    window.go.main.App.Quit();
  }}
/>

<div id="bodyContainer">
  <TitleBar />

  <FileManager on:switchView={switchView} mid={midSize} />

  <StatusLine />
</div>

{#if showComponent === "preferences"}
  <Preferences on:switchView={switchView} />
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
