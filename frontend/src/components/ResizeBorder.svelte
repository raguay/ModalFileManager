<div id='resizeBorder'
     style="padding: 0px; 
            margin: 0px;
            width: 10px;
            max-width: 10px;
            min-width: 10px;
            border-left: 3px solid {localTheme.borderColor};
            border-right: 3px solid {localTheme.borderColor};"
      on:mousedown={e => {
        dispatch('mouseDown', true);
      }}
      on:mouseup={e => {
        dispatch('mouseDown', false);
      }}
>
</div>

<style>
  #resizeBorder {
    display: flex;
    flex-direction: row;
    height: auto;
    cursor: ew-resize;
  }
</style>

<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { theme } from '../stores/theme.js';

  const dispatch = createEventDispatcher();
  
  let localTheme = {};

  onMount(() => {
    var unsubscribeTheme = theme.subscribe(value => {
      localTheme = value;
    });
    return(() => {
      unsubscribeTheme();
    })
  });
</script>
