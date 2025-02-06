<script>
  import { onMount } from "svelte";
  import { theme } from "../stores/theme.js";
  import { config } from "../stores/config.js";
  import { keyProcess } from "../stores/keyProcess.js";
  import util from "../modules/util.js";
  import * as ap from "../../dist/wailsjs/go/main/App.js";

  let { toggle = $bindable() } = $props();
  let repos = null;
  let themes = null;
  let width = $state(null);
  let msgs = [];
  let pickerDOM = null;
  let hiddenInput = null;
  let once = true;
  let timeOut = 0;
  let loading = $state(true);

  onMount(async () => {
    $keyProcess = false;
    timeOut = setTimeout(focusInput, 1000);
    await loadRepoInfo();
    return () => {
      hiddenInput = null;
      clearTimeout(timeOut);
    };
  });

  $effect(() => {
    width = window.innerWidth - 60;
    if (typeof hiddenInput !== "undefined") hiddenInput.focus();
  });

  function focusInput() {
    if (once) $keyProcess = false;
    once = false;
    clearTimeout(timeOut);
    if (typeof hiddenInput !== "undefined" && hiddenInput !== null)
      hiddenInput.focus();
    timeOut = setTimeout(focusInput, 1000);
  }

  async function loadRepoInfo() {
    loading = true;
    repos = await ap.GetGitHubScripts();
    for (let i = 0; i < repos.length; i++) {
      repos[i].loaded = await extExists(repos[i]);
    }
    themes = await ap.GetGitHubThemes();
    for (let i = 0; i < themes.length; i++) {
      themes[i].loaded = await themeExists(themes[i]);
    }
    loading = false;
    repos = repos;
    themes = themes;
  }

  function getHeight() {
    //
    // The height of the window minus (status line + Directory + top location)
    //
    return window.document.body.clientHeight - 71;
  }

  function exitGitHub() {
    $keyProcess = true;
    inputHidden = null;
    toggle = false;
  }

  async function installTheme(thm) {
    var thmDir = await $config.OS.appendPath($config.configDir, "themes");
    thmDir = await $config.OS.appendPath(thmDir, thm.name);
    if (!(await $config.OS.dirExists(thmDir))) {
      await $config.OS.createDir(thmDir);
    }

    //
    // Use the go-git library to clone the theme.
    //
    await ap.CloneGitHub(thm.url, thmDir);
    loadTheme(thm);
    loadRepoInfo();
  }

  async function loadTheme(thm) {
    var thmDir = await $config.OS.appendPath($config.configDir, "themes");
    thmDir = await $config.OS.appendPath(thmDir, thm.name);
    const pfile = await $config.OS.appendPath(thmDir, "package.json");
    if (await $config.OS.fileExists(pfile)) {
      var manifest = await $config.OS.readFile(pfile);
      manifest = JSON.parse(manifest);
      const mfile = await $config.OS.appendPath(thmDir, manifest.mfmtheme.main);
      var newTheme = await $config.OS.readFile(mfile);
      newTheme = JSON.parse(newTheme);
      theme.set(newTheme);
      addMsg(thm, "This theme is now being used.");
    } else {
      addMsg(thm, "The theme doesn't have a package.json file.");
    }
  }

  async function themeExists(thm) {
    var thmDir = await $config.OS.appendPath($config.configDir, "themes");
    thmDir = await $config.OS.appendPath(thmDir, thm.name);
    var result = await $config.OS.dirExists(thmDir);
    return result;
  }

  async function deleteTheme(thm) {
    var thmDir = await $config.OS.appendPath($config.configDir, "themes");
    await $config.OS.deleteEntries(
      {
        name: thm.name,
        dir: thmDir,
      },
      () => {
        themes = themes.map((item) => {
          if (item.name === thm.name) {
            item.loaded = false;
          }
          return item;
        });
      },
    );
  }

  async function installExtension(ext) {
    var extDir = await $config.OS.appendPath($config.configDir, "extensions");
    extDir = await $config.OS.appendPath(extDir, ext.name);
    if (!(await $config.OS.dirExists(extDir))) {
      await $config.OS.createDir(extDir);
    }
    //
    // Use the go-git library to clone the extension.
    //
    await ap.CloneGitHub(ext.url, extDir);
    addMsg(ext, "Restart the program to use this extension.");
    loadRepoInfo();
  }

  async function extExists(ext) {
    var extDir = await $config.OS.appendPath($config.configDir, "extensions");
    extDir = await $config.OS.appendPath(extDir, ext.name);
    var flag = await $config.OS.dirExists(extDir);
    return flag;
  }

  async function deleteExtension(ext) {
    var extDir = await $config.OS.appendPath($config.configDir, "extensions");
    await $config.OS.deleteEntries(
      {
        name: ext.name,
        dir: extDir,
      },
      () => {
        repos = repos.map((item) => {
          if (item.name === ext.name) {
            item.loaded = false;
          }
          return item;
        });
        addMsg(
          ext,
          "Rerun the application to remove the extension from memory.",
        );
      },
    );
  }

  function hasMsg(rp) {
    if (msgs.length > 0) {
      return msgs.find((item) => item.name === rp.name) !== "undefined";
    } else {
      return false;
    }
  }

  function getMsg(rp) {
    if (hasMsg(rp)) {
      var item = msgs.find((item) => item.name === rp.name);
      if (typeof item !== "undefined") {
        return item.msg;
      }
    }
    return "";
  }

  function addMsg(rp, msg) {
    msgs.push({
      name: rp.name,
      msg: msg,
    });
    msgs = msgs;
    themes = themes;
    repos = repos;
  }

  function inputChange(e) {
    if (e.key === "ArrowUp" || e.key === "k") {
      //
      // Go up the list. Zero is at the top.
      //
      scrollDOM(-1);
    } else if (e.key === "ArrowDown" || e.key === "j") {
      //
      // Go down the list. The largest index is at the bottom.
      //
      scrollDOM(1);
    } else if (e.key === "Escape") {
      //
      // Escape key. Just exit without doing anything.
      //
      exitGitHub();
    }
  }

  function scrollDOM(amount) {
    var adj = amount * 20;

    if (pickerDOM !== null) {
      pickerDOM.scrollTop += adj;
      if (pickerDOM.scrollTop < 0) pickerDOM.scrollTop = 0;
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="GitHub"
  style="background-color: {$theme.backgroundColor};
             border-color: {util.pSBC(0.1, $theme.backgroundColor)};
             max-height: {getHeight()}px;
             width: {width !== null ? width : 100}px;
             color: {$theme.textColor};"
  onblur={() => {
    exitGitHub();
  }}
>
  <div id="GitHubHeader">
    <h3>GitHub Themes and Extensions Importer</h3>
    <span
      onkeydown={() => {}}
      onclick={() => {
        exitGitHub();
      }}
      style="color: {$theme.Red};"
    >
      X
    </span>
    <input
      id="inputHidden"
      bind:this={hiddenInput}
      onkeydown={inputChange}
      autocomplete="off"
      spellcheck="false"
      autocorrect="off"
    />
  </div>
  {#if loading}
    <h1>Loading....</h1>
  {:else}
    <div id="GitHubList" bind:this={pickerDOM}>
      {#each repos as repo}
        <div class="repoblock">
          <div class="reporow">
            <p class="reponame">
              {repo.name}
            </p>
            <p class="repostars" style="color: {$theme.Yellow};">
              {repo.stars} ⭐️s
            </p>
          </div>
          <div class="reporow">
            <p class="repodisc" style="width: 70%;">
              {repo.description}
            </p>
            <p class="repodisc" style="width: 30%;">
              Created by: {repo.owner}
            </p>
          </div>
          {#if hasMsg(repo)}
            <div class="reporow" style="color: {$theme.Red};">
              {@html getMsg(repo)}
            </div>
          {/if}
          <div class="repobuttons">
            {#if repo.loaded}
              <button
                onclick={() => {
                  deleteExtension(repo);
                }}
                style="background-color: {$theme.Red};"
              >
                Delete
              </button>
            {:else}
              <button
                onclick={() => {
                  installExtension(repo);
                }}
                style="background-color: {$theme.Green};"
              >
                Install
              </button>
            {/if}
          </div>
        </div>
      {/each}
      {#each themes as thm}
        <div class="repoblock">
          <div class="reporow">
            <p class="reponame">
              {thm.name}
            </p>
            <p class="repostars" style="color: {$theme.Yellow};">
              {thm.stars} ⭐️s
            </p>
          </div>
          <div class="reporow">
            <p class="repodisc" style="width: 70%;">
              {thm.description}
            </p>
            <p class="repodisc" style="width: 30%;">
              Created by: {thm.owner}
            </p>
          </div>
          {#if hasMsg(thm)}
            <div class="reporow" style="color: {$theme.Red};">
              {@html getMsg(thm)}
            </div>
          {/if}
          <div class="repobuttons">
            {#if thm.loaded}
              <button
                onclick={() => {
                  loadTheme(thm);
                }}
                style="background-color: {$theme.Green};"
              >
                Load
              </button>
              <button
                onclick={() => {
                  deleteTheme(thm);
                }}
                style="background-color: {$theme.Red};"
              >
                Delete
              </button>
            {:else}
              <button
                onclick={() => {
                  installTheme(thm);
                }}
                style="background-color: {$theme.Green};"
              >
                Install
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  #GitHub {
    position: absolute;
    display: flex;
    flex-direction: column;
    top: 30px;
    left: 20px;
    border: 3px solid;
    border-radius: 3px;
    z-index: 100;
  }

  #GitHubHeader {
    display: flex;
    flex-direction: row;
    margin: 10px;
  }

  #GitHubHeader h3 {
    margin: 0px auto 0px 0px;
  }

  #GitHubHeader span {
    margin: 0px 0px 0px auto;
  }

  #GitHubList {
    margin: 5px 10px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  #inputHidden {
    width: 0px;
    height: 0px;
    margin: 0px;
    padding: 0px;
    border: 0px solid transparent;
  }

  .reporow {
    display: flex;
    flex-direction: row;
    margin: 0px;
  }

  .reponame {
    margin: 0px auto 0px 0px;
  }

  .repostars {
    margin: 0px 20px 0px auto;
  }

  .repodisc {
    margin: 0px 20px 0px 15px;
  }

  .repoblock {
    display: flex;
    flex-direction: column;
    margin: 5px 0px;
  }

  .repobuttons {
    display: flex;
    flex-direction: row;
    margin: 5px auto;
  }

  .repobuttons button {
    margin: 0px 10px;
    border-radius: 5px;
  }
</style>
