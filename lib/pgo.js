"use strict";

require("js-object-clone");

var pg = require("pg");
var pgop = "Pgo: ";
var util = require("util");

var errors = require("./errors");
var syncSequence = require("./sync");
var Transaction = require("./transaction");

function Pgo(database, log) {
	this.database = database;
	this.log = log || function(msg) {
		console.log(pgop + msg);
	};
	this.load = {};
	this.models = {};
	this.tables = {};
	this.schema = {
		classes: {},
		tables: [],
		thash: {},
		tidx: -1
	};
}

Pgo.prototype.pg = pg;

Pgo.prototype.NOW = "CURRENT_TIMESTAMP";

Pgo.prototype.JSON = "json";
Pgo.prototype.INT2 = "int2";
Pgo.prototype.INT4 = "int4";
Pgo.prototype.INT8 = "int8";

Pgo.prototype.TIMESTAMP = function(precision) {
	if(precision === undefined)
		return {
			type: "timestamptz",
			precision: 6
		};

	if(parseInt(precision) != precision || precision < 0 || precision > 6)
		throw new Error("Pgo.TIMESTAMP: precision must be an integer between 0 and 6");

	return {
		type: "timestamptz",
		precision: precision
	};
};

Pgo.prototype.VARCHAR = function(len) {
	if(! len)
		return "varchar";

	if(parseInt(len) != len || len < 0)
		throw new Error("Pgo.VARCHAR: len must be a positive integer");

	return {
		type: "varchar",
		maxLen: len
	};
};

Pgo.prototype.FKEY = function(table, field) {
	return {
		notNull: true,
		fkTable: table,
		fkField: field || "id"
	};
};

Pgo.prototype.begin = function(callback) {
	var t = this;

	if(typeof(callback) != "function")
		throw new Error("Pgo.begin: callback must be a function");

	pg.connect(this.database, function(err, client, done) {
		if(err)
			return callback(err);

		t.log("BEGIN");
		client.query("BEGIN", {}, function(err) {
			if(err) {
				done();

				return callback(err);
			}

			var tx = new t.Transaction();
			var createAccessors = function(record, table) {
				tx.load[record] = function(where, order, callback) {
					table.load(where, order, callback, tx);
				};
				tx.lock[record] = function(where, order, callback) {
					table.load(where, order, callback, tx, true);
				};
			};

			tx.client = client;
			tx.done = done;

			for(var record in t.models)
				createAccessors(record, t.tables[record + "s"]);

			callback(null, tx);
		});
	});
};

Pgo.prototype.client = function(callback) {
	pg.connect(this.database, callback);
};

Pgo.prototype.connect = function(callback) {
	var t = this;

	this.Transaction = function() {
		this.load = {};
		this.lock = {};
		this.records = [];
	};
	this.Transaction.prototype.pgo = this;
	this.Transaction.prototype.close = Transaction.close;
	this.Transaction.prototype.commit = Transaction.commit;
	this.Transaction.prototype.rollback = Transaction.rollback;

	pg.connect(this.database, function(err, client, done) {
		t.client = client;
		t.done = function(err) {
			delete t.client;
			delete t.done;

			done();
			callback(err);
		};

		if(t.error(err, 1))
			return;

		syncSequence(t);
	});
};

