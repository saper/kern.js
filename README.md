kern.js
=======
Web-framework for web-applications, also features multi-domain content management with redundancy elimination .

## Under Construction
Currently *KERN ][* or *kern 2* is written in PHP (30k+ lines), this is a rewrite for node.js .
As I was often asked to make the PHP version open source, this new rewrite will be free software from the beginning,
if you are unhappy with GPLv3, write me an email, we can arrange a dual-license for your business case.

## Install
npm and bower are required to be installed globally. Then install the dependencies:

```
npm install
bower install
npm start
```

## tl;dr - gets you started in 10 minutes
Very simple example to get a website up and running after installation:
In the websites directory, create a folder named by a domain pointing to your server i.e. *example.com* .
Create a file *site.js* in the directory *websites/example.com* with the following content:
```
module.exports = {
    setup: function( k ) {
        k.router.get("/", function( req, res ) {
            res.send("Is it really that simple?");
        });
    }
};
```
now run `npm start` and you should reach kern.js via browser getting "Is it really that simple" as plain response.

As you might be heavily dissatisfied by the format of this plain text let's add some markup.
Create a folder `websites/example.com/views`, and add the following `layout.jade` file:
```
doctype html
html
    head
        title kern.js - tl;dr
        link(rel="stylesheet", type="text/css" href="/css/index.css")
    body
        h1 kern.js - tl;dr
        p If I would read the other sections instead I'd be able to accomplish astonishing stuff with kern.js ;)
```
now adopt *site.js* to serve jade instead of plain text:
```
module.exports = {
    setup: function( k ) {
        k.router.get("/", function( req, res ) {
            k.jade.render( req, res, "home" );
        });
    }
};
```
Still interested? Read on! :D


## Websites Hierarchy
Each directory in the websites-folder represents a website and should offer a valid domain name.
When files are required (server- or client-side), they are searched for in a hierarchical pattern.
For example when www.example.com/images/lol.png is requested, it is searched for in the following order:
- www.example.com/images/lol.png
- example.com/images/lol.png
- com/images/lol.png
- default/images/lol.png

The first match is sent as response to the client.
The hierarchy can be influenced by a site-config (see section "Site Config"), i.e. assume the following configuration *example.com/config.json*:
```
{
    ".*": {
        "hierarchyUp": "wodni.at",
    }
}
```
would yield the following search pattern:
- www.example.com/images/lol.png
- example.com/images/lol.png
- wodni.at/images/lol.png
- at/images/lol.png
- default/images/lol.png

This search order is also applied to site-modules, less-include and most other subsystems.
Overall the hierarchy allows you to eliminate lots of redundancy for your websites, and makes it easy to reuse existing functionality.

## site.js (each website's main script)
*TODO*

## Site Modules
*TODO*

## Administration Modules
*TODO*

## Data
*TODO*
### data.js (website's main data-description)
Contains the data-model description for a website. Returns an object containing CRUDs, which can be received in any site-script by calling k.getData().
Example file:
```
module.exports = {
    setup: function( k ) {

        var connection = k.getDb();

        var groups = k.crud.sql( connection, {
            table: "groups",
            foreignKeys: {
                user:   { crud: k.users, unPrefix: true }
            }
        } );
        var devices = k.crud.sql( connection, {
            selectListQuery: "SELECT `devices`.`id`, `devices`.`name`, `groups`.`name` AS `groupName` FROM `devices` INNER JOIN `groups` ON `groups`.`id`=`devices`.`group` ORDER BY `groupName`, `name`",
            table: "devices",
            foreignBoldName: 'groupName',
            foreignKeys: {
                group:  { crud: groups }
            }
        });

        return {
            devices:    devices,
            groups:     groups
        };
    }
}
```

### Database
*TODO*
### Redis
*TODO*

## postman, getman, requestman & filters
Input sanitization for:
- getman: GET parameters, parameters from the url-query string i.e. `/search?needle=foobar`
- postman: POST parameters (form-encoded POST)
- requestman: express-js url-parameters i.e. `'/api/items/get/:id'`

### getman & requestman
getman and requestman are called in plain sequence within a request i.e.:
```
k.router.get("/articles/:id", function( req, res, next ) {
    k.requestman( req );
    db.query( "SELECT * FROM articles WHERE id=?", [ req.requestman.uint('id') ], function( err, data ) {
        if( err ) return next( err );
        if( data.length == 0 )
            return k.httpStatus( req, res, 404 );
        k.jade.render( req, res, "article", data[0] );
    });
});
```

### postman
postman on the other hand needs to wait for the request-body to be processed, so a callback needs to be specified:
```
k.router.post("/article/new", function( req, res, next ) {
    k.postman( req, res, function() {
        db.query( "INSERT INTO articles (time, title, text) VALUES( NOW(), ?, ? )",
            [ req.postman.singleLine( 'title' ), req.postman.text( 'text' ) ],
        function( err, result ) {
            if( err ) return next( err );
            res.json( { success: true, id: result.insertId } );
        });
    });
});
```
if postman receives 'application/json' as Content-Type, it replaces req.body with a parsed JSON object.

### filters
All three methods use the same sanitization filters.
Each filter is impleemented as a function which expects the only argument to be the name of the parameter.
If no parameter-name is passed, the function will assume its own function-name as parameter-name.
i.e. `req.postman.id()` is the same as calling `req.postman.id('id')`.

Here is a list of the currently implemented filters. Currently they are maintained for English and German. Feel free to submit your own language.
- address:    `/[^-,.\/ a-zA-Z0-9äöüßÄÖÜ]/g`
- allocnum:   `/[^a-zA-Z0-9äöüßÄÖÜ]/g`
- alpha:      `/[^a-zA-Z]/g`
- alnum:      `/[^a-zA-Z0-9]/g`
- alnumList:  `/[^,a-zA-Z0-9]/g`
- boolean:    `/[^01]/g`
- color:      `/[^#a-fA-F0-9]/g`
- dateTime:   `/[^-: 0-9]/g`
- decimal:    `/[^-.,0-9]/g` and replace ',' with '.'
- email:      `/[^-@+_.0-9a-zA-Z]/g`
- escapedLink:decodeURIComponent and `/[^-_.a-zA-Z0-9\/]/g`
- filename:   `/[^-_.0-9a-zA-Z]/g`
- hex:        `/[^-0-9a-f]/g`
- id:         `/[^-_.:a-zA-Z0-9]/g`
- int:        `/[^-0-9]/g`
- link:       `/[^-_.a-zA-Z0-9\/]/g`
- linkItem:   `/[^-_.a-zA-Z0-9]/g`
- linkList:   `/[^-,_.a-zA-Z0-9]/g`
- password:   no manipulation
- raw:        no manipulation
- singleLine: `/[^-_\/ a-zA-Z0-9äöüßÄÖÜ]/g`
- telephone:  `/[^-+ 0-9]/g`
- text:       no manipulation
- uint:       `/[^0-9]/g`
- url:        `/[^-?#@&,+_.:\/a-zA-Z0-9]/g`
- username:   `/[^-@_.a-zA-Z0-9]/g`
- renameFile: replace non-ascii chars by synonyms i.e. 'ä' becomes 'ae'

## Users & Sessions
*TODO*

## Hooks
*TODO*

## Site Config
A website-directory can contain a config.json file.
Example file:
```
{
    "ganymed": {
        "hierarchyUp": "example.com",
        "mysql":  {
            "user"      : "username",
            "database"  : "development",
            "password"  : "asd",
            "multipleStatements": true
        },
        "autoload": true
    },
    ".*": {
        "hierarchyUp": "example.com",
        "mysql":  {
            "host"      : "1.2.3.4",
            "user"      : "username",
            "database"  : "producation",
            "password"  : "asd",
            "multipleStatements": true }
    }
}
```
The root object's keys add as guards to the configuration objects. The keys are evaluated as regular expressions against the system's host name.
First matching key's object is used as configuration for the website (*Attention:* I am not very happy with this behavior, might be changed to extend all matching objects, or even respect other configurations found in the hierarchy's search order.

### Configuration Options
- **autoload** *boolean* executes the site's setup-function on kern startup if true
- **mysql** *object* specifies the mysql-connection, see [node-mysql](https://github.com/felixge/node-mysql/)
- **hierarchyUp** *string* used as next hierarchy-step in the search order, see *Website Hierarchy*
- **custom** *object* you can add other configuration values for your modules 
