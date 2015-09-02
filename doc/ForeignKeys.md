
 | |
:-|:-:|-:
__Version: 0.1.9__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

- [Syntax](#markdown-header-syntax)
- [Database](#markdown-header-database)
- [Access](#markdown-header-access)
- [Example](#markdown-header-example)

[comment]: <> (doc begin)
For detaild about _foreign keys_, please refer to PostreSQL documentation.

The __FKEY__ pseudo type is used to instruct __pgo__ to create a _foreign key_ on database.

# Syntax

```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.VARCHAR,
});

db.model('baz', {
  bar: db.FKEY('foo'),
  foo: db.FKEY('foo', 'bar'),
});
```

In the example above, table __baz__ has two _foreign keys_ on the table __foo__.

The first one on field __id__ (_as default_), and the second one on field __bar__.

# Database

Whith this simple syntax __pgo__ will create:
* a filed of the same type of the referred one
* the __FOREIGN KEY__ constraint
* the __INDEX__ required to enforce the constraint

# Access

In the example above, the two attributes __bar__ and __foo__ of a _record_ of type __baz__ will be repectively of type __INT8__ and __VARCHAR__ and they will have the value the record has in database.

To access the relative __foo__ record, the standard __pgo__._&lt;table_name>_._load()_ function can be used. More than this a quick method is added to the _record_: __record__._&lt;field_name>Load()_ wich expects in input a _callback_ function.

# Example

```javascript
db.baz.load({id: 1}, fnction(err, res) {
  if(err || ! res.length)
    return;

  res[0].barLoad(function(err, res) {
    if(err || ! res.length)
      return;

    // res[0] is the referenced foo record
  });
});
```
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.9__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
