#!/usr/bin/env node
var path = require('path');
var broccoli = require('broccoli');
var copyDereferenceSync = require('copy-dereference').sync;
var rimrafSync = require('rimraf').sync;
var RSVP = require('rsvp')

var args = process.argv.slice(2);
var outputDir = args[0];
if (!outputDir) {
    console.error("outputDir must be supllied");
    process.exit(1);
}

var projectRoot = path.resolve(__dirname);
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

function build() {
    return new RSVP.Promise(function (resolve, reject) {
        builder.cleanup()
        .then(function () {
            return builder.build();
        })
        .then(function (hash) {
            rimrafSync(outputDir);
            copyDereferenceSync(hash.directory, outputDir);
        })
        .then(function () {
            console.log("built to", outputDir);
            resolve();
        })
        .catch(function (error) {
            logBuildError(error);
            resolve();
        });
    });
}

function createWatcher() {
    var isCleaning = false;
    new broccoli.Watcher(builder, {
        verbose: false
    })
    .on('change', function (hash) {
        if (isCleaning) {
            console.log("Can't update. Cleaning.");
            return;
        }
        rimrafSync(outputDir);
        copyDereferenceSync(hash.directory, outputDir);
    })
    .on('error', function (error) {
        logBuildError(error);
        isCleaning = true;
        builder.cleanup()
            .then(function () {
                isCleaning = false;
                console.log('Cleaned tmp tree');
            })
            .catch(function () {
                isCleaning = false;
                console.error('Failed to clean');
            });
    });
}
function watch() {
    return new RSVP.Promise(function(resolve, reject) {
        new broccoli.Watcher(builder, {
            verbose: false
        })
        .on('change', function (hash) {
            console.log("changed");
            rimrafSync(outputDir);
            copyDereferenceSync(hash.directory, outputDir);
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
    build()
    .then(watch)
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
