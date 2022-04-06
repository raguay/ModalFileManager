<script>
  import { onMount } from "svelte";
  import { theme } from "../stores/theme.js";
  import { currentCursor } from "../stores/currentCursor.js";
  import { inputState } from "../stores/inputState.js";
  import { stateMapColors } from "../stores/stateMapColors.js";

  import util from "../modules/util.js";

  let localInputState = "normal";
  let localCurrentCursor = {
    entry: {
      name: "test.txt",
      size: "",
      datetime: "",
    },
    pane: "",
  };
  let localStateMapColors = [];
  let stateColor = "#6fb1e9";
  let size = 0;
  let DT;

  onMount(() => {
    //
    // Here, we are subscribing to the different stores and setting their
    // default values;
    //
    var unSubscribeInputState = inputState.subscribe((value) => {
      localInputState = value;
      stateColor = localStateMapColors[localInputState];
    });
    var unSubscribeCurrentCursor = currentCursor.subscribe((value) => {
      localCurrentCursor = value;
      if (typeof value.entry === "undefined") {
        localCurrentCursor = {
          entry: {
            name: "",
            size: "",
            datetime: "",
          },
          pane: localCurrentCursor.pane,
        };
        size = "";
      } else {
        size = util.readableSize(localCurrentCursor.entry.size);

        //
        // Setup a locale dependent way to show date and time.
        // #TODO: make more programmable?
        //
        DT = new Date(localCurrentCursor.entry.datetime).toLocaleString();
        if (DT === "Invalid Date") DT = "";
      }
    });
    var unSubscribeStateMapColors = stateMapColors.subscribe((value) => {
      localStateMapColors = value;
      stateColor = localStateMapColors[localInputState];
    });
    return () => {
      unSubscribeCurrentCursor();
      unSubscribeInputState();
      unSubscribeStateMapColors();
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
  <span class="state" style="color: 'black'; background-color: {stateColor};">
    {localInputState}
  </span>
  <span
    class="pane"
    style="color: {$theme.Cyan}; background-color: {$theme.backgroundColor};"
  >
    {localCurrentCursor.pane}
  </span>
  <span
    class="file customdata"
    style="color: {$theme.textColor}; background-color: {$theme.backgroundColor};"
    data-tooltip={localCurrentCursor.entry.name}
  >
    {localCurrentCursor.entry.name}
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
