'use strict';

/* global syncConstraint */
/* global syncField */
/* global syncSequence */
/* global syncTable */

var errors = require('./errors');
var Table  = require('./table');
var Record = require('./record');

function arrayCompare(a1, a2) {
	if(a1.length != a2.length)
		return false;

	for(var i in a1)
		if(a2.indexOf(a1[i]) == -1)
			return false;

	return true;
}

function fieldType(field) {
	switch(field.type) {
	case 'varchar':
		if(field.maxLen)
			return 'varchar(' + field.maxLen + ')';
	}

	return field.type;
}

function createLoadFK(pgo, tbl, nam, fld) {
	return function(callback) {
		var where = {};

		where[fld] = this[nam];

		pgo.tables[tbl].load(where, callback);
	};
}

function createClasses(pgo) {
	var defobj = {};
	var schema = pgo.schema;
	var tbldef = schema.tables[schema.tidx];
	var init   = tbldef.init;
	var postL  = tbldef.postLoad;
	var postS  = tbldef.postSave;
	var preS   = tbldef.preSave;
	var parent;
	var record = tbldef.name;
	var table  = record + 's';

	var Tbl = function() {};
	var Rcd = function(avoid) { if(! avoid) this.__init(); };

	if(tbldef.parent) {
		Tbl.prototype = new schema.classes[tbldef.parent]();
		Rcd.prototype = new pgo.models[tbldef.parent](true);
		parent = pgo.models[tbldef.parent].prototype;
	}
	else {
		Tbl.prototype = new Table();
		Tbl.prototype.__sequence = table + "_id_seq";
		Rcd.prototype = new Record();
		parent = Record.prototype;
	}

	pgo.load[table]        = function(where, callback) { pgo.tables[table].load(where, callback); };
	pgo.models[record]     = Rcd;
	pgo.tables[table]      = new Tbl();
	schema.classes[record] = Tbl;

	Tbl.prototype.__name  = table;
	Rcd.prototype.__table = pgo.tables[table];
	Tbl.prototype.pgo     = pgo;
	Rcd.prototype.pgo     = pgo;

	var fields = schema.tables[schema.tidx].fields;
	var flds   = {};
	var i;

	if(parent.__table)
		for(i in parent.__table.__fields)
			flds[i] = parent.__table.__fields[i];

	for(i = 0; i < fields.length; ++i) {
		flds[fields[i].name] = fields[i].type == pgo.JSON;

		if(fields[i].def && fields[i].name != 'id')
			defobj[fields[i].name] = fields[i].def;
	}

	defobj = JSON.stringify(defobj);

	Tbl.prototype.__fields = flds;
	Tbl.prototype.__record = Rcd;

	Rcd.prototype.__init = function() {
		parent.__init.call(this);

		var def = JSON.parse(defobj);

		for(var i in def)
			this[i] = def[i];

		if(init)
			init.call(this);
	};

	Rcd.prototype.__postLoad = function() {
		parent.__postLoad.call(this);

		if(postL)
			postL.call(this);
	};

	Rcd.prototype.__postSave = function() {
		parent.__postSave.call(this);

		if(postS)
			postS.call(this);
	};

	Rcd.prototype.__preSave = function() {
		var ret = parent.__preSave.call(this);

		if(ret)
			return ret;

		if(preS)
			return preS.call(this);

		return null;
	};

	for(i = 0; i < fields.length; ++i)
		if(fields[i].fkTable) {
			var nam = fields[i].name;

			Rcd.prototype[nam + 'Load'] = createLoadFK(pgo, fields[i].fkTable, nam, fields[i].fkField);
		}
}

function createField(pgo) {
	var table = pgo.schema.tables[pgo.schema.tidx];
	var field = table.fields[pgo.schema.fidx];
	var query = "ALTER TABLE " + table.name + 's ADD COLUMN ' + field.name + ' ' + fieldType(field);

	pgo.log(query);
	pgo.client.query(query, null, function(err, res) {
		if(pgo.error(err, 1004, table.name, field.name))
			return;

		syncField(pgo, true);
	});
}

