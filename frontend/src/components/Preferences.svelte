<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { theme } from "../stores/theme.js";
  import { config } from "../stores/config.js";
  import GeneralPrefs from "./GeneralPrefs.svelte";
  import ThemePrefs from "./ThemePrefs.svelte";
  import ExtensionPrefs from "./ExtensionPrefs.svelte";

  const dispatch = createEventDispatcher();

  let showPanel = "general";
  let vimInput = null;
  let keepBlur = true;
  let scrollDOM = null;
  let timeOut = null;
  const timeOutValue = 500;

  onMount(async () => {
    //
    // Setup the configuration directory.
    //
    if (!(await $config.OS.dirExists($config.configDir))) {
      await $config.OS.makeDir($config.configDir);
      await $config.OS.makeDir({
        dir: $config.configDir,
        name: "extensions",
        fileSystem: $config.OS,
      });
    }

    //
    // keep the input focused.
    //
    timeOut = setTimeout(focusInput, timeOutValue);

    //
    // return a command to unsubscribe from everything.
    //
    return () => {
      clearTimeout(timeOut);
    };
  });

  function switchView(view) {
    //
    // Only switch if going to the filemanager.
    //
    if (view === "filemanager") {
      dispatch("switchView", {
        view: view,
      });
    }
  }

  function exitPrefs() {
    switchView("filemanager");
  }

  function scrollDiv(amount) {
    var adj = amount * 20;

    if (scrollDOM !== null) {
      scrollDOM.scrollTop += adj;
      if (scrollDOM.scrollTop < 0) scrollDOM.scrollTop = 0;
    }
  }

  function focusInput() {
    if (vimInput !== null && keepBlur) {
      vimInput.focus();
    }
    timeOut = setTimeout(focusInput, timeOutValue);
  }
</script>

<div
  id="Preferences"
  style="background-color: {$theme.backgroundColor};
         color: {$theme.textColor};
         font-family: {$theme.font};
         font-size: {$theme.fontSize};"
>
  <input
    id="vimInputDiv"
    bind:this={vimInput}
    on:blur={() => {
      if (keepBlur && vimInput !== null) {
        vimInput.focus();
      }
    }}
    on:keydown={(e) => {
      if (keepBlur) {
        e.preventDefault();
        switch (e.key) {
          case "g":
            showPanel = "general";
            break;
          case "t":
            showPanel = "theme";
            break;
          case "e":
            showPanel = "extension";
            break;
          case "ArrowUp":
          case "k":
            scrollDiv(-1);
            break;
          case "ArrowDown":
          case "j":
            scrollDiv(1);
            break;
          case "Escape":
            keepBlur = false;
            exitPrefs();
            break;
          default:
            break;
        }
      }
    }}
  />
  <h2 style="--wails-draggable: drag;">Modal File Manager: Preferences</h2>
  <ul>
    {#if showPanel === "general"}
      <li
        on:click={(e) => {
          showPanel = "general";
        }}
        style="border-color: {$theme.textColor};
               background-color: {$theme.textColor};
               color: {$theme.backgroundColor};"
      >
        General
      </li>
    {:else}
      <li
        on:click={(e) => {
          showPanel = "general";
        }}
        style="border-color: {$theme.textColor};
               color: {$theme.textColor};
               background-color: {$theme.backgroundColor};"
      >
        General
      </li>
    {/if}
    {#if showPanel === "theme"}
      <li
        on:click={(e) => {
          showPanel = "theme";
        }}
        style="border-color: {$theme.textColor};
               background-color: {$theme.textColor};
               color: {$theme.backgroundColor};"
      >
        Theme
      </li>
    {:else}
      <li
        on:click={(e) => {
          showPanel = "theme";
        }}
        style="border-color: {$theme.textColor};
               color: {$theme.textColor};
               background-color: {$theme.backgroundColor};"
      >
        Theme
      </li>
    {/if}
    {#if showPanel === "extension"}
      <li
        on:click={(e) => {
          showPanel = "extension";
        }}
        style="border-color: {$theme.textColor};
               background-color: {$theme.textColor};
               color: {$theme.backgroundColor};"
      >
        Extension
      </li>
    {:else}
      <li
        on:click={(e) => {
          showPanel = "extension";
        }}
        style="border-color: {$theme.textColor};
               color: {$theme.textColor};
               background-color: {$theme.backgroundColor};"
      >
        Extension
      </li>
    {/if}
  </ul>
  {#if showPanel === "general"}
    <GeneralPrefs
      on:setScrollDOM={(e) => {
        scrollDOM = e.detail.DOM;
      }}
      on:setKeyProcess={(e) => {
        keepBlur = e.detail.blur;
        if (timeOut !== null) clearTimeout(timeOut);
        if (keepBlur) timeOut = setTimeout(focusInput, timeOutValue);
      }}
    />
  {:else if showPanel === "theme"}
    <ThemePrefs
      on:setScrollDOM={(e) => {
        scrollDOM = e.detail.DOM;
      }}
      on:setKeyProcess={(e) => {
        keepBlur = e.detail.blur;
        if (timeOut !== null) clearTimeout(timeOut);
        if (keepBlur) timeOut = setTimeout(focusInput, timeOutValue);
      }}
    />
  {:else if showPanel === "extension"}
    <ExtensionPrefs
      on:switchView={(e) => {
        switchView(e.detail.view);
      }}
      on:setScrollDOM={(e) => {
        scrollDOM = e.detail.DOM;
      }}
      on:setKeyProcess={(e) => {
        keepBlur = e.detail.blur;
        if (keepBlur) timeOut = setTimeout(focusInput, timeOutValue);
      }}
    />
  {/if}
  <div id="buttonRow">
    <button
      style="color: {$theme.backgroundColor};
           background-color: {$theme.textColor};
           font-family: {$theme.font};
           font-size: {$theme.fontSize};"
      on:click={() => {
        exitPrefs();
      }}
    >
      Exit Preferences
    </button>
  </div>
</div>

<style>
  #Preferences {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: 100;
    width: 100%;
    height: 100%;
  }

  #vimInputDiv {
    width: 0px;
    height: 0px;
    margin: 0px;
    padding: 0px;
    border: 0px solid transparent;
  }

  #buttonRow {
    display: flex;
    flex-direction: row;
    width: 100%;
    margin: 5px;
  }

  #buttonRow button {
    margin: auto;
    border-radius: 5px;
    padding: 5px;
  }

  ul {
    display: flex;
    flex-direction: row;
    padding: 0px;
    margin: 0px 5px 0px 10px;
  }

  ul li {
    border-radius: 25px 5px 0px 0px;
    border: 3px solid;
    padding: 5px 5px 2px 15px;
    margin: 0px 10px 0px 0px;
    list-style: none;
  }

  h2 {
    text-align: center;
    margin-top: 3px;
  }
</style>
