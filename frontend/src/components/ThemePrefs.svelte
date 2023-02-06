<script>
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import ThemeItem from "../components/ThemeItem.svelte";
  import { theme } from "../stores/theme.js";
  import { config } from "../stores/config.js";

  const dispatch = createEventDispatcher();

  let themeName = "";
  let showMsgBox = false;
  let msgText = "";
  let msgTitle = "";
  let themeList = null;
  let scrollDOM = null;
  let first = true;

  onMount(async () => {
    $config = value;
    if (typeof $config.OS !== "undefined") {
      await loadThemeList();
    }

    return () => {
    };
  });

  afterUpdate(() => {
    if (scrollDOM !== null && first) {
      dispatch("setScrollDOM", {
        DOM: scrollDOM,
      });
      first = false;
    }
  });

  async function loadThemeList() {
    var themedir = await $config.OS.appendPath(
      $config.configDir,
      "themes"
    );
    themeList = await $config.OS.getDirList(themedir);
    themeName = "";
  }

  function setFocus(flag) {
    dispatch("setKeyProcess", {
      blur: flag,
    });
  }

  function changeValue(kv, e) {
    $theme[kv[0]] = e.detail.value;
    $theme = $theme;
  }

  async function createTheme() {
    var thmDir = await $config.OS.appendPath(
      $config.configDir,
      "themes"
    );
    thmDir = await $config.OS.appendPath(thmDir, themeName);
    if (!(await $config.OS.dirExists(thmDir))) {
      await $config.OS.createDir(thmDir);
      await $config.OS.runCommandLine(
        'cd "' + thmDir + '"; npm init -y;',
        [],
        async (err, stdout) => {
          if (err) {
            //
            // Something went wrong.
            //
            console.log(err);
            console.log(stdout);
          } else {
            //
            // Add the needed fields to the package.json file for Modal File Manager.
            //
            const pfile = await $config.OS.appendPath(
              thmDir,
              "package.json"
            );
            var pkgConfig = JSON.parse(await $config.OS.readFile(pfile));
            pkgConfig.mfmtheme = {
              name: themeName,
              description: "",
              type: 0,
              github: "",
              main: themeName + ".json",
            };
            await $config.OS.writeFile(pfile, JSON.stringify(pkgConfig));
          }
          //
          // Create the actual theme file.
          //
          var thmFile = await $config.OS.appendPath(
            thmDir,
            themeName + ".json"
          );
          await $config.OS.writeFile(thmFile, JSON.stringify($theme));
          loadThemeList();
        },
        "."
      );
    } else {
      //
      // The theme exists. Tell the user to update a theme instead.
      //
      msgText =
        "The theme, " +
        themeName +
        ", already exists. Please update the theme below.";
      msgTitle = "Theme Preferences";
      showMsgBox = true;
    }
  }

  async function updateTheme(thm) {
    var thmDir = await $config.OS.appendPath(
      $config.configDir,
      "themes"
    );
    thmDir = await $config.OS.appendPath(thmDir, thm.name);
    const pfile = await $config.OS.appendPath(thmDir, "package.json");
    var pkgConfig = await $config.OS.readFile(pfile);
    pkgConfig = JSON.parse(pkgConfig);
    var thmFile = await $config.OS.appendPath(
      thmDir,
      pkgConfig.mfmtheme.main
    );
    await $config.OS.writeFile(thmFile, JSON.stringify($theme));
  }

  async function deleteTheme(thm) {
    var thmDir = await $config.OS.appendPath(
      $config.configDir,
      "themes"
    );
    await $config.OS.deleteEntries(
      {
        dir: thmDir,
        name: thm.name,
        fileSystem: $config.OS,
      },
      async (err, stdout) => {
        if (!err) {
          var themedir = await $config.OS.appendPath(
            $config.configDir,
            "themes"
          );
          themeList = await $config.OS.getDirList(themedir);
        } else {
          msgText = "The theme, " + thm.name + ", can't be deleted.";
          msgTitle = "Theme Preferences";
          showMsgBox = true;
        }
      }
    );
    loadThemeList();
  }

  async function setTheme(thm) {
    var thmDir = await $config.OS.appendPath(
      $config.configDir,
      "themes"
    );
    thmDir = await $config.OS.appendPath(thmDir, thm.name);
    const pfile = await $config.OS.appendPath(thmDir, "package.json");
    var pkgConfig = await $config.OS.readFile(pfile);
    pkgConfig = JSON.parse(pkgConfig);
    var thmFile = await $config.OS.appendPath(
      thmDir,
      pkgConfig.mfmtheme.main
    );
    $theme = await $config.OS.readFile(thmFile);
    $theme = JSON.parse($theme);
  }
