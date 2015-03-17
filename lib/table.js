"use strict";

function doReload(pgo, reload, ret, callback, keys, idx) {
	if(idx == keys.length) {
		if(callback)
			return callback(null, ret);

		return;
	}

	var arr = [];
	var obj;
	var table;

	for(var i in pgo.tables)
		if(pgo.tables[i].oid == keys[idx])
			table = pgo.tables[i];

	obj = reload[keys[idx]];

	for(i in obj)
		arr.push(i);

	table.load({id: ["in", arr]}, function(err, res) {
		if(err) {
			if(callback)
				return callback(err);

			return;
		}

		for(var i in res)
			ret[obj[res[i].id]] = res[i];

		doReload(pgo, reload, ret, callback, keys, idx + 1);
	});
}

function Table() {}

Table.prototype.load = function(where, order, callback) {
	var conds  = [];
	var pgo    = this.pgo;
	var place  = 0;
	var query  = "SELECT tableoid, * FROM " + this.__name + " WHERE ";
	var Record = this.__record;
	var reload = {};
	var table  = this;
	var values = [];

	if(callback === undefined && typeof(order) == "function") {
		callback = order;
		order    = null;
	}

	var exit = function(e) {
		if(callback)
			return process.nextTick(function() { callback(e); });
	};

	for(var i in where) {
		if(where[i] instanceof Array) {
			switch(where[i][0]) {
			case "in":
				var cnd = i + " IN (";

				for(var l in where[i][1]) {
					cnd += "$" + (++place) + (l == where[i][1].length - 1? ")" : ",");
					values.push(where[i][1][l]);
				}

				conds.push(cnd);
			}
		}
		else {
			conds.push(i + " = $" + (++place));
			values.push(where[i]);
		}
	}

	query += conds.join(" AND ");

	if(order) {
		if(typeof(order) == "string")
			order = [order];

		query += " ORDER BY ";

		for(i in order) {
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
			return exit(err);

		client.query(query, values, function(err, res) {
			done();

			if(err)
				return exit(err);

			var ret  = [];
			var rows = res.rows;

			for(var i in rows) {
				var rec = new Record(true);
				var row = rows[i];

				if(row.tableoid == table.oid) {
					for(var l in row)
						if(l != "tableoid")
							rec[l] = row[l];

					try {
						rec.__postLoad();
					}
					catch(e) {
						return exit(e);
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

			if(callback)
				callback(null, ret);
		});
	});
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

		var doit = function() {
			pgo.log(query + " :: " + JSON.stringify(values));

			client.query(query, values, function(err, res) {
				done();
				callback(err);
			});
		};

		if("id" in record) {
			for(i in table.__fields)
				if(i != "id") {
					fields.push(i + " = $" + (++place));

					if(! (i in record))
						values.push(null);
					else if(table.__fields[i])
						values.push(JSON.stringify(record[i]));
					else
						values.push(record[i]);
				}

			query = "UPDATE " + table.__name + " SET " + fields.join(", ") + " WHERE id = $" + (++place);
			values.push(record.id);

			return doit();
		}

		var idplace;

		for(i in table.__fields) {
			if(i == "id")
				idplace = place;

			fields.push(i);
			places.push("$" + (++place));

			if(! (i in record))
				values.push(null);
			else if(table.__fields[i])
				values.push(JSON.stringify(record[i]));
			else
				values.push(record[i]);
		}

		query = "INSERT INTO " + table.__name + " (" + fields.join(",") + ") VALUES (" + places.join(",") + ")";

		pgo.log("SELECT nextval('" + table.__sequence + "')");
		client.query("SELECT nextval('" + table.__sequence + "')", function(err, res) {
			if(err) {
				done();

				return callback(err);
			}

			values[idplace] = record.id = res.rows[0].nextval;
			doit();
		});
	});
};

module.exports = Table;
