"use strict";

var errors = require("./errors");

function doReload(pgo, reload, ret, callback, keys, idx, tx) {
	if(idx === keys.length)
		return callback(null, ret);

	var arr = [];
	var obj;
	var table;
	var where = {};

	for(var i in pgo.tables)
		if(pgo.tables[i].oid == keys[idx]) // eslint-disable-line eqeqeq
			table = pgo.tables[i];

	obj = reload[keys[idx]];

	for(i in obj)
		arr.push(i);

	where[table.pk + "__in"] = arr;

	table.load(where, null, function(err, res) {
		if(err)
			return callback(err);

		for(var i in res)
			ret[obj[res[i][
				table.pk]]] = res[i];

		doReload(pgo, reload, ret, callback, keys, idx + 1, tx);
	}, tx, null, pgo);
}

function empty() {}

function Table() {}

Table.prototype.load = function(where, order, callback, tx, lock, pgo) {
	var query = "SELECT tableoid, * FROM " + this.__name;
	var Record = this.__record;
	var reload = {};
	var table = this;
	var values = [];

	if(typeof(where) !== "object")
		throw new Error("Pgo.load: where must be an object");

	if(callback === undefined) {
		callback = order;
		order = null;
	}

	if(typeof(callback) !== "function")
		throw new Error("Pgo.load: callback must be a function");

	if(tx && tx.closed)
		return process.nextTick(callback.bind(null, {
			pgo: {
				code: 1030,
				doing: errors[1030],
				message: "Pgo.load: Can't load records within an already closed Transaction"
			},
		}));

	query += this.where(where, values);

	if(order) {
		if(typeof(order) === "string")
			order = [order];

		query += " ORDER BY ";

		for(var i in order) {
			if(order[i].substr(0, 1) === "-")
				query += order[i].substr(1) + " DESC";
			else
				query += order[i];

			if(order.length - 1 != i) // eslint-disable-line eqeqeq
				query += ",";
		}
	}

	if(lock)
		query += " FOR UPDATE";

	var doIt = function(client, done) {
		pgo.log(query + " :: " + JSON.stringify(values));
		client.query(query, values, function(err, res) {
			done();

			if(err)
				return callback(err);

			var ret = [];
			var rows = res.rows;

			for(var i in rows) {
				var row = rows[i];

				if(row.tableoid === table.oid) {
					var rec = new Record(tx, true);

					delete row.tableoid;
					rec.__obj = row;

					if(tx) {
						rec.__tx = tx;
						tx.records.push(rec);
					}

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

					reload[row.tableoid][
						row[table.pk]] = ret.length;
					ret.push(null);
				}
			}

			if(Object.keys(reload).length)
				return doReload(pgo, reload, ret, callback, Object.keys(reload), 0, tx);

			callback(null, ret);
		});
	};

	if(tx)
		return doIt(tx.client, empty);

	pgo.client(function(err, client, done) {
		if(err)
			return callback(err);

		doIt(client, done);
	});
};

var stdWhere = {
	"__eq": " = $",
	"__ne": " <> $",
	"__lt": " < $",
	"__le": " <= $",
	"__gt": " > $",
	"__ge": " >= $",
	"__like": " LIKE $"
};

Table.prototype.whereCond = function(where, values, i, place, conds) {
	for(var l in this.__fields) {
		if(i === l) {
			conds.push(i + " = $" + (place + 1));
			values.push(where[i]);

			return 1;
		}

		if(i.indexOf(l) === 0) {
			var op = i.substr(l.length);

			if(op in stdWhere) {
				conds.push(l + stdWhere[op] + (place + 1));
				values.push(where[i]);

				return 1;
			}

			if(op === "__null") {
				conds.push(l + " IS " + (where[i] ? "" : "NOT ") + "NULL");

				return 0;
			}

			if(op === "__in") {
				var cnd = l + " IN (";
				var ret = 0;

				for(var j in where[i]) {
					cnd += "$" + (place + (++ret)) + (j == where[i].length - 1 ? ")" : ","); // eslint-disable-line eqeqeq
					values.push(where[i][j]);
				}

				conds.push(cnd);

				return ret;
			}
		}
	}

	return -1;
};

Table.prototype.where = function(where, values) {
	var conds = [];
	var place = 0;

	for(var i in where) {
		if(i === "__")
			conds.push("(" + where[i] + ")");
		else {
			var inc = this.whereCond(where, values, i, place, conds);

			if(inc === -1)
				throw new Error("Pgo.load: can't find any valid field-operation for: " + i);

			place += inc;
		}
	}

	if(conds.length)
		return " WHERE " + conds.join(" AND ");

	return "";
};

Table.prototype.doSave = function(callback, record, client, done, query, values) {
	record.pgo.log(query + " :: " + JSON.stringify(values));
	query += " RETURNING *";
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
						code: 1026,
						doing: errors[1026],
						message: "It seems record was disappered from database between load and save"
					},
				};
		}

		callback(err, true);
	});
};

Table.prototype.doInsert = function(record, values) {
	var fields = [];
	var place = 0;
	var places = [];

	for(var i in this.__fields)
		if(i in record) {
			fields.push(i);
			places.push("$" + (++place));
			values.push(record[i]);
		}

	if(fields.length)
		return "INSERT INTO " + this.__name + " (" + fields.join(",") + ") VALUES (" + places.join(",") + ")";

	return "INSERT INTO " + this.__name + " DEFAULT VALUES";
};

Table.prototype.doUpdate = function(callback, record, values) {
	var fields = [];
	var place = 0;

	for(var i in this.__fields)
		if(i !== this.pk && (typeof(record[i]) === "object" ? ! Object.equals(record[i], record.__obj[i]) : record[i] !== record.__obj[i])) {
			fields.push(i + " = $" + (++place));

			if(! (i in record))
				values.push(null);
			else
				values.push(record[i]);
		}

	if(! place)
		return process.nextTick(callback.bind(null, null, false));

	values.push(record.__obj[this.pk]);

	return "UPDATE " + this.__name + " SET " + fields.join(", ") + " WHERE " + this.pk + " = $" + (++place);
};

Table.prototype.save = function(callback, record) {
	var pgo = record.pgo;
	var query;
	var table = this;
	var values = [];

	if(table.pk in record.__obj)
		query = this.doUpdate(callback, record, values);
	else
		query = this.doInsert(record, values);

	if(typeof query !== "string")
		return;

	if(record.__tx)
		return this.doSave(callback, record, record.__tx.client, empty, query, values);

	pgo.client(function(err, client, done) {
		if(err)
			return callback(err, true);

		table.doSave(callback, record, client, done, query, values);
	});
};

module.exports = Table;
