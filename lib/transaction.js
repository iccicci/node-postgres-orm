"use strict";

var errors = require("./errors");

function close(command, callback) {
	var t = this;

	this.pgo.log(command);
	this.client.query(command, function(err) {
		t.done();
		t.closed = true;
		for(var i in t.records)
			t.records[i].__tx = null;
		t.records = [];
		callback(err);
	});
}

function commit(callback) {
	this.end(true, callback);
}

function end(commit, callback) {
	var command = commit ? "COMMIT" : "ROLLBACK";
	var error   = commit ? 1031     : 1032;
	var method  = commit ? "commit" : "rollback";

	if(typeof(callback) != "function")
		throw new Error("Transaction." + method + ": callback must be a function");

	if(this.closed)
		return process.nextTick(callback.bind(null, {
			pgo: {
				code:    error,
				doing:   errors[error],
				message: "Transaction." + method + ": Can't " + command + " an already closed Transaction"
			},
		}));

	this.close(command, callback);
}

function rollback(callback) {
	this.end(false, callback);
}

module.exports = {
	close:    close,
	commit:   commit,
	end:      end,
	rollback: rollback,
};
