
 | |
:-|:-:|-:
__Version: devel__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

[comment]: <> (doc begin)
The first way to read data from _database_ is to use the two following accessors:

```javascript
Pgo.load.<model_name>(where, order, callback)
```

or (if no fixed order is required):

```javascript
Pgo.load.<model_name>(where, callback)
```

It simply create and execute a __SQL query__ and returns the _records_ as appropriate __JS Objects__.

## where

Is the __Object__ which describes the __WHERE__ condition. Each _key_ describes a condition, all the conditions are bound together with __AND__ operators.

Each key must be the result of the concatenation between two strings: the name of the field and the operation the check against the value.

### example

```javascript
{
  foo: 'string',
  bar__eq: 12,
  baz__lt: 300
}
```

The given __where Object__ will create following __WHERE__ condition:

```SQL
WHERE foo = 'string' AND bar = 12 AND baz < 300
```

### operations

* __eq: _equal to_ (optional: can be omitted)
* __ne: _not equal to_
* __lt: _lesser than_
* __le: _lesser than or equal to_
* __gt: _greater than_
* __ge: _greater than or equal to_
* __in: _in_ (expected value must be an _Array_)
* __like: _like_ the given string
* __null: (accepts a boolean) __IS NULL__ if _true_, __IS NOT NULL__ if _false_

### custom condition

When a complex __WHERE__ condition is required the key ______ (double underscore) can be used to specify an extra custom condition (which is encapsulated within brackets and bound to others with an __AND__ operator).

```javascript
{
  foo: 'string',
  bar__eq: 12,
  baz__lt: 300,
  '__': "(bar + 20) / baz < 1 OR foo like 'none%'"
}
```

The given __where Object__ will create following __WHERE__ condition:

```SQL
WHERE foo = 'string' AND bar = 12 AND baz < 300 AND ((bar + 20) / baz < 1 OR foo like 'none%')
```

## order

Is the __Array__ which describes the __ORDER BY__ field list. If this list is of just one element, the filed can be used as parameter. A filed can be prepended by a - to enforce a _descendent_ order.

### examples

First:

```javascript
'foo'
```

```SQL
ORDER BY foo
```

Second:

```javascript
'-foo'
```

```SQL
ORDER BY foo DESC
```

Third:

```javascript
['-foo', 'bar']
```

```SQL
ORDER BY foo DESC, bar
```
[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: devel__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
