<script>
  import { tick } from "svelte";
  import { dirHistory } from "../stores/dirHistory.js";
  import { keyProcess } from "../stores/keyProcess.js";
  import { theme } from "../stores/theme.js";
  import { config } from "../stores/config.js";
  import { directoryListeners } from "../stores/directoryListeners.js";

  let { path = $bindable(), edit = $bindable(), pane } = $props();

  let dirInputDOM = null;
  let newPath = $state("");
  let inputPath = "";
  let dirlist = $state([]);
  let pending = false;
  let dirIndex = $state(0);
  let lastDir = "";
  let elDOM = null;
  let DOM = null;

  $effect(async () => {
    checkEdit(edit);
    //
    // Focus the input if visible.
    //
    if (edit) {
      if (typeof dirInputDOM !== "undefined") dirInputDOM.focus();
    }
  });

  $effect(() => {
    checkPath(path);
    if (typeof path !== "undefined" && typeof path.path !== "undefined") {
      inputPath = path.path;
    }
  });

  function checkVisible() {
    //
    // If the current element isn't visible, make it visible.
    //
    if (
      typeof elDOM !== "undefined" &&
      typeof DOM !== "undefined" &&
      elDOM !== null &&
      DOM !== null &&
      dirlist.length !== 0
    ) {
      var viewable = elementInViewport(elDOM);
      if (typeof viewable !== "undefined" && !viewable.visible) {
        DOM.scrollTop += viewable.dir;
        if (DOM.scrollTop < 0) DOM.scrollTop = 0;
      }
    }
  }

  function getInnerHeight(elm) {
    var computed = getComputedStyle(elm),
      padding =
        parseInt(computed.paddingTop) + parseInt(computed.paddingBottom);

    return elm.clientHeight - padding;
  }

  function elementInViewport(el) {
    let result = {
      dir: 0,
      visible: false,
    };
    if (
      typeof el !== "undefined" &&
      el !== null &&
      typeof el.getBoundingClientRect !== "undefined"
    ) {
      var windowInner = getInnerHeight(DOM) - 31;
      var boundingEl = el.getBoundingClientRect();
      result = {
        visible: boundingEl.top >= 70 && boundingEl.bottom <= windowInner,
        dir: boundingEl.bottom - windowInner,
      };
    }
    return result;
  }

  async function checkPath(npath) {
    //
    // Leave if the system isn't fully initialized.
    //
    if (
      typeof npath === "undefined" ||
      typeof npath.fileSystem === "undefined"
    ) {
      return;
    }

    //
    // Make sure it's a new path and fix the name for displaying.
    //
    let result = npath.path.toString().trim();
    if (result !== "") {
      //
      // Make sure the directory is being watched.
      //
      await npath.fileSystem.setDirWatch(result, pane);

      //
      // Tell everyone watching directory changes that a change is occurring.
      //
      await runDirectoryListeners(result);

      //
      // Add to the history.
      //
      $dirHistory.addHistory(result);

      //
      // Fixing the path.
      //
      const sep = npath.fileSystem.sep;
      if (result[0] === sep) result = result.slice(1);
      if (result[result.length - 1] === sep) result = result.slice(0, -1);
      var parts = result.split(sep);
      if (parts.length > 3) {
        //
        // If the path length is greater than the shortener length, shorten the path
        // by just showing the first character of the upper paths.
        //
        const boundry = parts.length - 3;
        for (var i = 0; i < boundry; i++) {
          parts[i] = parts[i][0];
        }
        result = parts.join(sep);
      }

      //
      // Make sure there is a path seperator on both sides of the path.
      //
      if (result[0] !== sep) result = sep + result;
      if (result[result.length - 1] !== sep) result += sep;
    }
    //
    // Set the new path to display.
    //
    newPath = result;
  }

  function checkEdit(ed) {
    if (ed) editOn();
  }

  async function runDirectoryListeners(pth) {
    if (typeof pth !== "undefined" && lastDir !== pth) {
      lastDir = pth;
      $directoryListeners.map(async (value) => {
        await value(pth, "");
      });
    }
  }

  function editOn() {
    inputPath = path.path;
    dirIndex = 0;
    dirlist = [];
    const sep = path.fileSystem.sep;
    if (inputPath[0] !== sep) {
      inputPath = sep + inputPath;
    }
    if (inputPath[inputPath.length - 1] !== sep) {
      inputPath = inputPath + sep;
    }
    $keyProcess = false;
  }

  async function editOff(nPath) {
    if (
      typeof path !== "undefined" &&
      typeof path.fileSystem !== "undefined" &&
      typeof nPath !== "undefined"
    ) {
      let Pext = await path.fileSystem.dirExists(nPath);
      inputPath = nPath;
      if (Pext) {
        dirlist = [];
        dirIndex = 0;
        await $config.extensions.getExtCommand("changeDir").command(
          {
            path: nPath,
            cursor: true,
          },
          pane,
          "",
        );
        path.path = nPath;
        checkPath(nPath);
      } else if (
        typeof dirlist !== "undefined" &&
        dirlist.length - 1 >= dirIndex
      ) {
        nPath = dirlist[dirIndex];
        dirlist = [];
        dirIndex = 0;
      }
    } else {
      dirlist = [];
      dirIndex = 0;
    }
    edit = false;
    $keyProcess = true;
  }

  async function processKey(e) {
    const key = e.key;

    //
    // If the Enter key, quit the edit mode.
    //
    switch (key) {
      case "Escape":
        //
        // Goto the original directory.
        //
        e.preventDefault();
        e.stopPropagation();
        editOff(path.path);
        break;
      case "Enter":
        //
        // Goto the directory last indexed.
        //
        e.preventDefault();
        e.stopPropagation();
        if (dirlist.length > 0 && dirIndex >= 0) {
          editOff(dirlist[dirIndex]);
        } else {
          editOff(inputPath);
        }
        break;
      case "Tab":
        e.preventDefault();
        e.stopPropagation();
        if (dirlist.length > 0) {
          dirInputDOM.focus();
          inputPath = "";
          inputPath = dirlist[dirIndex];
          await tick();
          dirInputDOM.value = "";
          dirInputDOM.value = inputPath;
          await tick();
          dirInputDOM.setSelectionRange(inputPath.length, inputPath.length);
          await tick();
        }
        break;
      case "ArrowUp":
        //
        // Move the cursor up the list.
        //
        e.preventDefault();
        dirIndex = dirIndex - 1;
        if (dirIndex < 0) dirIndex = 0;
        checkVisible();
        break;
      case "ArrowDown":
        //
        // Move the cursor down the list.
        //
        e.preventDefault();
        dirIndex = dirIndex + 1;
        if (dirIndex >= dirlist.length - 1) dirIndex = dirlist.length - 1;
        checkVisible();
        break;
    }
  }

  async function processInput() {
    let nPath = inputPath;

    //
    // If we are already running it once, don't start another search.
    //
    if (typeof path !== "undefined" && typeof path.fileSystem !== "undefined") {
      const sep = path.fileSystem.sep;
      var numleft = $config.maxSearchDepth;
      dirlist = [];
      dirIndex = 0;

      //
      // Get matches from history.
      //
      let parts = nPath.split(sep);
      let begindir = parts.slice(0, -1).join(sep);
      let last = parts[parts.length - 1];
      dirlist = $dirHistory
        .searchHistory(`${begindir}.*${last}`)
        .filter((item) => item !== "");
      if (dirlist === null) dirlist = [];
      numleft -= dirlist.length;
      if (numleft > 0) {
        //
        // Get rest from file system.
        //
        if (!pending) {
          pending = true;
          await path.fileSystem.searchdir(last, begindir, numleft, (data) => {
            dirlist = dirlist.concat(data).filter((item) => item !== "");
            dirIndex = 0;
            pending = false;
          });
        }
      }
    }
  }

  function processListItem(key) {
    editOff(dirlist[key]);
  }
