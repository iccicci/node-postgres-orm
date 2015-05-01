"use strict";

var errors = require("./errors");

function empty() {}

function Record() {
	var del = false;
	var obj = {};
	var tx;

	Object.defineProperty(this, "__del", {
		set: function() { del = true; },
		get: function() { return del; }
	});

	Object.defineProperty(this, "__obj", {
		set: function(v) { obj = v; },
		get: function() { return obj; }
	});

	Object.defineProperty(this, "__tx", {
		set: function(v) { tx = v; },
		get: function() { return tx; }
	});
}

Record.prototype.__init       = function() {};
Record.prototype.__postDelete = function() {};
Record.prototype.__postLoad   = function() {};
Record.prototype.__postSave   = function() {};
Record.prototype.__preDelete  = function() {};
Record.prototype.__preSave    = function() {};

Record.prototype.del = function(callback) {
	var t = this;

	if(typeof(callback) != "function")
		throw new Error("Pgo.record.del: callback must be a function");

	if(this.__del)
		return process.nextTick(callback.bind(null, {
			pgo: {
				code:    1027,
				doing:   errors[1027],
				message: "A record can't be deleted twice"
			},
		}));

	if(! this.__obj.id)
		return process.nextTick(callback.bind(null, {
			pgo: {
				code:    1029,
				doing:   errors[1029],
				message: "A record can't be deleted before it is saved"
			},
		}));

	try {
		this.__preDelete();
	}
	catch(e) {
		return process.nextTick(callback.bind(null, e));
	}

	var doIt = function(client, done) {
		var query  = "DELETE FROM " + t.__table.__name + " WHERE id = $1";
		var values = [t.__obj.id];

		t.pgo.log(query + " :: " + JSON.stringify(values));
		client.query(query, values, function(err, res) {
			t.__del = true;
			done();

			if(err)
				return callback(err);

			try {
				t.__postDelete();
			}
			catch(e) {
				return callback(e);
			}

			callback(null);
		});
	};

	if(this.__tx)
		return doIt(this.__tx.client, empty);

	this.pgo.client(function(err, client, done) {
		if(err)
			return callback(err);

		doIt(client, done);
	});
};

Record.prototype.save = function(callback) {
	var t = this;

	if(typeof(callback) != "function")
		throw new Error("Pgo.record.save: callback must be a function");

	if(this.__del)
		return process.nextTick(callback.bind(null, {
			pgo: {
				code:    1028,
				doing:   errors[1028],
				message: "A record can't be saved after it was deleted"
			},
		}));

	try {
		this.__preSave();
	}
	catch(e) {
		return process.nextTick(callback.bind(null, e));
	}

	this.__table.save(function(err) {
		if(err)
			return callback(err);

		try {
			t.__postSave();
		}
		catch(e) {
			return callback(e);
		}

		callback(null);
	}, this);
};

module.exports = Record;