</script>

<div id="theme" bind:this={scrollDOM}>
  <h3>Current Theme Values</h3>
  {#if $theme !== null}
    <table>
      <thead>
        <tr>
          <th> Name </th>
          <th> Value </th>
        </tr>
      </thead>
      <tbody>
        {#each Object.entries($theme) as kv}
          <ThemeItem
            label={kv[0]}
            value={kv[1]}
            on:change={(e) => {
              changeValue(kv, e);
            }}
          />
        {/each}
      </tbody>
    </table>
  {/if}
  <h3>Save as New Theme</h3>
  <div class="row">
    <label for="themeNameInput"> New Theme Name: </label>
    <input
      id="themeNameInput"
      style="color: {$theme.backgroundColor};
             background-color: {$theme.textColor};
             font-family: {$theme.font};
             font-size: {$theme.fontSize};"
      bind:value={themeName}
      on:mouseover={() => {
        setFocus(false);
      }}
      on:mouseleave={() => {
        setFocus(true);
      }}
      on:blur={() => {
        setFocus(true);
      }}
      on:focus={() => {}}
    />
    <button
      id="createThemeButton"
      style="color: {$theme.backgroundColor};
             background-color: {$theme.textColor};
             font-family: {$theme.font};
             font-size: {$theme.fontSize};"
      on:click={createTheme}
    >
      Save New Theme
    </button>
  </div>
  {#if showMsgBox}
    <div
      id="msgBoxTheme"
      style="background-color: {$theme.backgroundColor};
             color: {$theme.textColor};
             border-color: {$theme.textColor};
             font-family: {$theme.font};
             font-size: {$theme.fontSize};"
    >
      <h3>{msgTitle}</h3>
      <p>{msgText}</p>
      <button
        style="color: {$theme.backgroundColor};
               background-color: {$theme.textColor};
               font-family: {$theme.font};
               font-size: {$theme.fontSize};"
        on:click={() => {
          showMsgBox = false;
        }}
      >
        Okay
      </button>
    </div>
  {/if}
  <h3>Existing Themes</h3>
  {#if themeList !== null}
    <table id="themeTable">
      <thead>
        <tr>
          <th> Theme Name </th>
          <th />
          <th />
          <th />
        </tr>
      </thead>
      <tbody>
        {#each themeList as item}
          <tr>
            <td>
              {item.name}
            </td>
            <td>
              <button
                class="updateButton"
                style="color: {$theme.backgroundColor};
                       background-color: {$theme.textColor};
                       font-family: {$theme.font};
                       font-size: {$theme.fontSize};"
                on:click={() => {
                  setTheme(item);
                }}
              >
                Set Theme
              </button>
            </td>
            <td>
              <button
                class="updateButton"
                style="color: {$theme.backgroundColor};
                       background-color: {$theme.textColor};
                       font-family: {$theme.font};
                       font-size: {$theme.fontSize};"
                on:click={() => {
                  updateTheme(item);
                }}
              >
                Update
              </button>
            </td>
            <td>
              <button
                class="deleteButton"
                on:click={() => {
                  deleteTheme(item);
                }}
              >
                Delete
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  #theme {
    display: flex;
    flex-direction: column;
    height: 100%;
    margin: 0px 0px 0px 10px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  #createThemeButton {
    padding: 5px;
    margin: 0px 10px;
    border: solid 1px transparent;
    border-radius: 5px;
  }

  #msgBoxTheme {
    display: flex;
    flex-direction: column;
    position: absolute;
    border: solid 2px;
    border-radius: 10px;
    top: 25%;
    left: 25%;
    width: 50%;
    padding: 10px;
  }

  #msgBoxTheme button {
    border: solid 1px;
    border-radius: 10px;
    width: 50%;
    margin: auto;
  }

  #themeTable {
    width: 100%;
    margin: 20px 0px 20px 0px;
  }

  #themeNameInput {
    padding: 5px;
    margin: 0px 10px 0px 10px;
    border: solid 1px transparent;
    border-radius: 5px;
  }

  label {
    margin: auto 10px;
  }

  table {
    width: 60%;
  }

  .row {
    display: flex;
    flex-direction: row;
  }

  .updateButton {
    border: solid 1px transparent;
    border-radius: 10px;
  }

  .deleteButton {
    border: solid 1px transparent;
    border-radius: 10px;
    background: red;
    color: black;
  }
</style>
