<script>
  import { onMount, tick, createEventDispatcher } from "svelte";
  import { get } from "svelte/store";
  import Pane from "../components/Pane.svelte";
  import MessageBox from "../components/MessageBox.svelte";
  import DirectoryListing from "../components/DirectoryListing.svelte";
  import ResizeBorder from "../components/ResizeBorder.svelte";
  import QuickSearch from "../components/QuickSearch.svelte";
  import ExtraPanel from "../components/ExtraPanel.svelte";
  import CommandPrompt from "../components/CommandPrompt.svelte";
  import GitHub from "../components/GitHub.svelte";
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
  import commands from "../modules/commands.js";
  import filesystems from "../modules/filesystems";
  import extensions from "../modules/extensions.js";
  import OS from "../modules/OS.js";
  import { altKey } from "../stores/altKey.js";
  import { ctrlKey } from "../stores/ctrlKey.js";
  import { metaKey } from "../stores/metaKey.js";
  import { skipKey } from "../stores/skipKey.js";
  import { shiftKey } from "../stores/shiftKey.js";
  import { processKey } from "../stores/processKey.js";

  const dispatch = createEventDispatcher();

  export let mid;

  let showMessageBox = false;
  let showQuickSearch = false;
  let msgBoxConfig = {};
  let msgBoxSpinners = [];
  let msgBoxItems = null;
  let msgCallBack = () => {};
  let configDir = "";
  let localConfig = null;
  let setEditDirFlagLeft = false;
  let setEditDirFlagRight = false;
  let showExtra = false;
  let showCommandPrompt = false;
  let leftEntries = {};
  let rightEntries = {};
  let localCurrentCursor = {
    pane: "left",
    entry: {},
  };
  let localCurrentLeftFile = {};
  let localCurrentRightFile = {};
  let localTheme = {};
  let localState = "normal";
  let localLeftDir = {
    fileSystemType: "macOS",
    fileSystem: null,
    path: "",
  };
  let localRightDir = {
    fileSystemType: "macOS",
    fileSystem: null,
    path: "",
  };
  let rightDOM = null;
  let leftDOM = null;
  let containerDOM = null;
  let mdown = false;
  let lastError = null;
  let userEditor = ".myeditorchoice";
  let OStype = "macOS";
  let stateMaps = [];
  let localStateMapColors = [];
  let showGitHub = false;
  let numberAcc = "";
  let lastCommand = "";
  let flagFilter = 1;
  let selRegExpHist = [
    {
      name: "",
      value: "",
    },
  ];

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
    $config = {};
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
    OS.init();
    OS.setDirFirst(true);

    //
    // Setup the configuration directory.
    //
    configDir = await OS.getConfigDir();
    if (!(await OS.dirExists(configDir))) {
      await OS.makeDir(configDir);
      var extdir = await OS.appendPath(configDir, "extensions");
      await OS.makeDir(extdir);
    }

    //
    // Load the configuration file.
    //
    if (!(await OS.fileExists(await OS.appendPath(configDir, "config.json")))) {
      //
      // Create the default configuration and save it.
      //
      localConfig = await OS.getConfig();
      const cfgFile = await OS.appendPath(configDir, "config.json");
      await OS.writeFile(cfgFile, JSON.stringify(localConfig));
    } else {
      //
      // Read in the local configuration.
      //
      var configFile = await OS.appendPath(configDir, "config.json");
      localConfig = await OS.readFile(configFile);
      localConfig = JSON.parse(localConfig);
    }

    //
    // Here, we are subscribing to the different stores and setting their
    // default values;
    //
    var unsubscribeLeftDir = leftDir.subscribe((value) => {
      localLeftDir = value;
    });
    var unsubscribeRightDir = rightDir.subscribe((value) => {
      localRightDir = value;
    });

    //
    // Setup the application to be in the user's home directory.
    //
    localLeftDir.path = await OS.getHomeDir();
    localLeftDir.fileSystemType = OStype;
    localLeftDir.fileSystem = OS;
    localRightDir.path = localLeftDir.path;
    localRightDir.fileSystemType = OStype;
    localRightDir.fileSystem = OS;

    //
    // Get the files.
    //
    leftEntries = await OS.getDirList(localLeftDir.path);
    rightEntries = await OS.getDirList(localRightDir.path);

    //
    // Set the stores to their proper value.
    //
    $leftDir = localLeftDir;
    $rightDir = localRightDir;

    var unsubscribeCurrentCursor = currentCursor.subscribe((value) => {
      localCurrentCursor = value;
    });
    $currentCursor = {
      pane: "left",
      entry: leftEntries[0],
    };
    var unsubscribeCurrentLeftFile = currentLeftFile.subscribe((value) => {
      localCurrentLeftFile = value;
    });
    $currentLeftFile = {
      entry: leftEntries[0],
    };
    var unsubscribeCurrentRightFile = currentRightFile.subscribe((value) => {
      localCurrentRightFile = value;
    });
    $currentRightFile = {
      entry: rightEntries[0],
    };
    var unsubscribeTheme = theme.subscribe(async (value) => {
      //
      // Make sure a proper theme is being set.
      //
      if (typeof value.backgroundColor !== "undefined") {
        //
        // Keep a local copy.
        //
        localTheme = value;

        //
        // Save the new theme values.
        //
        const tfile = await OS.appendPath(configDir, "theme.json");
        await OS.writeFile(tfile, JSON.stringify(value));

        //
        // Set the default state map colors.
        //
        localStateMapColors["normal"] = localTheme.normalbackgroundColor;
        localStateMapColors["insert"] = localTheme.insertbackgroundColor;
        localStateMapColors["visual"] = localTheme.visualbackgroundColor;
        $stateMapColors = localStateMapColors;
      }
    });
    var unsubscriptStateMapColors = stateMapColors.subscribe((value) => {
      localStateMapColors = value;
    });
    var unsubscribeInputState = inputState.subscribe((value) => {
      localState = value;
    });
    $inputState = localState;

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
      }
    }

    //
    // Set the configuration store.
    //
    $config = {
      configDir: configDir,
      OS: OS,
      configuration: localConfig,
      commands: commands,
      extensions: extensions,
      userEditor: userEditor,
    };
    OS.setConfig(localConfig);
    extensions.setConfig(localConfig);

    //
    // Load the extensions, keyboard, and theme.
    //
    await loadExtensionsKeyboard();

    //
    // Setup the directory history.
    //
    var dhist = get(dirHistory);
    dhist.loadHistory();
    $dirHistory = dhist;

    //
    // Setup emmiters from the go code.
    //
    var commandParse = RegExp("^([^(]*)\\(([^)]*)\\)");
    window.runtime.EventsOn("runCommands", (commands) => {
      if (typeof commands === "string" && commands.length > 0) {
        for (var i = 0; i < commands.length; i++) {
          var parts = commands[i].match(commandParse);
          if (parts[2][0] == "'") {
            parts[2] = parts[2].slice(1, -1);
          }
          extensions.getExtCommand(parts[1])(parts[2]);
        }
      }
    });
    var commands = await window.go.main.App.GetCommandLineCommands();
    if (commands !== null) {
      for (var i = 0; i < commands.length; i++) {
        var parts = commands[i].match(commandParse);
        if (parts[2][0] == "'") {
          parts[2] = parts[2].slice(1, -1);
        }
        extensions.getExtCommand(parts[1]).command(parts[2]);
      }
    }

    //
    // return a command to unsubscribe from everything.
    //
    return () => {
      unsubscribeKeyProcess();
      unsubscribeInputState();
      unsubscribeTheme();
      unsubscribeCurrentRightFile();
      unsubscribeCurrentLeftFile();
      unsubscribeCurrentCursor();
      unsubscribeRightDir();
      unsubscribeLeftDir();
      unsubscriptStateMapColors();
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
    const thFile = await OS.appendPath(configDir, "theme.json");
    if (!(await OS.fileExists(thFile))) {
      //
      // Setup the Dracula Pro as default theme colors:
      //
      localTheme = {
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
      await OS.writeFile(thFile, JSON.stringify(localTheme));
    } else {
      //
      // Load the theme saved.
      //
      const rawThFile = await OS.readFile(thFile);
      localTheme = JSON.parse(rawThFile);
    }

    //
    // Get the stateMapColors setup.
    //
    localStateMapColors["normal"] = localTheme.normalbackgroundColor;
    localStateMapColors["insert"] = localTheme.insertbackgroundColor;
    localStateMapColors["visual"] = localTheme.visualbackgroundColor;
    stateMapColors.set(localStateMapColors);

    //
    // Set the theme.
    //
    theme.set(localTheme);

    //
    // Setup Extensions.
    //
    await setUpExt();

    //
    // Setup State Maps. This has to be after setting up extensions in case
    // an extension command is being used.
    //
    await loadKeyMaps();
    const ldKeyMaps = extensions.installKeyMaps;
    await ldKeyMaps();
  }

  async function setUpExt() {
    const extDir = await OS.appendPath(configDir, "extensions");
    extensions.setExtensionDir(extDir);
    extensions.setCommands(commands);
    extensions.setFileSystems(filesystems);
    await extensions.load(localConfig, OS);
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

  function switchView(view) {
    dispatch("switchView", {
      view: view,
    });
  }

  function showPreferences() {
    switchView("preferences");
  }

  function getOS() {
    return "macOS";
  }

  function installDefaultExtCommands() {
    extensions.addExtCommand(
      "setCursor",
      "Set the cursor to the file name given in the current panel.",
      setCursor
    );
    extensions.addExtCommand(
      "cursorToPane",
      'Set the cursor to the pane given. Either "left" or "right", cursorToPane'
    );
    extensions.addExtCommand(
      "changeDir",
      "Change the directory of a pane and make it the current.",
      changeDir
    );
    extensions.addExtCommand(
      "getLeftFile",
      "Get the current left file information.",
      getLeftFile
    );
    extensions.addExtCommand(
      "getRightFile",
      "Get the current right file information.",
      getRightFile
    );
    extensions.addExtCommand("getCursor", "Get the current cursor.", getCursor);
    extensions.addExtCommand(
      "addKeyboardShort",
      "Add a keyboard shortcut.",
      addKeyboardShort
    );
    extensions.addExtCommand(
      "setTheme",
      "Set the theme to the values given.",
      setTheme
    );
    extensions.addExtCommand(
      "getTheme",
      "Get the current theme values.",
      getTheme
    );
    extensions.addExtCommand("getOS", "Get the local OS name.", getOS);
    extensions.addExtCommand(
      "addDirectoryListener",
      "Register a function that will be called with each change in directory.",
      addDirectoryListener
    );
    extensions.addExtCommand(
      "getLastError",
      "returns the last error.",
      getLastError
    );
    extensions.addExtCommand(
      "getSelectedFiles",
      "Returns a list of Entries that have been selected",
      getSelectedFiles
    );
    extensions.addExtCommand(
      "getCurrentFile",
      "Get the current file.",
      getCurrentFile
    );
    extensions.addExtCommand(
      "getCurrentPane",
      "Get the pane that is currently active.",
      getCurrentPane
    );
    extensions.addExtCommand(
      "changeDir",
      "Change the current directory for a pane.",
      changeDir
    );
    extensions.addExtCommand(
      "addSpinner",
      "Add a message box spinner value.",
      addSpinner
    );
    extensions.addExtCommand(
      "updateSpinner",
      "Update a message box spinner value.",
      updateSpinner
    );
    extensions.addExtCommand(
      "removeSpinner",
      "Remove a message box spinner value.",
      removeSpinner
    );
    extensions.addExtCommand(
      "keyProcessor",
      "Send a keystroke to be processed.",
      keyProcessor
    );
    extensions.addExtCommand(
      "stringKeyProcessor",
      "Send a string of keystrokes to be processed.",
      stringKeyProcessor
    );
    extensions.addExtCommand(
      "askQuestion",
      "Ask a question and get the response.",
      askQuestion
    );
    extensions.addExtCommand(
      "pickItem",
      "Choose from a list of items.",
      pickItem
    );
    extensions.addExtCommand(
      "showMessage",
      "Show a message to the user.",
      showMessage
    );
    extensions.addExtCommand(
      "createNewMode",
      "Allows the creation of a new mode for keyboard commands.",
      createNewMode
    );
    extensions.addExtCommand("changeMode", "Change to mode given.", changeMode);
    extensions.addExtCommand(
      "switchView",
      "Switch the active program view.",
      switchView
    );
    extensions.addExtCommand(
      "copyEntriesCommand",
      "Copy the list of entries to new location.",
      copyEntriesCommand
    );
    extensions.addExtCommand(
      "moveEntriesCommand",
      "Move the list of entries to the new location.",
      moveEntriesCommand
    );
    extensions.addExtCommand(
      "deleteEntriesCommand",
      "Delete the list of entries.",
      deleteEntriesCommand
    );
    extensions.addExtCommand(
      "editEntryCommand",
      "Edit the given entry.",
      editEntryCommand
    );
    extensions.addExtCommand(
      "getRightDir",
      "Get the path for the right pane.",
      getRightDir
    );
    extensions.addExtCommand(
      "getLeftDir",
      "Get the path for the left pane.",
      getLeftDir
    );
    extensions.addExtCommand(
      "setLeftDir",
      "Set the left panel directory.",
      setLeftDir
    );
    extensions.addExtCommand(
      "setRightDir",
      "Set the right panel directory.",
      setRightDir
    );

    extensions.addExtCommand(
      "addExtraPanelProcessor",
      "Add a processor for creating extra panel html.",
      addExtraPanelProcessor
    );
    extensions.addExtCommand(
      "addWatcher",
      "Add a file or directory watcher",
      addWatcher
    );
    extensions.addExtCommand(
      "removeWatcher",
      "Remove a file or directory watcher",
      removeWatcher
    );
  }

  function installDefaultCommands() {
    //
    // Add all built in commands to the commands object.
    //
    commands.addCommand(
      "Minimize",
      "minimizeWindow",
      "Minimizes the window.",
      minimizeWindow
    );
    commands.addCommand(
      "Select by Regular Expression",
      "selectRegExp",
      "Selects the files/directories in the current pane based on a regular expression.",
      selectRegExp
    );
    commands.addCommand("Quit", "quitApp", "Quits the application.", quitApp);
    commands.addCommand(
      "Go Home",
      "goHome",
      "Puts the current panel in the home directory.",
      goHome
    );
    commands.addCommand(
      "Select All",
      "selectAll",
      "Select All entries in the current pane.",
      selectAll
    );
    commands.addCommand(
      "Unselect All",
      "unselectAll",
      "Unselect All entries in the current pane.",
      unselectAll
    );
    commands.addCommand(
      "Move Cursor Down",
      "moveCursorDown",
      "Move the cursor down one line.",
      moveCursorDown
    );
    commands.addCommand(
      "Move Cursor Down with Selection",
      "moveCursorDownWithSelect",
      "This will select the current file and move the cursor down one line.",
      moveCursorDownWithSelect
    );
    commands.addCommand(
      "Move Cursor Up",
      "moveCursorUp",
      "This will move the cursor up one line",
      moveCursorUp
    );
    commands.addCommand(
      "Move Cursor Up with Selection",
      "moveCursorUpWithSelect",
      "This will move select the current entry and move the cursor up one line.",
      moveCursorUpWithSelect
    );
    commands.addCommand(
      "Change Mode to Normal",
      "changeModeNormal",
      "Set the normal mode.",
      changeModeNormal
    );
    commands.addCommand(
      "Change Mode to Insert",
      "changeModeInsert",
      "Set the insert mode.",
      changeModeInsert
    );
    commands.addCommand(
      "Change Mode to Visual",
      "changeModeVisual",
      "Set the visual mode.",
      changeModeVisual
    );
    commands.addCommand(
      "Cursor to Next Pane",
      "cursorToNextPane",
      "This will move the cursore to the opposite pane.",
      cursorToNextPane
    );
    commands.addCommand(
      "Action Entry",
      "actionEntry",
      "This will open a file or go into a directory.",
      actionEntry
    );
    commands.addCommand(
      "Go Up a Directory",
      "goUpDir",
      "Go to the parent directory.",
      goUpDir
    );
    commands.addCommand(
      "Go Down a Directory",
      "goDownDir",
      "If the current entry is a directory, go to it.",
      goDownDir
    );
    commands.addCommand(
      "Go to Bottom Entry",
      "goBottomFile",
      "Move the cursor to the bottom most file.",
      goBottomFile
    );
    commands.addCommand(
      "Go to Top Entry",
      "goTopFile",
      "Move the cursor to the top most file.",
      goTopFile
    );
    commands.addCommand(
      "Delete Entries",
      "deleteEntries",
      "Delete all selected entries or the one under the cursor",
      deleteEntries
    );
    commands.addCommand(
      "Copy Entries",
      "copyEntries",
      "Copy the selected entries or the one under the cursor to the other pane.",
      copyEntries
    );
    commands.addCommand(
      "Move Entries",
      "moveEntries",
      "Move the selected entries or the one under the cursor to the other pane.",
      moveEntries
    );
    commands.addCommand(
      "Edit Entry",
      "editEntry",
      "Opens the file under the cursor in the editor specified. This command assumes using a Text/Code editor on the file.",
      editEntry
    );
    commands.addCommand(
      "Duplicate Entry",
      "duplicateEntry",
      'Make a copy of the current entry with "_copy" added to it.',
      duplicateEntry
    );
    commands.addCommand(
      "New File",
      "newFile",
      "Create a new file in the current pane.",
      newFile
    );
    commands.addCommand(
      "New Directory",
      "newDirectory",
      "Create a new directory in the current pane.",
      newDirectory
    );
    commands.addCommand(
      "Rename Entry",
      "renameEntry",
      "Rename the current entry.",
      renameEntry
    );
    commands.addCommand(
      "Swap Panels",
      "swapPanels",
      "Swap the panel contents.",
      swapPanels
    );
    commands.addCommand(
      "Toggle Quick Search",
      "toggleQuickSearch",
      "Show/Hide the Quick Search panel.",
      toggleQuickSearch
    );
    commands.addCommand(
      "Reload Pane",
      "reloadPane",
      "Reload the Current Pane.",
      reloadPane
    );
    commands.addCommand(
      "Edit Directory",
      "editDirLoc",
      "Edit the current panels directory.",
      editDirLoc
    );
    commands.addCommand(
      "Toggle Extra Panel",
      "toggleExtraPanel",
      "Toggles the showing of the extra panel.",
      toggleExtraPanel
    );
    commands.addCommand(
      "Toggle Command Prompt",
      "toggleCommandPrompt",
      "Toggles showing the command prompt.",
      toggleCommandPrompt
    );
    commands.addCommand(
      "Toggle GitHub Importer",
      "toggleGitHub",
      "Toggles the showing of the GitHub importer.",
      toggleGitHub
    );
    commands.addCommand(
      "Refresh Panes",
      "refreshPanes",
      "Reloads both panes.",
      refreshPanes
    );
    commands.addCommand(
      "Refresh Right Pane",
      "refreshRightPane",
      "Refresh the Right Pane",
      refreshRightPane
    );
    commands.addCommand(
      "Refresh Left Pane",
      "refreshLeftPane",
      "Reloads the Left Pane.",
      refreshLeftPane
    );
    commands.addCommand(
      "Rerun Last Command",
      "reRunLastCommand",
      "Runs the last command with it's number.",
      reRunLastCommand
    );
    commands.addCommand(
      "Toggle Filter",
      "toggleFilter",
      "Toggles the show all and default filters.",
      toggleFilter
    );
    commands.addCommand(
      "Show All Filter",
      "setShowAllFilter",
      "Sets to show all Entries.",
      setShowAllFilter
    );
    commands.addCommand(
      "Show Only Non-System Files/Folders",
      "setDefaultFilter",
      "Sets the default filter of not showing system files/folders.",
      setDefaultFilter
    );
    commands.addCommand(
      "Open in Opposite Panel",
      "openOppositePanel",
      "Set the opposite panel to the directory under the current cursor or the directory of the current cursor.",
      openOppositePanel
    );
    commands.addCommand(
      "Show Preferences",
      "showPreferences",
      "Show the preferences.",
      showPreferences
    );
    commands.addCommand(
      "Reload Extensions",
      "reloadExtensions",
      "Reload the extensions, keyboard maps, and theme.",
      reloadExtensions
    );
  }

  function processKeyFunction(e) {
    //
    // Stop the system for propgating the keystroke.
    //
    e.preventDefault();

    //
    // Send to the processor.
    //
    keyProcessor(e.key, $ctrlKey, $shiftKey, $metaKey);
  }

  function stringKeyProcessor(str) {
    for (var i = 0; i < str.length; i++) {
      if (str[i] >= "A" && str[i] <= "Z") {
        keyProcessor(str[i], false, true, false);
      } else {
        keyProcessor(str[i], false, false, false);
      }
    }
  }

  function reRunLastCommand() {
    stringKeyProcessor(lastCommand);
  }

  function keyProcessor(key, cKey, sKey, mKey) {
    if (key >= 0 && key <= 9) {
      //
      // It is a number prefixing a command. Get the digits for using in the command.
      //
      numberAcc += key;
    } else {
      //
      // Get the command for the current state in the stateMaps.
      //

      const command = getCommand(stateMaps[localState], key, cKey, sKey, mKey);

      //
      // Figure the number of times to run the command.
      //
      var num = parseInt(numberAcc, 10);
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
        console.log(e);
      }
      numberAcc = "";
    }
  }

  function createNewMode(name, color) {
    stateMaps[name] = [];
    localStateMapColors[name] = color;
    stateMapColors.set(localStateMapColors);
  }

  function getCommand(map, key, cKey, sKey, mKey) {
    var result = {
      command: () => {},
      name: "empty",
    };
    var rmap = map.find(
      (item) =>
        item.key == key &&
        item.meta == mKey &&
        item.ctrl == cKey &&
        item.shift == sKey
    );
    if (typeof rmap !== "undefined") {
      result = rmap;
    }
    return result;
  }

  function selectAll() {
    if (localCurrentCursor.pane == "left") {
      leftEntries.forEach((item) => {
        item.selected = true;
      });
      leftEntries = leftEntries;
    } else {
      rightEntries.forEach((item) => {
        item.selected = true;
      });
      rightEntries = rightEntries;
    }
  }

  function unselectAll() {
    if (localCurrentCursor.pane == "left") {
      leftEntries.forEach((item) => {
        item.selected = false;
      });
      leftEntries = leftEntries;
    } else {
      rightEntries.forEach((item) => {
        item.selected = false;
      });
      rightEntries = rightEntries;
    }
  }

  async function quitApp() {
    await window.go.main.App.Quit();
  }

  async function minimizeWindow() {
    await window.runtime.WindowMinimise();
  }

  function setCursor(fname) {
    var index = 0;
    if (localCurrentCursor.pane == "left") {
      index = leftEntries.findIndex((item) => item.name == fname);
      if (index === -1) index = 0;
      currentCursor.set({
        pane: "left",
        entry: leftEntries[index],
      });
      currentLeftFile.set({
        entry: leftEntries[index],
      });
    } else {
      index = rightEntries.findIndex((item) => item.name == fname);
      if (index === -1) index = 0;
      currentCursor.set({
        pane: "right",
        entry: rightEntries[index],
      });
      currentRightFile.set({
        entry: rightEntries[index],
      });
    }
  }

  function moveCursorDown() {
    var index = 0;
    if (localCurrentCursor.pane.includes("left")) {
      if (leftEntries.length !== 0) {
        index = leftEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index < leftEntries.length - 1) {
          index += 1;
        }
        currentCursor.set({
          pane: "left",
          entry: leftEntries[index],
        });
        currentLeftFile.set({
          entry: leftEntries[index],
        });
      }
    } else {
      if (rightEntries.length !== 0) {
        index = rightEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index < rightEntries.length - 1) {
          index += 1;
        }
        currentCursor.set({
          pane: "right",
          entry: rightEntries[index],
        });
        currentRightFile.set({
          entry: rightEntries[index],
        });
      }
    }
  }

  function moveCursorDownWithSelect() {
    var index = 0;
    if (localCurrentCursor.pane.includes("left")) {
      if (leftEntries.length !== 0) {
        index = leftEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index === -1) index = 0;
        var entry = leftEntries[index];
        entry.selected = !entry.selected;
        leftEntries[index] = entry;
        if (index < leftEntries.length - 1) {
          index += 1;
        }
        entry = leftEntries[index];
        currentCursor.set({
          pane: "left",
          entry: entry,
        });
        currentLeftFile.set({
          entry: entry,
        });
      }
    } else {
      if (rightEntries.length !== 0) {
        index = rightEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index === -1) index = 0;
        var entry = rightEntries[index];
        entry.selected = !entry.selected;
        rightEntries[index] = entry;
        if (index < rightEntries.length - 1) {
          index += 1;
        }
        entry = rightEntries[index];
        currentCursor.set({
          pane: "right",
          entry: entry,
        });
        currentRightFile.set({
          entry: entry,
        });
      }
    }
  }

  function moveCursorUp() {
    var index = 0;
    if (localCurrentCursor.pane.includes("left")) {
      if (leftEntries.length !== 0) {
        index = leftEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index > 0) {
          index -= 1;
        }
        if (index === -1) index = 0;
        currentCursor.set({
          pane: "left",
          entry: leftEntries[index],
        });
        currentLeftFile.set({
          entry: leftEntries[index],
        });
      }
    } else {
      if (rightEntries.length !== 0) {
        index = rightEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index > 0) {
          index -= 1;
        }
        if (index === -1) index = 0;
        currentCursor.set({
          pane: "right",
          entry: rightEntries[index],
        });
        currentRightFile.set({
          entry: rightEntries[index],
        });
      }
    }
  }

  function moveCursorUpWithSelect() {
    var index = 0;
    if (localCurrentCursor.pane.includes("left")) {
      if (leftEntries.length !== 0) {
        index = leftEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index === -1) index = 0;
        var entry = leftEntries[index];
        entry.selected = !entry.selected;
        leftEntries[index] = entry;
        if (index > 0) {
          index -= 1;
        }
        entry = leftEntries[index];
        currentCursor.set({
          pane: "left",
          entry: entry,
        });
        currentLeftFile.set({
          entry: entry,
        });
      }
    } else {
      if (rightEntries.length !== 0) {
        index = rightEntries.findIndex(
          (item) => item.name == localCurrentCursor.entry.name
        );
        if (index === -1) index = 0;
        var entry = rightEntries[index];
        entry.selected = !entry.selected;
        rightEntries[index] = entry;
        if (index > 0) {
          index -= 1;
        }
        entry = rightEntries[index];
        currentCursor.set({
          pane: "right",
          entry: entry,
        });
        currentRightFile.set({
          entry: entry,
        });
      }
    }
  }

  function changeMode(newMode) {
    inputState.set(newMode);
    localState = newMode;
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
    var nEntry = localCurrentCursor.entry.dir;
    if (localCurrentCursor.entry.type === 1) {
      nEntry = await localCurrentCursor.entry.fileSystem.appendPath(
        localCurrentCursor.entry.dir,
        localCurrentCursor.entry.name
      );
    }
    if (localCurrentCursor.pane === "right") {
      changeDir(
        {
          path: nEntry,
          cursor: true,
        },
        "left",
        ""
      );
    } else {
      changeDir(
        {
          path: nEntry,
          cursor: true,
        },
        "right",
        ""
      );
    }
  }

  async function goHome() {
    var entry = await OS.getHomeDir();
    if (localCurrentCursor.pane === "right") {
      changeDir(
        {
          path: entry,
          cursor: true,
        },
        "right",
        ""
      );
    } else {
      changeDir(
        {
          path: entry,
          cursor: true,
        },
        "left",
        ""
      );
    }
  }

  function cursorToPane(npane) {
    if (npane == "right") {
      currentCursor.set({
        pane: "right",
        entry: localCurrentRightFile.entry,
      });
    } else {
      currentCursor.set({
        pane: "left",
        entry: localCurrentLeftFile.entry,
      });
    }
  }

  function cursorToNextPane() {
    if (localCurrentCursor.pane == "left") {
      currentCursor.set({
        pane: "right",
        entry: localCurrentRightFile.entry,
      });
    } else {
      currentCursor.set({
        pane: "left",
        entry: localCurrentLeftFile.entry,
      });
    }
  }

  function mouseMove(e) {
    if (mdown) {
      leftDOM.style.width = e.clientX + "px";
      rightDOM.style.width = containerDOM.clientWidth - (e.clientX + 10) + "px";
    }
  }

  function reloadPane() {
    changeDir(
      {
        path: localCurrentCursor.entry.dir,
        cursor: true,
      },
      localCurrentCursor.pane,
      localCurrentCursor.entry.name
    );
  }

  async function changeDir(dirOb, npane, name) {
    var ndir = dirOb.path;
    if (typeof npane === "undefined") npane = localCurrentCursor.pane;
    if (typeof dirOb.cursor === "undefined") dirOb.cursor = true;
    if (typeof name === "undefined") name = "";
    if (npane == "left") {
      leftDir.set({
        path: ndir,
        fileSystemType: localLeftDir.fileSystemType,
        fileSystem: localLeftDir.fileSystem,
      });
      leftEntries = await localLeftDir.fileSystem.getDirList(ndir);
      if (leftEntries.length !== 0) {
        var entry = leftEntries.filter((item) => item.name === name);
        if (entry.length !== 0) {
          currentLeftFile.set({
            entry: entry[0],
            pane: npane,
          });
          currentCursor.set({
            entry: entry[0],
            pane: npane,
          });
        } else {
          currentLeftFile.set({ entry: leftEntries[0], pane: npane });
          currentCursor.set({ entry: leftEntries[0], pane: npane });
        }
      } else {
        currentLeftFile.set({
          entry: {
            name: "",
            size: "",
            type: localLeftDir.fileSystemType,
            fileSystem: localLeftDir.fileSystem,
            dir: ndir,
            datetime: "",
            selected: false,
          },
        });
        if (dirOb.cursor) {
          currentCursor.set({
            entry: {
              name: "",
              size: "",
              type: localLeftDir.fileSystemType,
              fileSystem: localLeftDir.fileSystem,
              dir: ndir,
              datetime: "",
              selected: false,
            },
            pane: npane,
          });
        }
      }
    } else {
      rightDir.set({
        path: ndir,
        fileSystemType: localRightDir.fileSystemType,
        fileSystem: localRightDir.fileSystem,
      });
      rightEntries = await localRightDir.fileSystem.getDirList(ndir);
      if (rightEntries.length !== 0) {
        var entry = rightEntries.filter((item) => item.name === name);
        if (entry.length !== 0) {
          currentRightFile.set({
            entry: entry[0],
            pane: npane,
          });
          currentCursor.set({
            entry: entry[0],
            pane: npane,
          });
        } else {
          currentRightFile.set({ entry: rightEntries[0], pane: npane });
          currentCursor.set({ entry: rightEntries[0], pane: npane });
        }
      } else {
        currentRightFile.set({
          entry: {
            name: "",
            size: "",
            type: localRightDir.fileSystemType,
            fileSystem: localRightDir.fileSystem,
            dir: ndir,
            datetime: "",
            selected: false,
          },
        });
        if (dirOb.cursor) {
          currentCursor.set({
            entry: {
              name: "",
              size: "",
              type: localRightDir.fileSystemType,
              fileSystem: localRightDir.fileSystem,
              dir: ndir,
              datetime: "",
              selected: false,
            },
            pane: npane,
          });
        }
      }
    }
  }

  async function openFile(entry) {
    await entry.fileSystem.openFile(entry.dir, entry.name);
  }

  async function actionEntry() {
    if (localCurrentCursor.entry.type === 0) {
      //
      // It is a file. Open it.
      //
      openFile(localCurrentCursor.entry);
    } else {
      //
      // It is a directory. Go down a level.
      //
      var ndir = await localCurrentCursor.entry.fileSystem.appendPath(
        localCurrentCursor.entry.dir,
        localCurrentCursor.entry.name
      );
      changeDir(
        {
          path: ndir,
          cursor: true,
        },
        localCurrentCursor.pane,
        ""
      );
    }
  }

  function goUpDir() {
    var sep = localCurrentCursor.entry.fileSystem.sep;
    var parts = localCurrentCursor.entry.dir.split(sep);
    if (parts.length > 0) {
      var newDir = parts.slice(0, parts.length - 1).join(sep);
      if (newDir == "") newDir = sep;
      changeDir(
        {
          path: newDir,
          cursor: true,
        },
        localCurrentCursor.pane,
        parts[parts.length - 1]
      );
      setCursor(parts[parts.length - 1]);
    }
  }

  async function goDownDir() {
    if (localCurrentCursor.entry.type === 1) {
      var newDir = await localCurrentCursor.entry.fileSystem.appendPath(
        localCurrentCursor.entry.dir,
        localCurrentCursor.entry.name
      );
      changeDir(
        {
          path: newDir,
          cursor: true,
        },
        localCurrentCursor.pane,
        ""
      );
    }
  }

  function goBottomFile() {
    if (localCurrentCursor.pane == "left") {
      if (leftEntries.length !== 0) {
        const last = leftEntries[leftEntries.length - 1];
        setCursor(last.name);
      }
    } else {
      if (rightEntries.length !== 0) {
        const last = rightEntries[rightEntries.length - 1];
        setCursor(last.name);
      }
    }
  }

  function goTopFile() {
    if (localCurrentCursor.pane == "left") {
      if (leftEntries.length !== 0) {
        var top = leftEntries[0];
        setCursor(top.name);
      }
    } else {
      if (rightEntries.length !== 0) {
        var top = rightEntries[0];
        setCursor(top.name);
      }
    }
  }

  function getCurrentFile() {
    return localCurrentCursor.entry;
  }

  function getCurrentPane() {
    return localCurrentCursor.pane;
  }

  function getLastError() {
    return lastError;
  }

  function deleteEntries() {
    var entries = getSelectedFiles();
    if (entries.length === 0) {
      //
      // Get the entry at the current cursor
      //
      entries.push(localCurrentCursor.entry);
      localCurrentCursor.entry = null;
    }
    deleteEntriesCommand(entries);
  }

  async function deleteEntriesCommand(entries) {
    msgBoxConfig = {
      title: "Deleting Entries",
      noShowButton: true,
    };
    msgBoxItems = [];
    msgBoxItems.push({
      type: "label",
      name: "msgboxMain",
      for: "progress1",
      text: "Deleting " + entries.length + " Entries...",
    });
    msgBoxItems.push({
      type: "spinner",
      name: "progress1",
      value: 1,
    });
    msgBoxItems = msgBoxItems;
    msgCallBack = (e) => {
      showMessageBox = false;
    };
    addSpinner("progress1", 1);

    //
    // It is all set up. Show the message box.
    //
    showMessageBox = true;

    for (var i = 0; i < entries.length; i++) {
      await entries[i].fileSystem.deleteEntries(entries[i], (err, stdout) => {
        if (err) {
          //
          // There was an error in deleting.
          //
          console.log(err);
        }
        if (i >= entries.length - 1) {
          showMessageBox = false;
          $keyProcess = true;

          //
          // Refresh the side deleted from.
          //
          if (localCurrentCursor.pane === "left") {
            refreshLeftPane();
          } else {
            refreshRightPane();
          }

          //
          // Remove the spinner from being checked.
          //
          removeSpinner("progress1");
        }
      });
      updateSpinner("progress1", ((i + 1) / entries.length) * 100);
    }
  }

  function copyEntries() {
    var entries = getSelectedFiles();
    var sel = true;
    if (entries.length === 0) {
      //
      // Get the entry at the current cursor
      //
      entries.push(localCurrentCursor.entry);
      sel = false;
    }
    var otherPane =
      localCurrentCursor.pane === "left"
        ? { ...localCurrentRightFile.entry }
        : { ...localCurrentLeftFile.entry };
    copyEntriesCommand(entries, otherPane, sel);
  }

  async function copyEntriesCommand(entries, otherPane, sel) {
    msgBoxConfig = {
      title: "Copying Entries",
      noShowButton: true,
    };
    msgBoxItems = [];
    msgBoxItems.push({
      type: "label",
      name: "msgboxMain",
      for: "progress1",
      text: "Copying " + entries.length + " Entries...",
    });
    msgBoxItems.push({
      type: "spinner",
      name: "progress1",
      value: 1,
    });
    msgBoxItems = msgBoxItems;
    msgCallBack = (e) => {
      showMessageBox = false;
    };
    addSpinner("progress1", 1);

    //
    // It is all set up. Show the message box.
    //
    showMessageBox = true;

    for (var i = 0; i < entries.length; i++) {
      await entries[i].fileSystem.copyEntries(
        entries[i],
        otherPane,
        (err, stdout) => {
          if (i == entries.length - 1) {
            showMessageBox = false;
            $keyProcess = true;

            //
            // Refresh the side copied to.
            //
            if (localCurrentCursor.pane === "left") {
              refreshRightPane();
            } else {
              refreshLeftPane();
            }

            //
            // clear out the selections.
            //
            if (sel) clearSelectedFiles();

            //
            // Remove the spinner from being checked.
            //
            removeSpinner("progress1");
          }
        }
      );
      updateSpinner("progress1", ((i + 1) / entries.length) * 100);
    }
  }

  function swapPanels() {
    var npane = localCurrentCursor.pane === "left" ? "right" : "left";
    tmp = localCurrentLeftFile;
    currentLeftFile.set(localCurrentRightFile);
    currentRightFile.set(tmp);
    tmp = localLeftDir;
    leftDir.set(localRightDir);
    rightDir.set(tmp);
    var tmp = rightEntries;
    rightEntries = leftEntries;
    leftEntries = tmp;
    tick();
    cursorToPane(npane);
  }

  function editEntry() {
    editEntryCommand(localCurrentCursor.entry);
  }

  async function editEntryCommand(entry) {
    if (await OS.fileExists(userEditor)) {
      //
      // There is an editor defined by the user. Use it.
      //
      var file = entry;
      if (typeof entry.dir !== "undefined") {
        file = await OS.appendPath(entry.dir, entry.name);
      }
      var editor = await OS.readFile(userEditor);
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
            "."
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
    var newName = "";
    if (localCurrentCursor.entry.name[0] === ".") {
      newName = localCurrentCursor.entry.name + "-copy";
    } else {
      newName = localCurrentCursor.entry.name.split(".");
      if (newName.length >= 2) {
        newName[newName.length - 2] = newName[newName.length - 2] + "-copy";
        newName = newName.join(".");
      } else {
        newName = localCurrentCursor.entry.name + "-copy";
      }
    }
    var nEntry = { ...localCurrentCursor.entry };
    nEntry.name = newName;
    await localCurrentCursor.entry.fileSystem.copyEntries(
      localCurrentCursor.entry,
      nEntry
    );
    //
    // Refresh the file list.
    //
    if (localCurrentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }
  }

  function moveEntries() {
    var entries = getSelectedFiles();
    if (entries.length === 0) {
      //
      // Get the entry at the current cursor
      //
      entries.push(localCurrentCursor.entry);
    }
    var otherPane =
      localCurrentCursor.pane === "left"
        ? localCurrentRightFile.entry
        : localCurrentLeftFile.entry;
    moveEntriesCommand(entries, otherPane);
  }

  async function moveEntriesCommand(entries, otherPane) {
    msgBoxConfig = {
      title: "Moving Entries",
      noShowButton: true,
    };
    msgBoxItems = [];
    msgBoxItems.push({
      type: "label",
      name: "msgboxMain",
      for: "progress1",
      text: "Moving " + entries.length + " Entries...",
    });
    msgBoxItems.push({
      type: "spinner",
      name: "progress1",
      value: 1,
    });
    msgBoxItems = msgBoxItems;
    msgCallBack = (e) => {
      showMessageBox = false;
    };
    addSpinner("progress1", 1);

    //
    // It is all set up. Show the message box.
    //
    showMessageBox = true;

    for (var i = 0; i < entries.length; i++) {
      await entries[i].fileSystem.moveEntries(
        entries[i],
        otherPane,
        (err, stdout) => {
          if (i >= entries.length - 1) {
            showMessageBox = false;
            $keyProcess = true;

            //
            // Refresh both sides.
            //
            refreshPanes();

            //
            // Remove the spinner from being checked.
            //
            removeSpinner("progress1");
          }
        }
      );
      updateSpinner("progress1", ((i + 1) / entries.length) * 100);
    }
  }

  async function refreshRightPane() {
    //
    // Refresh right pane.
    //
    rightEntries = await localRightDir.fileSystem.getDirList(
      localRightDir.path
    );
    var current = currentRightFile.entry;
    if (rightEntries.length == 0) {
      current = {
        name: "",
        dir: localRightDir.path,
        fileSystemType: localRightDir.fileSystemType,
        fileSystem: localRightDir.fileSystem,
        selected: false,
        datetime: "",
        type: 0,
        size: 0,
        stats: null,
      };
    } else {
      if (
        typeof current === "undefined" ||
        current === null ||
        rightEntries.filter((item) => item.name === current.name).length === 0
      ) {
        current = rightEntries[0];
      }
    }
    if (localCurrentCursor.pane == "right") {
      currentCursor.set({
        entry: current,
        pane: "right",
      });
    }
    currentRightFile.set({
      entry: current,
    });
  }

  async function refreshLeftPane() {
    //
    // Refresh left pane.
    //
    leftEntries = await localLeftDir.fileSystem.getDirList(localLeftDir.path);
    var current = currentLeftFile.entry;
    if (leftEntries.length === 0) {
      current = {
        name: "",
        dir: localLeftDir.path,
        fileSystemType: localLeftDir.fileSystemType,
        fileSystem: localLeftDir.fileSystem,
        selected: false,
        datetime: "",
        type: 0,
        size: 0,
        stats: null,
      };
    } else {
      if (
        typeof current === "undefined" ||
        current === null ||
        leftEntries.filter((item) => item.name === current.name).length === 0
      ) {
        current = leftEntries[0];
      }
    }

    if (localCurrentCursor.pane == "left") {
      currentCursor.set({
        entry: current,
        pane: "left",
      });
    }
    currentLeftFile.set({
      entry: current,
    });
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
    msgCallBack = (e) => {};
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
        value: items[0].value,
        id: "msgboxMain",
        extra: extra,
      },
    ];
    msgCallBack = (e) => {
      returnValue(e[0].value);
      msgCallBack = (e) => {};
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
      returnValue(e[0].value);
      msgCallBack = (e) => {};
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
    msgCallBack = (e) => {};
    var nfname = data[0].value;

    //
    // Create the new file.
    //
    var nfile = { ...localCurrentCursor.entry };
    nfile.name = nfname;
    await localCurrentCursor.entry.fileSystem.createFile(nfile);

    //
    // Refresh the file list.
    //
    if (localCurrentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }

    //
    // Set the new file as the cursor point.
    //
    setCursor(nfname);
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
    msgCallBack = (e) => {};
    var ndname = data[0].value;

    //
    // Create the new file.
    //
    var ndir = { ...localCurrentCursor.entry };
    ndir.name = ndname;
    await localCurrentCursor.entry.fileSystem.createDir(ndir);

    //
    // Refresh the file list.
    //
    if (localCurrentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }

    //
    // Set the new file as the cursor point.
    //
    setCursor(ndname);
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
        value: localCurrentCursor.entry.name,
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
    msgCallBack = (e) => {};
    var nname = data[0].value;

    //
    // Create the new file.
    //
    var nentry = { ...localCurrentCursor.entry };
    nentry.name = nname;
    await localCurrentCursor.entry.fileSystem.renameEntry(
      localCurrentCursor.entry,
      nentry
    );

    //
    // Refresh the file list.
    //
    if (localCurrentCursor.pane === "left") {
      refreshLeftPane();
    } else {
      refreshRightPane();
    }

    //
    // Set the new file as the cursor point.
    //
    setCursor(nname);
  }

  function clearSelectedFiles() {
    if (localCurrentCursor.pane == "left") {
      //
      // Clear the left pane's selected files
      //
      leftEntries = leftEntries.map((item) => {
        item.selected = false;
        return item;
      });
    } else {
      //
      // Clear the right panes selected files
      //
      rightEntries = rightEntries.map((item) => {
        item.selected = false;
        return item;
      });
    }
  }

  function getSelectedFiles() {
    var selected = [];
    if (localCurrentCursor.pane == "left") {
      //
      // Get the left pane's selected files
      //
      selected = leftEntries.filter((item) => item.selected === true);
    } else {
      //
      // Get the right panes selected files
      //
      selected = rightEntries.filter((item) => item.selected === true);
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
      leftEntries = e.detail.entries;
    } else {
      rightEntries = e.detail.entries;
    }
    if (localCurrentCursor.pane == "left") {
      currentCursor.set({
        entry: leftEntries[0],
        pane: "left",
      });
      currentLeftFile.set({
        entry: leftEntries[0],
      });
    } else {
      currentCursor.set({
        entry: rightEntries[0],
        pane: "right",
      });
      currentRightFile.set({
        entry: rightEntries[0],
      });
    }
  }

  function getCursor() {
    return localCurrentCursor;
  }

  function getLeftFile() {
    return localCurrentLeftFile;
  }

  function getRightFile() {
    return localCurrentRightFile;
  }

  function editDirLoc() {
    if (localCurrentCursor.pane === "left") {
      setEditDirFlagLeft = true;
    } else {
      setEditDirFlagRight = true;
    }
  }

  function toggleExtraPanel() {
    showExtra = !showExtra;
  }

  function addKeyboardShort(keyboard, ctrl, shift, meta, key, cmd) {
    stateMaps[keyboard].push({
      ctrl: ctrl,
      shift: shift,
      meta: meta,
      key: key,
      command: cmd,
    });
  }

  function setTheme(thm) {
    theme.set(thm);
  }

  function getTheme() {
    return localTheme;
  }

  function addDirectoryListener(listener) {
    var dl = get(directoryListeners);
    dl.push(listener);
    directoryListeners.set(dl);
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

  function selectRegExp() {
    pickItem(
      "Select Regular Expressions",
      selRegExpHist,
      runRegExpHistSelection
    );
  }

  function runRegExpHistSelection(value) {
    saveRegExpSelectHistory(value.value);
    var selRegExp = new RegExp(value.value);
    if (localCurrentCursor.pane === "left") {
      leftEntries.map((item) => {
        if (item.name.match(selRegExp) !== null) {
          item.selected = true;
        }
      });
      leftEntries = leftEntries;
    } else {
      rightEntries.map((item) => {
        if (item.name.match(selRegExp) !== null) {
          item.selected = true;
        }
      });
      rightEntries = rightEntries;
    }
  }

  function saveRegExpSelectHistory(value) {
    //
    // Save to disk, removing redundant items, etc. needs implemented.
    //
    selRegExpHist.push(value);
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
        key: ":",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: true,
        key: "m",
        command: "minimizeWindow",
      },
      {
        ctrl: false,
        shift: false,
        meta: true,
        key: "q",
        command: "quitApp",
      },
      {
        ctrl: true,
        shift: false,
        meta: false,
        key: "p",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "s",
        command: "toggleExtraPanel",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "q",
        command: "editDirLoc",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "r",
        command: "reloadPane",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "p",
        command: "swapPanels",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "d",
        command: "duplicateEntry",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "e",
        command: "editEntry",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "m",
        command: "moveEntries",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "c",
        command: "copyEntries",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "x",
        command: "deleteEntries",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "g",
        command: "goTopFile",
      },
      {
        ctrl: false,
        shift: true,
        meta: false,
        key: "G",
        command: "goBottomFile",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "ArrowDown",
        command: "moveCursorDown",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "ArrowUp",
        command: "moveCursorUp",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "l",
        command: "goDownDir",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "h",
        command: "goUpDir",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "Enter",
        command: "actionEntry",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "Tab",
        command: "cursorToNextPane",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "k",
        command: "moveCursorUp",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "j",
        command: "moveCursorDown",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "i",
        command: "changeModeInsert",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "v",
        command: "changeModeVisual",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "/",
        command: "toggleQuickSearch",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: ".",
        command: "reRunLastCommand",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: ",",
        command: "toggleFilter",
      },
      {
        ctrl: false,
        shift: true,
        meta: false,
        key: "O",
        command: "openOppositePanel",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
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
        key: ":",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "k",
        command: "moveCursorUpWithSelect",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "j",
        command: "moveCursorDownWithSelect",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "a",
        command: "selectAll",
      },
      {
        ctrl: false,
        shift: true,
        meta: false,
        key: "A",
        command: "unselectAll",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "ArrowDown",
        command: "moveCursorDown",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "ArrowUp",
        command: "moveCursorUp",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "Escape",
        command: "changeModeNormal",
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
        key: ":",
        command: "toggleCommandPrompt",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "Escape",
        command: "changeModeNormal",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "d",
        command: "newDirectory",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
        key: "f",
        command: "newFile",
      },
      {
        ctrl: false,
        shift: false,
        meta: false,
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
    var keyMapDir = { ...localCurrentCursor.entry };
    keyMapDir.dir = configDir;
    keyMapDir.name = "keyMaps";

    if (!(await OS.dirExists(keyMapDir))) {
      createDefaultNormalMap(keyMapDir);
      createDefaultVisualMap(keyMapDir);
      createDefaultInsertMap(keyMapDir);
    } else {
      //
      // The keymap directory is there. let's load the files.
      //
      var fileLoc = await OS.appendPath(keyMapDir, "normalKeyMap.json");
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
      var cmd = commands.getCommand(item.command);
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
    return localRightDir;
  }

  function setRightDir(path) {
    $rightDir.path = path;
    refreshRightPane();
  }

  function getLeftDir() {
    return localLeftDir;
  }

  function setLeftDir(path) {
    $leftDir.path = path;
    refreshLeftPane();
  }

  function addExtraPanelProcessor(panelProc) {
    var lextraPanel = get(extraPanel);
    lextraPanel.push(panelProc);
    extraPanel.set(lextraPanel);
  }

  async function addWatcher(path, wtype, signame, sigFunction) {
    await window.go.main.App.AddWatcher(path, wtype, signame);
    window.runtime.EventsOn(signame, sigFunction);
  }
  async function removeWatcher(path, wtype, signame) {
    await window.go.main.App.RemoveWatcher(path, wtype, signame);
    window.runtime.EventsOff(signame);
  }
</script>

<div
  id="container"
  style="background-color: {$theme.backgroundColor};
         color: {$theme.textColor};
         font-family: {$theme.font};
         font-size: {$theme.fontSize};
         height: {mid}px;"
  on:mousemove={mouseMove}
  on:mouseup={() => {
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
    <QuickSearch
      {leftDOM}
      {rightDOM}
      {leftEntries}
      {rightEntries}
      on:changeEntries={qsChangeEntries}
      on:closeQuickSearch={(e) => {
        showQuickSearch = false;
        $keyProcess = true;
        if (e.detail.skip) $skipKey = true;
      }}
    />
  {/if}

  <div id="leftSide" bind:this={leftDOM}>
    {#if localCurrentCursor.pane === "right" && showExtra}
      <ExtraPanel side="left" />
    {:else}
      <DirectoryListing
        path={localLeftDir}
        edit={setEditDirFlagLeft}
        side="left"
        on:dirChange={(e) => {
          changeDir(e.detail, "left", "");
          setEditDirFlagLeft = false;
        }}
        on:updateDir={() => {
          refreshLeftPane();
        }}
      />
      <Pane
        pane="left"
        entries={leftEntries}
        utilities={localLeftDir.fileSystem}
        on:changeDir={(e) => {
          changeDir(e.detail.dir, e.detail.pane, "");
        }}
        on:openFile={(e) => {
          openFile(e.detail.entry);
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
    {#if localCurrentCursor.pane === "left" && showExtra}
      <ExtraPanel side="right" />
    {:else}
      <DirectoryListing
        path={localRightDir}
        edit={setEditDirFlagRight}
        side="right"
        on:dirChange={(e) => {
          changeDir(e.detail, "right", "");
          setEditDirFlagRight = false;
        }}
        on:updateDir={() => {
          refreshRightPane();
        }}
      />
      <Pane
        pane="right"
        entries={rightEntries}
        utilities={localRightDir.fileSystem}
        on:changeDir={(e) => {
          changeDir(e.detail.dir, e.detail.pane, "");
        }}
        on:openFile={(e) => {
          openFile(e.detail.entry);
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
