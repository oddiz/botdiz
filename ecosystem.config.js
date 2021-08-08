module.exports = {
  apps : [
      {
        name: "Botdiz",
        script: "./server_src/server.js",
        watch: ["./server_src", "./src"],
	watch_options: {
		followSymlinks: false
	}
      }
  ]
}

