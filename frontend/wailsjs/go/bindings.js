// @ts-check
// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
const go = {
  "main": {
    "App": {
      /**
       * CopyEntries
       * @param {string} arg1 - Go Type: string
       * @param {string} arg2 - Go Type: string
       * @returns {Promise<void>} 
       */
      "CopyEntries": (arg1, arg2) => {
        return window.go.main.App.CopyEntries(arg1, arg2);
      },
      /**
       * DeleteEntries
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<void>} 
       */
      "DeleteEntries": (arg1) => {
        return window.go.main.App.DeleteEntries(arg1);
      },
      /**
       * FileExists
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<boolean>}  - Go Type: bool
       */
      "FileExists": (arg1) => {
        return window.go.main.App.FileExists(arg1);
      },
      /**
       * GetClip
       * @returns {Promise<string>}  - Go Type: string
       */
      "GetClip": () => {
        return window.go.main.App.GetClip();
      },
      /**
       * GetError
       * @returns {Promise<string>}  - Go Type: string
       */
      "GetError": () => {
        return window.go.main.App.GetError();
      },
      /**
       * GetHomeDir
       * @returns {Promise<string>}  - Go Type: string
       */
      "GetHomeDir": () => {
        return window.go.main.App.GetHomeDir();
      },
      /**
       * MakeDir
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<void>} 
       */
      "MakeDir": (arg1) => {
        return window.go.main.App.MakeDir(arg1);
      },
      /**
       * MakeFile
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<void>} 
       */
      "MakeFile": (arg1) => {
        return window.go.main.App.MakeFile(arg1);
      },
      /**
       * MoveEntries
       * @param {string} arg1 - Go Type: string
       * @param {string} arg2 - Go Type: string
       * @returns {Promise<void>} 
       */
      "MoveEntries": (arg1, arg2) => {
        return window.go.main.App.MoveEntries(arg1, arg2);
      },
      /**
       * ReadDir
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<Array<models.FileInfo>>}  - Go Type: []main.FileInfo
       */
      "ReadDir": (arg1) => {
        return window.go.main.App.ReadDir(arg1);
      },
      /**
       * ReadFile
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<string>}  - Go Type: string
       */
      "ReadFile": (arg1) => {
        return window.go.main.App.ReadFile(arg1);
      },
      /**
       * RenameEntry
       * @param {string} arg1 - Go Type: string
       * @param {string} arg2 - Go Type: string
       * @returns {Promise<void>} 
       */
      "RenameEntry": (arg1, arg2) => {
        return window.go.main.App.RenameEntry(arg1, arg2);
      },
      /**
       * RunCommandLine
       * @param {string} arg1 - Go Type: string
       * @param {Array<string>} arg2 - Go Type: []string
       * @param {Array<string>} arg3 - Go Type: []string
       * @param {string} arg4 - Go Type: string
       * @returns {Promise<string>}  - Go Type: string
       */
      "RunCommandLine": (arg1, arg2, arg3, arg4) => {
        return window.go.main.App.RunCommandLine(arg1, arg2, arg3, arg4);
      },
      /**
       * SetClip
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<void>} 
       */
      "SetClip": (arg1) => {
        return window.go.main.App.SetClip(arg1);
      },
      /**
       * SplitFile
       * @param {string} arg1 - Go Type: string
       * @returns {Promise<models.FileParts>}  - Go Type: main.FileParts
       */
      "SplitFile": (arg1) => {
        return window.go.main.App.SplitFile(arg1);
      },
      /**
       * WriteFile
       * @param {string} arg1 - Go Type: string
       * @param {string} arg2 - Go Type: string
       * @returns {Promise<void>} 
       */
      "WriteFile": (arg1, arg2) => {
        return window.go.main.App.WriteFile(arg1, arg2);
      },
    },
  },

};
export default go;
