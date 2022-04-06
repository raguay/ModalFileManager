<script>
  import { onMount, createEventDispatcher, tick } from "svelte";
  import { get } from "svelte/store";
  import { currentCursor } from "../stores/currentCursor.js";
  import { theme } from "../stores/theme.js";
  import { currentLeftFile } from "../stores/currentLeftFile.js";
  import { currentRightFile } from "../stores/currentRightFile.js";
  import { config } from "../stores/config.js";
  import FaRegFolder from "svelte-icons/fa/FaRegFolder.svelte";
  import FaRegFileAlt from "svelte-icons/fa/FaRegFileAlt.svelte";
  import FaExternalLinkAlt from "svelte-icons/fa/FaExternalLinkAlt.svelte";

  export let pane;
  export let entry;
  export let index;
  export let utilities;

  const dispatch = createEventDispatcher();

  let DOM;
  let localCursor = {
    pane: "right",
    entry: {
      name: "",
    },
  };
  let localTheme = {
    cursorColor: "pink",
  };

  onMount(() => {
    var unsubscribeCurrentCursor = currentCursor.subscribe(async (value) => {
      localCursor = value;
      await tick();
      if (typeof localCursor.entry !== "undefined") {
        if (typeof localCursor.entry.name !== "undefined") {
          if (
            localCursor.pane === pane &&
            localCursor.entry.name == entry.name
          ) {
            var viewable = elementInViewport(DOM);
            if (!viewable.visible) {
              dispatch("changeViewing", {
                dom: DOM,
                dir: viewable.dir,
              });
            }
          }
        } else {
          localCursor.entry = {
            name: "",
            size: "",
            type: "local",
            dir: "",
            datetime: "",
            selected: false,
          };
        }
      } else {
        localCursor.entry = {
          name: "",
          size: "",
          type: "local",
          dir: "",
          datetime: "",
          selected: false,
        };
      }
    });
    var unsubscribeTheme = theme.subscribe((value) => {
      localTheme = value;
    });
    return () => {
      unsubscribeCurrentCursor();
      unsubscribeTheme();
    };
  });

  function elementInViewport(el) {
    if (typeof el.getBoundingClientRect !== "undefined") {
      var windowInner = window.innerHeight - 31;
      var boundingEl = el.getBoundingClientRect();
      return {
        visible: boundingEl.top >= 60 && boundingEl.bottom <= windowInner,
        dir:
          boundingEl.top < 60
            ? boundingEl.top - 60
            : boundingEl.bottom - windowInner,
      };
    }
  }

  function cursorToEntry(pane, entry, index) {
    currentCursor.set({
      pane: pane,
      entry: entry,
    });

    if (pane === "right") {
      currentRightFile.set({
        entry: entry,
      });
    } else {
      currentLeftFile.set({
        entry: entry,
      });
    }
  }

  async function openEntry(pane, entry, index) {
    if (entry.type === 0) {
      //
      // It is a file, open it.
      //
      dispatch("openFile", { entry: entry });
    } else {
      //
      // It is a directory. Go into it.
      //
      var newDir = await utilities.appendPath(entry.dir, entry.name);
      dispatch("changeDir", {
        path: newDir,
        cursor: true,
      });
    }
  }

  async function dragStart(e) {
    const lconfig = get(config);
    var flist = lconfig.extensions.getExtCommand("getSelectedFiles").command();
    var included = false;
    var data = [];
    flist.map(async (item) => {
      const nfile = await utilities.appendPath(item.dir, item.name);
      data.push(nfile + "|" + item.type);
      if (item.name === entry.name) included = true;
    });
    const file = await utilities.appendPath(entry.dir, entry.name);
    if (!included) {
      data.push(file + "|" + entry.type);
    }
    e.dataTransfer.setData("text/plain", data.join("\n"));
    e.dataTransfer.setData("text/uri-url", "file://" + file);
    e.dataTransfer.setData("text/x-moz-url", "file://" + file);
    e.dataTransfer.setData(
      "application/x-moz-file-promise-url",
      "file://" + file
    );
  }

  async function dropFiles(e, type) {
    var shiftKey = e.shiftKey;
    switch (type) {
      case "over":
        if (shiftKey) {
          e.dataTransfer.dropEffect = "move";
        } else {
          e.dataTransfer.dropEffect = "copy";
        }
        break;
      case "drop":
        //
        // Create the drop to entry.
        //
        var dirPath = "";
        var fileName = "";
        var fileExt = "";
        var toEntry = { ...entry };
        if (toEntry.type === 1) {
          toEntry.dir = await utilities.appendPath(toEntry.dir, toEntry.name);
          toEntry.name = "";
        }

        //
        // Create the entries from the drop.
        //
        const dataTransArray = e.dataTransfer.getData("text/plain").split("\n");
        const lconfig = get(config);
        var fromEntries = [];
        for (var i = 0; i < dataTransArray.length; i++) {
          var parts = dataTransArray[i].split("|");
          if (parts[1] === "1") {
            dirPath = parts[0];
            var fdir = await utilities.splitFilePath(dirPath);
            var nwDir = await utilities.appendPath(toEntry.dir, fdir.Name);
            await utilities.makeDir(nwDir);
            toEntry.dir = nwDir;
          } else {
            var result = await utilities.splitFilePath(parts[0]);
            dirPath = result.Dir;
            fileName = result.Name;
            fileExt = result.Extension;
          }
          fromEntries.push({
            dir: dirPath,
            name: fileName,
            ext: fileExt,
            fileSystemType: entry.fileSystemType,
            fileSystem: entry.fileSystem,
            type: 1,
          });
        }
        if (shiftKey) {
          await lconfig.extensions
            .getExtCommand("moveEntriesCommand")
            .command(fromEntries, toEntry);
        } else {
          await lconfig.extensions
            .getExtCommand("copyEntriesCommand")
            .command(fromEntries, toEntry);
        }
        break;
      default:
        break;
    }
  }
