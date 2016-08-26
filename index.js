#!/usr/bin/env node
var fs = require('fs-extra');
var path = require('path');
var broccoli = require('broccoli');
var RSVP = require('rsvp')

var args = process.argv.slice(2);
var outputDir = args[0];
if (!outputDir) {
    console.error("outputDir must be supllied");
    process.exit(1);
}

var projectRoot = process.cwd();
outputDir = path.join(projectRoot, outputDir);
console.log("writing to " + outputDir);

process.chdir(projectRoot);
var tree = broccoli.loadBrocfile();
var builder = new broccoli.Builder(tree);

function logBuildError(error) {
    var stack = '';
    console.error('== [ERROR] =====');
    if (error.file) {
        console.error('File: ' + error.file)
    }
    if (error instanceof SyntaxError) {
        error.stack.split('\n').forEach(function (line) {
            if (!line.match(/^\s*at /)) {
                stack += line + "\n";
            }
        });
    } else {
        stack = error.stack;
    }
    console.error(stack);
    console.error('================');
    console.error('Build failed')
}

function watch() {
    return new RSVP.Promise(function(resolve, reject) {
        new broccoli.Watcher(builder, {
            verbose: false
        })
        .on('change', function (hash) {
            fs.copySync(hash.directory, outputDir, {
                clobber: true,
                dereference: true
            });
            console.log("rebuilt");
        })
        .on('error', function (error) {
            console.log("error");
            if (error.type == 'ENOENT') {
                return reject(error);
            }
            logBuildError(error);
        });
    });
}

function start() {
    // build()
    // .then(watch)
    watch()
    .catch(function (error) {
        console.error("==== EPIC FAILURE ===");
        console.error(error);
        start();
    });
}
start();
process.on('SIGINT', process.exit);
process.on('SIGTERM', process.exit);
process.on('SIGHUP', process.exit);
