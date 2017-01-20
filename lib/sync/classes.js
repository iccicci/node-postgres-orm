"use strict";

var dd   = require('double-done');
var util = require('util');

var Record = require("../record");
var Table  = require("../table");

function createLoadFK(tbl, nam, fld, lock) {
	return function(done, doneOk) {
		doneOk    = dd(done, doneOk);
		var cb    = function(err, res) { if(err) return done(err); doneOk(res); };
		var where = {};

		where[fld] = this[nam];

		this.pgo.tables[tbl].load(where, null, cb, this.__tx, lock, this.pgo);
	};
}

function createHook(prev, hook, post) {
	if(post) {
		if(hook)
			return function(p) {
				prev.call(this, p);
				hook.call(this, p);
			};

		return function(p) {
			prev.call(this, p);
		};
	}

	if(hook)
		return function() {
			prev.call(this);
			hook.call(this);
		};

	return function() {
		prev.call(this);
	};
}

function createRecord(pgo, name) {
	var constr = function(tx, avoid) {
		Record.call(this);

		if(tx) {
			if(tx.closed)
				throw new Error("Record: Can't create a new one within an already closed Transaction");

			this.__tx = tx;
			tx.records.push(this);
		}

		if(! avoid)
			this.__init();
	};

	var load = function(lock, tx, where, ord, done, doneOk) {
		if(! (tx instanceof pgo.Transaction)) {
			if(lock instanceof pgo.Transaction) {
				doneOk = done;
				done   = ord;
				ord    = where;
				where  = tx;
				tx     = lock;
				lock   = false;
			}
			else {
				doneOk = ord;
				done   = where;
				ord    = tx;
				where  = lock;
				tx     = null;
				lock   = false;
			}
		}

		if(! (ord instanceof Array)) {
			doneOk = done;
			done   = ord;
		}

		doneOk = dd(done, doneOk);
		var cb = function(err, res) {
			if(err)
				return done(err);

			doneOk(res);
		};

		if(tx) {
			if(lock)
				return tx.lock[name](where, ord, cb);

			return tx.load[name](where, ord, cb);
		}

		pgo.load[name](where, ord, cb);
	};

	var both = function(self, target, args) {
		if(target)
			return constr.apply(self, args);

		load.apply(null, args);
	};

	return (new Function("both", "return function " + name + "() { both(this, new.target, arguments); }"))(both);
}

function setParent(Tbl, Rcd, tbldef, table, schema, pgo) {
	if(tbldef.parent) {
		Tbl.prototype = new schema.classes[tbldef.parent]();
		util.inherits(Rcd, pgo.models[tbldef.parent]);

		return pgo.models[tbldef.parent].prototype;
	}

	Tbl.prototype = new Table();
	Tbl.prototype.__sequence = table + "_id_seq";
	util.inherits(Rcd, Record);

	return Record.prototype;
}

function setRecord(Tbl, Rcd, tbldef, table, pgo, parent, fields, record) {
	var i;

	Rcd.prototype.__table = pgo.tables[record];
	Rcd.prototype.pgo     = pgo;

	Rcd.prototype.__init       = createHook(parent.__init,       tbldef.init);
	Rcd.prototype.__postDelete = createHook(parent.__postDelete, tbldef.postDelete);
	Rcd.prototype.__postLoad   = createHook(parent.__postLoad,   tbldef.postLoad);
	Rcd.prototype.__postSave   = createHook(parent.__postSave,   tbldef.postSave, true);
	Rcd.prototype.__preDelete  = createHook(parent.__preDelete,  tbldef.preDelete);
	Rcd.prototype.__preSave    = createHook(parent.__preSave,    tbldef.preSave);

	if(tbldef.attributes)
		for(i in tbldef.attributes)
			Rcd.prototype[i] = tbldef.attributes[i];

	for(i = 0; i < fields.length; ++i)
		if(fields[i].fkTable) {
			var nam = fields[i].name;

			Rcd.prototype[nam + "Load"] = createLoadFK(fields[i].fkTable, nam, fields[i].fkField);
			Rcd.prototype[nam + "Lock"] = createLoadFK(fields[i].fkTable, nam, fields[i].fkField, true);
		}
}

function setTable(Tbl, Rcd, tbldef, table, pgo, flds) {
	Tbl.prototype.__name   = table;
	Tbl.prototype.pgo      = pgo;
	Tbl.prototype.pk       = tbldef.pk;
	Tbl.prototype.__fields = flds;
	Tbl.prototype.__record = Rcd;
}

function createClasses(pgo) {
	var schema = pgo.schema;
	var tbldef = schema.tables[schema.tidx];
	var parent;
	var record = tbldef.name;
	var table  = tbldef.tname;

	var Tbl = function() {};
	var Rcd = createRecord(pgo, record);

	parent = setParent(Tbl, Rcd, tbldef, table, schema, pgo);

	pgo.load[record] = function(where, order, callback, _pgo) {
		pgo.tables[record].load(where, order, callback, null, null, _pgo || pgo);
	};
	pgo.models[record] = Rcd;
	pgo.tables[record] = new Tbl();
	schema.classes[record] = Tbl;

	var fields = schema.tables[schema.tidx].fields;
	var flds = {};
	var i;

	if(parent.__table)
		for(i in parent.__table.__fields)
			flds[i] = parent.__table.__fields[i];

	for(i = 0; i < fields.length; ++i) {
		if(fields[i].name in flds)
			return fields[i].name;

		flds[fields[i].name] = undefined;
	}

	setTable( Tbl, Rcd, tbldef, table, pgo, flds);
	setRecord(Tbl, Rcd, tbldef, table, pgo, parent, fields, record);
}

module.exports = createClasses;
