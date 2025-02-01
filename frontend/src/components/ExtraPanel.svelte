<script>
  import { tick } from "svelte";
  import ModeLine from "./ModeLine.svelte";
  import { currentCursor } from "../stores/currentCursor.js";
  import { extraPanel } from "../stores/extraPanel.js";
  import util from "../modules/util.js";

  let { side } = $props();

  let fullPath = "";
  let extension = "";
  let size = "";
  let videoDem = "";
  let isMovieFlag = false;
  let isExtra = false;
  let extraHTML = "";
  let lastChecked = "";
  let lookupPath = "";

  $effect.pre(async () => {
    //
    // Get the file information needed whenever the current cursor changes.
    //
    if (lastChecked !== $currentCursor.entry.name) {
      lastChecked = $currentCursor.entry.name;
      fullPath = await $currentCursor.entry.fileSystem.appendPath(
        $currentCursor.entry.dir,
        $currentCursor.entry.name,
      );
      let hmdir = await $currentCursor.entry.fileSystem.getHomeDir();
      lookupPath = `http://127.0.0.1:9998/filesys/${fullPath.substr(
        hmdir.length + 1,
      )}`;
      lookupPath = encodeURI(lookupPath);
      extension = $currentCursor.entry.ext.toLowerCase();
      size = util.readableSize($currentCursor.entry.size);

      //
      // Check the new cursor for extra panel items.
      //
      isExtra = checkExtraPanel();
    }
  });

  $effect(async () => {
    if (isMovie()) {
      await tick();
      /* 
      var fileURL = window.URL.createObjectURL(lookupPath);
      var videoNode = window.document.getElementById("videoItem");
      if (videoNode !== null) {
        videoNode.src = fileURL;
      }
     */
      getDimensions(fullPath);
    }
    if (isExtra) {
      $extraPanel.forEach((item) => {
        item.after();
      });
    }
  });

  function checkExtraPanel() {
    extraHTML = "";
    $extraPanel.forEach(async (item) => {
      isExtra = await item.check(
        $currentCursor.entry.dir,
        $currentCursor.entry.name,
        $currentCursor.fileSystem,
        side,
      );
      if (isExtra) {
        var newContent = await item.createHTML();
        extraHTML = extraHTML.concat("\n", newContent);
      }
    });
    return isExtra;
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

  function getDimensions(fileName) {
    var com =
      'ffprobe -v error -of flat=s=_ -select_streams v:0 -show_entries stream=height,width "' +
      fileName +
      '"';
    $currentCursor.entry.fileSystem.runCommandLine(
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
    <p>Date: {$currentCursor.entry.datetime}</p>
    <p>Size: {size}</p>
    <div id="modeline">
      <p>Permissions:</p>
      <ModeLine entry={$currentCursor.entry} />
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
