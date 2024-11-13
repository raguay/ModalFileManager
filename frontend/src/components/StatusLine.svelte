<script>
  import { onMount } from "svelte";
  import { theme } from "../stores/theme.js";
  import { currentCursor } from "../stores/currentCursor.js";
  import { inputState } from "../stores/inputState.js";
  import { stateMapColors } from "../stores/stateMapColors.js";

  import util from "../modules/util.js";

  let size = $state(0);
  let DT = $state();

  onMount(() => {
    //
    // Here, we are subscribing to the different stores and setting their
    // default values;
    //
    let unsubscribeCurrentCursor = currentCursor.subscribe((value) => {
      if (typeof value.entry === "undefined") {
        $currentCursor = {
          entry: {
            name: "",
            size: "",
            datetime: "",
          },
          pane: value.pane,
        };
        size = "";
      } else {
        size = util.readableSize(value.entry.size);
        //
        // Setup a locale dependent way to show date and time.
        // #TODO: make more programmable?
        //
        DT = new Date(value.entry.datetime).toLocaleString();
        if (DT === "Invalid Date") DT = "";
      }
    });
    return () => {
      unsubscribeCurrentCursor();
    };
  });
</script>

<div
  id="statusLine"
  style="background-color: {$theme.backgroundColor};
         color: {$theme.textColor};
         font-family: {$theme.font};
         font-size: {$theme.fontSize};
         border-top: 3px solid {$theme.borderColor};"
>
  <span
    class="state"
    style="color: 'black'; background-color: {$stateMapColors[$inputState]};"
  >
    {$inputState}
  </span>
  <span
    class="pane"
    style="color: {$theme.Cyan}; background-color: {$theme.backgroundColor};"
  >
    {$currentCursor.pane}
  </span>
  <span
    class="file customdata"
    style="color: {$theme.textColor}; background-color: {$theme.backgroundColor};"
    data-tooltip={$currentCursor.entry.name}
  >
    {$currentCursor.entry.name}
  </span>
  <span
    class="file customdata"
    style="color: {$theme.Orange}; background-color: {$theme.backgroundColor};"
    data-tooltip={DT}
  >
    {DT}
  </span>
  <span
    class="file"
    style="color: {$theme.Green}; 
           background-color: {$theme.backgroundColor};
           flex-grow: 2;"
  >
    {size}
  </span>
</div>

<style>
  #statusLine {
    display: flex;
    flex-direction: row;
    flex-grow: 0;
    margin: 0px;
    padding: 0px;
    width: 100%;
    min-height: 31px;
    height: 31px;
    max-height: 31px;
    -webkit-user-select: none;
    user-select: none;
  }

  .pane {
    margin: 0px;
    padding: 5px 5px 5px 10px;
    width: 35px;
    min-width: 50px;
    -webkit-user-select: none;
    user-select: none;
  }

  .state {
    margin: 0px;
    padding: 5px 10px 5px 10px;
    color: black;
    min-width: 50px;
    -webkit-user-select: none;
    user-select: none;
  }

  .file {
    margin: 0px;
    padding: 5px 10px 5px 5px;
    min-width: 50px;
    overflow: hidden;
    white-space: nowrap;
    -webkit-user-select: none;
    user-select: none;
  }

  span.customdata {
    position: relative;
    -webkit-user-select: none;
    user-select: none;
  }

  span.customdata:hover::before {
    content: attr(data-tooltip);
    background-color: inherit;
    color: inherit;
    position: fixed;
    bottom: 2em;
    min-width: 20px;
    border: 1px #808080 solid;
    padding: 8px;
    z-index: 1;
    -webkit-user-select: none;
    user-select: none;
  }
</style>
