# node-postgres-orm

[![Build Status][travis-badge]][travis-url]
[![Code Climate][code-badge]][code-url]
[![Test Coverage][cover-badge]][code-url]
[![Donate][donate-badge]][donate-url]

[![NPM version][npm-badge]][npm-url]
[![NPM downloads][npm-downloads-badge]][npm-url]
[![Dependencies][dep-badge]][dep-url]
[![Dev Dependencies][dev-dep-badge]][dev-dep-url]

[code-badge]: https://codeclimate.com/github/iccicci/node-postgres-orm/badges/gpa.svg
[code-url]: https://codeclimate.com/github/iccicci/node-postgres-orm
[cover-badge]: https://codeclimate.com/github/iccicci/node-postgres-orm/badges/coverage.svg
[dep-badge]: https://david-dm.org/iccicci/node-postgres-orm.svg
[dep-url]: https://david-dm.org/iccicci/node-postgres-orm
[dev-dep-badge]: https://david-dm.org/iccicci/node-postgres-orm/dev-status.svg
[dev-dep-url]: https://david-dm.org/iccicci/node-postgres-orm?type=dev
[donate-badge]: https://badgen.net/badge/donate/bitcoin?icon=bitcoin
[donate-url]: https://blockchain.info/address/1Md9WFAHrXTb3yPBwQWmUfv2RmzrtbHioB
[npm-downloads-badge]: https://badgen.net/npm/dm/pgo?icon=npm
[npm-badge]: https://badgen.net/npm/v/pgo?color=green&icon=npm
[npm-url]: https://www.npmjs.com/package/pgo
[travis-badge]: https://badgen.net/travis/iccicci/node-postgres-orm?icon=travis
[travis-url]: https://travis-ci.org/iccicci/node-postgres-orm?branch=master

