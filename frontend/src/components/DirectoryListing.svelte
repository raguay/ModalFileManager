<script>
  import { tick, afterUpdate, onMount, createEventDispatcher } from "svelte";
  import { get } from "svelte/store";
  import { dirHistory } from "../stores/dirHistory.js";
  import { keyProcess } from "../stores/keyProcess.js";
  import { theme } from "../stores/theme.js";
  import { directoryListeners } from "../stores/directoryListeners.js";

  const dispatch = createEventDispatcher();

  export let path;
  export let edit = false;
  export let side;

  let show = true;
  let dirInputDOM;
  let newPath;
  let inputPath;
  let dirlist = [];
  let localTheme = {};
  let dirListDOM;
  let tryagain = false;
  let pending = false;
  let dirIndex = 0;
  let localDirListeners = [];
  let lastDir = "";
  let rightSet = false;
  let leftSet = false;

  $: newPath = shortenPath(path);
  $: setEditFlag(edit);

  onMount(() => {
    const unsubscribeTheme = theme.subscribe((value) => {
      localTheme = value;
    });
    const unsubscribeDirectoryListeners = directoryListeners.subscribe(
      (value) => {
        localDirListeners = value;
      }
    );
    localTheme = get(theme);
    newPath = shortenPath(path);
    if (side === "left") {
      window.runtime.EventsOn("leftDirChange", () => {
        dispatch("dirChange", {
          path: path.path,
          cursor: false,
        });
      });
    } else {
      window.runtime.EventsOn("rightDirChange", () => {
        dispatch("dirChange", {
          path: path.path,
          cursor: false,
        });
      });
    }
    return () => {
      unsubscribeTheme();
      unsubscribeDirectoryListeners();
    };
  });

  afterUpdate(async () => {
    if (!show) {
      await tick();
      dirInputDOM.focus();
    }
  });

  async function updateWatcher(pth) {
    //
    // Set the path in the watcher.
    //
    if (pth !== "" && pth === path.path) {
      if (side === "left") {
        if (leftSet) {
          await window.go.main.App.CloseLeftWatch();
        }
        leftSet = true;
        window.go.main.App.SetLeftDirWatch(pth);
      } else {
        if (rightSet) {
          await window.go.main.App.CloseRightWatch();
        }
        rightSet = true;
        window.go.main.App.SetRightDirWatch(pth);
      }
    }
  }

  function runDirectoryListeners(pth) {
    if (typeof pth !== "undefined") {
      if (lastDir !== pth) {
        lastDir = pth;
        localDirListeners.map((value) => {
          value(pth, "");
        });
      }
    }
  }

  function setEditFlag(flag) {
    if (flag) {
      setEdit({});
    }
  }

  function setEdit(e) {
    show = false;
    inputPath = path.path;
    dirIndex = 0;
    const sep = path.fileSystem.sep;
    if (inputPath[0] !== sep) {
      inputPath = sep + inputPath;
    }
    if (inputPath[inputPath.length - 1] !== sep) {
      inputPath = inputPath + sep;
    }
    keyProcess.set(false);
  }

  async function editOff() {
    if (await path.fileSystem.dirExists(inputPath)) {
      show = true;
      dirlist = [];
      keyProcess.set(true);
      dispatch("dirChange", {
        path: inputPath,
        cursor: true,
      });
    } else if (
      typeof dirlist !== "undefined" &&
      dirlist.length - 1 >= dirIndex
    ) {
      inputPath = dirlist[dirIndex];
      show = true;
      dirlist = [];
      keyProcess.set(true);
      if (await path.fileSystem.dirExists(inputPath)) {
        dispatch("dirChange", {
          path: inputPath,
          cursor: true,
        });
      }
    }
  }

  function shortenPath(pth) {
    //
    // Leave if the system isn't fully initialized.
    //
    if (typeof pth.path === "undefined") return;
    if (pth.filesystem === null) return;

    var result = pth.path.toString().trim();
    if (result !== "") {
      //
      // Add directory watching.
      //
      updateWatcher(result);

      //
      // Tell everyone watching directory changes that a change is occurring.
      //
      runDirectoryListeners(result);

      //
      // Add to the history.
      //
      var hist = get(dirHistory);
      hist.addHistory(result);
      dirHistory.set(hist);

      //
      // Fixing the path.
      //
      if (pth.fileSystem !== null) {
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
      }
    }

    //
    // Return the resulting path.
    //
    return result;
  }

  async function processKey(e) {
    const key = e.key;

    //
    // If the Enter key, quit the edit mode.
    //
    if (key === "Escape") {
      editOff();
    }

    if (key === "Enter") {
      var isDir = await path.fileSystem.dirExists(inputPath);
      if (!isDir) {
        inputPath = dirlist[dirIndex];
      }
      editOff();
    }

    if (dirlist.length > 0) {
      if (key === "ArrowUp") {
        e.stopPropagation();
        dirIndex = dirIndex - 1;
        if (dirIndex < 0) dirIndex = 0;
      } else if (key === "ArrowDown") {
        e.stopPropagation();
        dirIndex = dirIndex + 1;
        if (dirIndex >= dirlist.length) dirIndex = dirlist.length;
      }
    }
  }

  async function processInput(e) {
    e = e;
    if (pending) {
      tryagain = true;
    } else {
      if (typeof path !== "undefined") {
        const sep = path.fileSystem.sep;
        if (inputPath[inputPath.length - 1] !== sep) {
          var numleft = 10;
          dirlist = [];

          //
          // Get matches from history.
          //
          var hist = get(dirHistory);
          dirlist = hist.searchHistory(inputPath);
          if (dirlist === null) dirlist = [];
          numleft -= dirlist.length;
          if (numleft > 0) {
            //
            // Get more from dirctory.
            //
            tryagain = false;
            pending = true;
            var parts = inputPath.split(sep);
            var searchPath = parts.slice(0, parts.length - 1).join(sep);

            //
            // Get rest from file system.
            //
            await path.fileSystem.searchDir(
              inputPath,
              searchPath,
              numleft,
              (data) => {
                dirlist = dirlist.concat(data);
                pending = false;
                dirIndex = 0;
                if (tryagain) {
                  processInput(null);
                }
              }
            );
          }
        }
      }
    }
  }

  function processListItem(key) {
    inputPath = dirlist[key];
    editOff();
  }
