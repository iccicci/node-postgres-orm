"use strict";

var pgop = "Pgo: ";
var util = require("util");

function modelChecks(name, fields, options) {
  if(! this.schema) throw new Error(pgop + "Can't call Pgo.table after Pgo.connect");

  if(name in this.schema.thash) throw new Error(pgop + "Model already defined: " + name);

  if(typeof fields !== "object") throw new Error("Pgo.model: fields must be an Object");

  if(! options) options = {};

  if(typeof options !== "object") throw new Error("Pgo.model: options must be an Object");

  if(options.attributes && typeof options.attributes !== "object") throw new Error("Pgo.model: options.attributes must be an Object");

  this.schema.thash[name] = this.schema.tables.length;

  if(options.parent && this.schema.thash[options.parent] === undefined) throw new Error(pgop + "Parent model '" + options.parent + "' for model '" + name + "' doesn't exists");

  if(options.primaryKey && ! fields[options.primaryKey]) throw new Error(pgop + "Undefined field: '" + name + "." + options.primaryKey + "' specified as primary key");

  return options;
}

function modelFieldType(name, fields, options, fld) {
  var fldef;

  if(! fields[fld]) throw new Error(pgop + "Undefined field: '" + name + "." + fld + "'");

  switch(typeof fields[fld]) {
  case "string":
    fldef = {
      name: fld,
      type: fields[fld],
    };
    break;
  case "function":
    fldef = {
      name: fld,
      type: fields[fld](),
    };
    break;
  default:
    fldef = fields[fld];
    fldef.name = fld;
  }

  if(options.primaryKey === fld) {
    fldef.notNull = true;
    fldef.unique = true;
  }

  if("function" === typeof fldef.type) fldef.type = fldef.type();

  if("object" === typeof fldef.type) {
    var typ = fldef.type;

    for(var i in typ) fldef[i] = typ[i];
  }

  return fldef;
}

function modelFieldFK(name, fields, options, fld, fldef) {
  var i;
  var ref;

  for(i in this.schema.tables) {
    if(this.schema.tables[i].name === fldef.fkTable) {
      ref = this.schema.tables[i];
      break;
    }
  }

  if(! ref) throw new Error(pgop + "Can't find model '" + fldef.fkTable + "' to create FOREING KEY on '" + name + "." + fld + "'");

  var f;

  for(i in ref.fields) {
    if(ref.fields[i].name === fldef.fkField) {
      f = ref.fields[i];
      break;
    }
  }

  if(! f) throw new Error(pgop + "Can't find field '" + fldef.fkTable + "." + fldef.fkField + "' to create FOREING KEY on '" + name + "." + fld + "'");

  fldef.fkTable = ref.name;
  fldef.type = f.type;
  fldef.maxLen = f.maxLen;
}

function modelFieldDefault(name, fields, options, fld, fldef) {
  switch(fldef.type) {
  case "int2":
  case "int4":
  case "int8":
    if(fldef.defaultValue) fldef.defaultValue = parseInt(fldef.defaultValue, 10);
    break;

  case "json":
    if(fldef.defaultValue) fldef.defaultValue = "'" + JSON.stringify(fldef.defaultValue).replace(/'/g, "''") + "'::json";
    break;

  case "timestamptz":
    if(fldef.defaultValue) {
      if(util.isDate(fldef.defaultValue)) fldef.defaultValue = fldef.defaultValue.toISOString();

      if(fldef.defaultValue !== this.NOW) fldef.defaultValue = "'" + fldef.defaultValue.replace(/'/g, "''") + "'::timestamp with time zone";
    }
    break;

  case "varchar":
    if(fldef.defaultValue) fldef.defaultValue = "'" + fldef.defaultValue.replace(/'/g, "''") + "'::character varying";
    break;

  case "text":
    if(fldef.defaultValue) fldef.defaultValue = "'" + fldef.defaultValue.replace(/'/g, "''") + "'::text";
    break;

  default:
    throw new Error(pgop + "Can't find a valid type for '" + name + "." + fld + "'");
  }
}

function modelField(name, fields, options, fld, constraints, farray) {
  var fldef = this.__modelFieldType(name, fields, options, fld);

  if(fldef.defaultValue) fldef.notNull = true;

  if(fldef.fkTable) this.__modelFieldFK(name, fields, options, fld, fldef);

  if(! fldef.notNull) fldef.notNull = false;

  this.__modelFieldDefault(name, fields, options, fld, fldef);

  if(fldef.unique) {
    constraints.push({
      name:  name + "_" + fldef.name + "_unique",
      type:  "u",
      field: fldef.name,
    });
  }

  if(fldef.fkTable) {
    constraints.push({
      name:    name + "_" + fldef.name + "_fkey",
      type:    "f",
      field:   fldef.name,
      fkTable: fldef.fkTable,
      fkField: fldef.fkField,
    });
  }

  farray.push(fldef);
}

function model(name, fields, options) {
  var constraints = [];
  var i;
  var schema = this.schema;
  var tname = name + "s";
  var farray = [
    {
      name:    "id",
      type:    this.INT8,
      notNull: true,
      unique:  true,
    },
  ];

  options = this.__modelChecks(name, fields, options);
  options.pk = options.primaryKey || "id";

  if(options.tableName) tname = options.tableName;

  farray[0].defaultValue = "nextval('" + tname + "_id_seq'::regclass)";

  if(options.parent || options.primaryKey) farray = [];

  if(options.parent) options.pk = schema.tables[schema.thash[options.parent]].pk;
  else {
    constraints.push({
      name:  name + "_" + options.pk + "_unique",
      type:  "u",
      field: options.pk,
    });
  }

  for(var fld in fields) this.__modelField(name, fields, options, fld, constraints, farray);

  for(i in options.index) {
    if("string" === typeof options.index[i]) {
      options.index[i] = {
        fields: [options.index[i]],
      };
    }

    if("length" in options.index[i]) {
      options.index[i] = {
        fields: options.index[i],
      };
    }

    if("string" === typeof options.index[i].fields) options.index[i].fields = [options.index[i].fields];

    if(! ("type" in options.index[i])) options.index[i].type = "btree";

    if(! ("fields" in options.index[i])) throw new Error("Pgo.model: index (idx: " + i + ") without fields");
  }

  options.constraints = constraints;
  options.fields = farray;
  options.name = name;
  options.tname = tname;

  schema.tables.push(options);
}

module.exports = {
  model:               model,
  __modelChecks:       modelChecks,
  __modelField:        modelField,
  __modelFieldDefault: modelFieldDefault,
  __modelFieldFK:      modelFieldFK,
  __modelFieldType:    modelFieldType,
};
