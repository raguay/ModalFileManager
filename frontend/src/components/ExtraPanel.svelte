<div 
  id="extrapanel"
  bind:this={extraPDOM}
>
  {#if isExtra}
    {@html extraHTML}
  {/if}
  <h6>{ fullPath }</h6>
  {#if (extension === '.png') ||
      (extension === '.jpg')  ||
      (extension === '.svg')  ||
      (extension === '.jpeg') ||
      (extension === '.gif')  ||
      (extension === '.apng') ||
      (extension === '.avif') ||
      (extension === '.webp') ||
      (extension === '.avi')}
    <img src="file://{fullPath}"
         alt="{fullPath}"
    >
  {:else if isMovieFlag}
    <video id='videoItem'
           controls 
    >
      <track kind="captions">
    </video>
    <p>
      Dimensions:  {videoDem}
    </p>
  {/if}
  <div class='stats'>
    <p>Date: {localCurrentCursor.entry.datetime}</p>
    <p>Size: {size}</p>
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

 .stats {
     display: flex;
     flex-direction: column;
 }

 .stats p {
     margin: 5px 0px 0px 0px;
 }
</style>

<script>
  import { onMount, afterUpdate, tick } from 'svelte';
  import { currentCursor } from '../stores/currentCursor.js';
  import { extraPanel } from '../stores/extraPanel.js';
  import util from '../modules/util.js';

  export let side = '';

  let extraPDOM = null;
  let localCurrentCursor = {
    pane: 'left',
    entry: {}
  };
  let localExtraPanel = [];
  let fullPath = '';
  let extension = '';
  let size = '';
  let videoDem = '';
  let isMovieFlag = false;
  let isExtra = false;
  let extraHTML = '';

  onMount(() => {
    // 
    // Subscribe to the current cursor in order to get the file information.
    //
    var unsubscribeCurrentCursor = currentCursor.subscribe((value) => {
      // 
      // Get the file information needed.
      //
      localCurrentCursor = value;
      fullPath = localCurrentCursor.entry.fileSystem.appendPath(localCurrentCursor.entry.dir, localCurrentCursor.entry.name);
      extension = localCurrentCursor.entry.fileSystem.getExtension(localCurrentCursor.entry.name).toLowerCase();
      size = util.readableSize(localCurrentCursor.entry.size);

      //
      // Check the new cursor for extra panel items.
      //
      isExtra = checkExtraPanel();
    });

    // 
    // See if the exta panel has information.
    //
    var unsubscribeExtraPanel = extraPanel.subscribe(value => {
      localExtraPanel = value;
      isExtra = checkExtraPanel();
    });

    // 
    // Return the function to unsubscribe to the stores.
    //
    return(() => {
      unsubscribeCurrentCursor();
      unsubscribeExtraPanel();
    })
  });
  
  afterUpdate(async () => {
    if(isMovie()) {
      await tick();
      var file = new File(localCurrentCursor.entry.dir, localCurrentCursor.entry.name);
      var fileURL = window.URL.createObjectURL(file);
      var videoNode = window.document.getElementById('videoItem');
      if(videoNode !== null) {
        videoNode.src = fileURL;
      }
      getDimensions(fullPath);
    }
    if(!isExtra) {
      isExtra = checkExtraPanel();
    } else {
      localExtraPanel.forEach(item => {
        item.after();
      });
    }
  });

  function checkExtraPanel() {
    localExtraPanel.forEach(item => {
      isExtra = item.check(localCurrentCursor.entry.dir, localCurrentCursor.entry.name, localCurrentCursor.fileSystem, side);
      if(isExtra) {
        extraHTML = item.createHTML();
      }
    });
    return(isExtra);
  }

  function isMovie() {
    isMovieFlag = ((extension === '.mov')  || 
                   (extension === '.mp4')  || 
                   (extension === '.wm')   ||
                   (extension === '.3gp')  ||
                   (extension === '.mpeg') ||
                   (extension === '.avi')  ||
                   (extension === '.gif')  ||
                   (extension === '.ogg'));
    return(isMovieFlag);
  }

  function getDimensions(fileName) {
    var com = 'ffprobe -v error -of flat=s=_ -select_streams v:0 -show_entries stream=height,width "' + fileName + '"';
    localCurrentCursor.entry.fileSystem.runCommandLine(com, (err, stdout) => {
      if(err) {
        console.log(err);
      } else {
        var stdout = stdout.toString('utf8');
        var width = /width=(\d+)/.exec(stdout);
        var height = /height=(\d+)/.exec(stdout);
        videoDem = parseInt(width[1]) + "x" + parseInt(height[1]);
      }
    });
  }
</script>
