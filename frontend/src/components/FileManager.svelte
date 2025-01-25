<script>
  import { tick, onMount } from "svelte";
  import * as App from "../../dist/wailsjs/go/main/App.js";
  import Pane from "../components/Pane.svelte";
  import MessageBox from "../components/MessageBox.svelte";
  import DirectoryListing from "../components/DirectoryListing.svelte";
  import ResizeBorder from "../components/ResizeBorder.svelte";
  import QuickSearch from "../components/QuickSearch.svelte";
  import ExtraPanel from "../components/ExtraPanel.svelte";
  import CommandPrompt from "../components/CommandPrompt.svelte";
  import GitHub from "../components/GitHub.svelte";
  import { leftEntries } from "../stores/leftEntries.js";
  import { rightEntries } from "../stores/rightEntries.js";
  import { currentCursor } from "../stores/currentCursor.js";
  import { currentLeftFile } from "../stores/currentLeftFile.js";
  import { currentRightFile } from "../stores/currentRightFile.js";
  import { theme } from "../stores/theme.js";
  import { inputState } from "../stores/inputState.js";
  import { leftDir } from "../stores/leftDir.js";
  import { rightDir } from "../stores/rightDir.js";
  import { keyProcess } from "../stores/keyProcess.js";
  import { config } from "../stores/config.js";
  import { dirHistory } from "../stores/dirHistory.js";
  import { directoryListeners } from "../stores/directoryListeners.js";
  import { stateMapColors } from "../stores/stateMapColors.js";
  import { extraPanel } from "../stores/extraPanel.js";
  import { saved } from "../stores/saved.js";
  import commands from "../modules/commands.js";
  import filesystems from "../modules/filesystems";
  import extensions from "../modules/extensions.js";
  import OS from "../modules/OS.js";
  import { altKey } from "../stores/altKey.js";
  import { ctrlKey } from "../stores/ctrlKey.js";
  import { metaKey } from "../stores/metaKey.js";
  import { skipKey } from "../stores/skipKey.js";
  import { shiftKey } from "../stores/shiftKey.js";
  import { key } from "../stores/key.js";
  import { processKey } from "../stores/processKey.js";
  import * as rt from "../../dist/wailsjs/runtime/runtime.js"; // the runtime for Wails2

  let showMessageBox = $state(false);
  let showQuickSearch = $state(false);
  let msgBoxConfig = $state({});
  let msgBoxSpinners = $state([]);
  let msgBoxItems = $state(null);
  let msgCallBack = () => {};
  let configDir = "";
  let setEditDirFlagLeft = $state(false);
  let setEditDirFlagRight = $state(false);
  let showExtra = $state(false);
  let showCommandPrompt = $state(false);
  let rightDOM = $state(null);
  let leftDOM = $state(null);
  let containerDOM = $state(null);
  let mdown = $state(false);
  let lastError = null;
  let userEditor = ".myeditorchoice";
  let OStype = "macOS";
  let stateMaps = [];
  let showGitHub = $state(false);
  let numberAcc = "";
  let lastCommand = "";
  let flagFilter = 1;
  let selRegExpHist = null;
  let mid = $state(0);

  $effect(() => {
    mid = window.innerHeight - 75;
  });

  onMount(async () => {
    //
    // Initialize all the stores with minimal settings.
    //
    $keyProcess = true;
    $inputState = "normal";
    $theme = {};
    $currentCursor = {};
    $currentRightFile = {};
    $currentLeftFile = {};
    $rightDir = {};
    $leftDir = {};
    $directoryListeners = [];
    $stateMapColors = [];
    $config = null;
    $processKey = processKeyFunction;

    //
    // reset all the extensions and commands.
    //
    clearCommands();
    clearExtensions();
    clearKeyboard();

    //
    // Initialize local.
    //
    await OS.init();

    //
    // Setup the configuration directory.
    //
    configDir = await OS.getConfigDir();
    if (!(await OS.dirExists(configDir))) {
      await OS.makeDir(configDir);
      let extdir = await OS.appendPath(configDir, "extensions");
      await OS.makeDir(extdir);
    }

    //
    // Load the configuration file.
    //
    if (!(await OS.fileExists(await OS.appendPath(configDir, "config.json")))) {
      //
      // Create the default configuration and save it.
      //
      $config = await OS.getConfig();
      const cfgFile = await OS.appendPath(configDir, "config.json");
      await OS.writeFile(cfgFile, JSON.stringify($config));
      $config.OS = OS;
    } else {
      //
      // Read in the local configuration.
      //
      let configFile = await OS.appendPath(configDir, "config.json");
      $config = await OS.readFile(configFile);
      $config = JSON.parse($config);

      //
      // Make sure this field is defined.
      //
      if (typeof $config.maxSearchDepth === "undefined") {
        $config.maxSearchDepth = 100;
        const cfgFile = await OS.appendPath(configDir, "config.json");
        await OS.writeFile(cfgFile, JSON.stringify($config));
      }
      $config.OS = OS;
    }

    //
    // Setup the dirHistory store.
    //
    $dirHistory = {
      histStore: [],
      histLoaded: false,
      addHistory: function (dir) {
        dir = new String(dir);
        let el = this.histStore.find((item) =>
          item.toLowerCase().includes(dir.toLowerCase()),
        );
        if (typeof el === "undefined") {
          this.histStore.push(dir);
          this.saveHistory();
        }
      },
      searchHistory: function (pat) {
        let rgex = new RegExp(pat, "i");
        return this.histStore.filter((item) => item.match(rgex) !== null);
      },
      saveHistory: async function () {
        if (
          this.histLoaded &&
          typeof $config !== "undefined" &&
          typeof $config.OS !== "undefined" &&
          typeof $config.configDir !== "undefined"
        ) {
          //
          // Save the history.
          //
          const hFile = await $config.OS.appendPath(
            $config.configDir,
            "history.json",
          );
          await $config.OS.writeFile(hFile, JSON.stringify(this.histStore));
        }
      },
      loadHistory: async function () {
        if (
          typeof $config !== "undefined" &&
          typeof $config.OS !== "undefined" &&
          $config.configDir !== ""
        ) {
          //
          // load the history.
          //
          const hf = await $config.OS.appendPath(
            $config.configDir,
            "history.json",
          );
          if (await $config.OS.fileExists(hf)) {
            try {
              this.histStore = await $config.OS.readFile(hf);
              this.histStore = JSON.parse(this.histStore);
              this.histLoaded = true;
            } catch (e) {
              //
              // Something was wrong with the history. Just forget it.
              //
              this.histStore = [];
            }
          }
        }
      },
    };

    //
    // Setup the application to be in the user's home directory.
    //
    OStype = await OS.getOSname();
    $leftDir.path = await OS.getHomeDir();
    $leftDir.fileSystemType = OStype;
    $leftDir.fileSystem = OS;
    $rightDir.path = $leftDir.path;
    $rightDir.fileSystemType = OStype;
    $rightDir.fileSystem = OS;

    //
    // Get the files.
    //
    $leftEntries = await OS.getDirList($leftDir.path);
    $rightEntries = await OS.getDirList($rightDir.path);

    $currentCursor = {
      pane: "left",
      entry: $leftEntries[0],
      index: 0,
    };
    $currentLeftFile = {
      entry: $leftEntries[0],
    };
    $currentRightFile = {
      entry: $rightEntries[0],
    };
    let unsubscribeTheme = theme.subscribe(async (value) => {
      //
      // Make sure a proper theme is being set.
      //
      if (typeof value.backgroundColor !== "undefined") {
        //
        // Save the new theme values.
        //
        const tfile = await OS.appendPath(configDir, "theme.json");
        await OS.writeFile(tfile, JSON.stringify(value));

        //
        // Set the default state map colors.
        //
        $stateMapColors["normal"] = value.normalbackgroundColor;
        $stateMapColors["insert"] = value.insertbackgroundColor;
        $stateMapColors["visual"] = value.visualbackgroundColor;
      }
    });
    $inputState = "normal";

    //
    // Setup the user editor data file.
    //
    const hdir = await OS.getHomeDir();
    userEditor = await OS.appendPath(hdir, ".myeditorchoice");
    if (!(await OS.fileExists(userEditor))) {
      const edFile = await OS.appendPath(configDir, ".myeditorchoice");
      if (!(await OS.fileExists(edFile))) {
        //
        // They don't have this file setup. TODO: Set it up or not?
        //
        userEditor = null;
      }
    }

    //
    // Set the configuration store.
    //
    $config.configDir = configDir;
    $config.OS = OS;
    $config.commands = commands;
    $config.extensions = extensions;
    $config.userEditor = userEditor;
    OS.setConfig($config);
    extensions.setConfig($config);

    //
    // Load the extensions, keyboard, and theme.
    //
    await loadExtensionsKeyboard();

    //
    // Setup emmiters from the go code.
    //
    let commandParse = RegExp("^([^(]*)\\(([^)]*)\\)");
    window.runtime.EventsOn("runCommands", (cmds) => {
      if (typeof cmds === "string" && cmds.length > 0) {
        for (let i = 0; i < cmds.length; i++) {
          let parts = cmds[i].match(commandParse);
          if (parts[2][0] == "'") {
            parts[2] = parts[2].slice(1, -1);
          }
          extensions.getExtCommand(parts[1])(parts[2]);
        }
      }
    });
    let cmds = await App.GetCommandLineCommands();
    if (cmds !== null) {
      for (let i = 0; i < cmds.length; i++) {
        let parts = cmds[i].match(commandParse);
        if (parts[2][0] == "'") {
          parts[2] = parts[2].slice(1, -1);
        }
        extensions.getExtCommand(parts[1]).command(parts[2]);
      }
    }

    //
    // Listen for events from the backend.
    //
    rt.EventsOn("leftSideChange", () => {
      refreshLeftPane();
    });
    rt.EventsOn("rightSideChange", () => {
      refreshRightPane();
    });

    //
    // Load the directory history.
    //
    $dirHistory.loadHistory();

    return () => {
      unsubscribeTheme();
    };
  });

  async function loadExtensionsKeyboard() {
    //
    // Setup the default commands.
    //
    installDefaultCommands();

    //
    // load the theme.
    //
    const thFile = await OS.appendPath($config.configDir, "theme.json");
    if (!(await OS.fileExists(thFile))) {
      //
      // Setup the Dracula Pro as default theme colors:
      //
      $theme = {
        font: "Fira Code, Menlo",
        fontSize: "12pt",
        cursorColor: "#363443",
        selectedColor: "#454158",
        backgroundColor: "#22212C",
        textColor: "#F8F8F2",
        borderColor: "#1B1A23",
        normalbackgroundColor: "#80FFEA",
        insertbackgroundColor: "#8AFF80",
        visualbackgroundColor: "#FF80BF",
        commentColor: "#7970A9",
        Cyan: "#80FFEA",
        Green: "#8AFF80",
        Orange: "#FFCA80",
        Pink: "#FF80BF",
        Purple: "#9580FF",
        Red: "#FF9580",
        Yellow: "#FFFF80",
      };

      //
      // Save the default theme.
      //
      await OS.writeFile(thFile, JSON.stringify($theme));
    } else {
      //
      // Load the theme saved.
      //
      const rawThFile = await OS.readFile(thFile);
      $theme = JSON.parse(rawThFile);
    }

    //
    // Get the stateMapColors setup.
    //
    $stateMapColors["normal"] = $theme.normalbackgroundColor;
    $stateMapColors["insert"] = $theme.insertbackgroundColor;
    $stateMapColors["visual"] = $theme.visualbackgroundColor;

    //
    // Setup Extensions.
    //
    await setUpExt();

    //
    // Setup State Maps. This has to be after setting up extensions in case
    // an extension command is being used.
    //
    await loadKeyMaps();
    extensions.installKeyMaps();
  }

  async function setUpExt() {
    const extDir = await OS.appendPath(configDir, "extensions");
    extensions.setExtensionDir(extDir);
    extensions.setCommands(commands);
    extensions.setFileSystems(filesystems);
    await extensions.load($config, OS);
    installDefaultExtCommands();
    extensions.init();
  }

  function clearKeyboard() {
    stateMaps = [];
  }

  function clearExtensions() {
    extensions.unloadExtensions();
  }

  function clearCommands() {
    commands.commandList = [];
    commands.lastError = "";
  }

  async function reloadExtensions() {
    clearKeyboard();
    clearExtensions();
    clearCommands();
    await loadExtensionsKeyboard();
  }

  function switchView(vw) {
    //
    // Switch to the given view.
    //
  }

  function showPreferences() {
    switchView("preferences");
  }

  function installDefaultExtCommands() {
    extensions.addExtCommand(
      "setCursor",
      "Set the cursor to the file name given in the current panel.",
      setCursor,
    );
    extensions.addExtCommand(
      "cursorToPane",
      'Set the cursor to the pane given. Either "left" or "right", cursorToPane',
    );
    extensions.addExtCommand(
      "getLeftFile",
      "Get the current left file information.",
      getLeftFile,
    );
    extensions.addExtCommand(
      "getRightFile",
      "Get the current right file information.",
      getRightFile,
    );
    extensions.addExtCommand("getCursor", "Get the current cursor.", getCursor);
    extensions.addExtCommand(
      "addKeyboardShort",
      "Add a keyboard shortcut.",
      addKeyboardShort,
    );
    extensions.addExtCommand(
      "setTheme",
      "Set the theme to the values given.",
      setTheme,
    );
    extensions.addExtCommand(
      "getTheme",
      "Get the current theme values.",
      getTheme,
    );
    extensions.addExtCommand("getOS", "Get the local OS name.", getOS);
    extensions.addExtCommand(
      "addDirectoryListener",
      "Register a function that will be called with each change in directory.",
      addDirectoryListener,
    );
    extensions.addExtCommand(
      "getLastError",
      "returns the last error.",
      getLastError,
    );
    extensions.addExtCommand(
      "getSelectedFiles",
      "Returns a list of Entries that have been selected",
      getSelectedFiles,
    );
    extensions.addExtCommand(
      "getCurrentFile",
      "Get the current file.",
      getCurrentFile,
    );
    extensions.addExtCommand(
      "getCurrentPane",
      "Get the pane that is currently active.",
      getCurrentPane,
    );
    extensions.addExtCommand(
      "changeDir",
      "Change the current directory for a pane.",
      changeDir,
    );
    extensions.addExtCommand(
      "addSpinner",
      "Add a message box spinner value.",
      addSpinner,
    );
    extensions.addExtCommand(
      "updateSpinner",
      "Update a message box spinner value.",
      updateSpinner,
    );
    extensions.addExtCommand(
      "removeSpinner",
      "Remove a message box spinner value.",
      removeSpinner,
    );
    extensions.addExtCommand(
      "keyProcessor",
      "Send a keystroke to be processed.",
      keyProcessor,
    );
    extensions.addExtCommand(
      "stringKeyProcessor",
      "Send a string of keystrokes to be processed.",
      stringKeyProcessor,
    );
    extensions.addExtCommand(
      "askQuestion",
      "Ask a question and get the response.",
      askQuestion,
    );
    extensions.addExtCommand(
      "pickItem",
      "Choose from a list of items.",
      pickItem,
    );
    extensions.addExtCommand(
      "showMessage",
      "Show a message to the user.",
      showMessage,
    );
    extensions.addExtCommand(
      "createNewMode",
      "Allows the creation of a new mode for keyboard commands.",
      createNewMode,
    );
    extensions.addExtCommand("changeMode", "Change to mode given.", changeMode);
    extensions.addExtCommand(
      "switchView",
      "Switch the active program view.",
      switchView,
    );
    extensions.addExtCommand(
      "copyEntriesCommand",
      "Copy the list of entries to new location.",
      copyEntriesCommand,
    );
    extensions.addExtCommand(
      "moveEntriesCommand",
      "Move the list of entries to the new location.",
      moveEntriesCommand,
    );
    extensions.addExtCommand(
      "deleteEntriesCommand",
      "Delete the list of entries.",
      deleteEntriesCommand,
    );
    extensions.addExtCommand(
      "editEntryCommand",
      "Edit the given entry.",
      editEntryCommand,
    );
    extensions.addExtCommand(
      "getRightDir",
      "Get the path for the right pane.",
      getRightDir,
    );
    extensions.addExtCommand(
      "getLeftDir",
      "Get the path for the left pane.",
      getLeftDir,
    );
    extensions.addExtCommand(
      "setLeftDir",
      "Set the left panel directory.",
      setLeftDir,
    );
    extensions.addExtCommand(
      "setRightDir",
      "Set the right panel directory.",
      setRightDir,
    );

    extensions.addExtCommand(
      "addExtraPanelProcessor",
      "Add a processor for creating extra panel html.",
      addExtraPanelProcessor,
    );
  }

  function installDefaultCommands() {
    //
    // Add all built in commands to the commands object.
    //
    commands.addCommand(
      "lock",
      "lock",
      "Lock the current quick search results.",
      lockqs,
    );
    commands.addCommand(
      "unlock",
      "unlock",
      "Unlock the current quick search results.",
      unlockqs,
    );
    commands.addCommand(
      "Save Default Keymaps",
      "saveDefaultKeymaps",
      "Save the default keymaps into the keymap files.",
      saveDefaultKeymaps,
    );
    commands.addCommand(
      "Minimize",
      "minimizeWindow",
      "Minimizes the window.",
      minimizeWindow,
    );
    commands.addCommand(
      "Select by Regular Expression",
      "selectRegExp",
      "Selects the files/directories in the current pane based on a regular expression.",
      selectRegExp,
    );
    commands.addCommand("Quit", "quitApp", "Quits the application.", quitApp);
    commands.addCommand(
      "Go Home",
      "goHome",
      "Puts the current panel in the home directory.",
      goHome,
    );
    commands.addCommand(
      "Select All",
      "selectAll",
      "Select All entries in the current pane.",
      selectAll,
    );
    commands.addCommand(
      "Unselect All",
      "unselectAll",
      "Unselect All entries in the current pane.",
      unselectAll,
    );
    commands.addCommand(
      "Move Cursor Down",
      "moveCursorDown",
      "Move the cursor down one line.",
      moveCursorDown,
    );
    commands.addCommand(
      "Move Cursor Down with Selection",
      "moveCursorDownWithSelect",
      "This will select the current file and move the cursor down one line.",
      moveCursorDownWithSelect,
    );
    commands.addCommand(
      "Move Cursor Up",
      "moveCursorUp",
      "This will move the cursor up one line",
      moveCursorUp,
    );
    commands.addCommand(
      "Move Cursor Up with Selection",
      "moveCursorUpWithSelect",
      "This will move select the current entry and move the cursor up one line.",
      moveCursorUpWithSelect,
    );
    commands.addCommand(
      "Change Mode to Normal",
      "changeModeNormal",
      "Set the normal mode.",
      changeModeNormal,
    );
    commands.addCommand(
      "Change Mode to Insert",
      "changeModeInsert",
      "Set the insert mode.",
      changeModeInsert,
    );
    commands.addCommand(
      "Change Mode to Visual",
      "changeModeVisual",
      "Set the visual mode.",
      changeModeVisual,
    );
    commands.addCommand(
      "Cursor to Next Pane",
      "cursorToNextPane",
      "This will move the cursore to the opposite pane.",
      cursorToNextPane,
    );
    commands.addCommand(
      "Action Entry",
      "actionEntry",
      "This will open a file or go into a directory.",
      actionEntry,
    );
    commands.addCommand(
      "Go Up a Directory",
      "goUpDir",
      "Go to the parent directory.",
      goUpDir,
    );
    commands.addCommand(
      "Go Down a Directory",
      "goDownDir",
      "If the current entry is a directory, go to it.",
      goDownDir,
    );
    commands.addCommand(
      "Go to Bottom Entry",
      "goBottomFile",
      "Move the cursor to the bottom most file.",
      goBottomFile,
    );
    commands.addCommand(
      "Go to Top Entry",
      "goTopFile",
      "Move the cursor to the top most file.",
      goTopFile,
    );
    commands.addCommand(
      "Delete Entries",
      "deleteEntries",
      "Delete all selected entries or the one under the cursor",
      deleteEntries,
    );
    commands.addCommand(
      "Copy Entries",
      "copyEntries",
      "Copy the selected entries or the one under the cursor to the other pane.",
      copyEntries,
    );
    commands.addCommand(
      "Move Entries",
      "moveEntries",
      "Move the selected entries or the one under the cursor to the other pane.",
      moveEntries,
    );
    commands.addCommand(
      "Edit Entry",
      "editEntry",
      "Opens the file under the cursor in the editor specified. This command assumes using a Text/Code editor on the file.",
      editEntry,
    );
    commands.addCommand(
      "Duplicate Entry",
      "duplicateEntry",
      'Make a copy of the current entry with "_copy" added to it.',
      duplicateEntry,
    );
    commands.addCommand(
      "New File",
      "newFile",
      "Create a new file in the current pane.",
      newFile,
    );
    commands.addCommand(
      "New Directory",
      "newDirectory",
      "Create a new directory in the current pane.",
      newDirectory,
    );
    commands.addCommand(
      "Rename Entry",
      "renameEntry",
      "Rename the current entry.",
      renameEntry,
    );
    commands.addCommand(
      "Swap Panels",
      "swapPanels",
      "Swap the panel contents.",
      swapPanels,
    );
    commands.addCommand(
      "Toggle Quick Search",
      "toggleQuickSearch",
      "Show/Hide the Quick Search panel.",
      toggleQuickSearch,
    );
    commands.addCommand(
      "Reload Pane",
      "reloadPane",
      "Reload the Current Pane.",
      reloadPane,
    );
    commands.addCommand(
      "Edit Directory",
      "editDirLoc",
      "Edit the current panels directory.",
      editDirLoc,
    );
    commands.addCommand(
      "Toggle Extra Panel",
      "toggleExtraPanel",
      "Toggles the showing of the extra panel.",
      toggleExtraPanel,
    );
    commands.addCommand(
      "Toggle Command Prompt",
      "toggleCommandPrompt",
      "Toggles showing the command prompt.",
      toggleCommandPrompt,
    );
    commands.addCommand(
      "Toggle GitHub Importer",
      "toggleGitHub",
      "Toggles the showing of the GitHub importer.",
      toggleGitHub,
    );
    commands.addCommand(
      "Refresh Panes",
      "refreshPanes",
      "Reloads both panes.",
      refreshPanes,
    );
    commands.addCommand(
      "Refresh Right Pane",
      "refreshRightPane",
      "Refresh the Right Pane",
      refreshRightPane,
    );
    commands.addCommand(
      "Refresh Left Pane",
      "refreshLeftPane",
      "Reloads the Left Pane.",
      refreshLeftPane,
    );
    commands.addCommand(
      "Rerun Last Command",
      "reRunLastCommand",
      "Runs the last command with it's number.",
      reRunLastCommand,
    );
    commands.addCommand(
      "Toggle Filter",
      "toggleFilter",
      "Toggles the show all and default filters.",
      toggleFilter,
    );
    commands.addCommand(
      "Show All Filter",
      "setShowAllFilter",
      "Sets to show all Entries.",
      setShowAllFilter,
    );
    commands.addCommand(
      "Show Only Non-System Files/Folders",
      "setDefaultFilter",
      "Sets the default filter of not showing system files/folders.",
      setDefaultFilter,
    );
    commands.addCommand(
      "Open in Opposite Panel",
      "openOppositePanel",
      "Set the opposite panel to the directory under the current cursor or the directory of the current cursor.",
      openOppositePanel,
    );
    commands.addCommand(
      "Show Preferences",
      "showPreferences",
      "Show the preferences.",
      showPreferences,
    );
    commands.addCommand(
      "Reload Extensions",
      "reloadExtensions",
      "Reload the extensions, keyboard maps, and theme.",
      reloadExtensions,
    );
  }

  function processKeyFunction() {
    //
    // Send to the processor.
    //
    keyProcessor($key, $ctrlKey, $shiftKey, $metaKey, $altKey);
  }

  function stringKeyProcessor(str) {
    for (let i = 0; i < str.length; i++) {
      if (str[i] >= "A" && str[i] <= "Z") {
        keyProcessor(str[i], false, true, false, false);
      } else {
        keyProcessor(str[i], false, false, false, false);
      }
    }
  }

  function reRunLastCommand() {
    stringKeyProcessor(lastCommand);
  }

  function keyProcessor(key, cKey, sKey, mKey, aKey) {
    if (key >= 0 && key <= 9) {
      //
      // It is a number prefixing a command. Get the digits for using in the command.
      //
      numberAcc += key;
    } else {
      //
      // Get the command for the current state in the stateMaps.
      //

      const command = getCommand(
        stateMaps[$inputState],
        key,
        cKey,
        sKey,
        mKey,
        aKey,
      );

      //
      // Figure the number of times to run the command.
      //
      let num = parseInt(numberAcc, 10);
      if (num === 0 || isNaN(num)) num = 1;
      if (command.name !== "reRunLastCommand") lastCommand = numberAcc + key;

      //
      // Run the command.
      //
      try {
        do {
          command.command();
        } while (num-- > 1);
      } catch (e) {
        //
        // Something happened in the command. Tell about it.
        //
        lastError = e;
      }
      numberAcc = "";
    }
  }

  function createNewMode(name, color) {
    stateMaps[name] = [];
    $stateMapColors[name] = color;
  }

  function getCommand(map, key, cKey, sKey, mKey, aKey) {
    let result = {
      command: () => {},
      name: "empty",
    };
    if (typeof aKey === "undefined") aKey = false;
    let rmap = map.find((item) => {
      if (typeof item.alt === "undefined") item.alt = false;
      return (
        item.key == key &&
        item.meta == mKey &&
        item.ctrl == cKey &&
        item.shift == sKey &&
        item.alt == aKey
      );
    });
    if (typeof rmap !== "undefined") {
      result = rmap;
    }
    return result;
  }

  function selectAll() {
    if ($currentCursor.pane == "left") {
      $leftEntries.forEach((item) => {
        item.selected = true;
      });
      $leftEntries = $leftEntries;
    } else {
      $rightEntries.forEach((item) => {
        item.selected = true;
      });
      $rightEntries = $rightEntries;
    }
  }

  function unselectAll() {
    if ($currentCursor.pane == "left") {
      $leftEntries.forEach((item) => {
        item.selected = false;
      });
      $leftEntries = $leftEntries;
    } else {
      $rightEntries.forEach((item) => {
        item.selected = false;
      });
      $rightEntries = $rightEntries;
    }
  }

  async function quitApp() {
    await App.Quit();
  }

  async function minimizeWindow() {
    await window.runtime.WindowMinimise();
  }

  function lockqs() {
    $saved.lockqs = true;
    $saved.sideqs = $currentCursor.pane;
  }

  function unlockqs() {
    $saved.qs = null;
    $saved.lockqs = false;
    $saved.sideqs = null;
  }

  async function setCursor(fname) {
    let index = 0;
    if ($currentCursor.pane == "left") {
      index = $leftEntries.findIndex((item) => item.name == fname);
      if (index === -1) index = 0;
      $currentCursor = {
        pane: "left",
        entry: $leftEntries[index],
        index: index,
      };
      $currentLeftFile = {
        entry: $leftEntries[index],
      };
    } else {
      index = $rightEntries.findIndex((item) => item.name == fname);
      if (index === -1) index = 0;
      $currentCursor = {
        pane: "right",
        entry: $rightEntries[index],
        index: index,
      };
      $currentRightFile = {
        entry: $rightEntries[index],
      };
    }
  }

  function moveCursorDown() {
    let index = 0;
    if ($currentCursor.pane.includes("left")) {
      if (typeof $leftEntries !== "undefined" && $leftEntries.length !== 0) {
        index = $leftEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index < $leftEntries.length - 1) {
          index += 1;
        }
        $currentCursor = {
          pane: "left",
          entry: $leftEntries[index],
          index: index,
        };
        $currentLeftFile = {
          entry: $leftEntries[index],
        };
      }
    } else {
      if (typeof $rightEntries !== "undefined" && $rightEntries.length !== 0) {
        index = $rightEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index < $rightEntries.length - 1) {
          index += 1;
        }
        $currentCursor = {
          pane: "right",
          entry: $rightEntries[index],
          index: index,
        };
        $currentRightFile = {
          entry: $rightEntries[index],
        };
      }
    }
  }

  function moveCursorDownWithSelect() {
    let index = 0;
    if ($currentCursor.pane.includes("left")) {
      if (typeof $leftEntries !== "undefined" && $leftEntries.length !== 0) {
        index = $leftEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index === -1) index = 0;
        let entry = $leftEntries[index];
        entry.selected = !entry.selected;
        $leftEntries[index] = entry;
        if (index < $leftEntries.length - 1) {
          index += 1;
        }
        entry = $leftEntries[index];
        $currentCursor = {
          pane: "left",
          entry: entry,
          index: index,
        };
        $currentLeftFile = {
          entry: entry,
        };
      }
    } else {
      if (typeof $rightEntries !== "undefined" && $rightEntries.length !== 0) {
        index = $rightEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index === -1) index = 0;
        let entry = $rightEntries[index];
        entry.selected = !entry.selected;
        $rightEntries[index] = entry;
        if (index < $rightEntries.length - 1) {
          index += 1;
        }
        entry = $rightEntries[index];
        $currentCursor = {
          pane: "right",
          entry: entry,
          index: index,
        };
        $currentRightFile = {
          entry: entry,
        };
      }
    }
  }

  function moveCursorUp() {
    let index = 0;
    if ($currentCursor.pane.includes("left")) {
      if (typeof $leftEntries !== "undefined" && $leftEntries.length !== 0) {
        index = $leftEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index > 0) {
          index -= 1;
        }
        if (index === -1) index = 0;
        $currentCursor = {
          pane: "left",
          entry: $leftEntries[index],
          index: index,
        };
        $currentLeftFile = {
          entry: $leftEntries[index],
        };
      }
    } else {
      if (typeof $rightEntries !== "undefined" && $rightEntries.length !== 0) {
        index = $rightEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index > 0) {
          index -= 1;
        }
        if (index === -1) index = 0;
        $currentCursor = {
          pane: "right",
          entry: $rightEntries[index],
          index: index,
        };
        $currentRightFile = {
          entry: $rightEntries[index],
        };
      }
    }
  }

  function moveCursorUpWithSelect() {
    let index = 0;
    if ($currentCursor.pane.includes("left")) {
      if (typeof $leftEntries !== "undefined" && $leftEntries.length !== 0) {
        index = $leftEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index === -1) index = 0;
        let entry = $leftEntries[index];
        entry.selected = !entry.selected;
        $leftEntries[index] = entry;
        if (index > 0) {
          index -= 1;
        }
        entry = $leftEntries[index];
        $currentCursor = {
          pane: "left",
          entry: entry,
          index: index,
        };
        $currentLeftFile = {
          entry: entry,
        };
      }
    } else {
      if (typeof $rightEntries !== "undefined" && $rightEntries.length !== 0) {
        index = $rightEntries.findIndex(
          (item) => item.name == $currentCursor.entry.name,
        );
        if (index === -1) index = 0;
        let entry = $rightEntries[index];
        entry.selected = !entry.selected;
        $rightEntries[index] = entry;
        if (index > 0) {
          index -= 1;
        }
        entry = $rightEntries[index];
        $currentCursor = {
          pane: "right",
          entry: entry,
          index: index,
        };
        $currentRightFile = {
          entry: entry,
        };
      }
    }
  }

  function changeMode(newMode) {
    $inputState = newMode;
  }

  function changeModeNormal() {
    changeMode("normal");
  }

  function changeModeInsert() {
    changeMode("insert");
  }

  function changeModeVisual() {
    changeMode("visual");
  }

  async function openOppositePanel() {
    let nEntry = $currentCursor.entry.dir;
    if ($currentCursor.entry.type === 1) {
      nEntry = await $currentCursor.entry.fileSystem.appendPath(
        $currentCursor.entry.dir,
        $currentCursor.entry.name,
      );
    }
    if ($currentCursor.pane === "right") {
      await changeDir(
        {
          path: nEntry,
          cursor: true,
        },
        "left",
        "",
      );
    } else {
      await changeDir(
        {
          path: nEntry,
          cursor: true,
        },
        "right",
        "",
      );
    }
  }

  async function goHome() {
    let entry = await OS.getHomeDir();
    if ($currentCursor.pane === "right") {
      await changeDir(
        {
          path: entry,
          cursor: true,
        },
        "right",
        "",
      );
    } else {
      await changeDir(
        {
          path: entry,
          cursor: true,
        },
        "left",
        "",
      );
    }
  }

  function cursorToPane(npane) {
    if (npane == "right") {
      let index = $rightEntries.findIndex(
        (item) => item.name === $currentCursor.entry.name,
      );
      $currentCursor = {
        pane: "right",
        entry: $currentRightFile.entry,
        index: index,
      };
    } else {
      let index = $leftEntries.findIndex(
        (item) => item.name === $currentCursor.entry.name,
      );
      $currentCursor = {
        pane: "left",
        entry: $currentLeftFile.entry,
        index: index,
      };
    }
  }

  function cursorToNextPane() {
    if ($currentCursor.pane == "left") {
      let index = $rightEntries.findIndex(
        (item) => item.name === $currentCursor.entry.name,
      );
      $currentCursor = {
        pane: "right",
        entry: $currentRightFile.entry,
        index: index,
      };
    } else {
      let index = $leftEntries.findIndex(
        (item) => item.name === $currentCursor.entry.name,
      );
      $currentCursor = {
        pane: "left",
        entry: $currentLeftFile.entry,
        index: index,
      };
    }
    //
    // Force run the directory listeners.
    //
    forceRunDirectoryListeners($currentCursor.entry.dir);
  }

  function mouseMove(e) {
    if (mdown) {
      leftDOM.style.width = e.clientX + "px";
      rightDOM.style.width = containerDOM.clientWidth - (e.clientX + 10) + "px";
    }
  }

  async function reloadPane() {
    await changeDir(
      {
        path: $currentCursor.entry.dir,
        cursor: true,
      },
      $currentCursor.pane,
      $currentCursor.entry.name,
    );
  }

  async function changeDir(dirOb, npane, name) {
    let ndir = dirOb.path;
    if (typeof npane === "undefined") npane = $currentCursor.pane;
    if (typeof dirOb.cursor === "undefined") dirOb.cursor = true;
    if (typeof name === "undefined") name = "";
    if (npane == "left") {
      $leftDir = {
        path: ndir,
        fileSystemType: $leftDir.fileSystemType,
        fileSystem: $leftDir.fileSystem,
      };
      $leftEntries = await $leftDir.fileSystem.getDirList(ndir);

      if ($saved.lockqs && $saved.sideqs === "left") {
        $leftEntries = leftEntries.filter((item) =>
          item.name.toLowerCase().includes($saved.qs),
        );
      }

      if (typeof $leftEntries !== "undefined" && $leftEntries.length !== 0) {
        let index = $leftEntries.findIndex((item) => item.name === name);
        if (index === -1) index = 0;
        let entry = $leftEntries[index];
        if (entry.length !== 0) {
          $currentLeftFile = {
            entry: entry,
            pane: npane,
          };
          if (dirOb.cursor) {
            $currentCursor = {
              entry: entry,
              pane: npane,
              index: index,
            };
          }
        } else {
          $currentLeftFile = { entry: $leftEntries[0], pane: npane };
          if (dirOb.cursor) {
            $currentCursor = { entry: $leftEntries[0], pane: npane, index: 0 };
          }
        }
      } else {
        $currentLeftFile = {
          entry: {
            name: "",
            size: "",
            type: $leftDir.fileSystemType,
            fileSystem: $leftDir.fileSystem,
            dir: ndir,
            datetime: "",
            selected: false,
          },
        };
        if (dirOb.cursor) {
          $currentCursor = {
            entry: {
              name: "",
              size: "",
              type: $leftDir.fileSystemType,
              fileSystem: $leftDir.fileSystem,
              dir: ndir,
              datetime: "",
              selected: false,
            },
            pane: npane,
            index: 0,
          };
        }
      }
    } else {
      $rightDir = {
        path: ndir,
        fileSystemType: $rightDir.fileSystemType,
        fileSystem: $rightDir.fileSystem,
      };
      $rightEntries = await $rightDir.fileSystem.getDirList(ndir);

      if ($saved.lockqs && $saved.sideqs === "right") {
        $rightEntries = $rightEntries.filter((item) =>
          item.name.toLowerCase().includes($saved.qs),
        );
      }

      if (typeof $rightEntries !== "undefined" && $rightEntries.length !== 0) {
        let index = $rightEntries.findIndex((item) => item.name === name);
        if (index === -1) index = 0;
        let entry = $rightEntries[index];
        if (entry.length !== 0) {
          $currentRightFile = {
            entry: entry,
            pane: npane,
          };
          if (dirOb.cursor) {
            $currentCursor = {
              entry: entry,
              pane: npane,
              index: index,
            };
          }
        } else {
          $currentRightFile = { entry: $rightEntries[0], pane: npane };
          if (dirOb.cursor) {
            $currentCursor = {
              entry: $rightEntries[0],
              pane: npane,
              index: 0,
            };
          }
        }
      } else {
        $currentRightFile = {
          entry: {
            name: "",
            size: "",
            type: $rightDir.fileSystemType,
            fileSystem: $rightDir.fileSystem,
            dir: ndir,
            datetime: "",
            selected: false,
          },
        };
        if (dirOb.cursor) {
          $currentCursor = {
            entry: {
              name: "",
              size: "",
              type: $rightDir.fileSystemType,
              fileSystem: $rightDir.fileSystem,
              dir: ndir,
              datetime: "",
              selected: false,
            },
            pane: npane,
            index: 0,
          };
        }
      }
    }
  }

  async function openFile(entry) {
    if (typeof entry !== "undefined" && typeof entry.dir !== "undefined") {
      await entry.fileSystem.openFile(entry.dir, entry.name);
    }
  }

  async function actionEntry() {
    if ($currentCursor.entry.type === 0) {
      //
      // It is a file. Open it.
      //
      openFile($currentCursor.entry);
    } else {
      //
      // It is a directory. Go down a level.
      //
      let ndir = await $currentCursor.entry.fileSystem.appendPath(
        $currentCursor.entry.dir,
        $currentCursor.entry.name,
      );
      await changeDir(
        {
          path: ndir,
          cursor: true,
        },
        $currentCursor.pane,
        "",
      );
    }
  }

  async function goUpDir() {
    let sep = $currentCursor.entry.fileSystem.sep;
    let parts = $currentCursor.entry.dir.split(sep);
    if (parts.length > 0) {
      let newDir = parts.slice(0, parts.length - 1).join(sep);
      if (newDir == "")
        newDir = `${$currentCursor.entry.fileSystem.rootDir}${sep}`;
      await changeDir(
        {
          path: newDir,
          cursor: true,
        },
        $currentCursor.pane,
        parts[parts.length - 1],
      );
      await setCursor(parts[parts.length - 1]);
    }
  }

  async function goDownDir() {
    if ($currentCursor.entry.type === 1) {
      let newDir = await $currentCursor.entry.fileSystem.appendPath(
        $currentCursor.entry.dir,
        $currentCursor.entry.name,
      );
      await changeDir(
        {
          path: newDir,
          cursor: true,
        },
        $currentCursor.pane,
        "",
      );
    }
  }

  async function goBottomFile() {
    debugger;
    if ($currentCursor.pane == "left") {
      if (typeof $leftEntries !== "undefined" && $leftEntries.length !== 0) {
        const last = $leftEntries[$leftEntries.length - 1];
        await setCursor(last.name);
      }
    } else {
      if (typeof $rightEntries !== "undefined" && $rightEntries.length !== 0) {
        const last = $rightEntries[$rightEntries.length - 1];
        await setCursor(last.name);
      }
    }
  }

  async function goTopFile() {
    if ($currentCursor.pane == "left") {
      if (typeof $leftEntries !== "undefined" && $leftEntries.length !== 0) {
        let top = $leftEntries[0];
        await setCursor(top.name);
      }
    } else {
      if (typeof $rightEntries !== "undefined" && $rightEntries.length !== 0) {
        let top = $rightEntries[0];
        await setCursor(top.name);
      }
    }
  }

  function getCurrentFile() {
    return $currentCursor.entry;
  }

  function getCurrentPane() {
    return $currentCursor.pane;
  }

  function getLastError() {
    return lastError;
  }

  function deleteEntries() {
    let entries = getSelectedFiles();
    deleteEntriesCommand(entries);
  }

  async function deleteEntriesCommand(entries) {
    if (typeof entries !== 0) {
      for (let i = 0; i < entries.length; i++) {
        await entries[i].fileSystem.deleteEntries(entries[i], (err, stdout) => {
          if (err) {
            refreshPanes();
          }
        });
      }
    }
    //
    // Refresh the side deleted from.
    //
    if ($currentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }

    //
    // Make sure key processing is on.
    //
    $keyProcess = true;
  }

  function copyEntries() {
    let entries = getSelectedFiles();
    let sel = true;
    let otherPane;
    if ($currentCursor.pane === "left") {
      otherPane = { ...$currentRightFile.entry };
    } else {
      otherPane = { ...$currentLeftFile.entry };
    }
    otherPane.name = "";
    copyEntriesCommand(entries, otherPane, sel);
  }

  async function copyEntriesCommand(entries, otherPane, sel) {
    if (typeof entries !== "undefined") {
      for (let i = 0; i < entries.length; i++) {
        await entries[i].fileSystem.copyEntries(
          entries[i],
          otherPane,
          (err, stdout) => {
            if (err) {
              refreshPanes();
            } else if (i === entries.length - 1) {
              //            showMessageBox = false;
              $keyProcess = true;

              //
              // Refresh the side copied to.
              //
              if ($currentCursor.pane === "left") {
                refreshRightPane();
              } else {
                refreshLeftPane();
              }

              //
              // clear out the selections.
              //
              if (sel) clearSelectedFiles();
            }
          },
        );
      }
    }
  }

  function swapPanels() {
    let npane = $currentCursor.pane === "left" ? "right" : "left";
    let tmp = $currentLeftFile;
    $currentLeftFile = $currentRightFile;
    $currentRightFile = tmp;
    tmp = $leftDir;
    $leftDir = $rightDir;
    $rightDir = tmp;
    tmp = $rightEntries;
    $rightEntries = $leftEntries;
    $leftEntries = tmp;
    tick();
    cursorToPane(npane);
  }

  function editEntry() {
    editEntryCommand($currentCursor.entry);
  }

  async function editEntryCommand(entry) {
    if (await OS.fileExists(userEditor)) {
      //
      // There is an editor defined by the user. Use it.
      //
      let file = entry;
      if (typeof entry.dir !== "undefined") {
        file = await OS.appendPath(entry.dir, entry.name);
      }
      let editor = await OS.readFile(userEditor);
      editor = editor.toString().trim();
      if (editor.endsWith(".app")) {
        await OS.openFileWithProgram(editor, file);
      } else {
        //
        // It is a command line editor. Open specially.
        //
        if (editor === "emacs") {
          //
          // Open emacs.
          //
          await OS.runCommandLine(
            'emacsclient -n -q "' + file + '"',
            [],
            (err, result) => {},
            ".",
          );
        } else {
          //
          // Open in a terminal program.
          //
          await OS.openInTerminal(editor, file);
        }
      }
    } else {
      //
      // Open with the system default editor.
      //
      openFile(entry);
    }
  }

  async function duplicateEntry() {
    let newName = "";
    if ($currentCursor.entry.name[0] === ".") {
      newName = $currentCursor.entry.name + "-copy";
    } else {
      newName = $currentCursor.entry.name.split(".");
      if (newName.length >= 2) {
        newName[newName.length - 2] = newName[newName.length - 2] + "-copy";
        newName = newName.join(".");
      } else {
        newName = $currentCursor.entry.name + "-copy";
      }
    }
    let nEntry = { ...$currentCursor.entry };
    nEntry.name = newName;
    await $currentCursor.entry.fileSystem.copyEntries(
      $currentCursor.entry,
      nEntry,
    );
    //
    // Refresh the file list.
    //
    if ($currentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }
  }

  function moveEntries() {
    let entries = getSelectedFiles();
    let otherPane =
      $currentCursor.pane === "left"
        ? $currentRightFile.entry
        : $currentLeftFile.entry;
    moveEntriesCommand(entries, otherPane);
  }

  async function moveEntriesCommand(entries, otherPane) {
    if (typeof entries !== "undefined") {
      for (let i = 0; i < entries.length; i++) {
        await entries[i].fileSystem.moveEntries(
          entries[i],
          otherPane,
          (err, stdout) => {
            if (err) {
              //
              // Refresh both sides.
              //
              refreshPanes();
            } else if (i === entries.length - 1) {
              //
              // Refresh both sides.
              //
              refreshPanes();
            }
          },
        );
      }
    }
    refreshPanes();
    $keyProcess = true;
  }

  async function refreshRightPane() {
    //
    // Refresh right pane.
    //
    $rightEntries = await $rightDir.fileSystem.getDirList($rightDir.path);

    if ($saved.lockqs && $saved.sideqs === "right") {
      $rightEntries = $rightEntries.filter((item) =>
        item.name.toLowerCase().includes($saved.qs),
      );
    }

    let current = $currentRightFile.entry;
    if (
      typeof $rightEntries !== "undefined" &&
      ($rightEntries.length == 0 ||
        typeof current === "undefined" ||
        current === null)
    ) {
      current = {
        name: "",
        dir: $rightDir.path,
        fileSystemType: $rightDir.fileSystemType,
        fileSystem: $rightDir.fileSystem,
        selected: false,
        datetime: "",
        type: 0,
        size: 0,
        stats: null,
        index: 0,
      };
    } else {
      if (typeof current.index === "undefined") {
        current.index = 0;
      }
      //
      // Try to find the original file.
      //
      let newIndex = $rightEntries.findIndex(
        (item) => item.name === current.name,
      );
      if (newIndex === -1) {
        //
        // original file has disappeared. Set to the closest match.
        //
        newIndex = current.index;
        while (
          newIndex >= 0 &&
          typeof $rightEntries[newIndex] === "undefined"
        ) {
          newIndex--;
        }
        current = $rightEntries[newIndex];
        current.index = newIndex;
      } else {
        //
        // It is found! Set the new index value.
        //
        current.index = newIndex;
      }
    }
    if ($currentCursor.pane === "right") {
      $currentCursor = {
        entry: current,
        pane: "right",
        index: current.index,
      };
    }
    $currentRightFile = {
      entry: current,
    };
  }

  async function refreshLeftPane() {
    //
    // Refresh left pane.
    //
    $leftEntries = await $leftDir.fileSystem.getDirList($leftDir.path);

    if ($saved.lockqs && $saved.sideqs === "left") {
      $leftEntries = $leftEntries.filter((item) =>
        item.name.toLowerCase().includes($saved.qs),
      );
    }

    let current = $currentLeftFile.entry;
    if (
      typeof $leftEntries !== "undefined" &&
      ($leftEntries.length === 0 ||
        typeof current === "undefined" ||
        current === null)
    ) {
      //
      // If there are no entries, set current to a blank.
      //
      current = {
        name: "",
        dir: $leftDir.path,
        fileSystemType: $leftDir.fileSystemType,
        fileSystem: $leftDir.fileSystem,
        selected: false,
        datetime: "",
        type: 0,
        size: 0,
        stats: null,
        index: 0,
      };
    } else {
      if (typeof current.index === "undefined") {
        current.index = 0;
      }
      //
      // Try to find the original file.
      //
      let newIndex = $leftEntries.findIndex(
        (item) => item.name === current.name,
      );
      if (newIndex === -1) {
        //
        // original file has disappeared. Set to the closest match.
        //
        newIndex = current.index;
        while (newIndex >= 0 && typeof $leftEntries[newIndex] === "undefined") {
          newIndex--;
        }
        current = $leftEntries[newIndex];
        current.index = newIndex;
      } else {
        //
        // It is found! Set the new index value.
        //
        current.index = newIndex;
      }
    }

    if ($currentCursor.pane === "left") {
      $currentCursor = {
        entry: current,
        pane: "left",
        index: current.index,
      };
    }
    $currentLeftFile = {
      entry: current,
    };
  }

  function refreshPanes() {
    refreshLeftPane();
    refreshRightPane();
  }

  function showMessage(title, msg) {
    msgBoxConfig = {
      title: title,
      noShowButton: false,
    };

    //
    // If the msg starts with a tag open, then assume it is
    // a block of html and use that for displaying. Otherwise,
    // use a label.
    //
    if (msg[0] === "<") {
      msgBoxItems = [
        {
          type: "html",
          text: msg,
          id: "msgboxMain",
        },
      ];
    } else {
      msgBoxItems = [
        {
          type: "label",
          for: "msgboxMain",
          text: msg,
          id: "msgboxMain",
        },
      ];
    }
    msgCallBack = () => {};
    showMessageBox = true;
  }

  function pickItem(title, items, returnValue, extra) {
    if (typeof extra === "undefined") extra = false;
    msgBoxConfig = {
      title: title,
      noShowButton: false,
    };
    msgBoxItems = [
      {
        type: "picker",
        selections: items,
        value: items.length > 0 ? items[0].value : "",
        id: "msgboxMain",
        extra: extra,
      },
    ];
    msgCallBack = (e) => {
      returnValue(e.value);
      msgCallBack = () => {};
    };
    showMessageBox = true;
  }

  function askQuestion(title, question, returnValue) {
    msgBoxConfig = {
      title: title,
      noShowButton: false,
    };
    msgBoxItems = [
      {
        type: "input",
        msg: question,
        value: "",
        id: "msgboxMain",
      },
    ];
    showMessageBox = true;
    msgCallBack = (e) => {
      returnValue(e.value);
      msgCallBack = () => {};
    };
  }

  function newFile() {
    msgBoxConfig = {
      title: "New File Name",
      noShowButton: false,
    };
    msgBoxItems = [
      {
        type: "input",
        msg: "What name do you want to give the new file?",
        value: "",
        id: "msgboxMain",
      },
    ];
    showMessageBox = true;
    msgCallBack = newFileReturn;
  }

  async function newFileReturn(data) {
    //
    // Setup a null callback.
    //
    msgCallBack = () => {};
    let nfname = data.value;

    //
    // Create the new file.
    //
    nfname = await $currentCursor.entry.fileSystem.appendPath(
      $currentCursor.entry.dir,
      nfname,
    );
    await $currentCursor.entry.fileSystem.createFile(nfname);

    //
    // Refresh the file list.
    //
    if ($currentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }

    //
    // Set the new file as the cursor point.
    //
    await setCursor(nfname);
  }

  function newDirectory() {
    msgBoxConfig = {
      title: "New Directory Name",
      noShowButton: false,
    };
    msgBoxItems = [
      {
        type: "input",
        msg: "What name do you want to give the new directory?",
        value: "",
        id: "msgboxMain",
      },
    ];

    showMessageBox = true;
    msgCallBack = newDirectoryReturn;
  }

  async function newDirectoryReturn(data) {
    //
    // Setup a null callback.
    //
    msgCallBack = () => {};
    let ndname = data.value;

    //
    // Create the new file.
    //
    let ndir = { ...$currentCursor.entry };
    ndir.name = ndname;
    await $currentCursor.entry.fileSystem.createDir(ndir);

    //
    // Refresh the file list.
    //
    if ($currentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }

    //
    // Set the new file as the cursor point.
    //
    await setCursor(ndname);
  }

  function renameEntry() {
    msgBoxConfig = {
      title: "Rename File or Directory",
      noShowButton: false,
    };
    msgBoxItems = [
      {
        type: "input",
        msg: "What name do you want to change to?",
        value: $currentCursor.entry.name,
        id: "msgboxMain",
      },
    ];
    showMessageBox = true;
    msgCallBack = renameReturn;
  }

  async function renameReturn(data) {
    //
    // Setup a null callback.
    //
    msgCallBack = () => {};
    let nname = data.value;

    //
    // Create the new file.
    //
    let nentry = { ...$currentCursor.entry };
    nentry.name = nname;
    await $currentCursor.entry.fileSystem.renameEntry(
      $currentCursor.entry,
      nentry,
    );

    //
    // Refresh the file list.
    //
    if ($currentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }

    //
    // Set the new file as the cursor point.
    //
    await setCursor(nname);
  }

  function clearSelectedFiles() {
    if ($currentCursor.pane == "left") {
      //
      // Clear the left pane's selected files
      //
      $leftEntries = $leftEntries.map((item) => {
        item.selected = false;
        return item;
      });
    } else {
      //
      // Clear the right panes selected files
      //
      $rightEntries = $rightEntries.map((item) => {
        item.selected = false;
        return item;
      });
    }
  }

  function getSelectedFiles() {
    let selected = [];
    if ($currentCursor.pane == "left") {
      //
      // Get the left pane's selected files
      //
      selected = $leftEntries.filter((item) => item.selected === true);
    } else {
      //
      // Get the right panes selected files
      //
      selected = $rightEntries.filter((item) => item.selected === true);
    }
    if (selected.length === 0) {
      selected.push($currentCursor.entry);
    }
    return selected;
  }

  function msgReturn(e) {
    showMessageBox = false;
    msgCallBack(e.detail.ans);
  }

  function toggleQuickSearch() {
    showQuickSearch = !showQuickSearch;
  }

  function qsChangeEntries(e) {
    if (e.detail.pane === "left") {
      $leftEntries = e.detail.entries;
    } else {
      $rightEntries = e.detail.entries;
    }
    if ($currentCursor.pane == "left") {
      $currentCursor = {
        entry: $leftEntries[0],
        pane: "left",
        index: 0,
      };
      $currentLeftFile = {
        entry: $leftEntries[0],
      };
    } else {
      $currentCursor = {
        entry: $rightEntries[0],
        pane: "right",
        index: 0,
      };
      $currentRightFile = {
        entry: $rightEntries[0],
      };
    }
  }

  function getCursor() {
    return $currentCursor;
  }

  function getLeftFile() {
    return $currentLeftFile;
  }

  function getRightFile() {
    return $currentRightFile;
  }

  function editDirLoc() {
    if ($currentCursor.pane === "left") {
      setEditDirFlagLeft = true;
    } else {
      setEditDirFlagRight = true;
    }
  }

  function toggleExtraPanel() {
    showExtra = !showExtra;
  }

  function addKeyboardShort(keyboard, ctrl, shift, meta, key, cmd, alt) {
    if (typeof alt === "undefined") alt = false;
    stateMaps[keyboard].push({
      ctrl: ctrl,
      shift: shift,
      meta: meta,
      alt: alt,
      key: key,
      command: cmd,
    });
  }

  function setTheme(thm) {
    $theme = thm;
  }

  function getTheme() {
    return $theme;
  }

  function addDirectoryListener(listener) {
    $directoryListeners.push(listener);
  }

  function forceRunDirectoryListeners(pth) {
    $directoryListeners.map((value) => {
      value(pth, "");
    });
  }

  function toggleCommandPrompt() {
    showCommandPrompt = !showCommandPrompt;
  }

  function addSpinner(name, value) {
    msgBoxSpinners.push({
      name: name,
      value: value,
    });
    msgBoxSpinners = msgBoxSpinners;
  }

  function updateSpinner(name, value) {
    msgBoxSpinners = msgBoxSpinners.map((spinner) => {
      if (spinner.name === name) {
        spinner.value = value;
      }
      return spinner;
    });
  }

  function removeSpinner(name) {
    msgBoxSpinners = msgBoxSpinners.filter((spinner) => spinner.name !== name);
  }

  function clearSpinners() {
    msgBoxSpinners = [];
    showMessageBox = false;
    $keyProcess = true;
  }

  async function selectRegExp() {
    if (selRegExpHist === null) {
      selRegExpHist = await getRegExpSelectHistory();
    }
    let selectList = selRegExpHist.map((item) => {
      return {
        name: item,
        value: item,
      };
    });
    pickItem(
      "Select Regular Expressions",
      selectList,
      runRegExpHistSelection,
      true,
    );
  }

  function runRegExpHistSelection(value) {
    if (typeof value === "object") {
      value = value.value;
    }
    saveRegExpSelectHistory(value);
    let selRegExp = new RegExp(value);
    if ($currentCursor.pane === "left") {
      $leftEntries.map((item) => {
        if (item.name.match(selRegExp) !== null) {
          item.selected = true;
        }
      });
      $leftEntries = $leftEntries;
    } else {
      $rightEntries.map((item) => {
        if (item.name.match(selRegExp) !== null) {
          item.selected = true;
        }
      });
      $rightEntries = $rightEntries;
    }
  }

  async function saveRegExpSelectHistory(value) {
    //
    // Save if not already in the list.
    //
    if (selRegExpHist.filter((item) => item === value).length === 0)
      selRegExpHist.push(value);
    let regExpFile = await OS.appendPath(configDir, "regexps.json");
    await OS.writeFile(regExpFile, JSON.stringify(selRegExpHist));
  }

  async function getRegExpSelectHistory() {
    let result = [];
    let regExpFile = await OS.appendPath(configDir, "regexps.json");
    if (await OS.fileExists(regExpFile)) {
      result = await OS.readFile(regExpFile);
      result = JSON.parse(result);
    }
    return result;
  }

  function toggleGitHub() {
    showGitHub = !showGitHub;
    if (showGitHub) {
      $keyProcess = false;
    } else {
      $keyProcess = true;
    }
  }

  function setShowAllFilter() {
    flagFilter = 0;
    OS.setFilter(OS.allFilter);
    refreshPanes();
  }

  function setDefaultFilter() {
    flagFilter = 1;
    OS.setFilter(OS.defaultFilter);
    refreshPanes();
  }

  function toggleFilter() {
    switch (flagFilter) {
      case 0:
        setDefaultFilter();
        break;
      case 1:
        setShowAllFilter();
        break;
      default:
        setDefaultFilter();
        break;
    }
  }

  async function createDefaultNormalMap(keyMapDir) {
    //
    // There are no key map files. We need to create them.
    //
    let defaultNormalMap = [
      {
        ctrl: false,
        shift: true,
        meta: false,
        alt: false,
        key: ":",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: true,
        alt: false,
        key: "m",
        command: "minimizeWindow",
      },
      {
        ctrl: false,
        shift: false,
        meta: true,
        alt: false,
        key: "q",
        command: "quitApp",
      },
      {
        ctrl: true,
        shift: false,
        meta: false,
        alt: false,
        key: "p",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "s",
        command: "toggleExtraPanel",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "q",
        command: "editDirLoc",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "r",
        command: "reloadPane",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "p",
        command: "swapPanels",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "d",
        command: "duplicateEntry",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "e",
        command: "editEntry",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "m",
        command: "moveEntries",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "c",
        command: "copyEntries",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "x",
        command: "deleteEntries",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "g",
        command: "goTopFile",
      },
      {
        ctrl: false,
        shift: true,
        meta: false,
        alt: false,
        key: "G",
        command: "goBottomFile",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "ArrowDown",
        command: "moveCursorDown",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "ArrowUp",
        command: "moveCursorUp",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "l",
        command: "goDownDir",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "h",
        command: "goUpDir",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "Enter",
        command: "actionEntry",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "Tab",
        command: "cursorToNextPane",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "k",
        command: "moveCursorUp",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "j",
        command: "moveCursorDown",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "i",
        command: "changeModeInsert",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "v",
        command: "changeModeVisual",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "/",
        command: "toggleQuickSearch",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: ".",
        command: "reRunLastCommand",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: ",",
        command: "toggleFilter",
      },
      {
        ctrl: false,
        shift: true,
        meta: false,
        alt: false,
        key: "O",
        command: "openOppositePanel",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "w",
        command: "goHome",
      },
    ];

    //
    // Create the directory for the keymaps if it doesn't exist.
    //
    if (!(await OS.dirExists(keyMapDir))) {
      await OS.createDir(keyMapDir);
    }

    //
    // Create the default files if they don't exist.
    //
    const nkmfile = await OS.appendPath(keyMapDir, "normalKeyMap.json");
    await OS.writeFile(nkmfile, JSON.stringify(defaultNormalMap));

    //
    // Set the proper commands.
    //
    stateMaps["normal"] = processKeyMap(defaultNormalMap);
  }

  async function createDefaultVisualMap(keyMapDir) {
    let defaultVisualMap = [
      {
        ctrl: false,
        shift: true,
        meta: false,
        alt: false,
        key: ":",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "k",
        command: "moveCursorUpWithSelect",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "j",
        command: "moveCursorDownWithSelect",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "a",
        command: "selectAll",
      },
      {
        ctrl: false,
        shift: true,
        meta: false,
        alt: false,
        key: "A",
        command: "unselectAll",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "ArrowDown",
        command: "moveCursorDown",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "ArrowUp",
        command: "moveCursorUp",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "Escape",
        command: "changeModeNormal",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "r",
        command: "selectRegExp",
      },
    ];

    //
    // Create the directory for the keymaps if it doesn't exist.
    //
    if (!(await OS.dirExists(keyMapDir))) {
      await OS.createDir(keyMapDir);
    }

    //
    // Create the default files if they don't exist.
    //
    const nvmFile = await OS.appendPath(keyMapDir, "visualKeyMap.json");
    await OS.writeFile(nvmFile, JSON.stringify(defaultVisualMap));

    //
    // Set the proper commands.
    //
    stateMaps["visual"] = processKeyMap(defaultVisualMap);
  }

  async function createDefaultInsertMap(keyMapDir) {
    let defaultInsertMap = [
      {
        ctrl: false,
        shift: true,
        meta: false,
        alt: false,
        key: ":",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "Escape",
        command: "changeModeNormal",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "d",
        command: "newDirectory",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "f",
        command: "newFile",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        alt: false,
        key: "r",
        command: "renameEntry",
      },
    ];

    //
    // Create the directory for the keymaps if it doesn't exist.
    //
    if (!(await OS.dirExists(keyMapDir))) {
      await OS.createDir(keyMapDir);
    }

    //
    // Create the default files if they don't exist.
    //
    const ikmFile = await OS.appendPath(keyMapDir, "insertKeyMap.json");
    await OS.writeFile(ikmFile, JSON.stringify(defaultInsertMap));

    //
    // Set the proper commands.
    //
    stateMaps["insert"] = processKeyMap(defaultInsertMap);
  }

  async function loadKeyMaps() {
    //
    // Load key maps from the config directory.
    //
    let keyMapDir = await OS.appendPath(configDir, "keyMaps");

    if (!(await OS.dirExists(keyMapDir))) {
      createDefaultNormalMap(keyMapDir);
      createDefaultVisualMap(keyMapDir);
      createDefaultInsertMap(keyMapDir);
    } else {
      //
      // The keymap directory is there. let's load the files.
      //
      let fileLoc = await OS.appendPath(keyMapDir, "normalKeyMap.json");
      if (!(await OS.fileExists(fileLoc))) {
        createDefaultNormalMap(keyMapDir);
      }
      const nkmfile = await OS.readFile(fileLoc);
      stateMaps["normal"] = processKeyMap(JSON.parse(nkmfile));

      fileLoc = await OS.appendPath(keyMapDir, "visualKeyMap.json");
      if (!(await OS.fileExists(fileLoc))) {
        createDefaultVisualMap(keyMapDir);
      }
      const vmFile = await OS.readFile(fileLoc);
      stateMaps["visual"] = processKeyMap(JSON.parse(vmFile));

      fileLoc = await OS.appendPath(keyMapDir, "insertKeyMap.json");
      if (!(await OS.fileExists(fileLoc))) {
        createDefaultInsertMap(keyMapDir);
      }
      const ikmFile = await OS.readFile(fileLoc);
      stateMaps["insert"] = processKeyMap(JSON.parse(ikmFile));
    }
  }

  function processKeyMap(kmap) {
    return kmap.map((item, index, arr) => {
      let cmd = commands.getCommand(item.command);
      if (typeof cmd === "undefined") {
        cmd = commands.getAltCommand(item.command);
      }
      if (typeof cmd !== "undefined") {
        //
        // Found the command. Set it up.
        //
        item.name = item.command;
        item.command = cmd.command;
        return item;
      } else {
        //
        // If the command can't be found, remove it from the map.
        //
        delete arr[index];
      }
    });
  }

  function getRightDir() {
    return $rightDir;
  }

  function setRightDir(path) {
    $rightDir.path = path;
    refreshRightPane();
  }

  function getLeftDir() {
    return $leftDir;
  }

  function setLeftDir(path) {
    $leftDir.path = path;
    refreshLeftPane();
  }

  function addExtraPanelProcessor(panelProc) {
    $extraPanel.push(panelProc);
  }

  async function saveDefaultKeymaps() {
    let keyMapDir = await OS.appendPath(configDir, "keyMaps");
    createDefaultNormalMap(keyMapDir);
    createDefaultVisualMap(keyMapDir);
    createDefaultInsertMap(keyMapDir);
  }

  async function getOS() {
    return OStype;
  }
