
 | |
:-|:-:|-:
__Version: 0.1.12__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

- [Attributes](#markdown-header-attributes)
    - [client](#markdown-header-client)
- [Methods](#markdown-header-methods)
    - [commit](#markdown-header-commit)
    - [client](#markdown-header-client)
- [Accessors](#markdown-header-accessors)
    - [load](#markdown-header-load)
    - [lock](#markdown-header-lock)

[comment]: <> (doc begin)
# Attributes

## client
```javascript
Transaction.client
```

The [node-postgres](https://www.npmjs.org/package/pg) _client_. It can be used to do custom
actions on _database_ in the current _transaction_.

# Methods

## commit
```javascript
Transaction.commit(done [, doneOk])
```

Issues the __COMMIT__ command and closes the __pg__ client.

#### done(err)
#### doneOk()
The _callback_ function __pgo__ will call after the __COMMIT__ command is issued to database.

* __err__: the error description, __null__ if no errors occurred.

## client
```javascript
Transaction.rollback(done [, doneOk])
```

Issues the __ROLLBACK__ command and closes the __pg__ client.

#### done(err)
#### doneOk()
The _callback_ function __pgo__ will call after the __ROLLBACK__ command is issued to database.

* __err__: the error description, __null__ if no errors occurred.


# Accessors

## load
```javascript
Transaction.load.<model_name>(where, [order,] done [, doneOk])
```

It works as __Pgo.load__ but it works within _transaction_.

## lock
```javascript
Transaction.lock.<model_name>(where, [order,] done [, doneOk])
```

It works as __Transaction.load__ but it __locks__ the records untill the _transaction_ is
closed.
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.12__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
