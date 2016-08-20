Use Broccoli without the server
===

`broccoli-watch path/to/media/output` (equivalent to) 
`$(node -e 'console.log(require.resolve("broccoli-watch"))') dist`

I like having a build script without arguments, and broccoli's watch feature is incredible. Unfortunately it's command line only actually uses it when it's made a local server, which I don't much care for.
