
 | |
:-|:-:|-:
__Version: 0.1.9__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

[comment]: <> (doc begin)
__pgo__ fully supports _table inheritance_ feature offered by __PostgreSQL__.

Nothing new respect standard concepts of __class inheritance__ in object oriented programming.

```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.VARCHAR(20),
}, {
  postLoad: function() {
    // ...
  }
});

db.model('star', {
  baz: db.JSON,
}, {
  parent: 'foo',
  postLoad: function() {
    // ...
  }
});
```

In the given example _star_ model __inherits__ _foo_ model, this means it inherits all _foo_
attributes (including implicit _id_ attribute) and all _foo_ methods (in this case _postLoad_
only).

When a _star_ object is loaded from db, both _postLoad_ methods will be called against it, in
the order specified by models inheritance: first _foo.postLoad_, then _star.postLoad_.

## True model recognition

One of the most exciting features of __pgo__ is this one!

When retieving _Objects_ from _foo_ model, __pgo__ checks the real type of the _record_ and returns an _Object_ of the appropriate type.

In the example above, reading a _foo Object_ which was saved as a _star Object_, __pgo__ will return a _star Object_ after executing all the _postLoad_ chain against it.
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.9__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
