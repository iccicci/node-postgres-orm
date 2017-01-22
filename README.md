## node-postgres-orm

[![Build Status](https://travis-ci.org/iccicci/node-postgres-orm.png)](https://travis-ci.org/iccicci/node-postgres-orm)
[![Code Climate](https://codeclimate.com/github/iccicci/node-postgres-orm/badges/gpa.svg)](https://codeclimate.com/github/iccicci/node-postgres-orm)
[![Test Coverage](https://codeclimate.com/github/iccicci/node-postgres-orm/badges/coverage.svg)](https://codeclimate.com/github/iccicci/node-postgres-orm/coverage)
[![Donate](http://img.shields.io/bitcoin/donate.png?color=blue)](https://www.coinbase.com/cicci)

[![NPM version](https://badge.fury.io/js/pgo.svg)](https://www.npmjs.com/package/pgo)
[![bitHound Dependencies](https://www.bithound.io/github/iccicci/node-postgres-orm/badges/dependencies.svg)](https://www.bithound.io/github/iccicci/node-postgres-orm/master/dependencies/npm)
[![bitHound Dev Dependencies](https://www.bithound.io/github/iccicci/node-postgres-orm/badges/devDependencies.svg)](https://www.bithound.io/github/iccicci/node-postgres-orm/master/dependencies/npm)

![pgo logo](https://raw.githubusercontent.com/iccicci/node-postgres-orm/double-done/pgo-min.png)

PostgreSQL dedicated ORM for node.js with automatic schema sync, table inheritance and much more.

This package is designed __to make easy the process of applying changes to database after model definition changes__, more than offer a quick and easy database access interface.
Applying changes to database after releasing a new version of application is often a frustrating problem, usually solved with migration systems. Applying changes to database
during development stage, often results in a complex sequence of backward and forward steps through migrations; this process is complicated more and more especially when
working in team with concurrent changes to the models (or database schema). This package tries to solve these problems all in once.

## Table of Contents

* [node-postgres-orm](#node-postgres-orm)
* [Installation](#installation)
* [Error reporting](#error-reporting])
  * [Usage error reporting](#usage-error-reporting)
  * [Data error reporting](#data-error-reporting)
* [Quick Start Example](#quick-start-example)
* [Requirements](#requirements)
* [Testing](#testing)
* [Bugs](#bugs)
* [Documentation](#documentation)
* [Changelog](#changelog)

## Installation

With [npm](https://www.npmjs.com/package/pgo):
```sh
$ npm install --save pgo
```

Back to: [top](#) - [ToC](#table-of-contents)

## Error reporting

### Usage error reporting

__Pgo__ _functions_ and _methods_ have syncornous usage error reporting. Exceptions are thrown in case of wrong
parameters number or types. Anyway it should not be required to call __pgo__ _functions_ in a __try catch__ block,
this kind of errors should be generated only at development time.

### Data error reporting

All __pgo__ _methods_ and _function_ accessing data have asyncronous error reporting to check data integrity or
consistency errors, database connection errors, etc...

__Pgo__ implements the [double done](https://www.npmjs.com/package/double-done) design pattern.

Back to: [top](#) - [ToC](#table-of-contents)

## Quick Start Example

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

db.connect(console.log, function() {
  var foo = new db.models.foo();

  foo.save(console.log, function() {
    console.log("foo saved");

    db.load.foo({id: 1}, console.log, function(res) {
      if(! res.length)
        return console.log("no records found");

      console.log(res[0]);
    });
  });
});
```

### Output example

On db creation:

```
Pgo: CREATE SEQUENCE foos_id_seq
Pgo: CREATE TABLE foos ()
Pgo: ALTER TABLE foos ADD COLUMN id int8
Pgo: UPDATE foos SET id = nextval('foos_id_seq'::regclass) WHERE id IS NULL
Pgo: ALTER TABLE foos ALTER COLUMN id SET NOT NULL
Pgo: ALTER TABLE foos ALTER COLUMN id SET DEFAULT nextval('foos_id_seq'::regclass)
Pgo: ALTER TABLE foos ADD COLUMN bar int4
Pgo: ALTER TABLE foos ADD COLUMN baz varchar(20)
Pgo: ALTER TABLE foos ADD CONSTRAINT foo_id_unique UNIQUE(id)
Pgo: CREATE SEQUENCE bars_id_seq
Pgo: CREATE TABLE bars ()
Pgo: ALTER TABLE bars ADD COLUMN id int8
Pgo: UPDATE bars SET id = nextval('bars_id_seq'::regclass) WHERE id IS NULL
Pgo: ALTER TABLE bars ALTER COLUMN id SET NOT NULL
Pgo: ALTER TABLE bars ALTER COLUMN id SET DEFAULT nextval('bars_id_seq'::regclass)
Pgo: ALTER TABLE bars ADD COLUMN foo int4
Pgo: ALTER TABLE bars ALTER COLUMN foo SET NOT NULL
Pgo: ALTER TABLE bars ADD COLUMN baz int8
Pgo: ALTER TABLE bars ALTER COLUMN baz SET NOT NULL
Pgo: ALTER TABLE bars ADD CONSTRAINT bar_id_unique UNIQUE(id)
Pgo: ALTER TABLE bars ADD CONSTRAINT bar_baz_fkey FOREIGN KEY (baz) REFERENCES foos (id)
Pgo: CREATE TABLE bazs () INHERITS (foos)
Pgo: ALTER TABLE bazs ADD COLUMN tmp json
Pgo: UPDATE bazs SET tmp = '{"foo":"bar","baz":[1,"foo"]}'::json WHERE tmp IS NULL
Pgo: ALTER TABLE bazs ALTER COLUMN tmp SET NOT NULL
Pgo: ALTER TABLE bazs ALTER COLUMN tmp SET DEFAULT '{"foo":"bar","baz":[1,"foo"]}'::json
```

After some changes to the models:

```
Pgo: UPDATE foos SET baz = 'foo'::character varying WHERE baz IS NULL
Pgo: ALTER TABLE foos ALTER COLUMN baz SET NOT NULL
Pgo: ALTER TABLE foos ALTER COLUMN baz SET DEFAULT 'foo'::character varying
Pgo: ALTER TABLE bars DROP CONSTRAINT bar_baz_fkey
Pgo: ALTER TABLE bars ALTER COLUMN baz TYPE varchar(20)
Pgo: ALTER TABLE bars ALTER COLUMN baz DROP NOT NULL
```

## Requirements

* __Node.js 5.0__ or higher.
* __PostgreSQL 9.3__ or higher.

## Testing

To test this package is strongly required the acces to a __PosgtreSQL__ database. The connection string should
be specified in the _evironment variable_ __PGO_TEST_DB__.

```
$ PGO_TEST_DB="postgres://user:password@host/database" npm test
```

System timezone and database timezone must be UTC.

__Pgo__ is tested under a [wide version matrix](https://travis-ci.org/iccicci/node-postgres-orm) of __Node.js__ and
__PostgreSQL__.

Back to: [top](#) - [ToC](#table-of-contents)

## Bugs

Do not hesitate to report any bug or inconsistency [@github](https://github.com/iccicci/node-postgres-orm/issues).

### Known bugs

#### Inheritance in clone

Model inheritance is not respected in __models__ of _cloned_ __Pgo__.

```javascript
var Pgo = require('pgo');
var db1 = new Pgo("postgres://username:password@localhost/database");

db1.model("foo", { a: db.INT4 });
db1.model("bar", { b: db.INT4 }, { parent: "foo" });
db1.connect(console.log, function() {
  var db2  = db1.clone(console.log);
  var foo1 = new db1.models.foo();
  var bar1 = new db1.models.bar();
  var foo2 = new db2.models.foo();
  var bar2 = new db2.models.bar();

  bar1 instanceof db1.models.foo; // true
  bar2 instanceof db2.models.foo; // false; the effect of this bug
  bar2 instanceof db1.models.foo; // true;  this can be used as a workaround
});
```

Back to: [top](#) - [ToC](#table-of-contents)

## Documentation

Documentation can be found at
[documentation index](https://github.com/iccicci/node-postgres-orm/blob/master/doc/Home.md).
__Pay attention:__ this documentation needs to be completely reviewed, it has an old style and may be incomplete. Do
not hesitate to report [@github](https://github.com/iccicci/node-postgres-orm/issues) anything not correct, incomplete
or not working as described.

Back to: [top](#) - [ToC](#table-of-contents)

## Changelog

* 2017-??-?? - v0.2.0
  * Added [double done](https://www.npmjs.com/package/double-done)
