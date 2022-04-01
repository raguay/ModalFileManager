export interface go {
  "main": {
    "App": {
		AddWatcher(arg1:string,arg2:number,arg3:string):Promise<void>
		CloseLeftWatch():Promise<void>
		CloseRightWatch():Promise<void>
		CopyEntries(arg1:string,arg2:string):Promise<void>
		DeleteEntries(arg1:string):Promise<void>
		DirExists(arg1:string):Promise<boolean>
		FileExists(arg1:string):Promise<boolean>
		GetClip():Promise<string>
		GetCommandLineCommands():Promise<Array<string>>
		GetError():Promise<string>
		GetHomeDir():Promise<string>
		MakeDir(arg1:string):Promise<void>
		MakeFile(arg1:string):Promise<void>
		MoveEntries(arg1:string,arg2:string):Promise<void>
		ReadDir(arg1:string):Promise<Array<FileInfo>>
		ReadFile(arg1:string):Promise<string>
		RemoveWatcher(arg1:string,arg2:number):Promise<void>
		RenameEntry(arg1:string,arg2:string):Promise<void>
		RunCommandLine(arg1:string,arg2:Array<string>,arg3:Array<string>,arg4:string):Promise<string>
		SetClip(arg1:string):Promise<void>
		SetLeftDirWatch(arg1:string):Promise<void>
		SetRightDirWatch(arg1:string):Promise<void>
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
