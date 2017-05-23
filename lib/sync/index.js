"use strict";

var createClasses = require("./classes");
var errors        = require("../errors");
var utils         = require("./utils");

var finalizeSync = utils.finalizeSync;
var getTable     = utils.getTable;
var singleStep   = utils.singleStep;
var syncField;

function arrayCompare(a1, a2) {
	if(a1.length !== a2.length)
		return false;

	for(var i in a1)
		if(a2.indexOf(a1[i]) === -1)
			return false;

	return true;
}

function createIndex(pgo) {
	var schema = pgo.schema;
	var table = getTable(pgo);

	schema.iidx++;

	if(! table.index || schema.iidx === table.index.length)
		return syncSequence(pgo);

	var index = table.index[schema.iidx];

	pgo.client.query("SELECT relname, attname FROM pg_class, pg_index, pg_attribute, pg_am WHERE indrelid = $1 AND indexrelid = pg_class.oid AND attrelid = pg_class.oid AND relam = pg_am.oid AND amname = $2 ORDER BY relname", [table.oid, index.type], function(err, res) {
		if(pgo.error(err, 1024, table.name))
			return;

		var idx;
		var fld;
		var rows = res.rows;

		rows.push({ relname: "" });

		for(var i in rows) {
			var row = rows[i];

			if(row.relname !== idx) {
				if(idx)
					if(arrayCompare(index.fields, fld))
						return createIndex(pgo);

				idx = row.relname;
				fld = [row.attname];
			}
			else
				fld.push(row.attname);
		}

		finalizeSync("CREATE INDEX ON " + table.tname + " USING " + index.type + " (" + index.fields.join(", ") + ")", pgo, 1007, table, index.fields, createIndex);
	});
}

function syncConstraint(pgo) {
	var schema = pgo.schema;
	var table = getTable(pgo);

	schema.cidx++;

	if(schema.cidx === table.constraints.length)
		return createIndex(pgo);

	var constraint = table.constraints[schema.cidx];

	pgo.client.query("SELECT attname FROM pg_attribute, pg_constraint WHERE attrelid = $1 AND conrelid = $1 AND attnum = conkey[1] AND attname = $2", [table.oid, constraint.field], function(err, res) {
		if(pgo.error(err, 1023, table.name))
			return;

		if(res.rowCount)
			return syncConstraint(pgo);

		var query = "ALTER TABLE " + table.tname + " ADD CONSTRAINT " + constraint.name;

		switch(constraint.type) {
		case "f":
			query += " FOREIGN KEY (" + constraint.field + ") REFERENCES " + schema.tables[schema.thash[constraint.fkTable]].tname + " (" + constraint.fkField + ")";
			break;
		case "u":
			query += " UNIQUE(" + constraint.field + ")";
		}

		finalizeSync(query, pgo, 1017, table, constraint.name, syncConstraint);
	});
}

function dropIndex(pgo, arr) {
	var table = pgo.schema.tables[pgo.schema.tidx];
	var place = 1;
	var query = "SELECT relname, attname, amname FROM pg_class, pg_index, pg_attribute, pg_am WHERE indrelid = $1 AND indexrelid = pg_class.oid AND attrelid = pg_class.oid AND relam = pg_am.oid";
	var values = [
		table.oid];
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
		var rows = res.rows;
		var found = true;

		rows.push({
			relname: "",
			attname: ""
		});

		for(var i in rows) {
			var row = rows[i];

			if(row.relname !== idx) {
				if(idx) {
					found = false;

					for(var l in table.index)
						if(arrayCompare(table.index[l].fields, fld) && table.index[l].type === am)
							found = true;

					if(! found)
						break;
				}

				am = row.amname;
				idx = row.relname;
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
	var table  = getTable(pgo);
	var parent = table.parent ? " INHERITS (" + pgo.schema.tables[pgo.schema.thash[table.parent]].tname + ")" : "";

	singleStep(pgo, table, "CREATE TABLE " + table.tname + " ()" + parent, 1008, syncTable);
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

	pgo.client.query(query + wheres.join(""), values, function(err, res) {
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

		finalizeSync("ALTER TABLE " + table.tname + " DROP CONSTRAINT " + conname, pgo, 1012, table, conname, dropConstraint);
	});
}

function dropTable(pgo) {
	var table = getTable(pgo);

	singleStep(pgo, table, "DROP TABLE " + table.tname + " CASCADE", 1016, createTable);
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

		if(! res.rowCount || res.rows[0].inhparent !== parent.oid)
			return dropTable(pgo);

		dropConstraint(pgo);
	});
}

function syncTable(pgo) {
	var table = pgo.schema.tables[pgo.schema.tidx];

	pgo.client.query("SELECT oid FROM pg_class WHERE relname = $1", [table.tname], function(err, res) {
		if(pgo.error(err, 1005, table.name))
			return;

		if(! res.rowCount)
			return createTable(pgo);

		table.oid = res.rows[0].oid;
		pgo.tables[table.name].oid = table.oid;

		syncParent(pgo);
	});
}

function createSequence(pgo) {
	var table = getTable(pgo);

	singleStep(pgo, table, "CREATE SEQUENCE " + table.tname + "_id_seq", 1009, syncTable);
}

function syncSequence(pgo) {
	var schema = pgo.schema;

	schema.tidx++;
	schema.cidx = -1;
	schema.fidx = -1;
	schema.iidx = -1;

	if(schema.tidx === schema.tables.length) {
		pgo.schema = false;

		return process.nextTick(pgo.done);
	}

	var err = createClasses(pgo);
	var table = schema.tables[schema.tidx];

	if(err)
		return pgo.done({
			pgo: {
				code: 2,
				message: errors[2],
				target: table.name,
				field: err
			}
		});

	if(table.parent || table.primaryKey)
		return syncTable(pgo);

	pgo.client.query("SELECT currval('" + table.tname + "_id_seq')", null, function(err, res) {
		if(! err)
			return pgo.done({
				pgo: {
					code: 1001,
					message: errors[1001],
					target: table.tname + "_id_seq"
				}
			});
		if(err.code === "42P01")
			return createSequence(pgo);
		if(err.code === "55000")
			return syncTable(pgo);

		pgo.error(err, 1002, table.tname + "_id_seq");
	});
}

syncField = require("./fields")(syncConstraint);

module.exports = syncSequence;
