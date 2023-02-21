<script>
  import { afterUpdate, createEventDispatcher } from "svelte";
  import { theme } from "../stores/theme.js";
  import ColorPicker from "svelte-awesome-color-picker";

  const dispatch = createEventDispatcher();

  export let label = "";
  export let value = "";

  let changeColor = false;
  let changeString = false;
  let hex;

  afterUpdate(() => {
    hex = value;
  });

  function changeValue() {
    if (value[0] === "#") {
      changeColor = true;
    } else {
      changeString = true;
    }
    setFocus(false);
  }

  function changeStringValue(val) {
    changeString = false;
    dispatch("change", {
      value: val,
    });
  }

  function colorCallback(hex) {
    dispatch("change", {
      value: hex,
    });
  }

  function setValue() {
    changeColor = false;
    setFocus(true);
  }

  function setFocus(flag) {
    dispatch("setKeyProcess", {
      blur: flag,
    });
  }
</script>

<tr>
  <td>
    {label}
  </td>
  <td
    on:click={() => {
      changeValue();
    }}
  >
    <div class="rowCell">
      {#if changeString}
        <input
          style="color: {$theme.backgroundColor};
                 background-color: {$theme.textColor};
                 font-family: {$theme.font};
                 font-size: {$theme.fontSize};"
          bind:value
          on:blur={() => {
            changeStringValue(value);
            setFocus(true);
          }}
          on:mouseover={() => {
            setFocus(false);
          }}
        />
      {:else}
        {value}
      {/if}
      {#if value.startsWith("#")}
        <div
          class="colorDiv"
          style="background-color: {value}; border-color: {$theme.textColor};"
        />
      {/if}
    </div>
  </td>
</tr>
{#if changeColor}
  <div class="cpicker">
    <ColorPicker
      on:input={(e) => {
        colorCallback(e.detail.hex);
      }}
      bind:hex
      {label}
      isOpen="true"
      isPopup="false"
    />
    <button on:click={setValue}> Set Value </button>
  </div>
{/if}

<style>
  .cpicker {
    display: flex;
    flex-direction: row;
    color: black;
  }

  .rowCell {
    display: flex;
    flex-direction: row;
  }

  .colorDiv {
    height: 18px;
    width: 18px;
    margin: auto 0px auto 10px;
    padding: 0px;
    border: solid 1px;
  }

  .rowCell input {
    width: 100%;
    border: solid 1px transparent;
    border-radius: 10px;
  }
</style>
