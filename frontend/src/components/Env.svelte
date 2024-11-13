<script>
  import { onMount, createEventDispatcher } from "svelte";
  import EnvTableRow from "./EnvTableRow.svelte";
  import { config } from "../stores/config.js";

  const dispatch = createEventDispatcher();

  let KVname = $state("");
  let KVvalue = $state("");
  let addNew = $state(false);

  onMount(() => {
    return () => {};
  });

  function deleteCell(kv) {
    delete $config.env[kv[0]];
    $config = $config;
    saveConfig();
  }

  function saveCell(kv, e) {
    $config.env[kv[0]] = e.detail.value;
    $config = $config;
    saveConfig();
  }

  async function saveConfig() {
    if ($config !== null) {
      //
      // Save the important by cyclic structures.
      //
      let cpyOS = $config.OS;
      let cpyExt = $config.extensions;
      let cpyCmd = $config.commands;

      //
      // Null them before trying to make a copy.
      //
      $config.OS = null;
      $config.commands = null;
      $config.extensions = null;

      //
      // Make a copy.
      //
      let svConfig = JSON.parse(JSON.stringify($config));

      //
      // Restore the structures.
      //
      $config.OS = cpyOS;
      $config.commands = cpyCmd;
      $config.extensions = cpyExt;

      //
      // Save the configuration.
      //
      const cfgFile = await $config.OS.appendPath(
        $config.configDir,
        "config.json"
      );
      await $config.OS.writeFile(cfgFile, JSON.stringify(svConfig));
    }
  }

  function addKV() {
    $config.env[KVname] = KVvalue;
    addNew = false;
    setFocus(true);
    KVname = "";
    KVvalue = "";
    $config = $config;
    saveConfig();
  }

  function setFocus(flag) {
    dispatch("setKeyProcess", {
      blur: flag,
    });
  }
</script>

{#if $config !== null && typeof $config.env !== "undefined"}
  <table>
    <thead>
      <tr>
        <th></th>
        <th></th>
        <th> Name </th>
        <th> Value </th>
      </tr>
    </thead>
    <tbody>
      {#each Object.entries($config.env) as kv}
        <EnvTableRow
          name={kv[0]}
          value={kv[1]}
          on:delete={() => {
            deleteCell(kv);
          }}
          on:save={(e) => {
            saveCell(kv, e);
          }}
          on:setKeyProcess={(e) => {
            setFocus(e.detail.blur);
          }}
        />
      {/each}
      {#if addNew}
        <tr>
          <td></td>
          <td></td>
          <td>
            <input
              class="inputKV"
              type="text"
              bind:value={KVname}
              onmouseover={() => {
                setFocus(false);
              }}
            />
          </td>
          <td>
            <input
              class="inputKV"
              type="text"
              bind:value={KVvalue}
              onblur={addKV}
              onmouseover={() => {
                setFocus(false);
              }}
              onmouseleave={addKV}
            />
          </td>
        </tr>
      {:else}
        <tr>
          <td span="2">
            <span
              class="addNewItem"
              onclick={() => {
                addNew = true;
              }}
            >
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

  td,
  th {
    text-align: left;
  }

  .addNewItem {
    color: red;
    cursor: pointer;
    font-size: 20px;
    margin-left: 10px;
  }
</style>