</script>

{#if (localCursor.pane === pane && localCursor.entry.name == entry.name) || entry.selected}
  <div
    class="entry"
    style="background-color: {localTheme.cursorColor};"
    on:click={cursorToEntry(pane, entry, index)}
    on:dblclick={openEntry(pane, entry, index)}
    bind:this={DOM}
    draggable="true"
    on:dragstart={dragStart}
    on:dragend|preventDefault={(e) => {
      dropFiles(e, "dragend");
    }}
    on:drop|preventDefault={(e) => {
      dropFiles(e, "drop");
    }}
    on:dragover|preventDefault={(e) => {
      dropFiles(e, "dragover");
    }}
    on:dragenter|preventDefault={(e) => {
      dropFiles(e, "dragenter");
    }}
  >
    <span class="type">
      {#if entry.type === 0}
        <FaRegFileAlt />
      {:else if entry.type === 1}
        <FaRegFolder />
      {:else}
        <FaExternalLinkAlt />
      {/if}
    </span>
    <span
      class="name"
      style="color: {entry.selected
        ? localTheme.selectedColor
        : localTheme.textColor};">{entry.name}</span
    >
  </div>
{:else}
  <div
    class="entry"
    style="background-color: 'transparent';"
    on:click={cursorToEntry(pane, entry, index)}
    on:dblclick={openEntry(pane, entry, index)}
    bind:this={DOM}
    draggable="false"
    on:drop|preventDefault={(e) => {
      dropFiles(e, "drop");
    }}
    on:dragover|preventDefault={(e) => {
      dropFiles(e, "over");
    }}
  >
    <span class="type">
      {#if entry.type === 0}
        <FaRegFileAlt />
      {:else if entry.type === 1}
        <FaRegFolder />
      {:else}
        <FaExternalLinkAlt />
      {/if}
    </span>
    <span
      class="name"
      style="color: {entry.selected
        ? localTheme.selectedColor
        : localTheme.textColor};"
    >
      {entry.name}
    </span>
  </div>
{/if}

<style>
  .entry {
    display: flex;
    flex-direction: row;
    height: 20px;
    max-height: 20px;
    min-height: 20px;
    width: 100%;
    margin: 3px 3px;
  }

  .name {
    white-space: nowrap;
    -webkit-user-select: none;
    user-select: none;
  }

  .type {
    height: 20px;
    width: 20px;
    min-height: 20px;
    min-width: 20px;
    max-height: 20px;
    max-width: 20px;
    margin: 0px 10px 0px 5px;
    -webkit-user-select: none;
    user-select: none;
  }
</style>
