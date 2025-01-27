<script>
  import { onMount, tick } from "svelte";
  import util from "../modules/util.js";
  import { theme } from "../stores/theme.js";
  import { keyProcess } from "../stores/keyProcess.js";

  let { close = $bindable(), skip = $bindable(), commands } = $props();

  let showDescription = true;
  let promptInput = null;
  let promptValue = $state("");
  let width = $state(null);
  let height = $state(null);
  let filtered = $state([]);
  let current = $state(0);
  let panelDOM = $state(null);
  let currentDOM = $state(null);

  onMount(async () => {
    $keyProcess = false;
    await tick();
    if (commands != null) filtered = commands.commandList;
    width = window.innerWidth - 30;
    height = window.document.body.clientHeight - 61;
    return () => {
      $keyProcess = true;
    };
  });

  $effect(async () => {
    await tick();
    width = window.innerWidth - 30;
    height = window.document.body.clientHeight - 61;
    if (promptInput !== null) promptInput.focus();
  });

  async function exitCP(skp) {
    if (typeof skp === "undefined") skp = false;
    $keyProcess = true;
    skip = skp;
    close = true;
  }

  async function processKey(e) {
    //
    // If the Enter key, quit the quick search.
    //
    switch (e.key) {
      case "Escape":
        await exitCP();
        break;
      case "ArrowUp":
        current = current - 1;
        if (current < 0) current = 0;
        changeViewing();
        break;
      case "ArrowDown":
        current = current + 1;
        if (current >= filtered.length) current = filtered.length - 1;
        changeViewing();
        break;
      case "Tab":
        e.preventDefault();
        e.stopPropagation();
        promptValue = filtered[current].name;
        current = 0;
        processInput();
        break;
      case "Enter":
        e.stopPropagation();
        e.preventDefault();
        if (commands !== null) {
          await runCommand(filtered[current].name);
        }
        await exitCP(true);
        break;
    }
  }

  async function runCommand(cmd) {
    if (commands !== null) await commands.runCommand(cmd);
    await exitCP(false);
  }

  function processInput() {
    if (commands !== null) filtered = commands.commandList;
    var newPrompt = promptValue.toLowerCase().split("").join(".*");
    filtered = filtered.filter(
      (item) => item.name.toLowerCase().match(newPrompt) !== null,
    );
    current = 0;
  }

  async function changeViewing() {
    await tick();
    var adj = panelDOM.clientHeight / 2;
    panelDOM.scrollTop = currentDOM.offsetTop - adj;
    if (panelDOM.scrollTop < 0) panelDOM.scrollTop = 0;
  }
</script>

<div
  id="commandPrompt"
  style="background-color: {$theme.backgroundColor};
             color: {$theme.textColor};
             width: {width !== null ? width : 100}px;
             border-color: {util.pSBC(0.1, $theme.backgroundColor)};
             max-height: {height !== null ? height : 100}px;
             height: {height !== null ? height : 100}px;"
  onblur={async () => {
    await exitCP();
  }}
>
  <input
    type="text"
    bind:this={promptInput}
    bind:value={promptValue}
    autocomplete="off"
    spellcheck="false"
    autocorrect="off"
    style="width: {width !== null ? width - 20 : 100}px; 
          background-color: {$theme.textColor};
          text-color: {$theme.backgroundColor};"
    onkeydown={processKey}
    oninput={processInput}
  />
  {#if filtered.length > 0}
    <div
      id="commandlist"
      bind:this={panelDOM}
      style="max-height: {height - 40}px;"
    >
      <ul>
        {#if filtered.length !== 0}
          {#each filtered as command, index}
            {#if index === current}
              <li style="color: {$theme.commentColor};">
                <p>
                  <a
                    href="/"
                    bind:this={currentDOM}
                    onclick={async (e) => {
                      await runCommand(command.name);
                    }}
                  >
                    {command.name}
                  </a>
                </p>
                {#if showDescription}
                  <p class="description" style="color: {$theme.commentColor};">
                    {command.description}
                  </p>
                {/if}
              </li>
            {:else}
              <li>
                <a
                  href="/"
                  onclick={async () => {
                    await runCommand(command.name);
                  }}
                >
                  {command.name}
                </a>
              </li>
            {/if}
          {/each}
        {/if}
      </ul>
    </div>
  {/if}
</div>

<style>
  #commandPrompt {
    display: flex;
    flex-direction: column;
    position: absolute;
    z-index: 500;
    top: 40px;
    left: 10px;
    border: 3px solid;
    border-radius: 5px;
  }

  #commandPrompt input {
    outline-color: transparent;
    margin: auto;
    padding: 0px;
    width: 100px;
    border: 0px solid transparent;
    margin: 10px auto;
  }

  #commandPrompt ul {
    list-style: none;
  }

  #commandPrompt ul li a {
    text-decoration: none;
    color: inherit;
  }

  #commandlist {
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .description {
    margin: 5px 0px 10px 20px;
  }
</style>
