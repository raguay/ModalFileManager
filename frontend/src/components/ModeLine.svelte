<script>
  let { entry } = $props();
  let modeString = $state("");

  $effect.pre(() => {
    modeString = getRWX(entry.mode >> 6) + "  ";
    modeString += getRWX(entry.mode >> 3) + "  ";
    modeString += getRWX(entry.mode);
  });

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
