<script>
  let { mode } = $props();
  let modeString = $state("");

  $effect(() => {
    modeString = UpdateModeLine(mode);
  });

  function UpdateModeLine(modl) {
    return getRWX(modl >> 6) + "  " + getRWX(modl >> 3) + "  " + getRWX(modl);
  }

  function getRWX(bits) {
    let result = bits & 4 ? "r" : "-";
    result += bits & 2 ? "w" : "-";
    result += bits & 1 ? "x" : "-";
    return result;
  }
</script>

<div id="main">
  <span>{modeString}</span>
</div>

<style>
  #main {
    display: flex;
    flex-direction: row;
  }

  #main span {
    margin-top: 5px;
    margin-left: 10px;
  }
</style>
