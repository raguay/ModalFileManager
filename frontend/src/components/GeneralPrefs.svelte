<script>
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import Env from "../components/Env.svelte";
  import { config } from "../stores/config.js";

  const dispatch = createEventDispatcher();

  let scrollDOM = null;
  let first = true;

  onMount(async () => {
    if ($config !== null) {
      const nfile = await $config.localFS.appendPath(
        $config.configDir,
        "config.json"
      );
      await $config.localFS.writeFile(
        nfile,
        JSON.stringify(value.configuration)
      );
      $config.localFS.setConfig(value.configuration);
    }

    return () => {};
  });

  afterUpdate(() => {
    if (scrollDOM !== null && first) {
      dispatch("setScrollDOM", {
        DOM: scrollDOM,
      });
      first = false;
    }
  });

  function trashChanged(e) {
    $config.configuration.useTrash = e.target.checked;
  }
</script>

<div id="general" bind:this={scrollDOM}>
  {#if $config !== null}
    <h3>Environment for Launching Programs</h3>
    <Env />

    <h3>Other Configuration Items</h3>
    <div class="row">
      <label for="trashcanans"> Use the Trashcan? </label>
      {#if $config.configuration.useTrash}
        <input
          id="trashcanans"
          type="checkbox"
          on:change={trashChanged}
          checked
        />
      {:else}
        <input id="trashcanans" type="checkbox" on:change={trashChanged} />
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
