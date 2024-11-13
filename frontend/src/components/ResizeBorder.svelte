<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { theme } from "../stores/theme.js";

  const dispatch = createEventDispatcher();

  onMount(() => {
    return () => {};
  });
</script>

<div
  id="resizeBorder"
  style="padding: 0px; 
            margin: 0px;
            width: 10px;
            max-width: 10px;
            min-width: 10px;
            border-left: 3px solid {$theme.borderColor};
            border-right: 3px solid {$theme.borderColor};"
  onmousedown={(e) => {
    dispatch("mouseDown", true);
  }}
  onmouseup={(e) => {
    dispatch("mouseDown", false);
  }}
></div>

<style>
  #resizeBorder {
    display: flex;
    flex-direction: row;
    height: auto;
    cursor: ew-resize;
  }
</style>
