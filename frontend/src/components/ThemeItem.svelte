<script>
  import { theme } from "../stores/theme.js";
  import ColorPicker from "svelte-awesome-color-picker";

  let { label, value, update, blur = $bindable() } = $props();

  let changeColor = $state(false);
  let changeString = $state(false);
  let showPicker = $state(false);
  let showInput = $state(false);
  let hex = $state("");
  let nvalue = $state("");
  let inputDOM = $state(null);

  $effect.pre(() => {
    setValueType();
    if (inputDOM !== null) inputDOM.focus();
  });

  function setValueType() {
    showPicker = false;
    if (value[0] === "#") {
      hex = value;
      changeColor = true;
      changeString = false;
    } else {
      nvalue = value;
      changeString = true;
      changeColor = false;
    }
  }

  function changeStringValue(val) {
    showInput = false;
    inputDOM = null;
    update(label, val);
    setFocus(true);
  }

  function setValue() {
    update(label, hex);
    showPicker = false;
    setFocus(true);
  }

  function setFocus(flag) {
    blur = flag;
  }
</script>

<!-- svelte-ignore a11y_mouse_events_have_key_events a11y_no_static_element_interactions a11y_invalid_attribute -->
<tr>
  <td>
    {label}
  </td>
  <td>
    <div class="rowCell">
      {#if showInput}
        <input
          style="color: {$theme.backgroundColor};
                 background-color: {$theme.textColor};
                 font-family: {$theme.font};
                 font-size: {$theme.fontSize};"
          bind:value={nvalue}
          bind:this={inputDOM}
          autocomplete="off"
          spellcheck="false"
          autocorrect="off"
          onkeyup={(e) => {
            e.preventDefault();
            switch (e.key) {
              case "Enter":
                e.stopPropagation();
                changeStringValue(nvalue);
                value = nvalue;
                break;
              case "Esc":
                showInput = false;
                nvalue = value;
                break;
              case "Tab":
                changeStringValue(nvalue);
                value = nvalue;
                break;
            }
          }}
          onblur={() => {
            changeStringValue(nvalue);
            value = nvalue;
          }}
        />
      {:else}
        <div class="inputValue">
          <span
            onclick={() => {
              showInput = true;
              setFocus(false);
            }}
          >
            {value}
          </span>
        </div>
      {/if}
      {#if changeColor}
        <div
          class="colorDiv"
          style="background-color: {value}; border-color: {$theme.textColor};"
          onclick={() => {
            hex = value;
            showPicker = true;
          }}
        ></div>
      {/if}
    </div>
  </td>
</tr>
{#if showPicker}
  <div class="cpicker">
    <ColorPicker
      bind:hex
      {label}
      isOpen="true"
      isPopup="false"
      on:input={(e) => {
        hex = e.details.hex;
      }}
    />
    <button onclick={setValue}> Set Value </button>
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

  .inputValue {
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
