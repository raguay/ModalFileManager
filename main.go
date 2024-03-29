package main

import (
	"embed"
	"fmt"
	"log"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	var commands []string
	commands = make([]string, 0)

	if len(os.Args) > 1 {
		//
		// Process the command line arguments.
		//
		var firstDir = true
		for i := 1; i < len(os.Args); i++ {
			if os.Args[i][0] != '-' {
				if firstDir {
					commands = append(commands, fmt.Sprintf("setLeftDir('%s')", os.Args[i]))
					firstDir = false
				} else {
					commands = append(commands, fmt.Sprintf("setRightDir('%s')", os.Args[i]))
				}
			}
		}
	}

	// Create an instance of the app structure
	a := NewApp()
	a.Commands = commands

	// Create application with options
	err := wails.Run(&options.App{
		Title:             "Modal File Manager",
		Width:             800,
		Height:            400,
		MinWidth:          100,
		MinHeight:         100,
		MaxWidth:          1280,
		MaxHeight:         740,
		DisableResize:     false,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: false,
		BackgroundColour:  &options.RGBA{R: 33, G: 37, B: 43, A: 255},
		Assets:            assets,
		LogLevel:          logger.DEBUG,
		OnStartup:         a.startup,
		OnDomReady:        a.domReady,
		OnShutdown:        a.shutdown,
		CSSDragProperty:   "--wails-draggable",
		CSSDragValue:      "drag",
		Bind: []interface{}{
			a,
		},
		// Windows platform specific options
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
		},
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarHiddenInset(),
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   "Modal File Manager",
				Message: "© 2022 Richard Guay <raguay@customct.com>",
				Icon:    icon,
			},
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
