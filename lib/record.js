"use strict";

function Record() {
	var obj = {};

	Object.defineProperty(this, "__obj", {
		set: function(v) { obj = v; },
		get: function() { return obj; }
	});
}

Record.prototype.__init     = function() {};
Record.prototype.__postLoad = function() {};
Record.prototype.__postSave = function() {};
Record.prototype.__preSave  = function() {};

Record.prototype.save = function(callback) {
	var ret;
	var t = this;

	if(typeof(callback) != "function")
		throw new Error("Pgo.record.save: callback must be a function");

	try {
		ret = this.__preSave();
	}
	catch(e) {
		return callback(e);
	}

	if(ret)
		return callback(ret);

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
