<script>
  import { currentCursor } from "../stores/currentCursor.js";
  import { theme } from "../stores/theme.js";
  import { config } from "../stores/config.js";
  import FaRegFolder from "svelte-icons/fa/FaRegFolder.svelte";
  import FaRegFileAlt from "svelte-icons/fa/FaRegFileAlt.svelte";
  import FaExternalLinkAlt from "svelte-icons/fa/FaExternalLinkAlt.svelte";

  let { viewing = $bindable(), pane, entry, utilities } = $props();

  let DOM = $state(null);

  $effect.pre(() => {
    if (
      typeof DOM !== "undefined" &&
      DOM !== null &&
      typeof $currentCursor.entry !== "undefined" &&
      typeof $currentCursor.entry.name !== "undefined" &&
      $currentCursor.pane === pane &&
      $currentCursor.entry.name == entry.name
    ) {
      let windowInner = window.innerHeight - 31;
      let boundingEl = DOM.getBoundingClientRect();
      let viewable = {
        visible: boundingEl.top >= 60 && boundingEl.bottom <= windowInner,
        dir:
          boundingEl.top < 60
            ? boundingEl.top - 60
            : boundingEl.bottom - windowInner,
      };
      if (!viewable.visible) {
        viewing = viewable;
      }
    }
  });

  function cursorToEntry() {
    if ($currentCursor.pane !== pane) {
      $config.extensions.getExtCommand("setPane").command(pane);
    }
    $config.extensions.getExtCommand("setCursor").command(entry.name);
  }

  async function openEntry() {
    if (entry.type === 0) {
      //
      // It is a file, open it.
      //
      await $config.extensions.getExtCommand("openFile").command(entry);
    } else {
      //
      // It is a directory. Go into it.
      //
      let newDir = await utilities.appendPath(entry.dir, entry.name);
      await $config.extensions.getExtCommand("changeDir").command(
        {
          path: newDir,
        },
        pane,
        "",
      );
    }
  }

  async function dragStart(e) {
    let flist = $config.extensions.getExtCommand("getSelectedFiles").command();
    let included = false;
    let data = [];
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
      "file://" + file,
    );
  }

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
        // Create the drop to entry.
        //
        let dirPath = "";
        let fileName = "";
        let fileExt = "";
        let toEntry = { ...entry };
        if (toEntry.type === 1) {
          toEntry.dir = await utilities.appendPath(toEntry.dir, toEntry.name);
          toEntry.name = "";
        }

        //
        // Create the entries from the drop.
        //
        const dataTransArray = e.dataTransfer.getData("text/plain").split("\n");
        let fromEntries = [];
        for (let i = 0; i < dataTransArray.length; i++) {
          let parts = dataTransArray[i].split("|");
          if (parts[1] === "1") {
            dirPath = parts[0];
            let fdir = await utilities.splitFilePath(dirPath);
            let nwDir = await utilities.appendPath(toEntry.dir, fdir.Name);
            await utilities.makeDir(nwDir);
            toEntry.dir = nwDir;
          } else {
            let result = await utilities.splitFilePath(parts[0]);
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
          await $config.extensions
            .getExtCommand("moveEntriesCommand")
            .command(fromEntries, toEntry);
        } else {
          await $config.extensions
            .getExtCommand("copyEntriesCommand")
            .command(fromEntries, toEntry);
        }
        break;
      default:
        break;
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if ($currentCursor.pane === pane && $currentCursor.entry.name == entry.name) || entry.selected}
  <div
    class="entry"
    style="background-color: {$theme.cursorColor};"
    bind:this={DOM}
    onkeydown={() => {}}
    onclick={() => {
      cursorToEntry();
    }}
    ondblclick={() => {
      openEntry();
    }}
    draggable="true"
    ondragstart={dragStart}
    ondragend={(e) => {
      dropFiles(e, "dragend");
    }}
    ondrop={(e) => {
      dropFiles(e, "drop");
    }}
    ondragover={(e) => {
      dropFiles(e, "dragover");
    }}
    ondragenter={(e) => {
      dropFiles(e, "dragenter");
    }}
  >
    <div class="entryBuffer">
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
          ? $theme.selectedColor
          : $theme.textColor};">{entry.name}</span
      >
    </div>
  </div>
{:else}
  <div
    class="entry"
    style="background-color: 'transparent';"
    bind:this={DOM}
    onkeydown={() => {}}
    onclick={() => {
      cursorToEntry();
    }}
    ondblclick={() => {
      openEntry();
    }}
    draggable="false"
    ondrop={(e) => {
      dropFiles(e, "drop");
    }}
    ondragover={(e) => {
      dropFiles(e, "over");
    }}
  >
    <div class="entryBuffer">
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
          ? $theme.selectedColor
          : $theme.textColor};"
      >
        {entry.name}
      </span>
    </div>
  </div>
{/if}

<style>
  .entry {
    display: flex;
    flex-direction: row;
    height: 26px;
    max-height: 26px;
    min-height: 26px;
    width: 100%;
    margin: 0px;
    -webkit-user-select: none;
    user-select: none;
    cursor: default;
  }

  .entryBuffer {
    display: flex;
    flex-direction: row;
    height: 20px;
    max-height: 20px;
    margin: 3px;
    -webkit-user-select: none;
    user-select: none;
    cursor: default;
  }

  .name {
    white-space: nowrap;
    -webkit-user-select: none;
    user-select: none;
    cursor: default;
  }

  .type {
    margin: 0px 10px 0px 5px;
    -webkit-user-select: none;
    user-select: none;
    height: 20px;
    max-height: 20px;
    width: 20px;
    max-width: 20px;
    cursor: default;
  }
</style>
