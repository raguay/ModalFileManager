<tr>
  <td>
    {label}
  </td>
  <td
    on:click={() => { changeValue(); }}
  >
    <div class='rowCell'>
      {#if changeString}
        <input 
          style="color: {$theme.backgroundColor};
                 background-color: {$theme.textColor};
                 font-family: {$theme.font};
                 font-size: {$theme.fontSize};"
          bind:value={value}
          on:blur={() => {
            changeStringValue(value);
          }}
        />
      {:else}
        {value}
      {/if}
      {#if value.startsWith('#')}
        <div class='colorDiv' style="background-color: {value}; border-color: {$theme.textColor};">
        </div>
      {/if}
    </div>
  </td>
</tr>
{#if changeColor}
  <div 
    class='cpicker'
  >
    <HsvPicker on:colorChange={(e) => { colorCallback(e.detail); }} startColor={value}/>
    <button 
      on:click={setValue}
    >
      Set Value
    </button>
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

<script> 
  import { createEventDispatcher } from 'svelte';
  import { theme } from '../stores/theme.js';
  import { HsvPicker } from 'svelte-color-picker';

  const dispatch = createEventDispatcher();

  export let label = '';
  export let value = '';

  let changeColor = false;
  let changeString = false;

  function changeValue() {
    if(value[0] === '#') {
      changeColor = true;
    } else {
      changeString = true;
    }
  }

  function changeStringValue(val) {
    changeString = false;
    dispatch('change', {
      value: val
    });
  }

  function colorCallback(rgba) {
    const newvalue = rgbToHex(parseInt(rgba.r), parseInt(rgba.g), parseInt(rgba.b));
    dispatch('change', {
      value: newvalue
    });
  }

  function setValue() {
    changeColor = false;
  }

  function componentToHex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }
</script>
