"use strict";

function Table() {}

Table.prototype.load = function(where, callback) {
	var conds  = [];
	var pgo    = this.pgo;
	var place  = 0;
	var query  = "SELECT * FROM " + this.__name + " WHERE ";
	var Record = this.__record;
	var values = [];
	var exit   = function(e) {
		if(callback)
			return process.nextTick(function() { callback(e); });
	};

	for(var i in where) {
		conds.push(i + " = $" + (++place));
		values.push(where[i]);
	}

	query += conds.join(" AND ");
	pgo.log(query + " :: " + JSON.stringify(values));

	pgo.pg.connect(pgo.database, function(err, client, done) {
		if(err)
			return exit(err);

		client.query(query, values, function(err, res) {
			if(err)
				return exit(err);

			done();

			var ret  = [];
			var rows = res.rows;

			for(var i in rows) {
				var rec = new Record(true);
				var row = rows[i];

				for(var l in row)
					rec[l] = row[l];

				try {
					rec.__postLoad();
				}
				catch(e) {
					return exit(e);
				}

				ret.push(rec);
			}

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
	var exit   = function(e) {
		if(callback)
			return process.nextTick(function() { callback(e); });
	};

	pgo.pg.connect(pgo.database, function(err, client, done) {
		var i;

		if(err)
			return exit(err);

		var doit = function() {
			pgo.log(query + " :: " + JSON.stringify(values));

			client.query(query, values, function(err, res) {
				done();

				if(callback)
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

		client.query("SELECT nextval('" + table.__sequence + "')", function(err, res) {
			if(err)
				return exit(err);

			values[idplace] = record.id = res.rows[0].nextval;
			doit();
		});
	});
};

module.exports = Table;
