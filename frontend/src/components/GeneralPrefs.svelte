<div
  id='general' 
  bind:this={scrollDOM}
>
  {#if localConfig !== null}
    <h3>Environment for Launching Programs</h3>
    <Env />

    <h3>Other Configuration Items</h3>
    <div 
      class='row'
    >
      <label
        for='trashcanans'
      >
        Use the Trashcan? 
      </label>
      {#if localConfig.configuration.useTrash}
        <input 
          id='trashcanans'
          type='checkbox'
          on:change={trashChanged}
          checked
        />
      {:else}
        <input 
          id='trashcanans'
          type='checkbox'
          on:change={trashChanged}
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

<script>
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import Env from '../components/Env.svelte';
  import { config } from '../stores/config.js';

  const dispatch = createEventDispatcher();

  let localConfig = null;
  let scrollDOM = null;
  let first = true;

  onMount(() => {
    var unsubscribeConfig = config.subscribe(async (value) => {
      // 
      // The Config.configuration is what we can change. It contains:
      // 
      // env          The environment to use when executing command line programs.
      // useTrash     If true, delete to the trashcan, otherwise delete with 'rm' command.
      //
      if(localConfig !== null) {
        const nfile = await localConfig.localFS.appendPath(localConfig.configDir,'config.json');
        await localConfig.localFS.writeFile(nfile, JSON.stringify(value.configuration));
        localConfig.localFS.setConfig(value.configuration);
      }
      localConfig = value;
    });

    return(() => {
      unsubscribeConfig();
    });
  });

  afterUpdate(() => {
    if((scrollDOM !== null)&&(first)) {
      dispatch('setScrollDOM', {
        DOM: scrollDOM
      });
      first = false;
    }
  });

  function trashChanged(e) {
    localConfig.configuration.useTrash = e.target.checked;
    config.set(localConfig);
  }
</script>
