<script>
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import { rightDir } from "../stores/rightDir.js";
  import { leftDir } from "../stores/leftDir.js";
  import { currentCursor } from "../stores/currentCursor.js";
  import { theme } from "../stores/theme.js";
  import { config } from "../stores/config.js";

  const dispatch = createEventDispatcher();

  let showMsgBox = false;
  let msgText = "";
  let msgTitle = "";
  let extensionList = null;
  let extensionName = "";
  let extTemplate = `
const {{extName}} = {
  extMan: null,
  init: function(extManager) {
    {{extName}}.extMan = extManager;
  },
  installKeyMaps: function() {
  }
};
return({{extName}});
  `;
  let scrollDOM = null;
  let first = true;

  onMount(async () => {
    if (typeof $config.OS !== "undefined") {
      var edir = await $config.OS.appendPath($config.configDir, "extensions");
      extensionList = await $config.OS.getDirList(edir);
    }

    return () => {};
  });

  afterUpdate(() => {
    if (scrollDOM !== null && first) {
      dispatch("setScrollDOM", {
        DOM: scrollDOM,
      });
      first = false;
    }
  });

  async function reloadExtensions() {
    const efile = await $config.OS.appendPath($config.configDir, "extensions");
    extensionList = await $config.OS.getDirList(efile);
  }

  async function editExtension(ext) {
    //
    // Get the extensions file.
    //
    var extDir = await $config.OS.appendPath($config.configDir, "extensions");
    extDir = await $config.OS.appendPath(extDir, ext.name);
    const pfile = await $config.OS.appendPath(extDir, "package.json");
    var pkgConfig = await $config.OS.readFile(pfile);
    pkgConfig = JSON.parse(pkgConfig);
    if (typeof pkgConfig.mfmextension !== "undefined") {
      var extFile = pkgConfig.mfmextension.main;

      //
      // Put the unused pane with the extension's directory
      //
      $currentCursor.entry.dir = extDir;
      $currentCursor.entry.name = extFile;
      if ($currentCursor.pane === "left") {
        $rightDir = {
          path: extDir,
          fileSystem: $config.OS,
          fileSystemType: "local",
        };
        $currentCursor.pane = "right";
      } else {
        $leftDir = {
          path: extDir,
          fileSystem: $config.OS,
          fileSystemType: "local",
        };
        $currentCursor.pane = "left";
      }
      $currentCursor = $currentCursor;

      if (await $config.OS.fileExists($config.userEditor)) {
        //
        // There is an editor defined by the user. Use it.
        //
        var file = await $config.OS.appendPath(extDir, extFile);
        var editor = await $config.OS.readFile($config.userEditor);
        editor = editor.toString().trim();
        if (editor.endsWith(".app")) {
          await $config.OS.openFileWithProgram(editor, file);
        } else {
          //
          // It is a command line editor. Open specially.
          //
          if (editor === "emacs") {
            //
            // Open emacs.
            //
            await $config.OS.runCommandLine(
              'emacsclient -n -q "' + file + '"',
              [],
              (err, result) => {},
              "."
            );
          } else {
            //
            // Open in a terminal program.
            //
            await $config.OS.openInTerminal(editor, file);
          }
        }
      } else {
        //
        // Open with the system default editor.
        //
        await $config.OS.runCommandLine(
          'open "' + file + '"',
          [],
          (err, result) => {},
          "."
        );
      }

      //
      // Go back to the filemanager view.
      //
      dispatch("switchView", {
        view: "filemanager",
      });
    } else {
      console.log("Not a proper Extension.");
      msgText =
        "The extension, " +
        extensionName +
        ", isn't properly created. Please fix.";
      msgTitle = "Extension Preferences";
      showMsgBox = true;
      extensionName = "";
    }
  }

  async function createExtension() {
    var extDir = await $config.OS.appendPath($config.configDir, "extensions");
    extDir = await $config.OS.appendPath(extDir, extensionName);
    if (!(await $config.OS.dirExists(extDir))) {
      await $config.OS.createDir(extDir);
      await $config.OS.runCommandLine(
        'cd "' + extDir + '"; npm init -y;',
        [],
        (err, stdout) => {
          if (err) {
            //
            // An error, show to console.
            //
            console.log(err);
            console.log(stdout);
          } else {
            editPackage();
          }
        },
        "."
      );
    } else {
      //
      // The extension exists. Tell the user to update a theme instead.
      //
      msgText =
        "The extension, " +
        extensionName +
        ", already exists. Please edit it instead of creating it.";
      msgTitle = "Extension Preferences";
      showMsgBox = true;
      extensionName = "";
    }
  }

  async function editPackage() {
    //
    // Svelte compiler will not pull from the local closure for some reason. Therefore,
    // I have to create this variable.
    //
    var extDir = await $config.OS.appendPath($config.configDir, "extensions");
    extDir = await $config.OS.appendPath(extDir, extensionName);

    //
    // Add the needed fields to the package.json file for Modal File Manager.
    //
    var fileName = await $config.OS.appendPath(extDir, "package.json");
    var pkgConfig = await $config.OS.readFile(fileName);
    pkgConfig = JSON.parse(pkgConfig);

    //
    // Set the extension script to the 'main' property as well.
    //
    pkgConfig.main = extensionName + ".js";

    //
    // Create the mfmextension substructure.
    //
    pkgConfig.mfmextension = {
      name: extensionName,
      description: "",
      type: 0,
      github: "",
      main: extensionName + ".js",
    };
    const pfile = await $config.OS.appendPath(extDir, "package.json");
    await $config.OS.writeFile(pfile, JSON.stringify(pkgConfig));

    //
    // Create the actual extension file.
    //
    var extFile = await $config.OS.appendPath(extDir, extensionName + ".js");
    var newExt = extTemplate.replaceAll("{{extName}}", extensionName);
    await $config.OS.writeFile(extFile, newExt);

    //
    // Edit the extension.
    //
    editExtension({
      dir: extDir,
      name: extensionName,
    });
  }

  async function deleteExtension(ext) {
    var extDir = await $config.OS.appendPath($config.configDir, "extensions");
    await $config.OS.deleteEntries(
      {
        dir: extDir,
        name: ext.name,
        fileSystem: $config.OS,
      },
      (err, stdout) => {
        if (!err) {
          reloadExtensions();
        } else {
          msgText = "The extension, " + ext.name + ", can't be deleted.";
          msgTitle = "Extension Preferences";
          showMsgBox = true;
          console.log(err);
          console.log(stdout);
        }
      }
    );
  }

  function setFocus(flag) {
    dispatch("setKeyProcess", {
      blur: flag,
    });
  }