</script>

<div
  class="dirList"
  bind:this={dirListDOM}
  style="font-family: {$theme.font}; font-size: {$theme.fontSize}; color: {$theme.Green}; background: {$theme.backgroundColor};"
>
  {#if show}
    <span class="dir" on:dblclick={setEdit} style="color: {$theme.Green};">
      {newPath}
    </span>
  {:else}
    <input
      bind:this={dirInputDOM}
      type="text"
      class="dirinputclass"
      style="color: {$theme.Green}; background: {$theme.backgroundColor}; border-color: {$theme.borderColor}; font-family: {$theme.font}; font-size: {$theme.fontSize};"
      on:keydown|stopPropagation={processKey}
      on:keyup|stopPropagation={() => {}}
      on:keypress|stopPropagation={() => {}}
      bind:value={inputPath}
      on:input={processInput}
    />
    {#if dirlist.length > 0 && dirListDOM !== null && dirInputDOM !== null}
      <div
        id="searchList"
        style="background-color: {localTheme.backgroundColor}; color: {localTheme.textColor}; top: {dirInputDOM.offsetTop +
          dirListDOM.offsetHeight}px; left: {dirListDOM.offsetLeft}px;"
      >
        <ul>
          {#each dirlist as item, key}
            {#if item !== ""}
              <li
                style="color: {key === dirIndex
                  ? localTheme.selectedColor
                  : localTheme.textColor}"
                on:click={() => {
                  processListItem(key);
                }}
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
    z-index: 200;
    overflow-y: auto;
    height: 80%;
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
