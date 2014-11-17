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

__pgo.model__ has syncornous error reporting. Exceptions are thrown in case of error

All other method have asyncronous error reporting. The __callback__ parameter they accept is a function which is called with __err__ as first parameter containing error description or null if everithing went well.

## Bug report

Please report any bug to [bitbucket tracker](https://bitbucket.org/cicci/node-postgres-orm/issues).

## Documentatoin

For a complete (I hope) reference take a look to [bitbucket wiki](https://bitbucket.org/cicci/node-postgres-orm/wiki/Home).
