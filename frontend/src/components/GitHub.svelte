<div  id='GitHub'
      style="background-color: {$theme.backgroundColor};
             border-color: {util.pSBC(.1,$theme.backgroundColor)};
             max-height: {getHeight()}px;
             width: {width !== null ? width : 100}px;
             color: {$theme.textColor};" 
      on:blur={(e) => { exitGitHub(); }}
>
  <div id='GitHubHeader'>
    <h3>GitHub Themes and Extensions Importer</h3>
    <span
      on:click={(e) => {
        exitGitHub();
      }}
      style="color: {$theme.Red};"
    >
     X
    </span>
    <input
      id="inputHidden"
      bind:this={hiddenInput}
      on:keydown={inputChange}
    />
  </div>
  <div id='GitHubList'
       bind:this={pickerDOM}
  >
    {#await repos}
      <h3>Loading Extensions Repositories....</h3>
    {:then value}
      {#if check(value)}
        {#each value.data.items as repo}
          <div class='repoblock'>
            <div class='reporow'>
              <p class='reponame'>
                {repo.name}
              </p>
              <p class='repostars'
                 style="color: {$theme.Yellow};"
              >
                {repo.stargazers_count} ⭐️ s
              </p>
            </div>
            <div class='reporow'>
              <p class='repodisc'>
                {repo.description}
              </p>
            </div>
            {#if hasMsg(repo)}
              <div class='reporow'
                   style="color: {$theme.Red};"
              >
                {@html getMsg(repo)}
              </div>
            {/if}
            <div class='repobuttons'>
              {#if extExists(repo)}
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
      {/if}
    {:catch error}
      <h2>There was an error: {error}</h2>
    {/await}
    {#await themes}
      <h3>Loading Theme Repositories....</h3>
    {:then valueTheme}
      {#if check(valueTheme)}
        {#each valueTheme.data.items as thm}
          <div class="repoblock">
            <div class='reporow'>
              <p class='reponame'>
                {thm.name}
              </p>
              <p class='repostars'
                 style="color: {$theme.Yellow};"
              >
                {thm.stargazers_count} ⭐️ s
              </p>
            </div>
            <div class='reporow'>
              <p class='repodisc'>
                {thm.description}
              </p>
            </div>
            {#if hasMsg(thm)}
              <div class='reporow'
                   style="color: {$theme.Red};"
              >
                {@html getMsg(thm)}
              </div>
            {/if}
            <div class="repobuttons">
              {#if themeExists(thm)}
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
      {/if}
    {:catch error}
      <h2>There was an error: {error}</h2>
    {/await}
  </div>
</div>

<style>
  #GitHub {
    position: absolute;
    display: flex;
    flex-direction: column;
    top: 20px;
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

<script>
  import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
  import { get } from 'svelte/store';
  import { theme } from '../stores/theme.js';
  import { config } from '../stores/config.js';
  import { keyProcess } from '../stores/keyProcess.js';
  import util from '../modules/util.js';
  import { Octokit } from "@octokit/rest";

  const dispatch = createEventDispatcher();

  let octok;
  let repos;
  let themes;
  let width = null;
  let msgs = [];
  let pickerDOM;
  let hiddenInput;
  let once = true;
  let timeOut;

  onMount(() => {
    keyProcess.set(false);
    width = window.innerWidth - 30;
    octok = new Octokit();
    loadRepoInfo();
    timeOut = setTimeout(focusInput, 1000);
    (() => {
      clearTimeout(timeOut);
    })
  });

  afterUpdate(() => {
    if(typeof hiddenInput !== 'undefined') hiddenInput.focus();
  });

  function focusInput() {
    if(once) keyProcess.set(false);
    once = false;
    clearTimeout(timeOut);
    if(typeof hiddenInput !== 'undefined') hiddenInput.focus();
    timeOut = setTimeout(focusInput, 1000);
  }

  function loadRepoInfo() {
    if(typeof repos !== 'undefined') {
      repos = {};
    }
    if(typeof themes !== 'undefined') {
      themes = {};
    }
    repos = octok.search.repos({
      q: 'topic:modalfilemanager+topic:extension'
    });
    themes = octok.search.repos({
      q: 'topic:modalfilemanager+topic:theme'
    });
  }

  function getHeight() {
    // 
    // The height of the window minus (status line + Directory + top location)
    //
    return window.document.body.clientHeight - 61;
  }

  function exitGitHub() {
    keyProcess.set(true);
    dispatch('closeGitHub',{});
  }

  function check(val) {
    return((typeof val !== 'undefined')&&
           (typeof val.data !== 'undefined')&&
           (typeof val.data.items !== 'undefined'));
  }

  async function installTheme(thm) {
    var confg = get(config);
    var thmDir = await confg.localFS.appendPath(confg.configDir,'themes');
    thmDir = await confg.localFS.appendPath(thmDir, thm.name);
    if(!await confg.localFS.dirExists(thmDir)) {
      await confg.localFS.createDir(thmDir);
    }
    await confg.localFS.runCommandLine("git clone '" + thm.git_url + "' '" + thmDir + "';", [], (err, stdin, stdout) => {
      // 
      // The clone should be there. Let's load the new theme.
      // 
      loadTheme(thm);
      loadRepoInfo();
    }, '.');
  }

  async function loadTheme(thm) {
    var confg = get(config);
    var thmDir = await confg.localFS.appendPath(confg.configDir,'themes');
    thmDir = await confg.localFS.appendPath(thmDir, thm.name);
    const pfile = confg.localFS.appendPath(thmDir, 'package.json');
    if(await confg.localFS.fileExists(pfile)) {
      var manifest = JSON.parse(await confg.localFS.readFile(pfile));
      const mfile = await confg.localFS.appendPath(thmDir, manifest.mfmtheme.main);
      var newTheme = JSON.parse(await confg.localFS.readFile(mfile));
      theme.set(newTheme);
      addMsg(thm, "This theme is now being used.");
    } else {
      console.log("The theme doesn't have a package.json file.");
      addMsg(thm, "The theme doesn't have a package.json file.");
    }
  }

  async function themeExists(thm) {
    var confg = get(config);
    var thmDir = await confg.localFS.appendPath(confg.configDir,'themes');
    thmDir = await confg.localFS.appendPath(thmDir, thm.name);
    return(await confg.localFS.dirExists(thmDir))
  }

  async function deleteTheme(thm) {
    var confg = get(config);
    var thmDir = await confg.localFS.appendPath(confg.configDir,'themes');
    thmDir = await confg.localFS.appendPath(thmDir, thm.name);
    //
    // #TODO - make it not a command line.
    //
    await confg.localFS.runCommandLine('rm -Rf "' + thmDir + '";', [], (err, stdin, stdout) => {
      loadRepoInfo();
    }, '.')
  }

  async function installExtension(ext) {
    var confg = get(config);
    var extDir = await confg.localFS.appendPath(confg.configDir,'extensions');
    extDir = await confg.localFS.appendPath(extDir, ext.name);
    if(!await confg.localFS.dirExists(extDir)) {
      await confg.localFS.createDir(extDir);
    }
    await confg.localFS.runCommandLine("git clone '" + ext.git_url + "' '" + extDir + "';", [], (err, stdin, stdout) => {
      addMsg(ext,'Restart the program to use this extension.');
      loadRepoInfo();
    }, '.');
  }
  
  async function extExists(ext) {
    var confg = get(config);
    var extDir = await confg.localFS.appendPath(confg.configDir,'extensions');
    extDir = await confg.localFS.appendPath(extDir, ext.name);
    return(await confg.localFS.dirExists(extDir))
  }
  
  async function deleteExtension(ext) {
    var confg = get(config);
    var extDir = await confg.localFS.appendPath(confg.configDir,'extensions');
    extDir = await confg.localFS.appendPath(extDir, ext.name);
    //
    // #TODO = change to not using command line.
    //
    await confg.localFS.runCommandLine('rm -Rf "' + extDir + '";', [], (err, stdin, stdout) => {
      loadRepoInfo();
      addMsg(ext, 'Rerun the application to remove the extension from memory.');
    }, '.');
  }

  function hasMsg(rp) {
    if(msgs.length > 0) {
      return(msgs.find(item => item.name === rp.name) !== 'undefined');
    } else {
      return(false);
    }
  }

  function getMsg(rp) {
    if(hasMsg(rp)) {
      var item = msgs.find(item => item.name === rp.name);
      if(typeof item !== 'undefined') {
        return(item.msg);
      } else {
        return('');
      }
    } else {
      return('');
    }
  }

  function addMsg(rp,msg) {
    msgs.push({
      name: rp.name,
      msg: msg
    });
    msgs = msgs;
    themes = themes;
    repos = repos;
  }
  
  function inputChange(e) {
    if((e.key === 'ArrowUp')||(e.key === 'k')) {
      // 
      // Go up the list. Zero is at the top.
      //
      scrollDOM(-1);
    } else if((e.key === 'ArrowDown')||(e.key === 'j')) {
      // 
      // Go down the list. The largest index is at the bottom.
      //
      scrollDOM(1);
    } else if(e.key === 'Escape') {
      //
      // Escape key. Just exit without doing anything.
      //
      exitGitHub();
    }
  } 

  function scrollDOM(amount) {
    var adj = amount * 20;

    if(pickerDOM !== null) {
      pickerDOM.scrollTop += adj;
      if(pickerDOM.scrollTop < 0) pickerDOM.scrollTop = 0;
    }
  }
</script>