</script>

<div id="extension" bind:this={scrollDOM}>
  {#if showMsgBox}
    <div
      id="msgBoxExt"
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
  {#if extensionList !== null}
    <table id="extensionTable">
      <thead>
        <tr>
          <th> Extension Name </th>
          <th />
          <th />
        </tr>
      </thead>
      <tbody>
        {#each extensionList as item}
          <tr>
            <td>
              {item.name}
            </td>
            <td>
              <button
                style="color: {$theme.backgroundColor};
                       background-color: {$theme.textColor};
                       font-family: {$theme.font};
                       font-size: {$theme.fontSize};"
                class="editButton"
                on:click={() => {
                  editExtension(item);
                }}
              >
                Edit
              </button>
            </td>
            <td>
              <button
                class="deleteButton"
                on:click={() => {
                  deleteExtension(item);
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
  <div class="row">
    <label for="extensionNameInput"> New Extension Name: </label>
    <input
      id="extensionNameInput"
      style="color: {$theme.backgroundColor};
             background-color: {$theme.textColor};
             font-family: {$theme.font};
             font-size: {$theme.fontSize};"
      bind:value={extensionName}
      on:mouseover={() => {
        setFocus(false);
      }}
      on:mouseleave={() => {
        setFocus(true);
      }}
      on:blur={() => {
        setFocus(true);
      }}
    />
    <button
      id="createExtensionButton"
      style="color: {$theme.backgroundColor};
             background-color: {$theme.textColor};
             font-family: {$theme.font};
             font-size: {$theme.fontSize};"
      on:click={createExtension}
    >
      Create New Extension
    </button>
  </div>
</div>

<style>
  #extension {
    display: flex;
    flex-direction: column;
    height: 100%;
    margin: 0px 0px 0px 10px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  #createExtensionButton {
    padding: 5px;
    margin: 0px 10px;
    border: solid 1px transparent;
    border-radius: 5px;
  }

  #msgBoxExt {
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

  #msgBoxExt button {
    border: solid 1px;
    border-radius: 10px;
    width: 50%;
    margin: auto;
  }

  #extensionTable {
    width: 100%;
    margin: 20px 0px 20px 0px;
  }

  #extensionNameInput {
    margin: 0px 10px;
  }

  label {
    margin: auto 10px;
  }

  .deleteButton {
    border: solid 1px transparent;
    border-radius: 10px;
    background: red;
    color: black;
  }

  .editButton {
    padding: 5px;
    margin: 0px 10px;
    border: solid 1px transparent;
    border-radius: 5px;
  }

  .row {
    display: flex;
    flex-direction: row;
    margin: 10px;
  }
</style>
