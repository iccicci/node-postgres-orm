"use strict";

var Record = require("./record");
var Table = require("./table");

function createLoadFK(tbl, nam, fld, lock) {
	return function(callback) {
		var where = {};

		where[fld] = this[nam];

		this.pgo.tables[tbl].load(where, null, callback, this.__tx, lock, this.pgo);
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

	Rcd.prototype.__init = function() {
		parent.__init.call(this);

		if(init)
			init.call(this);
	};

	Rcd.prototype.__postDelete = function() {
		parent.__postDelete.call(this);

		if(postD)
			postD.call(this);
	};

	Rcd.prototype.__postLoad = function() {
		parent.__postLoad.call(this);

		if(postL)
			postL.call(this);
	};

	Rcd.prototype.__postSave = function(saved) {
		parent.__postSave.call(this, saved);

		if(postS)
			postS.call(this, saved);
	};

	Rcd.prototype.__preDelete = function() {
		parent.__preDelete.call(this);

		if(preD)
			preD.call(this);
	};

	Rcd.prototype.__preSave = function() {
		parent.__preSave.call(this);

		if(preS)
			preS.call(this);
	};

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
