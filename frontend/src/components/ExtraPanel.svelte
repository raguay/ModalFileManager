<script>
  import { tick } from "svelte";
  import ModeLine from "./ModeLine.svelte";
  import { extraPanel } from "../stores/extraPanel.js";
  import util from "../modules/util.js";

  let { side, entry } = $props();

  let fullPath = $state("");
  let extension = $state("");
  let size = $state("");
  let videoDem = $state("");
  let isMovieFlag = $state(false);
  let isExtra = $state(false);
  let extraHTML = $state("");
  let lastChecked = "";
  let lookupPath = $state("");

  $effect.pre(async () => {
    //
    // Check the new cursor for extra panel items.
    //
    if (typeof entry !== "undefined") {
      isExtra = await checkExtraPanel();
      await runExtraPanel();
    }
  });

  $effect(async () => {
    size = util.readableSize(entry.size);
    await tick();
    if (typeof entry !== "undefined") {
      if (isMovie()) {
        /* 
        var fileURL = window.URL.createObjectURL(lookupPath);
        var videoNode = window.document.getElementById("videoItem");
        if (videoNode !== null) {
          videoNode.src = fileURL;
        }
        */
        await getDimensions(fullPath);
      }
    }
  });

  async function runExtraPanel() {
    //
    // Get the file information needed whenever the current cursor changes.
    //
    if (lastChecked !== entry.name) {
      lastChecked = entry.name;
      fullPath = await entry.fileSystem.appendPath(entry.dir, entry.name);
      let hmdir = await entry.fileSystem.getHomeDir();
      lookupPath = `http://127.0.0.1:9998/filesys/${fullPath.substr(
        hmdir.length + 1,
      )}`;
      lookupPath = encodeURI(lookupPath);
      extension = entry.ext.toLowerCase();
    }
    for (let i = 0; i < $extraPanel.length; i++) {
      await $extraPanel[i].after();
    }
  }

  async function checkExtraPanel() {
    extraHTML = "";
    let isxtra = false;
    for (let i = 0; i < $extraPanel.length; i++) {
      isxtra = await $extraPanel[i].check(
        entry.dir,
        entry.name,
        entry.fileSystem,
        side,
      );
      if (isxtra) {
        var newContent = await $extraPanel[i].createHTML();
        extraHTML = extraHTML.concat("\n", newContent);
      }
    }
    return isxtra;
  }

  function isMovie() {
    isMovieFlag =
      extension === ".mov" ||
      extension === ".mp4" ||
      extension === ".wm" ||
      extension === ".3gp" ||
      extension === ".mpeg" ||
      extension === ".avi" ||
      extension === ".gif" ||
      extension === ".ogg";
    return isMovieFlag;
  }

  async function getDimensions(fileName) {
    var com =
      'ffprobe -v error -of flat=s=_ -select_streams v:0 -show_entries stream=height,width "' +
      fileName +
      '"';
    await entry.fileSystem.runCommandLine(
      com,
      [],
      (err, stdout) => {
        if (err) {
          console.log("getDimensions: ffprobe error: ", err);
        } else {
          stdout = stdout.toString("utf8");
          var width = /width=(\d+)/.exec(stdout);
          var height = /height=(\d+)/.exec(stdout);
          videoDem = `${parseInt(width[1])}x${parseInt(height[1])}`;
        }
      },
      ".",
    );
  }
</script>

<div id="extrapanel">
  {#if isExtra}
    {@html extraHTML}
  {/if}
  <h6>{fullPath}</h6>
  {#if extension === ".png" || extension === ".heic" || extension === ".jpg" || extension === ".svg" || extension === ".jpeg" || extension === ".gif" || extension === ".apng" || extension === ".avif" || extension === ".webp" || extension === ".avi"}
    <img src={lookupPath} alt={fullPath} />
  {:else if isMovieFlag}
    <video id="videoItem" controls>
      <track kind="captions" />
    </video>
    <p>
      Dimensions: {videoDem}
    </p>
  {/if}
  <div class="stats">
    {#if typeof entry.datetime !== "undefined"}
      <p>Date: {entry.datetime}</p>
    {/if}
    <p>Size: {size}</p>
    <div id="modeline">
      <p>Permissions:</p>
      <ModeLine mode={entry.mode} />
    </div>
  </div>
</div>

<style>
  #extrapanel {
    display: flex;
    flex-direction: column;
    height: 100%;
    margin: 0px;
    padding: 5px;
    overflow-y: auto;
    overflow-wrap: anywhere;
    word-break: break-all;
  }

  #extrapanel img {
    width: 100%;
  }

  #modeline {
    display: flex;
    flex-direction: row;
  }

  .stats {
    display: flex;
    flex-direction: column;
  }

  .stats p {
    margin: 5px 0px 0px 0px;
  }
</style>