![pgo logo](https://raw.githubusercontent.com/iccicci/node-postgres-orm/master/logo/pgo-min.png)

PostgreSQL dedicated ORM for node.js with automatic schema sync, table inheritance and much more.

This package is designed **to make easy the process of applying changes to database after model definition changes**, more than offer a quick and easy database access interface.
Applying changes to database after releasing a new version of application is often a frustrating problem, usually solved with migration systems. Applying changes to database
during development stage, often results in a complex sequence of backward and forward steps through migrations; this process is complicated more and more especially when
working in team with concurrent changes to the models (or database schema). This package tries to solve these problems all in once.

# Table of Contents

- [node-postgres-orm](#node-postgres-orm)
- [Installation](#installation)
- [Quick Start Example](#quick-start-example)
  - [First script example](#first-script-example)
  - [First output example](#first-output-example)
  - [Second script example](#second-script-example)
  - [Second output example](#second-output-example)
- [Error reporting](#error-reporting])
  - [Usage error reporting](#usage-error-reporting)
  - [Data error reporting](#data-error-reporting)
- [Requirements](#requirements)
- [Testing](#testing)
- [Bugs](#bugs)
- [Documentation](#documentation)
- [Changelog](#changelog)

# Installation

With [npm](https://www.npmjs.com/package/pgo):

```sh
$ npm install --save pgo
```

Back to: [top](#) - [ToC](#table-of-contents)

# Quick Start Example

## First script example

Running following script:

```javascript
var Pgo = require("../lib/pgo");
var db = new Pgo(process.env.PGO_TEST_DB);

db.model("foo", {
  bar: db.INT4,
  baz: {
    type: db.JSON,
    defaultValue: { a: 42, b: ["c", {}] },
  },
});

db.model("bar", {
  baz: { type: db.INT4, notNull: true },
  foo: db.FKEY("foo"),
});

db.connect(console.log, function () {
  var foo = new db.models.foo();

  foo.save(console.log, function () {
    console.log("foo saved");

    db.load.foo({ id: 1 }, console.log, function (res) {
      if (!res.length) return console.log("no records found");

      console.log(res[0]);
      db.end();
    });
  });
});
```

## First output example

we will obtain following output:

```
Pgo: CREATE SEQUENCE foos_id_seq
Pgo: CREATE TABLE foos ()
Pgo: ALTER TABLE foos ADD COLUMN id int8
Pgo: ALTER TABLE foos ALTER COLUMN id SET DEFAULT nextval('foos_id_seq'::regclass)
Pgo: UPDATE foos SET id = nextval('foos_id_seq'::regclass) WHERE id IS NULL
Pgo: ALTER TABLE foos ALTER COLUMN id SET NOT NULL
Pgo: ALTER TABLE foos ADD COLUMN bar int4
Pgo: ALTER TABLE foos ADD COLUMN baz json
Pgo: ALTER TABLE foos ALTER COLUMN baz SET DEFAULT '{"a":42,"b":["c",{}]}'::json
Pgo: UPDATE foos SET baz = '{"a":42,"b":["c",{}]}'::json WHERE baz IS NULL
Pgo: ALTER TABLE foos ALTER COLUMN baz SET NOT NULL
Pgo: ALTER TABLE foos ADD CONSTRAINT foo_id_unique UNIQUE(id)
Pgo: CREATE SEQUENCE bars_id_seq
Pgo: CREATE TABLE bars ()
Pgo: ALTER TABLE bars ADD COLUMN id int8
Pgo: ALTER TABLE bars ALTER COLUMN id SET DEFAULT nextval('bars_id_seq'::regclass)
Pgo: UPDATE bars SET id = nextval('bars_id_seq'::regclass) WHERE id IS NULL
Pgo: ALTER TABLE bars ALTER COLUMN id SET NOT NULL
Pgo: ALTER TABLE bars ADD COLUMN baz int4
Pgo: ALTER TABLE bars ALTER COLUMN baz SET NOT NULL
Pgo: ALTER TABLE bars ADD COLUMN foo int8
Pgo: ALTER TABLE bars ALTER COLUMN foo SET NOT NULL
Pgo: ALTER TABLE bars ADD CONSTRAINT bar_id_unique UNIQUE(id)
Pgo: ALTER TABLE bars ADD CONSTRAINT bar_foo_fkey FOREIGN KEY (foo) REFERENCES foos (id)
Pgo: INSERT INTO foos DEFAULT VALUES :: []
foo saved
Pgo: SELECT tableoid, * FROM foos WHERE id = $1 :: [1]
foo { id: '1', bar: null, baz: { a: 42, b: [ 'c', {} ] } }
```

## Second example script:

Changeing the script as follows and running it:

```javascript
var Pgo = require("../lib/pgo");
var db = new Pgo(process.env.PGO_TEST_DB);

db.model("foo", {
  bar: db.INT4,
  baz: {
    type: db.JSON,
    defaultValue: { a: 42, b: ["c", {}] },
  },
});

db.model("bar", {
  baz: db.INT4,
  foo: db.VARCHAR(20),
});

db.connect(console.log, function () {
  var foo = new db.models.foo();

  foo.save(console.log, function () {
    console.log("foo saved");

    db.load.foo({ id: 1 }, console.log, function (res) {
      if (!res.length) return console.log("no records found");

      console.log(res[0]);
      db.end();
    });
  });
});
```

the diff is:

```
 db.model('bar', {
-    baz: { type: db.INT4, notNull: true },
-    foo: db.FKEY('foo')
+    baz: db.INT4,
+    foo: db.VARCHAR(20)
 });
```

## Second output example

we will obtain following output:

```
Pgo: ALTER TABLE bars DROP CONSTRAINT bar_foo_fkey
Pgo: ALTER TABLE bars ALTER COLUMN baz DROP NOT NULL
Pgo: ALTER TABLE bars ALTER COLUMN foo TYPE varchar(20)
Pgo: ALTER TABLE bars ALTER COLUMN foo DROP NOT NULL
Pgo: INSERT INTO foos DEFAULT VALUES :: []
foo saved
Pgo: SELECT tableoid, * FROM foos WHERE id = $1 :: [1]
foo { id: '1', bar: null, baz: { a: 42, b: [ 'c', {} ] } }
```

Back to: [top](#) - [ToC](#table-of-contents)

# Error reporting

## Usage error reporting

**Pgo** _functions_ and _methods_ have syncornous usage error reporting. Exceptions are thrown in case of wrong
parameters number or types. Anyway it should not be required to call **pgo** _functions_ in a **try catch** block,
this kind of errors should be generated only at development time.

## Data error reporting

All **pgo** _methods_ and _function_ accessing data have asyncronous error reporting to check data integrity or
consistency errors, database connection errors, etc...

**Pgo** implements the [double done](https://www.npmjs.com/package/double-done) design pattern.

Back to: [top](#) - [ToC](#table-of-contents)

# Requirements

- **Node.js 4.0** or higher.
- **PostgreSQL 9.3** or higher.

Back to: [top](#) - [ToC](#table-of-contents)

# Testing

To test this package is strongly required the acces to a **PosgtreSQL** database. The connection string should
be specified in the _evironment variable_ **PGO_TEST_DB**.

```
$ PGO_TEST_DB="postgres://user:password@host/database" npm test
```

Database timezone must be UTC.

**Pgo** is tested under a [wide version matrix](https://travis-ci.org/iccicci/node-postgres-orm) of **Node.js** and
**PostgreSQL**.

Back to: [top](#) - [ToC](#table-of-contents)

# Bugs

Do not hesitate to report any bug or inconsistency [@github](https://github.com/iccicci/node-postgres-orm/issues).

## Known bugs

### Inheritance in clone

Model inheritance is not respected in **models** of _cloned_ **Pgo**.

```javascript
var Pgo = require("pgo");
var db1 = new Pgo("postgres://username:password@localhost/database");

db1.model("foo", { a: db.INT4 });
db1.model("bar", { b: db.INT4 }, { parent: "foo" });
db1.connect(console.log, function () {
  var db2 = db1.clone(console.log);
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

# Documentation

Documentation can be found at
[documentation index](https://github.com/iccicci/node-postgres-orm/blob/master/doc/Home.md).
**Pay attention:** this documentation needs to be completely reviewed, it has an old style and may be incomplete. Do
not hesitate to report [@github](https://github.com/iccicci/node-postgres-orm/issues) anything not correct, incomplete
or not working as described.

Back to: [top](#) - [ToC](#table-of-contents)

# Changelog

- 2020-04-28 - v0.2.3
  - Dependencies, Node.js & PostgreSQL versions review
- 2017-05-24 - v0.2.1
  - README review
- 2017-01-22 - v0.2.0
  - Added [double done](https://www.npmjs.com/package/double-done)

Back to: [top](#) - [ToC](#table-of-contents)
