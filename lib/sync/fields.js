"use strict";

var utils = require("./utils");

var getTable   = utils.getTable;
var singleStep = utils.singleStep;

var syncConstraint;

function fieldType(field) {
	switch(field.type) {
	case "timestamptz":
		return "timestamptz(" + field.precision + ")";

	case "varchar":
		if(field.maxLen)
			return "varchar(" + field.maxLen + ")";
	}

	return field.type;
}

function getField(pgo, table) {
	return table.fields[pgo.schema.fidx];
}

function createField(pgo) {
	var table = getTable(pgo);
	var field = getField(pgo, table);

	singleStep(pgo, table, "ALTER TABLE " + table.tname + " ADD COLUMN " + field.name + " " + fieldType(field), 1004, syncField.bind(null, pgo, true), field.name);
}

function dropFields(pgo) {
	var table = getTable(pgo);

	pgo.client.query("SELECT attname FROM pg_attribute WHERE attrelid = $1 AND attnum > 0 AND attisdropped = false", [table.oid], function(err, res) {
		if(pgo.error(err, 1022, table.name))
			return;

		var field;
		var fields = pgo.tables[table.name].__fields;
		var rows = res.rows;

		for(var i in rows)
			if(! (rows[i].attname in fields))
				field = rows[i].attname;

		if(! field)
			return syncConstraint(pgo);

		singleStep(pgo, table, "ALTER TABLE " + table.tname + " DROP COLUMN " + field + " CASCADE", 1014, dropFields, field);
	});
}

function syncFieldNull(pgo, resin) {
	var table = getTable(pgo);
	var field = getField(pgo, table);

	if(resin.attnotnull === field.notNull)
		return syncField(pgo);

	var doit = function() {
		var query = "ALTER TABLE " + table.tname + " ALTER COLUMN " + field.name + (field.notNull ? " SET" : " DROP") + " NOT NULL";

		singleStep(pgo, table, query, 1019, syncField, field.name);
	};

	if(field.notNull && field.defaultValue) {
		var query = "UPDATE " + table.tname + " SET " + field.name + " = " + field.defaultValue + " WHERE " + field.name + " IS NULL";

		pgo.log(query);
		pgo.client.query(query, null, function(err, res) {
			if(pgo.error(err, 1021, table.name, field.name))
				return;

			doit();
		});
	}
	else
		doit();
}

function syncFieldDefault(pgo, resin) {
	var table = getTable(pgo);
	var field = getField(pgo, table);

	if(resin.adsrc == field.defaultValue // eslint-disable-line eqeqeq
			|| (resin.adsrc === "now()" && field.defaultValue === "CURRENT_TIMESTAMP"))
		return syncFieldNull(pgo, resin);

	var doIt = function() {
		var query = "ALTER TABLE " + table.tname + " ALTER COLUMN " + field.name + (field.defaultValue ? " SET DEFAULT " + field.defaultValue : " DROP DEFAULT");

		singleStep(pgo, table, query, 1018, syncFieldNull.bind(null, pgo, resin), field.name);
	};

	if(field.type !== "timestamptz" || field.defaultValue === "CURRENT_TIMESTAMP")
		return doIt();

	pgo.client.query("SELECT " + field.defaultValue + "::character varying", null, function(err, res) {
		if(pgo.error(err, 1025, table.name, field.name))
			return;

		if(resin.adsrc === "'" + res.rows[0].varchar + "'::timestamp with time zone")
			return syncFieldNull(pgo, resin);

		field.defaultValue = "'" + res.rows[0].varchar + "'::timestamptz";
		doIt();
	});
}

function alterField(pgo, resin) {
	var table = getTable(pgo);
	var field = getField(pgo, table);
	var using = "";

	switch(field.type) {
	case "int2":
	case "int4":
	case "int8":
		switch(resin.typname) {
		case "varchar":
			using = " USING " + field.name + "::" + field.type;
		}
	}

	singleStep(pgo, table, "ALTER TABLE " + table.tname + " ALTER COLUMN " + field.name + " TYPE " + fieldType(field) + using, 1003, syncFieldDefault.bind(null, pgo, resin), field.name);
}

function syncField(pgo, redo) {
	var schema = pgo.schema;
	var table = getTable(pgo);

	if(! redo)
		schema.fidx++;

	if(schema.fidx === table.fields.length)
		return dropFields(pgo);

	var field = table.fields[schema.fidx];

	pgo.client.query("SELECT * FROM pg_type, pg_attribute LEFT JOIN pg_attrdef ON adrelid = attrelid AND adnum = attnum WHERE attrelid = $1 AND attnum > 0 AND atttypid = pg_type.oid AND attislocal = 't' AND attname = $2", [table.oid, field.name], function(err, res) {
		if(pgo.error(err, 1013, table.name))
			return;

		if(! res.rowCount)
			return createField(pgo);

		var row = res.rows[0];

		if(field.type !== row.typname)
			return alterField(pgo, row);

		if(field.type === "varchar" && (field.maxLen ? field.maxLen + 4 !== row.atttypmod : row.atttypmod !== -1))
			return alterField(pgo, row);

		syncFieldDefault(pgo, row);
	});
}

module.exports = function(next) {
	syncConstraint = next;

	return syncField;
};
