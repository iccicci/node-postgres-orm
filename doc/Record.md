
 | |
:-|:-:|-:
__Version: 0.1.12__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

- [Constructor](#markdown-header-constructor)
- [Methods](#markdown-header-methods)
    - [del](#markdown-header-del)
    - [save](#markdown-header-save)
- [Hooks](#markdown-header-hooks)
    - [postDelete](#markdown-header-postdelete)
    - [postLoad](#markdown-header-postload)
    - [postSave](#markdown-header-postsave)
    - [preDelete](#markdown-header-predelete)
    - [preSave](#markdown-header-presave)

[comment]: <> (doc begin)
This __class__ is not directly accessed by the __pgo developer__. For each __defined model__, 
__pgo__ defines a new __class__ which inherits this one.

# Constructor
```javascript
new Pgo.models.<model_name>([tx])
```

__ATTENTION:__ It throws an __Exception__ if _tx_ is an already closed _transaction_.

#### tx
The [Transaction](Transaction.md) object, if working in a _transaction_.

# Methods

## del
```javascript
Record.del(done [, doneOk])
```

Deletes the __pgo.record__ from database.

#### done(err)
#### doneOk()
The _callback_ function __pgo__ will call after __record__ is deleted.

* __err__: the error description, __null__ if record was deleted without errors.

## save
```javascript
Record.save(done [, doneOk])
```

Saves the __pgo.record__ in database and refreshes it reflecting the record in _database_.

#### done(err)
#### doneOk()
The _callback_ function __pgo__ will call after __record__ is saved.

* __err__: the error description, __null__ if record was saved without errors.

# Accessors

## <FKEY_name>Load
```javascript
Record.<FKEY_name>Load(done [, doneOk])
```

Loads the __pgo.record__ referenced by the __foreing key__.

#### done(err [,res])
#### doneOk(res)
The _callback_ function __pgo__ will call after __record__ is saved.

* __err__: the error description, __null__ if data loaded without errors.
* __res__: the __pgo.record__ referenced by one against te _accessor_ was called.

## <FKEY_name>Lock
```javascript
Record.<FKEY_name>Lock(done [, doneOk])
```

If the __pgo.record__ was loaded or created within a __transaction__, loads and locks the __pgo.record__ referenced by
the __foreing key__.

#### done(err [,res])
#### doneOk(res)
The _callback_ function __pgo__ will call after __record__ is saved.

* __err__: the error description, __null__ if data loaded without errors.
* __res__: the __pgo.record__ referenced by one against te _accessor_ was called.

# Hooks

## postDelete
```javascript
Record.postLoad()
```

Can be used to notify that a __record__ have been deleted.

## postLoad
```javascript
Record.postLoad()
```

Can be used to make some adjustment on the __record__ before using it.

## postSave
```javascript
Record.postSave(saved)
```

#### saved
Tells if the __Record__ was really saved in DB or not: if __Record.save__ was called on a __Record__ which was not
changed since it was _loaded_, __saved__ is __false__; otherwise it is __true__ in all other cases.

Can be used to notify that a __record__ have been saved.

## preDelete
```javascript
Record.preDelete()
```

Can be used to make consistency checks before deleting the __record__.

To make a consistency check this __method__ can _throw_ an Exception, in this case it is
_catched_ and reported in the __err__ parameter of the __callback__ function passed to the
__Record.delete__ which was called to delete this __record__.

## preSave
```javascript
Record.preSave()
```

Can be used both to make some adjustment or consistency checks on the __record__ before saving
it.

To make a consistency check is true what said for __preDelete__ method.
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.12__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
