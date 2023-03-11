<script>
  import {
    tick,
    afterUpdate,
    beforeUpdate,
    createEventDispatcher,
  } from "svelte";
  import { dirHistory } from "../stores/dirHistory.js";
  import { keyProcess } from "../stores/keyProcess.js";
  import { theme } from "../stores/theme.js";
  import { directoryListeners } from "../stores/directoryListeners.js";
  import * as App from "../../dist/wailsjs/go/main/App.js";

  const dispatch = createEventDispatcher();

  export let path;
  export let edit;
  export let pane;

  let show = true;
  let dirInputDOM;
  let newPath = "";
  let inputPath = "";
  let dirlist = [];
  let tryagain = false;
  let pending = false;
  let dirIndex = 0;
  let lastDir = "";

  $: checkEdit(edit);

  beforeUpdate(() => {
    //
    // Process the new path.
    //
    newPath = shortenPath(path);
  });

  afterUpdate(async () => {
    if (!show) {
      await tick();
      if (typeof dirInputDOM !== "undefined") dirInputDOM.focus();
    }
  });

  function checkEdit(ed) {
    if (ed) editOn();
  }

  function runDirectoryListeners(pth) {
    if (typeof pth !== "undefined" && lastDir !== pth) {
      lastDir = pth;
      $directoryListeners.map((value) => {
        value(pth, "");
      });
    }
  }

  function editOn() {
    show = false;
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
    show = true;
    $keyProcess = true;
    if (typeof path !== "undefined" && typeof path.fileSystem !== "undefined") {
      let Pext = await path.fileSystem.dirExists(nPath);
      if (Pext) {
        inputPath = nPath;
        dirlist = [];
        dispatch("dirChange", {
          path: nPath,
          cursor: true,
        });
      } else if (
        typeof dirlist !== "undefined" &&
        dirlist.length - 1 >= dirIndex
      ) {
        inputPath = nPath;
        show = true;
        nPath = dirlist[dirIndex];
        dirlist = [];
        dispatch("dirChange", {
          path: nPath,
          cursor: true,
        });
      }
    } else {
      dirlist = [];
    }
  }

  function shortenPath(pth) {
    //
    // Leave if the system isn't fully initialized.
    //
    if (
      typeof pth === "undefined" ||
      typeof pth.fileSystem === "undefined" ||
      pth.fileSystem === null
    ) {
      return "File system not defined";
    }

    var result = pth.path.toString().trim();
    if (result !== "") {
      //
      // Make sure the directory is being watched.
      //
      if (pane === "left") {
        App.SetLeftDirWatch(result);
      } else {
        App.SetRightDirWatch(result);
      }

      //
      // Tell everyone watching directory changes that a change is occurring.
      //
      runDirectoryListeners(result);

      //
      // Add to the history.
      //
      $dirHistory.addHistory(result);

      //
      // Fixing the path.
      //
      const sep = pth.fileSystem.sep;
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
    } else if (newPath !== "") {
      result = newPath;
    }

    //
    // Return the resulting path.
    //
    return result;
  }

  function processKey(e) {
    const key = e.key;

    //
    // If the Enter key, quit the edit mode.
    //
    if (key === "Escape") {
      //
      // Goto the original directory.
      //
      e.preventDefault();
      e.stopPropagation();
      editOff(path.path);
    } else if (key === "Enter") {
      //
      // Goto the directory last indexed.
      //
      e.preventDefault();
      e.stopPropagation();
      editOff(dirlist[dirIndex]);
    } else if (dirlist.length > 0) {
      if (key === "ArrowUp") {
        //
        // Move the cursor up the list.
        //
        e.preventDefault();
        dirIndex = dirIndex - 1;
        if (dirIndex < 0) dirIndex = 0;
      } else if (key === "ArrowDown") {
        //
        // Move the cursor down the list.
        //
        e.preventDefault();
        dirIndex = dirIndex + 1;
        if (dirIndex >= dirlist.length - 1) dirIndex = dirlist.length - 1;
      }
    }
  }

  async function processInput() {
    let nPath = inputPath;
    if (pending) {
      tryagain = true;
    } else {
      if (
        typeof path !== "undefined" &&
        typeof path.fileSystem !== "undefined"
      ) {
        const sep = path.fileSystem.sep;
        if (nPath[nPath.length - 1] !== sep) {
          var numleft = 10;
          dirlist = [];

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
            // Get more from dirctory.
            //
            tryagain = false;
            pending = true;

            //
            // Get rest from file system.
            //
            await path.fileSystem.searchdir(last, begindir, numleft, (data) => {
              dirlist = dirlist.concat(data).filter((item) => item !== "");
              pending = false;
              dirIndex = 0;
              if (tryagain) {
                processInput();
              }
            });
          }
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
  {#if show}
    <span class="dir" on:dblclick={editOn} style="color: {$theme.Green};">
      {newPath}
    </span>
  {:else}
    <input
      bind:this={dirInputDOM}
      type="text"
      class="dirinputclass"
      style="color: {$theme.Green}; background: {$theme.backgroundColor}; border-color: {$theme.borderColor}; font-family: {$theme.font}; font-size: {$theme.fontSize};"
      on:keydown={processKey}
      bind:value={inputPath}
      on:input={processInput}
    />
    {#if dirlist.length > 0}
      <div
        id="searchList"
        style="background-color: {$theme.backgroundColor}; 
        color: {$theme.textColor};"
      >
        <ul>
          {#each dirlist as item, key}
            {#if item !== ""}
              <li
                style="background-color: {key === dirIndex
                  ? $theme.cursorColor
                  : $theme.backgroundColor};"
                on:click={() => {
                  processListItem(key);
                }}
                on:keydown={() => {}}
              >
                {item}
              </li>
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
    margin: 10px auto 10px auto;
    z-index: 200;
    overflow: auto;
    height: 70%;
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
    padding: 0px;
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
    overflow-x: scroll;
    -webkit-user-select: none;
    user-select: none;
  }

  .dirinputclass {
    height: 20px;
    margin: 0px auto 0px 10px;
    white-space: nowrap;
    outline: none;
    border: 0px;
  }

  .dirinputclass::select {
    outline: none;
  }
</style>
