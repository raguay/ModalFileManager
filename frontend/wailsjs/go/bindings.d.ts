interface go {
  "main": {
    "App": {
		CopyEntries(arg1:string,arg2:string):Promise<void>
		DeleteEntries(arg1:string):Promise<void>
		FileExists(arg1:string):Promise<boolean>
		GetError():Promise<string>
		GetHomeDir():Promise<string>
		MakeDir(arg1:string):Promise<void>
		MakeFile(arg1:string):Promise<void>
		MoveEntries(arg1:string,arg2:string):Promise<void>
		ReadDir(arg1:string):Promise<Array<FileInfo>>
		ReadFile(arg1:string):Promise<string>
		RenameEntry(arg1:string,arg2:string):Promise<void>
		SplitFile(arg1:string):Promise<FileParts>
		WriteFile(arg1:string,arg2:string):Promise<void>
    },
  }

}

declare global {
	interface Window {
		go: go;
	}
}
