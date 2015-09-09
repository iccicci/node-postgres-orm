
 | |
:-|:-:|-:
__Version: 0.1.11__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

[comment]: <> (doc begin)
## Example

A simple base usage example is the folowing.

```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.VARCHAR(20),
  baz: {
    type: db.JSON,
    defaultValue: { a: 42, b: ["c", {}] }
  }
});

db.connect(function(err) {
  if(err)
    return console.log(err);

  var foo = new db.models.foo();

  foo.save(function(err) {
    if(err)
      return console.log(err);

    console.log("foo saved");

    db.load.foo({id: 1}, function(err, res) {
      if(err)
        return console.log(err);

      if(! res.length)
        return console.log("no records found");

      console.log(res[0]);
    });
  });
});
```

First of all, require __Pgo__ module and create a new __Pgo__ object for each database to connect.

```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");
```

Define the models.

```javascript
db.model('foo', {
  bar: db.VARCHAR(20),
  baz: {
    type: db.JSON,
    defaultValue: { a: 42, b: ["c", {}] }
  }
});
```

Connect to the database. This step will syncronize the database schema with the defined models.
Starting from here all errors are returned asyncronously.
The first error occurred, if any, breaks the syncronization phase.

```javascript
db.connect(function(err) {
  if(err)
    return console.log(err);

  // the rest of the program goes here
});
```

Create a new object and save it.

```javascript
  var foo = new db.models.foo();

  foo.save(function(err) {
    if(err)
      return console.log(err);

    // the rest of the program goes here
  });
```

Load some ojects.

```javascript
    db.load.foo({id: 1}, function(err, res) {
      if(err)
        return console.log(err);

      if(! res.length)
        return console.log("no records found");

      console.log(res[0]);
    });
```

Loaded objects can be modified and saved as well.
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.11__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