function createIndex(pgo) {
	var schema = pgo.schema;
	var table  = schema.tables[schema.tidx];

	schema.iidx++;

	if(! table.index || schema.iidx == table.index.length)
		return syncSequence(pgo);

	var index = table.index[schema.iidx];

	pgo.client.query("SELECT relname, attname FROM pg_class, pg_index, pg_attribute, pg_am WHERE indrelid = $1 AND indexrelid = pg_class.oid AND attrelid = pg_class.oid AND relam = pg_am.oid AND amname = $2 ORDER BY relname", [table.oid, index.type], function(err, res) {
		if(pgo.error(err, 1006, table.name))
			return;

		var idx;
		var fld;
		var rows = res.rows;

		rows.push({relname: ''});

		for(var i in rows) {
			var row = rows[i];

			if(row.relname != idx) {
				if(idx)
					if(arrayCompare(index.fields, fld))
						return createIndex(pgo);

				idx =  row.relname;
				fld = [row.attname];
			}
			else
				fld.push(row.attname);
		}

		var query = "CREATE INDEX ON " + table.name + "s USING " + index.type + " (" + index.fields.join(", ") + ")";

		pgo.log(query);
		pgo.client.query(query, null, function(err, res) {
			if(pgo.error(err, 1007, table.name, index.fields))
				return;

			createIndex(pgo);
		});
	});
}

function dropFields(pgo) {
	var table = pgo.schema.tables[pgo.schema.tidx];

	pgo.client.query("SELECT attname FROM pg_attribute WHERE attrelid = $1 AND attnum > 0 AND attisdropped = false", [table.oid], function(err, res) {
		if(pgo.error(err, 1013, table.name))
			return;

		var field;
		var fields = pgo.tables[table.name + 's'].__fields;
		var rows   = res.rows;

		for(var i in rows) {
			var attname = rows[i].attname;

			if(attname != 'id' && ! (attname in fields)) {
				field = attname;

				break;
			}
		}

		if(! field)
			return syncConstraint(pgo);

		var query = "ALTER TABLE " + table.name + "s DROP COLUMN " + field + " CASCADE";

		pgo.log(query);
		pgo.client.query(query, null, function(err, res) {
			if(pgo.error(err, 1014, table.name, field))
				return;

			dropFields(pgo);
		});
	});
}

function syncFieldDefault(pgo, resin) {
	var table = pgo.schema.tables[pgo.schema.tidx];
	var field = table.fields[pgo.schema.fidx];

	if(resin.adsrc == field.defaultValue)
		return syncField(pgo);

	var query = "ALTER TABLE " + table.name + 's ALTER COLUMN ' + field.name + (field.defaultValue ? " SET DEFAULT " + field.defaultValue : ' DROP DEFAULT');

	pgo.log(query);
	pgo.client.query(query, null, function(err, res) {
		if(pgo.error(err, 1018, table.name, field.name))
			return;

		syncField(pgo);
	});
}

function syncFieldNull(pgo, resin) {
	var table = pgo.schema.tables[pgo.schema.tidx];
	var field = table.fields[pgo.schema.fidx];

	if(resin.attnotnull == field.notNull)
		return syncFieldDefault(pgo, resin);

	var doit = function() {
		var query = "ALTER TABLE " + table.name + 's ALTER COLUMN ' + field.name + (field.notNull ? ' SET' : ' DROP') + ' NOT NULL';

		pgo.log(query);
		pgo.client.query(query, null, function(err, res) {
			if(pgo.error(err, 1019, table.name, field.name))
				return;

			syncFieldDefault(pgo, resin);
		});
	};

	if(field.notNull && field.defaultValue) {
		var query = "UPDATE " + table.name + 's SET ' + field.name + ' = ' + field.defaultValue + ' WHERE ' + field.name + ' IS NULL';

		pgo.log(query);
		pgo.client.query(query, function(err, res) {
			if(pgo.error(err, 1021, table.name, field.name))
				return;

			doit();
		});
	}
	else
		doit();
}

function alterField(pgo, resin) {
	var table = pgo.schema.tables[pgo.schema.tidx];
	var field = table.fields[pgo.schema.fidx];
	var using = '';

	switch(field.type) {
	case 'int2':
	case 'int4':
	case 'int8':
		switch(resin.typname) {
		case 'varchar':
			using = ' USING ' + field.name + '::' + field.type;
		}
	}

	var query = "ALTER TABLE " + table.name + 's ALTER COLUMN ' + field.name + ' TYPE ' + fieldType(field) + using;

	pgo.log(query);
	pgo.client.query(query, null, function(err, res) {
		if(pgo.error(err, 1003, table.name, field.name))
			return;

		syncFieldNull(pgo, resin);
	});
}

