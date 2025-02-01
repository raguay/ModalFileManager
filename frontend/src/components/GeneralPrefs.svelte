<script>
  import Env from "../components/Env.svelte";
  import { config } from "../stores/config.js";

  let { scrollDOM = $bindable() } = $props();
</script>

<div id="general" bind:this={scrollDOM}>
  {#if $config !== null}
    <h3>Environment for Launching Programs</h3>
    <Env />

    <h3>Other Configuration Items</h3>
    <div class="row">
      <label for="trashcanans"> Use the Trashcan? </label>
      {#if $config.useTrash}
        <input
          id="trashcanans"
          type="checkbox"
          checked
          onchange={(e) => {
            $config.useTrash = e.target.checked;
          }}
        />
      {:else}
        <input
          id="trashcanans"
          type="checkbox"
          onchange={(e) => {
            $config.useTrash = e.target.checked;
          }}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  #general {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    overflow-x: auto;
  }

  #trashcanans {
    margin: auto 0px auto 10px;
  }

  h3 {
    margin-left: 10px;
  }

  .row {
    display: flex;
    flex-direction: row;
    margin: 10px;
  }
</style>
