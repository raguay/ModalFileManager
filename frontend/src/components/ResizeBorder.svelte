<script>
  import { theme } from "../stores/theme.js";

  let { mdown = $bindable() } = $props();
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
  onmousedown={() => {
    mdown = true;
  }}
  onmouseup={() => {
    mdown = false;
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