Pgo.prototype.error = function(err, code, target, field) {
	if(! err)
		return false;

	err = {
		pgo: {
			code: code,
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

Pgo.prototype.model = function(name, fields, options) {
	var schema = this.schema;

	if(! this.schema)
		throw new Error(pgop + "Can't call Pgo.table after Pgo.connect");

	if(name in schema.thash)
		throw new Error(pgop + "Model already defined: " + name);

	if(typeof(fields) != "object")
		throw new Error("Pgo.model: fields must be an Object");

	if(! options)
		options = {};

	if(typeof(options) != "object")
		throw new Error("Pgo.model: options must be an Object");

	var constraints = [];
	var i;

	schema.thash[name] = schema.tables.length;

	if(options.parent && schema.thash[options.parent] === undefined)
		throw new Error(pgop + "Parent model '" + options.parent + "' for model '" + name + "' doesn't exists");

	var farray = [
		{
			name: "id",
			type: this.INT8,
			notNull: true,
			unique: true,
			defaultValue: "nextval('" + name + "s_id_seq'::regclass)"
		}
	];

	if(options.noId && ! fields[options.noId])
		throw new Error(pgop + "Undefined field: '" + name + "." + options.noId + "' specified as primary key");

	options.pk = options.noId || "id";

	if(options.parent || options.noId)
		farray = [];

	if(! options.parent)
		constraints.push({
			name: name + "_" + options.pk + "_unique",
			type: "u",
			field: options.pk
		});

	for(var fld in fields) {
		var fldef;

		if(! fields[fld])
			throw new Error(pgop + "Undefined field: '" + name + "." + fld + "'");

		switch(typeof fields[fld]) {
		case "string":
			fldef = {
				name: fld,
				type: fields[fld]
			};
			break;
		case "function":
			fldef = {
				name: fld,
				type: fields[fld]()
			};
			break;
		default:
			fldef = fields[fld];
			fldef.name = fld;
		}

		if(options.noId == fld) {
			fldef.notNull = true;
			fldef.unique = true;
		}

		if("function" == typeof fldef.type)
			fldef.type = fldef.type();

		if("object" == typeof fldef.type) {
			var typ = fldef.type;

			for(i in typ)
				fldef[i] = typ[i];
		}

		if(fldef.defaultValue)
			fldef.notNull = true;

		if(fldef.fkTable) {
			var ref;

			for(i in schema.tables)
				if(schema.tables[i].name == fldef.fkTable) {
					ref = schema.tables[i];
					break;
				}

			if(! ref)
				throw new Error(pgop + "Can't find model '" + fldef.fkTable + "' to create FOREING KEY on '" + name + "." + fld + "'");

			var f;

			for(i in ref.fields)
				if(ref.fields[i].name == fldef.fkField) {
					f = ref.fields[i];
					break;
				}

			if(! f)
				throw new Error(pgop + "Can't find field '" + fldef.fkTable + "." + fldef.fkField + "' to create FOREING KEY on '" + name + "." + fld + "'");

			fldef.fkTable += "s";
			fldef.type = f.type;
			fldef.maxLen = f.maxLen;
		}

		if(! fldef.notNull)
			fldef.notNull = false;

		switch(fldef.type) {
		case "int2":
		case "int4":
		case "int8":
			if(fldef.defaultValue)
				fldef.defaultValue = parseInt(fldef.defaultValue);
			break;

		case "json":
			if(fldef.defaultValue)
				fldef.defaultValue = "'" + JSON.stringify(fldef.defaultValue).replace(/'/g, "''") + "'::json";
			break;

		case "timestamptz":
			if(fldef.defaultValue) {
				if(util.isDate(fldef.defaultValue))
					fldef.defaultValue = fldef.defaultValue.toISOString();

				if(fldef.defaultValue != this.NOW)
					fldef.defaultValue = "'" + fldef.defaultValue.replace(/'/g, "''") + "'::timestamp with time zone";
			}
			break;

		case "varchar":
			if(fldef.defaultValue)
				fldef.defaultValue = "'" + fldef.defaultValue.replace(/'/g, "''") + "'::character varying";
			break;

		default:
			throw new Error(pgop + "Can't find a valid type for '" + name + "." + fld + "'");
		}

		if(fldef.unique)
			constraints.push({
				name: name + "_" + fldef.name + "_unique",
				type: "u",
				field: fldef.name
			});

		if(fldef.fkTable)
			constraints.push({
				name: name + "_" + fldef.name + "_fkey",
				type: "f",
				field: fldef.name,
				fkTable: fldef.fkTable,
				fkField: fldef.fkField
			});

		farray.push(fldef);
	}

	for(i in options.index) {
		if("string" == typeof options.index[i])
			options.index[i] = {
				fields: [
					options.index[i]]
			};

		if("length" in options.index[i])
			options.index[i] = {
				fields: options.index[i]
			};

		if("string" == typeof options.index[i].fields)
			options.index[i].fields = [
				options.index[i].fields];

		if(! ("type" in options.index[i]))
			options.index[i].type = "btree";

		if(! ("fields" in options.index[i]))
			throw new Error("Pgo.model: index (idx: " + i + ") without fields");
	}

	options.name = name;
	options.fields = farray;
	options.constraints = constraints;

	schema.tables.push(options);
};

module.exports = Pgo;
