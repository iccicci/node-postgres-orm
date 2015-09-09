"use strict";

var Record = require("../record");
var Table = require("../table");

function createLoadFK(tbl, nam, fld, lock) {
	return function(callback) {
		var where = {};

		where[fld] = this[nam];

		this.pgo.tables[tbl].load(where, null, callback, this.__tx, lock, this.pgo);
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

function createClasses(pgo) {
	var schema = pgo.schema;
	var tbldef = schema.tables[schema.tidx];
	var init = tbldef.init;
	var postD = tbldef.postDelete;
	var postL = tbldef.postLoad;
	var postS = tbldef.postSave;
	var preD = tbldef.preDelete;
	var preS = tbldef.preSave;
	var parent;
	var record = tbldef.name;
	var table = record + "s";

	var Tbl = function() {};
	var Rcd = function(tx, avoid) {
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

	if(tbldef.parent) {
		Tbl.prototype = new schema.classes[tbldef.parent]();
		Rcd.prototype = new pgo.models[tbldef.parent](false, true);
		parent = pgo.models[tbldef.parent].prototype;
	}
	else {
		Tbl.prototype = new Table();
		Tbl.prototype.__sequence = table + "_id_seq";
		Rcd.prototype = new Record();
		parent = Record.prototype;
	}

	pgo.load[record] = function(where, order, callback, _pgo) {
		pgo.tables[table].load(where, order, callback, null, null, _pgo || pgo);
	};
	pgo.models[record] = Rcd;
	pgo.tables[table] = new Tbl();
	schema.classes[record] = Tbl;

	Tbl.prototype.__name = table;
	Rcd.prototype.__table = pgo.tables[table];
	Tbl.prototype.pgo = pgo;
	Rcd.prototype.pgo = pgo;
	Tbl.prototype.pk = tbldef.pk;

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

	Tbl.prototype.__fields = flds;
	Tbl.prototype.__record = Rcd;

	Rcd.prototype.__init       = createHook(parent.__init,       init);
	Rcd.prototype.__postDelete = createHook(parent.__postDelete, postD);
	Rcd.prototype.__postLoad   = createHook(parent.__postLoad,   postL);
	Rcd.prototype.__postSave   = createHook(parent.__postSave,   postS, true);
	Rcd.prototype.__preDelete  = createHook(parent.__preDelete,  preD);
	Rcd.prototype.__preSave    = createHook(parent.__preSave,    preS);

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

module.exports = createClasses;
