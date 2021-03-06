
 | |
:-|:-:|-:
__Version: 0.1.12__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)

- [Description](#markdown-header-description)
- [Error reporting](#markdown-header-error-reporting)
    - [Exceptions](#markdown-header-exceptions)
    - [Asyncronous errors](#markdown-header-asyncronous-errors)
- [Application shutdown](#markdown-header-application-shutdown)

[comment]: <> (doc begin)
## Description

This module is written to be as light as possible.
Due this it does a very few checks on data integrity, it just makes __PostregreSQL__ doing them.
Another aspect of this decision is that only asyncronous interface is offered, if you like to use
some other interface (like async or promise) you have to write your adapter by yourself (or a public
module for the community).

## Error reporting

__pgo__ uses two methods of error reporting: exceptions and asyncronous errors.

### Exceptions

Exceptions are used to check the correct usage of the module. If there is an error in the number or in
the types of parameters of a function call, an exception may be raised. The same can happen if a bad
[model definition](ModelsDefinition.md) is called.
Theese kind of checks are done at run time to make the developer aware as soon as possible of any
error committed in the module usage.

In other worlds __pgo__ function and method calls should never need to be wrappend in a _try catch_
block: exceptions should happen only durind develpment stage.

### Asyncronous errors

Data integrity violation, is often handled as an error. Network errors while communicating with __DB
server__ should be treated as errors. Errors that can happend at run time, are reported with this
technique.

All __pgo__ functions (or methods) that can raise one of theese errors accept in input a __callback
function__ which is called at the end of the job. This function has two (or more) parameters: the
first one is __err__, it has a value of __null__ if job was completed correctly, otherwise an object
describing the error occurred; the second parameter is __res__: __null__ in case of error or job
result in case of work complete.

## Application shutdown

As explained in
[node-pool documentation](https://github.com/coopernurse/node-pool#step-3---drain-pool-during-shutdown-optional)
a 30 seconds delay may be noticed at application shutdown. To avoid the delay __Pgo.end__ can be
used.

[comment]: <> (doc end)

 | |
:-|:-:|-:
__Version: 0.1.12__ | [Home](Home.md) | [Versions Index](https://bitbucket.org/cicci/node-postgres-orm/src/master/doc/Index.md)
