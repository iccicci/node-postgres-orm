"use strict";

var dd = require("double-done");

var errors = require("./errors");

function clone() {
	if(this instanceof Date)
		return new Date(this);

	if(this instanceof Object) {
		var keys = Object.keys(this);
		var l;
		var ret  = this instanceof Array ? [] : {};

		for(var i in keys) {
			l      = keys[i];
			ret[l] = clone.call(this[l]);
		}

		return ret;
	}

	return this;
}

function compare(o) {
	if(this instanceof Date)
		return o instanceof Date ? this.getTime() !== o.getTime() : true;

	if(this instanceof Object) {
		if(! (o instanceof Object))
			return true;

		var keys = Object.keys(this);
		var i, l;

		for(i in keys) {
			l = keys[i];

			if((! (l in o)) || compare.call(this[l], o[l]))
				return true;
		}

		keys = Object.keys(o);

		for(i in keys)
			if(! (keys[i] in this))
				return true;

		return false;
	}

	return this != o; // eslint-disable-line eqeqeq
}

function empty() {}

function Record() {
	var del = false;
	var obj = {};
	var tx;

	Object.defineProperty(this, "__del", {
		set: function() {
			del = true;
		},
		get: function() {
			return del;
		}
	});

	Object.defineProperty(this, "__obj", {
		set: function(v) {
			obj = v;
		},
		get: function() {
			return obj;
		}
	});

	Object.defineProperty(this, "__tx", {
		set: function(v) {
			tx = v;
		},
		get: function() {
			return tx;
		}
	});
}

Record.prototype.__init       = empty;
Record.prototype.__postDelete = empty;
Record.prototype.__postLoad   = empty;
Record.prototype.__postSave   = empty;
Record.prototype.__preDelete  = empty;
Record.prototype.__preSave    = empty;
Record.prototype.clone        = clone;
Record.prototype.compare      = compare;

Record.prototype.del = function(done, doneOk) {
	doneOk = dd(done, doneOk);
	var t  = this;

	if(typeof(done) !== "function")
		throw new Error("Pgo.record.del: callback must be a function");

	if(this.wasDeleted(done, 1027, "A record can't be deleted twice"))
		return;

	if(! this.__obj[this.__table.pk])
		return process.nextTick(done.bind(null, {
			pgo: {
				code: 1029,
				doing: errors[1029],
				message: "A record can't be deleted before it is saved"
			},
		}));

	try {
		this.__preDelete();
	}
	catch(e) {
		return process.nextTick(done.bind(null, e));
	}

	var doIt = function(client, donePG) {
		var query = "DELETE FROM " + t.__table.__name + " WHERE " + t.__table.pk + " = $1";
		var values = [
			t.__obj[t.__table.pk]];

		t.pgo.log(query + " :: " + JSON.stringify(values));
		client.query(query, values, function(err, res) {
			t.__del = true;
			donePG();

			if(err)
				return done(err);

			try {
				t.__postDelete();
			}
			catch(e) {
				return done(e);
			}

			doneOk();
		});
	};

	if(this.__tx)
		return doIt(this.__tx.client, empty);

	this.pgo.client(doneOk.dd(doIt));
};

Record.prototype.save = function(done, doneOk) {
	doneOk = dd(done, doneOk);
	var t  = this;

	if(typeof(done) !== "function")
		throw new Error("Pgo.record.save: callback must be a function");

	if(this.wasDeleted(done, 1028, "A record can't be saved after it was deleted"))
		return;

	try {
		this.__preSave();
	}
	catch(e) {
		return process.nextTick(done.bind(null, e));
	}

	this.__table.save(doneOk.dd(function(saved) {
		try {
			t.__postSave(saved);
		}
		catch(e) {
			return done(e);
		}

		doneOk();
	}), this);
};

Record.prototype.wasDeleted = function(callback, err, msg) {
	if(! this.__del)
		return false;

	process.nextTick(callback.bind(null, {
		pgo: {
			code: err,
			doing: errors[err],
			message: msg
		},
	}));

	return true;
};

module.exports = Record;
