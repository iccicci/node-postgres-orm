"use strict";

var dd = require("double-done");
var pg = require("pg");

var errors       = require("./errors");
var syncSequence = require("./sync");
var Transaction  = require("./transaction");

function Pgo(database, log) {
	this.database = database;
	this.log      = log || function(msg) { console.log("Pgo: " + msg); };
	this.load     = {};
	this.models   = {};
	this.tables   = {};
	this.schema   = {
		classes: {},
		tables:  [],
		thash:   {},
		tidx:    -1
	};
}

Pgo.prototype.pg = pg;

Pgo.prototype.NOW = "CURRENT_TIMESTAMP";

Pgo.prototype.JSON = "json";
Pgo.prototype.INT2 = "int2";
Pgo.prototype.INT4 = "int4";
Pgo.prototype.INT8 = "int8";
Pgo.prototype.TEXT = "text";

Pgo.prototype.FKEY = function(table, field) {
	return {
		notNull: true,
		fkTable: table,
		fkField: field || "id"
	};
};

Pgo.prototype.TIMESTAMP = function(precision) {
	if(precision === undefined)
		return {
			type:      "timestamptz",
			precision: 6
		};

	if(parseInt(precision, 10) !== precision || precision < 0 || precision > 6)
		throw new Error("Pgo.TIMESTAMP: precision must be an integer between 0 and 6");

	return {
		type:      "timestamptz",
		precision: precision
	};
};

Pgo.prototype.VARCHAR = function(len) {
	if(! len)
		return "varchar";

	if(parseInt(len, 10) !== len || len < 0)
		throw new Error("Pgo.VARCHAR: len must be a positive integer");

	return {
		type:   "varchar",
		maxLen: len
	};
};

Pgo.prototype.begin = function(done, doneOk) {
	doneOk = dd(done, doneOk);

	if(typeof(done) !== "function")
		throw new Error("Pgo.begin: callback must be a function");

	pg.connect(this.database, doneOk.dd((client, donePG) => {
		doneOk = dd(function(err) { donePG(); done(err); }, doneOk);

		this.log("BEGIN");
		client.query("BEGIN", [], doneOk.dd(() => {
			var tx              = new this.Transaction(this);
			var createAccessors = (record, table) => {
				tx.load[record] = (where, order, callback) => { table.load(where, order, callback, tx, null, this); };
				tx.lock[record] = (where, order, callback) => { table.load(where, order, callback, tx, true, this); };
			};

			tx.client = client;
			tx.done   = donePG;

			for(var record in this.models)
				createAccessors(record, this.tables[record]);

			doneOk(tx);
		}));
	}));
};

Pgo.prototype.client = function(done, doneOk) {
	doneOk = dd(done, doneOk);

	pg.connect(this.database, doneOk.dd(doneOk));
};

Pgo.prototype.clone = function(log) {
	var ret = new Pgo(this.database, log);

	var createLoad = function(name) {
		return function(where, order, callback, _pgo) {
			ret.tables[name].load(where, order, callback, null, null, _pgo || ret);
		};
	};

	var createModel = function(name, Model) {
		var ret2 = function(tx, avoid) {
			Model.call(this, tx, avoid);
		};

		ret2.prototype     = new Model();
		ret2.prototype.pgo = ret;

		return ret2;
	};

	ret.load        = {};
	ret.models      = this.models;
	ret.tables      = this.tables;
	ret.schema      = this.schema;
	ret.Transaction = this.Transaction;

	for(var i in this.load)
		ret.load[i] = createLoad(i);

	for(i in this.models)
		ret.models[i] = createModel(i, this.models[i]);

	return ret;
};

Pgo.prototype.connect = function(done, doneOk) {
	doneOk = dd(done, doneOk);

	this.Transaction = function Transaction(pgo) {
		this.pgo     = pgo;
		this.load    = {};
		this.lock    = {};
		this.records = [];
	};
	this.Transaction.prototype.close    = Transaction.close;
	this.Transaction.prototype.commit   = Transaction.commit;
	this.Transaction.prototype.end      = Transaction.end;
	this.Transaction.prototype.rollback = Transaction.rollback;

	pg.connect(this.database, (err, client, donePG) => {
		this.client = client;
		this.done   = (err) => {
			delete this.client;
			delete this.done;

			donePG();

			if(err)
				return done(err);

			doneOk();
		};

		if(this.error(err, 1))
			return;

		syncSequence(this);
	});
};

Pgo.prototype.end = function() {
	pg.end();
};

Pgo.prototype.error = function(err, code, target, field) {
	if(! err)
		return false;

	err = {
		pgo: {
			code:  code,
			doing: errors[code],
		},
		pg: err
	};

	if(target)
		err.pgo.target = target;

	if(field)
		err.pgo.field = field;

	this.done(err);

	return true;
};

var model = require("./model");

for(var i in model)
	Pgo.prototype[i] = model[i];

module.exports = Pgo;
