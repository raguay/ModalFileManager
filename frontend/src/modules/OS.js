//
// File:          OS.js
//
// Description:   This file contains all low level
//                functions that would be OS dependent. Now, most OS
//                dependent items have been moved to go main program.
//
import * as App from "../../dist/wailsjs/go/main/App.js";

let OS = {
  dirFirst: true,
  sortFunction: null,
  filterFunction: null,
  lastError: "",
  lastOutput: "",
  config: null,
  type: null,
  rootDir: "/",
  path: "/",
  sep: "/",
  shell: null,
  localHomeDir: null,
  localConfigDir: null,
  openCommand: "open",
  setConfig: function (cfg) {
    this.config = cfg;
  },
  getExtension: async function (file) {
    let ext = "";
    let match = file.match(/\.(.*)$/);
    if (match !== null) {
      ext = match[1];
    }
    return ext;
  },
  getConfigDir: async function () {
    if (this.localConfigDir === null) {
      if (this.localHomeDir === null) {
        this.localHom;
      }
      this.localConfigDir = await this.appendPath(
        this.localHomeDir,
        ".config/modalfilemanager",
      );
    }
    return this.localConfigDir;
  },
  terminalScript: "bin/openTerminal.scpt",
  init: async function () {
    //
    // Set the defaults
    //
    this.sortFunction = this.alphaSort;
    this.filterFunction = this.defaultFilter;

    //
    // Initialize OS specific items.
    //
    this.localHomeDir = await this.getHomeDir();
    this.type = await this.getOSname();
    switch (this.type) {
      case "macos": {
        this.sep = "/";
        this.rootDir = "";
        this.openCommand = "open";
        this.shell = "zsh";
        break;
      }
      case "linux": {
        this.sep = "/";
        this.rootDir = "";
        this.openCommand = "xdg-open";
        this.shell = "bash";
        break;
      }
      case "windows": {
        this.sep = "\\";
        this.rootDir = "C:";
        this.openCommand = "start";
        this.shell = "cmd.exe";
        break;
      }
      default: {
        this.sep = "/";
        this.rootDir = "";
        break;
      }
    }
  },
  getOSname: async function () {
    if (this.type === null) {
      this.type = App.GetOSName();
    }
    return this.type;
  },
  getDirFirst: function () {
    return this.dirFirst;
  },
  setDirFirst: function (flag) {
    if (typeof flag === "boolean") {
      this.dirFirst = flag;
    }
  },
  setDirSort: function (sortFunction) {
    this.sortFunction = sortFunction;
  },
  setFilter: function (flt) {
    this.filterFunction = flt;
  },
  getTerminalScript: async function () {
    let tsFile = this.terminalScript;
    if (this.terminalScript.startsWith(this.rootDir)) {
      tsFile = await this.appendPath(this.localHomeDir, this.terminalScript);
    }
    return tsFile;
  },
  setTerminalScript: function (scrpt) {
    this.terminalScript = scrpt;
  },
  getHomeDir: async function () {
    if (this.localHomeDir === null) {
      this.localHomeDir = await App.GetHomeDir();
      this.localHomeDir = new String(this.localHomeDir).toString();
    }
    return this.localHomeDir;
  },
  readDir: async function (dir) {
    if (typeof dir !== "string") {
      dir = await this.appendPath(dir.dir, dir.name);
    }
    //
    // Get the directory information
    //
    let result = await App.ReadDir(dir);
    return result;
  },
  normalize: async function (dir) {
    if (dir[0] === "~") {
      let hd = await this.getHomeDir();
      dir = await this.appendPath(hd, dir.slice(1, dir.length));
    }
    return dir;
  },
  dirExists: async function (dir) {
    if (typeof dir !== "string") {
      dir = await this.appendPath(dir.dir, dir.name);
    }
    let dirReal = await App.DirExists(dir);
    return dirReal;
  },
  fileExists: async function (file) {
    let result = true;
    if (typeof file !== "string") {
      file = await this.appendPath(file.dir, file.name);
    }
    result = App.FileExists(file);
    return result;
  },
  makeDir: async function (dir) {
    if (typeof dir !== "string") {
      dir = await this.appendPath(dir.dir, dir.name);
    }
    //
    // Make a directory.
    //
    await App.MakeDir(dir);
  },
  moveEntries: async function (from, to, callback) {
    let fromName;
    let toName;

    //
    // It can receive an object or string. Check to see which it is
    // to get the proper path.
    //
    if (typeof from !== "string") {
      fromName = await this.appendPath(from.dir, from.name);
    } else {
      fromName = from;
    }
    if (typeof to !== "string") {
      toName = to.dir;
    } else {
      toName = to;
    }

    const parts = fromName.split(this.sep);
    toName = await this.appendPath(toName, parts[parts.length - 1]);

    //
    // Move the entries.
    //
    await App.MoveEntries(fromName, toName);
    let err = await App.GetError();

    //
    // Run the callback if given.
    //
    if (typeof callback !== "undefined") {
      callback(err);
    }
  },
  copyEntries: async function (from, to, callback) {
    let fromName;
    let toName;

    //
    // It can receive an object or string. Check to see which it is
    // to get the proper path.
    //
    if (typeof from !== "string") {
      fromName = await this.appendPath(from.dir, from.name);
    } else {
      fromName = from;
    }
    if (typeof to !== "string") {
      toName = await this.appendPath(to.dir, to.name);
    } else {
      toName = to;
    }
    const isDir = await this.dirExists(toName);
    if (isDir) {
      const parts = fromName.split(this.sep);
      toName = await this.appendPath(toName, parts[parts.length - 1]);
    }

    //
    // Copy the entries.
    //
    await App.CopyEntries(fromName, toName);
    let err = await App.GetError();

    //
    // Run the callback if given.
    //
    if (typeof callback !== "undefined") {
      callback(err);
    }
  },
  deleteEntries: async function (entry, callback) {
    let item = entry;
    if (typeof entry !== "string") {
      item = await this.appendPath(entry.dir, entry.name);
    }
    let that = this;
    if (this.config !== null) {
      if (this.config.useTrash) {
        //
        // Use the trashcan on the system.
        //
        if (typeof callback === "undefined") {
          this.runCommandLine(
            `trash '${item}'`,
            [],
            (err, stdout) => {
              if (err) {
                that.lastError = err;
              }
              that.lastOutput = stdout;
            },
            ".",
          );
        } else {
          this.runCommandLine(`trash '${item}'`, [], callback, ".");
        }
      } else {
        //
        // Delete the item completely.
        //
        await App.DeleteEntries(item);
        let err = await App.GetError();

        if (typeof callback !== "undefined") {
          callback(err);
        }
      }
    }
  },
  getDirList: async function (dir) {
    //
    // A directory list is provided giving an array of entry object. Each
    // entry object has:
    //    name    The name of the file
    //    type    The type of the entry: a file - 0, a directory - 1, a link - 2
    //    fileSystem  The current file system object
    //    dir     The directory of the file
    //    datetime  The creation datetime of the file
    //    size    The integer size of the file in 1kb (Directories and links have zero size)
    //    selected Boolean true is selected, false is not selected
    //
    let entries = [];
    if (typeof dir !== "string") {
      if (typeof dir.dir !== "undefined" && typeof dir.name !== "undefined") {
        dir = await this.appendPath(dir.dir, dir.name);
      }
    }
    dir = await this.normalize(dir);
    if (await this.dirExists(dir)) {
      //
      // read directory
      //
      let items = await this.readDir(dir);
      for (let i = 0; i < items.length; i++) {
        if (typeof items[i] !== "undefined") {
          let newEntry;
          newEntry = {
            name: items[i].Name,
            dir: items[i].Dir,
            ext: items[i].Extension,
            fileSystemType: "macOS",
            fileSystem: this,
            selected: false,
            datetime: items[i].Modtime,
            type: items[i].IsDir ? 1 : 0,
            size: items[i].Size,
            mode: items[i].Mode,
            link: items[i].Link ? 1 : 0,
          };
          entries.push(newEntry);
        }
      }

      //
      // filter out the entries.
      //
      entries = entries.filter(this.filterFunction);

      //
      // Sort the entries.
      //
      if (this.dirFirst) {
        let dirEntries = entries.filter((item) => item.type === 1);
        let fileEntries = entries.filter((item) => item.type === 0);
        dirEntries.sort(this.sortFunction);
        fileEntries.sort(this.sortFunction);
        entries = [...dirEntries, ...fileEntries];
      } else {
        entries.sort(this.sortFunction);
      }
    }
    //
    // Return the result.
    //
    return entries;
  },
  defaultFilter: function (item) {
    return item.name[0] !== "." && !item.name.includes("Icon");
  },
  allFilter: function (item) {
    //
    // Still, don't show the Icon and DS_Store files on macOS.
    //
    return !item.name.includes("Icon") && !item.name.includes(".DS_Store");
  },
  alphaSort: function (item1, item2) {
    const a = item1.name.toLowerCase();
    const b = item2.name.toLowerCase();
    return a === b ? 0 : a > b ? 1 : -1;
  },
  openFile: async function (pdir, file) {
    //
    // For macOS, open with the open command line command.
    //
    this.runCommandLine(`${this.openCommand} '${pdir}/${file}'`);
  },
  openFileWithProgram: async function (prog, file) {
    //
    // For macOS, open with the open command line command.
    //
    this.runCommandLine(`${this.openCommand} -a ${prog} '${file}'`);
  },
  openInTerminal: async function (prog, file) {
    //
    // Run the terminal Script.
    //
    if (this.type === "macos") {
      this.runCommandLine(
        `osascript '${this.terminalScript}' '${prog}' '${file}'`,
        (err, stdout) => {},
        ".",
      );
    } else {
      //
      // TODO: Not sure?
      //
    }
  },
  getConfig: async function () {
    if (this.config === null) {
      //
      // Create the minimum config and then add to the path as needed. The path from process
      // will not contain everything the user would have in his shell.
      //
      this.config = {
        env: null,
        shell: "",
        useTrash: true,
        maxSearchDepth: 100,
      };

      //
      // Copy the environment from the process. Get the environment.
      //
      let env = await App.GetEnvironment();
      let newEnv = {};
      env.map((item) => {
        let parts = item.split("=");
        newEnv[parts[0]] = parts[1];
      });
      this.config.env = newEnv;

      //
      // Add directories that the user's system should have.
      //
      if (this.local) {
        if (await this.dirExists(`${this.localHomeDir}/bin`)) {
          this.config.env.PATH =
            `${this.localHomeDir}/bin:${this.config.env.PATH}`;
        }
      }
      if (await this.dirExists("/opt/homebrew/bin")) {
        this.config.env.PATH = `/opt/homebrew/bin:${this.config.env.PATH}`;
      }
      if (await this.dirExists("/usr/local/bin")) {
        this.config.env.PATH = `/usr/local/bin:${this.config.env.PATH}`;
      }
      if (await this.dirExists(`${this.localHomeDir}/.cargo/bin`)) {
        this.config.env.PATH += `:${this.localHomeDir}/.cargo/bin`;
      }
      if (await this.dirExists(`${this.localHomeDir}/go/bin`)) {
        this.config.env.PATH += `:${this.localHomeDir}/go/bin`;
      }

      //
      // Set the defaults for everything else.
      //
      this.config.shell = this.config.env.SHELL;
      this.config.useTrash = true;
    }
    return this.config;
  },
  runCommandLine: async function (line, rEnv, callback, dir) {
    //
    // Get the environment to use.
    //
    let cnfg = await this.getConfig();
    let nEnv = { ...cnfg.env };
    if (typeof rEnv !== "undefined") {
      nEnv = { ...nEnv, ...rEnv };
    }

    //
    // Fix the environment from a map to an array of strings.
    //
    let penv = [];
    for (const key in nEnv) {
      penv.push(`${key}=${nEnv[key]}`);
    }

    //
    // Make sure dir has a value.
    //
    if (typeof dir === "undefined") dir = ".";

    //
    // Run the command line in a shell. #TODO make the shell configurable.
    //
    let args = [this.shell, "-c", line];
    let cmd = this.shell;

    //
    // Run the command line.
    //
    let result = await App.RunCommandLine(cmd, args, penv, dir);
    let err = await App.GetError();

    //
    // If callback is given, call it with the results.
    //
    if (typeof callback !== "undefined") {
      callback(err, result);
    }
  },
  appendPath: async function (dir, name) {
    // dir can be an entry or a path string. name is always a string.
    //
    let path = dir;
    if (typeof dir !== "string") {
      let tmpdir = await App.appendPath(dir.dir, dir.name);
      path = await App.AppendPath(tmpdir, name);
    } else {
      path = await App.AppendPath(dir, name);
    }
    return path;
  },
  readFile: async function (file) {
    let contents = "";
    if (typeof file.name !== "undefined") {
      file = await this.appendPath(file.dir, file.name);
    }

    //
    // Read the file from the backend.
    //
    contents = await App.ReadFile(file);

    //
    // Return what is read.
    //
    return contents;
  },
  writeFile: async function (file, data) {
    if (typeof file === "object") {
      file = await this.appendPath(file.dir, file.name);
    }
    //
    // Write the file to the os.
    //
    await App.WriteFile(file, data);
  },
  renameEntry: async function (oldE, newE) {
    let fromName = oldE;
    if (typeof oldE.dir !== "undefined") {
      fromName = await this.appendPath(oldE.dir, oldE.name);
    }
    let toName = newE;
    if (typeof newE.dir !== "undefined") {
      toName = await this.appendPath(newE.dir, newE.name);
    }
    //
    // Rename the file or directory.
    //
    await App.RenameEntry(fromName, toName);
  },
  createFile: async function (file) {
    let fnm = file;
    if (typeof file.dir !== "undefined") {
      let fnm = await this.appendPath(file.dir, file.name);
    }
    //
    // Create the file with zero contents.
    //
    await App.MakeFile(fnm);
  },
  createDir: async function (dir) {
    let dnm = dir;
    if (typeof dir.dir !== "undefined") {
      dnm = await this.appendPath(dir.dir, dir.name);
    }
    //
    // make the directory.
    //
    await App.MakeDir(dnm);
  },
  loadJavaScript: async function (file) {
    let result = "";

    //
    // Read in the JavaScript file and run it. It should return an extension object.
    //
    let jfile = await this.readFile(file);
    jfile = jfile.toString();
    try {
      let scriptFunction = new Function("", jfile);
      result = scriptFunction();
    } catch (e) {
      console.log(e);
      this.lastError = e.toString();
      result = null;
    }
    return result;
  },
  searchdir: async function (pat, dir, numEntries, returnFunction) {
    //
    // TODO: Make an internal process and not a shell out.
    //
    try {
      if (dir === "") dir = this.path;
      if (pat !== "") {
        let data = await App.SearchMatchingDirectories(dir, pat, numEntries);
        returnFunction(data);
      }
    } catch (e) {
      console.log(e);
      this.lastError = e.toString();
      returnFunction("");
    }
  },
  splitFilePath: async function (filePath) {
    const parts = await App.SplitFile(filePath);
    return parts;
  },
  getClipBoard: async function () {
    result = await App.GetClip();
    return result;
  },
  setClipBoard: async function (msg) {
    await App.SetClip(msg);
  },
  setDirWatch: async function (path, pane) {
    if (pane === "left") {
      App.SetLeftDirWatch(path);
    } else {
      App.SetRightDirWatch(path);
    }
  },
};

export default OS;
