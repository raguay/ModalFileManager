<!-- @migration-task Error while migrating Svelte code: Can't migrate code with afterUpdate. Please migrate by hand. -->
<script>
  import { onMount, afterUpdate, tick, createEventDispatcher } from "svelte";
  import util from "../modules/util.js";
  import { theme } from "../stores/theme.js";
  import { keyProcess } from "../stores/keyProcess.js";

  const dispatch = createEventDispatcher();

  export let commands = null;

  let showDescription = true;
  let promptInput = null;
  let promptValue = "";
  let width = null;
  let filtered = [];
  let current = 0;
  let panelDOM = null;
  let currentDOM = null;

  onMount(() => {
    width = window.innerWidth - 30;
    $keyProcess = false;
    if (commands != null) filtered = commands.commandList;
  });

  afterUpdate(async () => {
    await tick();
    promptInput.focus();
  });

  async function exitCP(skip) {
    if (typeof skip === "undefined") skip = false;
    await tick();
    dispatch("closeCommandPrompt", {
      skip: skip,
    });
  }

  async function processKey(e) {
    //
    // If the Enter key, quit the quick search.
    //
    switch (e.key) {
      case "Escape":
        exitCP();
        return false;
        break;
      case "ArrowUp":
        current = current - 1;
        if (current < 0) current = 0;
        changeViewing();
        break;
      case "j":
        if (e.ctrlKey) {
          current = current + 1;
          if (current >= filtered.length) current = filtered.length - 1;
          changeViewing();
        }
        break;
      case "k":
        if (e.ctrlKey) {
          current = current - 1;
          if (current < 0) current = 0;
          changeViewing();
        }
        break;
      case "ArrowDown":
        current = current + 1;
        if (current >= filtered.length) current = filtered.length - 1;
        changeViewing();
        break;
      case "Tab":
        promptValue = filtered[current].name;
        current = 0;
        e.preventDefault();
        e.stopPropagation();
        break;
      case "Enter":
        e.stopPropagation();
        e.preventDefault();
        if (commands !== null) commands.runCommand(filtered[current].name);
        await tick();
        exitCP(true);
        break;
    }
    return false;
  }

  function runCommand(cmd) {
    if (commands !== null) commands.runCommand(cmd);
    exitCP(false);
  }

  function processInput(e) {
    if (commands !== null) filtered = commands.commandList;
    var newPrompt = promptValue.toLowerCase().split("").join(".*");
    filtered = filtered.filter(
      (item) => item.name.toLowerCase().match(newPrompt) !== null
    );
    current = 0;
  }

  function getHeight() {
    //
    // The height of the window minus (status line + Directory + top location)
    //
    return window.document.body.clientHeight - 61;
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
             max-height: {getHeight()}px;"
  on:blur={() => {
    exitCP();
  }}
>
  <input
    type="text"
    bind:this={promptInput}
    bind:value={promptValue}
    style="width: {width !== null ? width - 20 : '100'}px; 
          background-color: {$theme.textColor};
          text-color: {$theme.backgroundColor};"
    on:keydown|capture|stopPropagation={processKey}
    on:input|stopPropagation|preventDefault={processInput}
  />
  {#if filtered.length > 0}
    <div
      id="commandlist"
      bind:this={panelDOM}
      style="max-height: {getHeight() - 40}px;"
    >
      <ul>
        {#each filtered as command, index}
          {#if index === current}
            <li style="color: {$theme.commentColor};">
              <p>
                <a
                  href="/"
                  bind:this={currentDOM}
                  on:click|preventDefault={(e) => {
                    runCommand(command.name);
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
                on:click|preventDefault={() => {
                  runCommand(command.name);
                }}
              >
                {command.name}
              </a>
            </li>
          {/if}
        {/each}
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
