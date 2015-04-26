# node-postgres-orm

[![NPM](https://nodei.co/npm/pgo.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/pgo/)

PostgreSQL dedicated ORM for node.js with automatic schema sync, table inheritance and much more.

This package is designed __to make easy the process to apply changes to database after model definition changes__, more than offer a quick and easy database access interface.
To apply changes to database after releasing a new version of application is often a frustrating problem, usually solved with migration systems. To apply changes to database
during development stage, often results in a complex sequence of backward and forward steps through migrations; this process is complicated more and more especially when
working in team with concurrent changes to the models (or database schema). This package tries to solve these problems all in once.

## Installation

```sh
npm install pgo
```

## Example

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

## Output example

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

## Error reporting

### Usage error reporting

__Pgo__ _functions_ and _methods_ have syncornous usage error reporting. Exceptions are thrown in case of wrong parameters number or types.
Anyway it should not be required to call __pgo__ _functions_ in a __try catch__ block, this kind of errors should be generated only at development time.

### Data error reporting

Many __pgo__ _methods_ and _function_ have asyncronous error reporting. The __callback__ parameter they accept is a function which is called with
__err__ as first parameter containing error description or __null__ if everithing went well.
This is the way to check data integrity or consistency errors, database connection errors, etc...

## Home page

* https://www.npmjs.com/package/pgo

## Requirements

* PostgreSQL 9.x.x

## Testing

To test this package is strongly required the acces to a __PosgtreSQL__ database. The connection string should
be specified in the _evironment variable_ __PGO_TEST_DB__.

```
$ PGO_TEST_DB="postgres://user:password@host/databse" npm test
```

## Bug report

Please report any bug to [bitbucket tracker](https://bitbucket.org/cicci/node-postgres-orm/issues).

## Documentation

Documentation can be found at [bitbucket wiki](https://bitbucket.org/cicci/node-postgres-orm/wiki/Home).
