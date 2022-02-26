{#if ((localConfig !== null) && (typeof localConfig.configuration.env !== 'undefined'))}
  <table>
    <thead>
      <tr>
        <th>
        </th>
        <th>
        </th>
        <th>
          Name
        </th>
        <th>
          Value
        </th>
      </tr>
    </thead>
    <tbody>
      {#each Object.entries(localConfig.configuration.env) as kv}
        <EnvTableRow 
          name={kv[0]}
          value={kv[1]}
          on:delete={(e) => { deleteCell(kv); }}
          on:save={(e) => { saveCell(kv, e); }}
        />
      {/each}
      {#if addNew}
        <tr>
          <td></td>
          <td></td>
          <td>
            <input class="inputKV" type='text' bind:value={KVname} />
          </td>
          <td>
            <input class="inputKV" type='text' bind:value={KVvalue} on:blur={addKV} />
          </td>
        </tr>
      {:else}
        <tr>
          <td span=2>
            <span class="addNewItem" on:click={() => { addNew = true; }}>
              +
            </span>
          </td>
        </tr>
      {/if}
    </tbody>
  </table>
{/if}

<style>
  table {
    margin-left: 10px;
    user-select: text;
  }

  td, th {
    text-align: left;
  }

  .addNewItem {
    color: red;
    cursor: pointer;
    font-size: 20px;
    margin-left: 10px;
  }
</style>

<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import EnvTableRow from './EnvTableRow.svelte';
  import { config } from '../stores/config.js';
  
  const dispatch = createEventDispatcher();

  let KVname = '';
  let KVvalue = '';
  let localConfig = null;
  let addNew = false;
   
  onMount(() => {
    const unsubConfig = config.subscribe(value => {
      localConfig = value;
    });

    return(() => {
      unsubConfig();
    });
  });
  
  function deleteCell(kv) {
    delete localConfig.configuration.env[kv[0]];
    config.set(localConfig);
  }

  function saveCell(kv, e) {
    localConfig.configuration.env[kv[0]] = e.detail.value;
    config.set(localConfig);
  }

  function addKV(e) {
    localConfig.configuration.env[KVname] = KVvalue;
    addNew = false;
    config.set(localConfig);
    KVname = '';
    KVvalue = '';
  }
</script>
