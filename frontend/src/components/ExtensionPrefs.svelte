<div
  id='extension' 
  bind:this={scrollDOM}
>
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
    <table
      id='extensionTable'
    >
      <thead>
        <tr>
          <th>
            Extension Name
          </th>
          <th>
          </th>
          <th>
          </th>
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
                class='editButton'
                on:click={()=>{
                    editExtension(item);
                }}
              >
                Edit
              </button>
            </td>
            <td>
              <button 
                class='deleteButton'
                on:click={()=>{
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
  <div
    class='row'
  >
    <label 
      for='extensionNameInput' 
    >
      New Extension Name:
    </label>
    <input 
      id='extensionNameInput' 
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
      on:blur={()=>{
        setFocus(true);
      }}
    />
    <button 
      id='createExtensionButton'
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

<script>
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { rightDir } from '../stores/rightDir.js';
  import { leftDir } from '../stores/leftDir.js';
  import { currentCursor } from '../stores/currentCursor.js';
  import { theme } from '../stores/theme.js';
  import { config } from '../stores/config.js';
	
  const dispatch = createEventDispatcher();

  let localConfig = null;
  let showMsgBox = false;
  let msgText = '';
  let msgTitle = '';
  let extensionList = null;
  let extensionName = '';
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

  onMount(() => {
    const unsubConfig = config.subscribe(async (value) => {
      localConfig = value;
      if(typeof localConfig.localFS !== 'undefined') {
        const efile = await localConfig.localFS.appendPath(localConfig.configDir,'extensions');
        extensionList = await localConfig.localFS.getDirList(efile);
      }
    });
    
    return(() => {
      unsubConfig();
    })
  });

  afterUpdate(() => {
    if((scrollDOM !== null)&&(first)) {
      dispatch('setScrollDOM', {
        DOM: scrollDOM
      });
      first = false;
    }
  });

  async function reloadExtensions() {
    const efile = await localConfig.localFS.appendPath(localConfig.configDir,'extensions');
    extensionList = await localConfig.localFS.getDirList(efile);
  }

  async function editExtension(ext) {
    // 
    // Get the extensions file.
    //
    var extDir = await localConfig.localFS.appendPath(localConfig.configDir,'extensions');
    extDir = await localConfig.localFS.appendPath(extDir, ext.name);
    const pfile = await localConfig.localFS.appendPath(extDir, 'package.json');
    var pkgConfig = JSON.parse(await localConfig.localFS.readFile(pfile));
    if(typeof pkgConfig.mfmextension !== 'undefined') {
      var extFile = pkgConfig.mfmextension.main;

      // 
      // Put the unused pane with the extension's directory 
      //
      var curcursor = get(currentCursor);
      curcursor.entry.dir = extDir;
      curcursor.entry.name = extFile;
      if(curcursor.pane === 'left') {
        rightDir.set({
          path: extDir,
          fileSystem: localConfig.localFS,
          fileSystemType: 'local'
        });
        curcursor.pane = 'right';
      } else {
        leftDir.set({
          path: extDir,
          fileSystem: localConfig.localFS,
          fileSystemType: 'local'
        });
        curcursor.pane = 'left';
      }
      currentCursor.set(curcursor);

      if(await localConfig.localFS.fileExists(localConfig.userEditor)) {
        //
        // There is an editor defined by the user. Use it.
        //
        var file = await localConfig.localFS.appendPath(extDir, extFile);
        var editor = await localConfig.localFS.readFile(localConfig.userEditor).toString().trim();
        if(editor.endsWith('.app')) {
          await localConfig.localFS.openFileWithProgram(editor, file);
        } else {
          //
          // It is a command line editor. Open specially.
          //
          if(editor === 'emacs') {
            //
            // Open emacs.
            //
            await localConfig.localFS.runCommandLine('emacsclient -n -q "' + file + '"');
          } else {
            //
            // Open in a terminal program.
            //
            await localConfig.localFS.openInTerminal(editor, file);
          }
        }
      } else {
        //
        // Open with the system default editor.
        //
        await localConfig.localFS.runCommandLine('open "' + file + '"');
      }

      //
      // Go back to the filemanager view.
      //
      dispatch('switchView', {
        view: 'filemanager'
      });
    } else {
      console.log('Not a proper Extension.');
      msgText = 'The extension, ' + extensionName + ', isn\'t properly created. Please fix.';
      msgTitle = 'Extension Preferences';
      showMsgBox = true;
      extensionName = '';
    }
  }

  async function createExtension() {
    var extDir = await localConfig.localFS.appendPath(localConfig.configDir,'extensions');
    extDir = await localConfig.localFS.appendPath(extDir, extensionName);
    if(! await localConfig.localFS.dirExists(extDir)) {
      await localConfig.localFS.createDir(extDir);
      await localConfig.localFS.runCommandLine('cd "' + extDir + '"; npm init -y;', (err, stdout) => {
        if(err) {
          // 
          // An error, show to console.
          // 
          console.log(err);
          console.log(stdout);
        } else {
          editPackage();
        }
      });
    } else {
      // 
      // The extension exists. Tell the user to update a theme instead.
      // 
      msgText = 'The extension, ' + extensionName + ', already exists. Please edit it instead of creating it.';
      msgTitle = 'Extension Preferences';
      showMsgBox = true;
      extensionName = '';
    }
  }

  async function editPackage() {
    // 
    // Svelte compiler will not pull from the local closure for some reason. Therefore, 
    // I have to create this variable.
    //
    var extDir = await localConfig.localFS.appendPath(localConfig.configDir,'extensions');
    extDir = await localConfig.localFS.appendPath(extDir, extensionName);

    // 
    // Add the needed fields to the package.json file for Modal File Manager.
    // 
    var fileName = await localConfig.localFS.appendPath(extDir, 'package.json');
    var pkgConfig = JSON.parse(await localConfig.localFS.readFile(fileName));
    
    // 
    // Set the extension script to the 'main' property as well.
    //
    pkgConfig.main = extensionName + '.js';
    
    // 
    // Create the mfmextension substructure.
    //
    pkgConfig.mfmextension = {
      name: extensionName,
      description: '',
      type: 0,
      github: '',
      main: extensionName + '.js'
    };
    const pfile = await localConfig.localFS.appendPath(extDir, 'package.json');
    await localConfig.localFS.writeFile(pfile, JSON.stringify(pkgConfig));
    
    // 
    // Create the actual extension file.
    // 
    var extFile = await localConfig.localFS.appendPath(extDir,extensionName + '.js');
    var newExt = extTemplate.replaceAll('{{extName}}', extensionName);
    await localConfig.localFS.writeFile(extFile, newExt);

    // 
    // Edit the extension.
    //
    editExtension({
      dir: extDir,
      name: extensionName
    });
  }

  async function deleteExtension(ext) {
    var extDir = await localConfig.localFS.appendPath(localConfig.configDir,'extensions');
    await localConfig.localFS.deleteEntries({
      dir: extDir,
      name: ext.name,
      fileSystem: localConfig.localFS
    }, (err,stdout) => {
      if(!err) {
        reloadExtensions();
      } else {
        msgText = 'The extension, ' + ext.name + ', can\'t be deleted.';
        msgTitle = 'Extension Preferences';
        showMsgBox = true;
        console.log(err);
        console.log(stdout);
      }
    });
  }
  
  function setFocus(flag) {
    dispatch('setKeyProcess', {
      blur: flag
    });
  }
</script>
