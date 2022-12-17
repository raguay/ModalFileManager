<script>
  import { createEventDispatcher, onMount, afterUpdate } from "svelte";
  import { get } from "svelte/store";
  import { theme } from "../stores/theme.js";
  import { config } from "../stores/config.js";
  import { keyProcess } from "../stores/keyProcess.js";
  import util from "../modules/util.js";

  const dispatch = createEventDispatcher();

  let octok;
  let repos = null;
  let themes = null;
  let width = null;
  let msgs = [];
  let pickerDOM;
  let hiddenInput;
  let once = true;
  let timeOut;
  let loading = true;

  onMount(async () => {
    keyProcess.set(false);
    width = window.innerWidth - 30;
    timeOut = setTimeout(focusInput, 1000);
    //
    // #TODO - change the GitHub queries to the golang since Octokit no longer works.
    //
    return () => {
      hiddenInput = null;
      clearTimeout(timeOut);
    };
  });

  afterUpdate(() => {
    if (typeof hiddenInput !== "undefined") hiddenInput.focus();
  });

  function focusInput() {
    if (once) keyProcess.set(false);
    once = false;
    clearTimeout(timeOut);
    if (typeof hiddenInput !== "undefined" && hiddenInput !== null)
      hiddenInput.focus();
    timeOut = setTimeout(focusInput, 1000);
  }

  async function loadRepoInfo() {
    if (repos === null && themes === null) {
      loading = true;
      if (typeof repos !== "undefined") {
        repos = {};
      }
      if (typeof themes !== "undefined") {
        themes = {};
      }
      var repost = await octok.search.repos({
        q: "topic:modalfilemanager+topic:extension+topic:v2",
      });
      if (check(repost)) {
        repost = repost.data.items;
        for (var i = 0; i < repost.length; i++) {
          repost[i].loaded = await extExists(repost[i]);
        }
        repos = repost;
      }
      var themest = await octok.search.repos({
        q: "topic:modalfilemanager+topic:theme",
      });
      if (check(themest)) {
        themest = themest.data.items;
        for (var i = 0; i < themest.length; i++) {
          themest[i].loaded = await themeExists(themest[i]);
        }
        themes = themest;
      }
      loading = false;
    }
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
    keyProcess.set(true);
    inputHidden = null;
    dispatch("closeGitHub", {});
  }

  function check(val) {
    return (
      typeof val !== "undefined" &&
      typeof val.data !== "undefined" &&
      typeof val.data.items !== "undefined"
    );
  }

  async function installTheme(thm) {
    var confg = get(config);
    var thmDir = await confg.OS.appendPath(confg.configDir, "themes");
    thmDir = await confg.OS.appendPath(thmDir, thm.name);
    if (!(await confg.OS.dirExists(thmDir))) {
      await confg.OS.createDir(thmDir);
    }
    await confg.OS.runCommandLine(
      "git clone '" + thm.git_url + "' '" + thmDir + "';",
      [],
      (err, stdin, stdout) => {
        //
        // The clone should be there. Let's load the new theme.
        //
        loadTheme(thm);
        loadRepoInfo();
      },
      "."
    );
  }

  async function loadTheme(thm) {
    var confg = get(config);
    var thmDir = await confg.OS.appendPath(confg.configDir, "themes");
    thmDir = await confg.OS.appendPath(thmDir, thm.name);
    const pfile = await confg.OS.appendPath(thmDir, "package.json");
    if (await confg.OS.fileExists(pfile)) {
      var manifest = await confg.OS.readFile(pfile);
      manifest = JSON.parse(manifest);
      const mfile = await confg.OS.appendPath(thmDir, manifest.mfmtheme.main);
      var newTheme = await confg.OS.readFile(mfile);
      newTheme = JSON.parse(newTheme);
      theme.set(newTheme);
      addMsg(thm, "This theme is now being used.");
    } else {
      addMsg(thm, "The theme doesn't have a package.json file.");
    }
  }

  async function themeExists(thm) {
    var confg = get(config);
    var thmDir = await confg.OS.appendPath(confg.configDir, "themes");
    thmDir = await confg.OS.appendPath(thmDir, thm.name);
    var result = await confg.OS.dirExists(thmDir);
    return result;
  }

  async function deleteTheme(thm) {
    var confg = get(config);
    var thmDir = await confg.OS.appendPath(confg.configDir, "themes");
    await confg.OS.deleteEntries(
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
      }
    );
  }

  async function installExtension(ext) {
    var confg = get(config);
    var extDir = await confg.OS.appendPath(confg.configDir, "extensions");
    extDir = await confg.OS.appendPath(extDir, ext.name);
    if (!(await confg.OS.dirExists(extDir))) {
      await confg.OS.createDir(extDir);
    }
    await confg.OS.runCommandLine(
      "git clone '" + ext.git_url + "' '" + extDir + "';",
      [],
      (err, stdin, stdout) => {
        addMsg(ext, "Restart the program to use this extension.");
        loadRepoInfo();
      },
      "."
    );
  }

  async function extExists(ext) {
    var confg = get(config);
    var extDir = await confg.OS.appendPath(confg.configDir, "extensions");
    extDir = await confg.OS.appendPath(extDir, ext.name);
    var flag = await confg.OS.dirExists(extDir);
    return flag;
  }

  async function deleteExtension(ext) {
    var confg = get(config);
    var extDir = await confg.OS.appendPath(confg.configDir, "extensions");
    await confg.OS.deleteEntries(
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
          "Rerun the application to remove the extension from memory."
        );
      }
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

<div
  id="GitHub"
  style="background-color: {$theme.backgroundColor};
             border-color: {util.pSBC(0.1, $theme.backgroundColor)};
             max-height: {getHeight()}px;
             width: {width !== null ? width : 100}px;
             color: {$theme.textColor};"
  on:blur={(e) => {
    exitGitHub();
  }}
>
  <div id="GitHubHeader">
    <h3>GitHub Themes and Extensions Importer</h3>
    <span
      on:click={(e) => {
        exitGitHub();
      }}
      style="color: {$theme.Red};"
    >
      X
    </span>
    <input id="inputHidden" bind:this={hiddenInput} on:keydown={inputChange} />
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
              {repo.stargazers_count} ⭐️s
            </p>
          </div>
          <div class="reporow">
            <p class="repodisc">
              {repo.description}
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
                on:click={(e) => {
                  deleteExtension(repo);
                }}
                style="background-color: {$theme.Red};"
              >
                Delete
              </button>
            {:else}
              <button
                on:click={(e) => {
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
              {thm.stargazers_count} ⭐️ s
            </p>
          </div>
          <div class="reporow">
            <p class="repodisc">
              {thm.description}
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
                on:click={(e) => {
                  loadTheme(thm);
                }}
                style="background-color: {$theme.Green};"
              >
                Load
              </button>
              <button
                on:click={(e) => {
                  deleteTheme(thm);
                }}
                style="background-color: {$theme.Red};"
              >
                Delete
              </button>
            {:else}
              <button
                on:click={(e) => {
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
    margin: 0px 0px 0px auto;
  }

  .repodisc {
    margin: 0px 0px 0px 15px;
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
