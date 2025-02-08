<script>
  import { tick } from "svelte";
  import { config } from "../stores/config.js";

  let { name, value = $bindable(), save, blur = $bindable() } = $props();

  let inputValue = $state("");
  let editValue = $state(false);
  let inputDOM = $state(null);

  function deleteCell() {
    delete $config.env[name];
    $config = $config;
    save();
  }

  function saveCell() {
    $config.env[name] = inputValue;
    $config = $config;
    save();
  }

  function editCell() {
    inputValue = value;
    editValue = true;
    setFocus(false);
  }

  function saveInput() {
    value = inputValue;
    editValue = false;
    saveCell();
    setFocus(true);
  }

  async function setFocus(flag) {
    await tick();
    blur = flag;
    if (inputDOM !== null) inputDOM.focus();
    save();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<tr>
  <td class="editTD" onclick={editCell}>
    <span> 🖋️ </span>
  </td>
  <td class="deleteTD" onclick={deleteCell}>
    <span> ❌ </span>
  </td>
  <td>{name}</td>
  {#if editValue}
    <input
      bind:value={inputValue}
      bind:this={inputDOM}
      autocomplete="off"
      spellcheck="false"
      autocorrect="off"
      onblur={() => {
        saveInput();
      }}
      onmouseover={() => {
        setFocus(false);
      }}
      onmouseleave={() => {
        saveInput();
      }}
      onkeydown={(e) => {
        switch (e.key) {
          case "Enter": {
            e.preventDefault();
            e.stopPropagation();
            saveInput();
            break;
          }
        }
      }}
    />
  {:else}
    <td>{value}</td>
  {/if}
</tr>

<style>
  input {
    width: 100%;
  }

  .editTD {
    margin-left: 10px;
    cursor: pointer;
  }

  .deleteTD {
    margin-left: 10px;
    cursor: pointer;
  }
</style>
