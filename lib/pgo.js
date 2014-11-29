"use strict";

var pg   = require("pg");
var pgop = "PgOrm: ";

var errors       = require("./errors");
var syncSequence = require("./sync");

function PgOrm(database, log) {
	this.database = database;
	this.log      = log || function(msg) { console.log(pgop + msg); };
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

PgOrm.prototype.pg = pg;

PgOrm.prototype.JSON = "json";
PgOrm.prototype.INT2 = "int2";
PgOrm.prototype.INT4 = "int4";
PgOrm.prototype.INT8 = "int8";

PgOrm.prototype.VARCHAR = function(len) {
	if(len)
		return {type: "varchar", maxLen: len };

	return "varchar";
};

PgOrm.prototype.FKEY = function(table, field) {
	return {
		notNull: true,
		fkTable: table,
		fkField: field || "id"
	};
};

PgOrm.prototype.client = function(callback) {
	pg.connect(this.database, callback);
};

PgOrm.prototype.connect = function(callback) {
	var t = this;

	pg.connect(this.database, function(err, client, done) {
		t.client = client;
		t.done   = function(err) {
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

PgOrm.prototype.error = function(err, code, target, field) {
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

PgOrm.prototype.model = function(name, fields, options) {
	var schema = this.schema;

	if(! this.schema)
		throw new Error(pgop + "Can't call PgOrm.table after PgOrm.connect");

	if(name in schema.thash)
		throw new Error(pgop + "Model already defined: " + name);

	if(! options)
		options = {};

	var constraints = [];
	var i;

	schema.thash[name] = schema.tables.length;

	if(options.parent && schema.thash[options.parent] === undefined)
		throw new Error(pgop + "Parent model '" + options.parent + "' for model '" + name + "' doesn't exists");

	var farray = [{name: "id", type: this.INT8, notNull: true, unique: true, defaultValue: "nextval('" + name + "s_id_seq'::regclass)"}];

	if(options.parent)
		farray = [];
	else
		constraints.push({name: name + "_id_unique", type: "u", field: "id"});

	for(var fld in fields) {
		var fldef;

		if(! fields[fld])
			throw new Error(pgop + "Undefined field: '" + name + "." + fld + "'");

		switch(typeof fields[fld]) {
		case "string":
			fldef = {name: fld, type: fields[fld]};
			break;
		case "function":
			fldef = {name: fld, type: fields[fld]()};
			break;
		default:
			fldef = fields[fld];
			fldef.name = fld;

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
				fldef.type     = f.type;
				fldef.maxLen   = f.maxLen;
			}
		}

		if(! fldef.notNull)
			fldef.notNull = false;

		if(fldef.defaultValue)
			fldef.def = fldef.defaultValue;

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

		case "varchar":
			if(fldef.defaultValue)
				fldef.defaultValue = "'" + fldef.defaultValue.replace(/'/g, "''") + "'::character varying";
			break;
		default:
			throw new Error(pgop + "Can't find a valid type for '" + name + "." + fld + "'");
		}

		if(fldef.unique)
			constraints.push({name: name + "_" + fldef.name + "_unique", type: "u", field: fldef.name});

		if(fldef.fkTable)
			constraints.push({name: name + "_" + fldef.name + "_fkey", type: "f", field: fldef.name, fkTable: fldef.fkTable, fkField: fldef.fkField});

		farray.push(fldef);
	}

	for(i in options.index) {
		if("string" == typeof options.index[i])
			options.index[i] = {fields: [options.index[i]]};

		if("length" in options.index[i])
			options.index[i] = {fields: options.index[i]};

		if("string" == typeof options.index[i].fields)
			options.index[i].fields = [options.index[i].fields];

		if(! ("type" in options.index[i]))
			options.index[i].type = "btree";
	}

	options.name        = name;
	options.fields      = farray;
	options.constraints = constraints;

	schema.tables.push(options);
};

module.exports = PgOrm;