function syncField(pgo, redo) {
	var schema = pgo.schema;
	var table  = schema.tables[schema.tidx];

	if(! redo)
		schema.fidx++;

	if(schema.fidx == table.fields.length)
		return dropFields(pgo);

	var field = table.fields[schema.fidx];

	pgo.client.query("SELECT * FROM pg_type, pg_attribute LEFT JOIN pg_attrdef ON adrelid = attrelid AND adnum = attnum WHERE attrelid = $1 AND attnum > 0 AND atttypid = pg_type.oid AND attislocal = 't' AND attname = $2", [table.oid, field.name], function(err, res) {
		if(pgo.error(err, 1013, table.name))
			return;

		if(! res.rowCount)
			return createField(pgo);

		var row = res.rows[0];

		if(field.type != row.typname)
			return alterField(pgo, row);

		if(field.type == 'varchar' && (field.maxLen ? field.maxLen + 4 != row.atttypmod : row.atttypmod != -1))
			return alterField(pgo, row);

		syncFieldNull(pgo, row);
	});
}

function syncConstraint(pgo) {
	var schema = pgo.schema;
	var table  = schema.tables[schema.tidx];

	schema.cidx++;

	if(schema.cidx == table.constraints.length)
		return createIndex(pgo);

	var constraint = table.constraints[schema.cidx];

	pgo.client.query("SELECT attname FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1] AND attname = $2", [table.oid, constraint.field], function(err, res) {
		if(pgo.error(err, 1010, table.name))
			return;

		if(res.rowCount)
			return syncConstraint(pgo);

		var query = "ALTER TABLE " + table.name + "s ADD CONSTRAINT " + constraint.name;

		switch(constraint.type) {
		case 'f':
			query += " FOREIGN KEY (" + constraint.field + ") REFERENCES " + constraint.fkTable + " (" + constraint.fkField + ")";
			break;
		case 'u':
			query += " UNIQUE(" + constraint.field + ")";
		}

		pgo.log(query);
		pgo.client.query(query, null, function(err, res) {
			if(pgo.error(err, 1017, table.name, constraint.name))
				return;

			syncConstraint(pgo);
		});
	});
}

function dropIndex(pgo, arr) {
	var table  = pgo.schema.tables[pgo.schema.tidx];
	var place  = 1;
	var query  = "SELECT relname, attname, amname FROM pg_class, pg_index, pg_attribute, pg_am WHERE indrelid = $1 AND indexrelid = pg_class.oid AND attrelid = pg_class.oid AND relam = pg_am.oid";
	var values = [table.oid];
	var wheres = [];

	for(var i in arr) {
		query += " AND indexrelid <> $" + (++place);
		values.push(arr[i]);
	}

	pgo.client.query(query + " ORDER BY relname", values, function(err, res) {
		if(pgo.error(err, 1006, table.name))
			return;

		var am;
		var idx;
		var fld;
		var rows  = res.rows;
		var found = true;

		rows.push({relname: '', attname: ''});

		for(var i in rows) {
			var row = rows[i];

			if(row.relname != idx) {
				if(idx) {
					found = false;

					for(var l in table.index)
						if(arrayCompare(table.index[l].fields, fld) && table.index[l].type == am)
							found = true;

					if(! found)
						break;
				}

				am  =  row.amname;
				idx =  row.relname;
				fld = [row.attname];
			}
			else
				fld.push(row.attname);
		}

		if(! found) {
			pgo.log("DROP INDEX " + idx);

			return pgo.client.query("DROP INDEX " + idx, null, function(err, res) {
				if(pgo.error(err, 1015, table.name))
					return;

				dropIndex(pgo, arr);
			});
		}

		syncField(pgo);
	});
}

