<div 
  id='titleBar'
  data-wails-drag
  style="background-color: {$theme.backgroundColor};
         color: {$theme.textColor};
         font-family: {$theme.font};
         font-size: {$theme.fontSize};
         border-bottom: 3px solid {$theme.borderColor};"
>
  <div 
    id='spacer'
  >
  </div>

  <div
    id='title'
  >
    <p>Modal File Manager</p>
  </div>

  <div 
    id='spacer2'
  >
  </div>
</div>

<style>
  #titleBar {
    display: flex;
    flex-direction: row;
    flex-grow: 0;
    height: 37px;
    width: 100%;
  }

  #spacer {
    min-height: 37px; 
    width: 76px;
    flex-grow: 0;
  }
  
  #spacer2 {
    min-height: 37px; 
    width: 76px;
    flex-grow: 0;
  }

  #title {
    flex-grow: 1;
    padding: 0px;
    margin: 0px;
  }

  #title p {
    padding: 0px;
    margin: 10px auto;
    text-align: center;
  }
</style>

<script>
  import { onMount } from "svelte";
  import { theme } from '../stores/theme.js';
 
</script>
