package main

import (
	"context"
	"errors"
	"fmt"
	clip "github.com/atotto/clipboard"
	cp "github.com/otiai10/copy"
	watcher "github.com/radovskyb/watcher"
	github "github.com/google/go-github/v49/github"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
	"io"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"time"
)

// App application struct and other structs
type App struct {
	ctx          context.Context
	err          string
	proc         *os.Process
	watcher      *watcher.Watcher
	lastRightDir string
	lastLeftDir  string
	watchers     []WatcherInfo
	Commands     []string
}

type FileParts struct {
	Dir       string
	Name      string
	Extension string
}

type FileInfo struct {
	Dir       string
	Name      string
	Extension string
	IsDir     bool
	Size      int64
	Modtime   string
}

type WatcherInfo struct {
	Path        string
	WatcherType int // if 0, a nonrecursive watch. 1 is a AddRecursive watch
	SigName     string
}

type GitHubRepos struct {
	Name        string `json:"name"`
	URL	    string `json:"url"`
	Stars       int    `json:"stars"`
	Owner       string `json:"owner"`
	ID          int64  `json:"id"`
	Description string `json:"description"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
func (b *App) startup(ctx context.Context) {
	//
	// Create the file system watcher and get it running.
	//
	b.ctx = ctx
	b.watcher = watcher.New()
	b.watchers = make([]WatcherInfo, 0, 0)
	go func() {
		for {
			select {
			case event := <-b.watcher.Event:
				{
					if (b.lastLeftDir == b.lastRightDir) && (b.lastLeftDir == event.Path) {
						wailsruntime.EventsEmit(b.ctx, "leftDirChange", event.Path)
						wailsruntime.EventsEmit(b.ctx, "rightDirChange", event.Path)
					} else {
						if b.lastLeftDir == event.Path {
							wailsruntime.EventsEmit(b.ctx, "leftDirChange", event.Path)
						} else if b.lastRightDir == event.Path {
							wailsruntime.EventsEmit(b.ctx, "rightDirChange", event.Path)
						} else {
							//
							// See if it is in watchers list
							//
							found := false
							for i := 0; i < len(b.watchers); i++ {
								if b.watchers[i].Path == event.Path {
									wailsruntime.EventsEmit(b.ctx, b.watchers[i].SigName, event.Path)
									found = true
								}
							}

							//
							// It's not the left or right directory or watchers list. Remove it.
							//
							if !found && b.DirExists(event.Path) {
								b.watcher.Remove(event.Path)
							}
						}
					}
				}
			case err := <-b.watcher.Error:
				b.err = err.Error()
			case <-b.watcher.Closed:
				return
			}
		}
	}()

	//
	// Start the file system watcher.
	//
	if err := b.watcher.Start(time.Millisecond * 100); err != nil {
		b.err = err.Error()
	}
}

// domReady is called after the front-end dom has been loaded
func (b *App) domReady(ctx context.Context) {
}

// shutdown is called at application termination
func (b *App) shutdown(ctx context.Context) {
	//
	// Close the file system watcher.
	//
	b.watcher.Close()
}

func (b *App) GetCommandLineCommands() []string {
	return b.Commands
}

func (b *App) ReadFile(path string) string {
	b.err = ""
	contents, err := os.ReadFile(path)
	if err != nil {
		b.err = err.Error()
	}
	return string(contents[:])
}

func (b *App) GetHomeDir() string {
	b.err = ""
	hdir, err := os.UserHomeDir()
	if err != nil {
		b.err = err.Error()
	}
	return hdir
}

func (b *App) WriteFile(path string, data string) {
	err := os.WriteFile(path, []byte(data), 0666)
	if err != nil {
		b.err = err.Error()
	}
}

func (b *App) FileExists(path string) bool {
	b.err = ""
	_, err := os.Stat(path)
	return !errors.Is(err, os.ErrNotExist)
}

func (b *App) DirExists(path string) bool {
	b.err = ""
	dstat, err := os.Stat(path)
	if err != nil {
		b.err = err.Error()
		return false
	}
	return dstat.IsDir()
}

func (b *App) SplitFile(path string) FileParts {
	b.err = ""
	var parts FileParts
	parts.Dir, parts.Name = filepath.Split(path)
	parts.Extension = filepath.Ext(path)
	return parts
}

func (b *App) ReadDir(path string) []FileInfo {
	b.err = ""
	var result []FileInfo
	result = make([]FileInfo, 0, 0)
	files, err := ioutil.ReadDir(path)
	if err != nil {
		b.err = err.Error()
	} else {
		for _, file := range files {
			var fileInfo FileInfo
			fileInfo.Name = file.Name()
			fileInfo.Size = file.Size()
			fileInfo.IsDir = file.IsDir()
			fileInfo.Modtime = file.ModTime().Format(time.ANSIC)
			fileInfo.Dir = path
			fileInfo.Extension = filepath.Ext(file.Name())
			result = append(result, fileInfo)
		}
	}
	return result
}

func (b *App) MakeDir(path string) {
	b.err = ""
	err := os.MkdirAll(path, 0755)
	if err != nil {
		b.err = err.Error()
	}
}

func (b *App) MakeFile(path string) {
	b.err = ""
	b.WriteFile(path, "")
}

func (b *App) MoveEntries(from string, to string) {
	b.err = ""
	err := os.Rename(from, to)
	if err != nil {
		b.err = err.Error()
	}
}

func (b *App) RenameEntry(from string, to string) {
	b.err = ""
	err := os.Rename(from, to)
	if err != nil {
		b.err = err.Error()
	}
}

func (b *App) GetError() string {
	return b.err
}

func (b *App) CopyEntries(from string, to string) {
	b.err = ""
	info, err := os.Stat(from)
	if os.IsNotExist(err) {
		b.err = err.Error()
		return
	}
	if info.IsDir() {
		//
		// It's a directory! Do a deap copy.
		//
		err := cp.Copy(from, to)
		if err != nil {
			b.err = err.Error()
			return
		}
	} else {
		//
		// It's a file. Just copy it.
		//
		source, err := os.Open(from)
		if err != nil {
			b.err = err.Error()
			return
		}
		defer source.Close()

		destination, err := os.Create(to)
		if err != nil {
			b.err = err.Error()
			return
		}
		defer destination.Close()
		_, err = io.Copy(destination, source)

		if err != nil {
			b.err = err.Error()
		}
	}
}

func (b *App) DeleteEntries(path string) {
	b.err = ""
	err := os.RemoveAll(path)
	if err != nil {
		b.err = err.Error()
	}
}

func (b *App) RunCommandLine(cmd string, args []string, env []string, dir string) string {
	b.err = ""
	cmdline := exec.Command(cmd)
	cmdline.Args = args
	cmdline.Env = env
	cmdline.Dir = dir
	result, err := cmdline.CombinedOutput()
	if err != nil {
		b.err = err.Error()
	}

	return string(result[:])
}

func (b *App) GetClip() string {
	result, err := clip.ReadAll()
	if err != nil {
		b.err = err.Error()
	}
	return result
}

func (b *App) SetClip(msg string) {
	err := clip.WriteAll(msg)
	if err != nil {
		b.err = err.Error()
	}
}

func (b *App) SetRightDirWatch(path string) {
	b.lastRightDir = path
	if err := b.watcher.Add(path); err != nil {
		b.err = err.Error()
	}
}

func (b *App) SetLeftDirWatch(path string) {
	b.lastLeftDir = path
	if err := b.watcher.Add(path); err != nil {
		b.err = err.Error()
	}
}

func (b *App) CloseRightWatch() {
	b.watcher.Remove(b.lastRightDir)
}

func (b *App) CloseLeftWatch() {
	b.watcher.Remove(b.lastLeftDir)
}

func (b *App) AddWatcher(path string, wtype int, signame string) {
	if wtype == 0 {
		b.watcher.Add(path)
	} else {
		b.watcher.AddRecursive(path)
	}
	b.watchers = append(b.watchers, WatcherInfo{
		Path:        path,
		WatcherType: wtype,
		SigName:     signame,
	})
}

func (b *App) RemoveWatcher(path string, wtype int) {
	if wtype == 0 {
		b.watcher.Remove(path)
	} else {
		b.watcher.RemoveRecursive(path)
	}

	//
	// Remove the watcher from the list of watchers
	//
	for i := 0; i < len(b.watchers); i++ {
		if b.watchers[i].Path == path {
			wailsruntime.EventsOff(b.ctx, b.watchers[i].SigName)
			copy(b.watchers[i:], b.watchers[i+1:])
			b.watchers[len(b.watchers)-1] = WatcherInfo{} // or the zero value of T
			b.watchers = b.watchers[:len(b.watchers)-1]
		}
	}
}

func (b *App) GetEnvironment() []string {
	return os.Environ()
}

func (b *App) AppendPath(dir string, name string) string {
	return filepath.Join(dir, name)
}

func (b *App) Quit() {
	b.watcher.Close()
	wailsruntime.Quit(b.ctx)
}

func (b *App) GetOSName() string {
	os := goruntime.GOOS
	result := ""
	switch os {
	case "windows":
		result = "windows"
		break
	case "darwin":
		result = "macos"
	case "linux":
		result = "linux"
	default:
		result = fmt.Sprintf("%s", os)
	}
	return result
}

func (b *App) GetGitHubThemes() []GitHubRepos {
	var result []GitHubRepos
	client := github.NewClient(nil)
	topics, _, err := client.Search.Repositories(context.Background(), "in:topic modalfilemanager in:topic theme", nil)
	if err == nil {
		total := *topics.Total;
		result = make([]GitHubRepos, total, total)
		for i := 0; i<total; i++ {
			result[i].ID = *topics.Repositories[i].ID
			result[i].Name = *topics.Repositories[i].Name
			result[i].Owner = *topics.Repositories[i].Owner.Login
			result[i].URL = *topics.Repositories[i].CloneURL
			result[i].Stars = *topics.Repositories[i].StargazersCount
			result[i].Description = *topics.Repositories[i].Description
		}
	}
	return result
}

func (b *App) GetGitHubScripts() []GitHubRepos {
	var result []GitHubRepos
	client := github.NewClient(nil)
	topics, _, err := client.Search.Repositories(context.Background(), "in:topic modalfilemanager in:topic V2 in:topic extension", nil)
	if err == nil {
		total := *topics.Total;
		result = make([]GitHubRepos, total, total)
		for i := 0; i<total; i++ {
			result[i].ID = *topics.Repositories[i].ID
			result[i].Name = *topics.Repositories[i].Name
			result[i].Owner = *topics.Repositories[i].Owner.Login
			result[i].URL = *topics.Repositories[i].CloneURL
			result[i].Stars = *topics.Repositories[i].StargazersCount
			result[i].Description = *topics.Repositories[i].Description
		}
	}
	return result
}


