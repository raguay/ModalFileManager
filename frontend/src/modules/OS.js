//
// File:          OS.js
//
// Description:   This file contains all low level
//                functions that would be OS dependent. Now, most OS
//                dependent items have been moved to go main program.
//

var OS = {
  dirFirst: true,
  sortFunction: null,
  filterFunction: null,
  lastError: "",
  lastOutput: "",
  config: null,
  type: "macOS",
  path: "/",
  sep: "/",
  localHomeDir: null,
  localConfigDir: null,
  setConfig: function(cfg) {
    this.config = cfg;
  },
  getExtension: async function(file) {
    var ext = '';
    var match = file.match(/\.(.*)$/);
    if (match !== null) {
      ext = match[1];
    }
    return ext;
  },
  getConfigDir: async function() {
    if (this.localConfigDir === null) {
      const hdir = await this.getHomeDir();
      this.localConfigDir = await this.appendPath(hdir, ".config/modalfilemanager");
    }
    return this.localConfigDir;
  },
  terminalScript: "bin/openTerminal.scpt",
  init: function() {
    //
    // Set the defaults
    //
    this.sortFunction = this.alphaSort;
    this.filterFunction = this.defaultFilter;

    //
    // Get the path seperator 
    //
    this.sep = '/';
  },
  getDirFirst: function() {
    return this.dirFirst;
  },
  setDirFirst: function(flag) {
    if (typeof flag === "boolean") {
      this.dirFirst = flag;
    }
  },
  setDirSort: function(sortFunction) {
    this.sortFunction = sortFunction;
  },
  setFilter: function(flt) {
    this.filterFunction = flt;
  },
  getTerminalScript: async function() {
    return await this.appendPath(await this.getHomeDir(), this.terminalScript);
  },
  setTerminalScript: function(scrpt) {
    this.terminalScript = scrpt;
  },
  getHomeDir: async function() {
    if (this.localHomeDir === null) {
      this.localHomeDir = await window.go.main.App.GetHomeDir();
      this.localHomeDir = (new String(this.localHomeDir)).toString();
    }
    return this.localHomeDir;
  },
  readDir: async function(dir) {
    if (typeof dir.dir !== 'undefined') {
      dir = await this.appendPath(dir.dir, dir.name);
    }
    //
    // Get the directory information
    //
    var result = await window.go.main.App.ReadDir(dir);
    return result
  },
  normalize: async function(dir) {
    if (dir[0] === "~") {
      dir = await this.appendPath(await this.getHomeDir(), dir.slice(1, dir.length));
    }
    return dir;
  },
  dirExists: async function(dir) {
    if (typeof dir.name !== 'undefined') dir = await this.appendPath(dir.dir, dir.name);
    return await this.fileExists(dir);
  },
  fileExists: async function(file) {
    var result = true;
    if (typeof file.name !== 'undefined') {
      file = await this.appendPath(file.dir, file.name);
    }
    result = window.go.main.App.FileExists(file);
    return result;
  },
  makeDir: async function(dir) {
    if (typeof dir.name !== "undefined") {
      dir = await this.appendpath(dir.dir, dir.name);
    }
    //
    // Make a directory.
    //
    await window.go.main.App.MakeDir(dir);
  },
  moveEntries: async function(from, to, callback) {
    var fromName;
    var toName;

    //
    // It can receive an object or string. Check to see which it is
    // to get the proper path.
    //
    if (typeof from.dir !== 'undefined') {
      fromName = await this.appendPath(from.dir, from.name);
    } else {
      fromName = from;
    }
    if (typeof to.dir !== 'undefined') {
      toName = to.dir
    } else {
      toName = to;
    }

    const parts = fromName.split(this.sep);
    toName = await this.appendPath(toName, parts[parts.length - 1]);

    //
    // Move the entries.
    //
    await window.go.main.App.MoveEntries(fromName, toName);
    var err = await window.go.main.App.GetError();

    //
    // Run the callback if given.
    //
    if (typeof callback !== "undefined") {
      callback(err);
    }
  },
  copyEntries: async function(from, to, callback) {
    var fromName;
    var toName;

    //
    // It can receive an object or string. Check to see which it is
    // to get the proper path.
    //
    if (typeof from.dir !== 'undefined') {
      fromName = await this.appendPath(from.dir, from.name);
    } else {
      fromName = from;
    }
    if (typeof to.dir !== 'undefined') {
      toName = to.dir
    } else {
      toName = to;
    }

    const parts = fromName.split(this.sep);
    toName = await this.appendPath(toName, parts[parts.length - 1]);

    //
    // Copy the entries.
    //
    await window.go.main.App.CopyEntries(fromName, toName);
    var err = await window.go.main.App.GetError();

    //
    // Run the callback if given.
    //
    if (typeof callback !== "undefined") {
      callback(err);
    }
  },
  deleteEntries: async function(entry, callback) {
    var item = await this.appendPath(entry.dir, entry.name);
    var that = this;
    if (this.config !== null) {
      if (this.config.useTrash) {
        //
        // Use the trashcan on the system.
        //
        if (typeof callback === "undefined") {
          this.runCommandLine("trash '" + item + "'", [], (err, stdout) => {
            if (err) {
              that.lastError = err;
              console.log(err);
            }
            that.lastOutput = stdout;
          }, '.');
        } else {
          this.runCommandLine("trash '" + item + "'", [], callback, '.');
        }
      } else {
        //
        // Delete the item completely.
        //
        await window.go.main.App.DeleteEntries(item)
        var err = await window.go.main.App.GetError();

        if (typeof callback !== "undefined") {
          callback(err)
        }
      }
    }
  },
  getDirList: async function(dir) {
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
    var entries = [];
    if (typeof dir === "object" && typeof dir.name !== "undefined") {
      dir = await this.appendPath(dir.dir, dir.name);
    }
    dir = await this.normalize(dir);
    if (await this.dirExists(dir)) {
      //
      // read directory
      //
      var items = await this.readDir(dir);
      for (var i = 0; i < items.length; i++) {
        if (typeof items[i] !== "undefined") {
          var newEntry;
          newEntry = {
            name: items[i].Name,
            dir: items[i].Dir,
            ext: items[i].Extension,
            fileSystemType: "macOS",
            fileSystem: this,
            selected: false,
            datetime: items[i].Modtime,
            type: items[i].IsDir ? 1 : 0,
            size: items[i].Size
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
        var dirEntries = entries.filter((item) => item.type === 1);
        var fileEntries = entries.filter((item) => item.type === 0);
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
  defaultFilter: function(item) {
    return item.name[0] !== "." && !item.name.includes("Icon");
  },
  allFilter: function(item) {
    //
    // Still, don't show the Icon and DS_Store files.
    //
    return !item.name.includes("Icon") && !item.name.includes(".DS_Store");
  },
  alphaSort: function(item1, item2) {
    const a = item1.name.toLowerCase();
    const b = item2.name.toLowerCase();
    return a === b ? 0 : a > b ? 1 : -1;
  },
  openFile: async function(pdir, file) {
    //
    // For macOS, open with the open command line command.
    //
    this.runCommandLine(`open '${pdir}/${file}'`)
  },
  openFileWithProgram: async function(prog, file) {
    //
    // For macOS, open with the open command line command.
    //
    this.runCommandLine(`open -a ${prog} '${file}'`)
  },
  openInTerminal: async function(prog, file) {
    //
    // TODO
    // "/usr/bin/osascript " + this.terminalScript + " '" + prog + " \"" + file + "\"'", (err, stdin, stdout) => {}
    this.runCommandLine(`osascript '${this.terminalScript}' '${prog}' '${file}'`, (err, stdout) => { }, '.');
  },
  getConfig: async function() {
    if (this.config === null) {
      //
      // Create the minimum config and then add to the path as needed. The path from process
      // will not contain everything the user would have in his shell.
      //
      this.config = {
        env: null,
        shell: "",
        useTrash: false,
      };

      //
      // Copy the environment from the process.
      //
      this.config.env = {
        ...process.env,
      };

      //
      // Add directories that the user's system should have.
      //
      var hdir = await this.getHomeDir();
      if (await this.dirExists(+ "/bin")) {
        this.config.env.PATH = hdir + "/bin:" + this.config.env.PATH;
      }
      if (await this.dirExists("/opt/homebrew/bin")) {
        this.config.env.PATH = "/opt/homebrew/bin:" + this.config.env.PATH;
      }
      if (await this.dirExists("/usr/local/bin")) {
        this.config.env.PATH = "/usr/local/bin:" + this.config.env.PATH;
      }
      if (await this.dirExists(hdir + "/.cargo/bin")) {
        this.config.env.PATH += ":" + hdir + "/.cargo/bin";
      }
      if (await this.dirExists(hdir + "/go/bin")) {
        this.config.env.PATH += ":" + hdir + "/go/bin";
      }

      //
      // Set the defaults for everything else.
      //
      this.config.shell = this.config.env.SHELL;
      this.config.useTrash = true;
    }
    return this.config;
  },
  runCommandLine: async function(line, rEnv, callback, dir) {
    //
    // Get the environment to use.
    //
    var cnfg = await this.getConfig();
    var nEnv = { ...cnfg.env };
    if (typeof rEnv !== "undefined") {
      nEnv = { ...nEnv, ...rEnv };
    }

    //
    // Fix the environment from a map to an array of strings.
    //
    var penv = [];
    for (const key in nEnv) {
      penv.push(`${key}=${nEnv[key]}`)
    }

    //
    // Make sure dir has a value.
    //
    if (typeof dir === 'undefined') dir = '.';

    //
    // Run the command line in a shell. #TODO make the shell configurable.
    //
    var args = ["zsh", '-c', line];
    var cmd = "zsh";

    //
    // Run the command line.
    //
    var result = await window.go.main.App.RunCommandLine(cmd, args, penv, dir);
    var err = await window.go.main.App.GetError();

    //
    // If callback is given, call it with the results.
    //
    if (typeof callback !== 'undefined') {
      callback(err, result);
    }
  },
  appendPath: async function(dir, name) {
    // dir can be an entry or a path string. name is always a string.
    //
    if (typeof dir === "object") dir = `${dir.dir}${this.sep}${dir.name}`;
    if (dir == this.sep) {
      return this.sep + name;
    } else {
      if (dir[dir.length - 1] === this.sep) {
        return dir + name;
      } else {
        return dir + this.sep + name;
      }
    }
  },
  readFile: async function(file) {
    var contents = "";
    if (typeof file.name !== 'undefined') {
      file = await this.appendPath(file.dir, file.name);
    }

    //
    // Read the file from the backend.
    //
    contents = await window.go.main.App.ReadFile(file);

    //
    // Return what is read.
    //
    return contents;
  },
  writeFile: async function(file, data) {
    if (typeof file === "object") file = await this.appendPath(file.dir, file.name);
    //
    // Write the file to the os.
    //
    await window.go.main.App.WriteFile(file, data);
  },
  renameEntry: async function(oldE, newE) {
    var fromName = oldE;
    if (typeof oldE.dir !== 'undefined') {
      fromName = await this.appendPath(oldE.dir, oldE.name);
    }
    var toName = newE;
    if (typeof newE.dir !== 'undefined') {
      toName = await this.appendPath(newE.dir, newE.name);
    }
    //
    // Rename the file or directory.
    //
    await window.go.main.App.RenameEntry(fromName, toName);
  },
  createFile: async function(file) {
    var fnm = file;
    if (typeof file.dir !== 'undefined') {
      var fnm = await this.appendPath(file.dir, file.name);
    }
    //
    // Create the file with zero contents.
    //
    await window.go.main.App.MakeFile(fnm);
  },
  createDir: async function(dir) {
    var dnm = dir;
    if (typeof dir.dir !== 'undefined') {
      dnm = await this.appendPath(dir.dir, dir.name);
    }
    //
    // make the directory.
    //
    await window.go.main.App.MakeDir(dnm);
  },
  loadJavaScript: async function(file) {
    var result = "";

    //
    // Read in the JavaScript file and run it. It should return an extension object.
    //
    var jfile = await this.readFile(file);
    jfile = jfile.toString();
    try {
      var scriptFunction = new Function("", jfile);
      result = scriptFunction();
    } catch (e) {
      console.log(e);
      this.lastError = e.toString();
      result = null;
    }
    return result;
  },
  searchDir: async function(pat, dir, numEntries, returnFunction) {
    try {
      if (dir === "") dir = this.path;
      if (pat !== "") {
        this.runCommandLine(
          "fd -i --max-results " +
          numEntries +
          ' -t d "' +
          pat +
          '" "' +
          dir +
          '"',
          [],
          (err, data) => {
            if (err) {
              console.log(err);
              this.lastError = err.toString();
            } else {
              returnFunction(data.toString().split("\n"));
            }
          },
          dir
        );
      }
    } catch (e) {
      console.log(e);
      this.lastError = e.toString();
    }
  },
  splitFilePath: async function(filePath) {
    const parts = await window.go.main.App.SplitFile(filePath);
    return (parts);
  },
  getClipBoard: async function() {
    result = await window.go.main.App.GetClip()
    return result
  },
  setClipBoard: async function(msg) {
    await window.go.main.App.SetClip(msg)
  }
};

export default OS;

