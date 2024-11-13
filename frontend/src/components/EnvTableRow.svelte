<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let { name, value = $bindable() } = $props();

  let inputValue = $state("");
  let editValue = $state(false);

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
      onblur={saveInput}
      onmouseover={() => {
        setFocus(false);
      }}
      onmouseleave={saveInput}
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
