// hierarchy module - website inheritance
// (c)copyright 2014-2015 by Gerald Wodni <gerald.wodni@gmail.com>
"use strict";

var async   = require('async');
var path    = require("path");
var fs      = require("fs");


module.exports = function _hierarchy( k ) {

    var routes = {};
    var websitesRoot = k.kernOpts.websitesRoot;

    /* locate by hierarchy: cut subdomains, then check 'default' folder  */
    function lookupFile( website, filename ) {

        /* file found */
        var filePath = path.join( websitesRoot, website, filename ) 
        //console.log( "LookUp:", filePath );
        if( fs.existsSync( filePath ) )
            return filePath;

        /* check for route */
        if( website in routes )
            return lookupFile( routes[website], filename ); 

        /* cut next subdomain */
        var firstDot = website.indexOf(".");
        if( firstDot >= 0 )
            return lookupFile( website.substring( firstDot + 1 ), filename );

        /* if we are at TLD, check default */
        if( website !== "default" )
            return lookupFile( "default", filename );

        /* nothing in default, just fail */
        return null;
    }

    function lookupFileThrow( website, filename ) {
        var filePath = lookupFile( website, filename );
        if( filePath == null ) {
            var err = new Error( "Not Found: '" + filename + "'" ); 
            err.status = 404;
            throw err;
        }

        return filePath;
    }

    /* locate by hierarchy: cut subdomains, then check 'default' folder  */
    function up( website ) {
        if( website in routes )
            return routes[website];

        /* cut next subdomain */
        var firstDot = website.indexOf(".");
        if( firstDot >= 0 )
            return website.substring( firstDot + 1 );

        /* if we are at TLD, check default */
        if( website !== "default" )
            return "default";

        /* nothing in default, just fail */
        return null;
    }

    function upParts( website ) {
        var parts = [ website ];
        var part = website;

        while( part = up( part ) )
            parts.push( part );

        return parts;
    }

    /* go up until directory exists */
    function upExists( website, dir ) {
        while( true ) {
            website = up( website );
            if( website == null )
                return null;

            var dirPath = path.join( websitesRoot, website, dir || '' );
            if( fs.existsSync( dirPath ) )
                return website;
        }
    }

    function paths( website, dir ) {
        var paths = []

        /* prepend dummy to include website itself */
        website = "dummy." + website;

        while( true ) {
            website = upExists( website, dir );

            if( website == null )
                break;

            paths.push( path.join( websitesRoot, website, dir || '' ) );
        }

        return paths;
    }

    /* get website without any subdomain */
    function website( website ) {
        return upExists( "dummy." + website );
    }

    /* add custom route to hierary */
    function addRoute( source, target ) {
        routes[ source ] = target;
    }

    /* stream wrappers */
    function createReadStream( website, filename ) {
        var filepath = lookupFile( website, filename );
        return fs.createReadStream( filepath || "" );
    }

    function createWriteStream( _website, filename ) {
        var filepath = path.join( websitesRoot, website( _website ), filename );
        return fs.createWriteStream( filepath ); 
    }

    function readTree( opts, callback ) {
        var tree = { dirs: {}, files: [] };

        /* queue worker */
        var treeQueue = async.queue( function( task, next ) {

            /* directory contents */
            fs.readdir( task.dirpath, function( err, filenames ) {
                if( err )
                    return next( err );

                /* run stat for content */
                async.mapSeries( filenames, function( filename, d ) {
                    var filepath = path.join( task.dirpath, filename );
                    fs.stat( filepath, function( err, stat ) {
                        if( err )
                            return d( err );

                        /* spawn new worker for every directory */
                        if( stat.isDirectory() ) {
                            var prefix = path.join( task.prefix, filename ); 
                            var newTree = { dirs: {}, files: [], prefix: task.prefix, path: prefix };
                            task.tree.dirs[ filename ] = newTree;
                            treeQueue.push( { dirpath: filepath, tree: newTree, prefix: prefix } );
                        }
                        /* just add file */
                        else {
                            var link = path.join( task.prefix, filename );
                            task.tree.files.push( { name: filename, link: link } );
                        }
                        d();
                    });
                }, next );
            });
        });

        /* all done, callback */
        treeQueue.drain = function( err ) {
            callback( err, tree );
        };
        treeQueue.push( { dirpath: opts.dirpath, tree: tree, prefix: opts.prefix || "" } );
    }

    function readHierarchyTree( website, dirpath, opts, callback ) {
        if( typeof callback === "undefined" ) {
            callback = opts;
            opts = {};
        }

        var filepath = lookupFile( website, dirpath );
        if( filepath == null )
            return callback( new Error( "No Directory" ) );

        opts.dirpath = filepath;
        readTree( opts, callback );
    }


    return {
        addRoute:           addRoute,
        createReadStream:   createReadStream,
        createWriteStream:  createWriteStream,
        lookupFile:         lookupFile,
        lookupFileThrow:    lookupFileThrow,
        readTree:           readTree,
        readHierarchyTree:  readHierarchyTree,
        up:                 up,
        upParts:            upParts,
        upExists:           upExists,
        paths:              paths,
        website:            website
    }
}
