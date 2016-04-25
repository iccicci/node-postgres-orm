
 | |
:-|:-:|-:
__Version: 0.1.11__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

- [Fields definition](#markdown-header-fields-definition)
    - [Field attributes](#markdown-header-field-attributes)
        - [defaultValue](#markdown-header-defaultvalue)
        - [notNull](#markdown-header-notnull)
        - [type](#markdown-header-type)
        - [unique](#markdown-header-unique)
- [Options definition](#markdown-header-options-definition)
    - [Options](#markdown-header-options)
        - [attributes](#markdown-header-attributes)
        - [index](#markdown-header-index)
        - [parent](#markdown-header-parent)
        - [primaryKey](#markdown-header-primarykey)
        - [tableName](#markdown-header-tablename)
        - [init, postDelete, postLoad, postSave, preDelete & preSave](#markdown-header-init,-postdelete,-postload,-postsave,-predelete-&-presave)
- [defaultValue Vs init](#markdown-header-defaultvalue-vs-init)

[comment]: <> (doc begin)
__Pgo.model__, the method used to define a model, has two parameters: _fields_ and _options_.
Both of them are JSON objects, the first is used to define the fields of the model, the second
to define model level options.

# Fields definition

Each key of the object _fields_ represents the field name, the value represents the data type and
eventualy the options. A field can be defined in a quick way if it has no specific options or in
a detailed way to specify more options.

In the following example the model _foo_ has two fileds: _bar_ of type __int4__ without
constraints and _baz_ of type __varchar__ with __UNIQUE__ constraint.


```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.INT4,
  baz: {
    type:   db.VARCHAR,
    unique: true
  },
});
```

## Field attributes

### defaultValue

Specifies the default value for the field at database level.

__Pgo.NOW__ is a special __defaultValue__ that can be used for _fields_ of type
__Pgo.TIMESTAMP__.

### notNull

Set the __NOT NULL__ constraint at table definition.

### type

Specifies the _data type_ for the field setting it in table definition.
For more details about possible values, please refere to [Data types](DataTypes.md).

### unique

Set the __UNIQUE__ constraint at table definition.

# Options definition

Options reflect table level options.

## Options

### attributes

It must be an _object_ each element of which will be added as attibute to the __prototype__ of
the __pgo.record__ _subclass_. This can be used to add _class attributes_ or _methods_ to the
_records_ of this __model__.

### index

It must be an _array_ where each element specifies an index for the table. An index has two
attributres:

- field list
- type

There are four ways to define an index. Let's see them.

```javascript
db.model('foo', { // fields definition
}, {
  index: ["bar", "baz"]
});
```

In the previous exmple, table _foos_ will have two indexes: one on field _bar_ the other
on field _baz_.

```javascript
db.model('foo', { // fields definition
}, {
  index: [["bar", "baz"], "bar"]
});
```

In the previous exmple, table _foos_ will have two indexes: one on field couple (_bar_, _baz_)
the other on field _bar_.

```javascript
db.model('foo', { // fields definition
}, {
  index: [{
    fields: "bar",
    type:   "hash",
  }]
});
```

In the previous exmple, table _foos_ will have one index of _hash type_ on field _bar_.

```javascript
db.model('foo', { // fields definition
}, {
  index: [{
    fields: ["bar", "baz"],
    type:   "hash",
  }]
});
```

In the previous exmple, table _foos_ will have one index of _hash type_ on field couple
(_bar_, _baz_). Please note this is just a syntax example: till this documentation was
written muticolumn hash indexes was not supported by __PostgreSQL__.

If _type_ is not specified, by default __PostrgeSQL__ creates indexes of _b-tree type_.

### parent

Specifies the parent model for this model. This will be reflected both on _javascript classes_
hierarchy and on tables hieararchy. for more details please refer to
[Models inheritance](ModelsInheritance.md).

### primaryKey

By default, __pgo__ adds an __id__ _filed_ of _type_ __int8__ with __defaultValue__ from a
_sequence_ as __primary key__ of each _table_. If this _option_ is specified, the default __id__
_filed_ is not added, but the specified _field_ is used as __primary key__. Doing that, __pgo__
sets _true_ __unique__ and __notNull__ attributes of that _field_.

### tableName

By default, __pgo__ creates _tables_ with the name of the _model_ plus __"s"__. Using this option
a differente _table name_ can be specified.

### init, postDelete, postLoad, postSave, preDelete & preSave

Specify the __pgo.record method__ which __pgo__ will run on the appropriate event for each
_record_ created, deleted, read or written from or to database.

The only one which is called with a parameter is __postSave__: that parameter is __true__ if the
__pgo.record.save__ did a _database query_; the parameter is _false_ if __pgo.record.save__ was
called on a _record_ which was not changed and no _database query_ was done.

# defaultValue Vs init

__pgo__ offers two methods to initialize a record: __defaultValue__, which is at _database_
level, has effect on records inserted by other applications; __init__ is at _application_ level.

Following example should clarify the difference.

```javascript
var Pgo = require('pgo');
var db  = new Pgo("postgres://username:password@localhost/database");

db.model('foo', {
  bar: db.INT4,
  baz: {
    type:         db.INT4,
    defaultValue: 10,
  },
}, {
  init: function() {
    this.bar = 12;
  }
});

db.connect(function(err) {
  if(err)
    return;

  var rec = new db.models.foo();

  // here rec has no id attribute
  // here rec.bar is 12
  // here rec has no baz attribute

  rec.save(function(err) {
    if(err)
      return;

    // here rec.id is the unique identifier of the record
    // here rec.bar is 12
    // here rec.baz is 10
  });

  // here rec has no id attribute
  // here rec.bar is 12
  // here rec has no baz attribute
});
```
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.11__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
