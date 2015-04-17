"use strict";

var errors = require("./errors");

function doReload(pgo, reload, ret, callback, keys, idx) {
	if(idx == keys.length)
		return callback(null, ret);

	var arr = [];
	var obj;
	var table;

	for(var i in pgo.tables)
		if(pgo.tables[i].oid == keys[idx])
			table = pgo.tables[i];

	obj = reload[keys[idx]];

	for(i in obj)
		arr.push(i);

	table.load({id__in: arr}, function(err, res) {
		if(err)
			return callback(err);

		for(var i in res)
			ret[obj[res[i].id]] = res[i];

		doReload(pgo, reload, ret, callback, keys, idx + 1);
	});
}

function Table() {}

Table.prototype.load = function(where, order, callback) {
	var pgo    = this.pgo;
	var query  = "SELECT tableoid, * FROM " + this.__name;
	var Record = this.__record;
	var reload = {};
	var table  = this;
	var values = [];

	if(typeof(where) != "object")
		throw new Error("Pgo.load: where must be an object");

	if(callback === undefined) {
		callback = order;
		order    = null;
	}

	if(typeof(callback) != "function")
		throw new Error("Pgo.load: callback must be a function");

	query += this.where(where, values);

	if(order) {
		if(typeof(order) == "string")
			order = [order];

		query += " ORDER BY ";

		for(var i in order) {
			if(order[i].substr(0, 1) == "-")
				query += order[i].substr(1) + " DESC";
			else
				query += order[i];

			if(order.length - 1 != i)
				query += ",";
		}
	}

	pgo.log(query + " :: " + JSON.stringify(values));

	pgo.pg.connect(pgo.database, function(err, client, done) {
		if(err)
			return callback(err);

		client.query(query, values, function(err, res) {
			done();

			if(err)
				return callback(err);

			var ret  = [];
			var rows = res.rows;

			for(var i in rows) {
				var rec = new Record(true);
				var row = rows[i];

				if(row.tableoid == table.oid) {
					delete row.tableoid;
					rec.__obj = row;

					for(var l in row)
						rec[l] = Object.clone(row[l], true);

					try {
						rec.__postLoad();
					}
					catch(e) {
						return callback(e);
					}

					ret.push(rec);
				}
				else {
					if(! reload[row.tableoid])
						reload[row.tableoid] = {};

					reload[row.tableoid][row.id] = ret.length;
					ret.push(null);
				}
			}

			if(Object.keys(reload).length)
				return doReload(pgo, reload, ret, callback, Object.keys(reload), 0);

			callback(null, ret);
		});
	});
};

Table.prototype.where = function(where, values) {
	var conds = [];
	var place = 0;

	for(var i in where) {
		var found = false;

		for(var l in this.__fields) {
			if(i == l) {
				conds.push(i + " = $" + (++place));
				values.push(where[i]);
				found = true;
			}
			else if(i.indexOf(l) === 0) {
				var op = i.substr(l.length);

				switch(op) {
				case "__eq":
					conds.push(l + " = $" + (++place));
					values.push(where[i]);
					found = true;
					break;

				case "__ne":
					conds.push(l + " <> $" + (++place));
					values.push(where[i]);
					found = true;
					break;

				case "__lt":
					conds.push(l + " < $" + (++place));
					values.push(where[i]);
					found = true;
					break;

				case "__le":
					conds.push(l + " <= $" + (++place));
					values.push(where[i]);
					found = true;
					break;

				case "__gt":
					conds.push(l + " > $" + (++place));
					values.push(where[i]);
					found = true;
					break;

				case "__ge":
					conds.push(l + " >= $" + (++place));
					values.push(where[i]);
					found = true;
					break;

				case "__in":
					var cnd = l + " IN (";

					for(var j in where[i]) {
						cnd += "$" + (++place) + (j == where[i].length - 1? ")" : ",");
						values.push(where[i][j]);
					}

					conds.push(cnd);
					found = true;
					break;

				case "__like":
					conds.push(l + " LIKE $" + (++place));
					values.push(where[i]);
					found = true;
					break;
				}
			}
		}

		if(i == "__") {
			conds.push("(" + where[i] + ")");
			found = true;
		}

		if(! found)
			throw new Error("Pgo.load: can't find any valid field-operation for: " + i);
	}

	if(conds.length)
		return " WHERE " + conds.join(" AND ");

	return "";
};

Table.prototype.save = function(callback, record) {
	var fields = [];
	var pgo    = this.pgo;
	var place  = 0;
	var places = [];
	var query;
	var table  = this;
	var values = [];

	pgo.pg.connect(pgo.database, function(err, client, done) {
		var i;

		if(err)
			return callback(err);

		if("id" in record.__obj) {
			for(i in table.__fields)
				if(i != "id") {
					fields.push(i + " = $" + (++place));

					if(! (i in record))
						values.push(null);
					else
						values.push(record[i]);
				}

			query = "UPDATE " + table.__name + " SET " + fields.join(", ") + " WHERE id = $" + (++place);
			values.push(record.__obj.id);
		}
		else {
			for(i in table.__fields)
				if(i in record) {
					fields.push(i);
					places.push("$" + (++place));
					values.push(record[i]);
				}

			if(fields.length)
				query = "INSERT INTO " + table.__name + " (" + fields.join(",") + ") VALUES (" + places.join(",") + ")";
			else
				query = "INSERT INTO " + table.__name + " DEFAULT VALUES";
		}

		query += " RETURNING *";

		pgo.log(query + " :: " + JSON.stringify(values));
		client.query(query, values, function(err, res) {
			done();

			if(res) {
				if(res.rows.length) {
					var row = res.rows[0];

					record.__obj = row;

					for(var i in row)
						record[i] = Object.clone(row[i], true);
				}
				else
					err = {
						pgo: {
							code:    1026,
							doing:   errors[1026],
							message: "It seems record was disappered from database between load and save"
						},
					};
			}

			callback(err);
		});
	});
};

module.exports = Table;
