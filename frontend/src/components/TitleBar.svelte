<script>
  import { theme } from "../stores/theme.js";
</script>

<div
  id="titleBar"
  style="background-color: {$theme.backgroundColor};
         color: {$theme.textColor};
         font-family: {$theme.font};
         font-size: {$theme.fontSize};
         border-bottom: 3px solid {$theme.borderColor};"
>
  <div id="spacer"></div>

  <div id="title">
    <p>Modal File Manager</p>
  </div>

  <div id="spacer2"></div>
</div>

<style>
  #titleBar {
    display: flex;
    flex-direction: row;
    flex-grow: 0;
    height: 37px;
    width: 100%;
    -webkit-user-select: none;
    user-select: none;
    --wails-draggable: drag;
  }

  #spacer {
    min-height: 37px;
    width: 76px;
    flex-grow: 0;
    -webkit-user-select: none;
    user-select: none;
  }

  #spacer2 {
    min-height: 37px;
    width: 76px;
    flex-grow: 0;
    -webkit-user-select: none;
    user-select: none;
  }

  #title {
    flex-grow: 1;
    padding: 0px;
    margin: 0px;
    -webkit-user-select: none;
    user-select: none;
  }

  #title p {
    padding: 0px;
    margin: 10px auto;
    text-align: center;
    -webkit-user-select: none;
    user-select: none;
  }
</style>
