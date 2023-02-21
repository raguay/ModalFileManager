<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let name;
  export let value;

  let inputValue = "";
  let editValue = false;

  function editCell() {
    inputValue = value;
    editValue = true;
  }

  function saveInput() {
    value = inputValue;
    editValue = false;
    setFocus(true);
    dispatch("save", {
      value: inputValue,
    });
  }

  function deleteCell() {
    dispatch("delete", {});
  }

  function setFocus(flag) {
    dispatch("setKeyProcess", {
      blur: flag,
    });
  }
</script>

<tr>
  <td class="editTD" on:click={editCell}>
    <span> 🖋️ </span>
  </td>
  <td class="deleteTD" on:click={deleteCell}>
    <span> ❌ </span>
  </td>
  <td>{name}</td>
  {#if editValue}
    <input
      bind:value={inputValue}
      on:blur={saveInput}
      on:mouseover={() => {
        setFocus(false);
      }}
      on:mouseleave={saveInput}
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
