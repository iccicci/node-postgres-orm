#node-postgres-orm

PostgreSQL dedicated ORM for node.js with automatic database sync.

This package is designed __to make easy the process to apply changes to database after model definition changes__, more than offer a quick and easy database access interface.
To apply changes to database after releasing a new version of application is often a frustrating problem, usually solved with migration systems. To apply changes to database
during development stage, often results in a complex sequence of backward and forward steps through migrationgs; this process if complicated more and more especially when
working in team with concurrent changes to the models (or database schema). This package tries to solve these problems all in once.

#UNDER DEVELOPMENT

This package is still under development. __Do not use it in a production environment__. This package can be used in development environment of projects going to be live
later than January 2015; doing that and reporting bugs will help us to have a working release as soon as possible.

## Installation

    npm install pgo

## Example

```javascript
var pgo = require('pgo');
var db  = new pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.VARCHAR(20),
  baz: {
    type:db.JSON,
    defaultValue:{a:84}
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
PgOrm: CREATE TABLE foos ()
PgOrm: ALTER TABLE foos ADD COLUMN id int8
PgOrm: UPDATE foos SET id = nextval('foos_id_seq'::regclass) WHERE id IS NULL
PgOrm: ALTER TABLE foos ALTER COLUMN id SET NOT NULL
PgOrm: ALTER TABLE foos ALTER COLUMN id SET DEFAULT nextval('foos_id_seq'::regclass)
PgOrm: ALTER TABLE foos ADD COLUMN bar int4
PgOrm: ALTER TABLE foos ADD COLUMN baz varchar(20)
PgOrm: ALTER TABLE foos ADD CONSTRAINT foo_id_unique UNIQUE(id)
PgOrm: CREATE TABLE bars ()
PgOrm: ALTER TABLE bars ADD COLUMN id int8
PgOrm: UPDATE bars SET id = nextval('bars_id_seq'::regclass) WHERE id IS NULL
PgOrm: ALTER TABLE bars ALTER COLUMN id SET NOT NULL
PgOrm: ALTER TABLE bars ALTER COLUMN id SET DEFAULT nextval('bars_id_seq'::regclass)
PgOrm: ALTER TABLE bars ADD COLUMN foo int4
PgOrm: ALTER TABLE bars ALTER COLUMN foo SET NOT NULL
PgOrm: ALTER TABLE bars ADD COLUMN baz int8
PgOrm: ALTER TABLE bars ALTER COLUMN baz SET NOT NULL
PgOrm: ALTER TABLE bars ADD CONSTRAINT bar_id_unique UNIQUE(id)
PgOrm: ALTER TABLE bars ADD CONSTRAINT bar_baz_fkey FOREIGN KEY (baz) REFERENCES foos (id)
PgOrm: CREATE TABLE bazs () INHERITS (foos)
PgOrm: ALTER TABLE bazs ADD COLUMN tmp json
PgOrm: UPDATE bazs SET tmp = '{"foo":"bar","baz":[1,"foo"]}'::json WHERE tmp IS NULL
PgOrm: ALTER TABLE bazs ALTER COLUMN tmp SET NOT NULL
PgOrm: ALTER TABLE bazs ALTER COLUMN tmp SET DEFAULT '{"foo":"bar","baz":[1,"foo"]}'::json
```

After some changes to the models:

```
PgOrm: UPDATE foos SET baz = 'foo'::character varying WHERE baz IS NULL
PgOrm: ALTER TABLE foos ALTER COLUMN baz SET NOT NULL
PgOrm: ALTER TABLE foos ALTER COLUMN baz SET DEFAULT 'foo'::character varying
PgOrm: ALTER TABLE bars DROP CONSTRAINT bar_baz_fkey
PgOrm: ALTER TABLE bars ALTER COLUMN baz TYPE varchar(20)
PgOrm: ALTER TABLE bars ALTER COLUMN baz DROP NOT NULL
```

## Error reporting

__new pgo()__ and  __pgo.model()__ have syncornous error reporting. Exceptions are thrown in case of error.

All other method have asyncronous error reporting. The __callback__ parameter they accept is a function which is called with __err__ as first parameter containing
error description or __null__ if everithing went well.

## Bug report

Please report any bug to [bitbucket tracker](https://bitbucket.org/cicci/node-postgres-orm/issues).

## Documentatoin

Documentatoin can be found at [bitbucket wiki](https://bitbucket.org/cicci/node-postgres-orm/wiki/Home).

It is __under devolpment__ as well and scheduled at priority lower than unit tests and coverage.
