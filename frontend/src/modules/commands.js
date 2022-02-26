//
// File:      commands.js
//
// Description: This file contains the commands object for dealing with commands that
//              SvelteFileManager uses. 
//

var commands = {
  commandList: [],
  lastError: '',
  addCommand: function(name, altname, description, command) {
    commands.commandList.push({
      name: name,
      altname: altname,
      description: description,
      command: command
    });
  },
  runCommand: function(com) {
    //
    // Get the command.
    //
    const command = commands.getCommand(com);

    //
    // Run the command.
    //
    try {
      if(command !== null) command.command();
    } catch(e) {
      //
      // Something happened in the command. Tell about it.
      //
      commands.lastError = e;
      console.log(e);
    }
  },
  getCommand: function(com) {
    return commands.commandList.find(item => item.name === com )
  },
  getAltCommand: function(com) {
    return commands.commandList.find(item => item.altname === com )
  },
  listCommands: function() {
    return commands.commandList.map(item => {
      return {
        name: item.name,
        description: item.description
      };
    })
  },
  removeCommand: function(com) {
    commands.commandList = commands.commandList.filter(item => item.name !== com);
  }
}

export default commands;
