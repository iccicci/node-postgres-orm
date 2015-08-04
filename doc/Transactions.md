
<table><tr width="100%">
<td width="33%"><b>Version: devel</b></td>
<td align="center" width="33%"><a href="Home.md">Home</a></td>
<td align="right" width="33%"><a href="https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md">Versions Index</a></td>
</tr></table>

<!-- doc begin -->
To open a _transaction_ the __Pgo.begin__ method should be called. It returns the newly
created [Transaction](Transaction.md) object as parameter of the _callback_ function it takes
as parameter and it opens a [node-postgres](https://www.npmjs.org/package/pg) _client_.

Once the [Transaction](Transaction.md) is open, the __Transaction.load__ or
__Transaction.lock__ accessors must be called to operate in the _transaction_ or the
[Transaction](Transaction.md) object must be passed to the [Record](Record.md)
constructor. Records _loaded_ or _created_ by this way (or _loaded_ with the foreign key load
accessor issued against one of these records) will be _saved_ or _deleted_ within the
_transaction_.

To close the [node-postgres](https://www.npmjs.org/package/pg) _client_ one of the method
__Transaction.commit__ or __Transaction.rollback__ must be called.

If custom operation on database should be done within transactoin the __Transaction.client__
can be used. It is the [node-postgres](https://www.npmjs.org/package/pg) _client_. Within a
_transaction_ no [node-postgres](https://www.npmjs.org/package/pg) _done_ function should be
used: it is called by __Transaction.commit__ and __Transaction.rollback__.

Once the [Transaction](Transaction.md) is closed, all the records bound to it will be relesed
and next _save_ or _del_ will operate without _transaction_.
<!-- doc end -->

<table><tr width="100%">
<td width="33%"><b>Version: devel</b></td>
<td align="center" width="33%"><a href="Home.md">Home</a></td>
<td align="right" width="33%"><a href="https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md">Versions Index</a></td>
</tr></table>
