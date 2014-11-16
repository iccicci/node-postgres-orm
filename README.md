#node-postgres-orm

PostgreSQL dedicated ORM for node.js with automatic database sync.

## Installation

    npm install pgo

## Example

```javascript
var pgo = require('pgo');
var conString = "postgres://username:password@localhost/database";

pgo.model('foo', {
  bar: pgo.VARCHAR(20),
  baz: {
    type:db.JSON,
    defaultValue:{a:84}
  }
});

db.connect(conString, function(err) {
	if(err)
		return console.log(err);

  var foo = new pgo.models.foo();

  foo.save(function(err) {
	if(err)
		return console.log(err);

	console.log("foo saved");
  });
});
```

## Error reporting

__pgo.model__ has syncornous error reporting. Exceptions are thrown in case of error

All other method have asyncronous error reporting. The __callback__ parameter they accept is a function which is called with __err__ as first parameter containing error description or null if everithing went well.

## Bug report

Please report any bug to [bitbucket tracker](https://bitbucket.org/cicci/node-postgres-orm/issues).

## Documentatoin

For a complete (I hope) reference take a look to [bitbucket wiki](https://bitbucket.org/cicci/node-postgres-orm/wiki/Home).
