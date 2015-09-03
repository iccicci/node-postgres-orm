
 | |
:-|:-:|-:
__Version: 0.1.10__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

- [Constructor](#markdown-header-constructor)
- [Data types](#markdown-header-data-types)
    - [FKEY](#markdown-header-fkey)
    - [JSON](#markdown-header-json)
    - [INT2](#markdown-header-int2)
    - [INT4](#markdown-header-int4)
    - [INT8](#markdown-header-int8)
    - [TIMESTAMP](#markdown-header-timestamp)
    - [VARCHAR](#markdown-header-varchar)
- [Default Values](#markdown-header-default-values)
    - [NOW](#markdown-header-now)
- [Methods](#markdown-header-methods)
    - [begin](#markdown-header-begin)
    - [client](#markdown-header-client)
    - [clone](#markdown-header-clone)
    - [connect](#markdown-header-connect)
    - [end](#markdown-header-end)
    - [model](#markdown-header-model)
- [Accessors](#markdown-header-accessors)
    - [load](#markdown-header-load)
    - [models](#markdown-header-models)

[comment]: <> (doc begin)
# Constructor
```javascript
var Pgo = require('pgo');
var db  = new Pgo(database [, log]);
```

#### database
Connection string (as described in [node-postgres](https://www.npmjs.org/package/pg) documentation).

#### log
The logging function. As default __pgo__ logs on _console_. This parameter can be used to
provide a self defined logging function.

Default: __console.log__

# Data types

## FKEY
```javascript
Pgo.FKEY(table [, field]);
```

#### table
The refernced __table__.

#### field
The __field__ name of the refernced __table__.

Default: __"id"__

## JSON
```javascript
Pgo.JSON
```

## INT2
```javascript
Pgo.INT2
```

## INT4
```javascript
Pgo.INT4
```

## INT8
```javascript
Pgo.INT8
```

## TIMESTAMP
```javascript
Pgo.TIMESTAMP([precision])
```

#### precision
The precision between 0 and 6 for second fractions.

Default: 6

## VARCHAR
```javascript
Pgo.VARCHAR([length])
```

#### length
The maximum length allowed for the field. Constraint is set at database level. If not provided,
no maximum length constraint will be created.

# Default Values

## NOW
```javascript
Pgo.NOW
```

# Methods

## begin
```javascript
Pgo.begin(callback)
```

Begins a __SQL transaction__. Please refer to [Transactions](Transactions.md) for details.

#### callback(err, tx)
The _callback_ function __pgo__ will call after the __BEGIN__ command is issued to database.

* __err__: the error description, __null__ if sync ran without errors.
* __tx__: the [Transaction](Transaction.md) object.

## client
```javascript
Pgo.client(callback)
```

Fronted to the [node-postgres](https://www.npmjs.org/package/pg) _connect_ call. It can be used
to do custom actions on _database_.

#### callback(err, client, done)
The _callback_ function __pg__ will call after connection to database.

* __err__: the error description, __null__ if connected without errors.
* __client__: the __pg__ _client_.
* __done__: the __pg__ _done_ function.

## clone
```javascript
Pgo.clone(log)
```

Creates a clone of this __pgo__ object which use the given _log_ function. Usefull to log session
bound data.

#### log(message)
The _log_ function __pg__ will use for logging.

* __message__: the message to be logged.

## connect
```javascript
Pgo.connec(callback)
```

Executes the __sync__ step. It tries to create (or change) the _db schema_ required to enforce
the _models definition_.

#### callback(err)
The _callback_ function __pgo__ will call after connection and sync to database.

* __err__: the error description, __null__ if sync ran without errors.

## end
```javascript
Pgo.end()
```

Releases all idle connection in the [connections pool](https://github.com/coopernurse/node-pool).
Note that this method releases idle connections: this can't be used to close all open
connections, this should be used to avoid the 30 seconds delay at application graceful shutdown
([details: node-pool](https://github.com/coopernurse/node-pool#step-3---drain-pool-during-shutdown-optional)).

## model
```javascript
Pgo.model(name, fields [, options])
```

Defines a __model__. Please refer to [Models definition](ModelsDefinition.md) for details.

#### name
The name of the new defined _model_.

#### fields
The object which defines the _model fields_.

#### options
The object which defines _model_ or _table_ options.

# Accessors

## load
```javascript
Pgo.load.<model_name>(where, order, callback)
```

or

```javascript
Pgo.load.<model_name>(where, callback)
```

Reads data from database with a standard __SQL query__ and makes it a set of __pgo.record__(s).

#### where
The _Object_ which defines the __WHERE__ conditions.
Please refer to [Accessing data](AccessingData.md) for details.

#### order
The _Array_ which defines the __ORDER BY__ field list. It can be simply omitted.
Please refer to [Accessing data](AccessingData.md) for details.

#### callback(err, res)
The _callback_ function __pgo__ will call after data is loaded.

* __err__: the error description, __null__ if data loaded without errors.
* __res__: the _array_ of __pgo.record__(s) reflecting the record(s) returned by the query.

## models
```javascript
new Pgo.models.<model_name>([tx])
```

Creates a __new pgo.record__ to be saved later in database.

#### return value
The newly created __pgo__ [Record](Record.md).
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.10__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