</script>

<div
  id="container"
  style="background-color: {$theme.backgroundColor};
         color: {$theme.textColor};
         font-family: {$theme.font};
         font-size: {$theme.fontSize};
         height: {mid}px;"
  onmousemove={mouseMove}
  onmouseup={() => {
    mdown = false;
  }}
  bind:this={containerDOM}
>
  {#if showGitHub}
    <GitHub
      on:closeGitHub={() => {
        toggleGitHub();
      }}
    />
  {/if}

  {#if showCommandPrompt}
    <CommandPrompt
      {commands}
      on:closeCommandPrompt={(e) => {
        showCommandPrompt = false;
        if (!showMessageBox) {
          $keyProcess = true;
        }
        if (e.detail.skip) $skipKey = true;
      }}
    />
  {/if}

  {#if showMessageBox}
    <MessageBox
      config={msgBoxConfig}
      spinners={msgBoxSpinners}
      items={msgBoxItems}
      on:msgReturn={msgReturn}
      on:closeMsgBox={(e) => {
        showMessageBox = false;
        $keyProcess = true;
        if (e.detail.skip) $skipKey = true;
      }}
    />
  {/if}

  {#if showQuickSearch}
    {#if $currentCursor.pane === "left"}
      <QuickSearch
        position={leftDOM.clientWidth - 110}
        bind:Entries={$leftEntries}
        bind:open={showQuickSearch}
      />
    {:else}
      <QuickSearch
        bind:Entries={$rightEntries}
        bind:open={showQuickSearch}
        position={rightDOM.clientWidth + leftDOM.clientWidth - 95}
      />
    {/if}
  {/if}

  <div id="leftSide" bind:this={leftDOM}>
    {#if $currentCursor.pane === "right" && showExtra}
      <ExtraPanel side="left" />
    {:else}
      <DirectoryListing
        path={$leftDir}
        edit={setEditDirFlagLeft}
        pane="left"
        on:dirChange={async (e) => {
          setEditDirFlagLeft = false;
          await changeDir(e.detail, "left", "");
        }}
        on:updateDir={() => {
          refreshLeftPane();
        }}
      />
      <Pane
        pane="left"
        entries={$leftEntries}
        utilities={$leftDir.fileSystem}
        on:changeDir={async (e) => {
          await changeDir(e.detail.dir, "left", "");
        }}
        on:openFile={async (e) => {
          await openFile(e.detail.entry);
        }}
      />
    {/if}
  </div>
  <ResizeBorder
    on:mouseDown={(e) => {
      mdown = e.detail;
    }}
  />
  <div id="rightSide" bind:this={rightDOM}>
    {#if $currentCursor.pane === "left" && showExtra}
      <ExtraPanel side="right" />
    {:else}
      <DirectoryListing
        path={$rightDir}
        edit={setEditDirFlagRight}
        pane="right"
        on:dirChange={async (e) => {
          setEditDirFlagRight = false;
          await changeDir(e.detail, "right", "");
        }}
        on:updateDir={async () => {
          await refreshRightPane();
        }}
      />
      <Pane
        pane="right"
        entries={$rightEntries}
        utilities={$rightDir.fileSystem}
        on:changeDir={async (e) => {
          await changeDir(e.detail.dir, "right", "");
        }}
        on:openFile={async (e) => {
          await openFile(e.detail.entry);
        }}
      />
    {/if}
  </div>
</div>

<style>
  #leftSide {
    display: flex;
    flex-direction: column;
    padding: 0px;
    margin: 0px;
    width: 50%;
  }

  #rightSide {
    display: flex;
    flex-direction: column;
    padding: 0px;
    margin: 0px;
    width: 50%;
  }

  #container {
    padding: 0px;
    margin: 0px;
    display: flex;
    flex-direction: row;
    width: 100%;
    flex-grow: 1;
  }
</style>