</script>

<div
  class="dirList"
  style="font-family: {$theme.font}; font-size: {$theme.fontSize}; color: {$theme.Green}; background: {$theme.backgroundColor};"
>
  {#if !edit}
    <span class="dir" ondblclick={editOn} style="color: {$theme.Green};">
      {newPath}
    </span>
  {:else}
    <input
      bind:this={dirInputDOM}
      type="text"
      class="dirinputclass"
      style="color: {$theme.Green}; background: {$theme.backgroundColor}; border-color: {$theme.borderColor}; font-family: {$theme.font}; font-size: {$theme.fontSize};"
      onkeydown={processKey}
      bind:value={inputPath}
      oninput={processInput}
    />
    {#if dirlist.length > 0}
      <div
        id="searchList"
        bind:this={DOM}
        style="background-color: {$theme.backgroundColor};
        color: {$theme.textColor};
        border: {$theme.textColor} solid 3px;"
      >
        <ul>
          {#each dirlist as item, key}
            {#if item !== ""}
              {#if key === dirIndex}
                <li
                  style="background-color: {$theme.cursorColor};"
                  bind:this={elDOM}
                  onclick={() => {
                    processListItem(key);
                  }}
                >
                  {item}
                </li>
              {:else}
                <li
                  style="background-color: {$theme.backgroundColor};"
                  onclick={() => {
                    processListItem(key);
                  }}
                >
                  {item}
                </li>
              {/if}
            {/if}
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</div>

<style>
  #searchList {
    position: absolute;
    display: flex;
    flex-direction: column;
    top: 50px;
    left: 20px;
    padding: 5px;
    margin: 10px auto 10px auto;
    z-index: 200;
    overflow: auto;
    height: 70%;
    border-radius: 10px;
    width: 90%;
  }

  #searchList ul {
    list-style-type: none;
    margin: 0px;
    padding: 0px;
  }

  #searchList ul li {
    text-decoration: none;
    margin: 0px;
  }

  .dirList {
    display: flex;
    flex-direction: row;
    margin: 0px;
    padding: 0px;
    height: 20px;
  }

  .dir {
    height: 20px;
    margin: 0px auto 0px 10px;
    white-space: nowrap;
    overflow-x: hidden;
    -webkit-user-select: none;
    user-select: none;
  }

  .dirinputclass {
    height: 20px;
    padding: 5px;
    width: 90%;
    margin: 0px auto 0px 10px;
    white-space: nowrap;
    outline: none;
    border: 0px;
  }

  .dirinputclass::select {
    outline: none;
  }
</style>
