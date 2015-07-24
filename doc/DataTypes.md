__pgo__ implements only a subset of __PostgreSQL__ native data types. Support for other data
types may be requestes as new feature at
[bitbucket tracker](https://bitbucket.org/cicci/node-postgres-orm/issues).

# Native data types

Data are usually represented using __javascript native data types__, converted in __PostgreSQL
native data types__ during DB write operations and converted back during DB read operations.

## The INT8 exception

The only exception to previous rule is due javascript lack of 64 bit integer number native data
type. __INT8__ data is converted in __string__ while reading it from DB.

More details about this topic at __node-postgres__
[documentation](https://github.com/brianc/node-postgres/wiki/pg#pgdefaultsparseint8).

## Types

### JSON

Used to store data in __json__ format. All nested data are sored in (and loaded from) database.

### INT2
Used to store integer numbers. 16 bits precision.

### INT4
Used to store integer numbers. 32 bits precision.

### INT8
Used to store integer numbers. 64 bits precision.

### TIMESTAMP
Used to store dates and times. A precision between 0 and 6 (as per __PostgreSQL__
specifications) for second fractions can be specified. The special __Pgo.NOW defaultValue__ can
be used to make _now()_ the default value for each new record. In the following example model
_foo_ has a _bar_ attribute of type timestamp with precision up to milliseconds and with a
default value of the time when each record is inserted.

```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.TIMESTAMP(3),
  baz: {
    type: db.TIMESTAMP,
    defaultValue: db.NOW
  }
});
```

### VARCHAR
Used to store strings. A maximum string length may be specified. In the following example model _foo_
has a _bar_ attribute of type string with a maximum length of 20 characters and a _baz_ attribute of
type string without any limit on the length.

```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.VARCHAR(20),
  baz: db.VARCHAR
});
```

## Pseudo data types

### FKEY

Used to specify a __FOREIGN KEY__ to another table. More details in [Foreign keys](ForeignKeys.pm)
documentation.
