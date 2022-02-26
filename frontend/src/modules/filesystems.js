//
// File:      filesystems.js
//
// Description: This module contains all the supported file system objects.
//

var filesystems = {
  fileSystemList: [],
  addFileSystem: function(name, description, fs) {
    filesystems.fileSystemList.push({
      name: name,
      description: description,
      fileSystem: fs
    });
  },
  getFileSystem: function(fs) {
    return filesystems.fileSystemList.find((item) => { item.name == com })
  },
  listFileSystems: function() {
    return filesystems.fileSystemList.map(item => {
      return {
        name: item.name,
        description: item.description
      };
    })
  },
  removeFileSystem: function(fs) {
    filesystems.fileSystemList = filesystems.fileSystemList.filter(item => item.name != fs);
  }
}

export default filesystems;
