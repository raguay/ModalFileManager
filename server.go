package main

import (
	"context"
	"fmt"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"os"
	"strings"
)

// Function:      Security
//
// Description:   This function supplies a middleware for the gin
//
//	server to check if the request is allowed or not.
//	This is to help keep the server safe from hacking.
func Security() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		if strings.HasPrefix(clientIP, "127.0.0.1") {
			//
			// It's okay to serve.
			//
			c.Next()
		} else {
			//
			// Cancel the request.
			//
			c.Abort()
		}
	}
}

func backend(app *App, ctx context.Context) {
	//
	// This will have the web server backend for EmailIt
	//
	r := gin.Default()
	r.Use(gin.Recovery())
	r.Use(Security())

	//
	// Get the user's home directory for sending files from.
	//
	hmdir, _ := os.UserHomeDir()

	//
	// this sets up a static server for the user's home directory. The
	// frontend will use it to get pictures and such.
	//
	r.Use(static.Serve("/filesys", static.LocalFile(hmdir, false)))

	//
	// Run the server.
	//
	err := r.Run(":9998")
	if err != nil {
		fmt.Print("\n Server error:\n", err.Error())
	}
}
