# node-postgres-orm

[![NPM](https://nodei.co/npm/pgo.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/pgo/)

PostgreSQL dedicated ORM for node.js with automatic schema sync.

This package is designed __to make easy the process to apply changes to database after model
definition changes__, more than offer a quick and easy database access interface. To apply
changes to database after releasing a new version of application is often a frustrating
problem, usually solved with migration systems. To apply changes to database during development
stage, often results in a complex sequence of backward and forward steps through migrations;
this process is complicated more and more especially when working in team with concurrent
changes to the models (or database schema). This package tries to solve these problems all in
once.

## Preface

This package is at his embryonal stage, hence it doesn't supports all of PostgreSQL features and
data types, there may be other bugs with the current version or documentation may be wrong or incomplete.
Please report to [bitbucket tracker](https://bitbucket.org/cicci/node-postgres-orm/issues)
everything found which doesn't respect documentation. Not all the features are working as expected, also if you have
a request for a new feature or support please feel free to inform me of such.

Low level PostgreSQL access is done thanks to [node-postgres](https://www.npmjs.org/package/pg)
which __client pooling__ interface is exposed by this package to achieve solution for those
kind of problems which require a low level DB access or feature which support are too far in
the TODO list.

## Installation

Just install the [npm package](https://www.npmjs.org/package/pgo):

```sh
npm install pgo
```

## Table of content

- [Getting started](GettingStarted.md)
- [Overview](Overview.md)
- [Data types](DataTypes.md)
- [Models definition](ModelsDefinition.md)
- [Models inheritance](ModelsInheritance.md)
- [Accessing data](AccessingData.md)
- [Foreign keys](ForeignKeys.md)
- [Transactions](Transactions.md)
- Classes reference
    - [Pgo](Pgo.md)
    - [Record](Record.md)
    - [Transaction](Transaction.md)

## TODO

* Many native PostgreSQL data types
* Foreign keys with more than one field
* Many other PostgreSQL features
* Model representation of a given DB schema
* Interaction with tables not administrated by __node-postgres-orm__
