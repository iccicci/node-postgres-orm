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
Pgo.commit(callback)
```

Issues the __COMMIT__ command and closes the __pg__ client.

#### callback(err)
The _callback_ function __pgo__ will call after the __COMMIT__ command is issued to database.

* __err__: the error description, __null__ if no errors occurred.

## client
```javascript
Pgo.rollback(callback)
```

Issues the __ROLLBACK__ command and closes the __pg__ client.

#### callback(err)
The _callback_ function __pgo__ will call after the __ROLLBACK__ command is issued to database.

* __err__: the error description, __null__ if no errors occurred.


# Accessors

## load
```javascript
Pgo.load.<model_name>(where, order, callback)
```

or

```javascript
Pgo.load.<model_name>(where, callback)
```

It works as __Pgo.load__ but it works within _transaction_.

## lock
```javascript
Pgo.lock.<model_name>(where, order, callback)
```

or

```javascript
Pgo.lock.<model_name>(where, callback)
```

It works as __Transaction.load__ but it __locks__ the records untill the _transaction_ is
closed.
