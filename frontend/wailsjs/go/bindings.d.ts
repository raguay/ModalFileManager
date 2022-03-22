import * as models from './models';

export interface go {
  "main": {
    "App": {
		CopyEntries(arg1:string,arg2:string):Promise<void>
		DeleteEntries(arg1:string):Promise<void>
		FileExists(arg1:string):Promise<boolean>
		GetClip():Promise<string>
		GetError():Promise<string>
		GetHomeDir():Promise<string>
		MakeDir(arg1:string):Promise<void>
		MakeFile(arg1:string):Promise<void>
		MoveEntries(arg1:string,arg2:string):Promise<void>
		ReadDir(arg1:string):Promise<Array<models.FileInfo>>
		ReadFile(arg1:string):Promise<string>
		RenameEntry(arg1:string,arg2:string):Promise<void>
		RunCommandLine(arg1:string,arg2:Array<string>,arg3:Array<string>,arg4:string):Promise<string>
		SetClip(arg1:string):Promise<void>
		SplitFile(arg1:string):Promise<models.FileParts>
		WriteFile(arg1:string,arg2:string):Promise<void>
    },
  }

}

declare global {
	interface Window {
		go: go;
	}
}
