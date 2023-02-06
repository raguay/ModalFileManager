{#if (($config !== null) && (typeof $config.configuration.env !== 'undefined'))}
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
      {#each Object.entries($config.configuration.env) as kv}
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
  let addNew = false;
   
  onMount(() => {
    return(() => {
    });
  });
  
  function deleteCell(kv) {
    delete $config.configuration.env[kv[0]];
  }

  function saveCell(kv, e) {
    $config.configuration.env[kv[0]] = e.detail.value;
  }

  function addKV(e) {
    $config.configuration.env[KVname] = KVvalue;
    addNew = false;
    KVname = '';
    KVvalue = '';
  }
</script>
