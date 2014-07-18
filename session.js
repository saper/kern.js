// Session + Redis Store
// (c)copyright 2014 by Gerald Wodni <gerald.wodni@gmail.com>

var crypto  = require("crypto");
var moment  = require("moment");
var _       = require("underscore");
var defaults = {
    cookie: "kernSession",
    timeout: 30 /* in seconds */
}

/* rdb: redis database */
function session( rdb, opts ) {

    opts = _.extend( defaults, opts );

    if( !( "key" in opts ) )
        opts.key = crypto.pseudoRandomBytes( 256 );

    /* callback( randomaHashed ) */
    function randomHash( callback ) {
        crypto.pseudoRandomBytes(256, function( ex, buf) {
            var hash = crypto.createHmac( "sha256", opts.key );
            hash.update( buf );

            callback( hash.digest( "hex" ) );
        });
    }

    function sessionKey( req ) {
        return "session:" + req.kern.website + ":" + req.sessionId;
    }

    function setCookie( req, res ) {
        res.cookie( opts.cookie, req.sessionId, { httpOnly: true, maxAge: opts.timeout * 1000 } );
    }

    function start( req, res, next ) {
        if( typeof req.session !== "undefined" )
            throw "Session already started";

        randomHash( function( id ) {
            req.sessionId = id;
            req.session = {
            }

            var key = sessionKey( req );
            rdb.hset( key, "session:started", moment().format( "YYYY-MM-DD hh:mm:ss" ) );
            rdb.expire( key, opts.timeout );

            setCookie( req, res );
            next();
        });

    };

    function load( req, res, next ) {

        var key = sessionKey( req );
        rdb.expire( key, opts.timeout );
        setCookie( req, res );

        rdb.hgetall( key, function( err, values) {
            req.session = values;
            req.session["session:activity"] = moment().format( "YYYY-MM-DD hh:mm:ss" );
            console.log( "LOAD session", req.sessionId );
            next();
        });
    };

    function save( req, res, next ) {
        /* start saving the session */
        console.log( "SAVE session", req.sessionId );
        if( req.session && !req.session.logout ) {
            var sKey = sessionKey( req );
            _.map( req.session, function( value, key ) {
                rdb.hset( sKey, key, value );
            });
        }

        /* no need to wait for redis to finish */
        next();
    };

    function destroy( req, res, next ) {
        if( req.session ) {
            res.clearCookie( opts.cookie );
            rdb.del( sessionKey( req ) );

            req.session.logout = true;
        }

        next();
    }

    return function( req, res, next ) {

        /* add interface hooks */
        req.sessionInterface = {
            start: start,
            save: save
        }

        /* if kernSession-cookie exists, attempt to load session */
        if( req.cookies && opts.cookie in req.cookies ) {
            req.sessionId = req.cookies[ opts.cookie ];
            load( req, res, next );
        }
        else
            start( req, res, next );
    };
}

module.exports = session;

