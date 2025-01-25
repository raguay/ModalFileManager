<script>
  import Entry from "./Entry.svelte";
  import { currentCursor } from "../stores/currentCursor.js";
  import { currentLeftFile } from "../stores/currentLeftFile.js";
  import { currentRightFile } from "../stores/currentRightFile.js";
  import { config } from "../stores/config.js";
  import { leftDir } from "../stores/leftDir.js";
  import { rightDir } from "../stores/rightDir.js";

  /**
   * @typedef {Object} Props
   * @property {string} [pane]
   * @property {any} [entries]
   * @property {any} utilities
   */

  /** @type {Props} */
  let { pane = "left", entries = $bindable(), utilities } = $props();
  let viewing = $state(null);
  let DOM = null;

  $effect(() => {
    if (viewing !== null) {
      DOM.scrollTop += viewing.dir;
      if (DOM.scrollTop < 0) DOM.scrollTop = 0;
    }
  });

  async function dropFiles(e, type) {
    let shiftKey = e.shiftKey;
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
        // Get the local information for dropping into.
        //
        let dirPath = "";
        let fileName = "";
        let toEntry = {
          dir: "",
          name: "",
          fileSystemType: utilities.type,
          fileSystem: utilities,
          type: 1,
        };
        if (entries.length > 0) {
          toEntry.dir = entries[0].dir;
          toEntry.name = "";
        } else {
          let curPane;
          if (pane === "left") {
            curPane = get(leftDir);
          } else {
            curPane = get(rightDir);
          }
          toEntry.dir = curPane.path;
          toEntry.name = "";
        }

        //
        // Process the information from the drop.
        //
        const dataTransArray = e.dataTransfer.getData("text/plain").split("\n");
        const lconfig = get(config);
        let fromEntries = [];
        dataTransArray.forEach(async (dataTrans) => {
          const parts = dataTrans.split("|");
          if (parts[1] === "1") {
            dirPath = parts[0];
            let fdir = await utilities.splitFilePath(dirPath);
            const nwDir = await utilities.appendPath(toEntry.dir, fdir.name);
            await utilities.makeDir(nwDir);
            toEntry.dir = nwDir;
          } else {
            const result = await utilities.splitFilePath(parts[0]);
            dirPath = result.dir;
            fileName = result.name;
          }
          fromEntries.push({
            dir: dirPath,
            name: fileName,
            fileSystemType: utilities.type,
            fileSystem: utilities,
          });
        });
        if (shiftKey) {
          lconfig.extensions
            .getExtCommand("moveEntriesCommand")
            .command(fromEntries, toEntry);
        } else {
          lconfig.extensions
            .getExtCommand("copyEntriesCommand")
            .command(fromEntries, toEntry);
        }
        break;
      default:
        break;
    }
  }

  function cursorToPane() {
    let nEntry = {
      dir: "",
      name: "",
      fileSystemType: utilities.type,
      fileSystem: utilities,
      type: 1,
      size: 0,
      datetime: "",
      seleted: false,
    };

    if (pane === "right") {
      if (entries.length > 0 && $currentRightFile.entry === null) {
        nEntry = entries[0];
      } else {
        nEntry = $currentRightFile.entry;
      }
      $currentCursor = {
        pane: pane,
        entry: nEntry,
      };
      $currentRightFile = {
        entry: nEntry,
      };
    } else {
      if (entries.length > 0 && $currentLeftFile.entry === null) {
        nEntry = entries[0];
      } else {
        nEntry = $currentLeftFile.entry;
      }
      $currentCursor = {
        pane: pane,
        entry: nEntry,
      };
      $currentLeftFile = {
        entry: nEntry,
      };
    }
  }
</script>

<div class="panel" bind:this={DOM}>
  {#each entries as entry}
    <Entry {pane} {entry} {utilities} bind:viewing />
  {/each}
  <div
    class="empty"
    draggable="false"
    onclick={() => {
      cursorToPane();
    }}
    ondrop={preventDefault((e) => {
      dropFiles(e, "drop");
    })}
    ondragover={preventDefault((e) => {
      dropFiles(e, "dragover");
    })}
  ></div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    padding: 0px;
    margin: 0px;
    height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
    overscroll-behavior-y: none;
  }
  .panel::-webkit-scrollbar {
    width: 0; /* Remove scrollbar space */
    background: transparent; /* Optional: just make scrollbar invisible */
  }

  .empty {
    height: 100%;
  }
</style>
