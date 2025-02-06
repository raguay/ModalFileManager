<script>
  import { onMount, tick } from "svelte";
  import util from "../modules/util.js";
  import { theme } from "../stores/theme.js";
  import { keyProcess } from "../stores/keyProcess.js";

  let {
    msgBoxReturn = $bindable(),
    closeMsgBox = $bindable(),
    config,
    items,
    spinners,
    skip = $bindable(),
    msgCallBack,
  } = $props();

  let pickerNum = $state(0);
  let pickerItems = $state([]);
  let pickerItemsOrig = [];
  let pickerValue = $state("");
  let pickerDOM = $state(null);
  let msgboxDOM = $state(null);
  let pickerExtra = false;

  $effect(async () => {
    await tick();
    items = updateSpinners(spinners);
    updateItems(items);
    if (pickerDOM !== null) updateHeight(pickerDOM);
    var main = window.document.getElementById("msgboxMain");
    if (main !== null) {
      main.focus();
    } else {
      msgboxDOM.focus();
    }
    let exit = false;
    items.forEach((item) => {
      if (item.name === "spinner") {
        if (item.value === "100") exit = true;
      }
    });
    if (exit) {
      cancel();
    }
  });

  onMount(() => {
    //
    // Turn off key processing.
    //
    $keyProcess = false;

    //
    // Return a function to be called when this component no longer
    // is being shown.
    //
    return () => {
      $keyProcess = true;
    };
  });

  function updateSpinners(spins) {
    if (
      items !== null &&
      (typeof spins.length !== "undefined" || spins !== null) &&
      spins.length > 0
    ) {
      items = items.map((item) => {
        if (item.type === "spinner") {
          const nval = spins.find((spitem) => spitem.name === item.name);
          if (nval !== "undefined") item.value = nval.value;
        }
        return item;
      });
    }
    return items;
  }

  async function returnPickerValue(skip) {
    if (typeof skip === "undefined") skip = false;
    $keyProcess = true;
    var retItem = {};
    if (pickerItems.length > 0) {
      retItem.value = pickerItems[pickerNum].value;
      retItem.name = pickerItems[pickerNum].name;
    } else if (pickerExtra) {
      retItem.value = pickerValue;
      retItem.name = "";
    }
    msgBoxReturn = {
      ans: retItem,
    };
    await msgCallBack();
    closeMsgBox = true;
    $keyProcess = true;
    skip = true;
  }

  async function returnInputValue(skip) {
    if (typeof skip === "undefined") skip = false;
    var retItem = {
      name: items[0].name,
      value: items[0].value,
    };
    msgBoxReturn = {
      ans: retItem,
    };
    await msgCallBack();
    closeMsgBox = true;
    $keyProcess = true;
    skip = true;
  }

  function cancel() {
    console.log("Cancel messagebox:  ");
    skip = false;
    $keyProcess = true;
    closeMsgBox = true;
  }

  function updateHeight(dom) {
    if (typeof dom !== "undefined") {
      dom.style.maxHeight =
        new Number(document.body.clientHeight - 200).toString() + "px";
    }
  }

  function pickerInputChange(e) {
    if (e.key === "ArrowUp") {
      //
      // Go up the list. Zero is at the top.
      //
      movePickerBar(-1);
    } else if (e.key === "ArrowDown") {
      //
      // Go down the list. The largest index is at the bottom.
      //
      movePickerBar(1);
    } else if (e.key === "Escape") {
      //
      // Escape key. Just exit without doing anything.
      //
      closeMsgBox = false;
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (typeof pickerItems[pickerNum].value.name !== "undefined")
        pickerValue = pickerItems[pickerNum].value.name;
      else if (typeof pickerItems[pickerNum].name !== "undefined")
        pickerValue = pickerItems[pickerNum].name;
      else pickerValue = pickerItems[pickerNum].value;
    } else if (
      (e.which >= 48 && e.which <= 90) ||
      e.which >= 186 ||
      e.which === 32
    ) {
      //
      // It's a normal printable character. Add it and re-evaluate.
      //
      let cur = pickerValue.toLowerCase();
      pickerItems = pickerItemsOrig.filter((it) =>
        it.name.toLowerCase().includes(cur),
      );
      movePickerBar(0);
    } else if (e.keyCode === 8) {
      pickerValue = pickerValue.slice(0, pickerValue.length - 1);
      let cur = pickerValue.toLowerCase();
      pickerItems = pickerItemsOrig.filter((it) =>
        it.name.toLowerCase().includes(cur),
      );
      movePickerBar(0);
    } else if (e.which === 13) {
      //
      // Enter key. Take the highlighted value and return.
      //
      e.preventDefault();
      var pickerval = "";
      if (pickerExtra && pickerItems.length === 0) {
        pickerval = pickerValue;
      } else {
        pickerval = pickerItems[pickerNum].value;
      }
      msgBoxReturn = {
        ans: {
          type: "picker",
          value: pickerval,
        },
      };
      closeMsgBox = true;
    }
  }

  function pickerSelected(sel) {
    //
    // Enter key. Take the highlighted value and return.
    //
    $keyProcess = true;
    msgBoxReturn = {
      ans: {
        type: "picker",
        value: sel,
      },
    };
    closeMsgBox = true;
  }

  function updateItems(itms) {
    itms.forEach((itm) => {
      if (itm.type === "picker") {
        pickerItems = itm.selections;
        pickerItemsOrig = itm.selections;
        pickerExtra = itm.extra;
      }
    });
  }

  function movePickerBar(amount) {
    pickerNum = pickerNum + amount;
    if (pickerNum > pickerItems.length - 1) pickerNum = pickerItems.length - 1;
    if (pickerNum < 0) pickerNum = 0;

    if (pickerDOM !== null) {
      var itemDOM =
        window.document.body.getElementsByClassName("pickerSelected")[0];
      if (typeof itemDOM !== "undefined") {
        var cur = pickerNum * itemDOM.clientHeight;
        var curP1 = (pickerNum + 1) * itemDOM.clientHeight;
        if (pickerDOM.clientHeight < cur)
          pickerDOM.scrollTop += itemDOM.clientHeight;
        if (pickerDOM.clientTop + pickerDOM.clientHeight < curP1)
          pickerDOM.scrollTop += itemDOM.clientHeight;
        if (pickerDOM.scrollTop > cur) pickerDOM.scrollTop = cur;
        if (pickerDOM.scrollTop < 0) DOM.scrollTop = 0;
      }
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="messageboxbg">
  <div
    id="messagebox"
    style="background-color: {$theme.backgroundColor};
           border-color: {util.pSBC(0.1, $theme.backgroundColor)};
           color: {$theme.textColor};"
    onkeydown={(e) => {
      if (
        e.key === "Escape" ||
        (e.key === "Enter" && items[0].type === "label")
      ) {
        e.preventDefault();
        closeMsgBox = true;
      }
    }}
    bind:this={msgboxDOM}
  >
    {#if config !== null}
      <h2>{config.title}</h2>
      {#if typeof items !== null}
        {#each items as item}
          {#if typeof item !== "undefined"}
            {#if item.type === "input"}
              <p>{item.msg}</p>
              <input
                type="text"
                id={item.id}
                bind:value={item.value}
                autocomplete="off"
                spellcheck="false"
                autocorrect="off"
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    returnInputValue(true);
                  }
                }}
              />
            {:else if item.type === "selector"}
              <select id={item.id} bind:value={item.value}>
                {#each item.selections as selection}
                  <option value={selection.value}>
                    {selection.name}
                  </option>
                {/each}
              </select>
            {:else if item.type === "picker"}
              <div id="pickerDiv">
                <input
                  id={item.id}
                  bind:value={pickerValue}
                  onkeydown={pickerInputChange}
                />
                <div id="{item.id}picker" class="picker" bind:this={pickerDOM}>
                  {#each pickerItems as selection, key}
                    {#if key === pickerNum}
                      <a
                        href="/#"
                        style="color: {$theme.backgroundColor};
                               background-color: {$theme.textColor};"
                        class="pickerSelected"
                        onclick={() => {
                          pickerSelected(selection);
                        }}
                      >
                        {selection.name}
                      </a>
                    {:else}
                      <a
                        href="/#"
                        style="background-color: {$theme.backgroundColor};
                               color: {$theme.textColor};"
                        onclick={() => {
                          pickerSelected(selection);
                        }}
                      >
                        {selection.name}
                      </a>
                    {/if}
                  {/each}
                </div>
              </div>
            {:else if item.type === "spinner"}
              <progress id={item.name} value={item.value} max="100"></progress>
            {:else if item.type === "label"}
              <label for={item.for}>
                {item.text}
              </label>
            {:else if item.type === "html"}
              {@html item.text}
            {/if}
          {:else}
            <p>System Error</p>
          {/if}
        {/each}
      {:else}
        <p>System Error</p>
      {/if}
      <div id="butRow">
        {#if typeof config.noShowButton !== "undefined" && !config.noShowButton}
          <button
            onclick={() => {
              if (items[0].type === "picker") {
                returnPickerValue(false);
              } else {
                returnInputValue(false);
              }
            }}
          >
            Okay
          </button>
        {/if}
        <button onclick={cancel}> Cancel </button>
      </div>
    {/if}
  </div>
</div>

<style>
  #messageboxbg {
    position: absolute;
    top: 0px;
    left: 0px;
    height: 100%;
    width: 100%;
    background-color: transparent;
    z-index: 100;
  }

  #messagebox {
    display: flex;
    flex-direction: column;
    margin: 40px auto;
    padding: 10px;
    width: 70%;
    border: 3px solid;
    border-radius: 5px;
    user-select: none;
    -webkit-user-select: none;
    outline: none;
  }

  #butRow {
    display: flex;
    flex-direction: row;
    align-items: center;
    align-content: center;
    margin: 20px auto 0px auto;
  }

  #butRow button:first-child {
    margin: auto 10px auto auto;
    border-radius: 5px;
  }

  #butRow button:last-child {
    margin: auto auto auto 10px;
    border-radius: 5px;
  }

  #pickerDiv input {
    width: 100%;
  }

  .picker {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .picker a {
    text-decoration: none;
  }

  .pickerSelected {
    text-decoration: none;
  }
</style>
