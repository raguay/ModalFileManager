package main

import (
	"context"
	"errors"
	"fmt"
	cp "github.com/otiai10/copy"
	"io"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// App application struct and other structs
type App struct {
	ctx  context.Context
	err  string
	proc *os.Process
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

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
func (b *App) startup(ctx context.Context) {
	// Perform your setup here
	b.ctx = ctx
}

// domReady is called after the front-end dom has been loaded
func (b *App) domReady(ctx context.Context) {
	// Add your action here
}

// shutdown is called at application termination
func (b *App) shutdown(ctx context.Context) {
	// Perform your teardown here
}

func (b *App) ReadFile(path string) string {
	contents, _ := os.ReadFile(path)
	return string(contents[:])
}

func (b *App) GetHomeDir() string {
	var hdir string
	hdir, _ = os.UserHomeDir()
	return hdir
}

func (b *App) WriteFile(path string, data string) {
	b.err = ""
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
	files, _ := ioutil.ReadDir(path)
	for _, file := range files {
		var fileInfo FileInfo
		fileInfo.Name = file.Name()
		fileInfo.Size = file.Size()
		fileInfo.IsDir = file.IsDir()
		fileInfo.Modtime = file.ModTime().Format(time.Stamp)
		fileInfo.Dir = path
		fileInfo.Extension = filepath.Ext(file.Name())
		result = append(result, fileInfo)
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

func (b *App) RunCommandLine(cmd string, args string, env []string, dir string) string {
	fmt.Printf("The command is: %s\n", cmd)
	fmt.Printf("The args are: %s\n", args)
	fmt.Printf("The env are: %v\n", env)
	fmt.Printf("The directory is: %s\n", dir)
	b.err = ""
	cmdline := exec.Command(cmd, args)
	cmdline.Env = env
	cmdline.Dir = dir
	result, err := cmdline.CombinedOutput();
	if( err != nil ) {
		b.err = err.Error()
	}

	return string(result[:])
}
