//
// File:      extensions.js
//
// Description: This object contains the extensions used and interacts with them.
//

var extensions = {
  fileSystems: null,
  commands: null,
  extCommandList: [],
  extensionList: [],
  extensionDir: '',
  localFS: null,
  config: null,
  load: async function(confg, LFS) {
    //
    // Load the extensions from the file system. The extension directory 
    // contains each extension in it's own directory. Each extension should 
    // have a standard `package.json` that all npm packages have. This json 
    // will also have fields for the extension as follows:
    //
    //{
    //  ...
    //  mfmextension: {
    //    name: 'name of the extension',
    //    description: 'description of the extension',
    //    type: 0, // This a designation as the extensions origin: 0 - local, 1 - github
    //    github: 'address to the extension on GitHub',
    //    main: 'name of the JavaScript file'
    //  }
    //}
    //
    // Single files in the extensions directory will be ignored.
    //
    extensions.config = confg;
    extensions.localFS = LFS;
    var items = await extensions.localFS.readDir(extensions.extensionDir);
    for (var i=0; i<items.length; i++) {
      const extsDir = await extensions.localFS.appendPath(extensions.extensionDir,items[i].Name);
      try {
        //
        // an extension directory. load it!
        //
        const paramfile = await extensions.localFS.appendPath(extsDir, 'package.json');
        if(await extensions.localFS.fileExists(paramfile)) {
          var parms = await extensions.localFS.readFile(paramfile);
          parms = JSON.parse(parms.toString());
          if(typeof parms.mfmextension !== 'undefined') {
            const extfile = await extensions.localFS.appendPath(extsDir, parms.mfmextension.main);
            const extension = await extensions.localFS.loadJavaScript(extfile);
            if(extension !== null) {
              extensions.addExtension(parms.mfmextension.name, parms.mfmextension.description, extension, parms.mfmextension.type, parms.mfmextension.github);
            } else {
              console.log(`extension ${items[i].Name} didn't load.`);
            }
          } else {
            console.log("extension: " + extsDir + " isn't configured correctly.");
          }
        }
      } catch(e) {
          //
          // There was a problem getting the stats. Therefore, it's not a file or 
          // directory we need.
          //
          console.log(e);
      }
    }
  },
  setExtensionDir: function(dir) {
    extensions.extensionDir = dir;
  },
  getExtensionDir: function() {
    return extensions.extensionDir;
  },
  getConfigDir: async function() {
    return await extensions.localFS.getConfigDir();
  },
  setFileSystems: function(fs) {
    extensions.fileSystems = fs;
  },
  getFileSystems: function() {
    return extensions.fileSystems;
  },
  setCommands: function(com) {
    extensions.commands = com;
  },
  getCommands: function() {
    return extensions.commands;
  },
  getConfig: function() {
    return extensions.config;
  },
  setConfig: function(value) {
    extensions.config = value;
  },
  addExtCommand: function(name, description, extCommand) {
    //
    // Add it to the stack.
    //
    extensions.extCommandList.push({
      name: name,
      description: description,
      command: extCommand
    });
  },
  listExtCommands: function() {
    return extensions.extCommandList.map(item => {
      return { name: item.name, description: item.description};
    });
  },
  getExtCommand: function(name) {
    return(extensions.extCommandList.find(item => item.name === name));
  },
  addExtension: function(name, description, extension, type, github) {
    //
    // Add it to the stack.
    //
    extensions.extensionList.push({
      name: name,
      description: description,
      extension: extension,
      type: type,
      github: github
    });
  },
  unloadExtensions: function() {
    if(extensions.extensionList !== null) {
      extensions.extensionList.forEach(item => {
        if((typeof item.extension !== 'undefined')&&(typeof item.extension.unload !== 'undefined')) item.extension.unload();
      });
    }
  },
  init: function() {
    if(extensions.extensionList !== null) {
      extensions.extensionList.forEach(item => {
        if(typeof item.extension !== 'undefined') item.extension.init(extensions);
      });
    }
  },
  installKeyMaps: function() {
    if(extensions.extensionList !== null) {
      extensions.extensionList.forEach(item => {
        if(typeof item.extension !== 'undefined') item.extension.installKeyMaps();
      });
    }
  },
  getExtension: function(ext) {
    return extensions.extensionList.find((item) => { item.name == ext });
  },
  listExtensions: function() {
    return extensions.extensionList.map(item => {
      return {
        name: item.name,
        description: item.description
      };
    })
  },
  removeExtension: function(ext) {
    var exten = extensions.extensionList.filter(item => item.name === ext)[0];
    exten.unload();
    extensions.extensionList = extensions.extensionList.filter(item => item.name != ext);
  },
  getLocalFS: function() {
    return extensions.localFS;
  }
}

export default extensions;

