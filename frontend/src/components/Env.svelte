<script>
  import { tick } from "svelte";
  import EnvTableRow from "./EnvTableRow.svelte";
  import { config } from "../stores/config.js";

  let { blur = $bindable() } = $props();

  let KVname = $state("");
  let KVvalue = $state("");
  let addNew = $state(false);
  let nameInputDOM = $state(null);

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
        "config.json",
      );
      await $config.OS.writeFile(cfgFile, JSON.stringify(svConfig));
    }
  }

  async function setFocus(flag) {
    blur = flag;
    await tick();
    if (nameInputDOM !== null && !blur) nameInputDOM.focus();
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
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
          bind:value={kv[1]}
          bind:blur
          save={saveConfig}
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
              autocomplete="off"
              spellcheck="false"
              autocorrect="off"
              bind:this={nameInputDOM}
              bind:value={KVname}
              onfocus={() => {}}
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
              autocomplete="off"
              spellcheck="false"
              autocorrect="off"
              onfocus={() => {}}
              onblur={addKV}
              onmouseover={() => {
                setFocus(false);
              }}
              onmouseleave={addKV}
              onkeydown={(e) => {
                switch (e.key) {
                  case "Enter": {
                    addKV();
                    setFocus(true);
                  }
                }
              }}
            />
          </td>
        </tr>
      {:else}
        <tr>
          <td span="2">
            <span
              class="addNewItem"
              onkeydown={() => {}}
              onclick={() => {
                addNew = true;
                setFocus(false);
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
