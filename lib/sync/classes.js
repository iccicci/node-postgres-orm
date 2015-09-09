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

function createRecord()  {
	return function(tx, avoid) {
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
}

function setParent(Tbl, Rcd, tbldef, table, schema, pgo) {
	if(tbldef.parent) {
		Tbl.prototype = new schema.classes[tbldef.parent]();
		Rcd.prototype = new pgo.models[tbldef.parent](false, true);

		return pgo.models[tbldef.parent].prototype;
	}

	Tbl.prototype = new Table();
	Tbl.prototype.__sequence = table + "_id_seq";
	Rcd.prototype = new Record();

	return Record.prototype;
}

function setRecord(Tbl, Rcd, tbldef, table, pgo, parent, fields) {
	var i;

	Rcd.prototype.__table = pgo.tables[table];
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
	var table = record + "s";

	var Tbl = function() {};
	var Rcd = createRecord();

	parent = setParent(Tbl, Rcd, tbldef, table, schema, pgo);

	pgo.load[record] = function(where, order, callback, _pgo) {
		pgo.tables[table].load(where, order, callback, null, null, _pgo || pgo);
	};
	pgo.models[record] = Rcd;
	pgo.tables[table] = new Tbl();
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
	setRecord(Tbl, Rcd, tbldef, table, pgo, parent, fields);
}

module.exports = createClasses;
