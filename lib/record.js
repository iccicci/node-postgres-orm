"use strict";

function Record() {}

Record.prototype.__init     = function() {};
Record.prototype.__postLoad = function() {};
Record.prototype.__postSave = function() {};
Record.prototype.__preSave  = function() {};

Record.prototype.save = function(callback) {
	var ret;
	var t    = this;
	var exit = function(e) {
		if(callback)
			return process.nextTick(function() { callback(e); });
	};

	try {
		ret = this.__preSave();
	}
	catch(e) {
		return exit(e);
	}

	if(ret)
		return exit(ret);

	this.__table.save(function(err) {
		if(err)
			return exit(err);

		try {
			t.__postSave();
		}
		catch(e) {
			return exit(e);
		}

		if(callback)
			process.nextTick(callback);
	}, this);
};

module.exports = Record;