function createTable(pgo) {
	var table  = pgo.schema.tables[pgo.schema.tidx];
	var parent = '';

	if(table.parent)
		parent = ' INHERITS (' + table.parent + 's)';

	var query = "CREATE TABLE " + table.name + 's ()' + parent;

	pgo.log(query);
	pgo.client.query("CREATE TABLE " + table.name + 's ()' + parent, null, function(err, res) {
		if(pgo.error(err, 1008, table.name))
			return;

		syncTable(pgo);
	});
}

function dropConstraint(pgo) {
	var table  = pgo.schema.tables[pgo.schema.tidx];
	var place  = 1;
	var query  = "SELECT conname FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1]";
	var values = [table.oid];
	var wheres = [];

	for(var i in table.constraints) {
		wheres.push(" AND (contype <> $" + (++place) + " or attname <> $" + (++place) + ")");
		values.push(table.constraints[i].type);
		values.push(table.constraints[i].field);
	}

	pgo.client.query(query + wheres.join(''), values, function(err, res) {
		if(pgo.error(err, 1010, table.name))
			return;

		if(! res.rowCount) {
			return pgo.client.query("SELECT conindid FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1]", [table.oid], function(err, res) {
				var arr = [];

				if(pgo.error(err, 1011, table.name))
					return;

				for(var i in res.rows)
					arr.push(res.rows[i].conindid);

				dropIndex(pgo, arr);
			});
		}

		var conname = res.rows[0].conname;

		query = "ALTER TABLE " + table.name + "s DROP CONSTRAINT " + conname;
		pgo.log(query);
		pgo.client.query(query, null, function(err, res) {
			if(pgo.error(err, 1012, table.name, conname))
				return;

			dropConstraint(pgo);
		});
	});
}

function dropTable(pgo) {
	var table = pgo.schema.tables[pgo.schema.tidx];
	var query = "DROP TABLE " + table.name + 's CASCADE';

	pgo.log(query);
	pgo.client.query(query, null, function(err, res) {
		if(pgo.error(err, 1016, table.name))
			return;

		createTable(pgo);
	});
}

function syncParent(pgo) {
	var table = pgo.schema.tables[pgo.schema.tidx];

	pgo.client.query("SELECT inhparent FROM pg_inherits WHERE inhrelid = $1", [table.oid], function(err, res) {
		if(pgo.error(err, 1020, table.name))
			return;

		if(! table.parent) {
			if(res.rowCount)
				return dropTable(pgo);

			return dropConstraint(pgo);
		}

		var parent = pgo.schema.tables[pgo.schema.thash[table.parent]];

		if(! res.rowCount || res.rows[0].inhparent != parent.oid)
			return dropTable(pgo);

		dropConstraint(pgo);
	});
}

function syncTable(pgo) {
	var table = pgo.schema.tables[pgo.schema.tidx];

	pgo.client.query("SELECT oid FROM pg_class WHERE relname = $1", [table.name + 's'], function(err, res) {
		if(pgo.error(err, 1005, table.name))
			return;

		if(! res.rowCount)
			return createTable(pgo);

		table.oid = res.rows[0].oid;

		syncParent(pgo);
	});
}

function createSequence(pgo) {
	var table = pgo.schema.tables[pgo.schema.tidx];
	var query = "CREATE SEQUENCE " + table.name + "s_id_seq";

	pgo.log(query);
	pgo.client.query(query, null, function(err, res) {
		if(pgo.error(err, 1009, table.name))
			return;

		syncTable(pgo);
	});
}

function syncSequence(pgo) {
	var schema = pgo.schema;

	schema.tidx++;
	schema.cidx = -1;
	schema.fidx = -1;
	schema.iidx = -1;

	if(schema.tidx == schema.tables.length) {
		pgo.schema = false;

		return setTimeout(function() { pgo.done(null); }, 1);
	}

	createClasses(pgo);

	var table = schema.tables[schema.tidx];

	if(table.parent)
		return syncTable(pgo);

	pgo.client.query("SELECT currval('" + table.name + "s_id_seq')", null, function(err, res) {
		if(! err)
			return pgo.done({ pgo: { code: 1001, message: errors[1001], target: table.name + "s_id_seq" }});
		if(err.code == '42P01')
			return createSequence(pgo);
		if(err.code == '55000')
			return syncTable(pgo);

		pgo.error(err, 1002, table.name + "s_id_seq");
	});
}

module.exports = syncSequence;
